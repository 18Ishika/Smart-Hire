import os
import re
import time
import hashlib
import pdfplumber
import numpy as np
from docx import Document
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
import google.generativeai as genai
from django.conf import settings
from django.core.cache import cache

model = SentenceTransformer('all-MiniLM-L6-v2')
genai.configure(api_key=settings.GEMINI_API_KEY)
gemini = genai.GenerativeModel("gemini-2.5-flash")

JD_CACHE_TTL = 60 * 60 * 24 * 7      # 7 days
INSIGHTS_CACHE_TTL = 60 * 60 * 24 * 90  # 90 days — insights are cheap-ish to regenerate but not free


def get_resume_path(job_id):
    try:
        base_media = settings.MEDIA_ROOT
    except:
        base_media = os.path.join(os.getcwd(), 'media')
    return os.path.join(base_media, 'resumes', f'job_{job_id}')


def extract_text(file_path):
    """Extracts text from PDF or DOCX files."""
    try:
        if file_path.lower().endswith('.pdf'):
            with pdfplumber.open(file_path) as pdf:
                text = '\n'.join([
                    page.extract_text() for page in pdf.pages
                    if page.extract_text()
                ])
            return text
        elif file_path.lower().endswith(('.doc', '.docx')):
            doc = Document(file_path)
            return '\n'.join([para.text for para in doc.paragraphs])
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return ""
    return ""


def extract_contact_info(text):
    """Extracts email and phone from resume text using regex."""
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    phone_pattern = r'(\+?\d{1,3}[\s\-]?)?(\(?\d{3}\)?[\s\-.]?)(\d{3}[\s\-.]?\d{4})'

    emails = re.findall(email_pattern, text)
    phones = re.findall(phone_pattern, text)
    cleaned_phones = [''.join(p).strip() for p in phones]

    return {
        "email": emails[0] if emails else None,
        "phone": cleaned_phones[0] if cleaned_phones else None,
    }


def extract_years_of_experience(text):
    """Rough heuristic extraction of years of experience. Falls back to 0."""
    patterns = [
        r'(\d+)\+?\s*(?:years|yrs)\s*(?:of)?\s*experience',
        r'experience\s*(?:of)?\s*(\d+)\+?\s*(?:years|yrs)',
    ]
    matches = []
    text_lower = text.lower()
    for pattern in patterns:
        matches.extend(int(m) for m in re.findall(pattern, text_lower))
    return max(matches) if matches else 0


def parse_required_skills(required_skills_text):
    """Splits recruiter-entered required_skills into a clean list."""
    if not required_skills_text:
        return []
    parts = re.split(r'[,\n;]+', required_skills_text)
    return [p.strip() for p in parts if p.strip()]


def extract_keywords_tfidf(text, top_n=25):
    """Extracts top keywords/bigrams from JD text using TF-IDF."""
    try:
        vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2), max_features=5000)
        tfidf_matrix = vectorizer.fit_transform([text])
        scores = zip(vectorizer.get_feature_names_out(), tfidf_matrix.toarray()[0])
        sorted_keywords = sorted(scores, key=lambda x: x[1], reverse=True)
        return [kw for kw, score in sorted_keywords[:top_n]]
    except Exception:
        return []


# ── JD caching (Redis, per job — safe to treat as a rebuildable cache) ─────

def _jd_cache_key(job):
    raw = f"{job.id}:{job.description}:{job.required_skills}"
    digest = hashlib.md5(raw.encode()).hexdigest()
    return f"jd_cache:{digest}"


def get_or_build_jd_cache(job):
    """
    Caches, per job: JD embedding vector, TF-IDF keywords, required_skills list.
    First resume for a job builds it; every resume after reuses it.
    """
    key = _jd_cache_key(job)
    cached = cache.get(key)
    if cached:
        return np.array(cached["jd_vector"]), cached["tfidf_keywords"], cached["required_skills"]

    jd_vector = model.encode(job.description)
    tfidf_keywords = extract_keywords_tfidf(job.description)
    required_skills = parse_required_skills(job.required_skills)

    cache.set(key, {
        "jd_vector": jd_vector.tolist(),
        "tfidf_keywords": tfidf_keywords,
        "required_skills": required_skills,
    }, timeout=JD_CACHE_TTL)

    return jd_vector, tfidf_keywords, required_skills


# ── Scoring: semantic + keyword hybrid ──────────────────────────────────────

