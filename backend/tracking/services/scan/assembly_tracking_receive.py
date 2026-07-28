from typing import Dict, TYPE_CHECKING
from django.db import transaction
from django.utils import timezone
from tracking.models import Bundle, Scan, PartInventory
from tracking.services.tracking_code import find_item_by_tracking_code
from tracking.services.fifo_validation import (
    validate_bundle_fifo_sequence,
    update_bundle_fifo_flags,
)
from tracking.models.constants import ScannerType, BundleStatus, ScanEventType

if TYPE_CHECKING:
    from accounts.models import User
    from tracking.models import Scanner


def _validate_user_scanner(user: "User") -> "Scanner":
    """Validate user has assigned assembly tracking scanner."""
    if not user.assigned_scanner:
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied("User has no assigned scanner")

    if user.assigned_scanner.scanner_type != ScannerType.ASSEMBLY_TRACKING:
        from rest_framework.exceptions import PermissionDenied

        raise PermissionDenied("Scanner is not an assembly tracking scanner")

    return user.assigned_scanner


def _validate_bundle_tracking_code(tracking_code: str) -> Bundle:
    """Validate tracking code and return bundle."""
    item, item_type = find_item_by_tracking_code(tracking_code)

    if not item:
        from rest_framework import serializers

        raise serializers.ValidationError(
            {"tracking_code": f"Invalid tracking code: {tracking_code}"}
        )

    if item_type != "bundle":
        from rest_framework import serializers

        raise serializers.ValidationError(
            {"tracking_code": "Invalid bundle tracking code"}
        )

    return item


def _validate_bundle_for_part_receive(bundle: Bundle, scanner: "Scanner") -> None:
    """Validate bundle can be processed for part receive."""
    if bundle.status == BundleStatus.COMPLETED:
        from rest_framework import serializers

        raise serializers.ValidationError({"duplicate": "Bundle already processed"})

    if bundle.status not in [BundleStatus.ISSUED_TO_SEWING]:
        from rest_framework import serializers

        raise serializers.ValidationError(
            {"status": f"Bundle not ready for completion (status: {bundle.status})"}
        )

    if bundle.assigned_sewing_line != scanner.production_line:
        from rest_framework import serializers

        raise serializers.ValidationError(
            {"bundle": "Bundle not assigned to this sewing line"}
        )


@transaction.atomic
def process_part_receive_scan(tracking_code: str, user: "User") -> Dict[str, any]:
    """Process part receive scan."""
    # Validate user and scanner
    scanner = _validate_user_scanner(user)

    # Validate tracking code and get bundle
    bundle = _validate_bundle_tracking_code(tracking_code)

    # Validate bundle can be processed
    _validate_bundle_for_part_receive(bundle, scanner)

    # Get part from bundle
    part = bundle.part

    # Use the bundle's full quantity
    quantity = bundle.garment_quantity

    # Get or create inventory
    inventory, created = PartInventory.objects.get_or_create(
        production_line=scanner.production_line,
        order=bundle.order,
        part=part,
        defaults={"total_quantity": 0, "issued_quantity": 0},
    )

    # Validate FIFO sequence (non-blocking)
    fifo_result = validate_bundle_fifo_sequence(bundle)

    # Update bundle status to completed and set completion time
    bundle.status = BundleStatus.COMPLETED
    bundle.completed_at = timezone.now()
    bundle.save()

    # Update FIFO violation flags
    update_bundle_fifo_flags(bundle, fifo_result)

    # Update inventory
    inventory.total_quantity += quantity
    inventory.save()

    # Create scan record
    scan = Scan.objects.create(
        bundle=bundle,
        scanner=scanner,
        event_type=ScanEventType.BUNDLE_COMPLETED,
    )

    # Calculate processing time
    processing_time_minutes = None
    if bundle.issued_at and bundle.completed_at:
        processing_time_delta = bundle.completed_at - bundle.issued_at
        processing_time_minutes = round(processing_time_delta.total_seconds() / 60, 1)

    return {
        "success": True,
        "message": f"Bundle completed: {part.name} x {quantity}",
        "bundle_id": bundle.id,
        "part": part.name,
        "quantity_completed": quantity,
        "total_inventory": inventory.total_quantity,
        "processing_time_minutes": processing_time_minutes,
        "scan_id": scan.id,
        "fifo_compliance": {
            "is_compliant": fifo_result["fifo_compliant"],
            "warnings": fifo_result["warnings"],
            "violation_count": len(fifo_result["earlier_incomplete_bundles"]),
            "details": fifo_result["violation_context"]
            if not fifo_result["fifo_compliant"]
            else None,
        },
    }


