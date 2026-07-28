"""Condition 2 (superseded-by-newer-style) is no longer auto-hidden — it is an
overlap ALERT, and orders hide only on explicit manual completion."""
from datetime import timedelta

import pytest
from django.utils import timezone

from tracking.models import Scanner, QualityCheck, Scan, Bundle, LineStyleCompletion
from tracking.models.constants import (
    ScannerType,
    LineType,
    GarmentStatus,
    QualityCheckStatus,
    QualityCheckCheckpoint,
    ScanEventType,
)
from tracking.services import line_visibility as lv
from tracking.tests.conftest import (
    ProductionLineFactory,
    OrderFactory,
    StyleFactory,
    BundleFactory,
    PartFactory,
)


@pytest.mark.django_db
class TestStyleOverlapNoAutoHide:
    """An older style still in progress while a newer style's bundles were issued."""

    @pytest.fixture
    def scenario(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        qc_scanner = Scanner.objects.create(
            name="QC", scanner_type=ScannerType.SEWING_QC_CHECK, production_line=line
        )
        part = PartFactory()
        style_old = StyleFactory()
        style_new = StyleFactory()
        order_old = OrderFactory(style=style_old, quantity=100)
        order_new = OrderFactory(style=style_new, quantity=100)

        now = timezone.now()
        # Old style's bundle issued earlier; new style's bundle issued latest ->
        # new style becomes the line's "active style" (newest issued bundle).
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

        # The bundle auto-creates 50 garments for order_old. Give 10 of them a
        # sewing-QC PASS (output 10) — far less than input 50 -> still pending,
        # so order_old is "superseded" (older style, pending) but NOT fully output.
        garments_old = list(order_old.garments.order_by("sequence_number")[:10])
        assert len(garments_old) == 10, "bundle should auto-create garments"
        for g in garments_old:
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
            "line": line, "order_old": order_old, "order_new": order_new,
            "style_new": style_new,
        }

    def test_active_style_is_newest_issued(self, scenario):
        assert lv.get_active_style_id_for_line(scenario["line"]) == \
            scenario["style_new"].id

    def test_old_style_is_pending_transition_not_hidden(self, scenario):
        line, order_old = scenario["line"], scenario["order_old"]
        # It IS in the pending-transition (former superseded) set...
        assert order_old.id in lv.get_pending_transition_order_ids(line)
        # ...but it is NOT auto-hidden anymore (the bug fix).
        assert order_old.id not in lv.get_inactive_order_ids_for_line(line)

    def test_overlap_alert_reports_new_style_and_in_progress_order(self, scenario):
        line = scenario["line"]
        alert = lv.get_style_overlap_alert(line)
        assert alert is not None
        assert alert["new_style_id"] == scenario["style_new"].id
        assert alert["production_line_id"] == line.id
        ids = [o["order_id"] for o in alert["in_progress_orders"]]
        assert scenario["order_old"].id in ids
        row = next(o for o in alert["in_progress_orders"]
                   if o["order_id"] == scenario["order_old"].id)
        assert row["pending_quantity"] == 90  # qty 100 - output 10
        assert row["completion_id"] is None

    def test_manual_completion_hides_and_clears_alert(self, scenario):
        line, order_old = scenario["line"], scenario["order_old"]
        LineStyleCompletion.objects.create(production_line=line, order=order_old)
        # Now hidden via Condition 1 (manual)...
        assert order_old.id in lv.get_inactive_order_ids_for_line(line)
        # ...and dropped from the overlap alert (resolved).
        alert = lv.get_style_overlap_alert(line)
        ids = [] if alert is None else [o["order_id"] for o in alert["in_progress_orders"]]
        assert order_old.id not in ids
