import pytest
from django.urls import reverse
from rest_framework import status
from tracking.tests.conftest import BASIC_ENDPOINTS


@pytest.mark.django_db
class TestBasicEndpoints:
    """Comprehensive tests for basic CRUD endpoints using parameterized tests."""

    @pytest.mark.parametrize("endpoint_name", BASIC_ENDPOINTS.keys())
    def test_create_endpoint(self, authenticated_client, endpoint_name):
        """Test CREATE operation for all basic endpoints."""
        endpoint_data = BASIC_ENDPOINTS[endpoint_name]

        # Handle special cases that require related objects
        create_data = endpoint_data["create_data"].copy()
        if endpoint_data.get("requires_style"):
            # Create a style first for Part model
            from tracking.tests.conftest import StyleFactory

            style = StyleFactory()
            create_data["style"] = style.id

        url = reverse(f"tracking:{endpoint_name}-list-create")
        response = authenticated_client.post(url, create_data)
        assert response.status_code == status.HTTP_201_CREATED
        assert "id" in response.data
        # Most models have "name", but Spread has "number"
        if endpoint_name == "spread":
            assert "number" in response.data
        else:
            assert "name" in response.data

    @pytest.mark.parametrize("endpoint_name", BASIC_ENDPOINTS.keys())
    def test_list_endpoint(self, authenticated_client, endpoint_name):
        """Test LIST operation for all basic endpoints."""
        endpoint_data = BASIC_ENDPOINTS[endpoint_name]
        # Create test data
        endpoint_data["factory"]()

        url = reverse(f"tracking:{endpoint_name}-list-create")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data  # Pagination
        assert len(response.data["results"]) > 0

    @pytest.mark.parametrize("endpoint_name", BASIC_ENDPOINTS.keys())
    def test_detail_endpoint(self, authenticated_client, endpoint_name):
        """Test READ detail operation for all basic endpoints."""
        endpoint_data = BASIC_ENDPOINTS[endpoint_name]
        # Create test instance
        instance = endpoint_data["factory"]()

        url = reverse(f"tracking:{endpoint_name}-detail", args=[instance.id])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == instance.id

        # Check the primary field (default to 'name' for backward compatibility)
        primary_field = endpoint_data.get("primary_field", "name")
        assert response.data[primary_field] == getattr(instance, primary_field)

    @pytest.mark.parametrize("endpoint_name", BASIC_ENDPOINTS.keys())
    def test_update_endpoint(self, authenticated_client, endpoint_name):
        """Test UPDATE operation for all basic endpoints."""
        endpoint_data = BASIC_ENDPOINTS[endpoint_name]
        # Create test instance
        instance = endpoint_data["factory"]()

        # Handle special cases that require related objects
        update_data = endpoint_data["update_data"].copy()
        if endpoint_data.get("requires_style"):
            # Use the same style as the instance for Part model
            update_data["style"] = instance.style.id

        url = reverse(f"tracking:{endpoint_name}-detail", args=[instance.id])
        response = authenticated_client.put(url, update_data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == instance.id

        # Verify the primary field was updated
        primary_field = endpoint_data.get("primary_field", "name")
        updated_value = update_data[primary_field]
        assert response.data[primary_field] == updated_value

    @pytest.mark.parametrize("endpoint_name", BASIC_ENDPOINTS.keys())
    def test_delete_endpoint(self, authenticated_client, endpoint_name):
        """Test DELETE operation for all basic endpoints."""
        endpoint_data = BASIC_ENDPOINTS[endpoint_name]
        # Create test instance
        instance = endpoint_data["factory"]()

        # Special handling for production lines - clean up auto-created scanners
        if endpoint_name == "productionline":
            # Delete any auto-created scanners to allow production line deletion
            instance.scanners.all().delete()

        url = reverse(f"tracking:{endpoint_name}-detail", args=[instance.id])
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify the instance is deleted
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_basic_instances_fixture(self, authenticated_client, basic_instances):
        """Test that all basic instances are created correctly."""
        assert len(basic_instances) == len(BASIC_ENDPOINTS)
        for name, instance in basic_instances.items():
            if name == "spread":
                assert hasattr(instance, "number")
                assert instance.number.startswith("SP")
            else:
                assert hasattr(instance, "name")
                assert instance.name.startswith("Test Item")

    @pytest.mark.parametrize("endpoint_name", BASIC_ENDPOINTS.keys())
    def test_unauthenticated_access_denied(self, api_client, endpoint_name):
        """Test that unauthenticated requests are denied for all endpoints."""
        url = reverse(f"tracking:{endpoint_name}-list-create")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
