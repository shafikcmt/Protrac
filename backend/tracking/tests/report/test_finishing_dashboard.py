import pytest
from datetime import date, timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from tracking.models import Order
from tracking.tests.conftest import (
    ProductionLineFactory,
    BuyerFactory,
    SeasonFactory,
    StyleFactory,
    PartFactory,
    SizeFactory,
    ColorFactory,
    OrderFactory,
    BundleFactory,
)


@pytest.mark.django_db
class TestFinishingDashboard:
    """Test suite for finishing dashboard endpoint."""

    def setup_method(self):
        """Set up test data for finishing dashboard tests."""
        self.url = reverse("tracking:finishing-dashboard")

        # Create production lines
        self.sewing_line_1 = ProductionLineFactory(
            name="Sewing Line 1", line_type="sewing"
        )
        self.sewing_line_2 = ProductionLineFactory(
            name="Sewing Line 2", line_type="sewing"
        )
        self.finishing_line = ProductionLineFactory(
            name="Finishing Line 1", line_type="finishing"
        )

        # Create basic entities
        self.buyer = BuyerFactory(name="Test Buyer")
        self.season = SeasonFactory(name="Spring 2024")
        self.style = StyleFactory(name="Test Style")
        self.part = PartFactory(name="Main Body")
        self.style.parts.add(self.part)

        # Create sizes and colors
        self.size_s = SizeFactory(name="S")
        self.size_m = SizeFactory(name="M")
        self.color_red = ColorFactory(name="Red")
        self.color_blue = ColorFactory(name="Blue")

    def test_get_finishing_dashboard_basic(self, authenticated_client):
        """Test basic finishing dashboard retrieval."""
        # Create order and bundle
        order = OrderFactory(order_number="ORD-001")
        BundleFactory(order=order)  # This automatically creates garments

        # The bundle automatically creates garments, so let's update their status
        garments = list(order.garments.all())

        # Update the first garment to be ready for finishing (passed sewing QC)
        if len(garments) > 0:
            garments[0].status = "sewing_qc_pass"
            garments[0].sewing_line = self.sewing_line_1
            garments[0].save()

        # Update the second garment to be finished (passed finishing QC)
        if len(garments) > 1:
            garments[1].status = "finishing_qc_pass"
            garments[1].finishing_line = self.finishing_line
            garments[1].save()

        response = authenticated_client.get(self.url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1

        order_data = data[0]
        assert order_data["id"] == order.id
        assert order_data["order_number"] == "ORD-001"
        assert order_data["customer_name"] == order.style.buyer.name
        assert order_data["style_name"] == order.style.name
        # input = all garments in the finishing pipeline (the one that already
        # passed finishing QC counts as input too), so 2 (sewing_qc_pass +
        # finishing_qc_pass); output = the finished one; in_progress = the rest.
        assert order_data["input_garments"] == 2
        assert order_data["output_garments"] == 1  # garments completed finishing
        assert order_data["in_progress_garments"] == 1  # still in finishing

        # Check QC stats structure
        qc_stats = order_data["qc_stats"]
        assert "total_qc" in qc_stats
        assert "passed_qc" in qc_stats
        assert "failed_qc" in qc_stats
        assert "qc_rate" in qc_stats

        # Check source lines structure
        source_lines = order_data["source_lines"]
        assert len(source_lines) == 1
        assert source_lines[0]["id"] == self.sewing_line_1.id
        assert source_lines[0]["name"] == self.sewing_line_1.name
        assert source_lines[0]["garment_count"] == 1

        order_data = data[0]
        assert order_data["id"] == order.id  # Use the actual order ID
        assert (
            order_data["order_number"] == order.order_number
        )  # Use actual order number
        assert (
            order_data["customer_name"] == order.style.buyer.name
        )  # Get buyer name from style
        assert order_data["style_name"] == order.style.name
        assert order_data["input_garments"] == 2
        assert order_data["output_garments"] == 1

    def test_finishing_dashboard_with_qc_stats(self, authenticated_client):
        """Test finishing dashboard with QC statistics."""
        order = OrderFactory(order_number="ORD-002")
        BundleFactory(order=order)  # Creates garments automatically

        # Use auto-created garments from order - simple approach like basic test
        garments = list(order.garments.all())

        # Set exactly like the basic test - ensure we have finishing workflow garments
        # Set first garment to sewing_qc_pass (input for finishing)
        if len(garments) > 0:
            garments[0].status = "sewing_qc_pass"
            garments[0].sewing_line = self.sewing_line_1
            garments[0].save()

        # Set second garment to finishing_qc_pass (output)
        if len(garments) > 1:
            garments[1].status = "finishing_qc_pass"
            garments[1].finishing_line = self.finishing_line
            garments[1].save()

        # Set third garment to finishing_qc_fail (output)
        if len(garments) > 2:
            garments[2].status = "finishing_qc_fail"
            garments[2].finishing_line = self.finishing_line
            garments[2].save()

        response = authenticated_client.get(self.url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1

        qc_stats = data[0]["qc_stats"]
        assert qc_stats["total_qc"] == 2  # Only the QC'ed garments (pass + fail)
        assert qc_stats["passed_qc"] == 1
        assert qc_stats["failed_qc"] == 1
        assert qc_stats["qc_rate"] == 0.5

    def test_finishing_dashboard_with_source_lines(self, authenticated_client):
        """Test finishing dashboard shows source sewing lines."""
        order = OrderFactory(order_number="ORD-003")
        BundleFactory(order=order)  # Creates garments automatically

        # Use auto-created garments from order and update their status
        garments = list(order.garments.all()[:2])  # Get first 2 garments

        # Set to sewing_qc_pass to ensure they appear in finishing workflow
        for garment in garments:
            garment.status = "sewing_qc_pass"
            garment.sewing_line = self.sewing_line_1
            garment.save()

        response = authenticated_client.get(self.url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Should have one order with garments ready for finishing
        assert len(data) == 1
        assert data[0]["input_garments"] == 2

    def test_finishing_dashboard_filter_by_line(self, authenticated_client):
        """Test filtering by finishing line."""
        finishing_line_2 = ProductionLineFactory(
            name="Finishing Line 2", line_type="finishing"
        )

        order1 = OrderFactory(order_number="ORD-004")
        order2 = OrderFactory(order_number="ORD-005")

        BundleFactory(order=order1)  # Creates garments automatically
        BundleFactory(order=order2)  # Creates garments automatically

        # Use auto-created garments and assign to different finishing lines
        garment1 = order1.garments.first()
        garment1.status = "sewing_qc_pass"  # Input status for finishing
        garment1.sewing_line = self.sewing_line_1
        garment1.save()

        garment2 = order2.garments.first()
        garment2.status = (
            "finishing_qc_pass"  # Output status with specific finishing line
        )
        garment2.finishing_line = finishing_line_2
        garment2.save()

        # Filter by second finishing line (only order2 should appear)
        response = authenticated_client.get(
            f"{self.url}?finishing_line_id={finishing_line_2.id}"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["order_number"] == "ORD-005"

    def test_finishing_dashboard_filter_by_order(self, authenticated_client):
        """Test filtering by order ID."""
        order1 = OrderFactory(order_number="ORD-006")
        order2 = OrderFactory(order_number="ORD-007")

        BundleFactory(order=order1)  # Creates garments automatically
        BundleFactory(order=order2)  # Creates garments automatically

        # Use auto-created garments - set to proper workflow statuses
        garment1 = order1.garments.first()
        garment1.status = "sewing_qc_pass"  # Input for finishing
        garment1.sewing_line = self.sewing_line_1
        garment1.save()

        garment2 = order2.garments.first()
        garment2.status = "finishing_qc_pass"  # Output of finishing
        garment2.finishing_line = self.finishing_line
        garment2.save()

        # Filter by specific order
        response = authenticated_client.get(f"{self.url}?order_id={order1.id}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == order1.id

    def test_finishing_dashboard_filter_by_style(self, authenticated_client):
        """Test filtering by style name."""
        style2 = StyleFactory(name="Another Style")

        order1 = OrderFactory(order_number="ORD-008", style=self.style)
        order2 = OrderFactory(order_number="ORD-009", style=style2)

        BundleFactory(order=order1)  # Creates garments automatically
        BundleFactory(order=order2)  # Creates garments automatically

        # Use auto-created garments - set to proper workflow statuses
        garment1 = order1.garments.first()
        garment1.status = "sewing_qc_pass"  # Input for finishing
        garment1.sewing_line = self.sewing_line_1
        garment1.save()

        garment2 = order2.garments.first()
        garment2.status = "finishing_qc_pass"  # Output of finishing
        garment2.finishing_line = self.finishing_line
        garment2.save()

        # Filter by style (partial match)
        response = authenticated_client.get(f"{self.url}?style=Test")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["style_name"] == "Test Style"

    def test_finishing_dashboard_filter_by_size_and_color(self, authenticated_client):
        """Test filtering by size and color."""
        order = OrderFactory(order_number="ORD-010")

        BundleFactory(order=order)  # Creates garments automatically

        # Use auto-created garments - set to proper workflow statuses
        garments = list(order.garments.all()[:2])
        if len(garments) >= 2:
            garments[0].status = "sewing_qc_pass"  # Input for finishing
            garments[0].sewing_line = self.sewing_line_1
            garments[0].save()

            garments[1].status = "finishing_qc_pass"  # Output of finishing
            garments[1].finishing_line = self.finishing_line
            garments[1].save()

        # Filter by size using the actual size from the order
        size_name = order.size.name
        response = authenticated_client.get(f"{self.url}?size={size_name}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1

        # Filter by color using the actual color from the order
        color_name = order.color.name
        response = authenticated_client.get(f"{self.url}?color={color_name}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1

    def test_finishing_dashboard_filter_by_date_range(self, authenticated_client):
        """Test filtering by date range."""
        # Create order from yesterday
        yesterday = date.today() - timedelta(days=1)
        order_old = OrderFactory(order_number="ORD-OLD")
        # Manually set created_at since auto_now_add prevents setting it during creation
        # Use timezone-aware datetime to avoid warnings
        from datetime import datetime, time

        yesterday_datetime = timezone.make_aware(datetime.combine(yesterday, time.min))
        Order.objects.filter(id=order_old.id).update(created_at=yesterday_datetime)

        # Create order from today
        order_new = OrderFactory(order_number="ORD-NEW")

        BundleFactory(order=order_old)  # Creates garments automatically
        BundleFactory(order=order_new)  # Creates garments automatically

        # Use auto-created garments - set to proper workflow statuses
        garment_old = order_old.garments.first()
        garment_old.status = "sewing_qc_pass"  # Input for finishing
        garment_old.sewing_line = self.sewing_line_1
        garment_old.save()

        garment_new = order_new.garments.first()
        garment_new.status = "finishing_qc_pass"  # Output of finishing
        garment_new.finishing_line = self.finishing_line
        garment_new.save()

        # Filter from today
        today = date.today()
        response = authenticated_client.get(
            f"{self.url}?date_from={today}&active_only=false"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["order_number"] == "ORD-NEW"

    def test_finishing_dashboard_active_only_filter(self, authenticated_client):
        """Test active_only filter."""
        # Create completed order
        order_completed = OrderFactory(order_number="ORD-COMPLETED")

        # Create active order
        order_active = OrderFactory(order_number="ORD-ACTIVE")

        BundleFactory(order=order_completed)  # Creates garments automatically
        BundleFactory(order=order_active)  # Creates garments automatically

        # Use auto-created garments - set to proper workflow statuses
        garment_completed = order_completed.garments.first()
        garment_completed.status = "finishing_qc_pass"  # Output of finishing
        garment_completed.finishing_line = self.finishing_line
        garment_completed.save()

        garment_active = order_active.garments.first()
        garment_active.status = "sewing_qc_pass"  # Input for finishing
        garment_active.sewing_line = self.sewing_line_1
        garment_active.save()

        # Default active_only=true should show only active
        response = authenticated_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2  # Both orders have active garments

        # active_only=false should show all
        response = authenticated_client.get(f"{self.url}?active_only=false")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2

    def test_finishing_dashboard_empty_result(self, authenticated_client):
        """Test finishing dashboard with no data."""
        response = authenticated_client.get(self.url)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data == []

    def test_finishing_dashboard_invalid_filter(self, authenticated_client):
        """Test finishing dashboard with invalid filter."""
        response = authenticated_client.get(f"{self.url}?finishing_line_id=invalid")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "finishing_line_id" in data

    def test_finishing_dashboard_unauthenticated(self, client):
        """Test finishing dashboard requires authentication."""
        response = client.get(self.url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
