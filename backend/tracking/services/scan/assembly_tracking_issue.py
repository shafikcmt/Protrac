from django.db import transaction
from django.utils import timezone
from typing import Dict, TYPE_CHECKING
from tracking.models import Garment, Scan, PartInventory
from tracking.services.tracking_code import find_item_by_tracking_code
from tracking.models.constants import ScannerType, GarmentStatus, ScanEventType

if TYPE_CHECKING:
    from accounts.models import User
    from tracking.models import Scanner


def _validate_user_scanner(user: "User") -> "Scanner":
    """Validate user has assigned assembly tracking scanner."""
    if not user.assigned_scanner:
        raise ValueError("User has no assigned scanner")

    if user.assigned_scanner.scanner_type != ScannerType.ASSEMBLY_TRACKING:
        raise ValueError("Scanner is not an assembly tracking scanner")

    return user.assigned_scanner


def _validate_garment_tracking_code(tracking_code: str) -> Garment:
    """Validate tracking code and return garment."""
    item, item_type = find_item_by_tracking_code(tracking_code)

    if not item:
        raise ValueError(f"Invalid tracking code: {tracking_code}")

    if item_type != "garment":
        raise ValueError("Invalid garment tracking code")

    return item


def _validate_garment_for_assembly_issue(garment: Garment) -> None:
    """Validate garment can be issued for assembly."""
    if garment.status != GarmentStatus.PENDING_ASSEMBLY:
        raise ValueError(
            f"Garment not compatible for assembly (status: {garment.status})"
        )


def _check_assembly_parts_availability(garment: Garment, scanner: "Scanner") -> None:
    """Check if enough assembly parts are available for this garment."""
    required_parts = garment.order.style.parts.all()

    for assembly_part in required_parts:
        try:
            inventory = PartInventory.objects.get(
                production_line=scanner.production_line,
                order=garment.order,
                part=assembly_part,
            )

            if inventory.available_quantity < 1:
                raise ValueError(f"Insufficient {assembly_part.name} available")

        except PartInventory.DoesNotExist:
            raise ValueError(f"No {assembly_part.name} inventory available")


def _adjust_inventories(garment: Garment, scanner: "Scanner") -> None:
    """Adjust inventories by subtracting issued assembly parts."""
    required_parts = garment.order.style.parts.all()

    for assembly_part in required_parts:
        inventory = PartInventory.objects.get(
            production_line=scanner.production_line,
            order=garment.order,
            part=assembly_part,
        )
        inventory.issued_quantity += 1
        inventory.save()


@transaction.atomic
def process_garment_issue_for_assembly_scan(
    tracking_code: str, user: "User"
) -> Dict[str, any]:
    """Process garment issue for assembly scan."""
    # Validate user and scanner
    scanner = _validate_user_scanner(user)

    # Validate tracking code and get garment
    garment = _validate_garment_tracking_code(tracking_code)

    # Validate garment can be issued
    _validate_garment_for_assembly_issue(garment)

    # Check assembly parts availability
    _check_assembly_parts_availability(garment, scanner)  # Adjust inventories
    _adjust_inventories(garment, scanner)

    # Update garment
    garment.status = GarmentStatus.ISSUED_FOR_ASSEMBLY
    garment.sewing_line = scanner.production_line
    garment.issued_for_assembly_at = timezone.now()
    garment.save()

    # Create scan record
    scan = Scan.objects.create(
        garment=garment,
        scanner=scanner,
        event_type=ScanEventType.GARMENT_ISSUED_FOR_ASSEMBLY,
    )

    return {
        "success": True,
        "message": "Garment issued for assembly",
        "garment_id": garment.id,
        "garment_tracking_code": garment.tracking_code,
        "sewing_line": scanner.production_line.name,
        "scan_id": scan.id,
    }


def get_assembly_tracking_issue_info(
    user: "User",
    limit: int = 50,
    order_id: int = None,
    tracking_code: str = None,
    date_from=None,
    date_to=None,
) -> Dict[str, any]:
    """Get garment issue for assembly history for user's scanner."""
    # Validate user and scanner
    scanner = _validate_user_scanner(user)

    # Build queryset with filters
    queryset = Scan.objects.filter(
        scanner=scanner,
        event_type=ScanEventType.GARMENT_ISSUED_FOR_ASSEMBLY,
    )

    # Drop scans belonging to inactive styles (superseded / completed / expired)
    # so the history only reflects currently active styles on this line.
    from tracking.services.line_visibility import get_inactive_order_ids_for_line

    inactive_order_ids = get_inactive_order_ids_for_line(scanner.production_line)
    if inactive_order_ids:
        queryset = queryset.exclude(garment__order_id__in=inactive_order_ids)

    # Apply filters
    if order_id:
        queryset = queryset.filter(garment__order_id=order_id)

    if tracking_code:
        queryset = queryset.filter(garment__tracking_code__icontains=tracking_code)

    if date_from:
        queryset = queryset.filter(created_at__gte=date_from)

    if date_to:
        queryset = queryset.filter(created_at__lte=date_to)

    # Get scans with related data
    scans = queryset.select_related(
        "garment__order__style__season",
        "garment__order__size",
        "garment__order__color",
    ).order_by("-created_at")[:limit]

    return {
        "scanner_info": {
            "scanner_type": scanner.scanner_type,
            "scanner_name": scanner.name,
            "scanner_production_line": scanner.production_line.name,
        },
        "count": len(scans),
        "scans": scans,
    }
