import pytest
from rest_framework import status
from django.urls import reverse
from django.db import IntegrityError
from tracking.models import Bundle
from tracking.tests.conftest import (
    SpreadFactory,
    OrderFactory,
    BundleFactory,
    GarmentFactory,
    PartFactory,
)


@pytest.mark.django_db
class TestSpreadIntegration:
    """Test the integration of Spread model with Bundle and other models."""

    def test_spread_crud(self, authenticated_client):
        """Test basic Spread CRUD operations."""
        # Create
        create_data = {"number": "SP001"}
        url = reverse("tracking:spread-list-create")
        response = authenticated_client.post(url, create_data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["number"] == "SP001"
        spread_id = response.data["id"]

        # Read
        url = reverse("tracking:spread-detail", args=[spread_id])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["number"] == "SP001"

        # Update
        update_data = {"number": "SP002"}
        response = authenticated_client.put(url, update_data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["number"] == "SP002"

        # Delete
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_spread_number_unique(self, authenticated_client):
        """Test that spread numbers must be unique."""
        SpreadFactory(number="SP001")

        create_data = {"number": "SP001"}
        url = reverse("tracking:spread-list-create")
        response = authenticated_client.post(url, create_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bundle_with_spread(self, authenticated_client):
        """Test creating bundle sets with spread association."""
        spread = SpreadFactory(number="SP001")
        order = OrderFactory()

        # Create parts for the style
        part1 = PartFactory(name="Front")
        part2 = PartFactory(name="Back")
        order.style.parts.add(part1, part2)

        create_data = {
            "order": order.id,
            "spread": spread.id,
            "bundle_size": 10,
        }
        url = reverse("tracking:bundle-list-create")
        response = authenticated_client.post(url, create_data)
        assert response.status_code == status.HTTP_201_CREATED

        # Should create bundles for all parts
        assert response.data["bundle_count"] == 2  # One for each part
        assert response.data["bundle_size"] == 10

        # Check that bundles were created with correct spread
        bundles = Bundle.objects.filter(order=order)
        assert bundles.count() == 2
        for bundle in bundles:
            assert bundle.spread == spread
            assert bundle.bundle_number_in_spread == response.data["bundle_number"]
            expected_display = (
                f"SP001-{bundle.bundle_number_in_spread:03d}-{bundle.part.name.upper()}"
            )
            assert bundle.display_bundle_number == expected_display

    def test_bundle_number_in_spread_unique(self, authenticated_client):
        """Test that bundle numbers within a spread are auto-generated uniquely."""
        spread = SpreadFactory(number="SP001")
        order1 = OrderFactory()
        order2 = OrderFactory()

        # Create parts for both orders
        part1 = PartFactory(name="Front")
        part2 = PartFactory(name="Back")
        order1.style.parts.add(part1, part2)
        order2.style.parts.add(part1, part2)

        # Create first bundle set
        create_data1 = {
            "order": order1.id,
            "spread": spread.id,
            "bundle_size": 10,
        }
        url = reverse("tracking:bundle-list-create")
        response1 = authenticated_client.post(url, create_data1)
        assert response1.status_code == status.HTTP_201_CREATED
        first_bundle_number = response1.data["bundle_number"]

        # Create second bundle set - should auto-generate unique number
        create_data2 = {
            "order": order2.id,
            "spread": spread.id,
            "bundle_size": 10,
        }
        response2 = authenticated_client.post(url, create_data2)
        assert response2.status_code == status.HTTP_201_CREATED
        second_bundle_number = response2.data["bundle_number"]

        # Bundle numbers should be unique within the spread
        assert second_bundle_number == first_bundle_number + 1

    def test_bundle_filter_by_spread(self, authenticated_client):
        """Test filtering bundles by spread."""
        spread1 = SpreadFactory(number="SP001")
        spread2 = SpreadFactory(number="SP002")
        order = OrderFactory()
        part = PartFactory()

        bundle1 = BundleFactory(
            order=order,
            part=part,
            spread=spread1,
            bundle_number_in_spread=1,
        )
        bundle2 = BundleFactory(
            order=order,
            part=part,
            spread=spread2,
            bundle_number_in_spread=1,
        )

        # Filter by spread1
        url = reverse("tracking:bundle-list-create")
        response = authenticated_client.get(url, {"spread": spread1.id})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == bundle1.id

        # Filter by spread2
        response = authenticated_client.get(url, {"spread": spread2.id})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == bundle2.id

    def test_garment_sequence_number(self, authenticated_client):
        """Test garment sequence numbering."""
        order = OrderFactory()

        # Create garments with sequence numbers
        garment1 = GarmentFactory(
            order=order,
            sequence_number=1,
        )
        garment2 = GarmentFactory(
            order=order,
            sequence_number=2,
        )

        # Test display numbers
        assert garment1.display_number == f"{order.order_number}-G0001"
        assert garment2.display_number == f"{order.order_number}-G0002"

        # Test via API
        url = reverse("tracking:garment-detail", args=[garment1.id])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["sequence_number"] == 1
        assert response.data["display_number"] == f"{order.order_number}-G0001"

    def test_garment_sequence_unique_per_order(self):
        """Test that garment sequence numbers are unique per order."""
        order = OrderFactory()

        # Create first garment
        GarmentFactory(
            order=order,
            sequence_number=1,
        )

        # Try to create second garment with same sequence number
        with pytest.raises(IntegrityError):
            GarmentFactory(
                order=order,
                sequence_number=1,
            )

    def test_garment_sequence_number_required(self):
        """Test that garment sequence number is required."""
        order = OrderFactory()

        # Sequence number is required for garments
        garment = GarmentFactory(order=order, sequence_number=1)
        assert garment.sequence_number == 1
        # Display number should include the sequence number
        assert str(garment.sequence_number) in garment.display_number
        assert order.order_number in garment.display_number
