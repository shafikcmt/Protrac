from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
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
    # Extra bundle fields the transfer feature needs: a stable target id (the
    # base `id` is the SCAN id, not the bundle's), the current line id, and the
    # bundle status (to gate which rows are transferable in the UI).
    bundle_id = serializers.IntegerField(source="bundle.id", read_only=True)
    status = serializers.CharField(source="bundle.status", read_only=True)
    assigned_sewing_line_id = serializers.SerializerMethodField()

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_assigned_sewing_line_id(self, obj):
        return obj.bundle.assigned_sewing_line_id if obj.bundle else None

    class Meta(BaseScanInfoSerializer.Meta):
        fields = BaseScanInfoSerializer.Meta.fields + [
            "tracking_code",
            "cut_part_name",
            "assembly_part_name",
            "quantity",
            "issued_to_sewing_line",
            "bundle_id",
            "status",
            "assigned_sewing_line_id",
        ]


class BundleIssueInfoResponseSerializer(BaseInfoResponseSerializer):
    """Response serializer for bundle issue info."""

    results = BundleIssueInfoSerializer(many=True)
