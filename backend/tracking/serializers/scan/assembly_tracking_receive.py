from rest_framework import serializers
from .shared import ScanInfoFilterSerializer, BaseInfoResponseSerializer


class AssemblyPartReceiveScanSerializer(serializers.Serializer):
    """Serializer for assembly part receive scanning."""

    tracking_code = serializers.CharField(
        max_length=50, help_text="Bundle tracking code for mother cut part"
    )


class FifoComplianceSerializer(serializers.Serializer):
    """Serializer for FIFO compliance information."""

    is_compliant = serializers.BooleanField()
    warnings = serializers.ListField(child=serializers.CharField(), required=False)
    violation_count = serializers.IntegerField()
    details = serializers.JSONField(allow_null=True, required=False)


class AssemblyPartReceiveScanResponseSerializer(serializers.Serializer):
    """Response serializer for assembly part receive scanning."""

    success = serializers.BooleanField()
    message = serializers.CharField()
    bundle_id = serializers.IntegerField()
    part = serializers.CharField()
    quantity_completed = serializers.IntegerField()
    total_inventory = serializers.IntegerField()
    processing_time_minutes = serializers.FloatField(allow_null=True)
    scan_id = serializers.IntegerField()
    fifo_compliance = FifoComplianceSerializer()


class PartInventoryItemSerializer(serializers.Serializer):
    """Serializer for individual part inventory item."""

    order_id = serializers.IntegerField()
    order_number = serializers.CharField()
    style = serializers.CharField()
    season = serializers.CharField()
    size = serializers.CharField()
    color = serializers.CharField()
    part = serializers.CharField()
    order_quantity = serializers.IntegerField()
    total_quantity = serializers.IntegerField()
    issued_quantity = serializers.IntegerField()
    available_quantity = serializers.IntegerField()


class PartReceiveInfoResponseSerializer(BaseInfoResponseSerializer):
    """Response serializer for part receive info."""

    recent_scans = serializers.ListField()
    inventory_items = PartInventoryItemSerializer(many=True)
    inventory_count = serializers.IntegerField()


class PartReceiveInfoFilterSerializer(ScanInfoFilterSerializer):
    """Filter serializer for part receive info."""

    pass
