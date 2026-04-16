from __future__ import annotations

import re
from collections import defaultdict
from datetime import date, timedelta, timezone as dt_timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from django.apps import apps
from django.db.models import Q
from django.utils import timezone as django_tz

from common.utils.time import day_range, to_dhaka_tz, today
from tracking.models import Bundle, Garment, LineTarget, ProductionLine, QualityCheck
from tracking.models.constants import BundleStatus, LineType, QualityCheckStatus, GarmentStatus


# ----------------------------
# Model resolver (TrackingScan)
# ----------------------------

def _resolve_tracking_scan_model():
    """
    Resolve the TrackingScan model reliably, even if the app_label differs.
    Prefer db_table == 'tracking_scan'.
    """
    for app_label in ("tracking", "sewing", "production"):
        try:
            m = apps.get_model(app_label, "TrackingScan")
            if m:
                return m
        except Exception:
            pass

    try:
        for m in apps.get_models():
            try:
                if getattr(getattr(m, "_meta", None), "db_table", None) == "tracking_scan":
                    return m
            except Exception:
                continue
    except Exception:
        pass

    try:
        for m in apps.get_models():
            if getattr(m, "__name__", "").lower() == "trackingscan":
                return m
    except Exception:
        pass

    return None


# ----------------------------
# Small utilities
# ----------------------------

def _ceil_div(a: int, b: int) -> int:
    if b <= 0:
        return 0
    return (a + b - 1) // b


def _per_hour_target(line_target: Optional[LineTarget]) -> int:
    """Target per hour must be <= 20 (line-wise)."""
    if not line_target:
        return 0
    work_hours = int(getattr(line_target, "work_hours", 0) or 0) or 8
    target_qty = int(getattr(line_target, "target_quantity", 0) or 0)
    per_hr = _ceil_div(target_qty, work_hours)
    return max(0, min(20, int(per_hr)))


def _to_utc(dt):
    """Convert naive/local dt -> aware UTC safely."""
    if dt is None:
        return None
    if django_tz.is_naive(dt):
        dt = django_tz.make_aware(dt)
    return dt.astimezone(dt_timezone.utc)


def _get_style_from_garment(garment):
    """Robust style fetch (for efficiency calc)."""
    order = getattr(garment, "order", None)
    if order is not None:
        style = getattr(order, "style", None)
        if style is not None:
            return style

    pb = getattr(garment, "primary_bundle", None)
    if pb is not None:
        order2 = getattr(pb, "order", None)
        if order2 is not None:
            style2 = getattr(order2, "style", None)
            if style2 is not None:
                return style2

    return None


def _required_pieces_per_garment(part_name: str) -> int:
    """
    (Kept as-is for compatibility)
    Sleeve/Cuff = 2 pcs -> 1 garment; else = 1
    """
    name = (part_name or "").strip().lower()
    if "sleeve" in name or "cuff" in name:
        return 2
    return 1


def _normalize_part_name(name: str | None) -> str:
    return re.sub(r"[^a-z0-9]", "", (name or "").strip().lower())


def _qty_for_required_part(part_qty_map: dict[str, int], required_key: str) -> int:
    rk = _normalize_part_name(required_key)
    if not rk:
        return 0
    if rk in part_qty_map:
        return int(part_qty_map.get(rk, 0) or 0)

    best = 0
    for k, v in part_qty_map.items():
        kk = _normalize_part_name(k)
        if rk in kk or kk in rk:
            best = max(best, int(v or 0))
    return best


# ----------------------------
# Active-only helper
# ----------------------------

def _apply_active_only_by_delivery(qs, delivery_field_path: str, active_only: bool = True):
    """
    active_only=True হলে delivered/shipped (delivery_date <= today) order hide হবে।
    delivery_field_path example:
      - "order__delivery_date"
      - "primary_bundle__order__delivery_date"
      - "garment__primary_bundle__order__delivery_date"
      - "bundle__order__delivery_date"
    """
    if not active_only:
        return qs

    t = today()  # Dhaka date helper
    return qs.filter(
        Q(**{f"{delivery_field_path}__isnull": True}) |
        Q(**{f"{delivery_field_path}__gt": t})
    )


# ----------------------------
# Bundles queryset helpers
# ----------------------------

def _get_required_parts_for_order(order) -> Optional[List[str]]:
    """Return required part names for an order's style if available."""
    if not order:
        return None

    style = getattr(order, "style", None)
    if not style:
        return None

    rel_candidates = ["parts", "assembly_parts", "cut_parts", "required_parts"]
    for attr in rel_candidates:
        rel = getattr(style, attr, None)
        if rel is None:
            continue
        all_fn = getattr(rel, "all", None)
        if callable(all_fn):
            try:
                names = []
                for obj in all_fn():
                    n = getattr(obj, "name", None)
                    if n:
                        names.append(str(n).strip())
                if names:
                    return names
            except Exception:
                pass

    for attr in ["parts_list", "parts_names"]:
        val = getattr(style, attr, None)
        if isinstance(val, (list, tuple)) and val:
            return [str(x).strip() for x in val if str(x).strip()]

    return None


def _bundle_line_and_issued_fields() -> Tuple[str, str]:
    bundle_fields = {f.name for f in Bundle._meta.get_fields()}
    line_field = "assigned_sewing_line" if "assigned_sewing_line" in bundle_fields else "sewing_line"
    issued_field = "issued_at" if "issued_at" in bundle_fields else (
        "issued_to_sewing_at" if "issued_to_sewing_at" in bundle_fields else "issued_at"
    )
    return line_field, issued_field


def _get_todays_input_bundles_queryset(
    production_line: ProductionLine,
    day_start,
    day_end,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
):
    """
    Today-only input bundles.
    - status in (ISSUED_TO_SEWING, CREATED)
    - ISSUED: issued_at in today's range; if issued_at NULL fallback to created_at
    - CREATED: created_at in today's range
    - only for this sewing line
    """
    line_field, issued_field = _bundle_line_and_issued_fields()

    qs = (
        Bundle.objects.select_related("order__style__buyer", "order__size", "order__color", "part")
        .filter(**{line_field: production_line})
        .filter(
            (Q(status=BundleStatus.ISSUED_TO_SEWING)
             & (
                 Q(**{f"{issued_field}__range": (day_start, day_end)})
                 | (Q(**{f"{issued_field}__isnull": True}) & Q(created_at__range=(day_start, day_end)))
             ))
            | (Q(status=BundleStatus.CREATED) & Q(created_at__range=(day_start, day_end)))
        )
    )

    qs = _apply_active_only_by_delivery(qs, "order__delivery_date", active_only)

    if order_id:
        qs = qs.filter(order_id=order_id)
    if style_id:
        qs = qs.filter(order__style_id=style_id)
    if buyer_id:
        qs = qs.filter(order__style__buyer_id=buyer_id)
    if size:
        qs = qs.filter(order__size__name=size)
    if color:
        qs = qs.filter(order__color__name=color)

    return qs


