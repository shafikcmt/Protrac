"""
Central source of truth for *active style / hide* logic on sewing lines.

A sewing line normally runs one active style/order at a time. When a new
style/order starts on a line, the previous one should disappear from every
operational view **once it is finished** — either because:

  * it was fully output (cumulative sewing input == cumulative sewing output), or
  * a user manually marked it complete on that line (``LineStyleCompletion``).

Historically this rule was re-implemented (slightly differently) in the daily
production report, the sewing kiosk dashboard, the heatmap and the assembly
scan screens. This module centralises the rule so every surface hides the same
orders. All callers should use:

  * :func:`is_style_complete`            — the pure rule (input vs output)
  * :func:`get_manual_completed_order_ids` — manual completions for a line
  * :func:`get_hidden_order_ids_for_line`  — manual ∪ auto-hidden, as of a date
  * :func:`get_inactive_order_ids_for_line` — hidden ∪ superseded-by-newer-style
    (Conditions 1+1b+2), for the scan surfaces + V3 (NOT the DPR)
  * :func:`get_inactive_order_ids_for_heatmap` — the above ∪ delivery-expired
    (Conditions 1+1b+2+3), for the heatmap surfaces ONLY

The functions are intentionally cheap (a small fixed number of grouped queries
per line) so they can be dropped into the existing per-line loops without
re-introducing N+1 queries.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Dict, Iterable, List, Optional, Tuple

from django.db.models import Count, Q, Sum

from common.utils.time import day_range, today
from tracking.models import (
    Bundle,
    LineStyleCompletion,
    Order,
    ProductionLine,
)
from tracking.models.constants import QualityCheckStatus
from tracking.models import Scan as TrackingScan


# ----------------------------
# Pure rule (single source of truth)
# ----------------------------

def is_style_complete(cumulative_input: int, cumulative_output: int) -> bool:
    """Return True when a style/order is finished on a line.

    A style is finished once every garment that was input to sewing has been
    output through sewing QC. ``>=`` (not ``==``) guards against rare cases
    where output bookkeeping slightly exceeds input.
    """
    return cumulative_input > 0 and cumulative_output >= cumulative_input


def pending_quantity(cumulative_input: int, cumulative_output: int) -> int:
    """Pending pieces still to be output for a style (never negative)."""
    return max(int(cumulative_input or 0) - int(cumulative_output or 0), 0)


# ----------------------------
# Shared input calculation (mirrors the daily production report rule)
# ----------------------------

def _normalize_part_name(name: Optional[str]) -> str:
    return str(name or "").strip().lower()


def get_required_parts_for_order(order) -> Optional[List[str]]:
    """Return the list of part names required by the order's style (if any)."""
    if not order:
        return None

    style = getattr(order, "style", None)
    if not style:
        return None

    rel = getattr(style, "parts", None)
    all_fn = getattr(rel, "all", None) if rel is not None else None
    if callable(all_fn):
        try:
            names = [str(p.name).strip() for p in all_fn() if getattr(p, "name", None)]
            if names:
                return names
        except Exception:
            pass
    return None


def calc_input_value(order, part_totals: Dict[str, int]) -> int:
    """Reproduce the report's input rule from {normalized_part_name: qty}.

    - if the style declares required parts -> input = min of matched part totals
    - otherwise -> input = max across all part totals
    """
    totals = {name: int(qty or 0) for name, qty in part_totals.items()}

    required = get_required_parts_for_order(order)
    if required:
        keys = [_normalize_part_name(p) for p in required]
        matched = [totals[k] for k in keys if k in totals]
        return min(matched) if matched else 0

    return max(totals.values(), default=0)


# ----------------------------
# Per-line input / output as of a date
# ----------------------------

def _as_of_day_end(as_of_date: Optional[date]) -> datetime:
    _start, end = day_range(as_of_date or today())
    return end


