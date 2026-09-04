from itertools import count

from django.http import FileResponse

from resumes.parsers import get_resume_path, rank_resumes, process_and_score_resume, get_llm_explanation, get_top_candidates_report , extract_contact_info
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Resume
from .serializers import ResumeSerializer
from jobs.models import Job
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from .tasks import process_resume_task
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.decorators import api_view

@api_view(['GET']) 
def total_resumes(request): 
    job_id=request.GET.get('job_id')
    if job_id:
        count=Resume.objects.filter(
            job_id=job_id,
            job__created_by=request.user
        ).count()
    else:
        count = Resume.objects.filter(
            job__created_by=request.user
        ).count()
    return Response({"total_resumes": count})

class ResumeUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        job_id = request.data.get('job')
        job = get_object_or_404(Job, id=job_id, created_by=request.user)
        files = request.FILES.getlist('resume_file')

        if not files:
            return Response({"error": "No resume files provided."}, status=status.HTTP_400_BAD_REQUEST)

        created_resumes = []
        for file in files:
            serializer = ResumeSerializer(data={'job': job.id, 'resume_file': file})
            serializer.is_valid(raise_exception=True)
            resume = serializer.save()

            process_resume_task.delay(resume.id)

            created_resumes.append({
                "id": resume.id,
                "filename": resume.actual_resume_file_name,
                "status": "PENDING"
            })

        return Response({
            "message": f"Successfully queued {len(created_resumes)} resumes for processing.",
            "job_id": job.id,
            "resumes": created_resumes
        }, status=status.HTTP_202_ACCEPTED)


class JobRankingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        top_resumes = Resume.objects.filter(
            job_id=job_id,
            job__created_by=request.user
        ).order_by('-score')

        serializer = ResumeSerializer(top_resumes, many=True)
        return Response({
            "job_id": job_id,
            "count_found": len(top_resumes),
            "rankings": serializer.data
        }, status=status.HTTP_200_OK)


class ResumeExplainView(APIView):
    """
    Called when user clicks 'Why this rank?' on a card.
    Lazy — Gemini only called on demand, not during ranking.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, resume_id):
        resume = get_object_or_404(
            Resume,
            id=resume_id,
            job__created_by=request.user
        )

        if not resume.parsed_text:
            return Response(
                {"error": "Resume text not available. Still processing?"},
                status=status.HTTP_400_BAD_REQUEST
            )

        explanation = get_llm_explanation(
            resume.parsed_text,
            resume.job.description,
            resume.score
        )
        return Response({
            "resume_id": resume_id,
            "score": resume.score,
            "explanation": explanation
        }, status=status.HTTP_200_OK)


class TopCandidatesReportView(APIView):
    """
    Called when user clicks 'Get Top 5/10' button on the job page.
    Fetches contact info + LLM explanation for top N candidates.
    Pass ?top_n=10 to get top 10, defaults to 5.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, job_id):
        top_n = int(request.GET.get("top_n", 5))

        job = get_object_or_404(Job, id=job_id, created_by=request.user)

        resumes = Resume.objects.filter(
            job=job,
            status="Processed"
        ).order_by('-score')

        if not resumes.exists():
            return Response(
                {"error": "No processed resumes found for this job."},
                status=status.HTTP_404_NOT_FOUND
            )

        report = get_top_candidates_report(list(resumes), job.description, top_n)

        return Response({
            "job_id": job_id,
            "top_n": top_n,
            "report": report
        }, status=status.HTTP_200_OK)
@api_view(['GET'])
@permission_classes([IsAuthenticated])  
def view_resume(request, resume_id):
    resume = get_object_or_404(Resume, id=resume_id)

    response = FileResponse(
        resume.resume_file.open('rb'),
        content_type='application/pdf'
    )
    response['Content-Disposition'] = f'inline; filename="{resume.actual_resume_file_name}"'

    response['X-Frame-Options'] = 'ALLOWALL'

    return response

class SendEmailView(APIView):
    permission_classes = [IsAuthenticated]

    DEFAULT_SUBJECT = "Update on Your Application – {job_title}"

    DEFAULT_MESSAGE = """Dear {candidate_name},

Thank you for taking the time to apply for the {job_title} position at our company.

We are pleased to inform you that after reviewing your profile, we would like to proceed with the next round of our selection process.

{round_info}

Please reply to this email to confirm your availability or let us know if you have any questions.

We look forward to hearing from you.

Best regards,
{company_name}
SmartHire Hiring Team"""

    ROUND_MESSAGES = {
        "hr":        "This will be an HR round to discuss your background, experience, and expectations.",
        "technical": "This will be a Technical round to assess your domain knowledge and problem-solving skills.",
        "coding":    "This will be a Coding round. You will be given programming challenges to solve.",
        "final":     "This is the Final round, which will include a discussion with senior leadership.",
        "default":   "We will share further details about the format and schedule shortly.",
    }

    def post(self, request, resume_id):
        resume = get_object_or_404(
            Resume,
            id=resume_id,
            job__created_by=request.user
        )

        if not resume.parsed_text:
            return Response(
                {"error": "Resume text not available. Still processing?"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── reuse your existing parser function, no DB write needed ──
        contact = extract_contact_info(resume.parsed_text)
        candidate_email = contact.get("email")

        if not candidate_email:
            return Response(
                {"error": "Could not extract an email address from this resume."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # first non-empty line is usually the candidate's name
        candidate_name = next(
            (line.strip() for line in resume.parsed_text.splitlines() if line.strip()),
            "Candidate"
        )

        job_title    = resume.job.title if resume.job else "the advertised position"
        company_name = request.user.get_full_name() or request.user.username or "Our Company"

        round_key  = request.data.get("round", "default").lower()
        round_info = self.ROUND_MESSAGES.get(round_key, self.ROUND_MESSAGES["default"])

        subject = request.data.get("subject", "").strip() or self.DEFAULT_SUBJECT.format(
            job_title=job_title
        )
        message = request.data.get("message", "").strip() or self.DEFAULT_MESSAGE.format(
            candidate_name=candidate_name,
            job_title=job_title,
            round_info=round_info,
            company_name=company_name,
        )
        EMAIL_HOST_USER = settings.EMAIL_HOST_USER
        EMAIL_HOST_PASSWORD = settings.EMAIL_HOST_PASSWORD
        print(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[candidate_email],
                fail_silently=False,
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to send email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({
            "message": f"Email successfully sent to {candidate_email}.",
            "resume_id": resume_id,
            "to": candidate_email,
            "subject": subject,
            "round": round_key,
        }, status=status.HTTP_200_OK)