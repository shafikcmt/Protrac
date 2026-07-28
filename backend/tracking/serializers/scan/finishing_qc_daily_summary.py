from rest_framework import serializers


class FinishingQCActiveOrderSerializer(serializers.Serializer):
    """The active (most recently finishing-QC-scanned) order for the line today."""

    order_number = serializers.CharField()
    style = serializers.CharField()


class FinishingQCGarmentCellSerializer(serializers.Serializer):
    """One garment cell in the finishing serial grid — a dual sewing/finishing view.

    Each serial carries BOTH its latest sewing-QC status and its latest
    finishing-QC status so the diagonal-split box can show them together.
    """

    sequence_number = serializers.IntegerField()
    tracking_code = serializers.CharField()
    sewing_status = serializers.CharField(
        help_text="sewing_qc_pass | sewing_qc_rework"
    )
    finishing_status = serializers.CharField(
        help_text="finishing_qc_pending | finishing_qc_pass | finishing_qc_rework"
    )
    finishing_checked_date = serializers.CharField(
        allow_null=True,
        help_text=(
            "Local date (YYYY-MM-DD) of the serial's latest finishing-QC record, "
            "for day-wise grouping. Null when still pending finishing."
        ),
    )


class FinishingQCOrderGroupSerializer(serializers.Serializer):
    """One order active today (size-wise), with its own finishing serial grid."""

    order_number = serializers.CharField()
    style = serializers.CharField()
    size = serializers.CharField()
    last_activity_at = serializers.CharField(
        help_text="ISO timestamp of this order's most recent finishing-QC scan today"
    )
    garments_grid = FinishingQCGarmentCellSerializer(many=True)


class FinishingQCDailySummaryResponseSerializer(serializers.Serializer):
    """Today's finishing-QC tally for the scanner's line (paper-register style)."""

    line = serializers.CharField()
    date = serializers.CharField()
    total_output = serializers.IntegerField()
    total_rework = serializers.IntegerField()
    total_fail = serializers.IntegerField()
    pass_rate = serializers.FloatField()
    total_inspected = serializers.IntegerField()
    total_defects = serializers.IntegerField()
    dhu = serializers.FloatField()
    active_order = FinishingQCActiveOrderSerializer(allow_null=True)
    garments_grid = FinishingQCGarmentCellSerializer(many=True)
    order_groups = FinishingQCOrderGroupSerializer(many=True)
