from rest_framework import serializers
from tracking.serializers import BaseSerializer
from tracking.models import LineTarget


class LineTargetSerializer(BaseSerializer):
    """Serializer for LineTarget model."""

    # Read-only fields for display
    line_name = serializers.CharField(source="line.name", read_only=True)

    class Meta:
        model = LineTarget
        fields = BaseSerializer.Meta.fields + [
            "line",
            "line_name",
            "date",
            "target_quantity",
            "work_hours",
            "worker_count",
        ]

    def validate(self, data):
        """Validate line target data."""
        # Check for duplicate line/date combination
        if self.instance is None:  # Only for creation
            existing = LineTarget.objects.filter(
                line=data.get("line"), date=data.get("date")
            ).exists()

            if existing:
                raise serializers.ValidationError(
                    "A target already exists for this line on this date."
                )

        return data
