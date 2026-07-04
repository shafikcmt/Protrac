from rest_framework import serializers
from tracking.models.tracking import Buyer, Season, Size, Color, Part, Defect, Spread


class BaseSerializer(serializers.ModelSerializer):
    """Base serializer with common fields."""

    class Meta:
        abstract = True
        fields = ["id", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class BuyerSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = Buyer
        fields = ["id", "name", "created_at", "updated_at"]


class SeasonSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = Season
        fields = ["id", "name", "created_at", "updated_at"]


class SizeSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = Size
        fields = ["id", "name", "index", "created_at", "updated_at"]


class ColorSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = Color
        fields = ["id", "name", "created_at", "updated_at"]


class PartSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = Part
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class DefectSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = Defect
        fields = ["id", "code", "name", "description", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SpreadSerializer(BaseSerializer):
    class Meta(BaseSerializer.Meta):
        model = Spread
        fields = ["id", "number", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
