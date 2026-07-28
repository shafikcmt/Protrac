from typing import Dict, List, Optional, TYPE_CHECKING
from datetime import date as date_cls, datetime, timezone as dt_timezone

from django.db.models import Count, Max, Q
from django.utils import timezone

from tracking.models import QualityCheck, Garment, Scan, Order
from tracking.models.constants import (
    ScannerType,
    QualityCheckStatus,
    QualityCheckCheckpoint,
    GarmentStatus,
    ScanEventType,
)

if TYPE_CHECKING:
    from accounts.models import User
    from tracking.models import Scanner

# Every garment that has passed sewing QC and so entered the finishing pipeline —
# whether still awaiting finishing (SEWING_QC_PASS) or already finishing-QC'd. The
# same set the finishing dashboard uses. Finishing is NOT tied to a specific line
# per order, so orders/serials are scoped by this status set, not by finishing_line.
FINISHING_PIPELINE_STATUSES = [
    GarmentStatus.SEWING_QC_PASS,
    GarmentStatus.FINISHING_QC_PASS,
    GarmentStatus.FINISHING_QC_FAIL,
    GarmentStatus.FINISHING_QC_REWORK,
]

# Sort sentinel for orders that have no finishing-QC scan yet (all serials still
# pending): they sort after any order with real finishing activity.
_EPOCH = datetime(1970, 1, 1, tzinfo=dt_timezone.utc)


def _validate_user_scanner(user: "User") -> "Scanner":
    """Validate the user has an assigned finishing-QC scanner."""
    if not user.assigned_scanner:
        raise ValueError("User has no assigned scanner")

    if user.assigned_scanner.scanner_type != ScannerType.FINISHING_QC_CHECK:
        raise ValueError("Scanner is not a finishing QC scanner")

    return user.assigned_scanner


def _sewing_cell_status(status: str) -> str:
    """Collapse a QualityCheck sewing status into the two-colour cell language.

    Fail and Rework merge into one "rework" bucket, mirroring the sewing-QC grid.
    """
    if status == QualityCheckStatus.PASS:
        return "sewing_qc_pass"
    return "sewing_qc_rework"  # FAIL or REWORK


def _finishing_cell_status(status: str) -> str:
    """Collapse a QualityCheck finishing status into the cell language.

    Fail and Rework merge into one "rework" bucket. Callers use "pending" when a
    garment has no finishing-QC record yet (passed sewing, awaiting finishing).
    """
    if status == QualityCheckStatus.PASS:
        return "finishing_qc_pass"
    return "finishing_qc_rework"  # FAIL or REWORK


def _latest_status_by_checkpoint(garment: Garment) -> Dict[str, object]:
    """Latest sewing- and finishing-QC status (+ finishing timestamp) from a
    garment's prefetched checks.

    Returns ``{"sewing": <status|None>, "finishing": <status|None>,
    "finishing_at": <datetime|None>}`` reading the most-recent QualityCheck per
    checkpoint. ``finishing_at`` is the timestamp of that latest finishing record
    (used to group serials day-wise). Uses the prefetched ``quality_checks`` (no
    extra query per garment).
    """
    latest: Dict[str, object] = {"sewing": None, "finishing": None}
    latest_at: Dict[str, object] = {"sewing": None, "finishing": None}
    for qc in garment.quality_checks.all():
        if qc.checkpoint == QualityCheckCheckpoint.SEWING_QC:
            key = "sewing"
        elif qc.checkpoint == QualityCheckCheckpoint.FINISHING_QC:
            key = "finishing"
        else:
            continue
        if latest_at[key] is None or qc.created_at > latest_at[key]:
            latest_at[key] = qc.created_at
            latest[key] = qc.status
    return {
        "sewing": latest["sewing"],
        "finishing": latest["finishing"],
        "finishing_at": latest_at["finishing"],
    }


