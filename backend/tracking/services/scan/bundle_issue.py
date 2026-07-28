from django.db import transaction, models
from django.utils import timezone
from typing import Dict, TYPE_CHECKING
from tracking.models import Bundle, Scan
from tracking.services.tracking_code import find_item_by_tracking_code
from tracking.services.line_completion import _safely, handle_style_assigned_to_line
from tracking.models.constants import ScannerType, BundleStatus, ScanEventType

if TYPE_CHECKING:
    from accounts.models import User
    from tracking.models import Scanner, ProductionLine


def _validate_user_scanner(user: "User") -> "Scanner":
    """Validate user has assigned scanner of correct type."""
    if not user.assigned_scanner:
        raise ValueError("User has no assigned scanner")

    if user.assigned_scanner.scanner_type != ScannerType.BUNDLE_ISSUE:
        raise ValueError("Scanner is not a bundle issue scanner")

    return user.assigned_scanner


def _validate_tracking_code(tracking_code: str) -> Bundle:
    """Validate tracking code and return bundle."""
    item, item_type = find_item_by_tracking_code(tracking_code)

    if not item:
        raise ValueError(f"Invalid tracking code: {tracking_code}")

    if item_type != "bundle":
        raise ValueError("Can only issue bundle tracking codes")

    return item


def _validate_bundle_for_issue(bundle: Bundle) -> None:
    """Validate that bundle can be issued."""
    if bundle.status != BundleStatus.CREATED:
        raise ValueError(f"Bundle already processed (status: {bundle.status})")


def _issue_bundle_to_sewing_line(bundle: Bundle, sewing_line: "ProductionLine") -> None:
    """Issue bundle to sewing line."""
    bundle.status = BundleStatus.ISSUED_TO_SEWING
    bundle.assigned_sewing_line = sewing_line
    bundle.issued_at = timezone.now()
    bundle.save()


def _create_bundle_issue_scan(bundle: Bundle, scanner: "Scanner", user: "User") -> Scan:
    """Create scan record for bundle issue."""
    return Scan.objects.create(
        bundle=bundle,
        scanner=scanner,
        event_type=ScanEventType.BUNDLE_ISSUED_TO_SEWING,
    )


@transaction.atomic
def process_bundle_issue_scan(
    tracking_code: str, sewing_line: "ProductionLine", user: "User"
) -> Dict[str, any]:
    """
    Process bundle issue scan with all validation.

    Args:
        tracking_code: Bundle tracking code to issue
        sewing_line: Destination sewing line
        user: User performing the scan

    Returns:
        Dict with scan result information

    Raises:
        ValueError: If validation fails
    """
    # Validate user and scanner
    scanner = _validate_user_scanner(user)

    # Validate tracking code and get bundle
    bundle = _validate_tracking_code(tracking_code)

    # Validate bundle can be issued
    _validate_bundle_for_issue(bundle)

    # Issue bundle to specified sewing line
    _issue_bundle_to_sewing_line(bundle, sewing_line)

    # This is the auto-hide trigger: the bundle's style is now the line's active
    # style, so any *other* style on the line that is fully output is finished and
    # gets an AUTO completion. Must run after the save above, which is what makes
    # the new style active. Best-effort — never fail an operator's scan over
    # bookkeeping.
    _safely(
        handle_style_assigned_to_line,
        sewing_line,
        getattr(bundle.order, "style_id", None),
    )

    # Create scan record
    scan = _create_bundle_issue_scan(bundle, scanner, user)

    return {
        "success": True,
        "message": f"Bundle issued to {sewing_line.name}",
        "bundle_id": bundle.id,
        "bundle_tracking_code": bundle.tracking_code,
        "assigned_sewing_line": sewing_line.name,
        "scan_id": scan.id,
    }


def get_bundle_issue_info(
    user: "User",
    limit: int = 50,
    order_id: int = None,
    tracking_code: str = None,
    date_from=None,
    date_to=None,
    mother_only: bool = False,
) -> Dict[str, any]:
    """
    Get bundle issue history for user's scanner with filtering.

    Args:
        user: User whose scanner history to retrieve
        limit: Maximum number of scans to return
        order_id: Filter by specific order
        tracking_code: Search by tracking code
        date_from: Filter scans from this date/time
        date_to: Filter scans until this date/time
        mother_only: Filter to only show mother cut part bundles

    Returns:
        Dict with scanner info and scan history

    Raises:
        ValueError: If validation fails
    """
    # Reuse validation logic
    scanner = _validate_user_scanner(user)

    # Build queryset with filters
    queryset = Scan.objects.filter(
        scanner=scanner,
        event_type=ScanEventType.BUNDLE_ISSUED_TO_SEWING,
        bundle__isnull=False,
    )

    # Apply filters
    if order_id:
        queryset = queryset.filter(bundle__order_id=order_id)

    if tracking_code:
        queryset = queryset.filter(bundle__tracking_code__icontains=tracking_code)

    if date_from:
        queryset = queryset.filter(created_at__gte=date_from)

    if date_to:
        queryset = queryset.filter(created_at__lte=date_to)

    # Filter for mother parts only if requested
    if mother_only:
        queryset = queryset.filter(
            bundle__part__is_mother_part=True,
            bundle__part__style=models.F("bundle__order__style"),
        )

    # Get bundle issue scans with all related data
    scans = queryset.select_related(
        "bundle__part",
        "bundle__order__style__season",
        "bundle__order__size",
        "bundle__order__color",
        "bundle__assigned_sewing_line",
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
