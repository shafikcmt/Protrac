from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field


class FinishingDashboardFilterSerializer(serializers.Serializer):
    """Serializer for filtering finishing dashboard data."""

    # Single filters (for backward compatibility)
    finishing_line_id = serializers.IntegerField(required=False)
    order_id = serializers.IntegerField(required=False)
    style_id = serializers.IntegerField(required=False)
    buyer_id = serializers.IntegerField(required=False)
    style = serializers.CharField(required=False)
    size = serializers.CharField(required=False)
    color = serializers.CharField(required=False)

    # Multiple filters
    finishing_line_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Filter by multiple finishing line IDs"
    )
    order_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Filter by multiple order IDs"
    )
    style_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Filter by multiple style IDs"
    )
    buyer_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Filter by multiple buyer IDs"
    )
    sizes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Filter by multiple sizes"
    )
    colors = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="Filter by multiple colors"
    )

    # Date filters
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    active_only = serializers.BooleanField(default=True)


class FinishingQCStatsSerializer(serializers.Serializer):
    """Serializer for finishing QC statistics."""

    total_qc = serializers.IntegerField(help_text="Total finishing quality checks")
    passed_qc = serializers.IntegerField(help_text="Number of passed QC checks")
    failed_qc = serializers.IntegerField(help_text="Number of failed QC checks")
    qc_rate = serializers.FloatField(help_text="QC pass rate (0.0 to 1.0)")


class SourceLineSerializer(serializers.Serializer):
    """Serializer for source sewing lines."""

    id = serializers.IntegerField(help_text="Production line ID")
    name = serializers.CharField(help_text="Production line name")
    garment_count = serializers.IntegerField(
        help_text="Number of garments from this line"
    )


class FinishingOrderDashboardSerializer(serializers.Serializer):
    """Serializer for finishing dashboard order data."""

    # Order basic information
    id = serializers.IntegerField(help_text="Order ID")
    order_number = serializers.CharField(help_text="Order number")
    customer_name = serializers.CharField(help_text="Customer name")
    style_name = serializers.CharField(help_text="Style name")
    size_name = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="Order size name"
    )
    delivery_date = serializers.DateField(
        required=False,
        allow_null=True,
        help_text="Order delivery date"
    )
    completion_rate = serializers.FloatField(
        required=False,
        help_text="Completion rate (0.0 to 1.0)"
    )

    # Finishing metrics
    input_garments = serializers.IntegerField(
        help_text="Total garments entered finishing pipeline"
    )
    output_garments = serializers.IntegerField(
        help_text="Garments that passed finishing QC"
    )
    in_progress_garments = serializers.IntegerField(
        help_text="Garments currently being finished"
    )

    @extend_schema_field(FinishingQCStatsSerializer)
    def get_qc_stats(self, obj):
        return FinishingQCStatsSerializer(obj.get("qc_stats", {})).data

    qc_stats = serializers.SerializerMethodField(help_text="Finishing QC statistics")

    @extend_schema_field(SourceLineSerializer(many=True))
    def get_source_lines(self, obj):
        return SourceLineSerializer(obj.get("source_lines", []), many=True).data

    source_lines = serializers.SerializerMethodField(
        help_text="Source sewing lines for this order"
    )