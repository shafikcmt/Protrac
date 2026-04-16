"""
Pendulum-based time utilities for consistent timezone handling.
All times are standardized to Asia/Dhaka timezone.
"""

import pendulum
from datetime import date, datetime
from typing import Tuple, Optional
from django.utils import timezone as django_timezone


# Asia/Dhaka timezone instance
DHAKA_TZ = pendulum.timezone("Asia/Dhaka")


def now() -> pendulum.DateTime:
    """Get current datetime in Asia/Dhaka timezone."""
    return pendulum.now(DHAKA_TZ)


def today() -> date:
    """Get current date in Asia/Dhaka timezone."""
    return now().date()


def to_dhaka_tz(dt: datetime) -> pendulum.DateTime:
    """Convert any datetime to Asia/Dhaka timezone."""
    if dt.tzinfo is None:
        # Assume naive datetime is already in Asia/Dhaka
        return pendulum.instance(dt, tz=DHAKA_TZ)
    return pendulum.instance(dt).in_timezone(DHAKA_TZ)


def from_date(target_date: date) -> pendulum.DateTime:
    """Create Asia/Dhaka datetime from date at midnight."""
    return pendulum.datetime(
        target_date.year, target_date.month, target_date.day, tz=DHAKA_TZ
    )


def day_range(target_date: date) -> Tuple[pendulum.DateTime, pendulum.DateTime]:
    """Get start and end of day in Asia/Dhaka timezone."""
    start = from_date(target_date)
    end = start.end_of("day")
    return start, end


def hour_range(
    target_date: date, hour: int
) -> Tuple[pendulum.DateTime, pendulum.DateTime]:
    """Get start and end of specific hour in Asia/Dhaka timezone."""
    start = from_date(target_date).add(hours=hour)
    end = start.add(hours=1) - pendulum.duration(microseconds=1)
    return start, end


def to_django_tz(dt: pendulum.DateTime) -> datetime:
    """Convert Pendulum datetime to Django timezone-aware datetime."""
    return django_timezone.make_aware(
        dt.naive(), django_timezone.get_current_timezone()
    )


def from_django_tz(dt: datetime) -> pendulum.DateTime:
    """Convert Django timezone-aware datetime to Pendulum in Asia/Dhaka."""
    if dt.tzinfo is None:
        dt = django_timezone.make_aware(dt)
    return to_dhaka_tz(dt)


def parse_date_string(date_str: str) -> Optional[date]:
    """Parse date string safely."""
    try:
        return pendulum.parse(date_str).date()
    except (ValueError, TypeError):
        return None


def parse_datetime_string(datetime_str: str) -> Optional[pendulum.DateTime]:
    """Parse datetime string and convert to Asia/Dhaka timezone."""
    try:
        dt = pendulum.parse(datetime_str)
        return dt.in_timezone(DHAKA_TZ)
    except (ValueError, TypeError):
        return None


def format_for_api(dt: pendulum.DateTime) -> str:
    """Format datetime for API response in ISO format with timezone."""
    return dt.to_iso8601_string()


def get_hourly_ranges(
    target_date: date, start_hour: int = 0, end_hour: int = 23
) -> list[Tuple[pendulum.DateTime, pendulum.DateTime]]:
    """Get list of hourly ranges for a given date."""
    ranges = []
    for hour in range(start_hour, end_hour + 1):
        ranges.append(hour_range(target_date, hour))
    return ranges
