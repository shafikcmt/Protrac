"""Visibility rule for the "Assembly Tracking History" panel.

The panel is fed by ``get_part_receive_info``. It reads PartInventory, which is
cumulative state with no date bound, so excluding only the hide-set (manual
completion ∪ fully-output) let every never-completed historical order pile up
forever. It now asks for the positive set instead —
``line_visibility.get_visible_order_ids_for_line`` — matching the daily
production report: the line's active style plus any older style still pending
transition, minus anything hidden.
"""
from datetime import timedelta

import pytest
from django.utils import timezone

from tracking.models import Bundle, LineStyleCompletion, QualityCheck, Scan, Scanner
from tracking.models.constants import (
    GarmentStatus,
    LineType,
    QualityCheckCheckpoint,
    QualityCheckStatus,
    ScanEventType,
    ScannerType,
)
from common.utils.time import today
from tracking.services import line_visibility as lv
from tracking.services.scan.assembly_tracking_receive import get_part_receive_info
from tracking.tests.conftest import (
    BundleFactory,
    OrderFactory,
    PartFactory,
    PartInventoryFactory,
    ProductionLineFactory,
    StyleFactory,
    UserFactory,
)


def _pass_sewing_qc(order, line, qc_scanner, count):
    """Give ``count`` of ``order``'s garments a sewing-QC PASS on ``line``.

    Mirrors how compute_line_input_output reads output: distinct garments with a
    PASS quality check and a sewing-QC scan from a scanner on the line.
    """
    garments = list(order.garments.order_by("sequence_number")[:count])
    assert len(garments) == count, (
        f"expected {count} auto-created garments, got {len(garments)}"
    )
    for g in garments:
        g.sewing_line = line
        g.status = GarmentStatus.SEWING_QC_PASS
        g.save(update_fields=["sewing_line", "status"])
        QualityCheck.objects.create(
            garment=g,
            status=QualityCheckStatus.PASS,
            checkpoint=QualityCheckCheckpoint.SEWING_QC,
        )
        Scan.objects.create(
            garment=g,
            scanner=qc_scanner,
            event_type=ScanEventType.SEWING_QUALITY_CHECK,
        )


def _issue(order, part, line, quantity, issued_at):
    """Issue a bundle of ``quantity`` on ``line`` at ``issued_at``."""
    bundle = BundleFactory(
        order=order, part=part, garment_quantity=quantity, assigned_sewing_line=line
    )
    Bundle.objects.filter(pk=bundle.pk).update(issued_at=issued_at)
    return bundle