def compute_line_input_output(
    line: ProductionLine,
    orders: Iterable[Order],
    as_of_date: Optional[date] = None,
) -> Dict[int, Tuple[int, int]]:
    """Return {order_id: (cumulative_input, cumulative_output)} for ``line``.

    ``orders`` must be Order instances (used for the per-style required-part
    input rule). Values are cumulative up to the end of ``as_of_date``.
    """
    orders = list(orders)
    order_ids = [o.id for o in orders]
    if not order_ids:
        return {}

    day_end = _as_of_day_end(as_of_date)

    # Cumulative issued input grouped by (order, part).
    input_by_order: Dict[int, Dict[str, int]] = {}
    for row in (
        Bundle.objects.filter(
            assigned_sewing_line=line,
            order_id__in=order_ids,
            issued_at__isnull=False,
            issued_at__lte=day_end,
        )
        .order_by()
        .values("order_id", "part__name")
        .annotate(cumulative=Sum("garment_quantity"))
    ):
        name = _normalize_part_name(row["part__name"])
        if not name:
            continue
        input_by_order.setdefault(row["order_id"], {})[name] = int(row["cumulative"] or 0)

    # Cumulative output (distinct garments passed sewing QC) grouped by order.
    output_by_order: Dict[int, int] = {}
    for row in (
        TrackingScan.objects.filter(
            garment__order_id__in=order_ids,
            garment__sewing_line=line,
            scanner__scanner_type="sewing_qc_check",
            scanner__production_line=line,
            created_at__lte=day_end,
            garment__quality_checks__status=QualityCheckStatus.PASS,
        )
        .order_by()
        .values("garment__order_id")
        .annotate(c=Count("garment_id", distinct=True))
    ):
        output_by_order[row["garment__order_id"]] = int(row["c"] or 0)

    result: Dict[int, Tuple[int, int]] = {}
    for order in orders:
        cum_in = calc_input_value(order, input_by_order.get(order.id, {}))
        cum_out = int(output_by_order.get(order.id, 0) or 0)
        result[order.id] = (cum_in, cum_out)
    return result


# ----------------------------
# Hidden order ids
# ----------------------------

def get_manual_completed_order_ids(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
) -> set:
    """Order ids manually marked complete on ``line``.

    When ``as_of_date`` is given, only completions recorded on or before that
    date count — so historical (past-date) reports are not retroactively
    affected by a completion made later.
    """
    qs = LineStyleCompletion.objects.filter(production_line=line)
    if as_of_date is not None:
        qs = qs.filter(created_at__date__lte=as_of_date)
    return set(qs.values_list("order_id", flat=True))


def get_hidden_order_ids_for_line(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
    orders: Optional[Iterable[Order]] = None,
) -> set:
    """Return the set of order ids that must be hidden on ``line``.

    Hidden = manually completed (as of date) ∪ auto-completed (fully output as
    of date). Used by the secondary surfaces (kiosk v3, heatmap, assembly &
    sewing-QC scan) so a style hidden in the daily report is hidden everywhere.

    ``orders`` may be supplied to bound the auto-hide computation; when omitted
    it is derived from bundles issued on the line.
    """
    hidden = get_manual_completed_order_ids(line, as_of_date=as_of_date)

    if orders is None:
        line_order_ids = list(
            Bundle.objects.filter(assigned_sewing_line=line)
            .order_by()
            .values_list("order_id", flat=True)
            .distinct()
        )
        orders = list(
            Order.objects.filter(id__in=line_order_ids).prefetch_related("style__parts")
        )

    io = compute_line_input_output(line, orders, as_of_date=as_of_date)
    for oid, (cum_in, cum_out) in io.items():
        if is_style_complete(cum_in, cum_out):
            hidden.add(oid)

    return hidden


# ----------------------------
# Newest-style / inactive rule (2-tier: scan surfaces vs heatmap)
# ----------------------------

