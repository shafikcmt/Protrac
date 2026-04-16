from django.urls import path
from common.api import HealthCheckView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health_check"),
]
