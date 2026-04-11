from django.urls import path
from .views import HomeView, ResumeExplainView, ResumeUploadView , JobRankingsView, TopCandidatesReportView

urlpatterns = [
    path('upload/', ResumeUploadView.as_view(), name='resume-upload'),
    path('rankings/<int:job_id>/', JobRankingsView.as_view(), name='job-rankings'),
    path('', HomeView.as_view(), name='home'),
    path('<int:resume_id>/explain/', ResumeExplainView.as_view()),
    path('rankings/<int:job_id>/top-candidates/', TopCandidatesReportView.as_view()),
]
