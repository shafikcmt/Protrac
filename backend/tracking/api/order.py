from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from tracking.api import BaseListCreateView, BaseDetailView
from tracking.serializers import OrderSerializer
from tracking.models import Order


class OrderListCreateView(BaseListCreateView):
    """List all orders or create a new order."""

    queryset = (
        Order.objects.select_related("style__buyer", "style__season", "size", "color")
        .prefetch_related("style__parts")
        .all()
    )
    serializer_class = OrderSerializer
    filter_backends = [*BaseListCreateView.filter_backends, DjangoFilterBackend]
    search_fields = [
        "order_number",
        "style__name",
        "style__buyer__name",
        "size__name",
        "color__name",
    ]
    filterset_fields = ["style", "style__buyer", "style__season", "size", "color"]
    ordering_fields = [
        "order_number",
        "style__name",
        "quantity",
        "production_cutting_date",
        "delivery_date",
        "created_at",
    ]
    ordering = ["order_number"]


class OrderDetailView(BaseDetailView):
    """Retrieve, update or delete an order."""

    queryset = (
        Order.objects.select_related("style__buyer", "style__season", "size", "color")
        .prefetch_related("style__parts")
        .all()
    )
    serializer_class = OrderSerializer

    def perform_destroy(self, instance):
        """Prevent deletion of orders that have bundles or garments."""
        # Check for bundles
        if instance.bundles.exists():
            bundles_count = instance.bundles.count()
            raise ValidationError(
                {
                    "detail": f"Cannot delete Order '{instance.order_number}' because it has {bundles_count} related bundles. Delete all bundles first.",
                    "code": "order_has_bundles",
                }
            )

        # Check for garments
        if instance.garments.exists():
            garments_count = instance.garments.count()
            raise ValidationError(
                {
                    "detail": f"Cannot delete Order '{instance.order_number}' because it has {garments_count} related garments. Delete all garments first.",
                    "code": "order_has_garments",
                }
            )

        # Check for part inventories
        if instance.part_inventories.exists():
            inventories_count = instance.part_inventories.count()
            raise ValidationError(
                {
                    "detail": f"Cannot delete Order '{instance.order_number}' because it has {inventories_count} related part inventories.",
                    "code": "order_has_inventories",
                }
            )

        super().perform_destroy(instance)
