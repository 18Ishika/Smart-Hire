from django.urls import path
from .views import HomeView, ResumeUploadView , JobRankingsView

urlpatterns = [
    path('upload/', ResumeUploadView.as_view(), name='resume-upload'),
    path('rankings/<int:job_id>/', JobRankingsView.as_view(), name='job-rankings'),
    path('', HomeView.as_view(), name='home'),
]
