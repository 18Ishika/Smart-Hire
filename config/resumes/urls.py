from django.urls import path
from .views import  ResumeExplainView, ResumeUploadView , JobRankingsView, SendEmailView, TopCandidatesReportView, total_resumes, view_resume

urlpatterns = [
    path('upload/', ResumeUploadView.as_view(), name='resume-upload'),
    path('rankings/<int:job_id>/', JobRankingsView.as_view(), name='job-rankings'),
     path('total-resumes/', total_resumes, name='total_resumes'),
    path('<int:resume_id>/explain/', ResumeExplainView.as_view()),
    path('rankings/<int:job_id>/top-candidates/', TopCandidatesReportView.as_view()),
    path('view-resume/<int:resume_id>/', view_resume),
     path('<int:resume_id>/send-email/', SendEmailView.as_view(), name='send-email'),
]