@pytest.mark.django_db
class TestAssemblyHistoryVisibility:
    """One line carrying four orders in different lifecycle states."""

    @pytest.fixture
    def scenario(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        assembly_scanner = Scanner.objects.create(
            name="Assembly Tracking",
            scanner_type=ScannerType.ASSEMBLY_TRACKING,
            production_line=line,
        )
        qc_scanner = Scanner.objects.create(
            name="Sewing QC",
            scanner_type=ScannerType.SEWING_QC_CHECK,
            production_line=line,
        )
        user = UserFactory(assigned_scanner=assembly_scanner)
        part = PartFactory()
        now = timezone.now()

        # (a) The active style — newest issued bundle on the line.
        style_active = StyleFactory()
        order_active = OrderFactory(style=style_active, quantity=100)
        _issue(order_active, part, line, 100, now)
        _pass_sewing_qc(order_active, line, qc_scanner, 20)

        # (b) An older style still pending: issued earlier, output < ordered qty.
        style_pending = StyleFactory()
        order_pending = OrderFactory(style=style_pending, quantity=100)
        _issue(order_pending, part, line, 80, now - timedelta(hours=3))
        _pass_sewing_qc(order_pending, line, qc_scanner, 30)

        # (c) An older style fully output -> auto-hidden (input 50, output 50).
        style_done = StyleFactory()
        order_done = OrderFactory(style=style_done, quantity=50)
        _issue(order_done, part, line, 50, now - timedelta(days=5))
        _pass_sewing_qc(order_done, line, qc_scanner, 50)

        # (d) A long-abandoned / short-shipped run. 100 pcs were fed but only the
        # 60 ordered were ever completed; the rest was abandoned. This is the leak
        # this fix closes: output (60) >= ordered qty (60) so it is NOT pending
        # transition, yet output (60) < input (100) so is_style_complete is False
        # and it was never hidden either. It stayed on the panel indefinitely.
        style_abandoned = StyleFactory()
        order_abandoned = OrderFactory(style=style_abandoned, quantity=60)
        _issue(order_abandoned, part, line, 100, now - timedelta(days=30))
        _pass_sewing_qc(order_abandoned, line, qc_scanner, 60)

        # Every order has inventory + a receive scan on this line, so the only
        # thing that can keep it off the panel is the visibility rule itself.
        for order in (order_active, order_pending, order_done, order_abandoned):
            PartInventoryFactory(
                production_line=line, order=order, part=part, total_quantity=10
            )
            bundle = order.bundles.filter(assigned_sewing_line=line).first()
            Scan.objects.create(
                bundle=bundle,
                scanner=assembly_scanner,
                event_type=ScanEventType.BUNDLE_COMPLETED,
            )

        return {
            "line": line,
            "user": user,
            "qc_scanner": qc_scanner,
            "order_active": order_active,
            "order_pending": order_pending,
            "order_done": order_done,
            "order_abandoned": order_abandoned,
            "style_active": style_active,
        }

    # ---- the helper itself ----

    def test_abandoned_order_is_neither_pending_nor_hidden(self, scenario):
        """Guard the premise: nothing else would have excluded (d)."""
        line, oid = scenario["line"], scenario["order_abandoned"].id
        assert oid not in lv.get_pending_transition_order_ids(line)
        assert oid not in lv.get_inactive_order_ids_for_line(line)
        # ...which is exactly why the old exclude-the-hide-set filter kept it.
        assert oid not in lv.get_visible_order_ids_for_line(line)

    def test_visible_set_is_active_style_plus_pending_old(self, scenario):
        assert lv.get_visible_order_ids_for_line(scenario["line"]) == {
            scenario["order_active"].id,
            scenario["order_pending"].id,
        }

    def test_sibling_sizes_of_active_style_stay_visible(self, scenario):
        """A second size/color of the active style is the same run, not history."""
        line, part = scenario["line"], PartFactory()
        sibling = OrderFactory(style=scenario["style_active"], quantity=40)
        _issue(sibling, part, line, 40, timezone.now() - timedelta(minutes=5))
        assert sibling.id in lv.get_visible_order_ids_for_line(line)

    def test_no_cap_on_pending_old_styles(self, scenario):
        """Every pending old style is returned, matching the DPR's row-per-style."""
        line, part = scenario["line"], PartFactory()
        qc_scanner = scenario["qc_scanner"]
        second_old = OrderFactory(style=StyleFactory(), quantity=100)
        _issue(second_old, part, line, 70, timezone.now() - timedelta(hours=6))
        _pass_sewing_qc(second_old, line, qc_scanner, 15)

        visible = lv.get_visible_order_ids_for_line(line)
        assert scenario["order_pending"].id in visible
        assert second_old.id in visible

    def test_empty_line_shows_nothing(self):
        """No issued bundles -> no active style -> nothing current to show."""
        line = ProductionLineFactory(line_type=LineType.SEWING)
        order = OrderFactory(quantity=100)
        PartInventoryFactory(production_line=line, order=order, total_quantity=10)
        assert lv.get_visible_order_ids_for_line(line) == set()

    # ---- the panel payload ----

    def _panel_order_ids(self, user):
        info = get_part_receive_info(user)
        return {item["order_id"] for item in info["inventory_items"]}

    def test_panel_shows_active_and_pending_old(self, scenario):
        ids = self._panel_order_ids(scenario["user"])
        assert scenario["order_active"].id in ids
        assert scenario["order_pending"].id in ids

    def test_panel_hides_completed_old_style(self, scenario):
        assert scenario["order_done"].id not in self._panel_order_ids(scenario["user"])

    def test_panel_hides_manually_completed_old_style(self, scenario):
        """Manual completion still wins over the pending-transition exemption."""
        LineStyleCompletion.objects.create(
            production_line=scenario["line"], order=scenario["order_pending"]
        )
        assert scenario["order_pending"].id not in self._panel_order_ids(
            scenario["user"]
        )

    def test_panel_hides_manually_completed_active_style(self, scenario):
        """Hidden is subtracted last, so completing the active style hides it."""
        LineStyleCompletion.objects.create(
            production_line=scenario["line"], order=scenario["order_active"]
        )
        assert scenario["order_active"].id not in self._panel_order_ids(
            scenario["user"]
        )

    def test_panel_hides_abandoned_historical_order(self, scenario):
        """The regression: (d) used to sit on the panel forever."""
        assert scenario["order_abandoned"].id not in self._panel_order_ids(
            scenario["user"]
        )

    def test_panel_scan_history_uses_the_same_scope(self, scenario):
        """recent_scans must match inventory_items, or the 'Active' badge and the
        per-part 'last scan' line would reference orders rendered nowhere."""
        info = get_part_receive_info(scenario["user"])
        scan_order_ids = {s["bundle"]["order"]["id"] for s in info["recent_scans"]}
        assert scan_order_ids == {
            scenario["order_active"].id,
            scenario["order_pending"].id,
        }

    # ---- delivery-date gate (DPR parity) ----

    def test_expired_old_style_is_excluded(self, scenario):
        """A pending old style whose delivery date has passed drops off.

        This is what actually bounds the set: pending-transition is
        quantity-vs-output, which almost never closes, so without this gate every
        historical order accumulates forever.
        """
        order_pending = scenario["order_pending"]
        assert order_pending.id in lv.get_visible_order_ids_for_line(scenario["line"])

        order_pending.delivery_date = today() - timedelta(days=1)
        order_pending.save(update_fields=["delivery_date"])

        assert order_pending.id not in lv.get_visible_order_ids_for_line(
            scenario["line"]
        )

    def test_expired_active_style_is_also_excluded(self, scenario):
        """The active style is NOT exempt from the delivery gate — DPR parity."""
        order_active = scenario["order_active"]
        order_active.delivery_date = today() - timedelta(days=1)
        order_active.save(update_fields=["delivery_date"])

        assert order_active.id not in lv.get_visible_order_ids_for_line(
            scenario["line"]
        )

    def test_delivery_date_on_the_cutoff_is_included(self, scenario):
        """The report uses ``dd < report_date``, so today itself is still active.

        A delivery date is a deadline, not an exclusion date — an order due today
        is being produced today. Excluding it made whole lines vanish from the
        report on their busiest day.
        """
        order_active = scenario["order_active"]
        order_active.delivery_date = today()
        order_active.save(update_fields=["delivery_date"])

        assert order_active.id in lv.get_visible_order_ids_for_line(scenario["line"])

    def test_null_delivery_date_is_active_for_active_style(self, scenario):
        """NULL = no deadline entered yet = still active, matching the report and
        get_inactive_order_ids_for_heatmap. All three surfaces now agree."""
        order_active = scenario["order_active"]
        order_active.delivery_date = None
        order_active.save(update_fields=["delivery_date"])

        assert order_active.id in lv.get_visible_order_ids_for_line(scenario["line"])
        # NULL must not be treated as expired by the heatmap either.
        assert order_active.id not in lv.get_inactive_order_ids_for_heatmap(
            scenario["line"]
        )

    def test_panel_hides_expired_old_style(self, scenario):
        """End-to-end: the reported bug (old seasons on the panel)."""
        order_pending = scenario["order_pending"]
        order_pending.delivery_date = today() - timedelta(days=90)
        order_pending.save(update_fields=["delivery_date"])

        ids = self._panel_order_ids(scenario["user"])
        assert order_pending.id not in ids
        assert scenario["order_active"].id in ids

    def test_panel_empty_when_line_has_no_active_style(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = Scanner.objects.create(
            name="Assembly Tracking",
            scanner_type=ScannerType.ASSEMBLY_TRACKING,
            production_line=line,
        )
        user = UserFactory(assigned_scanner=scanner)
        PartInventoryFactory(
            production_line=line, order=OrderFactory(quantity=100), total_quantity=10
        )

        info = get_part_receive_info(user)
        assert info["inventory_items"] == []
        assert info["inventory_count"] == 0
        assert info["recent_scans"] == []