def _build_finishing_qc_grid(order: "Order") -> list:
    """Build one order's finishing-QC comparison grid (dual sewing/finishing cell).

    Each cell carries BOTH the garment's latest sewing-QC status and its latest
    finishing-QC status so a serial that passed sewing but is still awaiting (or
    failed) finishing is obvious at a glance:
      * finishing_status = "finishing_qc_pending" -> passed sewing, no finishing
        record yet;
      * finishing_status = pass / rework           -> an actual finishing result
        (fail merged into rework).

    Membership = every garment of the order in the finishing pipeline (passed
    sewing), regardless of finishing line — finishing is not line-scoped per
    order. Serials persist in the grid until the whole order is hidden (see the
    hide rule), so completed serials keep showing their result.
    """
    grid_garments = (
        order.garments.filter(status__in=FINISHING_PIPELINE_STATUSES)
        .prefetch_related("quality_checks")
        .order_by("sequence_number")
    )

    cells = []
    for g in grid_garments:
        latest = _latest_status_by_checkpoint(g)
        # A garment in the finishing pipeline has passed sewing; fall back to
        # "pass" when (unexpectedly) no sewing record is present.
        sewing_status = (
            _sewing_cell_status(latest["sewing"])
            if latest["sewing"] is not None
            else "sewing_qc_pass"
        )
        finishing_status = (
            _finishing_cell_status(latest["finishing"])
            if latest["finishing"] is not None
            else "finishing_qc_pending"
        )
        # Local (project-tz) date of the latest finishing-QC record, used to group
        # serials day-wise on the card. Null for a serial still pending finishing.
        finishing_at = latest["finishing_at"]
        finishing_checked_date = (
            timezone.localtime(finishing_at).date().isoformat()
            if finishing_at is not None
            else None
        )
        cells.append(
            {
                "sequence_number": g.sequence_number,
                "tracking_code": g.tracking_code,
                "sewing_status": sewing_status,
                "finishing_status": finishing_status,
                "finishing_checked_date": finishing_checked_date,
            }
        )
    return cells


def _resolve_finishing_qc_active_orders(summary_date) -> list:
    """Every order in the finishing pipeline that isn't hidden, newest-activity first.

    Finishing is not tied to a specific line per order, so — unlike the sewing-QC
    card — orders are NOT scoped by production line. An order shows once it has at
    least one garment that passed sewing QC, and keeps showing until it is hidden:

      * delivery-date expired: ``delivery_date`` set and ``<= summary_date`` (a
        null delivery date is still active — the same Condition-3 rule the heatmap
        surfaces use); OR
      * fully finished: every sewing-passed serial has also passed finishing QC
        (``finishing_pass == sewing_passed`` with ``sewing_passed > 0``), i.e.
        Input == Sewing-QC Pass == Finishing-QC Pass.

    Returns a list of ``(Order, last_activity_at | None)`` sorted by the order's
    most recent finishing-QC scan DESC; orders with no finishing scan yet (all
    serials pending) sort last, by id DESC.
    """
    # Orders with >=1 sewing-passed garment (the finishing pipeline).
    pipeline = Garment.objects.filter(status__in=FINISHING_PIPELINE_STATUSES)
    order_ids = list(pipeline.values_list("order_id", flat=True).distinct())
    if not order_ids:
        return []

    # Per-order pipeline vs finishing-pass counts for the fully-finished rule.
    counts: Dict[int, Dict[str, int]] = {}
    for row in (
        pipeline.filter(order_id__in=order_ids)
        .values("order_id")
        .order_by()
        .annotate(
            sewing_passed=Count("id"),
            finishing_pass=Count(
                "id", filter=Q(status=GarmentStatus.FINISHING_QC_PASS)
            ),
        )
    ):
        counts[row["order_id"]] = {
            "sewing_passed": row["sewing_passed"],
            "finishing_pass": row["finishing_pass"],
        }

    # Most recent finishing-QC scan per order (recency sort key).
    activity: Dict[int, object] = {}
    for oid, last in (
        Scan.objects.filter(
            event_type=ScanEventType.FINISHING_QUALITY_CHECK,
            garment__order_id__in=order_ids,
        )
        .values_list("garment__order_id")
        .annotate(last=Max("created_at"))
    ):
        if oid is not None:
            activity[oid] = last

    orders = Order.objects.filter(id__in=order_ids).select_related("style", "size")

    visible = []
    for order in orders:
        c = counts.get(order.id, {"sewing_passed": 0, "finishing_pass": 0})

        delivery_expired = (
            order.delivery_date is not None and order.delivery_date <= summary_date
        )
        fully_finished = (
            c["sewing_passed"] > 0
            and c["finishing_pass"] == c["sewing_passed"]
        )
        if delivery_expired or fully_finished:
            continue

        visible.append((order, activity.get(order.id)))

    # Recency DESC; orders with no finishing scan yet (None) sort last, id DESC.
    visible.sort(key=lambda pair: (pair[1] or _EPOCH, pair[0].id), reverse=True)
    return visible


