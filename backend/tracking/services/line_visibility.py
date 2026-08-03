"""
Central source of truth for *active style / hide* logic on sewing lines.

A sewing line normally runs one active style/order at a time. When a new
style/order starts on a line, the previous one should disappear from every
operational view **once it is finished** — either because:

  * a user manually marked it complete on that line, or
  * it was fully output (input == output) *at the moment a new style was
    assigned to the line*, or when late output caught up afterwards.

Both cases are recorded as a ``LineStyleCompletion`` row (MANUAL / AUTO), which
is the only thing consulted at query time. Completeness is deliberately NOT
recomputed per request: input arrives in batches over several days, so a live
style sits at input == output whenever its current batch is caught up and more
is still to come, and hiding on that basis made running lines vanish. The
triggers that write AUTO rows live in :mod:`tracking.services.line_completion`.

Historically this rule was re-implemented (slightly differently) in the daily
production report, the sewing kiosk dashboard, the heatmap and the assembly
scan screens. This module centralises the rule so every surface hides the same
orders. All callers should use:

  * :func:`is_style_complete`            — the pure rule (input vs output). This
    is now a *trigger predicate* only, evaluated at the moments handled by
    :mod:`tracking.services.line_completion`. It is NOT applied at query time —
    doing so false-hid live styles whose fed batch was momentarily caught up
  * :func:`get_completed_order_ids`      — recorded completions (MANUAL ∪ AUTO)
  * :func:`get_hidden_order_ids_for_line`  — the hide-set, as of a date
  * :func:`get_inactive_order_ids_for_line` — hidden only (Conditions 1+1b), for
    the scan surfaces + V3 (NOT the DPR). Superseded-by-newer-style (old Condition
    2) is NO LONGER auto-hidden here — see below.
  * :func:`get_pending_transition_order_ids` — the old "superseded" set (older
    style still in progress while a newer style was issued), now surfaced as an
    ALERT instead of auto-hidden
  * :func:`get_style_overlap_alert` — full alert payload for that overlap
  * :func:`get_visible_order_ids_for_line` — the positive set (active style ∪
    pending old styles − hidden − delivery-expired), matching what the daily
    production report actually renders. For cumulative-state surfaces that would
    otherwise accumulate every never-completed historical order
  * :func:`get_inactive_order_ids_for_heatmap` — hidden ∪ delivery-expired
    (Conditions 1+1b+3), for the heatmap surfaces ONLY

**When a completion starts hiding** depends on how the caller asks, and the two
modes differ on purpose:

  * no ``as_of_date`` (``None``) — hides immediately. The live scan surfaces need
    "Mark Complete" to take the style off the screen right away.
  * an ``as_of_date`` — hides from the **next** calendar day. A completion made
    during day D leaves day D's report showing exactly what was scanned that day.
    Completions are forward-looking; they must not rewrite finished production.

Which mode a surface gets follows from whether it passes a date, not from whether
it feels "live" — the V3 dashboard passes ``today()`` and so takes the next-day
path. See :func:`get_completed_order_ids` for the per-caller breakdown.

Do not collapse the two into one rule — see :func:`get_completed_order_ids` for
the incident that produced this split.

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
    """Pieces sitting IN the line, not yet sewing-QC passed (never negative).

    ``pending = cumulative_input - cumulative_output`` — work in progress on the
    floor, i.e. what has been fed into sewing but has not come out of sewing QC.
    It is deliberately NOT measured against ``order.quantity``: pieces that were
    never fed to the line are not "in the line".

    **This is a REPORTING figure only.** Nothing about visibility, hiding or
    alerting may be derived from it — see
    :func:`remaining_against_order_quantity`, which is what the pending-transition
    set and the report's "Mark Complete" affordance use, and which must stay
    order-quantity based. Mixing the two is how the Sewing-5 auto-hide incident
    happens: input arrives in batches, so a live style sits at
    ``input == output`` (pending 0) whenever its current batch is caught up.
    """
    return max(int(cumulative_input or 0) - int(cumulative_output or 0), 0)


def remaining_against_order_quantity(
    order_quantity: int, cumulative_output: int
) -> int:
    """Pieces of the ORDER still to be produced on a line (never negative).

    ``remaining = order_quantity - cumulative_output``. This is the predicate
    behind "is this old style still unfinished?" — :func:`_superseded_order_ids`,
    and therefore the pending-transition set, the overlap alert's membership and
    the report's ``is_pending_transition`` / ``needs_manual_complete`` flags.

    It is kept separate from :func:`pending_quantity` on purpose. A style whose
    fed batch is momentarily caught up has ``pending_quantity == 0`` while still
    having hundreds of ordered pieces to run; deciding visibility on that zero is
    exactly the query-time rule that made running lines vanish (see this module's
    header and :mod:`tracking.services.line_completion`).
    """
    return max(int(order_quantity or 0) - int(cumulative_output or 0), 0)


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

def get_completed_order_ids(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
) -> set:
    """Order ids marked complete on ``line``, by an operator or automatically.

    Both sources count as hidden — see
    :class:`tracking.models.constants.CompletionSource`. They differ only in how
    they end (AUTO rows are cleared when the style is re-issued on the line;
    MANUAL rows are not), never in whether they hide.

    ``as_of_date`` selects between two deliberately different behaviours:

    * **None — "hide immediately."** No date filter at all: every recorded
      completion hides. This is what the *live* scan surfaces want — when an
      operator presses "Mark Complete", the style must disappear from the kiosk
      and scan screens straight away. Callers: the assembly part-receive /
      garment-issue scans, the bundle-issue scan, and
      ``sewing_dashboard_v2._exclude_completed`` (the bundle/garment querysets).
    * **A date — "hide from the NEXT day onward."** Only completions created
      *strictly before* ``as_of_date`` count. A completion made during day D does
      **not** hide anything on day D's report. Callers: the daily production
      report, the assembly / sewing-QC daily summaries, and the V3 dashboard.

    The V3 dashboard is worth spelling out, because it is easy to assume it takes
    the immediate path. It does not: ``get_sewing_dashboard_v2_data`` defaults
    ``date`` to ``today()`` and derives its DPR ``report_date`` from it, so that
    value is never ``None`` and V3's row-level figures (``total_input``,
    ``total_output``, ``active_style_names``) always follow the next-day rule. A
    style marked complete today therefore stays on the V3 board until tomorrow.
    That is accepted: V3 is a reporting board, and same-day removal there is not
    worth reintroducing a second effectivity rule. Note this makes V3 internally
    split — ``_exclude_completed`` hides its querysets immediately while the
    DPR-derived numbers on the same screen do not.

    The second rule is the important one. The filter used to be
    ``created_at__date__lte``, which made a completion retroactive to the start of
    its own date: an order completed at 14:09 on the 28th had its entire 28th of
    July erased from the 28th's report. On Sewing-5 that silently dropped 142
    QC-passed garments — the report showed Output Day 0 against 142 actually
    scanned — because the twelve orders that did the day's work were auto-completed
    a few hours before the 22:00 mail went out. A completion records that a style
    is finished *going forward*; it must never rewrite production that already
    happened.

    **The asymmetry between the two modes is intentional — do not "harmonise" it.**
    Making ``None`` mean ``today()`` would delay hiding on the scan floor by a full
    day; making the dated path immediate would re-introduce the erasure above.
    """
    qs = LineStyleCompletion.objects.filter(production_line=line)
    if as_of_date is not None:
        # Strictly before: the completion's own date still shows real production.
        qs = qs.filter(created_at__date__lt=as_of_date)
    return set(qs.values_list("order_id", flat=True))


def get_hidden_order_ids_for_line(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
    orders: Optional[Iterable[Order]] = None,
) -> set:
    """Return the set of order ids that must be hidden on ``line``.

    Hidden = a recorded ``LineStyleCompletion`` (MANUAL or AUTO), as of date.
    Used by every surface (daily report, kiosk v3, heatmap, assembly & sewing-QC
    scan) so a style hidden in one place is hidden everywhere.

    ``as_of_date`` carries the same two-mode meaning as
    :func:`get_completed_order_ids` — omitted (``None``) hides immediately for the
    live scan surfaces, a date hides only from the day *after* the completion was
    recorded. See that function's docstring; the asymmetry is deliberate.

    **This no longer computes completeness.** It used to also hide any order
    whose input was fully output *at query time*, which false-hid live styles:
    input arrives in batches over several days, so a style sits at input ==
    output whenever the current batch is caught up and more is still to come.
    That rule now fires only at two explicit events — a new style being assigned
    to the line, and late output catching up afterwards — and records its answer
    as an AUTO completion. See :mod:`tracking.services.line_completion`.

    ``orders`` is accepted for signature compatibility with the callers that pass
    a pre-resolved list; it no longer affects the result.
    """
    return get_completed_order_ids(line, as_of_date=as_of_date)


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
    still has pieces to run (``order.quantity - cumulative_output > 0``).

    Membership uses :func:`remaining_against_order_quantity`, NOT
    :func:`pending_quantity`. The latter reports work-in-progress
    (``input - output``) and drops to zero whenever the fed batch is caught up,
    which would silently drop a live old style out of this set — and out of
    :func:`get_visible_order_ids_for_line`, taking it off the assembly/scan
    surfaces. That is the Sewing-5 auto-hide regression; keep the two apart.
    """
    active_style_id = get_active_style_id_for_line(line, as_of_date=as_of_date)
    if active_style_id is None:
        return set()

    superseded = set()
    io = compute_line_input_output(line, orders, as_of_date=as_of_date)
    for order in orders:
        if order.style_id == active_style_id:
            continue
        cum_out = io.get(order.id, (0, 0))[1]
        if remaining_against_order_quantity(order.quantity, cum_out) > 0:
            superseded.add(order.id)
    return superseded


