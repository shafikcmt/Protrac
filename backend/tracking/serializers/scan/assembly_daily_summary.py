from rest_framework import serializers


class DailySummaryFilterSerializer(serializers.Serializer):
    """Filter serializer for the assembly daily summary endpoint."""

    date = serializers.DateField(
        required=False,
        help_text="Date to summarise (YYYY-MM-DD). Defaults to today.",
    )


class DailySummaryPartSerializer(serializers.Serializer):
    """A single part's received-today total."""

    part_name = serializers.CharField()
    issued_today = serializers.IntegerField()


class DailySummaryGarmentSerializer(serializers.Serializer):
    """A recently issued garment."""

    id = serializers.CharField()
    time = serializers.CharField()


class DailySummaryHourSerializer(serializers.Serializer):
    """One hourly bucket: bundles received vs garments assembly-complete."""

    hour = serializers.IntegerField(help_text="1-based hour bucket (H1, H2, ...)")
    target = serializers.IntegerField(help_text="Per-hour target from the line's daily target")
    bundles_received = serializers.IntegerField(
        help_text="BUNDLE_COMPLETED (part receive) scans in this hour"
    )
    assembly_complete = serializers.IntegerField(
        help_text="GARMENT_ISSUED_FOR_ASSEMBLY scans in this hour"
    )


class AssemblyDailySummaryResponseSerializer(serializers.Serializer):
    """Response serializer for the assembly daily summary endpoint."""

    line = serializers.CharField()
    date = serializers.CharField()
    total_assemble = serializers.IntegerField()
    parts_summary = DailySummaryPartSerializer(many=True)
    total_parts_issued = serializers.IntegerField()
    parts_issued_count = serializers.IntegerField()
    parts_total_count = serializers.IntegerField()
    recent_garments = DailySummaryGarmentSerializer(many=True)
    hourly = DailySummaryHourSerializer(many=True)
