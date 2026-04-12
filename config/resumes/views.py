from django.http import FileResponse

from resumes.parsers import get_resume_path, rank_resumes, process_and_score_resume, get_llm_explanation, get_top_candidates_report
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Resume
from .serializers import ResumeSerializer
from jobs.models import Job
from rest_framework.permissions import IsAuthenticated
from .tasks import process_resume_task


class HomeView(APIView):
    def get(self, request):
        data = {
            "title": "Welcome",
            "message": "Home data from Django backend"
        }
        return Response(data)


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
    
def view_resume(request, resume_id):
    resume = get_object_or_404(Resume, id=resume_id)

    response = FileResponse(
        resume.resume_file.open('rb'),
        content_type='application/pdf'
    )
    response['Content-Disposition'] = f'inline; filename="{resume.actual_resume_file_name}"'

    response['X-Frame-Options'] = 'ALLOWALL'

    return response