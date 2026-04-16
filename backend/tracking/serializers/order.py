from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from tracking.serializers import BaseSerializer
from tracking.models import Order


class OrderSerializer(BaseSerializer):
    """Serializer for Order model."""

    style_name = serializers.CharField(source="style.name", read_only=True)
    size_name = serializers.CharField(source="size.name", read_only=True)
    color_name = serializers.CharField(source="color.name", read_only=True)
    buyer_name = serializers.CharField(source="style.buyer.name", read_only=True)
    season_name = serializers.CharField(source="style.season.name", read_only=True)
    potential_garments = serializers.SerializerMethodField()

    @extend_schema_field(serializers.IntegerField())
    def get_potential_garments(self, obj):
        """Calculate potential garments based on bundles."""
        from tracking.services.bundle import calculate_potential_garments_for_order

        return calculate_potential_garments_for_order(obj)

    class Meta:
        model = Order
        fields = BaseSerializer.Meta.fields + [
            "order_number",
            "style",
            "style_name",
            "size",
            "size_name",
            "color",
            "color_name",
            "buyer_name",
            "season_name",
            "quantity",
            "production_cutting_date",
            "delivery_date",
            "potential_garments",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "style_name",
            "size_name",
            "color_name",
            "buyer_name",
            "season_name",
            "potential_garments",
        ]
