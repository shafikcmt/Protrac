"""
READ-ONLY diagnostic for the Daily Production Report "pending transition"
(⚠️ new style started while previous style still pending) warning.

For a given sewing line it lists every order that today's DPR flags with
``is_pending_transition=True`` and prints, side by side, the numbers that decide
the flag so we can tell which divergence explains a spurious warning:

  A) baseline mismatch  -> warning uses order.quantity, completeness uses
     cumulative_input (line_visibility.is_style_complete)
  B) active-style query mismatch -> DPR's inline "newest style" query is scoped
     to the filtered candidate order set; line_visibility.get_active_style_id_for_line
     is not, so the two can disagree
  C) stale line assignment -> cumulative_input (from Bundle.assigned_sewing_line)
     stays > cumulative_output (from garment sewing-QC) after a BundleTransfer

This command performs NO writes. It only reads and prints.

Usage:
    python manage.py check_pending_transition_diagnostic "Sewing-2"
    python manage.py check_pending_transition_diagnostic "Sewing-2" --date 2026-07-26
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from common.utils.time import today, day_range, parse_date_string
from tracking.models import (
    ProductionLine,
    Order,
    Bundle,
    Garment,
    PartInventory,
)
from tracking.models.constants import LineType
from tracking.services.report.daily_production_report import (
    get_daily_production_report_data,
    _should_apply_active_only,
    _apply_active_only_by_delivery,
)
from tracking.services.line_visibility import (
    compute_line_input_output,
    get_active_style_id_for_line,
    is_style_complete,
)


class Command(BaseCommand):
    help = (
        "READ-ONLY: show why orders are flagged is_pending_transition on a "
        "sewing line in today's Daily Production Report."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "line_name",
            type=str,
            help='Production line name, e.g. "Sewing-2"',
        )
        parser.add_argument(
            "--date",
            type=str,
            default=None,
            help="Report date YYYY-MM-DD (defaults to today). The warning only "
            "fires for today's report.",
        )

    # ------------------------------------------------------------------
    # helpers (all read-only)
    # ------------------------------------------------------------------

    def _resolve_line(self, line_name: str) -> ProductionLine:
        line = (
            ProductionLine.objects.filter(
                line_type=LineType.SEWING, name=line_name
            ).first()
        )
        if line is None:
            # Be forgiving about case / stray spaces.
            line = (
                ProductionLine.objects.filter(
                    line_type=LineType.SEWING, name__iexact=line_name.strip()
                ).first()
            )
        if line is None:
            available = list(
                ProductionLine.objects.filter(line_type=LineType.SEWING)
                .order_by("name")
                .values_list("name", flat=True)
            )
            raise CommandError(
                f'Sewing line "{line_name}" not found. '
                f"Available sewing lines: {', '.join(available) or '(none)'}"
            )
        return line

    def _dpr_candidate_orders(self, line, report_date):
        """Reproduce the DPR service's per-line candidate order set + inline
        active-style computation EXACTLY (daily_production_report.py:224-302)."""
        active_only = _should_apply_active_only(report_date)
        day_start, day_end = day_range(report_date)

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

        # Same base queryset + delivery-active filter the service applies.
        orders_qs = (
            Order.objects.select_related("style", "style__buyer", "size", "color")
            .prefetch_related("style__parts")
        )
        orders_qs = _apply_active_only_by_delivery(
            orders_qs, "delivery_date", report_date, active_only
        )

        line_orders = list(orders_qs.filter(id__in=candidate_ids))
        order_ids_on_line = [o.id for o in line_orders]

        # DPR inline "newest style" query (scoped to the filtered candidate set).
        dpr_active_order_id = (
            Bundle.objects.filter(
                assigned_sewing_line=line,
                issued_at__isnull=False,
                issued_at__lte=day_end,
                order_id__in=order_ids_on_line,
            )
            .order_by("-issued_at")
            .values_list("order_id", flat=True)
            .first()
        )
        dpr_active_style_id = next(
            (o.style_id for o in line_orders if o.id == dpr_active_order_id), None
        )
        return line_orders, dpr_active_style_id

    # ------------------------------------------------------------------
    # main
    # ------------------------------------------------------------------

    def handle(self, *args, **options):
        line_name = options["line_name"]
        date_opt = options.get("date")

        if date_opt:
            report_date = parse_date_string(date_opt)
            if report_date is None:
                raise CommandError(f"Invalid --date value: {date_opt!r}")
        else:
            report_date = today()

        line = self._resolve_line(line_name)

        w = self.stdout.write
        w("=" * 78)
        w(f"PENDING-TRANSITION DIAGNOSTIC (READ-ONLY)")
        w(f"Line          : {line.name} (id={line.id})")
        w(f"Report date   : {report_date}  (today={today()})")
        if report_date != today():
            w(
                self.style.WARNING(
                    "NOTE: is_pending_transition only fires for today's report; "
                    "a past date will show no flags."
                )
            )
        w("=" * 78)

        # 1) Authoritative flagged set: run the real DPR service.
        report = get_daily_production_report_data(
            report_date=report_date,
            production_line_id=line.id,
        )
        flagged_rows = []
        for line_block in report:
            for row in line_block.get("orders", []):
                if row.get("is_pending_transition"):
                    flagged_rows.append(row)

        # 2) Recompute both active_style_id values.
        line_orders, dpr_active_style_id = self._dpr_candidate_orders(
            line, report_date
        )
        lv_active_style_id = get_active_style_id_for_line(
            line, as_of_date=report_date
        )

        w("")
        w(f"active_style_id (DPR inline query)              : {dpr_active_style_id}")
        w(f"active_style_id (line_visibility helper)        : {lv_active_style_id}")
        differ = dpr_active_style_id != lv_active_style_id
        w(
            "Do the two active_style_id values DIFFER?       : "
            + (self.style.ERROR("YES") if differ else self.style.SUCCESS("no"))
        )
        w("")
        w(f"Orders flagged is_pending_transition on {line.name}: {len(flagged_rows)}")
        w("-" * 78)

        if not flagged_rows:
            w("No flagged orders. Nothing to diagnose for this line/date.")
            return

        # cumulative_input / cumulative_output via the shared line_visibility rule
        # (same rule the completeness/auto-hide logic uses).
        orders_by_id = {o.id: o for o in line_orders}
        flagged_order_ids = [r["order_id"] for r in flagged_rows]
        flagged_orders = [
            orders_by_id.get(oid)
            or Order.objects.select_related("style", "style__buyer")
            .prefetch_related("style__parts")
            .get(id=oid)
            for oid in flagged_order_ids
        ]
        io = compute_line_input_output(line, flagged_orders, as_of_date=report_date)

        for row in flagged_rows:
            oid = row["order_id"]
            order = orders_by_id.get(oid)
            cum_in, cum_out = io.get(oid, (0, 0))
            order_qty = int(row.get("order_quantity") or 0)
            pending_dpr = int(row.get("pending_quantity") or 0)
            style_id = getattr(order, "style_id", None)

            # Baseline comparison: what pending would be under each rule.
            pending_by_qty = max(order_qty - cum_out, 0)          # warning's rule
            pending_by_input = max(cum_in - cum_out, 0)           # completeness rule
            input_complete = is_style_complete(cum_in, cum_out)

            w("")
            w(f"Order id {oid}  |  style='{row.get('style')}'  (style_id={style_id})")
            w(f"  buyer                              : {row.get('buyer')}")
            w(f"  order.quantity                     : {order_qty}")
            w(f"  cumulative_input  (line_visibility): {cum_in}")
            w(f"  cumulative_output (line_visibility): {cum_out}")
            w(f"  pending_quantity (DPR reported)    : {pending_dpr}")
            w(f"  pending by order.quantity rule     : {pending_by_qty}   <- warning uses this")
            w(f"  pending by cumulative_input rule   : {pending_by_input}   <- completeness uses this")
            w(
                f"  is_style_complete(in, out)         : "
                + (
                    self.style.SUCCESS("True (input-complete -> would NOT be pending under input rule)")
                    if input_complete
                    else "False"
                )
            )
            w(
                f"  order.style_id == DPR active?      : "
                f"{style_id == dpr_active_style_id}  "
                f"(active={dpr_active_style_id})"
            )

        # ------------------------------------------------------------------
        # Verdict hints (still read-only; final call left to the human).
        # ------------------------------------------------------------------
        w("")
        w("=" * 78)
        w("HINTS")
        w("-" * 78)

        any_baseline = any(
            (int(r.get("order_quantity") or 0) - io.get(r["order_id"], (0, 0))[1]) > 0
            and max(
                io.get(r["order_id"], (0, 0))[0] - io.get(r["order_id"], (0, 0))[1], 0
            )
            <= 0
            for r in flagged_rows
        )
        if differ:
            w(
                self.style.WARNING(
                    "B) active-style query MISMATCH detected: the DPR inline query "
                    "and line_visibility disagree on the newest style."
                )
            )
        if any_baseline:
            w(
                self.style.WARNING(
                    "A) baseline mismatch present: at least one flagged order is "
                    "pending only under the order.quantity rule (input already "
                    "fully output / zero net input)."
                )
            )
        if not differ and not any_baseline:
            w(
                "Neither A nor B triggered automatically. If cumulative_input is "
                "> cumulative_output for a style that operationally moved lines, "
                "suspect C (stale BundleTransfer assignment) — check BundleTransfer "
                "rows for the flagged orders."
            )
        w("=" * 78)
