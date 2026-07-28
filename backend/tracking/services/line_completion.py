"""Event-triggered auto-completion of finished styles on a production line.

Background
----------
A style is "finished" on a line when everything fed into sewing has come out of
sewing QC (``is_style_complete``: ``cumulative_input > 0 and output >= input``).

That predicate used to be evaluated at **query time**, inside
``line_visibility.get_hidden_order_ids_for_line``, so any order whose input and
output happened to be level right now was hidden from every operational view.
That is wrong, because input arrives in batches over several days: feed 60 pcs,
sew and QC all 60, and the style is momentarily "complete" while another 100 pcs
are still to come. The live style vanished from the kiosk and the scan screens
for as long as feeding paused. (The daily production report had a local patch for
this — an ``is_active_style`` exemption, commit e187b04 — but no other surface
did.)

The rule is therefore no longer evaluated continuously. It is evaluated at two
explicit moments, and the answer is *recorded* as a ``LineStyleCompletion`` row
with ``source=AUTO``:

1. **A new style is assigned to the line** (:func:`auto_complete_superseded_styles`).
   Called after a bundle is issued (or transferred) onto the line. Every style on
   the line other than the now-active one is checked; the complete ones are
   recorded. An incomplete old style is deliberately left visible — its leftover
   work is still pending.

2. **Late output catches up** (:func:`reconcile_order_completion`). Output for an
   old style keeps arriving for days after the next style starts feeding, so
   trigger 1 alone would leave a style that was at 450/500 when it was superseded
   visible forever. Every sewing-QC pass on a non-active style re-checks that one
   order.

The inverse event is handled too: re-issuing a previously auto-completed style
onto the line clears its AUTO record (:func:`clear_auto_completions_for_style`).
MANUAL records are never touched by any of this — an operator's explicit
"Mark Complete" outranks every automatic rule.

All entry points are best-effort by contract: they are called from inside scan
transactions and must never make an operator's scan fail. Callers wrap them in
``try/except``; see :func:`_safely`.
"""

from __future__ import annotations

import logging
from datetime import date
from typing import Iterable, List, Optional

from django.db import transaction

from tracking.models import LineStyleCompletion, Order, ProductionLine
from tracking.models.constants import CompletionSource
from tracking.services.line_visibility import (
    compute_line_input_output,
    get_active_style_id_for_line,
    is_style_complete,
    _resolve_line_orders,
)

logger = logging.getLogger("tracking.line_completion")


def _safely(fn, *args, **kwargs):
    """Run ``fn`` and swallow (but log) anything it raises.

    Auto-completion is bookkeeping layered onto scan flows. A failure here must
    never roll back or reject the operator's scan, which is the real work. The
    call is wrapped in an inner atomic block so a database error leaves the outer
    scan transaction usable.
    """
    try:
        with transaction.atomic():
            return fn(*args, **kwargs)
    except Exception:  # pragma: no cover - defensive
        logger.exception("auto-completion failed for %s(%s)", getattr(fn, "__name__", fn), args)
        return None


def _record_completion(line: ProductionLine, order_id: int, note: str) -> bool:
    """Create an AUTO completion for ``order_id`` on ``line`` if none exists.

    Returns True when a new row was written. An existing row is left exactly as
    it is — in particular a MANUAL completion is never downgraded to AUTO, and an
    existing AUTO row is not re-stamped (its ``created_at`` is what bounds
    past-date reports).
    """
    _obj, created = LineStyleCompletion.objects.get_or_create(
        production_line=line,
        order_id=order_id,
        defaults={
            "source": CompletionSource.AUTO,
            "completed_by": None,
            "notes": note,
        },
    )
    return created


def _complete_order_ids(
    line: ProductionLine,
    orders: List[Order],
    as_of_date: Optional[date] = None,
) -> set:
    """Of ``orders``, the ids whose input is fully output on ``line`` right now.

    ``is_style_complete`` requires ``cumulative_input > 0``, so an order with no
    input yet (a line that was idle, or a style staged but never fed) is never
    considered complete and never auto-hidden.
    """
    io = compute_line_input_output(line, orders, as_of_date=as_of_date)
    return {
        oid
        for oid, (cum_in, cum_out) in io.items()
        if is_style_complete(cum_in, cum_out)
    }


def auto_complete_superseded_styles(
    line: ProductionLine,
    as_of_date: Optional[date] = None,
    active_style_id: Optional[int] = None,
    orders: Optional[Iterable[Order]] = None,
    dry_run: bool = False,
) -> List[int]:
    """Record AUTO completions for finished styles superseded on ``line``.

    Call this *after* the new bundle has been saved, so
    :func:`get_active_style_id_for_line` already reports the newly-assigned
    style. Pass ``active_style_id`` explicitly to override that.

    Every order on the line whose style differs from the active style is
    evaluated **independently**, so a line carrying several unfinished old styles
    gets a separate decision per style — the complete ones are hidden, the rest
    stay visible. Sibling sizes/colors of one style are separate Orders and are
    likewise judged on their own input/output.

    Returns the order ids newly completed (empty when nothing qualified).
    """
    orders = _resolve_line_orders(line, orders)
    if not orders:
        return []

    if active_style_id is None:
        active_style_id = get_active_style_id_for_line(line, as_of_date=as_of_date)
    if active_style_id is None:
        # No issued bundles on the line at all — nothing is superseded.
        return []

    superseded = [o for o in orders if o.style_id != active_style_id]
    if not superseded:
        return []

    already = set(
        LineStyleCompletion.objects.filter(
            production_line=line, order_id__in=[o.id for o in superseded]
        ).values_list("order_id", flat=True)
    )
    candidates = [o for o in superseded if o.id not in already]
    if not candidates:
        return []

    complete_ids = _complete_order_ids(line, candidates, as_of_date=as_of_date)
    if dry_run:
        return sorted(complete_ids)

    note = f"Auto-completed: fully output when style {active_style_id} was assigned to the line."
    written = [oid for oid in sorted(complete_ids) if _record_completion(line, oid, note)]
    if written:
        logger.info(
            "auto_complete_superseded_styles line=%s active_style=%s completed=%s",
            line.name,
            active_style_id,
            written,
        )
    return written


