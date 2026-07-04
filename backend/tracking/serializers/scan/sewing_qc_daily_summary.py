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
