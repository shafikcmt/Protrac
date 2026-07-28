from django.db import transaction
from typing import Dict, List, TYPE_CHECKING
from common.utils.time import now
from tracking.models import Garment, Scan, QualityCheck, Defect
from tracking.services.tracking_code import find_item_by_tracking_code
from tracking.models.constants import (
    ScannerType,
    GarmentStatus,
    QualityCheckStatus,
    QualityCheckCheckpoint,
    ScanEventType,
)

if TYPE_CHECKING:
    from accounts.models import User
    from tracking.models import Scanner


def _validate_user_scanner(user: "User") -> "Scanner":
    """Validate user has assigned finishing QC scanner."""
    if not user.assigned_scanner:
        raise ValueError("User has no assigned scanner")

    if user.assigned_scanner.scanner_type != ScannerType.FINISHING_QC_CHECK:
        raise ValueError("Scanner is not a finishing QC scanner")

    return user.assigned_scanner


def _validate_garment_tracking_code(tracking_code: str) -> Garment:
    """Validate tracking code and return garment."""
    item, item_type = find_item_by_tracking_code(tracking_code)

    if not item:
        raise ValueError(f"Invalid tracking code: {tracking_code}")

    if item_type != "garment":
        raise ValueError("Invalid garment tracking code")

    return item


def _determine_garment_status_from_qc(qc_status: str) -> str:
    """Determine garment status based on QC result."""
    if qc_status == QualityCheckStatus.PASS:
        return GarmentStatus.FINISHING_QC_PASS
    elif qc_status == QualityCheckStatus.FAIL:
        return GarmentStatus.FINISHING_QC_FAIL
    elif qc_status == QualityCheckStatus.REWORK:
        return GarmentStatus.FINISHING_QC_REWORK
    else:
        raise ValueError(f"Invalid QC status: {qc_status}")


def _create_quality_check_record(
    garment: Garment, qc_status: str, defect_ids: List[int]
) -> QualityCheck:
    """Create quality check record with defects."""
    quality_check = QualityCheck.objects.create(
        garment=garment,
        status=qc_status,
        checkpoint=QualityCheckCheckpoint.FINISHING_QC,
    )

    # Add defects if any
    if defect_ids:
        defects = Defect.objects.filter(id__in=defect_ids)
        quality_check.defects.set(defects)

    return quality_check


@transaction.atomic
def process_finishing_qc_scan(
    tracking_code: str,
    qc_status: str,
    defect_ids: List[int],
    user: "User",
    is_reevaluation: bool = False,
) -> Dict[str, any]:
    """Process finishing QC scan for garment."""
    # Validate user and scanner
    scanner = _validate_user_scanner(user)

    # Validate tracking code and get garment
    garment = _validate_garment_tracking_code(tracking_code)

    # Handle different scenarios based on current status. Re-evaluation is now
    # detected automatically from the garment's QC history — no manual flag,
    # mirroring the sewing-QC scan: a garment previously failed or sent to rework
    # at finishing can simply be re-scanned, and when it passes it counts as
    # output like any other pass.
    if garment.status == GarmentStatus.SEWING_QC_PASS:
        # First finishing QC check.
        is_reevaluation = False

    elif garment.status in [
        GarmentStatus.FINISHING_QC_FAIL,
        GarmentStatus.FINISHING_QC_REWORK,
    ]:
        # Re-QC of a defective garment: always allowed, auto-flagged as a
        # re-evaluation. The `is_reevaluation` request param is ignored.
        is_reevaluation = True

    elif garment.status == GarmentStatus.FINISHING_QC_PASS:
        # Already passed and counted as output. Block a re-scan so output/DHU
        # totals are never double-counted.
        raise ValueError(
            f"Garment already passed finishing QC (status: {garment.status}). "
            "It has already been counted as output."
        )

    else:
        raise ValueError(
            f"Garment not compatible for finishing QC (status: {garment.status})"
        )

    # Determine new garment status based on QC result
    new_status = _determine_garment_status_from_qc(qc_status)

    # Create quality check record
    quality_check = _create_quality_check_record(
        garment, qc_status, defect_ids
    )  # Update garment - set status and finishing line
    garment.status = new_status
    garment.finishing_line = scanner.production_line

    # Set finishing completion time if QC passed
    if new_status == GarmentStatus.FINISHING_QC_PASS:
        garment.finishing_completed_at = now()

    garment.save()

    # Create scan record
    scan = Scan.objects.create(
        garment=garment,
        scanner=scanner,
        event_type=ScanEventType.FINISHING_QUALITY_CHECK,
    )

    # Prepare response message
    action = "reevaluated" if is_reevaluation else "processed"
    defect_count = len(defect_ids) if defect_ids else 0

    message = f"Garment {action} - QC {qc_status}"
    if defect_count > 0:
        message += f" with {defect_count} defect(s)"

    return {
        "success": True,
        "message": message,
        "garment_id": garment.id,
        "garment_tracking_code": garment.tracking_code,
        "qc_status": qc_status,
        "garment_status": new_status,
        "finishing_line": scanner.production_line.name,
        "defect_count": defect_count,
        "is_reevaluation": is_reevaluation,
        "quality_check_id": quality_check.id,
        "scan_id": scan.id,
    }


def get_finishing_qc_info(
    user: "User",
    limit: int = 50,
    order_id: int = None,
    tracking_code: str = None,
    qc_status: str = None,
    date_from=None,
    date_to=None,
) -> Dict[str, any]:
    """Get finishing QC history for user's scanner."""
    # Validate user and scanner
    scanner = _validate_user_scanner(user)

    # Build queryset with filters
    queryset = Scan.objects.filter(
        scanner=scanner,
        event_type=ScanEventType.FINISHING_QUALITY_CHECK,
    )

    # Apply filters
    if order_id:
        queryset = queryset.filter(garment__order_id=order_id)

    if tracking_code:
        queryset = queryset.filter(garment__tracking_code__icontains=tracking_code)

    if qc_status:
        queryset = queryset.filter(garment__quality_checks__status=qc_status).distinct()

    if date_from:
        queryset = queryset.filter(created_at__gte=date_from)

    if date_to:
        queryset = queryset.filter(created_at__lte=date_to)

    # Get scans with related data
    scans = (
        queryset.select_related(
            "garment__order__style__season",
            "garment__order__size",
            "garment__order__color",
            "garment__sewing_line",
            "garment__finishing_line",
        )
        .prefetch_related("garment__quality_checks__defects")
        .order_by("-created_at")[:limit]
    )

    return {
        "scanner_info": {
            "scanner_type": scanner.scanner_type,
            "scanner_name": scanner.name,
            "scanner_production_line": scanner.production_line.name,
        },
        "count": len(scans),
        "scans": scans,
    }
