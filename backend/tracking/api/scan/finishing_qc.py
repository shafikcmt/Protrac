from .qc_shared import create_qc_scan_endpoint, create_qc_info_endpoint
from tracking.services.scan.finishing_qc import (
    process_finishing_qc_scan,
    get_finishing_qc_info,
)
from tracking.serializers.scan.finishing_qc import (
    FinishingQCScanSerializer,
    FinishingQCScanResponseSerializer,
    FinishingQCInfoSerializer,
    FinishingQCInfoResponseSerializer,
    FinishingQCInfoFilterSerializer,
)


finishing_qc_scan = create_qc_scan_endpoint(
    service_function=process_finishing_qc_scan,
    scan_serializer=FinishingQCScanSerializer,
    response_serializer=FinishingQCScanResponseSerializer,
    qc_type="finishing",
)

finishing_qc_info = create_qc_info_endpoint(
    service_function=get_finishing_qc_info,
    info_filter_serializer=FinishingQCInfoFilterSerializer,
    info_serializer=FinishingQCInfoSerializer,
    response_serializer=FinishingQCInfoResponseSerializer,
    qc_type="finishing",
)