def reconcile_order_completion(
    line: ProductionLine,
    order: Order,
    as_of_date: Optional[date] = None,
) -> bool:
    """Re-check one non-active order after late output arrived for it.

    This is the second trigger. When a style is superseded at 450/500 it is
    correctly left visible; the remaining 50 are QC'd over the following days and
    nothing would otherwise notice that it has finished. Each sewing-QC pass on an
    order whose style is not the line's active style calls this for that order
    alone — cheap and targeted, and it keeps the completeness rule out of the
    query path.

    Returns True when this call recorded the completion.
    """
    active_style_id = get_active_style_id_for_line(line, as_of_date=as_of_date)
    if active_style_id is None or order.style_id == active_style_id:
        # The active style is never auto-completed — that is the whole point of
        # moving off the continuous rule. It ends only by manual completion or by
        # being superseded later.
        return False

    if LineStyleCompletion.objects.filter(
        production_line=line, order_id=order.id
    ).exists():
        return False

    if not _complete_order_ids(line, [order], as_of_date=as_of_date):
        return False

    note = "Auto-completed: output caught up with input after the style was superseded."
    created = _record_completion(line, order.id, note)
    if created:
        logger.info(
            "reconcile_order_completion line=%s order=%s auto-completed", line.name, order.id
        )
    return created


def clear_auto_completions_for_style(
    line: ProductionLine,
    style_id: Optional[int],
) -> int:
    """Un-hide a style that is being run on ``line`` again.

    Feeding a previously-finished style back onto a line makes it active again,
    but its AUTO completion would keep it hidden. Those rows are deleted here.

    MANUAL rows are deliberately excluded from the delete: if an operator marked
    the style complete, that decision stands until they undo it themselves via
    the Unhide action. Returns the number of rows removed.
    """
    if style_id is None:
        return 0

    qs = LineStyleCompletion.objects.filter(
        production_line=line,
        order__style_id=style_id,
        source=CompletionSource.AUTO,
    )
    removed, _ = qs.delete()
    if removed:
        logger.info(
            "clear_auto_completions_for_style line=%s style=%s removed=%d",
            line.name,
            style_id,
            removed,
        )
    return removed


def sweep_auto_completions(
    lines: Optional[Iterable[ProductionLine]] = None,
    as_of_date: Optional[date] = None,
    dry_run: bool = False,
) -> "OrderedDict[str, List[int]]":
    """Run the assignment-trigger check across every sewing line.

    The two event triggers cover the normal flow, but they can only fire when
    something happens. A line that finishes a style and then sits idle — no new
    style issued, no further QC scans — has no event to notice the style is done,
    so it would stay visible indefinitely. This sweep is the safety net for that
    case, and the backfill for the migration off the old query-time rule.

    It is exactly :func:`auto_complete_superseded_styles` applied to every line:
    same predicate, same writes, same ``dry_run`` semantics. Nothing here decides
    anything the event triggers would decide differently — running it can only
    record completions that a trigger would have recorded had one fired.

    Per-line failures are contained: one bad line is logged and skipped rather
    than aborting the whole sweep.

    Returns an ordered ``{line_name: [order_ids]}`` — the ids written, or the ids
    that *would* be written under ``dry_run``. Lines with nothing to do are
    present with an empty list.
    """
    from collections import OrderedDict

    if lines is None:
        from tracking.models.constants import LineType

        lines = ProductionLine.objects.filter(line_type=LineType.SEWING).order_by("name")

    results: "OrderedDict[str, List[int]]" = OrderedDict()
    for line in lines:
        try:
            results[line.name] = auto_complete_superseded_styles(
                line, as_of_date=as_of_date, dry_run=dry_run
            )
        except Exception:  # pragma: no cover - defensive
            logger.exception("sweep_auto_completions failed for line=%s", line.name)
            results[line.name] = []

    total = sum(len(v) for v in results.values())
    logger.info(
        "sweep_auto_completions dry_run=%s lines=%d completions=%d",
        dry_run,
        len(results),
        total,
    )
    return results


def handle_style_assigned_to_line(
    line: ProductionLine,
    style_id: Optional[int],
    as_of_date: Optional[date] = None,
) -> None:
    """Full handling of "a style was just assigned to this line".

    Order matters: the incoming style is un-hidden *first* (it is active again),
    then the styles it supersedes are evaluated. Doing it the other way round
    would let the same call hide and immediately re-show a style that is both
    incoming and superseded.

    This is the single entry point the scan services call.
    """
    clear_auto_completions_for_style(line, style_id)
    auto_complete_superseded_styles(
        line, as_of_date=as_of_date, active_style_id=style_id
    )
