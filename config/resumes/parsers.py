import os
import re
import time
import pdfplumber
import numpy as np
from docx import Document
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
import google.generativeai as genai
from django.conf import settings

# Initialize models once globally
model = SentenceTransformer('all-MiniLM-L6-v2')
genai.configure(api_key=settings.GEMINI_API_KEY)
gemini = genai.GenerativeModel("gemini-2.5-flash")


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
    """
    Extracts email and phone from resume text using regex.
    No LLM needed — reliable enough for standard resume formats.
    """
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    # Handles: +91-9876543210, (123) 456-7890, 123.456.7890
    phone_pattern = r'(\+?\d{1,3}[\s\-]?)?(\(?\d{3}\)?[\s\-.]?)(\d{3}[\s\-.]?\d{4})'

    emails = re.findall(email_pattern, text)
    phones = re.findall(phone_pattern, text)
    cleaned_phones = [''.join(p).strip() for p in phones]

    return {
        "email": emails[0] if emails else None,
        "phone": cleaned_phones[0] if cleaned_phones else None,
    }


def get_semantic_score(resume_vector, jd_vector):
    """Cosine similarity between two precomputed vectors."""
    dot_product = np.dot(resume_vector, jd_vector)
    norm_resume = np.linalg.norm(resume_vector)
    norm_jd = np.linalg.norm(jd_vector)

    if norm_resume == 0 or norm_jd == 0:
        return 0.0
    return float(dot_product / (norm_resume * norm_jd))


def extract_keywords_tfidf(text, top_n=25):
    """
    Extracts top keywords/bigrams from text using TF-IDF.
    No hardcoded stopwords — sklearn's built-in English list handles it.
    Also captures bigrams like 'machine learning', 'data pipeline'.
    """
    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            max_features=5000
        )
        tfidf_matrix = vectorizer.fit_transform([text])
        scores = zip(
            vectorizer.get_feature_names_out(),
            tfidf_matrix.toarray()[0]
        )
        sorted_keywords = sorted(scores, key=lambda x: x[1], reverse=True)
        return set([kw for kw, score in sorted_keywords[:top_n]])
    except Exception:
        return set()


def get_keyword_score(resume_text, jd_keywords):
    """
    Measures what fraction of JD keywords appear in the resume.
    """
    if not jd_keywords:
        return 0.0

    resume_text_lower = resume_text.lower()
    matched = sum(1 for kw in jd_keywords if kw in resume_text_lower)
    return matched / len(jd_keywords)


def hybrid_score(semantic, keyword, semantic_weight=0.6, keyword_weight=0.4):
    """
    Combines semantic + keyword scores.
    Semantic-heavy since it handles synonyms better (ML vs machine learning).
    """
    return (semantic_weight * semantic) + (keyword_weight * keyword)


def auto_summary(matched_keywords, score):
    """
    Generates a readable summary without any LLM/API dependency.
    Used as default summary on cards — no API call.
    """
    if not matched_keywords:
        return f"Low keyword overlap with job description. Overall fit: {score:.0f}%"

    top_skills = list(matched_keywords)[:5]
    return (
        f"Matched {len(matched_keywords)} relevant skills including: "
        f"{', '.join(top_skills)}. Overall fit: {score:.0f}%"
    )


def get_llm_explanation(resume_text, job_description, score):
    """
    Called lazily — only when user clicks 'Why this rank?' on a card.
    Uses Gemini free tier (gemini-1.5-flash).
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
    """
    Generates a report for top N candidates with contact info + LLM explanation.
    Called only when user explicitly requests it — not during ranking.
    resumes: queryset of Resume model instances, already ordered by score.
    """
    report = []

    for resume in resumes[:top_n]:
        contact = extract_contact_info(resume.parsed_text)
        explanation = get_llm_explanation(
            resume.parsed_text,
            job_description,
            resume.score
        )
        # Respect Gemini free tier rate limit (15 req/min)
        time.sleep(1)

        report.append({
            "resume_id": resume.id,
            "filename": os.path.basename(resume.resume_file.name),
            "score": resume.score,
            "email": contact["email"],
            "phone": contact["phone"],
            "explanation": explanation
        })

    return report


def rank_resumes(job_description, resumes_folder):
    """
    Processes all resumes in a folder and ranks them against the JD
    using hybrid scoring (semantic + TF-IDF keyword match).
    """
    jd_vector = model.encode(job_description)
    jd_keywords = extract_keywords_tfidf(job_description)

    results = []
    valid_extensions = ('.pdf', '.docx', '.doc')

    for filename in os.listdir(resumes_folder):
        if filename.lower().endswith(valid_extensions):
            file_path = os.path.join(resumes_folder, filename)
            print(f"Processing: {filename}...")

            text = extract_text(file_path)
            if not text.strip():
                results.append({
                    "filename": filename,
                    "score": 0.0,
                    "summary": "Could not extract text from file.",
                    "text_preview": ""
                })
                continue

            resume_vector = model.encode(text)
            semantic = get_semantic_score(resume_vector, jd_vector)
            keyword = get_keyword_score(text, jd_keywords)
            final_score = hybrid_score(semantic, keyword)

            resume_text_lower = text.lower()
            matched = {kw for kw in jd_keywords if kw in resume_text_lower}

            results.append({
                "filename": filename,
                "score": round(final_score * 100, 2),
                "summary": auto_summary(matched, final_score * 100),
                "text_preview": text[:200]
            })

    ranked_results = sorted(results, key=lambda x: x['score'], reverse=True)
    return ranked_results


def process_and_score_resume(resume, job_description):
    """
    Processes a single Resume model instance:
    - extracts text and contact info
    - computes hybrid score
    - saves parsed_text & score to DB
    """
    jd_vector = model.encode(job_description)
    jd_keywords = extract_keywords_tfidf(job_description)

    file_path = resume.resume_file.path
    text = extract_text(file_path)

    if not text.strip():
        resume.parsed_text = ""
        resume.score = 0.0
        resume.status = "Failed"
        resume.save()
        return {
            "resume_id": resume.id,
            "filename": os.path.basename(file_path),
            "score": 0.0
        }

    resume_vector = model.encode(text)
    semantic = get_semantic_score(resume_vector, jd_vector)
    keyword = get_keyword_score(text, jd_keywords)
    final_score = hybrid_score(semantic, keyword) * 100

    matched = {kw for kw in jd_keywords if kw in text.lower()}
    contact = extract_contact_info(text)

    resume.parsed_text = text
    resume.score = round(final_score, 2)
    resume.status = "Processed"
    resume.save()

    return {
        "resume_id": resume.id,
        "filename": os.path.basename(file_path),
        "score": resume.score,
        "summary": auto_summary(matched, final_score),
        "email": contact["email"],
        "phone": contact["phone"]
    }


"""
# --- Example Usage ---
if __name__ == "__main__":
    job_desc = '''
    We are looking for a Python Developer with 2 years of experience.
    Required skills: Machine Learning, NLP, PyTorch, and FastAPI.
    Experience with AWS and Docker is a plus.
    '''

    folder_path = get_resume_path(job_id="1")

    if os.path.exists(folder_path):
        rankings = rank_resumes(job_desc, folder_path)

        print("\n--- Final Rankings ---")
        for i, res in enumerate(rankings):
            print(f"{i+1}. {res['filename']} - Score: {res['score']}%")
            print(f"    {res['summary']}\n")
    else:
        print(f"Folder '{folder_path}' not found.")
"""