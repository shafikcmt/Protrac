from rest_framework import serializers
from tracking.models import Scan, Order
from drf_spectacular.utils import extend_schema_field


class ScannerInfoSerializer(serializers.Serializer):
    """Shared scanner information serializer."""

    scanner_type = serializers.CharField()
    scanner_name = serializers.CharField()
    scanner_production_line = serializers.CharField()


class ScanInfoFilterSerializer(serializers.Serializer):
    """Shared filter serializer for scan info endpoints."""

    order = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(),
        required=False,
        help_text="Filter by specific order",
    )
    tracking_code = serializers.CharField(
        required=False, max_length=50, help_text="Search by tracking code"
    )
    date_from = serializers.DateTimeField(
        required=False, help_text="Filter scans from this date/time (ISO format)"
    )
    date_to = serializers.DateTimeField(
        required=False, help_text="Filter scans until this date/time (ISO format)"
    )
    limit = serializers.IntegerField(
        default=50,
        min_value=1,
        max_value=200,
        required=False,
        help_text="Maximum number of results",
    )


class BaseScanInfoSerializer(serializers.ModelSerializer):
    """Base serializer for scan information with common fields."""

    order_number = serializers.CharField(
        source="bundle.order.order_number", read_only=True
    )
    style_name = serializers.CharField(source="bundle.order.style.name", read_only=True)
    season_name = serializers.CharField(
        source="bundle.order.style.season.name", read_only=True
    )
    size_name = serializers.CharField(source="bundle.order.size.name", read_only=True)
    color_name = serializers.CharField(source="bundle.order.color.name", read_only=True)
    assembly_part_name = serializers.SerializerMethodField()

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_assembly_part_name(self, obj):
        """Get assembly part name from bundle."""
        # Since Bundle doesn't have assembly_part field,
        # we'll return the part name for consistency
        return obj.bundle.part.name if obj.bundle and obj.bundle.part else None

    class Meta:
        model = Scan
        fields = [
            "id",
            "order_number",
            "style_name",
            "season_name",
            "size_name",
            "color_name",
            "created_at",
        ]


class BaseInfoResponseSerializer(serializers.Serializer):
    """Base response serializer for info endpoints."""

    scanner_info = ScannerInfoSerializer()
    count = serializers.IntegerField()
