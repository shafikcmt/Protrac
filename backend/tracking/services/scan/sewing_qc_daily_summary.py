from typing import Dict, Optional, TYPE_CHECKING
from datetime import date as date_cls

from django.db.models import Count, Q
from django.utils import timezone

from tracking.models import QualityCheck, Garment, Scan
from tracking.models.constants import (
    ScannerType,
    QualityCheckStatus,
    QualityCheckCheckpoint,
    GarmentStatus,
    ScanEventType,
)

if TYPE_CHECKING:
    from accounts.models import User
    from tracking.models import Scanner, Order


def _validate_user_scanner(user: "User") -> "Scanner":
    """Validate user has an assigned sewing QC scanner."""
    if not user.assigned_scanner:
        raise ValueError("User has no assigned scanner")

    if user.assigned_scanner.scanner_type != ScannerType.SEWING_QC_CHECK:
        raise ValueError("Scanner is not a sewing QC scanner")

    return user.assigned_scanner


def _build_sewing_qc_grid(order: "Order", line, summary_date) -> list:
    """Build one order's sewing-QC serial-status grid (per garment on this line).

    Persistence differs per status so the grid reflects outstanding vs done work:
      * Pending (issued_for_assembly, not yet QC'd) -> carried forward until QC'd
      * Rework/Fail                                 -> carried forward until re-scanned
      * Pass                                        -> TODAY ONLY (a garment that
        passed on an earlier day has aged out of "today's pass list" and drops off
        the grid; assembly_completed_at is the exact pass timestamp).
    Fail and Rework merge into one "rework" visual bucket (no separate Fail cell).
    """
    grid_garments = (
        order.garments.filter(sewing_line=line)
        .filter(
            Q(
                status__in=[
                    GarmentStatus.ISSUED_FOR_ASSEMBLY,
                    GarmentStatus.SEWING_QC_FAIL,
                    GarmentStatus.SEWING_QC_REWORK,
                ]
            )
            | Q(
                status=GarmentStatus.SEWING_QC_PASS,
                assembly_completed_at__date=summary_date,
            )
        )
        .order_by("sequence_number")
    )

    def _cell_status(status: str) -> str:
        if status == GarmentStatus.SEWING_QC_PASS:
            return "sewing_qc_pass"
        if status == GarmentStatus.ISSUED_FOR_ASSEMBLY:
            return "issued_for_assembly"
        return "sewing_qc_rework"  # SEWING_QC_FAIL or SEWING_QC_REWORK

    return [
        {
            "sequence_number": g.sequence_number,
            "tracking_code": g.tracking_code,
            "status": _cell_status(g.status),
        }
        for g in grid_garments
    ]


def _resolve_sewing_qc_active_orders(
    scanner, line, summary_date, exclude_order_ids
) -> list:
    """All orders with any sewing-QC scan today on this line, newest-activity first.

    The same style can have several sizes (each a distinct Order, unique by
    order_number+size+color) running sewing-QC the same day; every one should
    surface, size-wise. Mirrors the assembly summary's `order_groups` resolution
    but keyed on this line's SEWING_QUALITY_CHECK scans. Hidden/completed orders
    are excluded. Returns a list of ``(Order, last_activity_at)`` sorted by last
    activity DESC (most recently active order on top).
    """
    from django.db.models import Max
    from tracking.models import Order

    scans = Scan.objects.filter(
        scanner=scanner,
        event_type=ScanEventType.SEWING_QUALITY_CHECK,
        created_at__date=summary_date,
        garment__sewing_line=line,
    ).exclude(garment__order_id__in=exclude_order_ids)

    activity: Dict[int, object] = {}  # order_id -> latest scan time today
    for oid, last in scans.values_list("garment__order_id").annotate(
        last=Max("created_at")
    ):
        if oid is None:
            continue
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