def get_inactive_order_ids_for_line(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
    orders: Optional[Iterable[Order]] = None,
) -> set:
    """Inactive order ids for the SCAN surfaces + V3 dashboard.

    Inactive = hidden only (as of ``as_of_date``): manually completed OR fully
    output (see :func:`get_hidden_order_ids_for_line`).

    **Condition 2 (superseded-by-newer-style) was REMOVED here.** Merely issuing a
    newer style's bundles on the line no longer auto-hides an older style that is
    still in progress — that silently blanked out lines mid-transition (e.g. a
    next style staged in the morning hid the style being actively QC'd). The
    overlap is now surfaced as an ALERT (see :func:`get_style_overlap_alert`) and
    an order is only hidden when a user explicitly marks it complete
    (``LineStyleCompletion``, folded into Condition 1). The old superseded set is
    still available via :func:`get_pending_transition_order_ids` for that alert.

    Used by assembly scan (part-receive + garment-issue), bundle-issue scan,
    sewing-QC scan and the V3 dashboard. **Delivery-date expiry (Condition 3) is
    intentionally NOT applied here** — see :func:`get_inactive_order_ids_for_heatmap`.
    """
    orders = _resolve_line_orders(line, orders)

    # Condition 1 (∪ 1b) only: manual ∪ fully-output (reuses the shared rule).
    return get_hidden_order_ids_for_line(line, as_of_date=as_of_date, orders=orders)


