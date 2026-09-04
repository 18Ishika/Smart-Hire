from celery import shared_task
from celery.utils.log import get_task_logger
from .models import Resume
from resumes.parsers import process_and_score_resume

logger = get_task_logger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True,
    max_retries=3,
    acks_late=True,
)
def process_resume_task(self, resume_id):
    try:
        resume = Resume.objects.select_related('job').get(id=resume_id)
    except Resume.DoesNotExist:
        logger.warning(f"Resume {resume_id} no longer exists, skipping.")
        return None

    resume.status = "Processing"
    resume.save(update_fields=["status"])

    try:
        # ⚠️ pass resume.job (the object), NOT resume.job.description
        result = process_and_score_resume(resume, resume.job)

        # process_and_score_resume already saves parsed_text/score/status
        # internally — no redundant save needed here.
        logger.info(f"Resume {resume_id} scored {result['score']} for job {resume.job_id}")

    except Exception as e:
        logger.error(f"Resume {resume_id} processing failed: {e}", exc_info=True)

        if self.request.retries >= self.max_retries:
            resume.status = "Failed"
        else:
            resume.status = "Retrying"
        resume.save(update_fields=["status"])

        raise

    return resume.id