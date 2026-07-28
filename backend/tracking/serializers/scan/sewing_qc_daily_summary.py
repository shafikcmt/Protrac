from rest_framework import serializers


class SewingQCTopDefectSerializer(serializers.Serializer):
    """One defect code and how many times it was tagged today."""

    code = serializers.CharField(allow_blank=True)
    name = serializers.CharField()
    count = serializers.IntegerField()


class SewingQCActiveOrderSerializer(serializers.Serializer):
    """The active (most recently sewing-QC-scanned) order for the line today."""

    order_number = serializers.CharField()
    style = serializers.CharField()


class SewingQCGarmentCellSerializer(serializers.Serializer):
    """One garment cell in the active order's serial-status grid (heatmap-style)."""

    sequence_number = serializers.IntegerField()
    tracking_code = serializers.CharField()
    status = serializers.CharField(
        help_text="issued_for_assembly | sewing_qc_pass | sewing_qc_rework"
    )


class SewingQCOrderGroupSerializer(serializers.Serializer):
    """One order active today (size-wise), with its own sewing-QC serial grid."""

    order_number = serializers.CharField()
    style = serializers.CharField()
    size = serializers.CharField()
    last_activity_at = serializers.CharField(
        help_text="ISO timestamp of this order's most recent QC scan today (sort key)"
    )
    garments_grid = SewingQCGarmentCellSerializer(many=True)


class SewingQCOverlapOrderSerializer(serializers.Serializer):
    """One older-style order still in progress under a style-overlap alert."""

    order_id = serializers.IntegerField()
    order_number = serializers.CharField()
    style = serializers.CharField(allow_null=True)
    size = serializers.CharField(allow_null=True)
    pending_quantity = serializers.IntegerField()
    completion_id = serializers.IntegerField(
        allow_null=True,
        help_text="LineStyleCompletion id if already manually hidden, else null",
    )


class SewingQCStyleOverlapAlertSerializer(serializers.Serializer):
    """Alert: a newer style was issued on the line while older orders are still
    in progress. Those orders are NOT auto-hidden — this only flags the overlap."""

    production_line_id = serializers.IntegerField()
    line = serializers.CharField()
    new_style_id = serializers.IntegerField(allow_null=True)
    new_style = serializers.CharField(allow_null=True)
    in_progress_orders = SewingQCOverlapOrderSerializer(many=True)


class SewingQCHourSerializer(serializers.Serializer):
    """One hourly bucket: per-hour target vs QC-pass actual."""

    hour = serializers.IntegerField(help_text="1-based hour bucket (H1, H2, ...)")
    target = serializers.IntegerField(
        help_text="Per-hour target from the line's daily target (0 when none set)"
    )
    actual = serializers.IntegerField(
        help_text="Sewing-QC PASS records bucketed into this hour"
    )


class SewingQCDailySummaryResponseSerializer(serializers.Serializer):
    """Today's sewing-QC tally for the scanner's line (paper-register style)."""

    line = serializers.CharField()
    date = serializers.CharField()
    total_output = serializers.IntegerField()
    total_rework = serializers.IntegerField()
    total_fail = serializers.IntegerField()
    pass_rate = serializers.FloatField()
    total_inspected = serializers.IntegerField()
    total_defects = serializers.IntegerField()
    dhu = serializers.FloatField()
    top_defects = SewingQCTopDefectSerializer(many=True)
    active_order = SewingQCActiveOrderSerializer(allow_null=True)
    garments_grid = SewingQCGarmentCellSerializer(many=True)
    order_groups = SewingQCOrderGroupSerializer(many=True)
    hourly = SewingQCHourSerializer(many=True)
    style_overlap_alert = SewingQCStyleOverlapAlertSerializer(allow_null=True)
