import pytest
from rest_framework.test import APIClient


# --- Fixures ---


@pytest.fixture
def api_client():
    """
    Provides an unauthenticated API client for testing.
    """
    return APIClient()