def get_sewing_qc_daily_summary(
    user: "User",
    summary_date: Optional[date_cls] = None,
) -> Dict[str, any]:
    """Build today's sewing-QC tally for the scanner's line.

    Mirrors the factory's paper QC register: total pass (output), rework, fail,
    total defects, DHU%, and a defect-frequency breakdown ("Top Defects"). All
    figures are scoped to the QC scanner's production line and the given date via
    the QualityCheck.created_at local date, the same day scoping used across the
    other scan summaries.
    """
    scanner = _validate_user_scanner(user)
    line = scanner.production_line

    if summary_date is None:
        summary_date = timezone.localdate()

    # Every SEWING-QC record made today for garments produced on this line. A
    # garment re-evaluated today (failed then re-scanned to pass) contributes one
    # record per scan, so a fail and its later pass are both counted — exactly how
    # the register tracks a defect that was later resolved.
    #
    # `checkpoint=SEWING_QC` is essential: a garment keeps its sewing_line forever,
    # so once it later reaches finishing QC it grows a *second* QualityCheck on the
    # same garment. Without this filter those finishing-QC records would leak into
    # this sewing-QC card, double-counting output/rework/pass-rate/DHU/defects and
    # the hourly Actual.
    qc_today = QualityCheck.objects.filter(
        garment__sewing_line=line,
        checkpoint=QualityCheckCheckpoint.SEWING_QC,
        created_at__date=summary_date,
    )

    status_counts = dict(
        qc_today.values_list("status").order_by().annotate(n=Count("id"))
    )
    total_output = status_counts.get(QualityCheckStatus.PASS, 0)
    total_rework = status_counts.get(QualityCheckStatus.REWORK, 0)
    total_fail = status_counts.get(QualityCheckStatus.FAIL, 0)

    # Pass rate = passes / all QC checks today. A QC-quality health metric that
    # needs no LineTarget/SMV data (true SMV efficiency isn't available here —
    # no per-day targets or style SMV are captured yet), so it always renders.
    total_checks = total_output + total_rework + total_fail
    pass_rate = round(total_output / total_checks * 100, 2) if total_checks else 0.0

    # DHU (Defects per Hundred Units) = total defect tags / distinct garments
    # inspected today * 100. Inspected counts distinct garments so a re-evaluated
    # garment is a single inspected unit even though it was scanned twice.
    total_defects = qc_today.aggregate(n=Count("defects"))["n"] or 0
    # Inspected is its own garment-level query (not derived from qc_today), so it
    # needs the same SEWING_QC scope — otherwise a garment whose only check today
    # was finishing QC would still count as "inspected" and deflate DHU.
    total_inspected = (
        Garment.objects.filter(
            sewing_line=line,
            quality_checks__checkpoint=QualityCheckCheckpoint.SEWING_QC,
            quality_checks__created_at__date=summary_date,
        )
        .distinct()
        .count()
    )
    dhu = round(total_defects / total_inspected * 100, 2) if total_inspected else 0.0

    # Defect-frequency: how many times each defect code was tagged today,
    # most-frequent first (the register's "Top Defects").
    top_defects = [
        {
            "code": row["defects__code"] or "",
            "name": row["defects__name"],
            "count": row["n"],
        }
        for row in (
            qc_today.filter(defects__isnull=False)
            .values("defects__code", "defects__name")
            .order_by()
            .annotate(n=Count("defects"))
            .order_by("-n", "defects__code")
        )
    ]

    # --- Every order active TODAY (size-wise), most recent activity first ---
    # One serial-status grid per order so multiple sizes of the same style all
    # show, newest-active on top. Hidden/completed orders (Daily Production Report
    # visibility) are excluded from the groups; the line-wide tallies above are
    # left untouched. active_order + the flat garments_grid mirror order_groups[0]
    # for backward compatibility with the single-order shape.
    from tracking.services.line_visibility import (
        get_inactive_order_ids_for_line,
        get_style_overlap_alert,
    )

    completed_order_ids = list(
        get_inactive_order_ids_for_line(line, as_of_date=summary_date)
    )
    active_orders = _resolve_sewing_qc_active_orders(
        scanner, line, summary_date, completed_order_ids
    )

    # Overlap alert: a newer style was issued on this line while older-style
    # orders are still in progress. Those older orders are NO LONGER auto-hidden
    # (they stay in the groups above); we just flag the overlap so the operator/
    # admin can Mark Complete when the old run is truly finished. None when there
    # is no overlap.
    style_overlap_alert = get_style_overlap_alert(line, as_of_date=summary_date)

    order_groups = [
        {
            "order_number": order.order_number,
            "style": order.style.name,
            "size": order.size.name,
            "last_activity_at": last_activity.isoformat(),
            "garments_grid": _build_sewing_qc_grid(order, line, summary_date),
        }
        for order, last_activity in active_orders
    ]

    active_order = active_orders[0][0] if active_orders else None
    active_order_info = None
    garments_grid = []
    if active_order is not None:
        active_order_info = {
            "order_number": active_order.order_number,
            "style": active_order.style.name,
        }
        garments_grid = order_groups[0]["garments_grid"]

    # --- Hourly Target vs Actual (QC pass per hour) ---
    # Actual = sewing-QC PASS records bucketed by hour with the shared shift anchor
    # (so H1..Hn line up with every other hourly table). Line-wide, matching the
    # "Total Output" tile above (sum of the Actual column == total_output, minus
    # any passes recorded outside the shift window, which bucket to nothing — the
    # same clipping every hourly table applies). With no LineTarget the grid falls
    # back to a default 8 hours (H1..H8) with a per-hour target of 0; actuals are
    # still filled from real scans. Mirrors the assembly-tracking hourly card.
    from tracking.services import hourly_buckets as hb

    line_target = hb.get_line_target(line, summary_date)
    hour_count = hb.hour_count_for(line_target)  # 8 when no target
    target_per_hour = hb.per_hour_target(line_target)  # 0 when no target

    pass_counts = hb.bucket_timestamps(
        qc_today.filter(status=QualityCheckStatus.PASS).values_list(
            "created_at", flat=True
        ),
        line,
        summary_date,
        line_target=line_target,
    )

    hourly = [
        {
            "hour": h + 1,
            "target": target_per_hour,
            "actual": pass_counts[h],
        }
        for h in range(hour_count)
    ]

    return {
        "line": line.name,
        "date": summary_date.isoformat(),
        "total_output": total_output,
        "total_rework": total_rework,
        "total_fail": total_fail,
        "pass_rate": pass_rate,
        "total_inspected": total_inspected,
        "total_defects": total_defects,
        "dhu": dhu,
        "top_defects": top_defects,
        "active_order": active_order_info,
        "garments_grid": garments_grid,
        "order_groups": order_groups,
        "hourly": hourly,
        "style_overlap_alert": style_overlap_alert,
    }
