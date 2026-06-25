from typing import Dict, Optional, TYPE_CHECKING
from datetime import date as date_cls

from django.db.models import Sum
from django.utils import timezone

from tracking.models import Scan
from tracking.models.constants import ScannerType, ScanEventType

if TYPE_CHECKING:
    from accounts.models import User
    from tracking.models import Scanner, Order


def _validate_user_scanner(user: "User") -> "Scanner":
    """Validate user has an assigned assembly tracking scanner."""
    if not user.assigned_scanner:
        raise ValueError("User has no assigned scanner")

    if user.assigned_scanner.scanner_type != ScannerType.ASSEMBLY_TRACKING:
        raise ValueError("Scanner is not an assembly tracking scanner")

    return user.assigned_scanner


def _format_time(dt) -> str:
    """Format a datetime as local 12-hour time, e.g. '02:34 PM'."""
    return timezone.localtime(dt).strftime("%I:%M %p")


def _resolve_active_order(
    garment_issue_qs, part_receive_qs
) -> Optional["Order"]:
    """Determine the active order = the most recently scanned order today.

    Prefers the latest garment-issue scan; falls back to the latest
    part-receive scan when no garment has been issued yet today.
    """
    latest_issue = garment_issue_qs.select_related(
        "garment__order__style"
    ).first()
    if latest_issue and latest_issue.garment and latest_issue.garment.order_id:
        return latest_issue.garment.order

    latest_receive = part_receive_qs.select_related("bundle__order__style").first()
    if latest_receive and latest_receive.bundle and latest_receive.bundle.order_id:
        return latest_receive.bundle.order

    return None


def get_assembly_daily_summary(
    user: "User",
    summary_date: Optional[date_cls] = None,
) -> Dict[str, any]:
    """Build today's assembly summary for the user's line.

    - total_assemble / recent_garments come from GARMENT_ISSUED_FOR_ASSEMBLY
      scans on this line for the given date (line-wide, all orders).
    - parts_summary is scoped to the active order's style parts, where each
      part's `issued_today` is the quantity received (BUNDLE_COMPLETED scans)
      on this line for that part and order on the given date.
    """
    scanner = _validate_user_scanner(user)
    line = scanner.production_line

    if summary_date is None:
        summary_date = timezone.localdate()

    # Styles hidden in the Daily Production Report (manual completion OR fully
    # output) are hidden from the assembly summary too, via the shared
    # line-visibility source of truth.
    from tracking.services.line_visibility import get_hidden_order_ids_for_line

    completed_order_ids = list(get_hidden_order_ids_for_line(line, as_of_date=summary_date))

    # --- Garment issues today (line-wide) ---
    garment_issue_qs = (
        Scan.objects.filter(
            scanner=scanner,
            event_type=ScanEventType.GARMENT_ISSUED_FOR_ASSEMBLY,
            created_at__date=summary_date,
        )
        .exclude(garment__order_id__in=completed_order_ids)
        .order_by("-created_at")
    )

    total_assemble = garment_issue_qs.count()

    recent_garments = [
        {
            "id": scan.garment.tracking_code,
            "time": _format_time(scan.created_at),
        }
        for scan in garment_issue_qs.select_related("garment")[:3]
        if scan.garment
    ]

    # --- Part receives today (line-wide queryset, narrowed per active order) ---
    part_receive_qs = (
        Scan.objects.filter(
            scanner=scanner,
            event_type=ScanEventType.BUNDLE_COMPLETED,
            created_at__date=summary_date,
        )
        .exclude(bundle__order_id__in=completed_order_ids)
        .order_by("-created_at")
    )

    active_order = _resolve_active_order(garment_issue_qs, part_receive_qs)

    parts_summary = []
    total_parts_issued = 0
    parts_issued_count = 0
    parts_total_count = 0

    if active_order is not None:
        # Quantity received today per part, for the active order, on this line.
        received_by_part = dict(
            part_receive_qs.filter(bundle__order=active_order)
            .values_list("bundle__part__name")
            .annotate(qty=Sum("bundle__garment_quantity"))
        )

        style_parts = active_order.style.parts.order_by("name")
        parts_total_count = style_parts.count()

        for part in style_parts:
            issued_today = int(received_by_part.get(part.name, 0) or 0)
            parts_summary.append(
                {"part_name": part.name, "issued_today": issued_today}
            )
            total_parts_issued += issued_today
            if issued_today > 0:
                parts_issued_count += 1

    return {
        "line": line.name,
        "date": summary_date.isoformat(),
        "total_assemble": total_assemble,
        "parts_summary": parts_summary,
        "total_parts_issued": total_parts_issued,
        "parts_issued_count": parts_issued_count,
        "parts_total_count": parts_total_count,
        "recent_garments": recent_garments,
    }
