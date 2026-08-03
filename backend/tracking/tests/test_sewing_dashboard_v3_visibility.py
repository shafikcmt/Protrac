"""V3 kiosk dashboard honours the shared line-visibility rule.

The V3 sewing dashboard used to drop an older style from its WIP figures as soon
as a newer style's bundles were issued on the line — the same
superseded-by-newer-style auto-hide that was removed from
``line_visibility.get_inactive_order_ids_for_line``. V3 re-implemented it by
filtering out the DPR's ``is_pending_transition`` rows, so a line mid-transition
showed only the just-issued style and blanked the style actually being produced.

These tests pin the corrected behaviour: an order hides only when it is fully
output or explicitly marked complete.
"""
from datetime import timedelta

import pytest
from django.utils import timezone

from common.utils.time import today
from tracking.models import (
    Scanner,
    QualityCheck,
    Scan,
    Bundle,
    LineStyleCompletion,
)
from tracking.models.constants import (
    ScannerType,
    LineType,
    GarmentStatus,
    QualityCheckStatus,
    QualityCheckCheckpoint,
    ScanEventType,
)
from tracking.services.line_completion import reconcile_order_completion
from tracking.services.sewing_dashboard_v2 import get_sewing_dashboard_v2_data
from tracking.tests.conftest import (
    ProductionLineFactory,
    OrderFactory,
    StyleFactory,
    BundleFactory,
    PartFactory,
    backdate_completion,
)


@pytest.mark.django_db
class TestV3PendingTransitionStaysVisible:
    """Mirrors Sewing-6: an in-progress old style + a just-issued new style."""

    @pytest.fixture
    def scenario(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        qc_scanner = Scanner.objects.create(
            name="QC", scanner_type=ScannerType.SEWING_QC_CHECK, production_line=line
        )
        part = PartFactory()
        future = today() + timedelta(days=30)

        style_old = StyleFactory(name="OLD")
        style_new = StyleFactory(name="NEW")
        order_old = OrderFactory(style=style_old, quantity=100, delivery_date=future)
        order_new = OrderFactory(style=style_new, quantity=100, delivery_date=future)

        now = timezone.now()
        # OLD issued earlier, NEW issued last -> NEW is the "newest" style.
        b_old = BundleFactory(
            order=order_old, part=part, garment_quantity=50,
            assigned_sewing_line=line,
        )
        Bundle.objects.filter(pk=b_old.pk).update(issued_at=now - timedelta(hours=3))
        b_new = BundleFactory(
            order=order_new, part=part, garment_quantity=40,
            assigned_sewing_line=line,
        )
        Bundle.objects.filter(pk=b_new.pk).update(issued_at=now)

        # OLD has real production today: 10 of its 50 garments pass sewing QC.
        # Input 50 > output 10, so it is neither complete nor manually hidden.
        for g in list(order_old.garments.order_by("sequence_number")[:10]):
            g.sewing_line = line
            g.status = GarmentStatus.SEWING_QC_PASS
            g.save(update_fields=["sewing_line", "status"])
            QualityCheck.objects.create(
                garment=g, status=QualityCheckStatus.PASS,
                checkpoint=QualityCheckCheckpoint.SEWING_QC,
            )
            Scan.objects.create(
                garment=g, scanner=qc_scanner,
                event_type=ScanEventType.SEWING_QUALITY_CHECK,
            )

        return {
            "line": line,
            "order_old": order_old,
            "order_new": order_new,
            "style_new": style_new,
            "qc_scanner": qc_scanner,
        }

    def _row(self, line):
        rows = get_sewing_dashboard_v2_data(production_line_id=line.id)
        assert len(rows) == 1
        return rows[0]

    def test_both_styles_are_listed(self, scenario):
        row = self._row(scenario["line"])
        # Newest-issued style first, in-progress old style still present.
        assert row["active_style_names"] == ["NEW", "OLD"]
        # Back-compat scalar keeps pointing at the newest style.
        assert row["active_style_name"] == "NEW"
        assert row["active_style_id"] == scenario["style_new"].id

    def test_old_style_contributes_to_input_output_and_wip(self, scenario):
        row = self._row(scenario["line"])
        # Input = OLD 50 + NEW 40. Under the old auto-hide this was 40.
        assert row["total_input"] == 90
        # Output comes entirely from the OLD style's 10 QC passes; if OLD were
        # excluded this would be 0.
        assert row["total_output"] == 10
        assert row["line_wip"] == 80

    def test_overlap_is_reported_as_a_badge_not_an_exclusion(self, scenario):
        row = self._row(scenario["line"])
        # The badge still fires. Membership is order-quantity based (qty 100 -
        # output 10 > 0), while the quantity shown is work in progress on the
        # floor: input 50 - output 10 = 40.
        assert row["pending_old_style_count"] == 1
        assert row["pending_old_pending_qty"] == 40
        # ...while the same style remains counted in the headline figures.
        assert row["total_input"] == 90

    def test_manual_completion_removes_the_old_style(self, scenario):
        line, order_old = scenario["line"], scenario["order_old"]
        # Backdated: the point here is that an explicit completion is what removes
        # the style, not when that removal starts applying.
        backdate_completion(
            LineStyleCompletion.objects.create(production_line=line, order=order_old)
        )

        row = self._row(line)
        # Explicit completion is the only thing that hides it -> NEW only.
        assert row["active_style_names"] == ["NEW"]
        assert row["total_input"] == 40
        assert row["total_output"] == 0
        assert row["pending_old_style_count"] == 0

    def test_fully_output_old_style_is_removed_once_the_qc_trigger_fires(
        self, scenario
    ):
        """Input == Output hides a superseded style — but only via the trigger.

        Completeness is no longer evaluated at query time (it false-hid live
        styles whose fed batch was momentarily caught up). It is evaluated when a
        sewing-QC pass lands on a non-active style, which is what
        ``process_sewing_qc_scan`` calls. This test writes QC rows directly, so it
        invokes ``reconcile_order_completion`` explicitly to stand in for the scan.
        """
        line, order_old = scenario["line"], scenario["order_old"]
        qc_scanner = scenario["qc_scanner"]

        # Pass the remaining 40 garments so output (50) reaches input (50).
        remaining = list(
            order_old.garments.exclude(status=GarmentStatus.SEWING_QC_PASS)
            .order_by("sequence_number")
        )
        for g in remaining:
            g.sewing_line = line
            g.status = GarmentStatus.SEWING_QC_PASS
            g.save(update_fields=["sewing_line", "status"])
            QualityCheck.objects.create(
                garment=g, status=QualityCheckStatus.PASS,
                checkpoint=QualityCheckCheckpoint.SEWING_QC,
            )
            Scan.objects.create(
                garment=g, scanner=qc_scanner,
                event_type=ScanEventType.SEWING_QUALITY_CHECK,
            )

        # Until the trigger runs the style is still listed — recording the
        # completion is what hides it, not the raw numbers.
        assert self._row(line)["active_style_names"] == ["NEW", "OLD"]

        assert reconcile_order_completion(line, order_old) is True

        # The trigger wrote the completion, but a completion only hides from the
        # day after it was recorded — today still shows the output that was just
        # QC-passed. Backdate it to assert the hide itself, which is what this
        # test is about.
        backdate_completion(
            LineStyleCompletion.objects.get(production_line=line, order=order_old)
        )

        row = self._row(line)
        assert row["active_style_names"] == ["NEW"]
        assert row["total_input"] == 40
