from django.db import transaction
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from tracking.models import Bundle, Order, Part
from tracking.serializers import BaseSerializer


class OrderInfoSerializer(serializers.Serializer):
    """Serializer for order information in bundle responses."""

    order_number = serializers.CharField()
    style_name = serializers.CharField()
    size_name = serializers.CharField()
    color_name = serializers.CharField()


class PartSerializer(BaseSerializer):
    """Serializer for Part model."""

    class Meta:
        model = Part
        fields = BaseSerializer.Meta.fields + [
            "name",
        ]


class BundleSerializer(BaseSerializer):
    """Serializer for Bundle model."""

    order_number = serializers.CharField(source="order.order_number", read_only=True)
    style_name = serializers.CharField(source="order.style.name", read_only=True)
    part_name = serializers.CharField(source="part.name", read_only=True)
    size_name = serializers.CharField(source="order.size.name", read_only=True)
    color_name = serializers.CharField(source="order.color.name", read_only=True)
    display_bundle_number = serializers.CharField(read_only=True)
    part_range_display = serializers.CharField(read_only=True)
    spread_number = serializers.CharField(source="spread.number", read_only=True)

    class Meta:
        model = Bundle
        fields = BaseSerializer.Meta.fields + [
            "tracking_code",
            "order",
            "order_number",
            "part",
            "part_name",
            "style_name",
            "size_name",
            "color_name",
            "spread",
            "spread_number",
            "bundle_number_in_spread",
            "garment_quantity",
            "part_number_start",
            "part_number_end",
            "display_bundle_number",
            "part_range_display",
            "status",
            "assigned_sewing_line",
            "issued_at",
            "completed_at",
            "fifo_violation_flag",
        ]
        read_only_fields = BaseSerializer.Meta.read_only_fields + [
            "tracking_code",
            "order_number",
            "part_name",
            "style_name",
            "size_name",
            "color_name",
            "spread_number",
            "display_bundle_number",
            "part_range_display",
            "issued_at",
            "completed_at",
            "fifo_violation_flag",
            "assigned_sewing_line",
            "status",
            "part_number_start",
            "part_number_end",
        ]


class BundleSetPreviewItemSerializer(serializers.Serializer):
    """Schema for individual bundle set preview item."""

    part_id = serializers.IntegerField(help_text="ID of the part")
    part_name = serializers.CharField(help_text="Name of the part")
    bundles_count = serializers.IntegerField(
        help_text="Number of bundles for this part"
    )


class BundleCreationPreviewSerializer(serializers.Serializer):
    """Schema for bundle creation preview response."""

    @extend_schema_field(OrderInfoSerializer)
    def get_order_info(self, obj):
        return obj.get("order_info", {})

    order_info = serializers.SerializerMethodField(
        help_text="Order information including order number, style, size, color"
    )
    spread_number = serializers.CharField(
        help_text="Spread number for bundle sequencing", read_only=True
    )
    total_garment_quantity = serializers.IntegerField(
        help_text="Total number of garments to be bundled", read_only=True
    )
    bundle_sets = serializers.IntegerField(
        help_text="Number of bundle sets that will be created", read_only=True
    )
    total_bundles = serializers.IntegerField(
        help_text="Total number of bundles (bundle_sets × parts_count)", read_only=True
    )
    distribution = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="Distribution of garments across bundle sets",
        read_only=True,
    )
    parts = BundleSetPreviewItemSerializer(
        many=True, help_text="Information about each part", read_only=True
    )


