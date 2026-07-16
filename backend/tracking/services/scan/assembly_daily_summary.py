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


def _build_garments_grid(order: "Order", summary_date: date_cls) -> list:
    """Build one order's per-day serial worklist (pending + issued-today).

    A fresh-each-day view: garments still pending (never issued) plus garments
    issued for assembly *today* (issued ones stay visible all day). Garments
    issued on a PREVIOUS day drop off, so each day starts clean without a manual
    reset. `issued_for_assembly_at` is the source of truth (raw `status` can't be
    used — it advances past assembly to sewing/finishing QC).
    """
    from django.db.models import Q

    today_garments = order.garments.filter(
        Q(issued_for_assembly_at__isnull=True)
        | Q(issued_for_assembly_at__date=summary_date)
    ).order_by("sequence_number")

    return [
        {
            "sequence_number": g.sequence_number,
            "tracking_code": g.tracking_code,
            "status": (
                "issued_for_assembly"
                if g.issued_for_assembly_at is not None
                else "pending_assembly"
            ),
        }
        for g in today_garments
    ]


def _resolve_active_orders(garment_issue_qs, part_receive_qs) -> list:
    """All orders with any issue/receive scan today, newest-activity first.

    The same style can have several sizes (each a distinct Order, since Order is
    unique by order_number+size+color) actively assembling on the same day; every
    one of them should surface, size-wise. Returns a list of
    ``(Order, last_activity_at)`` sorted by last activity DESC (most recently
    active order on top). Both querysets already exclude hidden/completed orders,
    so nothing extra is needed to keep those out.
    """
    from django.db.models import Max
    from tracking.models import Order

    activity: Dict[int, object] = {}  # order_id -> latest created_at today
    issue_activity = garment_issue_qs.values_list("garment__order_id").annotate(
        last=Max("created_at")
    )
    receive_activity = part_receive_qs.values_list("bundle__order_id").annotate(
        last=Max("created_at")
    )
    for oid, last in list(issue_activity) + list(receive_activity):
        if oid is None:
            continue
        if oid not in activity or last > activity[oid]:
            activity[oid] = last

    orders = Order.objects.filter(id__in=activity.keys()).select_related(
        "style", "size"
    )
    order_by_id = {o.id: o for o in orders}
    ordered_ids = sorted(activity, key=lambda oid: activity[oid], reverse=True)
    return [
        (order_by_id[oid], activity[oid])
        for oid in ordered_ids
        if oid in order_by_id
    ]


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

    # Only currently ACTIVE styles count here. Inactive = hidden (manual / fully
    # output) ∪ superseded by a newer style on the line ∪ delivery expired, via
    # the shared line-visibility source of truth for secondary scan surfaces.
    from tracking.services.line_visibility import get_inactive_order_ids_for_line

    completed_order_ids = list(
        get_inactive_order_ids_for_line(line, as_of_date=summary_date)
    )

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

    # --- Every order active TODAY (size-wise), most recent activity first ---
    # One serial grid per order so multiple sizes of the same style all show,
    # newest-active on top. Each group's grid is the same per-day worklist
    # (pending + issued-today) as before, just scoped to that specific order.
    active_orders = _resolve_active_orders(garment_issue_qs, part_receive_qs)

    order_groups = [
        {
            "order_number": order.order_number,
            "style": order.style.name,
            "size": order.size.name,
            "last_activity_at": last_activity.isoformat(),
            "garments_grid": _build_garments_grid(order, summary_date),
        }
        for order, last_activity in active_orders
    ]

    # Backward compat: `active_order` = the most-recently active order, and the
    # flat `garments_grid` = that same order's grid, so existing consumers/tests
    # relying on the single-order shape keep working. The per-order breakdown
    # lives in `order_groups`. `active_order` (the Order object) also still drives
    # the parts_summary block below.
    active_order = active_orders[0][0] if active_orders else None
    active_order_info = None
    garments_grid = []
    if active_order is not None:
        active_order_info = {
            "order_number": active_order.order_number,
            "style": active_order.style.name,
        }
        garments_grid = order_groups[0]["garments_grid"]

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

    # --- Hourly: bundles received vs garments assembly-complete ---
    # Buckets use the exact same shift anchor + break-skip rule as the sewing v3
    # dashboard (via hourly_buckets, which reuses that logic), so H1..Hn line up
    # across surfaces. Both querysets already exclude hidden/completed orders.
    from tracking.services import hourly_buckets as hb

    # A line with no daily target for the date has no configured shift/hour grid,
    # so fall back to a default 8-hour view (H1..H8) with a per-hour target of 0.
    # Actuals are still bucketed from real scans using the shared shift anchor, so
    # the operator sees today's bundles/assembly even before a target is set. When
    # a target IS configured, hour_count and the per-hour target come from it
    # exactly as before. (hour_count_for / per_hour_target / bucket_timestamps all
    # accept line_target=None.)
    line_target = hb.get_line_target(line, summary_date)
    hour_count = hb.hour_count_for(line_target)  # 8 when no target
    target_per_hour = hb.per_hour_target(line_target)  # 0 when no target

    bundle_counts = hb.bucket_timestamps(
        part_receive_qs.values_list("created_at", flat=True),
        line,
        summary_date,
        line_target=line_target,
    )
    assembly_counts = hb.bucket_timestamps(
        garment_issue_qs.values_list("created_at", flat=True),
        line,
        summary_date,
        line_target=line_target,
    )

    hourly = [
        {
            "hour": h + 1,
            "target": target_per_hour,
            "bundles_received": bundle_counts[h],
            "assembly_complete": assembly_counts[h],
        }
        for h in range(hour_count)
    ]

    return {
        "line": line.name,
        "date": summary_date.isoformat(),
        "total_assemble": total_assemble,
        "parts_summary": parts_summary,
        "total_parts_issued": total_parts_issued,
        "parts_issued_count": parts_issued_count,
        "parts_total_count": parts_total_count,
        "recent_garments": recent_garments,
        "active_order": active_order_info,
        "garments_grid": garments_grid,
        "order_groups": order_groups,
        "hourly": hourly,
    }
