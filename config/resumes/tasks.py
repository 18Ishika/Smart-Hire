from celery import shared_task
from .models import Resume
from resumes.parsers import process_and_score_resume
from jobs.models import Job

from celery import shared_task
from .models import Resume
from resumes.parsers import process_and_score_resume
from jobs.models import Job
@shared_task(bind=True)
def process_resume_task(self, resume_id):
    resume = Resume.objects.get(id=resume_id)

    # 🔄 Processing state
    resume.status = "Processing"
    resume.save()

    try:
        # 🧠 Get score
        result = process_and_score_resume(resume, resume.job.description)

        # ✅ Save score + status
        resume.score = result["score"]   # 🔥 THIS WAS MISSING
        resume.status = "Processed"
        resume.save()

    except Exception as e:
        resume.status = "Failed"
        resume.save()
        print("Error:", e)   # optional debug
        raise

    return resume.id