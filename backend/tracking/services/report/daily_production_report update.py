from __future__ import annotations

from typing import List, Dict, Any, Optional
from datetime import date

import pendulum
from django.db.models import Q, Count

from common.utils.time import today, day_range
from tracking.models import ProductionLine, Order, QualityCheck
from tracking.models.constants import LineType, GarmentStatus
from tracking.models.constants import QualityCheckStatus


# ----------------------------
# Helpers
# ----------------------------

def _apply_active_only_by_delivery(qs, delivery_field_path: str, active_only: bool = True):
    """
    active_only=True হলে delivered/shipped (delivery_date <= today) order hide হবে।
    delivery_field_path example:
      - "delivery_date"
      - "primary_bundle__order__delivery_date"
      - "garment__primary_bundle__order__delivery_date"
    """
    if not active_only:
        return qs

    t = today()  # Dhaka date helper
    return qs.filter(
        Q(**{f"{delivery_field_path}__isnull": True}) |
        Q(**{f"{delivery_field_path}__gt": t})
    )


# ----------------------------
# MAIN
# ----------------------------

def get_daily_production_report_data(
    report_date: Optional[date] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    production_line_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    style_id: Optional[int] = None,
    order_id: Optional[int] = None,
    production_line_ids: Optional[List[int]] = None,
    buyer_ids: Optional[List[int]] = None,
    style_ids: Optional[List[int]] = None,
    order_ids: Optional[List[int]] = None,
    sizes: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    active_only: bool = True,  # ✅ NEW
) -> List[Dict[str, Any]]:
    """
    Generate daily production report data for all sewing lines.

    ✅ active_only=True হলে:
      - Order.delivery_date <= today() হলে report থেকে hide হবে
      - (UI filter দিয়ে active_only=False পাঠালে পুরনো/শিপড order দেখা যাবে)
    """
    if report_date is None:
        report_date = today()

    # Sewing lines
    lines_qs = ProductionLine.objects.filter(line_type=LineType.SEWING)
    if production_line_id:
        lines_qs = lines_qs.filter(id=production_line_id)
    elif production_line_ids:
        lines_qs = lines_qs.filter(id__in=production_line_ids)

    # Orders base queryset
    orders_qs = Order.objects.select_related(
        "style__buyer", "style__season", "size", "color"
    ).prefetch_related("bundles", "garments", "part_inventories")

    # ✅ Active-only by Order.delivery_date
    orders_qs = _apply_active_only_by_delivery(orders_qs, "delivery_date", active_only)

    # Order filters
    if buyer_id:
        orders_qs = orders_qs.filter(style__buyer_id=buyer_id)
    elif buyer_ids:
        orders_qs = orders_qs.filter(style__buyer_id__in=buyer_ids)

    if style_id:
        orders_qs = orders_qs.filter(style_id=style_id)
    elif style_ids:
        orders_qs = orders_qs.filter(style_id__in=style_ids)

    if order_id:
        orders_qs = orders_qs.filter(id=order_id)
    elif order_ids:
        orders_qs = orders_qs.filter(id__in=order_ids)

    if sizes:
        orders_qs = orders_qs.filter(size__name__in=sizes)

    if colors:
        orders_qs = orders_qs.filter(color__name__in=colors)

    # Date range filters (order created date based)
    if date_from:
        orders_qs = orders_qs.filter(created_at__date__gte=date_from)
    if date_to:
        orders_qs = orders_qs.filter(created_at__date__lte=date_to)

    report_data: List[Dict[str, Any]] = []

    for line in lines_qs:
        # Orders that have activity on this line (bundles/garments/part inventory)
        line_orders = orders_qs.filter(
            Q(bundles__assigned_sewing_line=line)
            | Q(garments__sewing_line=line)
            | Q(part_inventories__production_line=line)
        ).distinct()

        line_report = {
            "production_line_id": line.id,
            "production_line_name": line.name,
            "orders": [],
        }

        for order in line_orders:
            order_data = _calculate_order_metrics(
                order=order,
                production_line=line,
                report_date=report_date,
                active_only=active_only,  # ✅ pass-through
            )
            if order_data:
                line_report["orders"].append(order_data)

        if line_report["orders"]:
            report_data.append(line_report)

    return report_data


