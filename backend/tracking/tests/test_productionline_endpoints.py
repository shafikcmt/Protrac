import pytest
from django.urls import reverse
from rest_framework import status
from tracking.models.tracking import ProductionLine
from tracking.tests.conftest import ProductionLineFactory
from tracking.models.constants import LineType, SCANNER_TYPE_MAPPING


@pytest.mark.django_db
class TestProductionLineEndpoints:
    """Test production line CRUD operations using the existing pattern."""

    def test_create_endpoint(self, authenticated_client):
        """Test CREATE operation for production line."""
        url = reverse("tracking:productionline-list-create")
        data = {"name": "Test Line", "line_type": "cutting"}
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert "id" in response.data
        assert "name" in response.data
        assert "scanners" in response.data

    def test_list_endpoint(self, authenticated_client):
        """Test LIST operation for production line."""
        ProductionLineFactory()
        url = reverse("tracking:productionline-list-create")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) > 0

    def test_detail_endpoint(self, authenticated_client):
        """Test READ detail operation for production line."""
        instance = ProductionLineFactory()
        url = reverse("tracking:productionline-detail", args=[instance.id])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == instance.id
        assert response.data["name"] == instance.name

    def test_update_endpoint(self, authenticated_client):
        """Test UPDATE operation for production line."""
        instance = ProductionLineFactory()
        url = reverse("tracking:productionline-detail", args=[instance.id])
        data = {"name": "Updated Line", "line_type": "sewing"}
        response = authenticated_client.put(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Updated Line"

    def test_delete_endpoint_with_scanners(self, authenticated_client):
        """Test DELETE operation fails when production line has scanners."""
        instance = ProductionLineFactory()
        url = reverse("tracking:productionline-detail", args=[instance.id])
        response = authenticated_client.delete(url)
        
        # Should fail with 400 because production line has auto-created scanners
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "scanners" in response.data["detail"].lower()
        assert response.data["code"] == "production_line_has_scanners"
        
        # Production line should still exist
        instance.refresh_from_db()
        assert instance.name is not None

    def test_delete_endpoint_success(self, authenticated_client):
        """Test DELETE operation succeeds when production line has no dependencies."""
        # Create production line without auto-creating scanners
        instance = ProductionLineFactory()
        
        # Remove auto-created scanners to allow deletion
        instance.scanners.all().delete()
        
        url = reverse("tracking:productionline-detail", args=[instance.id])
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestScannerAutoCreation:
    """Test automatic scanner creation for different line types."""

    @pytest.mark.parametrize("line_type", [choice[0] for choice in LineType.choices])
    def test_scanners_auto_created_for_line_types(
        self, authenticated_client, line_type
    ):
        """Test that required scanners are automatically created for each line type."""
        url = reverse("tracking:productionline-list-create")
        data = {"name": f"Test {line_type.title()} Line", "line_type": line_type}

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        # Get the created production line
        line_id = response.data["id"]
        production_line = ProductionLine.objects.get(id=line_id)

        # Check that scanners were created
        required_scanner_types = SCANNER_TYPE_MAPPING.get(line_type, [])
        created_scanners = production_line.scanners.all()

        assert len(created_scanners) == len(required_scanner_types)
        for scanner in created_scanners:
            assert scanner.scanner_type in required_scanner_types
            assert scanner.production_line == production_line


@pytest.mark.django_db
class TestScannerListEndpoint:
    """Test scanner list endpoint (read-only)."""

    def test_scanner_list_endpoint(self, authenticated_client):
        """Test that scanners can be listed."""
        # Create a production line which auto-creates scanners
        ProductionLineFactory(line_type="sewing")

        url = reverse("tracking:scanner-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) > 0

        # Check scanner data structure
        scanner_data = response.data["results"][0]
        assert "name" in scanner_data
        assert "scanner_type" in scanner_data
        assert "production_line_name" in scanner_data
        assert "production_line_type" in scanner_data

    def test_scanner_list_empty(self, authenticated_client):
        """Test scanner list when no scanners exist."""
        url = reverse("tracking:scanner-list")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) == 0
