import factory
import pytest
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory
from rest_framework.test import APIClient


User = get_user_model()


# --- Factories ---


class UserFactory(DjangoModelFactory):
    """Factory for creating User instances."""

    class Meta:
        model = User
        django_get_or_create = ("username",)
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = True
    is_staff = False
    is_superuser = False

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        """Set password for the user."""
        password = extracted or "testpass123"
        self.set_password(password)
        if create:
            self.save()


# --- Fixtures ---


@pytest.fixture
def api_client():
    """Provides an API client for testing."""
    return APIClient()


@pytest.fixture
def user():
    """Create a test user."""
    return UserFactory()


@pytest.fixture
def authenticated_client(user):
    """Provides an authenticated API client."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client