def get_finishing_qc_daily_summary(
    user: "User",
    summary_date: Optional[date_cls] = None,
) -> Dict[str, any]:
    """Build today's finishing-QC tally for the scanner's line.

    Two different scopes on purpose:

      * The top tiles (output/rework/fail, pass-rate, DHU%) are the operator's
        daily tally for THEIR finishing line — scoped to ``finishing_line=line``,
        ``checkpoint=FINISHING_QC`` and ``summary_date`` (mirrors the sewing card).
      * The per-order serial grids are scoped factory-wide by the finishing
        pipeline (sewing-passed garments), because finishing is not tied to a
        specific line per order. Each cell shows BOTH the sewing- and
        finishing-QC status of that serial.

    Unlike the sewing card there is no hourly Target-vs-Actual and no Top-Defects.
    """
    scanner = _validate_user_scanner(user)
    line = scanner.production_line

    if summary_date is None:
        summary_date = timezone.localdate()

    # Every FINISHING-QC record made today for garments finished on this line.
    # `checkpoint=FINISHING_QC` is essential: a garment keeps both its sewing- and
    # finishing-QC records, so without the filter the sewing records would leak in
    # and double-count output/rework/pass-rate/DHU.
    qc_today = QualityCheck.objects.filter(
        garment__finishing_line=line,
        checkpoint=QualityCheckCheckpoint.FINISHING_QC,
        created_at__date=summary_date,
    )

    status_counts = dict(
        qc_today.values_list("status").order_by().annotate(n=Count("id"))
    )
    total_output = status_counts.get(QualityCheckStatus.PASS, 0)
    total_rework = status_counts.get(QualityCheckStatus.REWORK, 0)
    total_fail = status_counts.get(QualityCheckStatus.FAIL, 0)

    # Pass rate = passes / all finishing-QC checks today.
    total_checks = total_output + total_rework + total_fail
    pass_rate = round(total_output / total_checks * 100, 2) if total_checks else 0.0

    # DHU (Defects per Hundred Units) = defect tags / distinct garments inspected
    # today at finishing QC * 100.
    total_defects = qc_today.aggregate(n=Count("defects"))["n"] or 0
    total_inspected = (
        Garment.objects.filter(
            finishing_line=line,
            quality_checks__checkpoint=QualityCheckCheckpoint.FINISHING_QC,
            quality_checks__created_at__date=summary_date,
        )
        .distinct()
        .count()
    )
    dhu = round(total_defects / total_inspected * 100, 2) if total_inspected else 0.0

    # --- Serial grids: every order in the finishing pipeline, not line-scoped ---
    # One dual serial-status grid per order (size-wise), newest-active on top,
    # hidden once delivery-expired or fully finished (see resolver).
    active_orders = _resolve_finishing_qc_active_orders(summary_date)

    order_groups = [
        {
            "order_number": order.order_number,
            "style": order.style.name,
            "size": order.size.name,
            "last_activity_at": last_activity.isoformat() if last_activity else "",
            "garments_grid": _build_finishing_qc_grid(order),
        }
        for order, last_activity in active_orders
    ]

    active_order = active_orders[0][0] if active_orders else None
    active_order_info = None
    garments_grid: List[dict] = []
    if active_order is not None:
        active_order_info = {
            "order_number": active_order.order_number,
            "style": active_order.style.name,
        }
        garments_grid = order_groups[0]["garments_grid"]

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
        "active_order": active_order_info,
        "garments_grid": garments_grid,
        "order_groups": order_groups,
    }