def get_semantic_score(resume_vector, jd_vector):
    """Cosine similarity between two precomputed vectors."""
    dot_product = np.dot(resume_vector, jd_vector)
    norm_resume = np.linalg.norm(resume_vector)
    norm_jd = np.linalg.norm(jd_vector)
    if norm_resume == 0 or norm_jd == 0:
        return 0.0
    return float(dot_product / (norm_resume * norm_jd))


def get_keyword_match(resume_text, keywords):
    """Returns (matched_list, score_fraction) for a set of keywords against resume text."""
    if not keywords:
        return [], 0.0
    text_lower = resume_text.lower()
    matched = [kw for kw in keywords if kw.lower() in text_lower]
    return matched, len(matched) / len(keywords)


def apply_experience_penalty(score, resume_years, required_years):
    """Soft penalty (capped at 35%) if resume falls short on required years."""
    if not required_years or resume_years >= required_years:
        return score
    gap = required_years - resume_years
    penalty = min(0.35, gap * 0.08)
    return score * (1 - penalty)


def compute_final_score(resume_text, job, jd_vector, tfidf_keywords, required_skills):
    """
    Blends three signals:
      - semantic similarity (whole-doc embedding vs JD)   — 50%
      - required_skills match (explicit recruiter list)   — 30%
      - TF-IDF keyword match (implicit from description)   — 20%
    Then applies an experience penalty.
    """
    resume_vector = model.encode(resume_text)
    semantic = get_semantic_score(resume_vector, jd_vector)

    matched_required, required_score = get_keyword_match(resume_text, required_skills)
    matched_tfidf, tfidf_score = get_keyword_match(resume_text, tfidf_keywords)

    if required_skills:
        base = (0.5 * semantic) + (0.3 * required_score) + (0.2 * tfidf_score)
    else:
        base = (0.6 * semantic) + (0.4 * tfidf_score)

    resume_years = extract_years_of_experience(resume_text)
    base = apply_experience_penalty(base, resume_years, job.experience_required)

    final_score = round(base * 100, 2)

    missing_required = [s for s in required_skills if s not in matched_required]
    breakdown = {
        "matched_required_skills": matched_required,
        "missing_required_skills": missing_required,
        "matched_keywords": matched_tfidf,
        "resume_years_detected": resume_years,
        "semantic_similarity": round(semantic, 3),
    }
    return final_score, breakdown


def auto_summary(breakdown, score):
    """Readable summary, no LLM call — used as fallback card text before insights load."""
    parts = []
    matched = breakdown["matched_required_skills"]
    missing = breakdown["missing_required_skills"]

    if matched:
        parts.append(f"Matched {len(matched)} required skill(s): {', '.join(matched[:5])}.")
    else:
        parts.append("No required skills matched.")
    if missing:
        parts.append(f"Missing: {', '.join(missing[:3])}.")
    parts.append(f"Overall fit: {score:.0f}%")
    return " ".join(parts)


# ── NEW: automatic LLM insight extraction (runs during processing, not on-click) ──

def _insights_cache_key(resume_id):
    return f"resume_insights:{resume_id}"


def extract_resume_insights(resume_id, resume_text):
    """
    Runs automatically as part of Celery processing (not lazy/on-click).
    Produces a short, structured 'quick-read' summary of the candidate —
    distinct from get_llm_explanation(), which is the deeper on-demand
    'why this rank vs this specific JD' analysis.

    Cached in Redis keyed by resume_id (no model/migration change needed).
    NOTE: this is a tradeoff — insights aren't permanent DB data, they'll
    regenerate (one more Gemini call) if the cache expires after 90 days.
    A dedicated `Resume.insights` TextField would be the cleaner long-term
    home for this if you're open to a small migration.
    """
    key = _insights_cache_key(resume_id)
    cached = cache.get(key)
    if cached:
        return cached

    prompt = f"""
    You are summarizing a candidate's resume for a recruiter who has 10 seconds to skim it.

    Resume:
    {resume_text[:2000]}

    Return ONLY valid JSON (no markdown, no explanation) in this exact shape:
    {{
        "headline": "one-line role/seniority summary, e.g. 'Senior backend engineer, 6 yrs, Python/AWS'",
        "top_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
        "highlights": ["notable achievement or project, 1 short sentence", "..."],
        "flags": ["any gaps, short tenure, or missing info worth noting, if any"]
    }}
    Keep top_skills to max 6 items, highlights to max 3, flags to max 2 (empty list if none).
    """
    try:
        response = gemini.generate_content(prompt)
        raw = response.text.strip()
        raw = re.sub(r'^```json|```$', '', raw, flags=re.MULTILINE).strip()
        import json
        insights = json.loads(raw)
    except Exception as e:
        insights = {
            "headline": "Insight generation failed.",
            "top_skills": [],
            "highlights": [],
            "flags": [f"Could not generate insights: {str(e)}"],
        }

    cache.set(key, insights, timeout=INSIGHTS_CACHE_TTL)
    return insights


