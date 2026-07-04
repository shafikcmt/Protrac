from rest_framework import serializers


class SewingQCTopDefectSerializer(serializers.Serializer):
    """One defect code and how many times it was tagged today."""

    code = serializers.CharField(allow_blank=True)
    name = serializers.CharField()
    count = serializers.IntegerField()


class SewingQCDailySummaryResponseSerializer(serializers.Serializer):
    """Today's sewing-QC tally for the scanner's line (paper-register style)."""

    line = serializers.CharField()
    date = serializers.CharField()
    total_output = serializers.IntegerField()
    total_rework = serializers.IntegerField()
    total_fail = serializers.IntegerField()
    total_inspected = serializers.IntegerField()
    total_defects = serializers.IntegerField()
    dhu = serializers.FloatField()
    top_defects = SewingQCTopDefectSerializer(many=True)