def get_active_style_id_for_line(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
) -> Optional[int]:
    """Style id of the order whose bundle was issued most recently on ``line``.

    "Newest style on the line" is defined by the latest ``Bundle.issued_at`` (the
    same signal the daily production report uses to pick its active order/style),
    bounded to the end of ``as_of_date``. Returns ``None`` when the line has no
    issued bundles yet.
    """
    day_end = _as_of_day_end(as_of_date)
    return (
        Bundle.objects.filter(
            assigned_sewing_line=line,
            issued_at__isnull=False,
            issued_at__lte=day_end,
        )
        .order_by("-issued_at")
        .values_list("order__style_id", flat=True)
        .first()
    )


def _resolve_line_orders(
    line: ProductionLine,
    orders: Optional[Iterable[Order]],
) -> List[Order]:
    """Materialise the orders to consider for ``line`` (all with bundle activity
    when the caller doesn't supply an explicit list)."""
    if orders is None:
        line_order_ids = list(
            Bundle.objects.filter(assigned_sewing_line=line)
            .order_by()
            .values_list("order_id", flat=True)
            .distinct()
        )
        return list(
            Order.objects.filter(id__in=line_order_ids).prefetch_related("style__parts")
        )
    return list(orders)


def _superseded_order_ids(
    line: ProductionLine,
    orders: List[Order],
    as_of_date: Optional[date] = None,
) -> set:
    """Condition 2 order ids: a different style than the line's newest style that
    still has pending pieces (``order.quantity - cumulative_output > 0``)."""
    active_style_id = get_active_style_id_for_line(line, as_of_date=as_of_date)
    if active_style_id is None:
        return set()

    superseded = set()
    io = compute_line_input_output(line, orders, as_of_date=as_of_date)
    for order in orders:
        if order.style_id == active_style_id:
            continue
        cum_out = io.get(order.id, (0, 0))[1]
        pending = max(int(order.quantity or 0) - int(cum_out or 0), 0)
        if pending > 0:
            superseded.add(order.id)
    return superseded


def get_inactive_order_ids_for_line(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
    orders: Optional[Iterable[Order]] = None,
) -> set:
    """Inactive order ids for the SCAN surfaces + V3 dashboard.

    Inactive = union (as of ``as_of_date``):

      1. hidden — manually completed OR fully output (see
         :func:`get_hidden_order_ids_for_line`);
      2. superseded — a different style than the line's newest style (latest
         issued bundle) that still has pending pieces vs the order quantity.

    Used by assembly scan (part-receive + garment-issue), bundle-issue scan,
    sewing-QC scan and the V3 dashboard. **Delivery-date expiry (Condition 3) is
    intentionally NOT applied here** — see :func:`get_inactive_order_ids_for_heatmap`.

    The Daily Production Report does NOT use this: it keeps rendering the
    superseded ("pending transition") rows with a warning + "Mark Complete"
    action instead of silently hiding them.
    """
    orders = _resolve_line_orders(line, orders)

    # Condition 1 (∪ 1b): manual ∪ fully-output (reuses the shared rule).
    inactive = get_hidden_order_ids_for_line(line, as_of_date=as_of_date, orders=orders)
    # Condition 2: superseded by a newer style on the line, still pending.
    inactive |= _superseded_order_ids(line, orders, as_of_date=as_of_date)
    return inactive


def get_inactive_order_ids_for_heatmap(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
    orders: Optional[Iterable[Order]] = None,
) -> set:
    """Inactive order ids for the HEATMAP surfaces only (kiosk garments heatmap
    and the serial heatmap grid).

    Inactive = :func:`get_inactive_order_ids_for_line` (Conditions 1 + 1b + 2)
    **plus** Condition 3 — delivery-date expired (``delivery_date <= as_of_date``);
    a null ``delivery_date`` counts as still-active. No other surface applies the
    delivery-date rule.
    """
    orders = _resolve_line_orders(line, orders)

    inactive = get_inactive_order_ids_for_line(line, as_of_date=as_of_date, orders=orders)

    # Condition 3: delivery date expired (null = still active).
    cutoff = as_of_date or today()
    for order in orders:
        dd = getattr(order, "delivery_date", None)
        if dd is not None and dd <= cutoff:
            inactive.add(order.id)
    return inactive