def _get_pending_input_bundles_upto_queryset(
    production_line: ProductionLine,
    day_end,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
):
    line_field, issued_field = _bundle_line_and_issued_fields()

    qs = (
        Bundle.objects.select_related("order__style__buyer", "order__size", "order__color", "part")
        .filter(**{line_field: production_line})
        .filter(status__in=[BundleStatus.CREATED, BundleStatus.ISSUED_TO_SEWING])
        .filter(
            Q(**{f"{issued_field}__lte": day_end})
            | (Q(**{f"{issued_field}__isnull": True}) & Q(created_at__lte=day_end))
        )
    )

    qs = _apply_active_only_by_delivery(qs, "order__delivery_date", active_only)

    if order_id:
        qs = qs.filter(order_id=order_id)
    if style_id:
        qs = qs.filter(order__style_id=style_id)
    if buyer_id:
        qs = qs.filter(order__style__buyer_id=buyer_id)
    if size:
        qs = qs.filter(order__size__name=size)
    if color:
        qs = qs.filter(order__color__name=color)

    return qs


def _get_current_wip_bundles_queryset(
    production_line,
    order_id=None,
    style_id=None,
    buyer_id=None,
    size=None,
    color=None,
    active_only: bool = True,
):
    line_field, _ = _bundle_line_and_issued_fields()

    qs = Bundle.objects.filter(
        **{line_field: production_line},
        status__in=[BundleStatus.CREATED, BundleStatus.ISSUED_TO_SEWING],
    )
    qs = _apply_active_only_by_delivery(qs, "order__delivery_date", active_only)

    if order_id:
        qs = qs.filter(order_id=order_id)
    if style_id:
        qs = qs.filter(order__style_id=style_id)
    if buyer_id:
        qs = qs.filter(order__style__buyer_id=buyer_id)
    if size:
        qs = qs.filter(order__size__name=size)
    if color:
        qs = qs.filter(order__color__name=color)

    return qs


# ----------------------------
# Garment-equivalent calculators
# ----------------------------

