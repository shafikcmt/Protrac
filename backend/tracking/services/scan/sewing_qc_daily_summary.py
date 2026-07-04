from typing import Dict, Optional, TYPE_CHECKING
from datetime import date as date_cls

from django.db.models import Count
from django.utils import timezone

from tracking.models import QualityCheck, Garment
from tracking.models.constants import ScannerType, QualityCheckStatus

if TYPE_CHECKING:
    from accounts.models import User
    from tracking.models import Scanner


def _validate_user_scanner(user: "User") -> "Scanner":
    """Validate user has an assigned sewing QC scanner."""
    if not user.assigned_scanner:
        raise ValueError("User has no assigned scanner")

    if user.assigned_scanner.scanner_type != ScannerType.SEWING_QC_CHECK:
        raise ValueError("Scanner is not a sewing QC scanner")

    return user.assigned_scanner


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

    return {
        "line": line.name,
        "date": summary_date.isoformat(),
        "total_output": total_output,
        "total_rework": total_rework,
        "total_fail": total_fail,
        "total_inspected": total_inspected,
        "total_defects": total_defects,
        "dhu": dhu,
        "top_defects": top_defects,
    }
