from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Job
from .serializers import JobSerializer
from django.shortcuts import get_object_or_404

class JobCreateView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = JobSerializer(data=request.data)

        if serializer.is_valid():
            job = serializer.save(created_by=request.user)
            return Response(
                JobSerializer(job).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserJobsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        jobs = Job.objects.filter(created_by=request.user).order_by('-created_at')
        serializer = JobSerializer(jobs, many=True)

        return Response(serializer.data)
    
class JobDetailView(APIView):
    def get(self, request, job_id):
        job = get_object_or_404(Job, id=job_id)
        return Response({
            "id": job.id,
            "title": job.title
        })
    
class DeleteJobView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, job_id):
        job = get_object_or_404(Job, id=job_id, created_by=request.user)
        job.delete()

        return Response(
            {"message": "Job deleted successfully"},
            status=status.HTTP_200_OK
        )