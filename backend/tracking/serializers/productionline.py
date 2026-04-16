from rest_framework import serializers
from tracking.serializers import BaseSerializer
from tracking.models import (
    ProductionLine,
    Scanner,
)


class ScannerListSerializer(BaseSerializer):
    """Read-only serializer for listing scanners."""

    production_line_name = serializers.CharField(
        source="production_line.name", read_only=True
    )
    production_line_type = serializers.CharField(
        source="production_line.line_type", read_only=True
    )

    class Meta:
        model = Scanner
        fields = BaseSerializer.Meta.fields + [
            "name",
            "scanner_type",
            "production_line_name",
            "production_line_type",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields


class ProductionLineSerializer(BaseSerializer):
    """Serializer for ProductionLine model."""

    scanners = ScannerListSerializer(many=True, read_only=True)

    class Meta:
        model = ProductionLine
        fields = BaseSerializer.Meta.fields + [
            "name",
            "line_type",
            "scanners",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + ["scanners"]

    def get_extra_kwargs(self):
        """Make line_type read-only for updates but writable for creation."""
        extra_kwargs = super().get_extra_kwargs()

        # If this is an update, make line_type read-only
        if self.instance:
            extra_kwargs.setdefault("line_type", {})["read_only"] = True

        return extra_kwargs

    def validate_name(self, value):
        """Ensure production line names are unique."""
        if self._name_exists(value):
            raise serializers.ValidationError(
                "A production line with this name already exists."
            )
        return value

    def _name_exists(self, name):
        """Check if production line name already exists."""
        query = ProductionLine.objects.filter(name=name)

        # Exclude current instance if updating
        if self.instance:
            query = query.exclude(pk=self.instance.pk)

        return query.exists()
