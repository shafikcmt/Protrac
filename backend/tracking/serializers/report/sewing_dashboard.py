from rest_framework import serializers


class DefectItemSerializer(serializers.Serializer):
    """Serializer for individual defect statistics."""

    defect_name = serializers.CharField(help_text="Name of the defect")
    count = serializers.IntegerField(help_text="Number of occurrences of this defect")
    percentage = serializers.FloatField(
        help_text="Percentage of this defect out of total defects"
    )


class SewingQCStatsSerializer(serializers.Serializer):
    """Serializer for sewing QC statistics."""

    qc_pass = serializers.IntegerField(
        help_text="Number of garments that passed latest sewing QC"
    )
    qc_fail = serializers.IntegerField(
        help_text="Number of garments that failed latest sewing QC"
    )
    qc_rework = serializers.IntegerField(
        help_text="Number of garments marked for rework in latest sewing QC"
    )
    total_qc_completed = serializers.IntegerField(
        help_text="Total number of garments that have been QC'd"
    )
    total_defects = serializers.IntegerField(
        help_text="Total number of defects found in QC"
    )
    dhu_percentage = serializers.FloatField(
        help_text="Defects per Hundred Units percentage"
    )
    top_defects = DefectItemSerializer(many=True, help_text="Top 5 most common defects")


class SewingAssemblyPartDetailSerializer(serializers.Serializer):
    """Serializer for sewing line assembly part inventory details."""

    name = serializers.CharField()
    available = serializers.IntegerField()
    total_produced = serializers.IntegerField()
    issued = serializers.IntegerField()
    max_possible = serializers.IntegerField()
    utilization_percentage = serializers.FloatField()
    is_bottleneck = serializers.BooleanField()


class FifoSummarySerializer(serializers.Serializer):
    """Serializer for FIFO summary information."""

    total_fifo_violations = serializers.IntegerField(
        help_text="Total bundles with FIFO violations on this production line"
    )
    recent_fifo_violations = serializers.IntegerField(
        help_text="FIFO violations in the last 24 hours"
    )


class FifoStatusSerializer(serializers.Serializer):
    """Serializer for order-level FIFO status."""

    has_fifo_violations = serializers.BooleanField(
        help_text="Whether this order has any FIFO violations"
    )
    violation_count = serializers.IntegerField(
        help_text="Number of bundles with FIFO violations for this order"
    )
    total_completed_bundles = serializers.IntegerField(
        help_text="Total completed bundles for this order on this production line"
    )


class SewingOrderDashboardSerializer(serializers.Serializer):
    """Serializer for individual order data in sewing production dashboard."""

    order_id = serializers.IntegerField()
    order_number = serializers.CharField()
    style = serializers.CharField()
    season = serializers.CharField()
    size = serializers.CharField()
    color = serializers.CharField()
    order_quantity = serializers.IntegerField()  # Clear KPI naming
    input = serializers.IntegerField(
        help_text="Total possible garments from available bundles"
    )
    assembly_ready_count = serializers.IntegerField(
        help_text="Maximum possible garments ready for assembly (limited by bottleneck assembly part)"
    )
    garment_assembly_wip = serializers.IntegerField(
        help_text="Garments issued for assembly but not yet passed sewing QC"
    )
    output = serializers.IntegerField(help_text="Garments that passed sewing QC")
    completion_rate = serializers.FloatField()
    # Inventory fields for backward compatibility
    total_inventory = serializers.IntegerField(
        help_text="Total inventory quantity across all parts"
    )
    issued_inventory = serializers.IntegerField(
        help_text="Issued inventory quantity across all parts"
    )
    available_inventory = serializers.IntegerField(
        help_text="Available inventory quantity across all parts"
    )
    # QC Statistics
    qc_stats = SewingQCStatsSerializer(
        help_text="Current sewing QC statistics based on latest QC status for each garment"
    )
    # Assembly parts breakdown
    assembly_parts = SewingAssemblyPartDetailSerializer(many=True)
    # FIFO compliance status
    fifo_status = FifoStatusSerializer(
        help_text="FIFO compliance status for this order"
    )


class ProductionLineQCSummarySerializer(serializers.Serializer):
    """Serializer for production line QC summary."""

    total_qc_pass = serializers.IntegerField(
        help_text="Total garments that passed QC across all orders on this line"
    )
    total_qc_fail = serializers.IntegerField(
        help_text="Total garments that failed QC across all orders on this line"
    )
    total_qc_rework = serializers.IntegerField(
        help_text="Total garments marked for rework across all orders on this line"
    )
    total_qc_completed = serializers.IntegerField(
        help_text="Total QC completed across all orders on this line"
    )
    total_defects = serializers.IntegerField(
        help_text="Total defects found across all orders on this line"
    )
    line_dhu_percentage = serializers.FloatField(
        help_text="Line-level DHU (Defects per Hundred Units) percentage"
    )
    top_line_defects = DefectItemSerializer(
        many=True, help_text="Top 5 most common defects across all orders on this line"
    )


class SewingLineDashboardSerializer(serializers.Serializer):
    """Serializer for sewing production line data in dashboard."""

    production_line_id = serializers.IntegerField()
    production_line_name = serializers.CharField()
    orders = SewingOrderDashboardSerializer(many=True)
    fifo_summary = FifoSummarySerializer(
        help_text="FIFO violation summary for this production line"
    )
    qc_summary = ProductionLineQCSummarySerializer(
        help_text="QC statistics and defect analysis for this production line"
    )


class SewingDashboardFilterSerializer(serializers.Serializer):
    """Serializer for sewing dashboard filter parameters."""

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
    
    active_only = serializers.BooleanField(
        default=True, help_text="Show only incomplete orders (completion_rate < 1.0)"
    )
    date_from = serializers.DateTimeField(
        required=False, help_text="Filter orders created after this date (ISO format)"
    )
    date_to = serializers.DateTimeField(
        required=False, help_text="Filter orders created before this date (ISO format)"
    )
