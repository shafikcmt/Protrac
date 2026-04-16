from rest_framework.exceptions import ValidationError
from tracking.models import Style
from tracking.serializers import StyleWithPartsSerializer
from tracking.api import BaseListCreateView, BaseDetailView
from django_filters.rest_framework import DjangoFilterBackend


class StyleListCreateView(BaseListCreateView):
    """List all styles or create a new style with parts."""

    queryset = (
        Style.objects.select_related("buyer", "season")
        .prefetch_related("parts")
        .all()
    )
    serializer_class = StyleWithPartsSerializer
    filter_backends = [*BaseListCreateView.filter_backends, DjangoFilterBackend]
    search_fields = ["name", "buyer__name", "season__name"]
    filterset_fields = ["buyer", "season"]
    ordering_fields = ["name", "buyer__name", "season__name", "created_at"]


class StyleDetailView(BaseDetailView):
    """Retrieve, update or delete a style with parts."""

    queryset = (
        Style.objects.select_related("buyer", "season")
        .prefetch_related("parts")
        .all()
    )
    serializer_class = StyleWithPartsSerializer

    def perform_destroy(self, instance):
        """Prevent deletion of styles that have orders."""
        if instance.orders.exists():
            orders_count = instance.orders.count()
            first_orders = list(instance.orders.all()[:3])
            order_numbers = [order.order_number for order in first_orders]
            more_count = max(0, orders_count - len(order_numbers))

            error_msg = f"Cannot delete Style '{instance}' because it has {orders_count} related orders: {', '.join(order_numbers)}"
            if more_count > 0:
                error_msg += f" and {more_count} more"

            raise ValidationError({"detail": error_msg, "code": "style_has_orders"})

        super().perform_destroy(instance)
