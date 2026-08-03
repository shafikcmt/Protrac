from __future__ import annotations

import logging
import time
from typing import List, Dict, Any, Optional
from datetime import date

from django.db.models import Q, Count, Sum
from django.db.models.functions import TruncDate

from common.utils.time import today, day_range
from tracking.models import (
    ProductionLine,
    Order,
    Bundle,
    Garment,
    PartInventory,
    QualityCheck,
    LineStyleCompletion,
    LineTarget,
)
from tracking.models.constants import LineType, GarmentStatus
from tracking.models.constants import QualityCheckStatus
from tracking.models import Scan as TrackingScan
from tracking.services.line_visibility import (
    pending_quantity,
    remaining_against_order_quantity,
    get_completed_order_ids,
)


logger = logging.getLogger("tracking.reports.daily_production")


# ----------------------------
# Helpers
# ----------------------------

def _should_apply_active_only(report_date: date) -> bool:
    """
    Apply delivery-date active filter only for today's report.

    Rules:
      - today report     -> hide expired/null delivery orders
      - previous report  -> show all matching data
    """
    return report_date == today()


def _apply_active_only_by_delivery(
    qs,
    delivery_field_path: str,
    cutoff_date: date,
    active_only: bool = True,
):
    """
    active_only=True হলে শুধু valid/current/future delivery_date order দেখাবে।

    Exclude:
      - delivery_date < cutoff_date
    """
    if not active_only:
        return qs

    # Null delivery_date = no deadline entered yet → treat as still-active
    # (include it). Only orders whose delivery_date has *clearly* passed
    # (strictly before the cutoff) are excluded as finished/delivered.
    #
    # The cutoff day itself is INCLUDED: a delivery date is a deadline, not an
    # exclusion date. An order due today is still being sewn today — dropping it
    # made whole lines vanish from the report on the exact day they were running
    # flat out (observed on Sewing-5: 28 active-style orders all due that day,
    # 38 garments QC-passed, line absent from the report entirely).
    return qs.filter(
        Q(**{f"{delivery_field_path}__isnull": True})
        | Q(**{f"{delivery_field_path}__gte": cutoff_date})
    )


def _normalize_part_name(name: str) -> str:
    return str(name or "").strip().lower()


