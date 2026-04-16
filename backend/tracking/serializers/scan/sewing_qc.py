from .qc_shared import (
    BaseQCScanSerializer,
    BaseQCScanResponseSerializer,
    BaseQCInfoFilterSerializer,
    BaseQCInfoSerializer,
    BaseQCInfoResponseSerializer,
)


class SewingQCScanSerializer(BaseQCScanSerializer):
    """Serializer for sewing QC scanning."""

    pass


class SewingQCScanResponseSerializer(BaseQCScanResponseSerializer):
    """Response serializer for sewing QC scanning."""

    pass


class SewingQCInfoFilterSerializer(BaseQCInfoFilterSerializer):
    """Filter serializer for sewing QC info."""

    pass


class SewingQCInfoSerializer(BaseQCInfoSerializer):
    """Info for sewing QC scanner."""

    pass


class SewingQCInfoResponseSerializer(BaseQCInfoResponseSerializer):
    """Response serializer for sewing QC info."""

    results = SewingQCInfoSerializer(many=True)
