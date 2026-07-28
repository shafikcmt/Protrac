from rest_framework import serializers
from tracking.models import LineStyleCompletion


class LineStyleCompletionSerializer(serializers.ModelSerializer):
    production_line_name = serializers.CharField(
        source="production_line.name", read_only=True
    )
    order_detail = serializers.SerializerMethodField()
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LineStyleCompletion
        fields = [
            "id",
            "production_line",
            "production_line_name",
            "order",
            "order_detail",
            "completed_by",
            "completed_by_name",
            "source",
            "notes",
            "created_at",
        ]
        # `source` is read-only: a completion created through this endpoint is by
        # definition an operator action, so it keeps the model default (MANUAL).
        # AUTO rows are only ever written by tracking.services.line_completion.
        read_only_fields = ["id", "created_at", "completed_by", "source"]

    def get_order_detail(self, obj):
        order = obj.order
        return {
            "id": order.id,
            "buyer": order.style.buyer.name if order.style and order.style.buyer else None,
            "style": order.style.name if order.style else None,
            "size": order.size.name if order.size else None,
            "color": order.color.name if order.color else None,
            "order_number": order.order_number,
        }

    def get_completed_by_name(self, obj):
        if obj.completed_by:
            return getattr(obj.completed_by, "get_full_name", lambda: None)() or str(obj.completed_by)
        return None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["completed_by"] = request.user
        return super().create(validated_data)
