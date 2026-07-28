"""Tests for the null-safe active_only delivery-date filter.

Regression coverage for the Sewing-6 data mismatch bug: orders with
delivery_date = NULL (no deadline entered yet) must be treated as
still-active and counted in Output/Actual metrics, not silently excluded.
Only orders whose delivery_date has clearly passed (strictly before today) are
dropped — the delivery date itself is a deadline, not an exclusion date, so an
order due today is still active.

The same null-safe rule is exercised for both the Daily Production Report
helper and the Sewing Dashboard v2 helper. Group B (garment_heatmap /
finishing_dashboard) already build the null-safe Q() inline, so they are
covered by their own report tests.
"""

from datetime import timedelta

import pytest

from tracking.models import Order
from tracking.services.report.daily_production_report import (
    _apply_active_only_by_delivery as daily_filter,
)
from tracking.services.sewing_dashboard_v2 import (
    _apply_active_only_by_delivery as v2_filter,
)
from common.utils.time import today
from tracking.tests.conftest import OrderFactory


@pytest.mark.django_db
class TestActiveOnlyDeliveryNullSafe:
    """delivery_date NULL must count as active in both dashboard helpers."""

    def _make_orders(self):
        t = today()
        null_order = OrderFactory(delivery_date=None)
        future_order = OrderFactory(delivery_date=t + timedelta(days=30))
        past_order = OrderFactory(delivery_date=t - timedelta(days=1))
        today_order = OrderFactory(delivery_date=t)
        return null_order, future_order, past_order, today_order

    def test_daily_report_helper_includes_null_and_future_excludes_past(self):
        null_order, future_order, past_order, today_order = self._make_orders()

        qs = daily_filter(
            Order.objects.all(), "delivery_date", today(), active_only=True
        )
        ids = set(qs.values_list("id", flat=True))

        assert null_order.id in ids, "NULL delivery_date must be treated as active"
        assert future_order.id in ids, "Future delivery_date must stay active"
        assert past_order.id not in ids, "Past delivery_date must be excluded"
        assert today_order.id in ids, (
            "delivery_date == cutoff must stay active — an order due today is "
            "still being produced today"
        )

    def test_daily_report_helper_active_only_false_includes_everything(self):
        null_order, future_order, past_order, today_order = self._make_orders()

        qs = daily_filter(
            Order.objects.all(), "delivery_date", today(), active_only=False
        )
        ids = set(qs.values_list("id", flat=True))

        for o in (null_order, future_order, past_order, today_order):
            assert o.id in ids

    def test_v2_helper_includes_null_and_future_excludes_past(self):
        null_order, future_order, past_order, today_order = self._make_orders()

        qs = v2_filter(Order.objects.all(), "delivery_date", active_only=True)
        ids = set(qs.values_list("id", flat=True))

        assert null_order.id in ids, "NULL delivery_date must be treated as active"
        assert future_order.id in ids, "Future delivery_date must stay active"
        assert past_order.id not in ids, "Past delivery_date must be excluded"
        assert today_order.id in ids, (
            "delivery_date == today must stay active — an order due today is "
            "still being produced today"
        )

    def test_v2_helper_active_only_false_includes_everything(self):
        null_order, future_order, past_order, today_order = self._make_orders()

        qs = v2_filter(Order.objects.all(), "delivery_date", active_only=False)
        ids = set(qs.values_list("id", flat=True))

        for o in (null_order, future_order, past_order, today_order):
            assert o.id in ids
