"""V3 dashboard <-> Daily Production Report Total Input parity.

The V3 sewing dashboard's "Total Input" must match the Daily Production Report
1:1: it counts the ACTIVE/current style only. A pending OLD style (a different
style still finishing while a newer style runs) is surfaced as a separate badge,
never folded into Total Input.
"""

import pytest
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from django.utils import timezone

from common.utils.time import today
from tracking.models.constants import LineType
from tracking.services.sewing_dashboard_v2 import get_sewing_dashboard_v2_data
from tracking.services.report import get_daily_production_report_data
from tracking.tests.conftest import (
    ProductionLineFactory,
    OrderFactory,
    StyleFactory,
    BuyerFactory,
    BundleFactory,
    GarmentFactory,
)

DHAKA = ZoneInfo("Asia/Dhaka")


@pytest.mark.django_db
class TestDashboardInputParity:
    def _active_dpr_input(self, rows):
        """Sum of input over DPR's ACTIVE rows (non-hidden, non-pending)."""
        return sum(
            int(r.get("input", 0) or 0)
            for r in rows
            if not r.get("is_hidden") and not r.get("is_pending_transition")
        )

    def _active_dpr_assembly(self, rows):
        """Sum of cumulative assembly over DPR's ACTIVE rows."""
        return sum(
            int((r.get("assembly_input") or {}).get("cumulative", 0) or 0)
            for r in rows
            if not r.get("is_hidden") and not r.get("is_pending_transition")
        )

    def test_total_input_matches_dpr_active_style_on_transition_line(self):
        """A line running an OLD (pending) + NEW (active) style: V3 Total Input
        equals the active NEW style only, and the OLD style becomes a badge."""
        line = ProductionLineFactory(line_type=LineType.SEWING)
        buyer = BuyerFactory()
        style_old = StyleFactory(name="OLD", buyer=buyer)
        style_new = StyleFactory(name="NEW", buyer=buyer)
        now = timezone.now()
        future = today() + timedelta(days=30)

        order_old = OrderFactory(quantity=500, style=style_old, delivery_date=future)
        order_new = OrderFactory(quantity=200, style=style_new, delivery_date=future)

        # OLD issued earlier, NEW issued later -> NEW is the active style.
        BundleFactory(
            order=order_old,
            assigned_sewing_line=line,
            issued_at=now - timedelta(hours=2),
            garment_quantity=154,
        )
        BundleFactory(
            order=order_new,
            assigned_sewing_line=line,
            issued_at=now - timedelta(hours=1),
            garment_quantity=200,
        )

        v3 = get_sewing_dashboard_v2_data(production_line_id=line.id)
        assert len(v3) == 1
        row = v3[0]

        dpr = get_daily_production_report_data(production_line_id=line.id)
        dpr_rows = dpr[0]["orders"] if dpr else []

        # Main number = active (NEW) style only, NOT old+new (would be 354).
        assert row["total_input"] == 200
        assert row["total_input"] == self._active_dpr_input(dpr_rows)

        # Active style surfaced explicitly.
        assert row["active_style_name"] == "NEW"
        assert row["active_style_id"] == style_new.id

        # Old pending style shown as a badge, not in the main number.
        assert row["pending_old_style_count"] == 1
        assert row["pending_old_pending_qty"] == 500

    def test_single_style_line_input_matches_dpr(self):
        """A single-style line: V3 Total Input equals DPR input, no badge."""
        line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(
            quantity=400, delivery_date=today() + timedelta(days=30)
        )
        BundleFactory(
            order=order,
            assigned_sewing_line=line,
            issued_at=timezone.now(),
            garment_quantity=400,
        )

        v3 = get_sewing_dashboard_v2_data(production_line_id=line.id)
        dpr = get_daily_production_report_data(production_line_id=line.id)
        dpr_rows = dpr[0]["orders"] if dpr else []

        assert v3[0]["total_input"] == 400
        assert v3[0]["total_input"] == self._active_dpr_input(dpr_rows)
        assert v3[0]["pending_old_style_count"] == 0

    def test_assembly_matches_dpr_active_style_and_excludes_old(self):
        """V3 assembly counts the ACTIVE style only (same scope as Total Input)
        and equals the DPR active rows; garments issued for assembly on an OLD
        pending style are NOT counted."""
        line = ProductionLineFactory(line_type=LineType.SEWING)
        buyer = BuyerFactory()
        style_old = StyleFactory(name="OLD", buyer=buyer)
        style_new = StyleFactory(name="NEW", buyer=buyer)
        now = timezone.now()
        future = today() + timedelta(days=30)

        order_old = OrderFactory(quantity=500, style=style_old, delivery_date=future)
        order_new = OrderFactory(quantity=200, style=style_new, delivery_date=future)
        BundleFactory(order=order_old, assigned_sewing_line=line,
                      issued_at=now - timedelta(hours=2), garment_quantity=154)
        BundleFactory(order=order_new, assigned_sewing_line=line,
                      issued_at=now - timedelta(hours=1), garment_quantity=200)

        # Fixed within-shift timestamp (09:00 Dhaka today) so the hourly bucket
        # assertion is not sensitive to when the test runs.
        assembly_ts = datetime.combine(today(), time(9, 0), tzinfo=DHAKA)

        # Active (NEW) style: 3 garments issued for assembly today.
        # High, explicit sequence numbers avoid clashing with any garments the
        # bundle factory/signals may auto-create for these orders.
        for i in range(3):
            GarmentFactory(order=order_new, sewing_line=line,
                           sequence_number=1000 + i,
                           issued_for_assembly_at=assembly_ts)
        # OLD style: 5 garments issued for assembly today -> must NOT count.
        for i in range(5):
            GarmentFactory(order=order_old, sewing_line=line,
                           sequence_number=2000 + i,
                           issued_for_assembly_at=assembly_ts)

        v3 = get_sewing_dashboard_v2_data(production_line_id=line.id)[0]
        dpr = get_daily_production_report_data(production_line_id=line.id)
        dpr_rows = dpr[0]["orders"] if dpr else []

        # Scalar assembly = active (NEW) style only, equal to DPR active rows.
        assert v3["assembly_input_cumulative"] == 3
        assert v3["assembly_input_cumulative"] == self._active_dpr_assembly(dpr_rows)

        # Hourly assembly totals also count the active style only (3), not 3+5.
        assert sum(v3["assemble_hourly_totals"]) == 3