def _calculate_order_metrics(
    order: Order,
    production_line: ProductionLine,
    report_date: date,
    active_only: bool = True,  # ✅ NEW
) -> Optional[Dict[str, Any]]:
    """Calculate all metrics for a single order on a production line for the report date."""

    # ✅ extra safety: active-only by delivery_date here too
    if active_only:
        dd = getattr(order, "delivery_date", None)
        if dd is not None and dd <= today():
            return None

    day_start, day_end = day_range(report_date)

    # Garments for this order on this line
    has_bundle_activity = order.bundles.filter(
    assigned_sewing_line=production_line
    ).exists()

    has_garment_activity = order.garments.filter(
        sewing_line=production_line
    ).exists()

    if not has_bundle_activity and not has_garment_activity:
        return None

    base_data = {
        "line": production_line.name,
        "buyer": order.style.buyer.name if getattr(order, "style", None) and getattr(order.style, "buyer", None) else None,
        "style": order.style.name if getattr(order, "style", None) else None,
        "order_quantity": order.quantity,
        "delivery_date": getattr(order, "delivery_date", None),  # ✅ include for UI
        "working_hours": 8.0,
        "working_days": 1,
    }

    input_data = _get_input_metrics(
    order,
    production_line,
    day_start,
    day_end,
    active_only=active_only,
    )
    input_total = int(input_data.get("cumulative", 0) or 0)

    parts_data = _get_parts_production(order, production_line, report_date, active_only=active_only)
    assembly_data = _get_assembly_metrics(order, production_line, day_start, day_end, active_only=active_only)
    output_data = _get_output_metrics(order, production_line, day_start, day_end, active_only=active_only)
    dhu_data = _get_dhu_metrics(order, production_line, day_start, day_end, active_only=active_only)
    inspection_data = _get_inspection_metrics(order, production_line, day_start, day_end, active_only=active_only)

    result = {
        **base_data,
        "input": input_total,
        **parts_data,
        **assembly_data,
        **output_data,
        **dhu_data,
        **inspection_data,
    }

    # ✅ Optional: hide fully packed orders (keep as extra protection)
    packed_cumm = (result.get("packed") or {}).get("cumulative", 0) or 0
    if packed_cumm >= (order.quantity or 0):
        return None

    return result


# ----------------------------
# Metrics
# ----------------------------

def _normalize_part_name(name: str) -> str:
    return str(name or "").strip().lower()


def _get_required_parts_for_order(order) -> Optional[List[str]]:
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


def _get_input_metrics(
    order: Order,
    production_line: ProductionLine,
    day_start: pendulum.DateTime,
    day_end: pendulum.DateTime,
    active_only: bool = True,
) -> Dict[str, int]:

    # DAILY bundles
    daily_bundles = order.bundles.filter(
        assigned_sewing_line=production_line,
        issued_at__range=(day_start, day_end),
    ).select_related("part")

    daily_bundles = _apply_active_only_by_delivery(
        daily_bundles, "order__delivery_date", active_only
    )

    # CUMULATIVE bundles
    cumulative_bundles = order.bundles.filter(
        assigned_sewing_line=production_line,
        issued_at__lte=day_end,
    ).select_related("part")

    cumulative_bundles = _apply_active_only_by_delivery(
        cumulative_bundles, "order__delivery_date", active_only
    )

    def calc_input(bundles):
        part_totals = {}

        for b in bundles:
            part_name = _normalize_part_name(getattr(getattr(b, "part", None), "name", ""))
            if not part_name:
                continue

            qty = int(getattr(b, "garment_quantity", 0) or 0)
            part_totals[part_name] = part_totals.get(part_name, 0) + qty

        required_parts = _get_required_parts_for_order(order)

        if required_parts:
            keys = [_normalize_part_name(p) for p in required_parts]
            matched = [part_totals[k] for k in keys if k in part_totals]
            return min(matched) if matched else 0

        return max(part_totals.values(), default=0)

    return {
        "day": calc_input(daily_bundles),
        "cumulative": calc_input(cumulative_bundles),
    }



