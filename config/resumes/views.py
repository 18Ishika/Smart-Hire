from resumes.parsers import get_resume_path, rank_resumes , process_and_score_resume
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Resume
from .serializers import ResumeSerializer
from jobs.models import Job
from rest_framework.permissions import IsAuthenticated

from .tasks import process_resume_task  # Import your task
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
            # 1. Save to DB 
            serializer = ResumeSerializer(data={'job': job.id, 'resume_file': file})
            serializer.is_valid(raise_exception=True)
            resume = serializer.save()

            # 2. Trigger Celery Task

            process_resume_task.delay(resume.id)
            
            created_resumes.append({
                "id": resume.id,
                "filename": resume.actual_resume_file_name,
                "status": "PENDING"
            })

        # 3. Respond immediately to Postman not returning score and all becoz it will not be ready at the moment
        return Response({
            "message": f"Successfully queued {len(created_resumes)} resumes for processing.",
            "job_id": job.id,
            "resumes": created_resumes
        }, status=status.HTTP_202_ACCEPTED)

    
#Get view to list top 5 resumes till now proc
# essed for a job
class JobRankingsView(APIView):
    def get(self,request,job_id):
        top_resumes = Resume.objects.filter(
            job_id=job_id,
            job__created_by=request.user,
            status="Processed"
        ).order_by('-score')[:5]
        serializer = ResumeSerializer(top_resumes, many=True)
        return Response({
            "job_id": job_id,
            "count_found":len(top_resumes),
            "rankings":serializer.data
        },status=status.HTTP_200_OK)