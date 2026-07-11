from rest_framework import serializers
from tracking.models import ProductionLine


class BundleTransferItemSerializer(serializers.Serializer):
    """One transferred bundle in the response summary."""

    bundle_id = serializers.IntegerField()
    tracking_code = serializers.CharField()
    from_line = serializers.CharField(allow_null=True)
    to_line = serializers.CharField()


class BundleTransferRequestSerializer(serializers.Serializer):
    """Request to transfer already-issued bundles to a different sewing line."""

    bundle_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
        help_text="IDs of the issued bundles to transfer",
    )
    sewing_line = serializers.PrimaryKeyRelatedField(
        queryset=ProductionLine.objects.filter(line_type="sewing"),
        help_text="Destination sewing line",
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=255,
        default="",
        help_text="Optional note on why the bundles were transferred",
    )


class BundleTransferResponseSerializer(serializers.Serializer):
    """Response summary for a bundle transfer."""

    success = serializers.BooleanField()
    message = serializers.CharField()
    transferred_count = serializers.IntegerField()
    transferred = BundleTransferItemSerializer(many=True)
