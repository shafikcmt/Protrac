from rest_framework import serializers


class HourlyDataSerializer(serializers.Serializer):
    """Hourly production data."""

    hour = serializers.IntegerField(help_text="Hour of the day (1-8 for 8-hour shift)")
    target = serializers.IntegerField(help_text="Hourly target quantity")
    output = serializers.IntegerField(help_text="Actual output for this hour")
    rework = serializers.IntegerField(help_text="Rework count for this hour")


class DefectDetailSerializer(serializers.Serializer):
    """End line defect details."""

    name = serializers.CharField(help_text="Defect name")
    count = serializers.IntegerField(help_text="Number of occurrences")
    percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, help_text="Percentage of total defects"
    )


class QCStatsSerializer(serializers.Serializer):
    """QC statistics for a line."""

    qc_pass = serializers.IntegerField()
    qc_fail = serializers.IntegerField()
    qc_rework = serializers.IntegerField()
    total_qc_completed = serializers.IntegerField()


class PartInventorySerializer(serializers.Serializer):
    """Part inventory details for assembly."""

    name = serializers.CharField()
    expected = serializers.IntegerField()  # max_possible from line target
    total_produced = serializers.IntegerField()
    issued = serializers.IntegerField()

# ✅ NEW: Part-wise hourly rows for Slide2
class PartHourlyDataSerializer(serializers.Serializer):
    part = serializers.CharField(help_text="Part name (Front/Back/Sleeve/...)")
    target = serializers.IntegerField(help_text="Per-hour target for this part")
    hours = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="Hourly produced list (len = work_hours or 10)",
    )

    def to_representation(self, instance):
        # allow dict keys from older/other services:
        # name->part, hourly->hours
        if isinstance(instance, dict):
            if "part" not in instance and "name" in instance:
                instance = {**instance, "part": instance.get("name")}
            if "hours" not in instance and "hourly" in instance:
                instance = {**instance, "hours": instance.get("hourly")}
        return super().to_representation(instance)
    

# ✅ NEW: Hourly quality rows for Slide3
class HourlyQualityRowSerializer(serializers.Serializer):
    hour = serializers.IntegerField(help_text="Hour number (1..work_hours)")
    dhu = serializers.FloatField(help_text="DHU% for this hour")
    defects = serializers.IntegerField(help_text="Defect count for this hour")
    remarks = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="Hourly rework/defect codes (e.g. ['UT','SK'])",
    )

    def to_representation(self, instance):
        # allow dict keys from other formats:
        # top3->remarks, defect_count->defects
        if isinstance(instance, dict):
            if "defects" not in instance and "defect_count" in instance:
                instance = {**instance, "defects": instance.get("defect_count")}
            if "remarks" not in instance and "top3" in instance:
                instance = {**instance, "remarks": instance.get("top3")}
        return super().to_representation(instance)


class SewingLineDashboardV2Serializer(serializers.Serializer):
    """Enhanced sewing line dashboard response with all dashboard metrics."""

    production_line_id = serializers.IntegerField()
    production_line_name = serializers.CharField()

    # Header metrics (top cards)
    target_qty = serializers.IntegerField(help_text="Daily target quantity")
    pass_qty = serializers.IntegerField(help_text="Total passed garments")
    rework_qty = serializers.IntegerField(help_text="Total rework garments")
    rejected_qty = serializers.IntegerField(help_text="Total rejected garments")

    # Gauge metrics (circular progress indicators)
    efficiency_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, help_text="Efficiency percentage"
    )
    rejection_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, help_text="Rejection percentage"
    )
    dhu_percentage = serializers.DecimalField(
        max_digits=5, decimal_places=2, help_text="DHU percentage"
    )

    # Line metrics (bottom cards)
    line_wip = serializers.IntegerField(help_text="Line work in progress count")
    todays_loading = serializers.IntegerField(help_text="Today's loading count")

    # Hourly breakdown table
    hourly_data = HourlyDataSerializer(many=True)

    # End line defects
    end_line_defects = DefectDetailSerializer(many=True)

    # Legacy fields for backward compatibility
    qc_stats = QCStatsSerializer()
    part_inventory = PartInventorySerializer(many=True)

    # ✅ NEW FIELDS (needed for v3 slides)
    work_hours = serializers.IntegerField(
        required=False, default=8, help_text="Shift work hours"
    )
    parts_hourly_data = PartHourlyDataSerializer(
        many=True, required=False, default=list
    )
    hourly_quality_rows = HourlyQualityRowSerializer(
        many=True, required=False, default=list
    )


class SewingDashboardV2FilterSerializer(serializers.Serializer):
    """Filter parameters for sewing dashboard v2."""

    # Single filters (for backward compatibility)
    production_line_id = serializers.IntegerField(required=False)
    order_id = serializers.IntegerField(required=False)
    style_id = serializers.IntegerField(required=False)
    buyer_id = serializers.IntegerField(required=False)
    size = serializers.CharField(max_length=10, required=False)
    color = serializers.CharField(max_length=50, required=False)
    
    # Date filters
    date = serializers.DateField(required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    
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
