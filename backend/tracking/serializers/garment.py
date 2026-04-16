from tracking.models import Garment
from rest_framework import serializers
from tracking.serializers import BaseSerializer


class GarmentSerializer(BaseSerializer):
    """Serializer for Garment model."""

    order_number = serializers.CharField(source="order.order_number", read_only=True)
    style_name = serializers.CharField(source="order.style.name", read_only=True)
    size_name = serializers.CharField(source="order.size.name", read_only=True)
    color_name = serializers.CharField(source="order.color.name", read_only=True)
    display_number = serializers.CharField(read_only=True)
    primary_bundle_id = serializers.IntegerField(
        source="primary_bundle.id", read_only=True
    )
    primary_bundle_tracking_code = serializers.CharField(
        source="primary_bundle.tracking_code", read_only=True
    )

    class Meta:
        model = Garment
        fields = BaseSerializer.Meta.fields + [
            "tracking_code",
            "order",
            "order_number",
            "style_name",
            "size_name",
            "color_name",
            "primary_bundle",
            "primary_bundle_id",
            "primary_bundle_tracking_code",
            "sequence_number",
            "bundle_set_number",
            "part_number_in_bundle",
            "display_number",
            "status",
            "sewing_line",
            "finishing_line",
            "issued_for_assembly_at",
            "assembly_completed_at",
            "finishing_completed_at",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "tracking_code",
            "order",
            "primary_bundle_id",
            "primary_bundle_tracking_code",
            "sequence_number",
            "bundle_set_number",
            "part_number_in_bundle",
            "display_number",
            "issued_for_assembly_at",
            "assembly_completed_at",
            "finishing_completed_at",
        ]
