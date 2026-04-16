import pytest
from django.urls import reverse
from rest_framework import status
from tracking.tests.conftest import (
    StyleFactory,
    BuyerFactory,
    SeasonFactory,
    PartFactory,
)


@pytest.mark.django_db
class TestStyleEndpoints:
    """Tests for style CRUD operations."""

    def test_create_style_with_parts(self, authenticated_client):
        """Test creating a style with parts."""
        buyer = BuyerFactory()
        season = SeasonFactory()
        
        # Create parts first (since they're now reusable)
        part1 = PartFactory(name="Front Body")
        part2 = PartFactory(name="Back Body")

        url = reverse("tracking:style-list-create")
        data = {
            "name": "Test Style",
            "buyer": buyer.id,
            "season": season.id,
            "parts": [part1.id, part2.id],  # Use part IDs instead of definitions
        }

        response = authenticated_client.post(url, data, format="json")
        print("Response status:", response.status_code)
        print("Response data:", response.data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Test Style"
        assert len(response.data["parts_details"]) == 2
        assert response.data["parts_details"][0]["name"] == "Front Body"
        assert response.data["parts_details"][1]["name"] == "Back Body"

    def test_list_styles(self, authenticated_client):
        """Test listing styles."""
        StyleFactory()
        url = reverse("tracking:style-list-create")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data

    def test_get_style_detail(self, authenticated_client):
        """Test getting style detail."""
        style = StyleFactory()
        url = reverse("tracking:style-detail", args=[style.id])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == style.id

    def test_update_style(self, authenticated_client):
        """Test updating style."""
        style = StyleFactory()
        
        # Create parts first (since they're now reusable)
        part1 = PartFactory(name="Updated Part 1")
        part2 = PartFactory(name="Updated Part 2")
        
        url = reverse("tracking:style-detail", args=[style.id])
        data = {
            "name": "Updated Style",
            "buyer": style.buyer.id,
            "season": style.season.id,
            "parts": [part1.id, part2.id],  # Use part IDs
        }
        response = authenticated_client.put(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Style"
        assert len(response.data["parts_details"]) == 2

    def test_delete_style(self, authenticated_client):
        """Test deleting style."""
        style = StyleFactory()
        url = reverse("tracking:style-detail", args=[style.id])
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_validation_duplicate_part_ids(self, authenticated_client):
        """Test validation when duplicate part IDs are specified."""
        buyer = BuyerFactory()
        season = SeasonFactory()
        
        # Create a part
        part = PartFactory(name="Front Body")

        url = reverse("tracking:style-list-create")
        data = {
            "name": "Test Style",
            "buyer": buyer.id,
            "season": season.id,
            "parts": [part.id, part.id],  # Duplicate part ID
        }

        response = authenticated_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_validation_invalid_part_id(self, authenticated_client):
        """Test validation when invalid part ID is specified."""
        buyer = BuyerFactory()
        season = SeasonFactory()

        url = reverse("tracking:style-list-create")
        data = {
            "name": "Test Style",
            "buyer": buyer.id,
            "season": season.id,
            "parts": [99999],  # Non-existent part ID
        }

        response = authenticated_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
