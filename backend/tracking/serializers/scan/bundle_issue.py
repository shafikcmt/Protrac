from rest_framework import serializers
from tracking.models import ProductionLine
from .shared import (
    ScanInfoFilterSerializer,
    BaseScanInfoSerializer,
    BaseInfoResponseSerializer,
)


class BundleIssueScanSerializer(serializers.Serializer):
    """Serializer for bundle issue scanning."""

    tracking_code = serializers.CharField(
        max_length=50, help_text="Bundle tracking code to issue"
    )
    sewing_line = serializers.PrimaryKeyRelatedField(
        queryset=ProductionLine.objects.filter(line_type="sewing"),
        help_text="Destination sewing line for this bundle",
    )


class BundleIssueScanResponseSerializer(serializers.Serializer):
    """Response serializer for bundle issue scanning."""

    success = serializers.BooleanField()
    message = serializers.CharField()
    bundle_id = serializers.IntegerField()
    bundle_tracking_code = serializers.CharField()
    assigned_sewing_line = serializers.CharField()
    scan_id = serializers.IntegerField()


class BundleIssueInfoFilterSerializer(ScanInfoFilterSerializer):
    """Filter serializer for bundle issue info."""

    mother_only = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Filter to only show mother cut part bundles",
    )


class BundleIssueInfoSerializer(BaseScanInfoSerializer):
    """Info for bundle issue scanner."""

    tracking_code = serializers.CharField(source="bundle.tracking_code")
    cut_part_name = serializers.CharField(source="bundle.part.name")
    quantity = serializers.IntegerField(source="bundle.garment_quantity")
    issued_to_sewing_line = serializers.CharField(
        source="bundle.assigned_sewing_line.name"
    )

    class Meta(BaseScanInfoSerializer.Meta):
        fields = BaseScanInfoSerializer.Meta.fields + [
            "tracking_code",
            "cut_part_name",
            "assembly_part_name",
            "quantity",
            "issued_to_sewing_line",
        ]


class BundleIssueInfoResponseSerializer(BaseInfoResponseSerializer):
    """Response serializer for bundle issue info."""

    results = BundleIssueInfoSerializer(many=True)
