from rest_framework import serializers
from .shared import (
    ScanInfoFilterSerializer,
    BaseScanInfoSerializer,
    BaseInfoResponseSerializer,
)


class AssemblyTrackingIssueScanSerializer(serializers.Serializer):
    """Serializer for assembly tracking issue scanning."""

    tracking_code = serializers.CharField(
        max_length=50, help_text="Garment tracking code to issue for assembly"
    )


class AssemblyTrackingIssueScanResponseSerializer(serializers.Serializer):
    """Response serializer for assembly tracking issue scanning."""

    success = serializers.BooleanField()
    message = serializers.CharField()
    garment_id = serializers.IntegerField()
    garment_tracking_code = serializers.CharField()
    sewing_line = serializers.CharField()
    scan_id = serializers.IntegerField()


class AssemblyTrackingIssueInfoFilterSerializer(ScanInfoFilterSerializer):
    """Filter serializer for assembly tracking issue info."""

    pass


class AssemblyTrackingIssueInfoSerializer(BaseScanInfoSerializer):
    """Info for assembly tracking issue scanner."""

    tracking_code = serializers.CharField(source="garment.tracking_code")
    garment_status = serializers.CharField(source="garment.status")
    sewing_line = serializers.CharField(source="garment.sewing_line.name")

    class Meta(BaseScanInfoSerializer.Meta):
        # Override the source paths to account for garment instead of bundle
        fields = [
            "id",
            "tracking_code",
            "garment_status",
            "sewing_line",
            "created_at",
        ]

    # Override the base fields to use garment instead of bundle
    order_number = serializers.CharField(
        source="garment.order.order_number", read_only=True
    )
    style_name = serializers.CharField(
        source="garment.order.style.name", read_only=True
    )
    season_name = serializers.CharField(
        source="garment.order.style.season.name", read_only=True
    )
    size_name = serializers.CharField(source="garment.order.size.name", read_only=True)
    color_name = serializers.CharField(
        source="garment.order.color.name", read_only=True
    )


class AssemblyTrackingIssueInfoResponseSerializer(BaseInfoResponseSerializer):
    """Response serializer for assembly tracking issue info."""

    results = AssemblyTrackingIssueInfoSerializer(many=True)
