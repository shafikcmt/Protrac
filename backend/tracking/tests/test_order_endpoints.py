import pytest
from django.urls import reverse
from rest_framework import status
from tracking.tests.conftest import (
    OrderFactory,
    StyleFactory,
    SizeFactory,
    ColorFactory,
)


@pytest.mark.django_db
class TestOrderEndpoints:
    """Tests for order CRUD operations."""

    def test_create_order(self, authenticated_client):
        """Test creating an order."""
        style = StyleFactory()
        size = SizeFactory()
        color = ColorFactory()

        url = reverse("tracking:order-list-create")
        data = {
            "order_number": "ORD-001",
            "style": style.id,
            "size": size.id,
            "color": color.id,
            "quantity": 100,
        }

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["order_number"] == "ORD-001"
        assert response.data["style_name"] == style.name
        assert response.data["quantity"] == 100

    def test_list_orders(self, authenticated_client):
        """Test listing orders."""
        OrderFactory()
        url = reverse("tracking:order-list-create")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data

    def test_get_order_detail(self, authenticated_client):
        """Test getting order detail."""
        order = OrderFactory()
        url = reverse("tracking:order-detail", args=[order.id])
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == order.id

    def test_update_order(self, authenticated_client):
        """Test updating order."""
        order = OrderFactory()
        url = reverse("tracking:order-detail", args=[order.id])
        data = {
            "order_number": order.order_number,
            "style": order.style.id,
            "size": order.size.id,
            "color": order.color.id,
            "quantity": 200,
        }
        response = authenticated_client.put(url, data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["quantity"] == 200

    def test_delete_order(self, authenticated_client):
        """Test deleting order."""
        order = OrderFactory()
        url = reverse("tracking:order-detail", args=[order.id])
        response = authenticated_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_same_order_number_different_size_color_allowed(self, authenticated_client):
        """Test that same order number with different size/color is allowed."""
        order_number = "ORD-001"
        style = StyleFactory()
        size1 = SizeFactory()
        size2 = SizeFactory()
        color = ColorFactory()

        url = reverse("tracking:order-list-create")

        # Create first order
        data1 = {
            "order_number": order_number,
            "style": style.id,
            "size": size1.id,
            "color": color.id,
            "quantity": 100,
        }
        response1 = authenticated_client.post(url, data1)
        assert response1.status_code == status.HTTP_201_CREATED

        # Create second order with same order_number but different size
        data2 = {
            "order_number": order_number,
            "style": style.id,
            "size": size2.id,
            "color": color.id,
            "quantity": 50,
        }
        response2 = authenticated_client.post(url, data2)
        assert response2.status_code == status.HTTP_201_CREATED

    def test_unique_constraint_violation(self, authenticated_client):
        """Test unique constraint violation on order_number + size + color."""
        order = OrderFactory()
        url = reverse("tracking:order-list-create")

        # Try to create another order with exact same order_number, size, and color
        data = {
            "order_number": order.order_number,
            "style": order.style.id,
            "size": order.size.id,
            "color": order.color.id,
            "quantity": 50,
        }

        response = authenticated_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_filter_by_style(self, authenticated_client):
        """Test filtering orders by style."""
        order = OrderFactory()
        url = reverse("tracking:order-list-create")
        response = authenticated_client.get(url, {"style": order.style.id})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_search_orders(self, authenticated_client):
        """Test searching orders."""
        order = OrderFactory(order_number="SPECIAL-001")
        url = reverse("tracking:order-list-create")
        response = authenticated_client.get(url, {"search": "SPECIAL"})
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1
        assert response.data["results"][0]["order_number"] == order.order_number