def get_llm_explanation(resume_text, job_description, score):
    """
    On-demand, lazy — called ONLY when user clicks 'Why this rank?'.
    Deeper, JD-specific reasoning. Distinct from extract_resume_insights(),
    which is a generic quick-read summary generated automatically for every resume.
    """
    prompt = f"""
    You are an ATS (Applicant Tracking System) assistant.

    Job Description:
    {job_description[:800]}

    Resume:
    {resume_text[:1500]}

    This candidate scored {score:.1f}% out of 100% match.

    In 3-4 sentences:
    1. What skills/experience matched well?
    2. What is missing or weak compared to the JD?
    3. One line verdict: Strong / Moderate / Weak fit.

    Be specific, no fluff.
    """
    try:
        response = gemini.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Could not generate explanation: {str(e)}"


def get_top_candidates_report(resumes, job_description, top_n=5):
    """Report for top N candidates with contact info + LLM explanation."""
    report = []
    for resume in resumes[:top_n]:
        contact = extract_contact_info(resume.parsed_text)
        explanation = get_llm_explanation(resume.parsed_text, job_description, resume.score)
        time.sleep(1)  # respect Gemini free tier rate limit

        report.append({
            "resume_id": resume.id,
            "filename": os.path.basename(resume.resume_file.name),
            "score": resume.score,
            "email": contact["email"],
            "phone": contact["phone"],
            "explanation": explanation,
            "insights": extract_resume_insights(resume.id, resume.parsed_text),  # cache hit, near-free by now
        })
    return report


def process_and_score_resume(resume, job):
    """
    Processes a single Resume against its Job:
    - extracts text
    - scores via semantic + keyword hybrid (cached JD data)
    - generates automatic LLM insights (cached per resume)
    - saves parsed_text/score to DB
    Runs inside a Celery task, so the extra Gemini call here is fine —
    it's background processing, never blocks the HTTP request.
    """
    jd_vector, tfidf_keywords, required_skills = get_or_build_jd_cache(job)

    file_path = resume.resume_file.path
    text = extract_text(file_path)

    if not text.strip():
        resume.parsed_text = ""
        resume.score = 0.0
        resume.status = "Failed"
        resume.save()
        return {"resume_id": resume.id, "filename": os.path.basename(file_path), "score": 0.0}

    final_score, breakdown = compute_final_score(text, job, jd_vector, tfidf_keywords, required_skills)
    contact = extract_contact_info(text)
    insights = extract_resume_insights(resume.id, text)  # ← new: automatic, not on-click

    resume.parsed_text = text
    resume.score = final_score
    resume.status = "Processed"
    resume.save()

    return {
        "resume_id": resume.id,
        "filename": os.path.basename(file_path),
        "score": resume.score,
        "summary": auto_summary(breakdown, final_score),
        "insights": insights,
        "email": contact["email"],
        "phone": contact["phone"],
        "breakdown": breakdown,
    }


def rank_resumes(job, resumes_folder):
    """Processes all resumes in a folder and ranks them against the Job."""
    jd_vector, tfidf_keywords, required_skills = get_or_build_jd_cache(job)

    results = []
    valid_extensions = ('.pdf', '.docx', '.doc')

    for filename in os.listdir(resumes_folder):
        if filename.lower().endswith(valid_extensions):
            file_path = os.path.join(resumes_folder, filename)
            text = extract_text(file_path)
            if not text.strip():
                results.append({"filename": filename, "score": 0.0, "summary": "Could not extract text.", "text_preview": ""})
                continue

            final_score, breakdown = compute_final_score(text, job, jd_vector, tfidf_keywords, required_skills)

            results.append({
                "filename": filename,
                "score": final_score,
                "summary": auto_summary(breakdown, final_score),
                "text_preview": text[:200]
            })

    return sorted(results, key=lambda x: x['score'], reverse=True)