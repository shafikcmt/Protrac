import pytest
from django.urls import reverse
from rest_framework import status
from tracking.tests.conftest import (
    BundleFactory,
    OrderFactory,
    PartFactory,
    StyleFactory,
    SpreadFactory,
)


@pytest.mark.django_db
class TestBundleEndpoints:
    """Tests for bundle endpoints with simplified style-centric approach."""

    def test_create_single_bundle_set(self, authenticated_client):
        """Test creating a single bundle set for all parts of a style."""
        # Create a style with multiple parts
        style = StyleFactory()
        part1 = PartFactory(name="Collar")
        part2 = PartFactory(name="Sleeve")
        part3 = PartFactory(name="Body")

        # Associate parts with the style
        style.parts.set([part1, part2, part3])

        # Create order and spread
        order = OrderFactory(style=style)
        spread = SpreadFactory()

        url = reverse("tracking:bundle-list-create")
        data = {
            "order": order.id,
            "bundle_size": 10,
            "spread": spread.id,
        }

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        # Should create bundles for all parts
        assert response.data["bundle_count"] == 3
        assert response.data["bundle_size"] == 10
        assert "bundles" in response.data

        # Check that bundles were created for all parts
        bundles = response.data["bundles"]
        part_names = {bundle["part_name"] for bundle in bundles}
        assert part_names == {"Collar", "Sleeve", "Body"}

        # All bundles should have the same bundle number and ranges
        for bundle in bundles:
            assert bundle["bundle_number_in_spread"] == 1
            assert bundle["part_number_start"] == 1
            assert bundle["part_number_end"] == 10
            assert bundle["garment_quantity"] == 10

    def test_create_single_bundle_set_creates_garments(self, authenticated_client):
        """Test that single bundle sets create the appropriate garment records."""
        # Create a style with 2 parts
        style = StyleFactory()
        part1 = PartFactory(name="Collar")
        part2 = PartFactory(name="Sleeve")

        # Associate parts with the style
        style.parts.set([part1, part2])

        # Create order and spread
        order = OrderFactory(style=style)
        spread = SpreadFactory()

        url = reverse("tracking:bundle-list-create")
        data = {
            "order": order.id,
            "bundle_size": 5,
            "spread": spread.id,
        }

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        # Should create 2 bundles (one for each part)
        assert response.data["bundle_count"] == 2

        # Should create 5 garments (not per part, but total)
        order.refresh_from_db()
        assert order.garments.count() == 5

        # Check garment sequence numbers
        garments = order.garments.order_by("sequence_number")
        for i, garment in enumerate(garments):
            assert garment.sequence_number == i + 1
            assert garment.bundle_set_number == 1
            assert garment.part_number_in_bundle == i + 1

    def test_bulk_preview_with_parts(self, authenticated_client):
        """Test bulk preview calculates correct quantities."""
        # Create style with parts
        style = StyleFactory()
        part1 = PartFactory(name="Front Body")
        part2 = PartFactory(name="Back Body")

        # Associate parts with the style
        style.parts.set([part1, part2])

        order = OrderFactory(style=style)
        spread = SpreadFactory()

        url = reverse("tracking:bundle-bulk-preview")
        data = {
            "order": order.id,
            "total_garment_quantity": 10,
            "spread": spread.id,
        }

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["total_bundles"] == 2
        assert response.data["total_garment_quantity"] == 10

        # Check parts information
        parts = response.data["parts"]
        part1_info = next(p for p in parts if p["part_id"] == part1.id)
        part2_info = next(p for p in parts if p["part_id"] == part2.id)

        assert part1_info["bundles_count"] == 1
        assert part2_info["bundles_count"] == 1

    def test_bulk_create_with_parts(self, authenticated_client):
        """Test bulk bundle creation with parts."""
        # Create style with parts
        style = StyleFactory()
        part1 = PartFactory(name="Front Body")
        part2 = PartFactory(name="Back Body")

        # Associate parts with the style
        style.parts.set([part1, part2])

        order = OrderFactory(style=style)
        spread = SpreadFactory()

        url = reverse("tracking:bundle-bulk-create")
        data = {
            "order": order.id,
            "total_garment_quantity": 5,
            "bundle_size": 5,
            "spread": spread.id,
        }

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["total_bundle_count"] == 2  # 2 parts × 1 bundle set each

        # Verify bundles were actually created
        bundles = response.data["bundles"]
        assert len(bundles) == 2  # 2 parts

        # Check quantities match calculation
        quantities = [b["garment_quantity"] for b in bundles]
        assert 5 in quantities  # Both parts should have 5 garments each
        assert len([q for q in quantities if q == 5]) == 2

    def test_bulk_create_auto_creates_garments(self, authenticated_client):
        """Test that bulk bundle creation automatically creates garment records."""
        # Style with parts that can make complete garments
        style = StyleFactory()
        part1 = PartFactory(name="Front Body")
        part2 = PartFactory(name="Back Body")

        # Associate parts with the style
        style.parts.set([part1, part2])

        order = OrderFactory(style=style)
        spread = SpreadFactory()

        # Verify no garments exist initially
        assert order.garments.count() == 0

        # Create bundles for 3 garments worth
        url = reverse("tracking:bundle-bulk-create")
        data = {
            "order": order.id,
            "total_garment_quantity": 3,
            "spread": spread.id,
        }

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        # Verify garments were auto-created
        order.refresh_from_db()
        assert order.garments.count() == 3

        # Verify garments have tracking codes
        garments = order.garments.all()
        for garment in garments:
            assert garment.tracking_code is not None

    def test_calculate_potential_garments(self, authenticated_client):
        """Test calculation of potential garments from bundles."""
        # Setup: Style with single part
        style = StyleFactory()
        part = PartFactory(name="Body")

        # Associate part with the style
        style.parts.set([part])

        order = OrderFactory(style=style)
        spread1 = SpreadFactory()
        spread2 = SpreadFactory()

        # Create bundles: 10 + 20 = 30 total for this part
        BundleFactory(
            order=order,
            part=part,
            garment_quantity=10,
            spread=spread1,
        )
        BundleFactory(
            order=order,
            part=part,
            garment_quantity=20,
            spread=spread2,
        )

        url = reverse("tracking:order-detail", kwargs={"pk": order.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["potential_garments"] == 30

    def test_calculate_potential_garments_bottleneck(self, authenticated_client):
        """Test calculation handles bottleneck correctly."""
        # Setup: Style with multiple parts
        style = StyleFactory()
        part1 = PartFactory(name="Front")
        part2 = PartFactory(name="Back")

        # Associate parts with the style
        style.parts.set([part1, part2])

        order = OrderFactory(style=style)
        spread = SpreadFactory()

        # Create bundles: part1 has 10, part2 has 20
        # Should be bottlenecked at 10 garments
        BundleFactory(
            order=order,
            part=part1,
            garment_quantity=10,
            spread=spread,
        )
        BundleFactory(
            order=order,
            part=part2,
            garment_quantity=20,
            spread=spread,
        )

        url = reverse("tracking:order-detail", kwargs={"pk": order.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["potential_garments"] == 10  # Bottleneck

    def test_list_bundles_filtering(self, authenticated_client):
        """Test listing bundles with filters."""
        order1 = OrderFactory()
        order2 = OrderFactory()
        part1 = PartFactory()
        part2 = PartFactory()
        spread = SpreadFactory()

        # Create bundles for different orders and parts
        bundle1 = BundleFactory(order=order1, part=part1, spread=spread)
        bundle2 = BundleFactory(order=order2, part=part2, spread=spread)

        url = reverse("tracking:bundle-list-create")

        # Test filtering by order
        response = authenticated_client.get(url, {"order": order1.id})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == bundle1.id

        # Test filtering by part
        response = authenticated_client.get(url, {"part": part2.id})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == bundle2.id

    def test_bundle_detail_endpoint(self, authenticated_client):
        """Test bundle detail endpoint."""
        bundle = BundleFactory()
        url = reverse("tracking:bundle-detail", kwargs={"pk": bundle.pk})
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == bundle.id
        assert "tracking_code" in response.data
        assert "status" in response.data
        assert "garment_quantity" in response.data