def _get_required_parts_for_order(order) -> Optional[List[str]]:
    """Return the list of part names required by the order's style (if any)."""
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
    active_only: bool = True,
    include_hidden: bool = False,
) -> List[Dict[str, Any]]:
    """
    Generate daily production report data for all sewing lines.

    Behavior:
      - Today's report   -> expired/null delivery orders hidden
      - Past date report -> all matching orders shown
      - include_hidden   -> manually-completed (hidden) rows are returned too,
        flagged with is_hidden=True and their completion_id so the UI can offer
        an "Unhide" action. Hidden rows are always excluded from summary totals
        (see api._generate_summary), regardless of this flag.

    Performance: metrics are bulk-aggregated per line (a handful of grouped
    queries each) instead of issuing per-order / per-part queries, removing the
    previous N+1 explosion.
    """
    started_at = time.perf_counter()

    if report_date is None:
        report_date = today()

    # Apply delivery filter only for current/today report
    active_only = active_only and _should_apply_active_only(report_date)

    # Sewing lines only. Daily Production Report covers sewing lines exclusively;
    # cutting/finishing lines are never processed here. Any caller-supplied line
    # ids are intersected with sewing lines, so non-sewing ids are ignored.
    lines_qs = ProductionLine.objects.filter(line_type=LineType.SEWING)

    if production_line_id:
        lines_qs = lines_qs.filter(id=production_line_id)
    elif production_line_ids:
        lines_qs = lines_qs.filter(id__in=production_line_ids)

    # Orders base queryset (lightweight: select_related for all scalar relations
    # rendered in the response, prefetch style parts used by input/parts metrics).
    orders_qs = (
        Order.objects.select_related(
            "style",
            "style__buyer",
            "style__season",
            "size",
            "color",
        )
        .prefetch_related("style__parts")
    )

    # Only today's report should hide expired delivery orders
    orders_qs = _apply_active_only_by_delivery(
        orders_qs,
        "delivery_date",
        report_date,
        active_only,
    )

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

    day_start, day_end = day_range(report_date)

    report_data: List[Dict[str, Any]] = []
    lines_processed = 0
    orders_processed = 0

    for line in lines_qs:
        # Orders with any activity on this line. Resolve the candidate order ids
        # from three cheap, indexed lookups and union them in Python instead of
        # a single DISTINCT query that OR-joins bundles x garments x
        # part_inventories (which explodes into a huge intermediate result set).
        bundle_activity = set(
            Bundle.objects.filter(assigned_sewing_line=line)
            .values_list("order_id", flat=True)
            .distinct()
        )
        garment_activity = set(
            Garment.objects.filter(sewing_line=line)
            .order_by()
            .values_list("order_id", flat=True)
            .distinct()
        )
        part_inventory_orders = set(
            PartInventory.objects.filter(production_line=line)
            .values_list("order_id", flat=True)
            .distinct()
        )
        bundle_activity.discard(None)
        garment_activity.discard(None)

        candidate_ids = bundle_activity | garment_activity | part_inventory_orders
        candidate_ids.discard(None)

        # Apply the order-level filters (delivery/buyer/style/order/size/color).
        line_orders = (
            list(orders_qs.filter(id__in=candidate_ids)) if candidate_ids else []
        )

        # A line with nothing to report is emitted with an empty `orders` list
        # rather than skipped — see the append at the end of this loop.
        if not line_orders:
            report_data.append(
                {
                    "production_line_id": line.id,
                    "production_line_name": line.name,
                    "orders": [],
                }
            )
            continue

        lines_processed += 1
        order_ids_on_line = [o.id for o in line_orders]

        # Preload orders marked complete on this line — manually by an operator or
        # automatically when a new style superseded them (single source of truth
        # in line_visibility). A completion only takes effect the day *after* it
        # was recorded, so the day it was made still reports the real scan data;
        # see line_visibility.get_completed_order_ids.
        #
        # This MUST stay above the active-order election below: a completed style
        # is finished on the line and cannot be what the line is currently running.
        completed_order_ids = get_completed_order_ids(
            line, as_of_date=report_date
        ) & set(order_ids_on_line)

        # Determine the active order: order with the most recently issued bundle
        # on this line. Direct Bundle query (no per-order annotate/first).
        #
        # Completed orders are excluded. Without that, a style that was marked
        # complete but still has the line's newest issued bundle wins this election
        # while being dropped from the rendered rows below — so every *other* style
        # on the line is judged "an older style pending transition" against a style
        # that never appears in the report. That inverted Sewing-3: 799225, the
        # style actually running, was flagged as the leftover of 792566, which had
        # been manually completed three days earlier.
        election_order_ids = [
            oid for oid in order_ids_on_line if oid not in completed_order_ids
        ]
        active_order_id = (
            Bundle.objects.filter(
                assigned_sewing_line=line,
                issued_at__isnull=False,
                issued_at__lte=day_end,
                order_id__in=election_order_ids,
            )
            .order_by("-issued_at")
            .values_list("order_id", flat=True)
            .first()
            if election_order_ids
            else None
        )

        # When the caller asks to reveal hidden rows, map each completed order on
        # this line to its LineStyleCompletion id so the row can carry a
        # completion_id (used by the UI's "Unhide" action). Mirrors the as-of-date
        # guard used by get_completed_order_ids — strictly before report_date — so
        # a row is never offered an "Unhide" action on a date where it is not
        # actually hidden.
        completion_id_by_order: Dict[int, int] = {}
        if include_hidden and completed_order_ids:
            comp_qs = LineStyleCompletion.objects.filter(
                production_line=line, order_id__in=completed_order_ids
            )
            if report_date is not None:
                comp_qs = comp_qs.filter(created_at__date__lt=report_date)
            completion_id_by_order = dict(comp_qs.values_list("order_id", "id"))

        # Style of the currently-active order. A "pending transition" is only a
        # *different style* still finishing while this newer style runs — sibling
        # sizes/colors of the active style are part of the same active run and
        # must not be flagged.
        active_style_id = next(
            (o.style_id for o in line_orders if o.id == active_order_id), None
        )
        # Name of the newer/active style, surfaced on pending-transition rows so
        # the UI can name it explicitly ("... while <new style> has started").
        active_style_name = next(
            (
                o.style.name
                for o in line_orders
                if o.id == active_order_id and getattr(o, "style", None)
            ),
            None,
        )

        # Work hours come from the line's target for the selected date. When no
        # target is configured the Hrs column shows "-" (None here), rather than
        # a misleading hardcoded default.
        line_work_hours = (
            LineTarget.objects.filter(line=line, date=report_date)
            .values_list("work_hours", flat=True)
            .first()
        )

        metrics = _aggregate_line_metrics(
            line=line,
            order_ids=order_ids_on_line,
            day_start=day_start,
            day_end=day_end,
            bundle_activity=bundle_activity,
            garment_activity=garment_activity,
        )

        line_report = {
            "production_line_id": line.id,
            "production_line_name": line.name,
            "orders": [],
        }

        for order in line_orders:
            order_data = _build_order_row(
                order=order,
                line=line,
                report_date=report_date,
                active_only=active_only,
                active_order_id=active_order_id,
                active_style_id=active_style_id,
                active_style_name=active_style_name,
                completed_order_ids=completed_order_ids,
                metrics=metrics,
                line_work_hours=line_work_hours,
                include_hidden=include_hidden,
                completion_id_by_order=completion_id_by_order,
            )
            if order_data:
                line_report["orders"].append(order_data)
                orders_processed += 1

        # Always emit the line, even with zero qualifying rows. A line that is
        # idle, or whose rows were all filtered out, must be *visibly* empty
        # rather than silently absent — a missing line is indistinguishable from
        # a bug, which is exactly how the Sewing-5 delivery-date defect stayed
        # hidden. Consumers that need "lines with data" filter on orders being
        # non-empty (see _generate_summary).
        report_data.append(line_report)

    elapsed_ms = (time.perf_counter() - started_at) * 1000
    logger.info(
        "daily_production_report report_date=%s active_only=%s "
        "lines_processed=%d orders_processed=%d elapsed_ms=%.1f",
        report_date,
        active_only,
        lines_processed,
        orders_processed,
        elapsed_ms,
    )

    return report_data