def get_pending_transition_order_ids(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
    orders: Optional[Iterable[Order]] = None,
) -> set:
    """Order ids of OLDER styles still in progress while a NEWER style has been
    issued on the line (the former "superseded" set).

    These are **no longer auto-hidden** — they are surfaced as an overlap alert
    and hidden only by explicit manual completion. Same detection the Daily
    Production Report uses for its "pending transition" rows.
    """
    orders = _resolve_line_orders(line, orders)
    return _superseded_order_ids(line, orders, as_of_date=as_of_date)


def get_style_overlap_alert(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
) -> Optional[dict]:
    """Alert payload when a newer style was issued on ``line`` while older-style
    orders are still in progress; ``None`` when there is no such overlap.

    Shape::

        {
          "production_line_id": int, "line": str,
          "new_style_id": int, "new_style": str,          # the just-issued style
          "in_progress_orders": [                         # older styles still pending
            {"order_id", "order_number", "style", "size",
             "pending_quantity", "completion_id"},        # completion_id set if already hidden
          ],
        }

    Note the two different quantities at work: *membership* of
    ``in_progress_orders`` is order-quantity based
    (:func:`remaining_against_order_quantity`, via :func:`_superseded_order_ids`),
    while the ``pending_quantity`` reported for each row is work-in-progress
    (:func:`pending_quantity`, input − output). A row can therefore legitimately
    appear with ``pending_quantity == 0``: the style still has ordered pieces to
    run, but nothing is sitting on the floor right now.
    """
    from tracking.models import Style, LineStyleCompletion

    orders = _resolve_line_orders(line, None)
    pending_ids = _superseded_order_ids(line, orders, as_of_date=as_of_date)
    # Only surface orders NOT already hidden (those are resolved) — by an
    # operator or by the auto-completion triggers; either way there is nothing
    # left for the user to act on.
    hidden = get_completed_order_ids(line, as_of_date=as_of_date)
    pending_ids = {oid for oid in pending_ids if oid not in hidden}
    if not pending_ids:
        return None

    new_style_id = get_active_style_id_for_line(line, as_of_date=as_of_date)
    new_style = (
        Style.objects.filter(id=new_style_id).values_list("name", flat=True).first()
        if new_style_id is not None
        else None
    )

    io = compute_line_input_output(line, orders, as_of_date=as_of_date)
    completion_by_order = dict(
        LineStyleCompletion.objects.filter(
            production_line=line, order_id__in=pending_ids
        ).values_list("order_id", "id")
    )
    detail_orders = Order.objects.filter(id__in=pending_ids).select_related(
        "style", "size"
    )

    in_progress = []
    for o in detail_orders:
        cum_in, cum_out = io.get(o.id, (0, 0))
        in_progress.append(
            {
                "order_id": o.id,
                "order_number": o.order_number,
                "style": o.style.name if o.style_id else None,
                "size": getattr(getattr(o, "size", None), "name", None),
                # Reported figure: pieces on the floor (input − output).
                # Membership above is order-quantity based — see the docstring.
                "pending_quantity": pending_quantity(cum_in, cum_out),
                "completion_id": completion_by_order.get(o.id),
            }
        )
    in_progress.sort(key=lambda r: r["order_number"] or "")

    return {
        "production_line_id": line.id,
        "line": line.name,
        "new_style_id": new_style_id,
        "new_style": new_style,
        "in_progress_orders": in_progress,
    }


