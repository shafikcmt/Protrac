"""
Shared hourly-bucket helpers.

Every hourly table in the app (sewing v3 slide-2/3 output, parts-hourly, assembly
complete, and now the assembly-tracking hourly summary) must place a scan into the
*same* hour bucket so H1/H2/H3 line up across surfaces. That bucketing rule — the
common shift anchor (Ramadan vs normal start time) plus the lunch-break skip — lives
in ``tracking.services.sewing_dashboard_v2``.

Rather than re-implement (and risk drifting from) that rule, this module re-exposes
the exact same private helpers as small public functions and adds a convenience
``bucket_timestamps`` that turns a set of scan timestamps into per-hour counts. The
sewing v3 dashboard is intentionally left untouched.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Iterable, List, Optional

from common.utils.time import to_dhaka_tz
from tracking.models import LineTarget, ProductionLine

# Approach A: reuse the sewing v3 bucketing rule as-is (single source of truth).
from tracking.services.sewing_dashboard_v2 import (
    _get_common_hour_anchor_local as _hour_anchor,
    _hour_idx_skip_break as _hour_idx,
    _per_hour_target as _per_hour_target_impl,
)

# Fallback when a line has no LineTarget configured for the date.
DEFAULT_WORK_HOURS = 8


def get_line_target(line: ProductionLine, target_date: date) -> Optional[LineTarget]:
    """Return the configured daily target for ``line`` on ``target_date`` (or None)."""
    return LineTarget.objects.filter(line=line, date=target_date).first()


def hour_count_for(line_target: Optional[LineTarget]) -> int:
    """Number of hourly buckets = the line target's work_hours (defaults to 8)."""
    work_hours = int(getattr(line_target, "work_hours", 0) or 0) or DEFAULT_WORK_HOURS
    return max(1, work_hours)


def per_hour_target(line_target: Optional[LineTarget]) -> int:
    """Per-hour target (ceil(target_quantity / work_hours)); 0 when no target set."""
    return _per_hour_target_impl(line_target)


def get_hour_anchor(
    line: ProductionLine, target_date: date, active_only: bool = True
) -> datetime:
    """Common H1 start anchor (fixed shift start) shared with the sewing v3 tables."""
    return _hour_anchor(line, target_date, active_only=active_only)


def hour_index(
    local_ts: datetime, start_local: datetime, hour_count: int, target_date: date
) -> int:
    """0-based hour bucket for a *local* timestamp, or -1 when outside the shift."""
    return _hour_idx(local_ts, start_local, hour_count, target_date)


def bucket_timestamps(
    timestamps: Iterable[datetime],
    line: ProductionLine,
    target_date: date,
    line_target: Optional[LineTarget] = None,
    active_only: bool = True,
) -> List[int]:
    """Turn scan timestamps into per-hour counts (length == hour_count).

    Uses the exact anchor + break-skip rule as the sewing v3 dashboard, so the
    resulting H1..Hn buckets align with every other hourly table. ``line_target``
    may be passed to avoid a redundant query when the caller already has it.
    """
    if line_target is None:
        line_target = get_line_target(line, target_date)

    hc = hour_count_for(line_target)
    start_local = get_hour_anchor(line, target_date, active_only=active_only)

    counts = [0] * hc
    for ts in timestamps:
        if not ts:
            continue
        idx = hour_index(to_dhaka_tz(ts), start_local, hc, target_date)
        if 0 <= idx < hc:
            counts[idx] += 1
    return counts