def _calculate_loading_from_bundles(bundles) -> int:
    """
    Convert part bundles -> garment-equivalent COMPLETE SET.
    groups by (order, size, color): garments_for_group = min(qty_of_each_required_part)
    """
    groups: Dict[tuple, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    required_parts_by_key: Dict[tuple, List[str]] = {}

    for b in bundles:
        order = getattr(b, "order", None)
        if not order:
            continue

        size_name = getattr(getattr(order, "size", None), "name", None)
        color_name = getattr(getattr(order, "color", None), "name", None)
        key = (b.order_id, size_name, color_name)

        if key not in required_parts_by_key:
            req = [_normalize_part_name(x) for x in (_get_required_parts_for_order(order) or []) if _normalize_part_name(x)]
            required_parts_by_key[key] = req

        part_name = getattr(getattr(b, "part", None), "name", None) or ""
        part_key = _normalize_part_name(part_name)
        if not part_key:
            continue

        qty = int(getattr(b, "garment_quantity", 0) or 0)
        if qty <= 0:
            continue
        groups[key][part_key] += qty

    core_part_keys = {_normalize_part_name(x) for x in ["Front", "Back", "Sleeve", "Collar", "Hood"]}

    total_garments = 0
    for key, part_qty_map in groups.items():
        if not part_qty_map:
            continue

        req_parts = required_parts_by_key.get(key) or []

        if req_parts:
            matched_required = [rp for rp in req_parts if _qty_for_required_part(part_qty_map, rp) > 0]
            if matched_required:
                req_parts = matched_required
            else:
                core_present = [k for k in part_qty_map.keys() if k in core_part_keys]
                if core_present:
                    req_parts = core_present
                else:
                    max_qty = max(int(v or 0) for v in part_qty_map.values()) if part_qty_map else 0
                    threshold = int(max_qty * 0.60)
                    major_parts = [
                        k for k, v in part_qty_map.items()
                        if int(v or 0) >= threshold and int(v or 0) > 0
                    ]
                    req_parts = major_parts or list(part_qty_map.keys())
        else:
            core_present = [k for k in part_qty_map.keys() if k in core_part_keys]
            req_parts = core_present or list(part_qty_map.keys())

        possible: List[int] = []
        for rp in req_parts:
            qty = _qty_for_required_part(part_qty_map, rp)
            if qty > 0:
                possible.append(int(qty))

        if possible:
            total_garments += min(possible)

    return int(total_garments)


def _calculate_total_input_upto(
    production_line: ProductionLine,
    target_date: date,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> int:
    """
    Total Input (Pending + New) as of selected date end:
      - Bundles in (CREATED, ISSUED_TO_SEWING) upto day_end
      - Convert parts -> garments (min across required parts)
    """
    _day_start, day_end = day_range(target_date)
    bundles = _get_pending_input_bundles_upto_queryset(
        production_line,
        day_end,
        order_id=order_id,
        style_id=style_id,
        buyer_id=buyer_id,
        size=size,
        color=color,
        active_only=active_only,
    )
    return _calculate_loading_from_bundles(bundles)


# ----------------------------
# Garment time helpers / line mapping
# ----------------------------

def _garment_upto_day_end_q(preferred_fields: List[str], day_end) -> Optional[Q]:
    """NULL-safe <= day_end filter across the first available timestamp fields."""
    fields = {f.name for f in Garment._meta.get_fields()}
    chain = [f for f in preferred_fields if f in fields]
    if not chain:
        return None

    q = Q()
    null_chain = Q()
    for i, f in enumerate(chain):
        cond = Q(**{f"{f}__lte": day_end})
        q |= (null_chain & cond) if i > 0 else cond
        null_chain &= Q(**{f"{f}__isnull": True})
    return q


def _garment_line_q(production_line: ProductionLine) -> Q:
    """
    Garments may be linked to a line either directly (garment.sewing_line)
    or indirectly via primary_bundle.(assigned_sewing_line/sewing_line).
    """
    line_field, _ = _bundle_line_and_issued_fields()
    return Q(sewing_line=production_line) | Q(**{f"primary_bundle__{line_field}": production_line})


# ----------------------------
# Sewing / finishing done upto
# ----------------------------

def _get_sewing_done_upto(
    production_line,
    day_end,
    order_id=None,
    style_id=None,
    buyer_id=None,
    size=None,
    color=None,
    active_only: bool = True,
) -> int:
    sewing_pass_statuses = [
        GarmentStatus.SEWING_QC_PASS,
        GarmentStatus.FINISHING_QC_PASS,
        GarmentStatus.FINISHING_QC_FAIL,
        GarmentStatus.FINISHING_QC_REWORK,
    ]
    qs = Garment.objects.filter(sewing_line=production_line, status__in=sewing_pass_statuses)

    qs = _apply_active_only_by_delivery(qs, "primary_bundle__order__delivery_date", active_only)

    if order_id:
        qs = qs.filter(primary_bundle__order_id=order_id)
    if style_id:
        qs = qs.filter(primary_bundle__order__style_id=style_id)
    if buyer_id:
        qs = qs.filter(primary_bundle__order__style__buyer_id=buyer_id)
    if size:
        qs = qs.filter(primary_bundle__order__size__name=size)
    if color:
        qs = qs.filter(primary_bundle__order__color__name=color)

    q = _garment_upto_day_end_q(
        ["sewing_qc_at", "sewing_qc_completed_at", "updated_at", "modified_at", "created_at"],
        day_end,
    )
    if q is not None:
        qs = qs.filter(q)

    return qs.count()


def _get_finishing_done_upto(
    production_line,
    day_end,
    order_id=None,
    style_id=None,
    buyer_id=None,
    size=None,
    color=None,
    active_only: bool = True,
) -> int:
    qs = Garment.objects.filter(sewing_line=production_line, status=GarmentStatus.FINISHING_QC_PASS)

    qs = _apply_active_only_by_delivery(qs, "primary_bundle__order__delivery_date", active_only)

    if order_id:
        qs = qs.filter(primary_bundle__order_id=order_id)
    if style_id:
        qs = qs.filter(primary_bundle__order__style_id=style_id)
    if buyer_id:
        qs = qs.filter(primary_bundle__order__style__buyer_id=buyer_id)
    if size:
        qs = qs.filter(primary_bundle__order__size__name=size)
    if color:
        qs = qs.filter(primary_bundle__order__color__name=color)

    q = _garment_upto_day_end_q(
        ["finishing_qc_at", "updated_at", "modified_at", "created_at"],
        day_end,
    )
    if q is not None:
        qs = qs.filter(q)

    return qs.count()


def _count_garments_upto(
    production_line: ProductionLine,
    day_end,
    statuses: Optional[List[str]] = None,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> int:
    qs = Garment.objects.filter(_garment_line_q(production_line))
    qs = _apply_active_only_by_delivery(qs, "primary_bundle__order__delivery_date", active_only)

    if statuses:
        qs = qs.filter(status__in=statuses)

    q = _garment_upto_day_end_q(
        ["created_at", "updated_at", "modified_at", "sewing_qc_at", "sewing_qc_completed_at", "finishing_qc_at"],
        day_end,
    )
    if q is not None:
        qs = qs.filter(q)

    if order_id:
        qs = qs.filter(Q(order_id=order_id) | Q(primary_bundle__order_id=order_id))
    if style_id:
        qs = qs.filter(Q(order__style_id=style_id) | Q(primary_bundle__order__style_id=style_id))
    if buyer_id:
        qs = qs.filter(Q(order__style__buyer_id=buyer_id) | Q(primary_bundle__order__style__buyer_id=buyer_id))
    if size:
        qs = qs.filter(Q(order__size__name=size) | Q(primary_bundle__order__size__name=size))
    if color:
        qs = qs.filter(Q(order__color__name=color) | Q(primary_bundle__order__color__name=color))

    return qs.distinct().count()


def _get_sewing_qc_pass_current(
    production_line,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> int:
    qs = Garment.objects.filter(
        _garment_line_q(production_line),
        status=GarmentStatus.SEWING_QC_PASS,
    )
    qs = _apply_active_only_by_delivery(qs, "primary_bundle__order__delivery_date", active_only)

    if order_id:
        qs = qs.filter(Q(order_id=order_id) | Q(primary_bundle__order_id=order_id))
    if style_id:
        qs = qs.filter(Q(order__style_id=style_id) | Q(primary_bundle__order__style_id=style_id))
    if buyer_id:
        qs = qs.filter(Q(order__style__buyer_id=buyer_id) | Q(primary_bundle__order__style__buyer_id=buyer_id))
    if size:
        qs = qs.filter(Q(order__size__name=size) | Q(primary_bundle__order__size__name=size))
    if color:
        qs = qs.filter(Q(order__color__name=color) | Q(primary_bundle__order__color__name=color))

    return qs.distinct().count()


def _get_total_output_pending_upto(
    production_line: ProductionLine,
    day_end,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> int:
    """
    Total Output (Pending + New) upto day_end:
      sewing-qc PASS garments which are not yet FINISHING-qc PASS.
    """
    pending_statuses = [
        GarmentStatus.SEWING_QC_PASS,
        GarmentStatus.FINISHING_QC_FAIL,
        GarmentStatus.FINISHING_QC_REWORK,
    ]

    qs = Garment.objects.filter(sewing_line=production_line, status__in=pending_statuses).select_related(
        "primary_bundle__order__style__buyer",
        "primary_bundle__order__size",
        "primary_bundle__order__color",
    )

    qs = _apply_active_only_by_delivery(qs, "primary_bundle__order__delivery_date", active_only)

    if order_id:
        qs = qs.filter(primary_bundle__order_id=order_id)
    if style_id:
        qs = qs.filter(primary_bundle__order__style_id=style_id)
    if buyer_id:
        qs = qs.filter(primary_bundle__order__style__buyer_id=buyer_id)
    if size:
        qs = qs.filter(primary_bundle__order__size__name=size)
    if color:
        qs = qs.filter(primary_bundle__order__color__name=color)

    q = _garment_upto_day_end_q(
        preferred_fields=["sewing_qc_at", "sewing_qc_completed_at", "updated_at", "modified_at", "created_at"],
        day_end=day_end,
    )
    if q is not None:
        qs = qs.filter(q)

    return qs.count()


# ----------------------------
# QC helpers
# ----------------------------

def _get_line_qc_stats(
    production_line: ProductionLine,
    target_date: date,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> Dict[str, int]:
    """Today-only QC stats based on latest QC per garment in the day."""
    day_start, day_end = day_range(target_date)

    garments_qs = production_line.produced_garments.filter(
        quality_checks__created_at__range=(day_start, day_end)
    ).select_related("primary_bundle__order__style__buyer")

    garments_qs = _apply_active_only_by_delivery(garments_qs, "primary_bundle__order__delivery_date", active_only)

    if order_id:
        garments_qs = garments_qs.filter(primary_bundle__order_id=order_id)
    if style_id:
        garments_qs = garments_qs.filter(primary_bundle__order__style_id=style_id)
    if buyer_id:
        garments_qs = garments_qs.filter(primary_bundle__order__style__buyer_id=buyer_id)
    if size:
        garments_qs = garments_qs.filter(primary_bundle__order__size__name=size)
    if color:
        garments_qs = garments_qs.filter(primary_bundle__order__color__name=color)

    garments = garments_qs.distinct()

    qc_pass = qc_fail = qc_rework = 0
    for g in garments:
        latest_qc = g.quality_checks.order_by("-created_at").first()
        if not latest_qc:
            continue
        if latest_qc.status == QualityCheckStatus.PASS:
            qc_pass += 1
        elif latest_qc.status == QualityCheckStatus.FAIL:
            qc_fail += 1
        elif latest_qc.status == QualityCheckStatus.REWORK:
            qc_rework += 1

    return {
        "qc_pass": qc_pass,
        "qc_fail": qc_fail,
        "qc_rework": qc_rework,
        "total_qc_completed": qc_pass + qc_fail + qc_rework,
    }


def _get_line_qc_stats_range(
    production_line: ProductionLine,
    start_dt,
    end_dt,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> Dict[str, int]:
    """Range QC stats based on latest QC per garment within the range."""
    garments_qs = production_line.produced_garments.filter(
        quality_checks__created_at__range=(start_dt, end_dt)
    ).select_related("primary_bundle__order__style__buyer")

    garments_qs = _apply_active_only_by_delivery(garments_qs, "primary_bundle__order__delivery_date", active_only)

    if order_id:
        garments_qs = garments_qs.filter(primary_bundle__order_id=order_id)
    if style_id:
        garments_qs = garments_qs.filter(primary_bundle__order__style_id=style_id)
    if buyer_id:
        garments_qs = garments_qs.filter(primary_bundle__order__style__buyer_id=buyer_id)
    if size:
        garments_qs = garments_qs.filter(primary_bundle__order__size__name=size)
    if color:
        garments_qs = garments_qs.filter(primary_bundle__order__color__name=color)

    garments = garments_qs.distinct()

    qc_pass = qc_fail = qc_rework = 0
    for g in garments:
        latest_qc = g.quality_checks.filter(created_at__range=(start_dt, end_dt)).order_by("-created_at").first()
        if not latest_qc:
            continue
        if latest_qc.status == QualityCheckStatus.PASS:
            qc_pass += 1
        elif latest_qc.status == QualityCheckStatus.FAIL:
            qc_fail += 1
        elif latest_qc.status == QualityCheckStatus.REWORK:
            qc_rework += 1

    return {
        "qc_pass": qc_pass,
        "qc_fail": qc_fail,
        "qc_rework": qc_rework,
        "total_qc_completed": qc_pass + qc_fail + qc_rework,
    }


def _get_line_pass_upto(
    production_line: ProductionLine,
    day_end,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> int:
    """PASS upto day_end (latest QC per garment upto day_end)."""
    garments_qs = production_line.produced_garments.filter(
        quality_checks__created_at__lte=day_end
    ).select_related("primary_bundle__order__style__buyer")

    garments_qs = _apply_active_only_by_delivery(garments_qs, "primary_bundle__order__delivery_date", active_only)

    if order_id:
        garments_qs = garments_qs.filter(primary_bundle__order_id=order_id)
    if style_id:
        garments_qs = garments_qs.filter(primary_bundle__order__style_id=style_id)
    if buyer_id:
        garments_qs = garments_qs.filter(primary_bundle__order__style__buyer_id=buyer_id)
    if size:
        garments_qs = garments_qs.filter(primary_bundle__order__size__name=size)
    if color:
        garments_qs = garments_qs.filter(primary_bundle__order__color__name=color)

    garments = garments_qs.distinct()

    passed = 0
    for g in garments:
        latest_qc = g.quality_checks.filter(created_at__lte=day_end).order_by("-created_at").first()
        if latest_qc and latest_qc.status == QualityCheckStatus.PASS:
            passed += 1
    return passed


# ----------------------------
# Efficiency + DHU
# ----------------------------

def _calculate_efficiency(
    production_line: ProductionLine,
    target_date: date,
    line_target: Optional[LineTarget],
    output_count: int,
) -> Decimal:
    """
    efficiency = (earned_minutes / available_minutes) * 100
    earned_minutes = output_count * avg_smv
    available_minutes = worker_count * work_hours * 60
    fallback: (output_count / target_qty) * 100
    """
    if not line_target or output_count <= 0:
        return Decimal(0)

    work_hours = getattr(line_target, "work_hours", None) or 8
    target_qty = getattr(line_target, "target_quantity", None) or 0
    worker_count = getattr(line_target, "worker_count", None) or 0

    day_start, day_end = day_range(target_date)

    pass_garment_ids = (
        QualityCheck.objects.filter(
            garment__sewing_line=production_line,
            status=QualityCheckStatus.PASS,
            created_at__range=(day_start, day_end),
        )
        .values_list("garment_id", flat=True)
        .distinct()
    )

    if not pass_garment_ids:
        return (Decimal(output_count) / Decimal(target_qty) * 100) if target_qty else Decimal(0)

    garments = Garment.objects.filter(id__in=pass_garment_ids).select_related(
        "order__style",
        "primary_bundle__order__style",
    )

    total_smv = Decimal(0)
    smv_count = 0
    for g in garments:
        style = _get_style_from_garment(g)
        smv = getattr(style, "smv_minutes", None) if style else None
        if smv:
            total_smv += Decimal(smv)
            smv_count += 1

    if smv_count == 0:
        return (Decimal(output_count) / Decimal(target_qty) * 100) if target_qty else Decimal(0)

    avg_smv = total_smv / Decimal(smv_count)
    earned_minutes = Decimal(output_count) * avg_smv

    if worker_count and work_hours:
        available_minutes = Decimal(worker_count * work_hours * 60)
        if available_minutes > 0:
            return (earned_minutes / available_minutes) * Decimal(100)

    return (Decimal(output_count) / Decimal(target_qty) * 100) if target_qty else Decimal(0)


def _calculate_dhu(
    production_line: ProductionLine,
    target_date: date,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> Decimal:
    """DHU = (total defect occurrences / total QC checks) * 100"""
    day_start, day_end = day_range(target_date)

    qcs = (
        QualityCheck.objects.filter(
            garment__sewing_line=production_line,
            created_at__range=(day_start, day_end),
        )
        .prefetch_related("defects")
        .select_related(
            "garment__primary_bundle__order__style__buyer",
            "garment__primary_bundle__order__size",
            "garment__primary_bundle__order__color",
        )
    )

    qcs = _apply_active_only_by_delivery(qcs, "garment__primary_bundle__order__delivery_date", active_only)

    if order_id:
        qcs = qcs.filter(garment__primary_bundle__order_id=order_id)
    if style_id:
        qcs = qcs.filter(garment__primary_bundle__order__style_id=style_id)
    if buyer_id:
        qcs = qcs.filter(garment__primary_bundle__order__style__buyer_id=buyer_id)
    if size:
        qcs = qcs.filter(garment__primary_bundle__order__size__name=size)
    if color:
        qcs = qcs.filter(garment__primary_bundle__order__color__name=color)

    total_units = qcs.count()
    if total_units <= 0:
        return Decimal(0)

    total_defects = 0
    for qc in qcs:
        try:
            total_defects += qc.defects.count()
        except Exception:
            total_defects += 0

    return (Decimal(total_defects) / Decimal(total_units) * Decimal(100)) if total_units else Decimal(0)


def _calculate_dhu_range(
    production_line: ProductionLine,
    start_dt,
    end_dt,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> Decimal:
    qcs = (
        QualityCheck.objects.filter(
            garment__sewing_line=production_line,
            created_at__range=(start_dt, end_dt),
        )
        .prefetch_related("defects")
        .select_related(
            "garment__primary_bundle__order__style__buyer",
            "garment__primary_bundle__order__size",
            "garment__primary_bundle__order__color",
        )
    )

    qcs = _apply_active_only_by_delivery(qcs, "garment__primary_bundle__order__delivery_date", active_only)

    if order_id:
        qcs = qcs.filter(garment__primary_bundle__order_id=order_id)
    if style_id:
        qcs = qcs.filter(garment__primary_bundle__order__style_id=style_id)
    if buyer_id:
        qcs = qcs.filter(garment__primary_bundle__order__style__buyer_id=buyer_id)
    if size:
        qcs = qcs.filter(garment__primary_bundle__order__size__name=size)
    if color:
        qcs = qcs.filter(garment__primary_bundle__order__color__name=color)

    total_units = qcs.count()
    if total_units <= 0:
        return Decimal(0)

    total_defects = 0
    for qc in qcs:
        try:
            total_defects += qc.defects.count()
        except Exception:
            total_defects += 0

    return (Decimal(total_defects) / Decimal(total_units) * Decimal(100)) if total_units else Decimal(0)


# ----------------------------
# Slide-1 Part inventory (PART WIP) - pending+new upto day_end
# ----------------------------

def _get_line_part_inventory_upto(
    production_line: ProductionLine,
    target_date: date,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> List[Dict[str, Any]]:
    _day_start, day_end = day_range(target_date)

    line_target = LineTarget.objects.filter(line=production_line, date=target_date).first()
    expected_quantity = _per_hour_target(line_target)

    bundles = _get_pending_input_bundles_upto_queryset(
        production_line=production_line,
        day_end=day_end,
        order_id=order_id,
        style_id=style_id,
        buyer_id=buyer_id,
        size=size,
        color=color,
        active_only=active_only,
    )

    part_totals: Dict[str, int] = defaultdict(int)
    for b in bundles:
        part_name = getattr(getattr(b, "part", None), "name", None) or "Part"
        qty = int(getattr(b, "garment_quantity", 0) or 0)
        part_totals[part_name] += qty

    rows = [
        {"name": part_name, "expected": expected_quantity, "total_produced": qty, "issued": qty}
        for part_name, qty in part_totals.items()
    ]
    rows.sort(key=lambda x: x["name"])
    return rows


# ----------------------------
# Hourly breakdown (target <= 20)
# ----------------------------

def _get_hourly_breakdown(
    production_line: ProductionLine,
    target_date: date,
    line_target: Optional[LineTarget],
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    order_ids: Optional[List[int]] = None,
    style_ids: Optional[List[int]] = None,
    buyer_ids: Optional[List[int]] = None,
    sizes: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    active_only: bool = True,
) -> List[Dict[str, Any]]:
    if not line_target:
        return []

    work_hours = int(getattr(line_target, "work_hours", 0) or 0) or 8
    hour_count = max(1, work_hours)
    hourly_target = _per_hour_target(line_target)

    day_start, day_end = day_range(target_date)

    daily_qcs = QualityCheck.objects.filter(
        garment__sewing_line=production_line,
        created_at__range=(day_start, day_end),
    ).select_related("garment__primary_bundle__order__style__buyer")

    daily_qcs = _apply_active_only_by_delivery(daily_qcs, "garment__primary_bundle__order__delivery_date", active_only)

    if order_ids:
        daily_qcs = daily_qcs.filter(garment__primary_bundle__order_id__in=order_ids)
    elif order_id:
        daily_qcs = daily_qcs.filter(garment__primary_bundle__order_id=order_id)

    if style_ids:
        daily_qcs = daily_qcs.filter(garment__primary_bundle__order__style_id__in=style_ids)
    elif style_id:
        daily_qcs = daily_qcs.filter(garment__primary_bundle__order__style_id=style_id)

    if buyer_ids:
        daily_qcs = daily_qcs.filter(garment__primary_bundle__order__style__buyer_id__in=buyer_ids)
    elif buyer_id:
        daily_qcs = daily_qcs.filter(garment__primary_bundle__order__style__buyer_id=buyer_id)

    if sizes:
        daily_qcs = daily_qcs.filter(garment__primary_bundle__order__size__name__in=sizes)
    elif size:
        daily_qcs = daily_qcs.filter(garment__primary_bundle__order__size__name=size)

    if colors:
        daily_qcs = daily_qcs.filter(garment__primary_bundle__order__color__name__in=colors)
    elif color:
        daily_qcs = daily_qcs.filter(garment__primary_bundle__order__color__name=color)

    if not daily_qcs.exists():
        return [{"hour": h, "target": hourly_target, "output": 0, "rework": 0} for h in range(1, hour_count + 1)]

    earliest_qc = daily_qcs.order_by("created_at").first().created_at
    start_local = to_dhaka_tz(earliest_qc).replace(minute=0, second=0, microsecond=0)

    rows = []
    for h in range(1, hour_count + 1):
        hour_start_local = start_local + timedelta(hours=h - 1)
        hour_end_local = start_local + timedelta(hours=h)

        hour_start_utc = _to_utc(hour_start_local)
        hour_end_utc = _to_utc(hour_end_local)

        base = QualityCheck.objects.filter(
            garment__sewing_line=production_line,
            created_at__gte=hour_start_utc,
            created_at__lt=hour_end_utc,
        )
        base = _apply_active_only_by_delivery(base, "garment__primary_bundle__order__delivery_date", active_only)

        output = base.filter(status=QualityCheckStatus.PASS).count()
        rework = base.filter(status=QualityCheckStatus.REWORK).count()

        rows.append({"hour": h, "target": hourly_target, "output": output, "rework": rework})

    return rows


# ----------------------------
# Parts hourly data (Slide-2)
# ----------------------------

def _get_parts_hourly_data(
    production_line: ProductionLine,
    target_date: date,
    line_target: Optional[LineTarget],
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> List[Dict[str, Any]]:
    """Slide-2 Part input hourly from TrackingScan bundle_completed events."""
    work_hours = int(getattr(line_target, "work_hours", 0) or 0) or 8
    hour_count = max(1, work_hours)
    per_hour_target = _per_hour_target(line_target)

    TrackingScan = _resolve_tracking_scan_model()
    if TrackingScan is None:
        return []

    def _model_field_names(model) -> set[str]:
        try:
            return {f.name for f in model._meta.get_fields()}
        except Exception:
            return set()

    scan_fields = _model_field_names(TrackingScan)
    has_bundle = "bundle" in scan_fields or "bundle_id" in scan_fields
    has_scanner = "scanner" in scan_fields or "scanner_id" in scan_fields

    if not has_bundle:
        return []

    event_types = ["bundle_completed", "bundle_complated"]

    qs = TrackingScan.objects.filter(
        event_type__in=event_types,
        created_at__date=target_date,
    )
    qs = _apply_active_only_by_delivery(qs, "bundle__order__delivery_date", active_only)

    try:
        qs = qs.select_related(
            "bundle",
            "bundle__part",
            "bundle__order",
            "bundle__order__style",
            "bundle__order__style__buyer",
            "bundle__order__size",
            "bundle__order__color",
        )
    except Exception:
        try:
            qs = qs.select_related("bundle", "bundle__part", "bundle__order")
        except Exception:
            qs = qs.select_related("bundle")

    line_field, _ = _bundle_line_and_issued_fields()
    try:
        qs_line = qs.filter(**{f"bundle__{line_field}": production_line})
        if qs_line.exists():
            qs = qs_line
        else:
            raise ValueError("no rows after bundle line filter")
    except Exception:
        if has_scanner:
            try:
                line_name = str(getattr(production_line, "name", "") or getattr(production_line, "code", "") or "").strip()
                if line_name:
                    qs = qs.filter(scanner__name__icontains=line_name)
            except Exception:
                pass

    if order_id:
        qs = qs.filter(bundle__order_id=order_id)
    if style_id:
        qs = qs.filter(bundle__order__style_id=style_id)
    if buyer_id:
        qs = qs.filter(bundle__order__style__buyer_id=buyer_id)
    if size:
        qs = qs.filter(bundle__order__size__name=size)
    if color:
        qs = qs.filter(bundle__order__color__name=color)

    if not qs.exists():
        return []

    earliest_ts = qs.order_by("created_at").values_list("created_at", flat=True).first()
    start_local = to_dhaka_tz(earliest_ts).replace(minute=0, second=0, microsecond=0)

    part_hours = defaultdict(lambda: [0] * hour_count)
    bundle_qty_fields = ["garment_quantity", "quantity", "qty", "count", "bundle_qty", "issued_qty"]

    for s in qs:
        ts = getattr(s, "created_at", None)
        if not ts:
            continue

        idx = int((to_dhaka_tz(ts) - start_local).total_seconds() // 3600)
        if idx < 0 or idx >= hour_count:
            continue

        b = getattr(s, "bundle", None)
        if not b:
            continue

        part_name = getattr(getattr(b, "part", None), "name", None) or "Part"

        qty_val = None
        for f in bundle_qty_fields:
            if hasattr(b, f):
                qty_val = getattr(b, f, None)
                if qty_val not in (None, "", 0):
                    break

        try:
            qty = int(qty_val or 1)
        except Exception:
            qty = 1
        if qty <= 0:
            qty = 1

        part_hours[part_name][idx] += qty

    rows = [{"part": k, "target": per_hour_target, "hours": v} for k, v in part_hours.items()]
    rows.sort(key=lambda x: x["part"])
    return rows


def _get_assemble_hourly_totals(
    production_line: ProductionLine,
    target_date: date,
    line_target: Optional[LineTarget],
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
    start_local=None,  # ✅ allow common anchor injection
) -> List[int]:
    work_hours = int(getattr(line_target, "work_hours", 0) or 0) or 8
    hour_count = max(1, work_hours)

    TrackingScan = _resolve_tracking_scan_model()
    if TrackingScan is None:
        return [0] * hour_count

    # ---- events
    event_types = {
        "garment_issued_for_assembly",
        "GARMENT_ISSUED_FOR_ASSEMBLY",
    }
    try:
        from tracking.models.constants import ScanEventType
        base = getattr(ScanEventType, "GARMENT_ISSUED_FOR_ASSEMBLY", None)
        if base is not None:
            event_types.add(str(base))
            if getattr(base, "value", None):
                event_types.add(str(base.value))
            if getattr(base, "label", None):
                event_types.add(str(base.label))
    except Exception:
        pass
    event_types = list(event_types)

    # ---- date filter (simple + stable)
    qs = TrackingScan.objects.filter(event_type__in=event_types, created_at__date=target_date)

    # ---- active_only
    qs = _apply_active_only_by_delivery(qs, "bundle__order__delivery_date", active_only)

    # ---- enforce correct line (prefer bundle line like parts_hourly)
    # যদি TrackingScan এ bundle থাকে, bundle এর sewing line দিয়ে filter করাই best
    try:
        scan_fields = {f.name for f in TrackingScan._meta.get_fields()}
    except Exception:
        scan_fields = set()

    has_bundle = "bundle" in scan_fields or "bundle_id" in scan_fields
    line_field, _ = _bundle_line_and_issued_fields()

    if has_bundle:
        qs_line = qs.filter(**{f"bundle__{line_field}": production_line})
        if qs_line.exists():
            qs = qs_line

    # ---- apply same filters (IMPORTANT)
    if order_id:
        qs = qs.filter(bundle__order_id=order_id)
    if style_id:
        qs = qs.filter(bundle__order__style_id=style_id)
    if buyer_id:
        qs = qs.filter(bundle__order__style__buyer_id=buyer_id)
    if size:
        qs = qs.filter(bundle__order__size__name=size)
    if color:
        qs = qs.filter(bundle__order__color__name=color)

    if not qs.exists():
        return [0] * hour_count

    # ✅ common anchor (QC earliest hour) so H1 aligns everywhere
    if start_local is None:
        start_local = _get_common_hour_anchor_local(production_line, target_date, active_only=active_only)

    totals = [0] * hour_count
    qty_fields = ("qty", "quantity", "count")

    for s in qs.iterator(chunk_size=2000):
        ts = getattr(s, "created_at", None)
        if not ts:
            continue

        idx = int((to_dhaka_tz(ts) - start_local).total_seconds() // 3600)
        if idx < 0 or idx >= hour_count:
            continue

        qv = None
        for f in qty_fields:
            if hasattr(s, f):
                qv = getattr(s, f)
                break

        try:
            q = int(qv) if qv not in (None, "", 0) else 1
        except Exception:
            q = 1

        totals[idx] += max(1, q)

    return totals

# ----------------------------
# Slide-3 hourly quality rows
# ----------------------------

def _get_hourly_quality_rows(
    production_line: ProductionLine,
    target_date: date,
    line_target: Optional[LineTarget],
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> List[Dict[str, Any]]:
    """
    Slide-3:
      - hourly defects
      - hourly DHU
      - remarks: top defect codes per hour
      - defect_breakdown per hour
    """
    work_hours = int(getattr(line_target, "work_hours", 0) or 0) or 8
    hour_count = max(1, work_hours)

    day_start, day_end = day_range(target_date)

    qcs_all = (
        QualityCheck.objects.filter(
            garment__sewing_line=production_line,
            created_at__range=(day_start, day_end),
        )
        .prefetch_related("defects")
        .select_related(
            "garment__primary_bundle__order__style__buyer",
            "garment__primary_bundle__order__size",
            "garment__primary_bundle__order__color",
        )
    )

    qcs_all = _apply_active_only_by_delivery(qcs_all, "garment__primary_bundle__order__delivery_date", active_only)

    if order_id:
        qcs_all = qcs_all.filter(garment__primary_bundle__order_id=order_id)
    if style_id:
        qcs_all = qcs_all.filter(garment__primary_bundle__order__style_id=style_id)
    if buyer_id:
        qcs_all = qcs_all.filter(garment__primary_bundle__order__style__buyer_id=buyer_id)
    if size:
        qcs_all = qcs_all.filter(garment__primary_bundle__order__size__name=size)
    if color:
        qcs_all = qcs_all.filter(garment__primary_bundle__order__color__name=color)

    if not qcs_all.exists():
        return [
            {"hour": h, "defects": 0, "units": 0, "dhu": 0.0, "remarks": [], "defect_breakdown": []}
            for h in range(1, hour_count + 1)
        ]

    earliest = qcs_all.order_by("created_at").first().created_at
    start_local = to_dhaka_tz(earliest).replace(minute=0, second=0, microsecond=0)

    defects_by_hour = [0] * hour_count
    units_by_hour = [0] * hour_count
    defects_by_code_by_hour = [defaultdict(int) for _ in range(hour_count)]
    defect_meta_by_code_by_hour: List[Dict[str, Dict[str, Optional[str]]]] = [{} for _ in range(hour_count)]

    def _extract_defects_from_qc(qc_obj) -> List[Tuple[str, str, Optional[str]]]:
        out: List[Tuple[str, str, Optional[str]]] = []

        def _split_code_name(raw: Any) -> Tuple[str, str]:
            s = str(raw or "").strip()
            if not s:
                return ("UNKNOWN", "UNKNOWN")

            m = re.match(r"^\s*([A-Za-z]{1,2})\s*[-:|]\s*(.+?)\s*$", s)
            if m:
                return (m.group(1).strip(), (m.group(2).strip() or m.group(1).strip()))

            m2 = re.match(r"^\s*([A-Za-z]{1,2})\s+(.+?)\s*$", s)
            if m2:
                code = m2.group(1).strip()
                rest = m2.group(2).strip()
                if code.isalpha() and len(code) <= 2 and rest:
                    return (code, rest)

            return (s, s)

        try:
            rel = getattr(qc_obj, "defects", None)
            if rel is not None and hasattr(rel, "all"):
                for d in rel.all():
                    description = getattr(d, "description", None)
                    description = str(description).strip() if description else None

                    explicit_code = (
                        getattr(d, "code", None)
                        or getattr(d, "defect_code", None)
                        or getattr(d, "defectCode", None)
                    )
                    explicit_code = str(explicit_code).strip() if explicit_code else ""

                    raw_name = str(getattr(d, "name", None) or "").strip()

                    if explicit_code:
                        code = explicit_code
                        _, cleaned_name = _split_code_name(raw_name)
                        name = cleaned_name or raw_name or code
                    else:
                        code, name = _split_code_name(raw_name)

                    out.append((code or "UNKNOWN", name or (code or "UNKNOWN"), description))

                if out:
                    return out
        except Exception:
            pass

        field_candidates = ["defect_code", "defect_codes", "defects_code", "defects_codes", "defect_list", "defects_list"]
        raw = None
        for f in field_candidates:
            if hasattr(qc_obj, f):
                raw = getattr(qc_obj, f)
                if raw:
                    break
        if not raw:
            return []

        items: List[Any] = []
        if isinstance(raw, (list, tuple, set)):
            items = list(raw)
        elif isinstance(raw, dict):
            if all(isinstance(k, str) for k in raw.keys()):
                for k, v in raw.items():
                    try:
                        n = int(v or 0)
                    except Exception:
                        n = 1
                    for _ in range(max(1, n)):
                        items.append(k)
            else:
                items = list(raw.values())
        else:
            s = str(raw)
            parts = re.split(r"[;,|]+", s)
            items = [p.strip() for p in parts if p.strip()]

        for it in items:
            if isinstance(it, dict):
                desc = it.get("description")
                desc = str(desc).strip() if desc else None

                c = str(it.get("code") or it.get("defect_code") or "").strip()
                n = str(it.get("name") or "").strip()

                if not c and n:
                    c2, n2 = _split_code_name(n)
                    c, n = c2, n2
                elif c and n:
                    _, n2 = _split_code_name(n)
                    n = n2 or n
                elif c and not n:
                    n = c

                qty = it.get("qty") or it.get("count") or 1
                try:
                    qty = int(qty or 1)
                except Exception:
                    qty = 1

                for _ in range(max(1, qty)):
                    out.append((c or "UNKNOWN", n or (c or "UNKNOWN"), desc))
            else:
                c, n = _split_code_name(it)
                out.append((c or "UNKNOWN", n or (c or "UNKNOWN"), None))

        return out

    for qc in qcs_all:
        local_ts = to_dhaka_tz(qc.created_at)
        idx = int((local_ts - start_local).total_seconds() // 3600)
        if 0 <= idx < hour_count:
            units_by_hour[idx] += 1

    qcs_rework = qcs_all.filter(status=QualityCheckStatus.REWORK)
    for qc in qcs_rework:
        local_ts = to_dhaka_tz(qc.created_at)
        idx = int((local_ts - start_local).total_seconds() // 3600)
        if idx < 0 or idx >= hour_count:
            continue

        defects_list = _extract_defects_from_qc(qc)
        defects_by_hour[idx] += len(defects_list)

        for code, name, description in defects_list:
            code = str(code).strip() or "UNKNOWN"
            name = str(name).strip() or code
            description = str(description).strip() if description else None

            defects_by_code_by_hour[idx][code] += 1

            meta = defect_meta_by_code_by_hour[idx].get(code) or {}
            if not meta.get("name"):
                meta["name"] = name
            if description and not meta.get("description"):
                meta["description"] = description
            defect_meta_by_code_by_hour[idx][code] = meta

    rows: List[Dict[str, Any]] = []
    for i in range(hour_count):
        units = units_by_hour[i]
        defects = defects_by_hour[i]
        dhu = (defects / units * 100.0) if units else 0.0

        breakdown = sorted(defects_by_code_by_hour[i].items(), key=lambda kv: kv[1], reverse=True)
        top3_codes = [c for c, _qty in breakdown[:3]]

        defect_breakdown = []
        for code, qty in breakdown:
            meta = defect_meta_by_code_by_hour[i].get(code) or {}
            defect_breakdown.append(
                {
                    "code": code,
                    "name": meta.get("name") or code,
                    "description": meta.get("description"),
                    "qty": int(qty or 0),
                }
            )

        rows.append(
            {
                "hour": i + 1,
                "defects": defects,
                "units": units,
                "dhu": round(dhu, 2),
                "remarks": top3_codes,
                "defect_breakdown": defect_breakdown,
            }
        )

    return rows


# ----------------------------
# End line defects (top 5)
# ----------------------------

def _get_end_line_defects(
    production_line: ProductionLine,
    target_date: date,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    active_only: bool = True,
) -> List[Dict[str, Any]]:
    day_start, day_end = day_range(target_date)

    qcs = (
        QualityCheck.objects.filter(
            garment__sewing_line=production_line,
            created_at__range=(day_start, day_end),
        )
        .prefetch_related("defects")
        .select_related("garment__primary_bundle__order__style__buyer")
    )

    qcs = _apply_active_only_by_delivery(qcs, "garment__primary_bundle__order__delivery_date", active_only)

    if order_id:
        qcs = qcs.filter(garment__primary_bundle__order_id=order_id)
    if style_id:
        qcs = qcs.filter(garment__primary_bundle__order__style_id=style_id)
    if buyer_id:
        qcs = qcs.filter(garment__primary_bundle__order__style__buyer_id=buyer_id)
    if size:
        qcs = qcs.filter(garment__primary_bundle__order__size__name=size)
    if color:
        qcs = qcs.filter(garment__primary_bundle__order__color__name=color)

    counts: Dict[str, int] = {}
    total = 0
    for qc in qcs:
        for d in qc.defects.all():
            counts[d.name] = counts.get(d.name, 0) + 1
            total += 1

    rows = []
    for name, c in counts.items():
        pct = (c / total * 100) if total else 0
        rows.append({"name": name, "count": c, "percentage": round(pct, 2)})

    rows.sort(key=lambda x: x["count"], reverse=True)
    return rows[:5]


# ----------------------------
# MAIN: get_sewing_dashboard_v2_data
# ----------------------------

def get_sewing_dashboard_v2_data(
    production_line_id: Optional[int] = None,
    date: Optional[date] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    production_line_ids: Optional[List[int]] = None,
    order_ids: Optional[List[int]] = None,
    style_ids: Optional[List[int]] = None,
    buyer_ids: Optional[List[int]] = None,
    sizes: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    active_only: bool = True,
) -> List[Dict[str, Any]]:
    # ----------------------------
    # Date/range normalize
    # ----------------------------
    range_mode = False

    if date_from or date_to:
        if not date_from:
            date_from = date_to
        if not date_to:
            date_to = date_from

        if date_from and date_to and date_from > date_to:
            date_from, date_to = date_to, date_from

        range_mode = True
        date = date_to
    else:
        if date is None:
            date = today()

    qs = ProductionLine.objects.filter(line_type=LineType.SEWING)

    if production_line_id:
        qs = qs.filter(id=production_line_id)
    elif production_line_ids:
        qs = qs.filter(id__in=production_line_ids)

    data: List[Dict[str, Any]] = []

    for line in qs:
        line_target = LineTarget.objects.filter(line=line, date=date).first()

        # QC stats
        if range_mode and date_from and date_to:
            start_dt = day_range(date_from)[0]
            end_dt = day_range(date_to)[1]
            qc_stats = _get_line_qc_stats_range(
                line, start_dt, end_dt, order_id, style_id, buyer_id, size, color, active_only=active_only
            )
        else:
            qc_stats = _get_line_qc_stats(
                line, date, order_id, style_id, buyer_id, size, color, active_only=active_only
            )

        target_qty = int(getattr(line_target, "target_quantity", 0) or 0) if line_target else 0
        pass_qty = int(qc_stats.get("qc_pass", 0) or 0)
        rework_qty = int(qc_stats.get("qc_rework", 0) or 0)
        rejected_qty = int(qc_stats.get("qc_fail", 0) or 0)

        # day_end for upto calculations
        if range_mode and date_to:
            _day_start, day_end = day_range(date_to)
        else:
            _day_start, day_end = day_range(date)

        # Total input upto (bundle vs garment fallback)
        bundle_input_upto = _calculate_total_input_upto(
            line,
            (date_to or date),
            order_id=order_id,
            style_id=style_id,
            buyer_id=buyer_id,
            size=size,
            color=color,
            active_only=active_only,
        )

        garment_input_upto = _count_garments_upto(
            line,
            day_end,
            statuses=None,
            order_id=order_id,
            style_id=style_id,
            buyer_id=buyer_id,
            size=size,
            color=color,
            active_only=active_only,
        )

        total_input_upto = int(max(bundle_input_upto, garment_input_upto))

        # Total output upto = sewing done - finishing done (shipment-ready)
        sewing_qc_pass_upto = _get_sewing_done_upto(
            line,
            day_end,
            order_id=order_id,
            style_id=style_id,
            buyer_id=buyer_id,
            size=size,
            color=color,
            active_only=active_only,
        )
        finishing_qc_pass_upto = _get_finishing_done_upto(
            line,
            day_end,
            order_id=order_id,
            style_id=style_id,
            buyer_id=buyer_id,
            size=size,
            color=color,
            active_only=active_only,
        )
        total_output_upto = max(0, int(sewing_qc_pass_upto) - int(finishing_qc_pass_upto))

        total_output_current = _get_sewing_qc_pass_current(
            line,
            order_id=order_id,
            style_id=style_id,
            buyer_id=buyer_id,
            size=size,
            color=color,
            active_only=active_only,
        )

        # Line WIP
        line_wip_calc = max(0, int(total_input_upto) - int(total_output_current))

        # Part WIP inventory (pending+new bundle qty)
        part_inventory = _get_line_part_inventory_upto(
            line,
            date,
            order_id=order_id,
            style_id=style_id,
            buyer_id=buyer_id,
            size=size,
            color=color,
            active_only=active_only,
        )

        # Work hours
        work_hours = int(getattr(line_target, "work_hours", 0) or 0) if line_target else 8
        if work_hours <= 0:
            work_hours = 8

        start_local = _get_common_hour_anchor_local(line, date, active_only=active_only)
        # Hourly breakdown
        hourly_data = _get_hourly_breakdown(
            line,
            date,
            line_target,
            order_id=order_id,
            style_id=style_id,
            buyer_id=buyer_id,
            size=size,
            color=color,
            order_ids=order_ids,
            style_ids=style_ids,
            buyer_ids=buyer_ids,
            sizes=sizes,
            colors=colors,
            active_only=active_only,
        )


        # Parts hourly
        parts_hourly_data = _get_parts_hourly_data(
            line, date, line_target, order_id, style_id, buyer_id, size, color, active_only=active_only
        )

        # Assemble hourly totals
        assemble_hourly_totals = _get_assemble_hourly_totals(
            production_line=line,
            target_date=date,
            line_target=line_target,
            order_id=order_id,
            style_id=style_id,
            buyer_id=buyer_id,
            size=size,
            color=color,
            active_only=active_only,
        )

        work_hours_int = int(work_hours or 0) or 8
        assemble_hourly_totals = list(assemble_hourly_totals or [])
        if len(assemble_hourly_totals) < work_hours_int:
            assemble_hourly_totals += [0] * (work_hours_int - len(assemble_hourly_totals))
        else:
            assemble_hourly_totals = assemble_hourly_totals[:work_hours_int]

        output_hourly_totals = [int(r.get("output") or 0) for r in (hourly_data or [])]
        if len(output_hourly_totals) < work_hours_int:
            output_hourly_totals += [0] * (work_hours_int - len(output_hourly_totals))
        else:
            output_hourly_totals = output_hourly_totals[:work_hours_int]

        per_hour_target = _per_hour_target(line_target)

        parts_hourly_data = [
            row for row in (parts_hourly_data or [])
            if row.get("part") not in ("Assemble Total", "Output Total")
        ]

        parts_hourly_data.append({"part": "Assemble Total", "target": per_hour_target, "hours": assemble_hourly_totals})
        parts_hourly_data.append({"part": "Output Total", "target": per_hour_target, "hours": output_hourly_totals})

        # Quality rows + end defects
        hourly_quality_rows = _get_hourly_quality_rows(
            line, date, line_target, order_id, style_id, buyer_id, size, color, active_only=active_only
        )
        end_line_defects = _get_end_line_defects(
            line, date, order_id, style_id, buyer_id, size, color, active_only=active_only
        )

        # KPI calc
        efficiency = _calculate_efficiency(line, date, line_target, pass_qty)
        total_qc = int(qc_stats.get("total_qc_completed", 0) or 0)
        rejection_pct = (Decimal(rejected_qty) / Decimal(total_qc) * 100) if total_qc else Decimal(0)

        if range_mode and date_from and date_to:
            dhu_pct = _calculate_dhu_range(line, start_dt, end_dt, order_id, style_id, buyer_id, size, color, active_only=active_only)
        else:
            dhu_pct = _calculate_dhu(line, date, order_id, style_id, buyer_id, size, color, active_only=active_only)

        data.append(
            {
                "production_line_id": line.id,
                "production_line_name": line.name,

                # WIP SUMMARY (Pending+New)
                "total_input": int(total_input_upto),
                "total_output": int(total_output_current),
                "line_wip": int(line_wip_calc),

                # Backward compat
                "todays_loading": int(total_input_upto),

                # other KPIs
                "target_qty": target_qty,
                "pass_qty": pass_qty,
                "rework_qty": rework_qty,
                "rejected_qty": rejected_qty,

                "efficiency_percentage": round(efficiency, 2),
                "rejection_percentage": round(rejection_pct, 2),
                "dhu_percentage": round(dhu_pct, 2),

                "work_hours": int(work_hours),
                "hourly_data": hourly_data,

                "part_inventory": part_inventory,
                "parts_hourly_data": parts_hourly_data,
                "assemble_hourly_totals": assemble_hourly_totals,
                "hourly_quality_rows": hourly_quality_rows,
                "end_line_defects": end_line_defects,
                "qc_stats": qc_stats,

                # Optional debug
                "total_output_upto": int(total_output_upto),
            }
        )

    return data