def get_visible_order_ids_for_line(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
    orders: Optional[Iterable[Order]] = None,
) -> set:
    """Order ids a scan surface should SHOW for ``line``; everything else is history.

    This is the positive counterpart to :func:`get_inactive_order_ids_for_line`.
    That function is a *hide-set* — it answers "is this order finished?", never
    "is this order part of what the line is currently running?". A surface that
    only excludes the hide-set therefore keeps every historical order that was
    never manually completed and never fully output (abandoned runs, short
    shipments, styles whose garments were input but never sewing-QC passed).
    Cumulative-state surfaces with no date bound — notably the assembly
    part-receive history — accumulate those forever.

    Visible = the line's active style (every order sharing
    :func:`get_active_style_id_for_line`'s style, so sibling sizes/colors of the
    active run stay together, matching the daily production report)
    ∪ older styles still pending transition (:func:`get_pending_transition_order_ids`)
    − hidden (:func:`get_inactive_order_ids_for_line`)
    − delivery-date expired.

    Subtracting hidden LAST mirrors the report, where the manual/auto hide check
    runs before the active-style exemption: explicitly completing the active
    style still hides it. Every pending old style is returned, uncapped, exactly
    as the report renders one ``is_pending_transition`` row per pending style.

    The delivery-date gate is what actually bounds the set. Pending-transition is
    defined as ``order.quantity - cumulative_output > 0`` (see
    :func:`_superseded_order_ids`), and cumulative output essentially never lands
    exactly on the ordered quantity — short ships, rejects and cancelled balances
    leave a permanent remainder. ``is_style_complete`` does not close the gap
    either: it compares input against output, not quantity against output. So on
    a line with real history nearly every old order stays "pending" forever, and
    without this gate the set grows without bound (observed: 45 orders on a line
    whose report showed 6). The rule below is the report's, inlined verbatim from
    ``daily_production_report._build_order_row``::

        dd = getattr(order, "delivery_date", None)
        if dd is not None and dd < report_date:
            return None

    Only *strictly past* delivery dates expire. The cutoff day itself is still
    active — a delivery date is a deadline, not an exclusion date — and a NULL
    delivery date (no deadline entered yet) is also still active, matching both
    the report and :func:`get_inactive_order_ids_for_heatmap`. These three
    surfaces now agree on all three cases; keep them in step.

    Returns an empty set when the line has no issued bundles (no active style) —
    such a line legitimately has nothing current to show.

    No new rules are introduced here; this is a composition of the existing
    primitives plus the report's own delivery gate. Callers of
    :func:`get_inactive_order_ids_for_line` (kiosk v3, bundle-issue, sewing-QC,
    heatmap) are unaffected.
    """
    orders = _resolve_line_orders(line, orders)

    active_style_id = get_active_style_id_for_line(line, as_of_date=as_of_date)
    if active_style_id is None:
        return set()

    visible = {o.id for o in orders if o.style_id == active_style_id}
    visible |= get_pending_transition_order_ids(
        line, as_of_date=as_of_date, orders=orders
    )
    visible -= get_inactive_order_ids_for_line(
        line, as_of_date=as_of_date, orders=orders
    )

    # Delivery-date gate, applied last and uniformly — the active style is NOT
    # exempt, exactly as in the report. Only *strictly past* delivery dates
    # expire; the cutoff day itself and a NULL delivery date both stay visible,
    # matching the report's rule.
    cutoff = as_of_date or today()
    expired = {
        o.id
        for o in orders
        if getattr(o, "delivery_date", None) is not None and o.delivery_date < cutoff
    }
    return visible - expired


def get_inactive_order_ids_for_heatmap(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
    orders: Optional[Iterable[Order]] = None,
) -> set:
    """Inactive order ids for the HEATMAP surfaces only (kiosk garments heatmap
    and the serial heatmap grid).

    Inactive = :func:`get_inactive_order_ids_for_line` (Conditions 1 + 1b —
    hidden only) **plus** Condition 3 — delivery-date expired
    (``delivery_date <= as_of_date``); a null ``delivery_date`` counts as
    still-active. No other surface applies the delivery-date rule. (Superseded-
    by-newer-style is no longer auto-hidden anywhere — it is an alert now.)
    """
    orders = _resolve_line_orders(line, orders)

    inactive = get_inactive_order_ids_for_line(line, as_of_date=as_of_date, orders=orders)

    # Condition 3: delivery date expired (null = still active). Only *strictly
    # past* dates expire — the cutoff day itself is still active, matching the
    # report and get_visible_order_ids_for_line.
    cutoff = as_of_date or today()
    for order in orders:
        dd = getattr(order, "delivery_date", None)
        if dd is not None and dd < cutoff:
            inactive.add(order.id)
    return inactive
