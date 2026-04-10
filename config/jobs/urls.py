from django.urls import path
from .views import JobCreateView, UserJobsView

urlpatterns = [
    path('create/', JobCreateView.as_view(), name='job-create'),
    path('list/', UserJobsView.as_view(), name='job-list'),
]
