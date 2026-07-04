from typing import Dict, Optional, TYPE_CHECKING
from datetime import date as date_cls

from django.db.models import Count, Q
from django.utils import timezone

from tracking.models import QualityCheck, Garment, Scan
from tracking.models.constants import (
    ScannerType,
    QualityCheckStatus,
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


def _resolve_sewing_qc_active_order(scanner, line, summary_date) -> Optional["Order"]:
    """Active order = the order of the most recent sewing-QC scan today on this line.

    Mirrors the assembly summary's "latest scan today -> order" rule, but keyed on
    this line's own SEWING_QUALITY_CHECK scans instead of the assembly scanner's
    garment-issue/part-receive scans.
    """
    latest = (
        Scan.objects.filter(
            scanner=scanner,
            event_type=ScanEventType.SEWING_QUALITY_CHECK,
            created_at__date=summary_date,
            garment__sewing_line=line,
        )
        .select_related("garment__order__style")
        .order_by("-created_at")
        .first()
    )
    if latest and latest.garment and latest.garment.order_id:
        return latest.garment.order
    return None


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

    # Every QC record made today for garments produced on this line. A garment
    # re-evaluated today (failed then re-scanned to pass) contributes one record
    # per scan, so a fail and its later pass are both counted — exactly how the
    # register tracks a defect that was later resolved.
    qc_today = QualityCheck.objects.filter(
        garment__sewing_line=line,
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
    total_inspected = (
        Garment.objects.filter(
            sewing_line=line,
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

    # --- Active order's serial-status grid ---
    # Persistence differs per status so the grid reflects outstanding vs done work:
    #   * Pending (issued_for_assembly, not yet QC'd) -> carried forward until QC'd
    #   * Rework/Fail                                 -> carried forward until re-scanned
    #   * Pass                                        -> TODAY ONLY. A garment that
    #     passed on an earlier day has aged out of "today's pass list" and drops off
    #     the grid entirely (its status is still sewing_qc_pass, but it's finished — it
    #     is NOT shown as pending, since it is not pending work). assembly_completed_at
    #     is the exact pass timestamp (set only when a garment passes sewing QC), the
    #     direct analog of the assembly grid's issued_for_assembly_at.
    active_order = _resolve_sewing_qc_active_order(scanner, line, summary_date)

    active_order_info = None
    garments_grid = []
    if active_order is not None:
        active_order_info = {
            "order_number": active_order.order_number,
            "style": active_order.style.name,
        }
        grid_garments = (
            active_order.garments.filter(sewing_line=line)
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

        # Fail and Rework merge into one "rework" visual bucket (no separate Fail cell).
        def _cell_status(status: str) -> str:
            if status == GarmentStatus.SEWING_QC_PASS:
                return "sewing_qc_pass"
            if status == GarmentStatus.ISSUED_FOR_ASSEMBLY:
                return "issued_for_assembly"
            return "sewing_qc_rework"  # SEWING_QC_FAIL or SEWING_QC_REWORK

        garments_grid = [
            {
                "sequence_number": g.sequence_number,
                "tracking_code": g.tracking_code,
                "status": _cell_status(g.status),
            }
            for g in grid_garments
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
    }
