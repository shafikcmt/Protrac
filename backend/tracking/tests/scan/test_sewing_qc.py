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
class TestSewingQCScan:
    """Test sewing QC scan endpoint."""

    @pytest.fixture
    def setup_data(self):
        """Setup test data."""
        # Create sewing line with QC scanner
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = Scanner.objects.create(
            name="Sewing QC Scanner",
            scanner_type=ScannerType.SEWING_QC_CHECK,
            production_line=sewing_line,
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
            garment.status = GarmentStatus.ISSUED_FOR_ASSEMBLY
            garment.sewing_line = sewing_line
            garment.save()

        # Create defects for testing
        defect1 = DefectFactory(name="Loose Stitching")
        defect2 = DefectFactory(name="Thread Cut")

        return {
            "user": user,
            "scanner": scanner,
            "sewing_line": sewing_line,
            "garment": garment,
            "bundle": bundle,
            "order": order,
            "defect1": defect1,
            "defect2": defect2,
        }

    def test_sewing_qc_scan_pass_success(self, api_client, setup_data):
        """Test successful sewing QC scan with PASS result."""
        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-sewing-qc")

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
        assert response.data["garment_status"] == GarmentStatus.SEWING_QC_PASS
        assert response.data["defect_count"] == 0
        assert response.data["is_reevaluation"] is False
        assert "quality_check_id" in response.data
        assert "scan_id" in response.data

        # Verify garment status updated
        setup_data["garment"].refresh_from_db()
        assert setup_data["garment"].status == GarmentStatus.SEWING_QC_PASS

        # Verify quality check record created
        qc = QualityCheck.objects.get(id=response.data["quality_check_id"])
        assert qc.garment == setup_data["garment"]
        assert qc.status == QualityCheckStatus.PASS
        assert qc.defects.count() == 0

        # Verify scan record created
        scan = Scan.objects.get(id=response.data["scan_id"])
        assert scan.garment == setup_data["garment"]
        assert scan.scanner == setup_data["scanner"]
        assert scan.event_type == ScanEventType.SEWING_QUALITY_CHECK

    def test_sewing_qc_scan_fail_with_defects(self, api_client, setup_data):
        """Test sewing QC scan with FAIL result and defects."""
        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-sewing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.FAIL,
            "defect_ids": [setup_data["defect1"].id, setup_data["defect2"].id],
        }

        response = api_client.post(url, data)

        # Verify API response
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["qc_status"] == QualityCheckStatus.FAIL
        assert response.data["garment_status"] == GarmentStatus.SEWING_QC_FAIL
        assert response.data["defect_count"] == 2

        # Verify garment status updated
        setup_data["garment"].refresh_from_db()
        assert setup_data["garment"].status == GarmentStatus.SEWING_QC_FAIL

        # Verify quality check record with defects
        qc = QualityCheck.objects.get(id=response.data["quality_check_id"])
        assert qc.status == QualityCheckStatus.FAIL
        assert qc.defects.count() == 2
        assert setup_data["defect1"] in qc.defects.all()
        assert setup_data["defect2"] in qc.defects.all()

    def test_sewing_qc_scan_QC_REWORK(self, api_client, setup_data):
        """Test sewing QC scan with REWORK result."""
        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-sewing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.REWORK,
            "defect_ids": [setup_data["defect1"].id],
        }

        response = api_client.post(url, data)

        # Verify API response
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["qc_status"] == QualityCheckStatus.REWORK
        assert response.data["garment_status"] == GarmentStatus.SEWING_QC_REWORK
        assert response.data["defect_count"] == 1

        # Verify garment status updated
        setup_data["garment"].refresh_from_db()
        assert setup_data["garment"].status == GarmentStatus.SEWING_QC_REWORK

    def test_sewing_qc_scan_reevaluation(self, api_client, setup_data):
        """Test reevaluation of already QC'd garment."""
        # First QC the garment
        setup_data["garment"].status = GarmentStatus.SEWING_QC_FAIL
        setup_data["garment"].save()

        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-sewing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
            "is_reevaluation": True,
        }

        response = api_client.post(url, data)

        # Verify API response
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["is_reevaluation"] is True
        assert response.data["garment_status"] == GarmentStatus.SEWING_QC_PASS

        # Verify garment status updated
        setup_data["garment"].refresh_from_db()
        assert setup_data["garment"].status == GarmentStatus.SEWING_QC_PASS

    def test_sewing_qc_scan_already_processed_no_reevaluation(
        self, api_client, setup_data
    ):
        """Test scanning already QC'd garment without reevaluation flag."""
        # Set garment as already QC'd
        setup_data["garment"].status = GarmentStatus.SEWING_QC_PASS
        setup_data["garment"].save()

        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-sewing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
            "is_reevaluation": False,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already processed" in response.data["error"]
        assert "reevaluation flag" in response.data["error"]

    def test_sewing_qc_scan_wrong_garment_status(self, api_client, setup_data):
        """Test scanning garment with wrong status."""
        # Set garment to wrong status
        setup_data["garment"].status = GarmentStatus.PENDING_ASSEMBLY
        setup_data["garment"].save()

        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-sewing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not ready for sewing QC" in response.data["error"]

    def test_sewing_qc_scan_wrong_sewing_line(self, api_client, setup_data):
        """Test scanning garment from different sewing line."""
        # Create garment on different sewing line
        other_sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        setup_data["garment"].sewing_line = other_sewing_line
        setup_data["garment"].save()

        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-sewing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not produced on this sewing line" in response.data["error"]

    def test_sewing_qc_scan_invalid_tracking_code(self, api_client, setup_data):
        """Test scanning with invalid tracking code."""
        api_client.force_authenticate(user=setup_data["user"])
        url = reverse("tracking:scan-sewing-qc")

        data = {
            "tracking_code": "INVALID123",
            "qc_status": QualityCheckStatus.PASS,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid tracking code" in response.data["error"]

    def test_sewing_qc_scan_no_scanner(self, api_client, setup_data):
        """Test scanning with user having no scanner."""
        user_no_scanner = UserFactory(assigned_scanner=None)
        api_client.force_authenticate(user=user_no_scanner)
        url = reverse("tracking:scan-sewing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "no assigned scanner" in response.data["error"]

    def test_sewing_qc_scan_wrong_scanner_type(self, api_client, setup_data):
        """Test scanning with wrong scanner type."""
        # Create user with different scanner type
        cutting_line = ProductionLineFactory(line_type=LineType.CUTTING)
        wrong_scanner = Scanner.objects.create(
            name="Bundle Issue Scanner",
            scanner_type=ScannerType.BUNDLE_ISSUE,
            production_line=cutting_line,
        )
        user_wrong_scanner = UserFactory(assigned_scanner=wrong_scanner)

        api_client.force_authenticate(user=user_wrong_scanner)
        url = reverse("tracking:scan-sewing-qc")

        data = {
            "tracking_code": setup_data["garment"].tracking_code,
            "qc_status": QualityCheckStatus.PASS,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "not a sewing QC scanner" in response.data["error"]


@pytest.mark.django_db
class TestSewingQCInfo:
    """Test sewing QC info endpoint."""

    @pytest.fixture
    def setup_info_data(self):
        """Setup test data for info endpoint."""
        # Create sewing line with QC scanner
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = Scanner.objects.create(
            name="Sewing QC Scanner",
            scanner_type=ScannerType.SEWING_QC_CHECK,
            production_line=sewing_line,
        )

        # Create user with assigned scanner
        user = UserFactory(assigned_scanner=scanner)

        return {"user": user, "scanner": scanner, "sewing_line": sewing_line}

    def test_sewing_qc_info_success(self, api_client, setup_info_data):
        """Test successful sewing QC info retrieval."""
        api_client.force_authenticate(user=setup_info_data["user"])
        url = reverse("tracking:scan-sewing-qc-info")

        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "scanner_info" in response.data
        assert "count" in response.data
        assert "results" in response.data

        # Verify scanner info matches
        scanner_info = response.data["scanner_info"]
        assert scanner_info["scanner_type"] == ScannerType.SEWING_QC_CHECK
        assert scanner_info["scanner_name"] == setup_info_data["scanner"].name

    def test_sewing_qc_info_with_scan_history(self, api_client, setup_info_data):
        """Test sewing QC info shows actual scan history."""
        # Create order and bundle - garments will be created automatically
        order = OrderFactory()
        bundle = BundleFactory(
            order=order,
            assigned_sewing_line=setup_info_data["sewing_line"],
        )

        # Get the automatically created garment
        garment = order.garments.first()
        if not garment:
            bundle.save()  # Trigger garment creation
            garment = order.garments.first()

        if garment:
            garment.status = GarmentStatus.FINISHING_QC_PASS
            garment.sewing_line = setup_info_data["sewing_line"]
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
            event_type=ScanEventType.SEWING_QUALITY_CHECK,
        )

        api_client.force_authenticate(user=setup_info_data["user"])
        url = reverse("tracking:scan-sewing-qc-info")

        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1

        # Verify scan data is returned
        result = response.data["results"][0]
        assert result["id"] == scan.id
        assert result["tracking_code"] == garment.tracking_code
        assert result["garment_status"] == garment.status
        assert result["sewing_line"] == setup_info_data["sewing_line"].name
        assert result["latest_qc_status"] == QualityCheckStatus.PASS
        assert result["defect_count"] == 0

    def test_sewing_qc_info_filtering(self, api_client, setup_info_data):
        """Test sewing QC info with filtering."""
        # Create different orders and bundles - garments will be created automatically
        order1 = OrderFactory()
        order2 = OrderFactory()

        bundle1 = BundleFactory(
            order=order1,
            assigned_sewing_line=setup_info_data["sewing_line"],
        )
        bundle2 = BundleFactory(
            order=order2,
            assigned_sewing_line=setup_info_data["sewing_line"],
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
            garment1.sewing_line = setup_info_data["sewing_line"]
            garment1.save()

        if garment2:
            garment2.status = GarmentStatus.SEWING_QC_FAIL
            garment2.sewing_line = setup_info_data["sewing_line"]
            garment2.save()

        # Create quality checks
        QualityCheck.objects.create(garment=garment1, status=QualityCheckStatus.PASS)
        QualityCheck.objects.create(garment=garment2, status=QualityCheckStatus.FAIL)

        # Create scan records
        Scan.objects.create(
            garment=garment1,
            scanner=setup_info_data["scanner"],
            event_type=ScanEventType.SEWING_QUALITY_CHECK,
        )
        Scan.objects.create(
            garment=garment2,
            scanner=setup_info_data["scanner"],
            event_type=ScanEventType.SEWING_QUALITY_CHECK,
        )

        api_client.force_authenticate(user=setup_info_data["user"])
        url = reverse("tracking:scan-sewing-qc-info")

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

    def test_sewing_qc_info_no_scanner(self, api_client):
        """Test sewing QC info with user having no scanner."""
        user_no_scanner = UserFactory(assigned_scanner=None)
        api_client.force_authenticate(user=user_no_scanner)
        url = reverse("tracking:scan-sewing-qc-info")

        response = api_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "no assigned scanner" in response.data["error"]