class SingleBundleSetCreateSerializer(serializers.Serializer):
    """Serializer for creating a single bundle set for all parts of a style."""

    order = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(), help_text="Order to create bundle set for"
    )
    spread = None  # Will be set in __init__
    bundle_size = serializers.IntegerField(
        min_value=1, help_text="Number of garments per bundle (same for all parts)"
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Import here to avoid circular imports
        from tracking.models import Spread

        self.fields["spread"] = serializers.PrimaryKeyRelatedField(
            queryset=Spread.objects.all(),
            required=True,
            help_text="Fabric spread for bundle sequencing",
        )

    def validate(self, data):
        order = data["order"]
        if not order.style.parts.exists():
            raise serializers.ValidationError("Order's style has no parts defined.")
        return data

    @transaction.atomic
    def create(self, validated_data):
        from tracking.services import create_single_bundle_set

        result = create_single_bundle_set(
            order=validated_data["order"],
            spread=validated_data["spread"],
            garment_quantity=validated_data["bundle_size"],
            created_by=self.context["request"].user,
        )

        return result


class BulkBundleCreateSerializer(serializers.Serializer):
    """Serializer for bulk bundle creation across multiple bundle sets."""

    order = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(), help_text="Order to create bundles for"
    )
    spread = None  # Will be set in __init__
    total_garment_quantity = serializers.IntegerField(
        min_value=1, help_text="Total number of garments to create bundles for"
    )
    bundle_size = serializers.IntegerField(
        min_value=1,
        default=10,
        help_text="Preferred size for each bundle (actual sizes may vary due to distribution logic)",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Import here to avoid circular imports
        from tracking.models import Spread

        self.fields["spread"] = serializers.PrimaryKeyRelatedField(
            queryset=Spread.objects.all(),
            required=True,
            help_text="Fabric spread for bundle sequencing",
        )

    def validate(self, data):
        order = data["order"]
        if not order.style.parts.exists():
            raise serializers.ValidationError("Order's style has no parts defined.")
        return data

    @transaction.atomic
    def create(self, validated_data):
        from tracking.services import create_bulk_bundle_sets

        result = create_bulk_bundle_sets(
            order=validated_data["order"],
            spread=validated_data["spread"],
            total_garment_quantity=validated_data["total_garment_quantity"],
            bundle_size=validated_data["bundle_size"],
            created_by=self.context["request"].user,
        )

        return result


class BundleCreationPreviewRequestSerializer(serializers.Serializer):
    """Serializer for bundle creation preview request."""

    order = serializers.PrimaryKeyRelatedField(
        queryset=Order.objects.all(), help_text="Order to preview bundle creation for"
    )
    spread = None  # Will be set in __init__
    total_garment_quantity = serializers.IntegerField(
        min_value=1, help_text="Total number of garments to create bundles for"
    )
    bundle_size = serializers.IntegerField(
        min_value=1, default=10, help_text="Preferred size for each bundle"
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Import here to avoid circular imports
        from tracking.models import Spread

        self.fields["spread"] = serializers.PrimaryKeyRelatedField(
            queryset=Spread.objects.all(),
            required=True,
            help_text="Fabric spread for bundle sequencing",
        )

    def validate(self, data):
        order = data["order"]
        if not order.style.parts.exists():
            raise serializers.ValidationError("Order's style has no parts defined.")
        return data

    def to_representation(self, instance):
        from tracking.services import preview_bundle_creation

        return preview_bundle_creation(
            order=instance["order"],
            spread=instance["spread"],
            total_garment_quantity=instance["total_garment_quantity"],
            bundle_size=instance["bundle_size"],
        )


class BundleCreateResponseSerializer(serializers.Serializer):
    """Response schema for single bundle set creation."""

    bundles = BundleSerializer(
        many=True, help_text="List of created bundles", read_only=True
    )
    bundle_count = serializers.IntegerField(
        help_text="Number of bundles created (equals number of parts)", read_only=True
    )
    bundle_number = serializers.IntegerField(
        help_text="Bundle set number within the spread", read_only=True
    )
    bundle_size = serializers.IntegerField(
        help_text="Number of garments per bundle", read_only=True
    )
    part_range = serializers.CharField(
        help_text="Range of part numbers (e.g., '1-10')", read_only=True
    )


class BundleSetInfoSerializer(serializers.Serializer):
    """Serializer for bundle set information."""

    bundle_count = serializers.IntegerField(help_text="Number of bundles in this set")
    bundle_number = serializers.IntegerField(help_text="Bundle set number")
    garment_quantity = serializers.IntegerField(
        help_text="Number of garments per bundle"
    )
    part_range = serializers.CharField(help_text="Range of part numbers")


class BulkBundleCreateResponseSerializer(serializers.Serializer):
    """Response schema for bulk bundle creation."""

    bundles = BundleSerializer(
        many=True, help_text="List of all created bundles", read_only=True
    )
    bundle_sets = BundleSetInfoSerializer(
        many=True, help_text="Information about each bundle set created", read_only=True
    )
    total_bundle_count = serializers.IntegerField(
        help_text="Total number of bundles created", read_only=True
    )
    total_garment_quantity = serializers.IntegerField(
        help_text="Total number of garments bundled", read_only=True
    )
    distribution = serializers.ListField(
        child=serializers.IntegerField(),
        help_text="Distribution of garments across bundle sets",
        read_only=True,
    )


class SingleBundleSetCreateResponseSerializer(serializers.Serializer):
    """Response schema for single bundle set creation."""

    bundles = BundleSerializer(
        many=True, help_text="List of created bundles", read_only=True
    )
    bundle_count = serializers.IntegerField(
        help_text="Number of bundles created (equals number of parts)", read_only=True
    )
    bundle_number = serializers.IntegerField(
        help_text="Bundle set number within the spread", read_only=True
    )
    bundle_size = serializers.IntegerField(
        help_text="Number of garments per bundle", read_only=True
    )
    part_range = serializers.CharField(
        help_text="Range of part numbers (e.g., '1-10')", read_only=True
    )
