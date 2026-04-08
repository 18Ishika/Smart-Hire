from django.urls import path
from .views import get_profile, test_api
from .views import signup, login
urlpatterns = [
    path('test/', test_api),
    path('signup/', signup),
    path('login/', login),
    path('profile/', get_profile),
]