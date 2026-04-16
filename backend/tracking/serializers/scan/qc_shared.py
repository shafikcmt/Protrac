from tracking.models import Defect
from rest_framework import serializers
from tracking.models.constants import QualityCheckStatus
from drf_spectacular.utils import extend_schema_field
from .shared import (
    ScanInfoFilterSerializer,
    BaseScanInfoSerializer,
    BaseInfoResponseSerializer,
)


class BaseQCScanSerializer(serializers.Serializer):
    """Base serializer for QC scanning."""

    tracking_code = serializers.CharField(
        max_length=50, help_text="Garment tracking code to QC"
    )
    qc_status = serializers.ChoiceField(
        choices=QualityCheckStatus.choices, help_text="QC result status"
    )
    defect_ids = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=Defect.objects.all()),
        required=False,
        default=list,
        help_text="List of defect IDs (if any)",
    )
    is_reevaluation = serializers.BooleanField(
        default=False,
        help_text="Flag if this is a reevaluation of already QC'd garment",
    )


class BaseQCScanResponseSerializer(serializers.Serializer):
    """Base response serializer for QC scanning."""

    success = serializers.BooleanField()
    message = serializers.CharField()
    garment_id = serializers.IntegerField()
    garment_tracking_code = serializers.CharField()
    qc_status = serializers.CharField()
    garment_status = serializers.CharField()
    defect_count = serializers.IntegerField()
    is_reevaluation = serializers.BooleanField()
    quality_check_id = serializers.IntegerField()
    scan_id = serializers.IntegerField()


class BaseQCInfoFilterSerializer(ScanInfoFilterSerializer):
    """Base filter serializer for QC info."""

    qc_status = serializers.ChoiceField(
        choices=QualityCheckStatus.choices,
        required=False,
        help_text="Filter by QC status",
    )


class BaseQCInfoSerializer(BaseScanInfoSerializer):
    """Base info serializer for QC scanners."""

    tracking_code = serializers.CharField(source="garment.tracking_code")
    garment_status = serializers.CharField(source="garment.status")
    sewing_line = serializers.CharField(source="garment.sewing_line.name")
    latest_qc_status = serializers.SerializerMethodField()
    defect_count = serializers.SerializerMethodField()

    class Meta(BaseScanInfoSerializer.Meta):
        fields = [
            "id",
            "tracking_code",
            "garment_status",
            "sewing_line",
            "latest_qc_status",
            "defect_count",
            "created_at",
        ]

    # Override base fields to use garment
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

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_latest_qc_status(self, obj):
        """Get latest QC status for this garment."""
        latest_qc = obj.garment.quality_checks.order_by("-created_at").first()
        return latest_qc.status if latest_qc else None

    @extend_schema_field(serializers.IntegerField())
    def get_defect_count(self, obj):
        """Get defect count from latest QC."""
        latest_qc = obj.garment.quality_checks.order_by("-created_at").first()
        return latest_qc.defects.count() if latest_qc else 0


class BaseQCInfoResponseSerializer(BaseInfoResponseSerializer):
    """Base response serializer for QC info."""

    pass
