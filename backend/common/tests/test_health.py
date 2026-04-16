import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestHealthCheckView:
    """Test cases for the health check endpoint."""

    def test_health_check_success(self, api_client):
        """Test successful health check response."""
        url = reverse("health_check")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["message"] == "System is healthy"