# ----------------------------
# Bulk aggregation (per line)
# ----------------------------

def _aggregate_line_metrics(
    line: ProductionLine,
    order_ids: List[int],
    day_start,
    day_end,
    bundle_activity: set,
    garment_activity: set,
) -> Dict[str, Dict[int, Any]]:
    """
    Compute every metric for all orders on a single line using a small fixed
    number of grouped aggregate queries (instead of per-order/per-part queries).

    Returns a dict of metric-name -> {order_id: value}. Orders with no rows for
    a metric are simply absent and default to 0 when read.

    `bundle_activity` / `garment_activity` are the precomputed sets of order ids
    with bundle / garment activity on this line (reused from the caller).
    """
    day_filter_kwargs = {"range": (day_start, day_end)}

    # --- Working days: distinct dates with *actual* production activity per
    # order (bundle input OR sewing-QC output). A day with no activity is not
    # counted. Date sets are unioned in Python so a day with both input and
    # output is counted once. Bounded to <= day_end so past-date reports stay
    # accurate for the selected date. ---
    working_day_dates: Dict[int, set] = {}
    for row in (
        Bundle.objects.filter(
            assigned_sewing_line=line,
            order_id__in=order_ids,
            issued_at__isnull=False,
            issued_at__lte=day_end,
        )
        .order_by()
        .values("order_id")
        .annotate(d=TruncDate("issued_at"))
        .values("order_id", "d")
        .distinct()
    ):
        if row["d"] is not None:
            working_day_dates.setdefault(row["order_id"], set()).add(row["d"])

    for row in (
        TrackingScan.objects.filter(
            garment__order_id__in=order_ids,
            garment__sewing_line=line,
            scanner__scanner_type="sewing_qc_check",
            scanner__production_line=line,
            created_at__lte=day_end,
        )
        .order_by()
        .values("garment__order_id")
        .annotate(d=TruncDate("created_at"))
        .values("garment__order_id", "d")
        .distinct()
    ):
        if row["d"] is not None:
            working_day_dates.setdefault(row["garment__order_id"], set()).add(row["d"])

    working_days: Dict[int, int] = {
        oid: len(dates) for oid, dates in working_day_dates.items()
    }

    # --- Input: issued bundle garment_quantity grouped by (order, part) ---
    # order_id -> { normalized_part_name: {"day": int, "cumulative": int} }
    input_by_order: Dict[int, Dict[str, Dict[str, int]]] = {}
    for row in (
        Bundle.objects.filter(
            assigned_sewing_line=line,
            order_id__in=order_ids,
            issued_at__isnull=False,
            issued_at__lte=day_end,
        )
        .order_by()
        .values("order_id", "part__name")
        .annotate(
            day=Sum("garment_quantity", filter=Q(issued_at__range=(day_start, day_end))),
            cumulative=Sum("garment_quantity"),
        )
    ):
        part_name = _normalize_part_name(row["part__name"])
        if not part_name:
            continue
        bucket = input_by_order.setdefault(row["order_id"], {})
        bucket[part_name] = {
            "day": int(row["day"] or 0),
            "cumulative": int(row["cumulative"] or 0),
        }

    # --- Parts production: completed bundle qty grouped by (order, part) ---
    # order_id -> { part_id: {"day": int, "cumulative": int} }
    parts_by_order: Dict[int, Dict[int, Dict[str, int]]] = {}
    for row in (
        Bundle.objects.filter(
            assigned_sewing_line=line,
            order_id__in=order_ids,
            completed_at__lte=day_end,
        )
        .order_by()
        .values("order_id", "part_id")
        .annotate(
            day=Sum("garment_quantity", filter=Q(completed_at__range=(day_start, day_end))),
            cumulative=Sum("garment_quantity"),
        )
    ):
        bucket = parts_by_order.setdefault(row["order_id"], {})
        bucket[row["part_id"]] = {
            "day": int(row["day"] or 0),
            "cumulative": int(row["cumulative"] or 0),
        }

    # --- Assembly input: garments issued for assembly grouped by order ---
    assembly_by_order = _count_by_order(
        Garment.objects.filter(
            sewing_line=line,
            order_id__in=order_ids,
            issued_for_assembly_at__lte=day_end,
        ),
        "order_id",
        day_field="issued_for_assembly_at",
        day_range_value=day_filter_kwargs["range"],
    )

    # --- Output: distinct garments passed sewing QC (qc pass) ---
    output_by_order = _distinct_garments_by_order(
        TrackingScan.objects.filter(
            garment__order_id__in=order_ids,
            garment__sewing_line=line,
            scanner__scanner_type="sewing_qc_check",
            scanner__production_line=line,
            created_at__lte=day_end,
            garment__quality_checks__status=QualityCheckStatus.PASS,
        ),
        order_path="garment__order_id",
        day_range_value=day_filter_kwargs["range"],
    )

    # --- Inspection: distinct garments scanned at sewing QC (any result) ---
    inspection_by_order = _distinct_garments_by_order(
        TrackingScan.objects.filter(
            garment__order_id__in=order_ids,
            garment__sewing_line=line,
            scanner__scanner_type="sewing_qc_check",
            scanner__production_line=line,
            created_at__lte=day_end,
        ),
        order_path="garment__order_id",
        day_range_value=day_filter_kwargs["range"],
    )

    # --- Packed: garments that passed finishing QC ---
    packed_by_order = _count_by_order(
        Garment.objects.filter(
            sewing_line=line,
            order_id__in=order_ids,
            status=GarmentStatus.FINISHING_QC_PASS,
            finishing_completed_at__lte=day_end,
        ),
        "order_id",
        day_field="finishing_completed_at",
        day_range_value=day_filter_kwargs["range"],
    )

    # --- DHU: inspected garments + defect counts (day & cumulative) ---
    inspected_by_order: Dict[int, Dict[str, int]] = {}
    for row in (
        Garment.objects.filter(
            sewing_line=line,
            order_id__in=order_ids,
            quality_checks__created_at__lte=day_end,
        )
        .order_by()
        .values("order_id")
        .annotate(
            day=Count(
                "id",
                distinct=True,
                filter=Q(quality_checks__created_at__range=(day_start, day_end)),
            ),
            cumulative=Count("id", distinct=True),
        )
    ):
        inspected_by_order[row["order_id"]] = {
            "day": int(row["day"] or 0),
            "cumulative": int(row["cumulative"] or 0),
        }

    defects_by_order: Dict[int, Dict[str, int]] = {}
    for row in (
        QualityCheck.objects.filter(
            garment__sewing_line=line,
            garment__order_id__in=order_ids,
            created_at__lte=day_end,
        )
        .order_by()
        .values("garment__order_id")
        .annotate(
            day=Count("defects", filter=Q(created_at__range=(day_start, day_end))),
            cumulative=Count("defects"),
        )
    ):
        defects_by_order[row["garment__order_id"]] = {
            "day": int(row["day"] or 0),
            "cumulative": int(row["cumulative"] or 0),
        }

    return {
        "bundle_activity": bundle_activity,
        "garment_activity": garment_activity,
        "working_days": working_days,
        "input": input_by_order,
        "parts": parts_by_order,
        "assembly": assembly_by_order,
        "output": output_by_order,
        "inspection": inspection_by_order,
        "packed": packed_by_order,
        "inspected": inspected_by_order,
        "defects": defects_by_order,
    }


