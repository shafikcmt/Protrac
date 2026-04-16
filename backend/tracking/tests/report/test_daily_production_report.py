import pytest
from datetime import date, timedelta
from django.urls import reverse
from rest_framework import status
from tracking.models.constants import (
    GarmentStatus,
    LineType,
    QualityCheckStatus,
)
from tracking.models import QualityCheck
from tracking.tests.conftest import (
    ProductionLineFactory,
    OrderFactory,
    PartInventoryFactory,
    GarmentFactory,
    StyleFactory,
    BuyerFactory,
    DefectFactory,
)


@pytest.mark.django_db
class TestDailyProductionReport:
    """Test suite for daily production report endpoint."""

    def test_response_structure_validation(self, authenticated_client):
        """Test that the API response has the correct structure."""
        # Create test data
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        buyer = BuyerFactory(name="Test Buyer")
        style = StyleFactory(name="Test Style", buyer=buyer)
        order = OrderFactory(quantity=100, style=style)

        # Create some production data
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
            issued_quantity=10,
        )

        url = reverse("tracking:daily-production-report")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # Check top-level structure
        assert "date" in data
        assert "summary" in data
        assert "production_lines" in data
        assert "orders" in data

        # Check summary structure
        summary = data["summary"]
        required_summary_fields = [
            "total_orders",
            "total_production_lines",
            "total_parts_produced",
            "total_assembly_output",
            "total_finishing_output",
            "average_dhu_percentage",
            "total_inspection_completed",
            "total_packing_completed",
        ]
        for field in required_summary_fields:
            assert field in summary

        # Check production lines structure
        assert isinstance(data["production_lines"], list)
        if data["production_lines"]:
            line_data = data["production_lines"][0]
            required_line_fields = [
                "line_id",
                "line_name",
                "line_type",
                "working_hours",
                "parts_produced",
                "assembly_output",
                "finishing_output",
                "dhu_percentage",
                "inspection_completed",
                "packing_completed",
            ]
            for field in required_line_fields:
                assert field in line_data

        # Check orders structure
        assert isinstance(data["orders"], list)
        if data["orders"]:
            order_data = data["orders"][0]
            required_order_fields = [
                "order_id",
                "order_number",
                "buyer",
                "style",
                "order_quantity",
                "parts_produced",
                "assembly_output",
                "finishing_output",
                "dhu_percentage",
                "inspection_completed",
                "packing_completed",
                "parts_breakdown",
            ]
            for field in required_order_fields:
                assert field in order_data

    def test_date_filtering(self, authenticated_client):
        """Test filtering by specific date."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)

        # Create inventory for today
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
        )

        # Test with specific date (today)
        today = date.today()
        url = reverse("tracking:daily-production-report")
        response = authenticated_client.get(url, {"date": today.isoformat()})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["date"] == today.isoformat()

        # Test with yesterday (should have no data)
        yesterday = today - timedelta(days=1)
        response = authenticated_client.get(url, {"date": yesterday.isoformat()})

        assert response.status_code == status.HTTP_200_OK
        assert response.data["date"] == yesterday.isoformat()
        # Summary should show zero values for yesterday
        summary = response.data["summary"]
        assert summary["total_orders"] == 0

    def test_production_line_filtering(self, authenticated_client):
        """Test filtering by production line."""
        sewing_line1 = ProductionLineFactory(
            line_type=LineType.SEWING, name="Sewing Line 1"
        )
        sewing_line2 = ProductionLineFactory(
            line_type=LineType.SEWING, name="Sewing Line 2"
        )

        order1 = OrderFactory(quantity=100)
        order2 = OrderFactory(quantity=200)

        # Create inventory for both lines
        PartInventoryFactory(
            production_line=sewing_line1, order=order1, total_quantity=50
        )
        PartInventoryFactory(
            production_line=sewing_line2, order=order2, total_quantity=75
        )

        url = reverse("tracking:daily-production-report")

        # Test filtering by line 1
        response = authenticated_client.get(
            url, {"production_line_id": sewing_line1.id}
        )
        assert response.status_code == status.HTTP_200_OK

        # Should only include line 1
        production_lines = response.data["production_lines"]
        assert len(production_lines) == 1
        assert production_lines[0]["line_id"] == sewing_line1.id

    def test_buyer_filtering(self, authenticated_client):
        """Test filtering by buyer."""
        buyer1 = BuyerFactory(name="Buyer A")
        buyer2 = BuyerFactory(name="Buyer B")

        style1 = StyleFactory(buyer=buyer1)
        style2 = StyleFactory(buyer=buyer2)

        order1 = OrderFactory(style=style1, quantity=100)
        order2 = OrderFactory(style=style2, quantity=200)

        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        PartInventoryFactory(
            production_line=sewing_line, order=order1, total_quantity=50
        )
        PartInventoryFactory(
            production_line=sewing_line, order=order2, total_quantity=75
        )

        url = reverse("tracking:daily-production-report")

        # Test filtering by buyer 1
        response = authenticated_client.get(url, {"buyer": buyer1.name})
        assert response.status_code == status.HTTP_200_OK

        # Should only include orders from buyer 1
        orders = response.data["orders"]
        assert len(orders) == 1
        assert orders[0]["buyer"] == buyer1.name

    def test_style_filtering(self, authenticated_client):
        """Test filtering by style."""
        style1 = StyleFactory(name="Style A")
        style2 = StyleFactory(name="Style B")

        order1 = OrderFactory(style=style1, quantity=100)
        order2 = OrderFactory(style=style2, quantity=200)

        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        PartInventoryFactory(
            production_line=sewing_line, order=order1, total_quantity=50
        )
        PartInventoryFactory(
            production_line=sewing_line, order=order2, total_quantity=75
        )

        url = reverse("tracking:daily-production-report")

        # Test filtering by style 1
        response = authenticated_client.get(url, {"style": style1.name})
        assert response.status_code == status.HTTP_200_OK

        # Should only include orders from style 1
        orders = response.data["orders"]
        assert len(orders) == 1
        assert orders[0]["style"] == style1.name

    def test_production_metrics_calculation(self, authenticated_client):
        """Test that production metrics are calculated correctly."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        finishing_line = ProductionLineFactory(line_type=LineType.FINISHING)
        order = OrderFactory(quantity=100)

        # Create parts production
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=80,  # Parts produced
            issued_quantity=60,  # Parts issued for assembly
        )

        # Create garments for assembly and finishing output
        GarmentFactory(
            order=order, sewing_line=sewing_line, status=GarmentStatus.SEWING_QC_PASS
        )
        GarmentFactory(
            order=order,
            sewing_line=sewing_line,
            finishing_line=finishing_line,
            status=GarmentStatus.FINISHING_QC_PASS,
        )
        GarmentFactory(
            order=order,
            sewing_line=sewing_line,
            finishing_line=finishing_line,
            status=GarmentStatus.PACKED,
        )

        url = reverse("tracking:daily-production-report")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Check order-level metrics
        order_data = response.data["orders"][0]
        assert order_data["parts_produced"] == 80
        assert order_data["assembly_output"] == 3  # All garments passed sewing
        assert order_data["finishing_output"] == 2  # 2 garments reached finishing
        assert order_data["packing_completed"] == 1  # 1 garment packed

    def test_dhu_calculation_in_report(self, authenticated_client):
        """Test that DHU is calculated correctly in the daily report."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)

        # Create defects
        stitching_defect = DefectFactory(name="Stitching Issue")

        # Create garments with QC checks and defects
        garment1 = GarmentFactory(order=order, sewing_line=sewing_line)
        garment2 = GarmentFactory(order=order, sewing_line=sewing_line)
        garment3 = GarmentFactory(order=order, sewing_line=sewing_line)

        # QC check 1: Failed with 2 defects
        qc1 = QualityCheck.objects.create(
            garment=garment1,
            status=QualityCheckStatus.FAIL,
        )
        qc1.defects.add(stitching_defect, stitching_defect)

        # QC check 2: Passed (no defects)
        QualityCheck.objects.create(
            garment=garment2,
            status=QualityCheckStatus.PASS,
        )

        # QC check 3: Failed with 1 defect
        qc3 = QualityCheck.objects.create(
            garment=garment3,
            status=QualityCheckStatus.FAIL,
        )
        qc3.defects.add(stitching_defect)

        # Create inventory
        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
        )

        url = reverse("tracking:daily-production-report")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Check DHU calculation
        order_data = response.data["orders"][0]
        assert order_data["dhu_percentage"] == 100.0  # (3 defects / 3 units) * 100

        # Check line-level DHU
        sewing_line_data = next(
            line
            for line in response.data["production_lines"]
            if line["line_id"] == sewing_line.id
        )
        assert sewing_line_data["dhu_percentage"] == 100.0

    def test_empty_data_scenario(self, authenticated_client):
        """Test response when no production data exists."""
        url = reverse("tracking:daily-production-report")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # Should return empty structure with zero values
        assert data["summary"]["total_orders"] == 0
        assert data["summary"]["total_production_lines"] == 0
        assert data["production_lines"] == []
        assert data["orders"] == []

    def test_working_hours_default(self, authenticated_client):
        """Test that working hours defaults to 8 when not specified."""
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)

        PartInventoryFactory(
            production_line=sewing_line,
            order=order,
            total_quantity=50,
        )

        url = reverse("tracking:daily-production-report")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Check that working hours defaults to 8
        line_data = response.data["production_lines"][0]
        assert line_data["working_hours"] == 8

    def test_missing_data_handling(self, authenticated_client):
        """Test that missing data is handled gracefully with appropriate defaults."""
        # Create minimal data - just a production line and order
        ProductionLineFactory(line_type=LineType.SEWING)
        OrderFactory(quantity=100)

        # No inventory, garments, or QC data
        url = reverse("tracking:daily-production-report")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # Should handle missing data gracefully
        assert data["summary"]["total_orders"] == 0  # No orders with actual data
        assert data["summary"]["average_dhu_percentage"] == 0.0
        assert data["production_lines"] == []  # No lines with data
        assert data["orders"] == []  # No orders with data
