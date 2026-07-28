import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from tracking.models import Scanner, Scan, PartInventory
from tracking.models.constants import (
    ScannerType,
    BundleStatus,
    LineType,
    ScanEventType,
)
from tracking.tests.conftest import (
    BundleFactory,
    ProductionLineFactory,
    UserFactory,
    PartFactory,
    OrderFactory,
    StyleFactory,
)


@pytest.mark.django_db
class TestPartReceiveScan:
    """Test part receive scan endpoint."""

    @pytest.fixture
    def setup_data(self):
        """Setup test data."""
        # Create sewing line with assembly tracking scanner
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = Scanner.objects.create(
            name="Part Tracking Scanner",
            scanner_type=ScannerType.ASSEMBLY_TRACKING,
            production_line=sewing_line,
        )

        # Create user with assigned scanner
        user = UserFactory(assigned_scanner=scanner)

        # Create style and part
        style = StyleFactory()
        part = PartFactory()

        # Add part to style
        style.parts.add(part)

        # Create order with the same style as the part
        order = OrderFactory(style=style)

        # Create bundle to be scanned
        bundle = BundleFactory(
            order=order,
            part=part,
            status=BundleStatus.ISSUED_TO_SEWING,
            assigned_sewing_line=sewing_line,
            garment_quantity=10,
        )

        return {
            "user": user,
            "scanner": scanner,
            "sewing_line": sewing_line,
            "style": style,
            "part": part,
            "order": order,
            "bundle": bundle,
        }

    def test_part_receive_scan_success(self, setup_data, authenticated_client):
        """Test successful part receive scan."""
        # Authenticate with the scanner user
        authenticated_client.force_authenticate(user=setup_data["user"])

        url = reverse("tracking:scan-part-receive")
        data = {
            "tracking_code": setup_data["bundle"].tracking_code,
            "production_line": setup_data["sewing_line"].id,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        assert "part" in response.data

        # Check that bundle status was updated
        setup_data["bundle"].refresh_from_db()
        assert setup_data["bundle"].status == BundleStatus.COMPLETED

        # Check that part inventory was created/updated
        inventory = PartInventory.objects.get(
            production_line=setup_data["sewing_line"],
            order=setup_data["order"],
            part=setup_data["part"],
        )
        assert inventory.total_quantity == 10
        assert inventory.issued_quantity == 0

        # Check that scan record was created
        assert Scan.objects.filter(
            scanner=setup_data["scanner"],
            bundle=setup_data["bundle"],
            event_type=ScanEventType.BUNDLE_COMPLETED,
        ).exists()

    def test_part_receive_scan_invalid_tracking_code(
        self, setup_data, authenticated_client
    ):
        """Test part receive scan with invalid tracking code."""
        authenticated_client.force_authenticate(user=setup_data["user"])

        url = reverse("tracking:scan-part-receive")
        data = {
            "tracking_code": "INVALID-CODE",
            "production_line": setup_data["sewing_line"].id,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "tracking_code" in response.data

    def test_part_receive_scan_bundle_wrong_status(
        self, setup_data, authenticated_client
    ):
        """Test part receive scan with bundle in wrong status."""
        authenticated_client.force_authenticate(user=setup_data["user"])

        # Set bundle to wrong status (not ISSUED_TO_SEWING)
        setup_data["bundle"].status = BundleStatus.CREATED
        setup_data["bundle"].save()

        url = reverse("tracking:scan-part-receive")
        data = {
            "tracking_code": setup_data["bundle"].tracking_code,
            "production_line": setup_data["sewing_line"].id,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "status" in response.data

    def test_part_receive_scan_duplicate_scan(self, setup_data, authenticated_client):
        """Test part receive scan with already processed bundle."""
        authenticated_client.force_authenticate(user=setup_data["user"])

        # First scan
        url = reverse("tracking:scan-part-receive")
        data = {
            "tracking_code": setup_data["bundle"].tracking_code,
            "production_line": setup_data["sewing_line"].id,
        }

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        # Second scan of same bundle
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "duplicate" in response.data or "already" in response.data

    def test_part_receive_scan_unauthorized_scanner(
        self, setup_data, authenticated_client
    ):
        """Test part receive scan with user not assigned to scanner."""
        # Create user without assigned scanner
        user_no_scanner = UserFactory()
        authenticated_client.force_authenticate(user=user_no_scanner)

        url = reverse("tracking:scan-part-receive")
        data = {
            "tracking_code": setup_data["bundle"].tracking_code,
            "production_line": setup_data["sewing_line"].id,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_part_receive_scan_wrong_scanner_type(
        self, setup_data, authenticated_client
    ):
        """Test part receive scan with wrong scanner type."""
        # Create scanner with wrong type
        cutting_line = ProductionLineFactory(line_type=LineType.CUTTING)
        cutting_scanner = Scanner.objects.create(
            name="Cutting Scanner",
            scanner_type=ScannerType.BUNDLE_ISSUE,
            production_line=cutting_line,
        )
        user = UserFactory(assigned_scanner=cutting_scanner)
        authenticated_client.force_authenticate(user=user)

        url = reverse("tracking:scan-part-receive")
        data = {
            "tracking_code": setup_data["bundle"].tracking_code,
            "production_line": setup_data["sewing_line"].id,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_part_receive_info_endpoint(self, setup_data, authenticated_client):
        """Test part receive info endpoint."""
        authenticated_client.force_authenticate(user=setup_data["user"])

        # Create some scans for history. issued_at must be set alongside
        # ISSUED_TO_SEWING (as the real issue flow does) — the line's active
        # style is derived from the latest issued_at, and history is scoped to it.
        bundle1 = BundleFactory(
            order=setup_data["order"],
            part=setup_data["part"],
            status=BundleStatus.ISSUED_TO_SEWING,
            assigned_sewing_line=setup_data["sewing_line"],
            issued_at=timezone.now(),
        )
        bundle2 = BundleFactory(
            order=setup_data["order"],
            part=setup_data["part"],
            status=BundleStatus.ISSUED_TO_SEWING,
            assigned_sewing_line=setup_data["sewing_line"],
            issued_at=timezone.now(),
        )

        Scan.objects.create(
            scanner=setup_data["scanner"],
            bundle=bundle1,
            event_type=ScanEventType.BUNDLE_COMPLETED,
        )
        Scan.objects.create(
            scanner=setup_data["scanner"],
            bundle=bundle2,
            event_type=ScanEventType.BUNDLE_COMPLETED,
        )

        url = reverse("tracking:scan-part-receive-info")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "recent_scans" in response.data
        assert len(response.data["recent_scans"]) == 2

    def test_part_receive_info_filtered_by_part(self, setup_data, authenticated_client):
        """Test part receive info endpoint filtered by part."""
        authenticated_client.force_authenticate(user=setup_data["user"])

        # Create different part
        different_part = PartFactory()

        # Create bundles for different parts
        bundle1 = BundleFactory(
            order=setup_data["order"],
            part=setup_data["part"],
            status=BundleStatus.ISSUED_TO_SEWING,
            assigned_sewing_line=setup_data["sewing_line"],
            issued_at=timezone.now(),
        )
        bundle2 = BundleFactory(
            order=setup_data["order"],
            part=different_part,
            status=BundleStatus.ISSUED_TO_SEWING,
            assigned_sewing_line=setup_data["sewing_line"],
            issued_at=timezone.now(),
        )

        Scan.objects.create(
            scanner=setup_data["scanner"],
            bundle=bundle1,
            event_type=ScanEventType.BUNDLE_COMPLETED,
        )
        Scan.objects.create(
            scanner=setup_data["scanner"],
            bundle=bundle2,
            event_type=ScanEventType.BUNDLE_COMPLETED,
        )

        url = reverse("tracking:scan-part-receive-info")
        response = authenticated_client.get(url, {"part": setup_data["part"].id})

        assert response.status_code == status.HTTP_200_OK
        assert "recent_scans" in response.data
        assert len(response.data["recent_scans"]) == 1
        assert (
            response.data["recent_scans"][0]["bundle"]["part"] == setup_data["part"].id
        )

    def test_part_receive_fifo_validation(self, setup_data, authenticated_client):
        """Test that part receive scan validates FIFO sequence."""
        authenticated_client.force_authenticate(user=setup_data["user"])

        # Get the current bundle's number to understand the sequence
        current_bundle = setup_data["bundle"]
        current_bundle_number = current_bundle.bundle_number_in_spread

        # Create an earlier bundle that should be processed first
        # Use a number less than the current bundle to simulate FIFO violation
        earlier_bundle = BundleFactory(
            order=setup_data["order"],
            part=setup_data["part"],
            spread=setup_data["bundle"].spread,
            status=BundleStatus.CREATED,
            garment_quantity=5,
        )

        # Manually set the earlier bundle to have a lower number than current bundle
        # This simulates scanning a later bundle before an earlier one
        earlier_bundle.bundle_number_in_spread = current_bundle_number - 1
        earlier_bundle.save()

        url = reverse("tracking:scan-part-receive")
        data = {
            "tracking_code": setup_data["bundle"].tracking_code,
            "production_line": setup_data["sewing_line"].id,
        }

        response = authenticated_client.post(url, data)

        # Should succeed but with FIFO warning
        assert response.status_code == status.HTTP_201_CREATED
        assert "fifo_compliance" in response.data
        assert response.data["fifo_compliance"]["is_compliant"] is False

        # Check that bundle was marked as non-FIFO compliant
        setup_data["bundle"].refresh_from_db()
        assert setup_data["bundle"].fifo_violation_flag is True

    def test_part_receive_scan_inventory_aggregation(
        self, setup_data, authenticated_client
    ):
        """Test that multiple scans for same part aggregate inventory correctly."""
        authenticated_client.force_authenticate(user=setup_data["user"])

        # Create another bundle for same part
        bundle2 = BundleFactory(
            order=setup_data["order"],
            part=setup_data["part"],
            status=BundleStatus.ISSUED_TO_SEWING,
            assigned_sewing_line=setup_data["sewing_line"],
            garment_quantity=15,
        )

        # Scan first bundle
        url = reverse("tracking:scan-part-receive")
        data = {
            "tracking_code": setup_data["bundle"].tracking_code,
            "production_line": setup_data["sewing_line"].id,
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        # Scan second bundle
        data = {
            "tracking_code": bundle2.tracking_code,
            "production_line": setup_data["sewing_line"].id,
        }
        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        # Check that inventory was aggregated correctly
        inventory = PartInventory.objects.get(
            production_line=setup_data["sewing_line"],
            order=setup_data["order"],
            part=setup_data["part"],
        )
        assert inventory.total_quantity == 25  # 10 + 15
        assert inventory.issued_quantity == 0
