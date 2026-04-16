from rest_framework import serializers


class GarmentHeatmapFilterSerializer(serializers.Serializer):
    """Filter serializer for Garment Heatmap Report."""

    # Single filters (for backward compatibility)
    production_line_id = serializers.IntegerField(
        required=False, help_text="Filter by specific production line ID"
    )
    order_id = serializers.IntegerField(
        required=False, help_text="Filter by specific order ID"
    )
    style_id = serializers.IntegerField(
        required=False, help_text="Filter by specific style ID"
    )
    buyer_id = serializers.IntegerField(
        required=False, help_text="Filter by specific buyer ID"
    )
    
    # Multiple filters
    production_line_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Filter by multiple production line IDs"
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
    
    # Additional filters
    sizes = serializers.ListField(
        child=serializers.CharField(max_length=10),
        required=False,
        help_text="Filter by multiple sizes"
    )
    colors = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        help_text="Filter by multiple colors"
    )
    
    # Date filters
    date_from = serializers.DateTimeField(
        required=False, help_text="Filter orders created after this date (ISO format)"
    )
    date_to = serializers.DateTimeField(
        required=False, help_text="Filter orders created before this date (ISO format)"
    )
    active_only = serializers.BooleanField(
        default=True, help_text="Show only incomplete orders"
    )


class GarmentHeatmapItemSerializer(serializers.Serializer):
    """Serializer for individual garment in the heatmap."""

    sequence_number = serializers.IntegerField(help_text="Sequential number within the order")
    status = serializers.CharField(help_text="Current garment status")
    status_display = serializers.CharField(help_text="Human-readable status name")
    tracking_code = serializers.CharField(help_text="Unique tracking code")
    created_at = serializers.DateTimeField(help_text="When the garment was created")
    issued_for_assembly_at = serializers.DateTimeField(
        allow_null=True, help_text="When issued for assembly"
    )
    assembly_completed_at = serializers.DateTimeField(
        allow_null=True, help_text="When assembly was completed"
    )
    finishing_completed_at = serializers.DateTimeField(
        allow_null=True, help_text="When finishing was completed"
    )


class StatusSummarySerializer(serializers.Serializer):
    """Serializer for status count summary per order."""

    pending_assembly = serializers.IntegerField(default=0)
    issued_for_assembly = serializers.IntegerField(default=0)
    sewing_qc_pass = serializers.IntegerField(default=0)
    sewing_qc_fail = serializers.IntegerField(default=0)
    sewing_qc_rework = serializers.IntegerField(default=0)
    finishing_qc_pass = serializers.IntegerField(default=0)
    finishing_qc_fail = serializers.IntegerField(default=0)
    finishing_qc_rework = serializers.IntegerField(default=0)


class OrderHeatmapSerializer(serializers.Serializer):
    """Serializer for order data in the heatmap."""

    order_id = serializers.IntegerField(help_text="Order ID")
    order_number = serializers.CharField(help_text="Order number")
    style_name = serializers.CharField(help_text="Style name")
    buyer_name = serializers.CharField(help_text="Buyer name")
    season_name = serializers.CharField(help_text="Season name")
    size_name = serializers.CharField(help_text="Size name")
    color_name = serializers.CharField(help_text="Color name")
    total_quantity = serializers.IntegerField(help_text="Total order quantity")
    garments = GarmentHeatmapItemSerializer(many=True, help_text="List of garments")
    status_summary = StatusSummarySerializer(help_text="Count of garments by status")


class GarmentHeatmapResponseSerializer(serializers.Serializer):
    """Response serializer for Garment Heatmap Report."""

    orders = OrderHeatmapSerializer(many=True, help_text="Orders with their garments")
    total_orders = serializers.IntegerField(help_text="Total number of orders")
    total_garments = serializers.IntegerField(help_text="Total number of garments")
    overall_status_summary = StatusSummarySerializer(
        help_text="Overall status summary across all orders"
    )