def _get_parts_production(
    order: Order, production_line: ProductionLine, report_date: date, active_only: bool = True
) -> Dict[str, Dict[str, int]]:
    day_start, day_end = day_range(report_date)
    parts = order.style.parts.all()
    parts_data = {}

    for part in parts:
        daily_bundles = order.bundles.filter(
            part=part,
            assigned_sewing_line=production_line,
            completed_at__range=(day_start, day_end),
        )
        daily_bundles = _apply_active_only_by_delivery(
            daily_bundles, "order__delivery_date", active_only
        )

        cumulative_bundles = order.bundles.filter(
            part=part,
            assigned_sewing_line=production_line,
            completed_at__lte=day_end,
        )
        cumulative_bundles = _apply_active_only_by_delivery(
            cumulative_bundles, "order__delivery_date", active_only
        )

        daily_qty = sum(int(getattr(b, "garment_quantity", 0) or 0) for b in daily_bundles)
        cumulative_qty = sum(int(getattr(b, "garment_quantity", 0) or 0) for b in cumulative_bundles)

        part_key = str(part.name).lower().replace(" ", "_")
        parts_data[part_key] = {"day": daily_qty, "cumulative": cumulative_qty}

    return parts_data

def _get_assembly_metrics(
    order: Order,
    production_line: ProductionLine,
    day_start: pendulum.DateTime,
    day_end: pendulum.DateTime,
    active_only: bool = True,
) -> Dict[str, Dict[str, int]]:
    """Assembly input metrics."""
    daily_input = order.garments.filter(
        sewing_line=production_line,
        issued_for_assembly_at__range=(day_start, day_end),
    )
    daily_input = _apply_active_only_by_delivery(daily_input, "primary_bundle__order__delivery_date", active_only)

    cumulative_input = order.garments.filter(
        sewing_line=production_line,
        issued_for_assembly_at__lte=day_end,
    )
    cumulative_input = _apply_active_only_by_delivery(cumulative_input, "primary_bundle__order__delivery_date", active_only)

    return {
        "assembly_input": {
            "day": daily_input.count(),
            "cumulative": cumulative_input.count(),
        }
    }


def _get_output_metrics(
    order: Order,
    production_line: ProductionLine,
    day_start: pendulum.DateTime,
    day_end: pendulum.DateTime,
    active_only: bool = True,
) -> Dict[str, Dict[str, int]]:
    """
    Output metrics based on latest QC per garment.
    Daily output = garments whose latest QC within the day is PASS.
    Cumulative output = garments whose latest QC upto day_end is PASS.
    """

    # -------------------------
    # Daily output
    # -------------------------
    daily_garments = order.garments.filter(
        sewing_line=production_line,
        quality_checks__created_at__range=(day_start, day_end),
    ).distinct()

    daily_garments = _apply_active_only_by_delivery(
        daily_garments,
        "primary_bundle__order__delivery_date",
        active_only,
    )

    daily_pass = 0
    for g in daily_garments:
        latest_qc = g.quality_checks.filter(
            created_at__range=(day_start, day_end)
        ).order_by("-created_at").first()

        if latest_qc and latest_qc.status == QualityCheckStatus.PASS:
            daily_pass += 1

    # -------------------------
    # Cumulative output
    # -------------------------
    cumulative_garments = order.garments.filter(
        sewing_line=production_line,
        quality_checks__created_at__lte=day_end,
    ).distinct()

    cumulative_garments = _apply_active_only_by_delivery(
        cumulative_garments,
        "primary_bundle__order__delivery_date",
        active_only,
    )

    cumulative_pass = 0
    for g in cumulative_garments:
        latest_qc = g.quality_checks.filter(
            created_at__lte=day_end
        ).order_by("-created_at").first()

        if latest_qc and latest_qc.status == QualityCheckStatus.PASS:
            cumulative_pass += 1

    return {
        "output": {
            "day": daily_pass,
            "cumulative": cumulative_pass,
        }
    }