def _count_by_order(qs, order_path, day_field, day_range_value):
    """Group `qs` by order, returning {order_id: {"day", "cumulative"}} counts."""
    result: Dict[int, Dict[str, int]] = {}
    rows = qs.order_by().values(order_path).annotate(
        day=Count("id", filter=Q(**{f"{day_field}__range": day_range_value})),
        cumulative=Count("id"),
    )
    for row in rows:
        result[row[order_path]] = {
            "day": int(row["day"] or 0),
            "cumulative": int(row["cumulative"] or 0),
        }
    return result


def _distinct_garments_by_order(qs, order_path, day_range_value):
    """Group `qs` by order, counting distinct garments for day & cumulative."""
    result: Dict[int, Dict[str, int]] = {}
    rows = qs.order_by().values(order_path).annotate(
        day=Count(
            "garment_id",
            distinct=True,
            filter=Q(created_at__range=day_range_value),
        ),
        cumulative=Count("garment_id", distinct=True),
    )
    for row in rows:
        result[row[order_path]] = {
            "day": int(row["day"] or 0),
            "cumulative": int(row["cumulative"] or 0),
        }
    return result


# ----------------------------
# Per-order row assembly (reads from preloaded metrics, no queries)
# ----------------------------

def _build_order_row(
    order: Order,
    line: ProductionLine,
    report_date: date,
    active_only: bool,
    active_order_id: Optional[int],
    active_style_id: Optional[int],
    active_style_name: Optional[str],
    completed_order_ids: set,
    metrics: Dict[str, Dict[int, Any]],
    line_work_hours: Optional[int] = None,
    include_hidden: bool = False,
    completion_id_by_order: Optional[Dict[int, int]] = None,
) -> Optional[Dict[str, Any]]:
    """Assemble a single order's report row from preloaded line metrics."""

    oid = order.id

    # Only today's report excludes expired delivery dates.
    #
    # This MUST stay in step with _apply_active_only_by_delivery above, which is
    # the queryset-level half of the same rule. It previously diverged: the
    # queryset let NULL-delivery orders through and this check then dropped them,
    # so the documented "no deadline entered yet = still active" intent never
    # actually took effect. NULL is now kept in both halves.
    if active_only:
        dd = getattr(order, "delivery_date", None)
        if dd is not None and dd < report_date:
            return None

    # Manual completion hides the style on this line for the selected date and
    # everything after it (completed_order_ids is already scoped to completions
    # made on or before report_date). Applies to past-date reports too.
    #
    # When include_hidden is set, the row is still built but flagged is_hidden so
    # the UI can render it greyed-out with an "Unhide" action. Such rows bypass
    # the "completeness" drops below (fully-output / fully-packed) so a hidden
    # style is always revealed; they are excluded from summary totals by the API.
    is_hidden = oid in completed_order_ids
    if is_hidden and not include_hidden:
        return None

    has_bundle_activity = oid in metrics["bundle_activity"]
    has_garment_activity = oid in metrics["garment_activity"]
    if not has_bundle_activity and not has_garment_activity:
        return None

    # --- Input (cumulative is the response "input" value) ---
    input_part_totals = metrics["input"].get(oid, {})
    cumulative_input = _calc_input_value(order, input_part_totals, "cumulative")

    # --- Output ---
    output = metrics["output"].get(oid, {"day": 0, "cumulative": 0})
    cumulative_output = int(output.get("cumulative", 0) or 0)

    # NOTE: there is deliberately no completeness check here any more.
    #
    # This used to drop any row where input == output, with an `is_active_style`
    # exemption bolted on (commit e187b04) because the bare rule made a live run
    # vanish whenever its fed batch was momentarily caught up. Both the rule and
    # its exemption are gone: "this style is finished on this line" is now decided
    # at the moment a new style is assigned (or when late output catches up) and
    # recorded as an AUTO LineStyleCompletion, which the `is_hidden` check above
    # already honours. See tracking/services/line_completion.py.
    #
    # The practical difference: a style that is finished but has NOT been
    # superseded stays visible until something supersedes it or an operator marks
    # it complete. That is intended — a finished-looking style on the line that is
    # still running is exactly what must not disappear.

    # --- Parts production keyed by style part name ---
    parts_agg = metrics["parts"].get(oid, {})
    parts_data: Dict[str, Dict[str, int]] = {}
    for part in order.style.parts.all():
        part_key = str(part.name).lower().replace(" ", "_")
        vals = parts_agg.get(part.id, {"day": 0, "cumulative": 0})
        parts_data[part_key] = {
            "day": int(vals.get("day", 0) or 0),
            "cumulative": int(vals.get("cumulative", 0) or 0),
        }

    assembly = metrics["assembly"].get(oid, {"day": 0, "cumulative": 0})
    inspection = metrics["inspection"].get(oid, {"day": 0, "cumulative": 0})
    packed = metrics["packed"].get(oid, {"day": 0, "cumulative": 0})

    # --- DHU ---
    inspected = metrics["inspected"].get(oid, {"day": 0, "cumulative": 0})
    defects = metrics["defects"].get(oid, {"day": 0, "cumulative": 0})
    daily_inspected = int(inspected.get("day", 0) or 0)
    cumulative_inspected = int(inspected.get("cumulative", 0) or 0)
    daily_defects = int(defects.get("day", 0) or 0)
    cumulative_defects = int(defects.get("cumulative", 0) or 0)
    dhu_day = (daily_defects / daily_inspected * 100) if daily_inspected > 0 else 0
    dhu_average = (
        (cumulative_defects / cumulative_inspected * 100)
        if cumulative_inspected > 0
        else 0
    )

    packed_cumulative = int(packed.get("cumulative", 0) or 0)
    if packed_cumulative >= (order.quantity or 0) and not is_hidden:
        return None

    assembly_cumulative = int(assembly.get("cumulative", 0) or 0)
    parts_cumulative = sum(p["cumulative"] for p in parts_data.values())

    # As-of-date activity gate (date filter fix): only show a style on the
    # selected date if it had real production activity on or before that date.
    # Without this a style that only started *after* the selected date would
    # leak into a past-date report with all-zero metrics.
    cumulative_activity = (
        cumulative_input
        + cumulative_output
        + assembly_cumulative
        + parts_cumulative
        + cumulative_inspected
        + packed_cumulative
    )
    if cumulative_activity == 0:
        return None

    # Past-date reports must show only the styles that were actually active *on*
    # the selected date — i.e. had real input or output that day. Without this a
    # style that was merely in-progress (cumulative activity) on an earlier date
    # would leak into the report and mix records from multiple dates. Today's
    # report keeps its cumulative/in-progress view unchanged.
    if report_date != today():
        daily_input = _calc_input_value(order, input_part_totals, "day")
        daily_output = int(output.get("day", 0) or 0)
        if daily_input <= 0 and daily_output <= 0:
            return None

    is_active_order = oid == active_order_id

    # Two different quantities, deliberately not the same number:
    #
    #   pending_qty   — REPORTED. Work in progress on the floor: pieces fed into
    #                   the line that have not come out of sewing QC
    #                   (cumulative input − cumulative output).
    #   remaining_qty — GATE. Pieces of the ORDER still to run
    #                   (order quantity − cumulative output). Only this one may
    #                   drive flags/visibility.
    #
    # They must not be collapsed. Input arrives in batches over several days, so
    # a live style sits at pending_qty == 0 whenever its current batch is caught
    # up; gating on that is the query-time rule that made running lines vanish
    # (Sewing-5). See line_visibility.pending_quantity /
    # remaining_against_order_quantity.
    pending_qty = pending_quantity(cumulative_input, cumulative_output)
    remaining_qty = remaining_against_order_quantity(
        order.quantity, cumulative_output
    )

    # Pending alert (today only): this is an OLDER style on a line where a newer
    # style is now the active run (most recently issued bundle), and this older
    # style still has unfinished pieces. The newest/active style is never
    # flagged; sibling sizes/colors of the active style share its style id and
    # are also not flagged.
    is_pending_transition = bool(
        report_date == today()
        and active_style_id is not None
        and getattr(order, "style_id", None) != active_style_id
        and remaining_qty > 0
    )

    # "Mark Complete" is offered for a pending old style on the live (today)
    # report whose delivery date is still valid.
    needs_manual_complete = bool(
        is_pending_transition
        and active_only
        and not is_hidden
        and getattr(order, "delivery_date", None) is not None
        and order.delivery_date > report_date
    )

    remarks_parts: List[str] = []
    if is_pending_transition:
        # Both figures are spelled out because they answer different questions:
        # `pending` is what is on the floor now, `still to run` is what is left
        # of the order.
        remarks_parts.append(
            f"Old style pending: input {cumulative_input}, "
            f"output {cumulative_output}, pending {pending_qty} pcs "
            f"(order qty {order.quantity or 0}, {remaining_qty} still to run)"
        )
        remarks_parts.append("Newer style started on this line")
        if needs_manual_complete:
            remarks_parts.append("Manual completion required")
    remarks = " | ".join(remarks_parts)

    result = {
        "order_id": order.id,
        "production_line_id": line.id,
        "line": line.name,
        "buyer": (
            order.style.buyer.name
            if getattr(order, "style", None) and getattr(order.style, "buyer", None)
            else None
        ),
        "style": order.style.name if getattr(order, "style", None) else None,
        "size": getattr(getattr(order, "size", None), "name", None),
        "color": getattr(getattr(order, "color", None), "name", None),
        "order_quantity": order.quantity,
        "delivery_date": getattr(order, "delivery_date", None),
        "working_hours": (
            float(line_work_hours) if line_work_hours is not None else None
        ),
        "working_days": max(metrics["working_days"].get(oid, 0), 1),
        "input": cumulative_input,
        **parts_data,
        "assembly_input": {
            "day": int(assembly.get("day", 0) or 0),
            "cumulative": int(assembly.get("cumulative", 0) or 0),
        },
        "output": {
            "day": int(output.get("day", 0) or 0),
            "cumulative": cumulative_output,
        },
        "dhu_day": round(dhu_day, 2),
        "dhu_average": round(dhu_average, 2),
        "inspection": {
            "day": int(inspection.get("day", 0) or 0),
            "cumulative": int(inspection.get("cumulative", 0) or 0),
        },
        "packed": {
            "day": int(packed.get("day", 0) or 0),
            "cumulative": packed_cumulative,
        },
        "needs_manual_complete": needs_manual_complete,
        "is_pending_transition": is_pending_transition,
        "pending_quantity": pending_qty,
        "active_style_name": active_style_name if is_pending_transition else None,
        "remarks": remarks,
        "is_hidden": is_hidden,
        "completion_id": (
            (completion_id_by_order or {}).get(oid) if is_hidden else None
        ),
    }

    return result


def _calc_input_value(order, part_totals: Dict[str, Dict[str, int]], key: str) -> int:
    """
    Reproduce the original input rule:
      - if the style declares required parts, input = min of matched part totals
      - otherwise input = max across all part totals
    `part_totals` maps normalized part name -> {"day", "cumulative"}.
    """
    totals = {name: int(vals.get(key, 0) or 0) for name, vals in part_totals.items()}

    required_parts = _get_required_parts_for_order(order)
    if required_parts:
        keys = [_normalize_part_name(p) for p in required_parts]
        matched = [totals[k] for k in keys if k in totals]
        return min(matched) if matched else 0

    return max(totals.values(), default=0)
