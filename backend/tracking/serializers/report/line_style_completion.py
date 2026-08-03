from rest_framework import serializers
from tracking.models import LineStyleCompletion
from tracking.models.constants import CompletionSource


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
        # The auto-generated UniqueTogetherValidator for
        # LineStyleCompletion.Meta.unique_together ("production_line", "order") is
        # deliberately dropped. "Mark Complete" is an idempotent operator intent,
        # not an insert: the auto-completion triggers
        # (tracking.services.line_completion) may already have written an AUTO row
        # for the same line+order, and a completion recorded *today* does not hide
        # anything until tomorrow (line_visibility.get_completed_order_ids), so the
        # row is still on the report offering the button. With the validator in
        # place that click returned
        # {"non_field_errors": ["The fields production_line, order must make a
        # unique set."]}. `create()` below upserts instead. The DB constraint
        # itself is untouched and still guarantees one row per line+order.
        validators = []

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
        """Idempotently record the completion for this production_line + order.

        An existing row — in practice a ``source=AUTO`` one written by
        :mod:`tracking.services.line_completion` — is *upgraded* to MANUAL rather
        than rejected. An operator's explicit "Mark Complete" outranks every
        automatic rule, and the action must succeed whether or not a row happens
        to exist already.

        ``created_at`` is deliberately NOT re-stamped. It is what bounds
        effectivity: a completion hides the style only from the day *after* it was
        recorded (see ``line_visibility.get_completed_order_ids``). Re-stamping an
        existing row would push its hide date forward by a day and resurrect an
        already-hidden style on the report.

        Existing ``notes`` are kept when the request carries none, so the original
        auto-completion reason stays as an audit trail.

        Sets ``self.instance_created`` so the view can answer 201 for a new record
        and 200 for an upgraded one.
        """
        request = self.context.get("request")
        user = (
            request.user
            if request and request.user and request.user.is_authenticated
            else None
        )

        defaults = {
            "source": CompletionSource.MANUAL,
            "completed_by": user,
        }
        notes = validated_data.get("notes")
        if notes:
            defaults["notes"] = notes

        instance, created = LineStyleCompletion.objects.update_or_create(
            production_line=validated_data["production_line"],
            order=validated_data["order"],
            defaults=defaults,
        )
        self.instance_created = created
        return instance
