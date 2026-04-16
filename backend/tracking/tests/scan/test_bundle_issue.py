import pytest
from django.urls import reverse
from rest_framework import status
from tracking.models import Scanner, Scan
from tracking.models.constants import ScannerType, BundleStatus, LineType, ScanEventType
from tracking.tests.conftest import (
    BundleFactory,
    ProductionLineFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestBundleIssueScan:
    """Test bundle issue scan endpoint."""

    @pytest.fixture
    def setup_data(self):
        """Setup test data."""
        # Create sewing line
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)

        # Create cutting line with bundle issue scanner
        cutting_line = ProductionLineFactory(line_type=LineType.CUTTING)
        scanner = Scanner.objects.create(
            name="Bundle Issue Scanner",
            scanner_type=ScannerType.BUNDLE_ISSUE,
            production_line=cutting_line,
        )

        # Create user with assigned scanner
        user = UserFactory(assigned_scanner=scanner)

        # Create bundle
        bundle = BundleFactory(status=BundleStatus.CREATED)

        return {
            "user": user,
            "scanner": scanner,
            "sewing_line": sewing_line,
            "bundle": bundle,
        }

    def test_bundle_issue_scan_success(self, api_client, setup_data):
        """Test successful bundle issue scan."""
        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-bundle-issue")

        data = {
            "tracking_code": setup_data["bundle"].tracking_code,
            "sewing_line": setup_data["sewing_line"].id,
        }

        response = api_client.post(url, data)

        # Verify API response
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        assert "bundle_id" in response.data
        assert "scan_id" in response.data

        # Verify bundle was updated correctly
        setup_data["bundle"].refresh_from_db()
        assert setup_data["bundle"].status == BundleStatus.ISSUED_TO_SEWING
        assert setup_data["bundle"].assigned_sewing_line == setup_data["sewing_line"]

        # Verify scan record was created
        scan = Scan.objects.get(id=response.data["scan_id"])
        assert scan.bundle == setup_data["bundle"]
        assert scan.scanner == setup_data["scanner"]
        assert scan.event_type == ScanEventType.BUNDLE_ISSUED_TO_SEWING

    def test_bundle_issue_scan_already_processed(self, api_client, setup_data):
        """Test bundle issue scan with already processed bundle."""
        # Set bundle status to already issued
        setup_data["bundle"].status = BundleStatus.ISSUED_TO_SEWING
        setup_data["bundle"].save()

        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-bundle-issue")

        data = {
            "tracking_code": setup_data["bundle"].tracking_code,
            "sewing_line": setup_data["sewing_line"].id,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already processed" in response.data["error"]

        # Verify no scan record was created
        assert not Scan.objects.filter(bundle=setup_data["bundle"]).exists()

    def test_bundle_issue_scan_invalid_tracking_code(self, api_client, setup_data):
        """Test bundle issue scan with invalid tracking code."""
        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-bundle-issue")

        data = {
            "tracking_code": "INVALID123",
            "sewing_line": setup_data["sewing_line"].id,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.data

        # Verify original bundle unchanged
        setup_data["bundle"].refresh_from_db()
        assert setup_data["bundle"].status == BundleStatus.CREATED
        assert setup_data["bundle"].assigned_sewing_line is None

    def test_bundle_issue_scan_no_scanner(self, api_client, setup_data):
        """Test bundle issue scan with user having no scanner."""
        user_no_scanner = UserFactory(assigned_scanner=None)
        api_client.force_authenticate(user=user_no_scanner)
        url = reverse("tracking:scan-bundle-issue")

        data = {
            "tracking_code": setup_data["bundle"].tracking_code,
            "sewing_line": setup_data["sewing_line"].id,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Verify bundle unchanged
        setup_data["bundle"].refresh_from_db()
        assert setup_data["bundle"].status == BundleStatus.CREATED


@pytest.mark.django_db
class TestBundleIssueInfo:
    """Test bundle issue info endpoint."""

    @pytest.fixture
    def setup_info_data(self):
        """Setup test data for info endpoint."""
        # Create cutting line with bundle issue scanner
        cutting_line = ProductionLineFactory(line_type=LineType.CUTTING)
        scanner = Scanner.objects.create(
            name="Bundle Issue Scanner",
            scanner_type=ScannerType.BUNDLE_ISSUE,
            production_line=cutting_line,
        )

        # Create user with assigned scanner
        user = UserFactory(assigned_scanner=scanner)

        return {"user": user, "scanner": scanner}

    def test_bundle_issue_info_success(self, api_client, setup_info_data):
        """Test successful bundle issue info retrieval."""
        api_client.force_authenticate(user=setup_info_data["user"])
        url = reverse("tracking:scan-bundle-issue-info")

        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "scanner_info" in response.data
        assert "count" in response.data
        assert "results" in response.data

        # Verify scanner info matches
        scanner_info = response.data["scanner_info"]
        assert scanner_info["scanner_type"] == ScannerType.BUNDLE_ISSUE
        assert scanner_info["scanner_name"] == setup_info_data["scanner"].name

    def test_bundle_issue_info_with_scan_history(self, api_client, setup_info_data):
        """Test bundle issue info shows actual scan history."""
        # Create sewing line and bundle
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        bundle = BundleFactory(
            status=BundleStatus.ISSUED_TO_SEWING, assigned_sewing_line=sewing_line
        )

        # Create scan record
        scan = Scan.objects.create(
            bundle=bundle,
            scanner=setup_info_data["scanner"],
            event_type=ScanEventType.BUNDLE_ISSUED_TO_SEWING,
        )

        api_client.force_authenticate(user=setup_info_data["user"])
        url = reverse("tracking:scan-bundle-issue-info")

        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

        # Verify scan data is returned
        result = response.data["results"][0]
        assert result["id"] == scan.id
        assert result["tracking_code"] == bundle.tracking_code
        assert result["issued_to_sewing_line"] == sewing_line.name

    def test_bundle_issue_info_no_scanner(self, api_client):
        """Test bundle issue info with user having no scanner."""
        user_no_scanner = UserFactory(assigned_scanner=None)
        api_client.force_authenticate(user=user_no_scanner)
        url = reverse("tracking:scan-bundle-issue-info")

        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
