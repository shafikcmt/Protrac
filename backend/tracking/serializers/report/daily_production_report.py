from rest_framework import serializers


class DailyProductionReportFilterSerializer(serializers.Serializer):
    """Filter serializer for Daily Production Report."""

    report_date = serializers.DateField(
        required=False, help_text="Date for the report (defaults to today)"
    )
    date_from = serializers.DateField(
        required=False, help_text="Start date for date range filter"
    )
    date_to = serializers.DateField(
        required=False, help_text="End date for date range filter"
    )
    
    # Single filters (for backward compatibility)
    production_line_id = serializers.IntegerField(
        required=False, help_text="Filter by specific production line"
    )
    buyer_id = serializers.IntegerField(
        required=False, help_text="Filter by specific buyer"
    )
    style_id = serializers.IntegerField(
        required=False, help_text="Filter by specific style"
    )
    order_id = serializers.IntegerField(
        required=False, help_text="Filter by specific order"
    )
    
    # Multiple filters
    production_line_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Filter by multiple production line IDs"
    )
    buyer_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Filter by multiple buyer IDs"
    )
    style_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Filter by multiple style IDs"
    )
    order_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Filter by multiple order IDs"
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

    include_hidden = serializers.BooleanField(
        required=False,
        default=False,
        help_text="When true, manually-completed (hidden) rows are returned too, "
        "flagged is_hidden, so the UI can show and unhide them. Hidden rows are "
        "always excluded from summary totals.",
    )


class DayAndCumulativeSerializer(serializers.Serializer):
    """Serializer for day and cumulative counts."""

    day = serializers.IntegerField(help_text="Count for the specific day")
    cumulative = serializers.IntegerField(
        help_text="Cumulative count up to and including the report date"
    )


class PartProductionSerializer(serializers.Serializer):
    """Serializer for part production data (Front, Back, Sleeve, etc.)."""

    day = serializers.IntegerField(help_text="Parts produced on the specific day")
    cumulative = serializers.IntegerField(
        help_text="Cumulative parts produced up to the report date"
    )


class OrderProductionReportSerializer(serializers.Serializer):
    """Serializer for a single order's production data in the daily report."""

    order_id = serializers.IntegerField(required=False, allow_null=True, help_text="Order ID")
    production_line_id = serializers.IntegerField(required=False, allow_null=True, help_text="Production line ID")
    line = serializers.CharField(help_text="Production line name")
    buyer = serializers.CharField(help_text="Buyer/client name")
    style = serializers.CharField(help_text="Style name")
    size = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="Order size"
    )
    color = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="Order color"
    )
    order_quantity = serializers.IntegerField(help_text="Total quantity ordered")
    working_days = serializers.IntegerField(
        help_text="Working days for this production"
    )
    working_hours = serializers.FloatField(
        allow_null=True,
        required=False,
        help_text="Working hours for the day (from the line target; null if unset)",
    )
    input = serializers.IntegerField(
        help_text="Garments entering production on this day"
    )

    # Parts production - dynamic fields for each part type
    # These will be added dynamically based on the style's parts
    front = PartProductionSerializer(required=False, help_text="Front part production")
    back = PartProductionSerializer(required=False, help_text="Back part production")
    sleeve = PartProductionSerializer(
        required=False, help_text="Sleeve part production"
    )
    collar = PartProductionSerializer(
        required=False, help_text="Collar part production"
    )
    hood = PartProductionSerializer(required=False, help_text="Hood part production")
    lining = PartProductionSerializer(
        required=False, help_text="Lining part production"
    )

    assembly_input = DayAndCumulativeSerializer(
        help_text="Garments entering assembly stage"
    )
    output = DayAndCumulativeSerializer(
        help_text="Finished garments (passed sewing QC)"
    )
    dhu_day = serializers.FloatField(
        help_text="Defect per Hundred Units percentage for the day"
    )
    dhu_average = serializers.FloatField(
        help_text="Average Defect per Hundred Units percentage"
    )
    inspection = DayAndCumulativeSerializer(help_text="Garments inspected (QC'd)")
    packed = DayAndCumulativeSerializer(help_text="Garments packed (finished QC pass)")
    needs_manual_complete = serializers.BooleanField(
        required=False,
        default=False,
        help_text="True when a 'Mark as Complete' button should be shown for this row",
    )
    is_pending_transition = serializers.BooleanField(
        required=False,
        default=False,
        help_text="True when this is an old style pending output while a newer style is active on the line",
    )
    pending_quantity = serializers.IntegerField(
        required=False,
        default=0,
        help_text="Cumulative input minus cumulative output (pieces in the line "
        "not yet QC-passed)",
    )
    active_style_name = serializers.CharField(
        required=False,
        allow_null=True,
        allow_blank=True,
        help_text="Name of the newer/active style that started on this line "
        "(only set on pending-transition rows); null otherwise",
    )
    remarks = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        help_text="Human-readable status/warning for the row (pending transition, manual completion, etc.)",
    )
    is_hidden = serializers.BooleanField(
        required=False,
        default=False,
        help_text="True when this row is manually-completed (hidden) and only shown because include_hidden was requested",
    )
    completion_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="LineStyleCompletion id for a hidden row (used by the Unhide action); null otherwise",
    )


class ProductionLineReportSerializer(serializers.Serializer):
    """Serializer for production line report data."""

    production_line_id = serializers.IntegerField(help_text="Production line ID")
    production_line_name = serializers.CharField(help_text="Production line name")
    orders = OrderProductionReportSerializer(
        many=True, help_text="Orders being produced on this line"
    )


class ReportSummarySerializer(serializers.Serializer):
    """Serializer for report summary statistics."""

    total_production_lines = serializers.IntegerField(
        help_text="Total number of production lines in the report"
    )
    total_orders = serializers.IntegerField(
        help_text="Total number of orders being produced"
    )
    total_order_quantity = serializers.IntegerField(
        help_text="Sum of all order quantities"
    )
    daily_input = serializers.IntegerField(
        help_text="Total garments entering production today"
    )
    daily_output = serializers.IntegerField(help_text="Total finished garments today")
    daily_inspection = serializers.IntegerField(
        help_text="Total garments inspected today"
    )
    daily_packed = serializers.IntegerField(help_text="Total garments packed today")
    overall_efficiency = serializers.FloatField(
        help_text="Overall production efficiency percentage (output/input * 100)"
    )


class DailyProductionReportResponseSerializer(serializers.Serializer):
    """Response serializer for Daily Production Report."""

    report_date = serializers.DateField(help_text="Date of the report")
    company_name = serializers.CharField(
        default="HUMANA APPARELS PVT. LTD", help_text="Company name"
    )
    report_title = serializers.CharField(
        default="DAILY PRODUCTION REPORT", help_text="Report title"
    )
    production_lines = ProductionLineReportSerializer(
        many=True, help_text="Production data for each production line"
    )
    summary = ReportSummarySerializer(
        required=False, help_text="Report summary statistics"
    )