def get_part_receive_info(
    user: "User",
    limit: int = 50,
    order_id: int = None,
    tracking_code: str = None,
    date_from: str = None,
    date_to: str = None,
    part_id: int = None,
) -> Dict[str, any]:
    """Get recent part receive scans and current inventory info for user's scanner."""
    # Validate user and scanner
    scanner = _validate_user_scanner(user)

    # Get recent scan history
    scan_queryset = (
        Scan.objects.filter(
            scanner=scanner,
            event_type=ScanEventType.BUNDLE_COMPLETED,
        )
        .select_related(
            "bundle__part",
            "bundle__order__style__season",
            "bundle__order__size",
            "bundle__order__color",
            "bundle__assigned_sewing_line",
        )
        .order_by("-created_at")
    )

    # Keep only scans belonging to what the line is currently running, so the
    # history list matches the inventory list below (and the daily production
    # report). Visible = active style ∪ older styles still pending transition,
    # minus anything hidden (manual completion / full output) or past its
    # delivery date.
    from tracking.services.line_visibility import get_visible_order_ids_for_line

    visible_order_ids = get_visible_order_ids_for_line(scanner.production_line)
    scan_queryset = scan_queryset.filter(bundle__order_id__in=visible_order_ids)

    # Filter by order if specified
    if order_id:
        scan_queryset = scan_queryset.filter(bundle__order_id=order_id)

    # Filter by part if specified
    if part_id:
        scan_queryset = scan_queryset.filter(bundle__part_id=part_id)

    # Filter by tracking code if specified
    if tracking_code:
        scan_queryset = scan_queryset.filter(
            bundle__tracking_code__icontains=tracking_code
        )

    # Apply date filters if specified
    if date_from:
        scan_queryset = scan_queryset.filter(created_at__gte=date_from)
    if date_to:
        scan_queryset = scan_queryset.filter(created_at__lte=date_to)

    # Apply limit
    scans = list(scan_queryset[:limit])

    # Convert scans to serializable format
    scan_data = []
    for scan in scans:
        scan_info = {
            "id": scan.id,
            "created_at": scan.created_at,
            "event_type": scan.event_type,
            "bundle": {
                "id": scan.bundle.id,
                "tracking_code": scan.bundle.tracking_code,
                "part": scan.bundle.part.id,
                "part_name": scan.bundle.part.name,
                "garment_quantity": scan.bundle.garment_quantity,
                "order": {
                    "id": scan.bundle.order.id,
                    "order_number": scan.bundle.order.order_number,
                    "style": scan.bundle.order.style.name,
                    "size": scan.bundle.order.size.name,
                    "color": scan.bundle.order.color.name,
                },
            },
        }
        scan_data.append(scan_info)

    # Get current inventory information
    inventory_info = _get_current_inventory_info(
        scanner, order_id, tracking_code, limit, part_id
    )

    return {
        "scanner_info": {
            "scanner_type": scanner.scanner_type,
            "scanner_name": scanner.name,
            "scanner_production_line": scanner.production_line.name,
        },
        "count": len(scan_data),
        "recent_scans": scan_data,
        "inventory_items": inventory_info["inventory_items"],
        "inventory_count": inventory_info["items_count"],
    }


def _get_current_inventory_info(
    scanner: "Scanner",
    order_id: int = None,
    tracking_code: str = None,
    limit: int = 50,
    part_id: int = None,
) -> Dict[str, any]:
    """Get current inventory information for all parts in this production line."""
    # Base queryset for inventories on this production line
    inventory_queryset = (
        PartInventory.objects.filter(production_line=scanner.production_line)
        .select_related(
            "order__style__season",
            "order__size",
            "order__color",
            "part",
        )
        .order_by("order__id", "part__name")
    )

    # Show only what this line is currently running. PartInventory rows are
    # cumulative state with no date bound, so merely excluding the hide-set
    # (manual completion ∪ fully-output) left every never-completed historical
    # order on the list forever. Ask for the positive set instead: the line's
    # active style ∪ older styles still pending transition, minus hidden, minus
    # delivery-expired — the same visibility rule the daily production report
    # applies (the delivery gate is what actually bounds the list; pending
    # transition alone almost never closes out).
    from tracking.services.line_visibility import get_visible_order_ids_for_line

    visible_order_ids = get_visible_order_ids_for_line(scanner.production_line)
    inventory_queryset = inventory_queryset.filter(order_id__in=visible_order_ids)

    # Filter by order if specified
    if order_id:
        inventory_queryset = inventory_queryset.filter(order_id=order_id)

    # Filter by part if specified
    if part_id:
        inventory_queryset = inventory_queryset.filter(part_id=part_id)

    # Filter by tracking code if specified (search in related bundles)
    if tracking_code:
        inventory_queryset = inventory_queryset.filter(
            order__bundles__tracking_code__icontains=tracking_code
        ).distinct()

    # Apply limit
    inventories = list(inventory_queryset[:limit])

    # Create list of inventory items
    inventory_items = []

    for inventory in inventories:
        item = {
            "order_id": inventory.order.id,
            "order_number": inventory.order.order_number,
            "style": inventory.order.style.name,
            "season": inventory.order.style.season.name,
            "size": inventory.order.size.name,
            "color": inventory.order.color.name,
            "part": inventory.part.name,
            # Planned order quantity (uniform across all parts of an order).
            # total_quantity is cumulative parts *received so far*, which differs
            # per part until every bundle is received — order_quantity gives the
            # consistent target used for the "Total" display.
            "order_quantity": inventory.order.quantity,
            "total_quantity": inventory.total_quantity,
            "issued_quantity": inventory.issued_quantity,
            "available_quantity": inventory.total_quantity - inventory.issued_quantity,
        }

        inventory_items.append(item)

    return {
        "inventory_items": inventory_items,
        "items_count": len(inventory_items),
    }
