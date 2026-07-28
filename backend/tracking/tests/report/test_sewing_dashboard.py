import pytest
from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from tracking.models.constants import (
    GarmentStatus,
    LineType,
    QualityCheckStatus,
    BundleStatus,
)
from tracking.models import QualityCheck
from tracking.tests.conftest import (
    ProductionLineFactory,
    OrderFactory,
    PartInventoryFactory,
    GarmentFactory,
    StyleFactory,
    PartFactory,
    BundleFactory,
    DefectFactory,
)


@pytest.mark.django_db
class TestSewingDashboard:
    """Test suite for sewing dashboard endpoint."""

    def test_response_shape_validation(self, authenticated_client):
        """Test that the API response has the correct shape and structure."""
        # Create basic sewing line
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)

        # Create order with parts
        order = OrderFactory(quantity=100)
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
            issued_quantity=10,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.data, list), (
            "Response should be a direct list of production lines"
        )

        # Check structure of production line data
        line_data = response.data[0]
        assert "production_line_id" in line_data
        assert "production_line_name" in line_data
        assert "orders" in line_data
        assert "fifo_summary" in line_data
        assert isinstance(line_data["orders"], list)

        # Check structure of order data
        if line_data["orders"]:
            order_data = line_data["orders"][0]
            assert "order_id" in order_data
            assert "order_number" in order_data
            assert "style" in order_data
            assert "season" in order_data
            assert "size" in order_data
            assert "color" in order_data
            assert "order_quantity" in order_data
            assert "input" in order_data
            assert "assembly_ready_count" in order_data
            assert "garment_assembly_wip" in order_data
            assert "output" in order_data
            assert "completion_rate" in order_data
            assert "qc_stats" in order_data
            assert "assembly_parts" in order_data
            assert "fifo_status" in order_data

    def test_empty_production_lines(self, authenticated_client):
        """Test response when no production lines exist."""
        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_production_line_filtering(self, authenticated_client):
        """Test that only sewing lines are included in response."""
        # Create different types of production lines
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        ProductionLineFactory(line_type=LineType.CUTTING)
        ProductionLineFactory(line_type=LineType.FINISHING)

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["production_line_id"] == sewing_line.id

    def test_order_inventory_calculation(self, authenticated_client):
        """Test that inventory calculations are correct."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)
        style = order.style
        part = PartFactory()

        # Associate part with style
        style.parts.add(part)

        # Create part inventory
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            part=part,
            total_quantity=80,
            issued_quantity=30,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        line_data = response.data[0]
        order_data = line_data["orders"][0]

        assert order_data["total_inventory"] == 80
        assert order_data["issued_inventory"] == 30
        assert order_data["available_inventory"] == 50  # 80 - 30

    def test_garment_status_aggregation(self, authenticated_client):
        """Test that garment status counts are calculated correctly."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)

        # Create garments with different statuses
        GarmentFactory(
            order=order,
            status=GarmentStatus.ISSUED_FOR_ASSEMBLY,
            sewing_line=sewing_line,
        )
        GarmentFactory(
            order=order,
            status=GarmentStatus.ISSUED_FOR_ASSEMBLY,
            sewing_line=sewing_line,
        )
        # Output is scoped to this sewing line, so these must carry sewing_line
        GarmentFactory(
            order=order, status=GarmentStatus.SEWING_QC_PASS, sewing_line=sewing_line
        )
        GarmentFactory(
            order=order, status=GarmentStatus.SEWING_QC_PASS, sewing_line=sewing_line
        )
        GarmentFactory(
            order=order, status=GarmentStatus.SEWING_QC_PASS, sewing_line=sewing_line
        )

        # Create inventory to make order appear in dashboard
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
            issued_quantity=10,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        order_data = response.data[0]["orders"][0]

        assert order_data["garment_assembly_wip"] == 2  # ISSUED_FOR_ASSEMBLY count
        assert order_data["output"] == 3  # SEWING_QC_PASS count

    def test_quality_stats_calculation(self, authenticated_client):
        """Test that quality statistics are calculated correctly."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)

        # Create garments
        garment1 = GarmentFactory(
            order=order, status=GarmentStatus.SEWING_QC_PASS, sewing_line=sewing_line
        )
        garment2 = GarmentFactory(
            order=order, status=GarmentStatus.SEWING_QC_PASS, sewing_line=sewing_line
        )
        garment3 = GarmentFactory(
            order=order, status=GarmentStatus.SEWING_QC_PASS, sewing_line=sewing_line
        )

        # Create quality checks
        QualityCheck.objects.create(
            garment=garment1,
            status=QualityCheckStatus.PASS,
        )
        QualityCheck.objects.create(
            garment=garment2,
            status=QualityCheckStatus.FAIL,
        )
        QualityCheck.objects.create(
            garment=garment3,
            status=QualityCheckStatus.PASS,
        )

        # Create inventory to make order appear in dashboard
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
            issued_quantity=10,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        order_data = response.data[0]["orders"][0]

        qc_stats = order_data["qc_stats"]
        assert qc_stats["total_qc_completed"] == 3
        assert qc_stats["qc_pass"] == 2
        assert qc_stats["qc_fail"] == 1

    def test_multiple_orders_aggregation(self, authenticated_client):
        """Test aggregation when multiple orders exist on same line."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)

        # Create multiple orders
        order1 = OrderFactory(quantity=50)
        order2 = OrderFactory(quantity=100)

        # Create inventory for both orders
        PartInventoryFactory(
            production_line=sewing_line,
            order=order1,
            total_quantity=30,
            issued_quantity=10,
        )
        PartInventoryFactory(
            production_line=sewing_line,
            order=order2,
            total_quantity=60,
            issued_quantity=20,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        line_data = response.data[0]

        # Should have both orders
        assert len(line_data["orders"]) == 2

        # Check that both orders are included
        order_ids = [order["order_id"] for order in line_data["orders"]]
        assert order1.id in order_ids
        assert order2.id in order_ids

    def test_bundle_status_consideration(self, authenticated_client):
        """Test that bundle status affects dashboard data."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)
        style = order.style
        part = PartFactory()

        # Associate part with style
        style.parts.add(part)

        # Create bundles with different statuses
        BundleFactory(
            order=order,
            part=part,
            status=BundleStatus.ISSUED_TO_SEWING,
            assigned_sewing_line=sewing_line,
            garment_quantity=20,
        )
        BundleFactory(
            order=order,
            part=part,
            status=BundleStatus.COMPLETED,
            assigned_sewing_line=sewing_line,
            garment_quantity=15,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Response should include data even if no inventory exists
        # (dashboard should consider bundle data)

    def test_recent_activity_timeframe(self, authenticated_client):
        """Test that recent activity considers appropriate timeframe."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)

        # Create old and recent garments
        GarmentFactory(
            order=order,
            status=GarmentStatus.FINISHING_QC_PASS,
            created_at=timezone.now() - timedelta(days=30),
        )
        GarmentFactory(
            order=order,
            status=GarmentStatus.FINISHING_QC_PASS,
            created_at=timezone.now() - timedelta(hours=1),
        )

        # Create inventory to make order appear in dashboard
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
            issued_quantity=10,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Dashboard should show recent activity
        assert len(response.data[0]["orders"]) > 0

    def test_performance_with_large_dataset(self, authenticated_client):
        """Test dashboard performance with larger dataset."""
        # Create multiple sewing lines
        sewing_lines = [
            ProductionLineFactory(line_type=LineType.SEWING) for _ in range(3)
        ]

        # Create multiple orders per line
        for line in sewing_lines:
            for _ in range(5):
                order = OrderFactory(quantity=100)
                PartInventoryFactory(
                    production_line=line,
                    order=order,
                    total_quantity=50,
                    issued_quantity=10,
                )

                # Create some garments
                for _ in range(10):
                    GarmentFactory(
                        order=order, status=GarmentStatus.ISSUED_FOR_ASSEMBLY
                    )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

        # Each line should have 5 orders
        for line_data in response.data:
            assert len(line_data["orders"]) == 5

    def test_edge_case_zero_inventory(self, authenticated_client):
        """Test edge case where inventory totals are zero."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)

        # Create inventory with zero quantities
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=0,
            issued_quantity=0,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        order_data = response.data[0]["orders"][0]

        assert order_data["total_inventory"] == 0
        assert order_data["issued_inventory"] == 0
        assert order_data["available_inventory"] == 0

    def test_style_information_included(self, authenticated_client):
        """Test that style information is included in response."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        style = StyleFactory(name="Test Style")
        order = OrderFactory(quantity=100, style=style)

        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
            issued_quantity=10,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        order_data = response.data[0]["orders"][0]

        assert "style" in order_data
        assert order_data["style"] == "Test Style"  # Style name is returned as string

    def test_qc_summary_structure(self, authenticated_client):
        """Test that QC summary is included in production line data."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)

        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
            issued_quantity=10,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        line_data = response.data[0]

        # Check QC summary structure
        assert "qc_summary" in line_data
        qc_summary = line_data["qc_summary"]

        assert "total_qc_pass" in qc_summary
        assert "total_qc_fail" in qc_summary
        assert "total_qc_rework" in qc_summary
        assert "total_qc_completed" in qc_summary
        assert "total_defects" in qc_summary
        assert "line_dhu_percentage" in qc_summary
        assert "top_line_defects" in qc_summary
        assert isinstance(qc_summary["top_line_defects"], list)

    def test_defects_tracking_and_dhu_calculation(self, authenticated_client):
        """Test that defects are tracked correctly and DHU is calculated properly."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)

        # Create defects
        stitching_defect = DefectFactory(name="Stitching Issue")
        fit_defect = DefectFactory(name="Fit Problem")
        color_defect = DefectFactory(name="Color Issue")

        # Create garments with QC checks and defects
        garment1 = GarmentFactory(order=order, sewing_line=sewing_line)
        garment2 = GarmentFactory(order=order, sewing_line=sewing_line)
        garment3 = GarmentFactory(order=order, sewing_line=sewing_line)
        garment4 = GarmentFactory(order=order, sewing_line=sewing_line)

        # QC check 1: Failed. `defects` is a plain M2M, so adding the same
        # defect twice stores a single relation (1 stitching defect, not 2).
        qc1 = QualityCheck.objects.create(
            garment=garment1,
            status=QualityCheckStatus.FAIL,
        )
        qc1.defects.add(stitching_defect, stitching_defect)

        # QC check 2: Rework with 1 fit defect
        qc2 = QualityCheck.objects.create(
            garment=garment2,
            status=QualityCheckStatus.REWORK,
        )
        qc2.defects.add(fit_defect)

        # QC check 3: Failed with 1 stitching + 1 color defect
        qc3 = QualityCheck.objects.create(
            garment=garment3,
            status=QualityCheckStatus.FAIL,
        )
        qc3.defects.add(stitching_defect, color_defect)

        # QC check 4: Passed (no defects)
        QualityCheck.objects.create(
            garment=garment4,
            status=QualityCheckStatus.PASS,
        )

        # Create inventory to make order appear in dashboard
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
            issued_quantity=10,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Check order-level QC stats with defects
        order_data = response.data[0]["orders"][0]
        qc_stats = order_data["qc_stats"]

        assert qc_stats["total_qc_completed"] == 4
        assert qc_stats["qc_pass"] == 1
        assert qc_stats["qc_fail"] == 2
        assert qc_stats["qc_rework"] == 1
        # Distinct defect relations: qc1 stitching(1) + qc2 fit(1) + qc3
        # stitching+color(2) = 4 (the duplicate stitching on qc1 is deduped).
        assert qc_stats["total_defects"] == 4
        assert qc_stats["dhu_percentage"] == 100.0  # (4 defects / 4 units) * 100

        # Check top defects
        top_defects = qc_stats["top_defects"]
        assert len(top_defects) == 3  # 3 different defect types

        # Stitching is #1 (2 occurrences: qc1 + qc3)
        stitching_defect_item = next(
            d for d in top_defects if d["defect_name"] == "Stitching Issue"
        )
        assert stitching_defect_item["count"] == 2
        assert stitching_defect_item["percentage"] == 50.0  # (2/4) * 100

        # Check production line QC summary
        line_data = response.data[0]
        qc_summary = line_data["qc_summary"]

        assert qc_summary["total_qc_completed"] == 4
        assert qc_summary["total_qc_pass"] == 1
        assert qc_summary["total_qc_fail"] == 2
        assert qc_summary["total_qc_rework"] == 1
        assert qc_summary["total_defects"] == 4
        assert qc_summary["line_dhu_percentage"] == 100.0

        # Check line-level top defects
        top_line_defects = qc_summary["top_line_defects"]
        assert len(top_line_defects) >= 1

        # Stitching should be top defect at line level too
        top_defect = top_line_defects[0]
        assert top_defect["defect_name"] == "Stitching Issue"
        assert top_defect["count"] == 2

    def test_zero_defects_scenario(self, authenticated_client):
        """Test DHU calculation when there are no defects."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)

        # Create garments with only passing QC
        garment1 = GarmentFactory(order=order, sewing_line=sewing_line)
        garment2 = GarmentFactory(order=order, sewing_line=sewing_line)

        QualityCheck.objects.create(
            garment=garment1,
            status=QualityCheckStatus.PASS,
        )
        QualityCheck.objects.create(
            garment=garment2,
            status=QualityCheckStatus.PASS,
        )

        # Create inventory to make order appear in dashboard
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
            issued_quantity=10,
        )

        url = reverse("tracking:sewing-dashboard")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Check order-level QC stats
        order_data = response.data[0]["orders"][0]
        qc_stats = order_data["qc_stats"]

        assert qc_stats["total_defects"] == 0
        assert qc_stats["dhu_percentage"] == 0.0
        assert qc_stats["top_defects"] == []

        # Check line-level QC summary
        line_data = response.data[0]
        qc_summary = line_data["qc_summary"]

        assert qc_summary["total_defects"] == 0
        assert qc_summary["line_dhu_percentage"] == 0.0
        assert qc_summary["top_line_defects"] == []
