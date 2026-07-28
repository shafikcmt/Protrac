"""V3 dashboard <-> Daily Production Report Total Input parity.

The V3 sewing dashboard derives "Total Input" from the Daily Production Report
rows, counting every LIVE row — i.e. every order not hidden under the shared
visibility rule (manually completed OR Input==Output; see
``line_visibility.get_inactive_order_ids_for_line``).

A pending OLD style — a style still in progress when a newer style is issued on
the line — is deliberately INCLUDED. Issuing the next style must never blank an
in-progress style off the kiosk; that auto-hide was removed from the shared
visibility rule and V3 follows it. The overlap is additionally surfaced as a
badge (``pending_old_*``) as an alert, not as an exclusion.

Consequence: on a transition line V3's Total Input is the sum over all live
styles and therefore EXCEEDS the DPR's single active-style row. Parity is with
the DPR's live row set, not with its active row.
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
    def _live_dpr_input(self, rows):
        """Sum of input over DPR's LIVE rows (every non-hidden row)."""
        return sum(
            int(r.get("input", 0) or 0) for r in rows if not r.get("is_hidden")
        )

    def _live_dpr_assembly(self, rows):
        """Sum of cumulative assembly over DPR's LIVE rows."""
        return sum(
            int((r.get("assembly_input") or {}).get("cumulative", 0) or 0)
            for r in rows
            if not r.get("is_hidden")
        )

    def test_total_input_includes_pending_old_style_on_transition_line(self):
        """A line running an OLD (pending) + NEW (just-issued) style: V3 Total
        Input counts BOTH, and the OLD style is additionally badged.

        Regression guard for the superseded-by-newer-style auto-hide: issuing a
        newer style must not drop the in-progress older style off the kiosk.
        Expected values are hard-coded rather than recomputed from the DPR rows,
        so this test fails if V3 silently starts excluding the old style again.
        """
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

        # Main number = OLD + NEW (154 + 200). If the auto-hide regresses this
        # collapses back to 200.
        assert row["total_input"] == 354
        assert row["total_input"] == self._live_dpr_input(dpr_rows)

        # WIP covers both styles too (no output recorded yet).
        assert row["total_output"] == 0
        assert row["line_wip"] == 354

        # Primary style = newest issued; both live styles are listed.
        assert row["active_style_id"] == style_new.id
        assert row["active_style_name"] == "NEW"  # back-compat scalar
        assert row["active_style_names"] == ["NEW", "OLD"]

        # Old pending style is ALSO badged — an alert, not an exclusion.
        assert row["pending_old_style_count"] == 1
        assert row["pending_old_pending_qty"] == 500

    def test_manually_completed_old_style_is_excluded(self):
        """The one thing that DOES remove an old style: explicit completion.

        Complements the test above — proves Total Input is filtered by the
        shared hidden rule, not simply unfiltered.
        """
        from tracking.models import LineStyleCompletion

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

        LineStyleCompletion.objects.create(production_line=line, order=order_old)

        row = get_sewing_dashboard_v2_data(production_line_id=line.id)[0]

        # OLD is hidden by explicit completion -> back to the NEW style only.
        assert row["total_input"] == 200
        assert row["active_style_names"] == ["NEW"]
        assert row["pending_old_style_count"] == 0

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
        assert v3[0]["total_input"] == self._live_dpr_input(dpr_rows)
        assert v3[0]["pending_old_style_count"] == 0
        # Single-style lines are unaffected by the multi-style change.
        assert len(v3[0]["active_style_names"]) == 1

    def test_assembly_matches_dpr_live_rows_and_includes_pending_old(self):
        """V3 assembly shares Total Input's scope: every live style. Garments
        issued for assembly on an OLD pending style ARE counted, both in the
        scalar and in the hourly totals."""
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

        # NEW style: 3 garments issued for assembly today.
        # High, explicit sequence numbers avoid clashing with any garments the
        # bundle factory/signals may auto-create for these orders.
        for i in range(3):
            GarmentFactory(order=order_new, sewing_line=line,
                           sequence_number=1000 + i,
                           issued_for_assembly_at=assembly_ts)
        # OLD pending style: 5 garments issued for assembly today -> DO count.
        for i in range(5):
            GarmentFactory(order=order_old, sewing_line=line,
                           sequence_number=2000 + i,
                           issued_for_assembly_at=assembly_ts)

        v3 = get_sewing_dashboard_v2_data(production_line_id=line.id)[0]
        dpr = get_daily_production_report_data(production_line_id=line.id)
        dpr_rows = dpr[0]["orders"] if dpr else []

        # Scalar assembly = both live styles (3 + 5), equal to DPR live rows.
        assert v3["assembly_input_cumulative"] == 8
        assert v3["assembly_input_cumulative"] == self._live_dpr_assembly(dpr_rows)

        # Hourly assembly totals follow the same scope: 3 + 5, not 3.
        assert sum(v3["assemble_hourly_totals"]) == 8
