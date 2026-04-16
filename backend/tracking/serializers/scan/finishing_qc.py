from rest_framework import serializers
from .qc_shared import (
    BaseQCScanSerializer,
    BaseQCScanResponseSerializer,
    BaseQCInfoFilterSerializer,
    BaseQCInfoSerializer,
    BaseQCInfoResponseSerializer,
)


class FinishingQCScanSerializer(BaseQCScanSerializer):
    """Serializer for finishing QC scanning."""

    pass


class FinishingQCScanResponseSerializer(BaseQCScanResponseSerializer):
    """Response serializer for finishing QC scanning."""

    finishing_line = serializers.CharField()


class FinishingQCInfoFilterSerializer(BaseQCInfoFilterSerializer):
    """Filter serializer for finishing QC info."""

    pass


class FinishingQCInfoSerializer(BaseQCInfoSerializer):
    """Info for finishing QC scanner."""

    finishing_line = serializers.CharField(source="garment.finishing_line.name")

    class Meta(BaseQCInfoSerializer.Meta):
        fields = BaseQCInfoSerializer.Meta.fields + ["finishing_line"]


class FinishingQCInfoResponseSerializer(BaseQCInfoResponseSerializer):
    """Response serializer for finishing QC info."""

    results = FinishingQCInfoSerializer(many=True)
