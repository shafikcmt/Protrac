"""One-off backfill: make the old implicit hide rule explicit.

Until now, ``line_visibility.get_hidden_order_ids_for_line`` hid any order whose
input was fully output, recomputed on every request. That implicit rule is being
removed in favour of recorded ``LineStyleCompletion`` rows written by the
new-style-assignment and late-output triggers.

Without a backfill, every style that is currently hidden only by the implicit
rule would pop back into view the moment the rule is deleted. This command walks
each sewing line and writes an ``source=AUTO`` completion for the styles that
*should* stay hidden.

Crucially it applies the NEW rule, not the old one: only styles other than the
line's currently-active style are considered. Orders on the active style that the
old rule was hiding are deliberately left alone — those are the false hides this
whole change exists to fix, and they are meant to become visible again.

Existing completions are never modified: a MANUAL row is left as MANUAL, and an
existing AUTO row keeps its original ``created_at`` (which is what bounds
past-date reports).

Usage:
    python manage.py backfill_auto_line_completions --dry-run
    python manage.py backfill_auto_line_completions
    python manage.py backfill_auto_line_completions --line "Sewing-5"
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from tracking.models import LineStyleCompletion, ProductionLine
from tracking.models.constants import CompletionSource, LineType
from tracking.services.line_completion import sweep_auto_completions
from tracking.services.line_visibility import (
    _resolve_line_orders,
    compute_line_input_output,
    get_active_style_id_for_line,
    is_style_complete,
)


class Command(BaseCommand):
    help = "Backfill AUTO LineStyleCompletion rows before the implicit hide rule is removed."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be written without touching the database.",
        )
        parser.add_argument(
            "--line",
            type=str,
            default=None,
            help="Restrict to a single sewing line by name.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        line_name = options.get("line")

        lines = ProductionLine.objects.filter(line_type=LineType.SEWING).order_by("name")
        if line_name:
            lines = lines.filter(name=line_name)
        lines = list(lines)
        if not lines:
            self.stderr.write(self.style.ERROR("No matching sewing lines."))
            return

        mode = "DRY RUN — no writes" if dry_run else "APPLYING"
        self.stdout.write(self.style.WARNING(f"=== Backfill AUTO completions ({mode}) ===\n"))

        total_write = 0
        total_freed = 0

        for line in lines:
            orders = _resolve_line_orders(line, None)
            if not orders:
                self.stdout.write(f"{line.name}: no orders with activity — skipped")
                continue

            active_style_id = get_active_style_id_for_line(line)
            if active_style_id is None:
                self.stdout.write(f"{line.name}: no active style — skipped")
                continue

            existing = set(
                LineStyleCompletion.objects.filter(
                    production_line=line, order_id__in=[o.id for o in orders]
                ).values_list("order_id", flat=True)
            )

            # What the OLD implicit rule was hiding, for reporting.
            io = compute_line_input_output(line, orders)
            old_rule_hidden = {
                oid for oid, (i, o) in io.items() if is_style_complete(i, o)
            }
            # Active-style orders the old rule hid: these are the false hides and
            # are intentionally NOT backfilled — they become visible again.
            freed = {
                o.id
                for o in orders
                if o.style_id == active_style_id
                and o.id in old_rule_hidden
                and o.id not in existing
            }

            # Same code path as the nightly sweep (sweep_line_completions), so
            # the two commands can never drift apart in behaviour.
            to_write = sweep_auto_completions(lines=[line], dry_run=True)[line.name]

            self.stdout.write(
                f"\n{self.style.MIGRATE_HEADING(line.name)} "
                f"(active style id={active_style_id}, {len(orders)} orders with activity)"
            )
            self.stdout.write(
                f"    old implicit rule was hiding : {len(old_rule_hidden)}"
            )
            self.stdout.write(
                f"    existing completions         : {len(existing)}"
            )
            self.stdout.write(
                self.style.SUCCESS(f"    -> AUTO rows to write        : {len(to_write)}")
            )
            self.stdout.write(
                self.style.WARNING(
                    f"    -> becoming VISIBLE again    : {len(freed)} "
                    "(active style, was falsely hidden)"
                )
            )
            if freed:
                self.stdout.write(f"       order ids: {sorted(freed)}")

            if not dry_run and to_write:
                written = sweep_auto_completions(lines=[line])[line.name]
                self.stdout.write(f"       wrote {len(written)} AUTO completion(s)")

            total_write += len(to_write)
            total_freed += len(freed)

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(f"TOTAL AUTO rows {'to write' if dry_run else 'written'}: {total_write}")
        self.stdout.write(f"TOTAL orders becoming visible again: {total_freed}")
        if dry_run:
            self.stdout.write(
                self.style.WARNING("\nDry run — nothing was written. Re-run without --dry-run to apply.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nDone. AUTO completions now: "
                    f"{LineStyleCompletion.objects.filter(source=CompletionSource.AUTO).count()}"
                )
            )