def _get_dhu_metrics(
    order: Order,
    production_line: ProductionLine,
    day_start: pendulum.DateTime,
    day_end: pendulum.DateTime,
    active_only: bool = True,
) -> Dict[str, float]:
    """DHU (Defect per Hundred Units)."""
    daily_qc_garments = order.garments.filter(
        sewing_line=production_line,
        quality_checks__created_at__range=(day_start, day_end),
    ).distinct()
    daily_qc_garments = _apply_active_only_by_delivery(daily_qc_garments, "primary_bundle__order__delivery_date", active_only)

    cumulative_qc_garments = order.garments.filter(
        sewing_line=production_line,
        quality_checks__created_at__lte=day_end,
    ).distinct()
    cumulative_qc_garments = _apply_active_only_by_delivery(cumulative_qc_garments, "primary_bundle__order__delivery_date", active_only)

    daily_inspected = daily_qc_garments.count()
    daily_defects = (
        QualityCheck.objects.filter(
            garment__in=daily_qc_garments,
            created_at__range=(day_start, day_end),
        ).aggregate(total_defects=Count("defects"))["total_defects"] or 0
    )
    daily_dhu = (daily_defects / daily_inspected * 100) if daily_inspected > 0 else 0

    cumulative_inspected = cumulative_qc_garments.count()
    cumulative_defects = (
        QualityCheck.objects.filter(
            garment__in=cumulative_qc_garments,
            created_at__lte=day_end,
        ).aggregate(total_defects=Count("defects"))["total_defects"] or 0
    )
    average_dhu = (cumulative_defects / cumulative_inspected * 100) if cumulative_inspected > 0 else 0

    return {"dhu_day": round(daily_dhu, 2), "dhu_average": round(average_dhu, 2)}


def _get_inspection_metrics(
    order: Order,
    production_line: ProductionLine,
    day_start: pendulum.DateTime,
    day_end: pendulum.DateTime,
    active_only: bool = True,
) -> Dict[str, Dict[str, int]]:
    """Inspection + Packing metrics."""
    daily_inspection = order.garments.filter(
        sewing_line=production_line,
        quality_checks__created_at__range=(day_start, day_end),
    ).distinct()
    daily_inspection = _apply_active_only_by_delivery(daily_inspection, "primary_bundle__order__delivery_date", active_only)

    cumulative_inspection = order.garments.filter(
        sewing_line=production_line,
        quality_checks__created_at__lte=day_end,
    ).distinct()
    cumulative_inspection = _apply_active_only_by_delivery(cumulative_inspection, "primary_bundle__order__delivery_date", active_only)

    daily_packed = order.garments.filter(
        sewing_line=production_line,
        status=GarmentStatus.FINISHING_QC_PASS,
        finishing_completed_at__range=(day_start, day_end),
    )
    daily_packed = _apply_active_only_by_delivery(daily_packed, "primary_bundle__order__delivery_date", active_only)

    cumulative_packed = order.garments.filter(
        sewing_line=production_line,
        status=GarmentStatus.FINISHING_QC_PASS,
        finishing_completed_at__lte=day_end,
    )
    cumulative_packed = _apply_active_only_by_delivery(cumulative_packed, "primary_bundle__order__delivery_date", active_only)

    return {
        "inspection": {"day": daily_inspection.count(), "cumulative": cumulative_inspection.count()},
        "packed": {"day": daily_packed.count(), "cumulative": cumulative_packed.count()},
    }