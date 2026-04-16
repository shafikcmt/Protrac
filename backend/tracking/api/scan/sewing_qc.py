from .qc_shared import create_qc_scan_endpoint, create_qc_info_endpoint
from tracking.services.scan.sewing_qc import (
    process_sewing_qc_scan,
    get_sewing_qc_info,
)
from tracking.serializers.scan.sewing_qc import (
    SewingQCScanSerializer,
    SewingQCScanResponseSerializer,
    SewingQCInfoSerializer,
    SewingQCInfoResponseSerializer,
    SewingQCInfoFilterSerializer,
)


sewing_qc_scan = create_qc_scan_endpoint(
    service_function=process_sewing_qc_scan,
    scan_serializer=SewingQCScanSerializer,
    response_serializer=SewingQCScanResponseSerializer,
    qc_type="sewing",
)

sewing_qc_info = create_qc_info_endpoint(
    service_function=get_sewing_qc_info,
    info_filter_serializer=SewingQCInfoFilterSerializer,
    info_serializer=SewingQCInfoSerializer,
    response_serializer=SewingQCInfoResponseSerializer,
    qc_type="sewing",
)
