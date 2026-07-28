"""Nightly safety-net sweep for auto-completion of finished styles.

The two event triggers in :mod:`tracking.services.line_completion` cover the
normal flow: a style is auto-completed when a new style is assigned to the line,
or when late output finally catches up. Both need an event to fire. A line that
finishes a style and then goes idle — nothing new issued, no more QC scans — has
no such event, so the finished style would stay visible until something happens
on that line.

This command closes that gap. It applies the same check to every sewing line,
writing an AUTO ``LineStyleCompletion`` for any superseded style whose input is
fully output. It shares its entire logic path with the one-off backfill command
(both call :func:`tracking.services.line_completion.sweep_auto_completions`), so
``--dry-run`` here behaves identically to ``--dry-run`` there.

Safety properties:
  * only ever *creates* rows, with ``source=AUTO``
  * never modifies or deletes an existing row, so a MANUAL completion is
    untouched and an existing AUTO row keeps its original ``created_at``
  * never auto-completes the line's active style
  * per-line errors are logged and skipped; the command exits 0 unless something
    catastrophic happens, so a scheduled runner is not tripped by one bad line

Usage:
    python manage.py sweep_line_completions --dry-run
    python manage.py sweep_line_completions
    python manage.py sweep_line_completions --line "Sewing-5"
"""

from __future__ import annotations

import logging

from django.core.management.base import BaseCommand

from tracking.models import ProductionLine
from tracking.models.constants import LineType
from tracking.services.line_completion import sweep_auto_completions

logger = logging.getLogger("tracking.line_completion")


class Command(BaseCommand):
    help = (
        "Sweep all sewing lines and auto-complete superseded styles whose input "
        "is fully output. Safety net for lines with no triggering event."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would be written without touching the database.",
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
            if not lines.exists():
                self.stderr.write(self.style.ERROR(f"No sewing line named {line_name!r}."))
                return

        mode = "DRY RUN — no writes" if dry_run else "APPLYING"
        self.stdout.write(self.style.WARNING(f"=== Sweep line completions ({mode}) ==="))

        results = sweep_auto_completions(lines=lines, dry_run=dry_run)

        total = 0
        for name, order_ids in results.items():
            total += len(order_ids)
            if order_ids:
                self.stdout.write(
                    self.style.SUCCESS(f"  {name}: {len(order_ids)} -> {order_ids}")
                )
            else:
                self.stdout.write(f"  {name}: nothing to complete")

        verb = "would be written" if dry_run else "written"
        self.stdout.write(f"\nTOTAL AUTO completions {verb}: {total}")
        if dry_run:
            self.stdout.write(
                self.style.WARNING("Dry run — nothing was written.")
            )
