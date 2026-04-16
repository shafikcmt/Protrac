import pytest
from django.urls import reverse
from .conftest import UserFactory
from rest_framework import status
from django.contrib.auth import get_user_model


User = get_user_model()


@pytest.mark.django_db
class TestAuthenticationEndpoints:
    """Test cases for authentication endpoints."""

    def test_login_success(self, api_client):
        """Test successful login with correct credentials."""
        UserFactory(username="testuser", password="testpass123")

        url = reverse("login")
        data = {"username": "testuser", "password": "testpass123"}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_login_wrong_password(self, api_client):
        """Test login failure with wrong password."""
        UserFactory(username="testuser", password="testpass123")

        url = reverse("login")
        data = {"username": "testuser", "password": "wrongpass"}
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_token_refresh_success(self, api_client):
        """Test successful token refresh."""
        UserFactory(username="testuser", password="testpass123")

        # First login to get tokens
        login_url = reverse("login")
        login_data = {"username": "testuser", "password": "testpass123"}
        login_response = api_client.post(login_url, login_data)

        refresh_token = login_response.data["refresh"]

        # Now refresh the token
        refresh_url = reverse("refresh-token")
        refresh_data = {"refresh": refresh_token}
        refresh_response = api_client.post(refresh_url, refresh_data)

        assert refresh_response.status_code == status.HTTP_200_OK
        assert "access" in refresh_response.data
