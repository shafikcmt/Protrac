import pytest
from django.urls import reverse
from rest_framework import status
from tracking.models import Scanner, Scan, QualityCheck
from tracking.models.constants import (
    ScannerType,
    LineType,
    ScanEventType,
    GarmentStatus,
    QualityCheckStatus,
)
from tracking.tests.conftest import (
    ProductionLineFactory,
    UserFactory,
    OrderFactory,
    DefectFactory,
    BundleFactory,
)


@pytest.mark.django_db
class TestFinishingQCScan:
    """Test finishing QC scan endpoint."""

    @pytest.fixture
    def setup_data(self):
        """Setup test data."""
        # Create sewing and finishing lines
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        finishing_line = ProductionLineFactory(line_type=LineType.FINISHING)

        scanner = Scanner.objects.create(
            name="Finishing QC Scanner",
            scanner_type=ScannerType.FINISHING_QC_CHECK,
            production_line=finishing_line,
        )

        # Create user with assigned scanner
        user = UserFactory(assigned_scanner=scanner)

        # Create order and bundle - garments will be created automatically
        order = OrderFactory()
        bundle = BundleFactory(
            order=order,
            assigned_sewing_line=sewing_line,
        )

        # Get the automatically created garment
        garment = order.garments.first()
        if not garment:
            # If no garment was created automatically, we need to trigger creation
            bundle.save()  # This should trigger garment creation
            garment = order.garments.first()

        if garment:
            garment.status = GarmentStatus.SEWING_QC_PASS
            garment.sewing_line = sewing_line
            garment.finishing_line = finishing_line  # Set finishing line for tests
            garment.save()

        # Create defects for testing
        defect1 = DefectFactory(name="Color Bleeding")
        defect2 = DefectFactory(name="Fabric Tear")

        return {
            "user": user,
            "scanner": scanner,
            "sewing_line": sewing_line,
            "finishing_line": finishing_line,
            "garment": garment,
            "bundle": bundle,
            "order": order,
            "defect1": defect1,
            "defect2": defect2,
        }

    def test_finishing_qc_scan_pass_success(self, api_client, setup_data):
        """Test successful finishing QC scan with PASS result."""
        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-finishing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
            "defect_ids": [],
        }

        response = api_client.post(url, data)

        # Verify API response
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["success"] is True
        assert response.data["garment_id"] == setup_data["garment"].id
        assert response.data["qc_status"] == QualityCheckStatus.PASS
        assert response.data["garment_status"] == GarmentStatus.FINISHING_QC_PASS
        assert response.data["finishing_line"] == setup_data["finishing_line"].name
        assert response.data["defect_count"] == 0
        assert response.data["is_reevaluation"] is False
        assert "quality_check_id" in response.data
        assert "scan_id" in response.data

        # Verify garment status and finishing line updated
        setup_data["garment"].refresh_from_db()
        assert setup_data["garment"].status == GarmentStatus.FINISHING_QC_PASS
        assert setup_data["garment"].finishing_line == setup_data["finishing_line"]

        # Verify quality check record created
        qc = QualityCheck.objects.get(id=response.data["quality_check_id"])
        assert qc.garment == setup_data["garment"]
        assert qc.status == QualityCheckStatus.PASS
        assert qc.defects.count() == 0

        # Verify scan record created
        scan = Scan.objects.get(id=response.data["scan_id"])
        assert scan.garment == setup_data["garment"]
        assert scan.scanner == setup_data["scanner"]
        assert scan.event_type == ScanEventType.FINISHING_QUALITY_CHECK

    def test_finishing_qc_scan_fail_with_defects(self, api_client, setup_data):
        """Test finishing QC scan with FAIL result and defects."""
        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-finishing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.FAIL,
            "defect_ids": [setup_data["defect1"].id, setup_data["defect2"].id],
        }

        response = api_client.post(url, data)

        # Verify API response
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["qc_status"] == QualityCheckStatus.FAIL
        assert response.data["garment_status"] == GarmentStatus.FINISHING_QC_FAIL
        assert response.data["defect_count"] == 2

        # Verify garment status updated
        setup_data["garment"].refresh_from_db()
        assert setup_data["garment"].status == GarmentStatus.FINISHING_QC_FAIL

        # Verify quality check record with defects
        qc = QualityCheck.objects.get(id=response.data["quality_check_id"])
        assert qc.status == QualityCheckStatus.FAIL
        assert qc.defects.count() == 2
        assert setup_data["defect1"] in qc.defects.all()
        assert setup_data["defect2"] in qc.defects.all()

    def test_finishing_qc_scan_QC_REWORK(self, api_client, setup_data):
        """Test finishing QC scan with REWORK result."""
        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-finishing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.REWORK,
            "defect_ids": [setup_data["defect1"].id],
        }

        response = api_client.post(url, data)

        # Verify API response
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["qc_status"] == QualityCheckStatus.REWORK
        assert response.data["garment_status"] == GarmentStatus.FINISHING_QC_REWORK
        assert response.data["defect_count"] == 1

        # Verify garment status updated
        setup_data["garment"].refresh_from_db()
        assert setup_data["garment"].status == GarmentStatus.FINISHING_QC_REWORK

    def test_finishing_qc_scan_reevaluation(self, api_client, setup_data):
        """Test reevaluation of already QC'd garment."""
        # First QC the garment
        setup_data["garment"].status = GarmentStatus.FINISHING_QC_FAIL
        setup_data["garment"].save()

        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-finishing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
            "is_reevaluation": True,
        }

        response = api_client.post(url, data)

        # Verify API response
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["is_reevaluation"] is True
        assert response.data["garment_status"] == GarmentStatus.FINISHING_QC_PASS

        # Verify garment status updated
        setup_data["garment"].refresh_from_db()
        assert setup_data["garment"].status == GarmentStatus.FINISHING_QC_PASS

    def test_reevaluation_auto_detected_without_flag(self, api_client, setup_data):
        """A garment in FINISHING_QC_REWORK/FAIL can be re-scanned with NO
        is_reevaluation flag — the backend auto-detects it from status (mirrors
        sewing QC). It passes and is flagged as a re-evaluation."""
        setup_data["garment"].status = GarmentStatus.FINISHING_QC_REWORK
        setup_data["garment"].save()

        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-finishing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
            # deliberately NO is_reevaluation flag
        }

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["is_reevaluation"] is True
        assert response.data["garment_status"] == GarmentStatus.FINISHING_QC_PASS

    def test_rescan_of_passed_garment_blocked(self, api_client, setup_data):
        """A garment already FINISHING_QC_PASS is blocked from re-scan so output/DHU
        are never double-counted (mirrors sewing QC; the old reevaluation flag no
        longer bypasses this)."""
        setup_data["garment"].status = GarmentStatus.FINISHING_QC_PASS
        setup_data["garment"].save()

        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-finishing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
            "is_reevaluation": True,  # ignored — re-scan of a pass is still blocked
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already passed finishing QC" in response.data["error"]

    def test_finishing_qc_scan_wrong_garment_status(self, api_client, setup_data):
        """Test scanning garment with wrong status."""
        # Set garment to wrong status
        setup_data["garment"].status = GarmentStatus.ISSUED_FOR_ASSEMBLY
        setup_data["garment"].save()

        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-finishing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not compatible for finishing QC" in response.data["error"]

    def test_finishing_qc_scan_invalid_tracking_code(self, api_client, setup_data):
        """Test scanning with invalid tracking code."""
        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-finishing-qc")

        data = {
            "tracking_code": "INVALID123",
            "qc_status": QualityCheckStatus.PASS,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid tracking code" in response.data["error"]

    def test_finishing_qc_scan_no_scanner(self, api_client, setup_data):
        """Test scanning with user having no scanner."""
        user_no_scanner = UserFactory(assigned_scanner=None)
        api_client.force_authenticate(user=user_no_scanner)
        url = reverse("tracking:scan-finishing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "no assigned scanner" in response.data["error"]

    def test_finishing_qc_scan_wrong_scanner_type(self, api_client, setup_data):
        """Test scanning with wrong scanner type."""
        # Create user with different scanner type
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        wrong_scanner = Scanner.objects.create(
            name="Sewing QC Scanner",
            scanner_type=ScannerType.SEWING_QC_CHECK,
            production_line=sewing_line,
        )
        user_wrong_scanner = UserFactory(assigned_scanner=wrong_scanner)

        api_client.force_authenticate(user=user_wrong_scanner)
        url = reverse("tracking:scan-finishing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not a finishing QC scanner" in response.data["error"]


@pytest.mark.django_db
class TestFinishingQCInfo:
    """Test finishing QC info endpoint."""

    @pytest.fixture
    def setup_info_data(self):
        """Setup test data for info endpoint."""
        # Create finishing line with QC scanner
        finishing_line = ProductionLineFactory(line_type=LineType.FINISHING)
        scanner = Scanner.objects.create(
            name="Finishing QC Scanner",
            scanner_type=ScannerType.FINISHING_QC_CHECK,
            production_line=finishing_line,
        )

        # Create user with assigned scanner
        user = UserFactory(assigned_scanner=scanner)

        return {"user": user, "scanner": scanner, "finishing_line": finishing_line}

    def test_finishing_qc_info_success(self, api_client, setup_info_data):
        """Test successful finishing QC info retrieval."""
        api_client.force_authenticate(user=setup_info_data["user"])
        url = reverse("tracking:scan-finishing-qc-info")

        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "scanner_info" in response.data
        assert "count" in response.data
        assert "results" in response.data

        # Verify scanner info matches
        scanner_info = response.data["scanner_info"]
        assert scanner_info["scanner_type"] == ScannerType.FINISHING_QC_CHECK
        assert scanner_info["scanner_name"] == setup_info_data["scanner"].name

    def test_finishing_qc_info_with_scan_history(self, api_client, setup_info_data):
        """Test finishing QC info shows actual scan history."""
        # Create order and bundle - garments will be created automatically
        order = OrderFactory()
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)

        bundle = BundleFactory(
            order=order,
            assigned_sewing_line=sewing_line,
        )

        # Get the automatically created garment
        garment = order.garments.first()
        if not garment:
            bundle.save()  # Trigger garment creation
            garment = order.garments.first()

        if garment:
            garment.status = GarmentStatus.FINISHING_QC_PASS
            garment.sewing_line = sewing_line
            garment.finishing_line = setup_info_data[
                "finishing_line"
            ]  # Set finishing line for tests
            garment.save()

        # Create quality check
        QualityCheck.objects.create(
            garment=garment,
            status=QualityCheckStatus.PASS,
        )

        # Create scan record
        scan = Scan.objects.create(
            garment=garment,
            scanner=setup_info_data["scanner"],
            event_type=ScanEventType.FINISHING_QUALITY_CHECK,
        )

        api_client.force_authenticate(user=setup_info_data["user"])
        url = reverse("tracking:scan-finishing-qc-info")

        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

        # Verify scan data is returned
        result = response.data["results"][0]
        assert result["id"] == scan.id
        assert result["tracking_code"] == garment.tracking_code
        assert result["garment_status"] == garment.status
        assert result["sewing_line"] == sewing_line.name
        assert result["finishing_line"] == setup_info_data["finishing_line"].name
        assert result["latest_qc_status"] == QualityCheckStatus.PASS
        assert result["defect_count"] == 0

    def test_finishing_qc_info_filtering(self, api_client, setup_info_data):
        """Test finishing QC info with filtering."""
        # Create different orders and bundles - garments will be created automatically
        order1 = OrderFactory()
        order2 = OrderFactory()
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)

        bundle1 = BundleFactory(
            order=order1,
            assigned_sewing_line=sewing_line,
        )
        bundle2 = BundleFactory(
            order=order2,
            assigned_sewing_line=sewing_line,
        )

        # Get the automatically created garments
        garment1 = order1.garments.first()
        garment2 = order2.garments.first()

        if not garment1:
            bundle1.save()
            garment1 = order1.garments.first()
        if not garment2:
            bundle2.save()
            garment2 = order2.garments.first()

        if garment1:
            garment1.status = GarmentStatus.FINISHING_QC_PASS
            garment1.sewing_line = sewing_line
            garment1.finishing_line = setup_info_data[
                "finishing_line"
            ]  # Set finishing line for tests
            garment1.save()

        if garment2:
            garment2.status = GarmentStatus.FINISHING_QC_FAIL
            garment2.sewing_line = sewing_line
            garment2.finishing_line = setup_info_data[
                "finishing_line"
            ]  # Set finishing line for tests
            garment2.save()

        # Create quality checks
        QualityCheck.objects.create(garment=garment1, status=QualityCheckStatus.PASS)
        QualityCheck.objects.create(garment=garment2, status=QualityCheckStatus.FAIL)

        # Create scan records
        Scan.objects.create(
            garment=garment1,
            scanner=setup_info_data["scanner"],
            event_type=ScanEventType.FINISHING_QUALITY_CHECK,
        )
        Scan.objects.create(
            garment=garment2,
            scanner=setup_info_data["scanner"],
            event_type=ScanEventType.FINISHING_QUALITY_CHECK,
        )

        api_client.force_authenticate(user=setup_info_data["user"])
        url = reverse("tracking:scan-finishing-qc-info")

        # Test filtering by order
        response = api_client.get(url, {"order": order1.id})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["tracking_code"] == garment1.tracking_code

        # Test filtering by QC status
        response = api_client.get(url, {"qc_status": QualityCheckStatus.FAIL})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["tracking_code"] == garment2.tracking_code

        # Test filtering by tracking code
        response = api_client.get(url, {"tracking_code": garment1.tracking_code})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["tracking_code"] == garment1.tracking_code

    def test_finishing_qc_info_no_scanner(self, api_client):
        """Test finishing QC info with user having no scanner."""
        user_no_scanner = UserFactory(assigned_scanner=None)
        api_client.force_authenticate(user=user_no_scanner)
        url = reverse("tracking:scan-finishing-qc-info")

        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "no assigned scanner" in response.data["error"]
