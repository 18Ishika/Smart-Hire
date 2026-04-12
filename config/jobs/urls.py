from django.urls import path
from .views import DeleteJobView, JobCreateView, JobDetailView, UserJobsView

urlpatterns = [
    path('create/', JobCreateView.as_view(), name='job-create'),
    path('list/', UserJobsView.as_view(), name='job-list'),
    path('<int:job_id>/', JobDetailView.as_view()),
    path('delete/<int:job_id>/', DeleteJobView.as_view()),
]
