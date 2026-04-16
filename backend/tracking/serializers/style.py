from django.db import transaction
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from tracking.serializers import BaseSerializer
from tracking.models import Style


class PartDetailSerializer(serializers.Serializer):
    """Serializer for part details in style response."""

    id = serializers.IntegerField()
    name = serializers.CharField()


class StyleWithPartsSerializer(BaseSerializer):
    """Serializer for Style model with parts."""

    # Read-only fields for display (similar to order serializer)
    buyer_name = serializers.CharField(source="buyer.name", read_only=True)
    season_name = serializers.CharField(source="season.name", read_only=True)
    parts_details = serializers.SerializerMethodField()

    @extend_schema_field(PartDetailSerializer(many=True))
    def get_parts_details(self, obj):
        """Get parts with id and name for display."""
        return [{"id": part.id, "name": part.name} for part in obj.parts.all()]

    class Meta:
        model = Style
        fields = BaseSerializer.Meta.fields + [
            "name",
            "buyer",
            "buyer_name",
            "season",
            "season_name",
            "image",
            "smv_minutes",
            "parts",
            "parts_details",
        ]

    def validate_parts(self, parts):
        """Validate that parts list doesn't have duplicates."""
        part_ids = [part.id for part in parts]

        if len(part_ids) != len(set(part_ids)):
            raise serializers.ValidationError(
                "Cannot assign the same part multiple times to a style."
            )

        return parts

    @transaction.atomic
    def create(self, validated_data):
        parts = validated_data.pop("parts", [])
        style = Style.objects.create(**validated_data)

        # Associate existing parts with the style
        style.parts.set(parts)

        return style

    @transaction.atomic
    def update(self, instance, validated_data):
        parts = validated_data.pop("parts", [])

        # Update style fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update part associations
        instance.parts.set(parts)

        return instance


class StyleSerializer(BaseSerializer):
    """Simple serializer for Style model without parts."""

    parts_count = serializers.SerializerMethodField()

    class Meta:
        model = Style
        fields = BaseSerializer.Meta.fields + [
            "name",
            "buyer",
            "season",
            "image",
            "smv_minutes",
            "parts_count",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "parts_count",
        ]

    @extend_schema_field(serializers.IntegerField())
    def get_parts_count(self, obj):
        """Get the number of parts for this style."""
        return obj.parts.count()
