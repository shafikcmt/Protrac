import pytest
from datetime import datetime, time
from zoneinfo import ZoneInfo

from django.utils import timezone

from tracking.models import Scanner, Scan, LineTarget, LineStyleCompletion
from tracking.models.constants import (
    ScannerType,
    BundleStatus,
    LineType,
    ScanEventType,
)
from tracking.services.scan.assembly_daily_summary import get_assembly_daily_summary
from tracking.tests.conftest import (
    BundleFactory,
    GarmentFactory,
    ProductionLineFactory,
    UserFactory,
    PartFactory,
    OrderFactory,
    StyleFactory,
)

DHAKA = ZoneInfo("Asia/Dhaka")


@pytest.mark.django_db
class TestAssemblyDailySummaryHourly:
    """Hourly bundle-vs-assembly summary, resolved from the logged-in user's line."""

    @pytest.fixture
    def setup(self):
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = Scanner.objects.create(
            name="Asm Scanner",
            scanner_type=ScannerType.ASSEMBLY_TRACKING,
            production_line=sewing_line,
        )
        user = UserFactory(assigned_scanner=scanner)

        style = StyleFactory()
        part = PartFactory()
        style.parts.add(part)
        order = OrderFactory(style=style)

        return {
            "line": sewing_line,
            "scanner": scanner,
            "user": user,
            "style": style,
            "part": part,
            "order": order,
        }

    def _scan_at(self, scanner, local_time, *, event, bundle=None, garment=None):
        """Create a scan and force its created_at to a specific local (Dhaka) time
        today, so it lands in a deterministic hour bucket."""
        today = timezone.localdate()
        aware = datetime.combine(today, local_time, tzinfo=DHAKA)
        scan = Scan.objects.create(
            scanner=scanner, event_type=event, bundle=bundle, garment=garment
        )
        # created_at has auto_now_add=True, so bypass it with an explicit update.
        Scan.objects.filter(pk=scan.pk).update(created_at=aware)
        return scan

    def _bundle(self, order, part, line):
        return BundleFactory(
            order=order,
            part=part,
            status=BundleStatus.ISSUED_TO_SEWING,
            assigned_sewing_line=line,
            garment_quantity=10,
        )

    def test_line_resolved_from_user_and_hourly_shape(self, setup):
        """Line comes from the user's assigned scanner; hourly has one row per work
        hour with the per-hour target from the line's daily target."""
        LineTarget.objects.create(
            line=setup["line"],
            date=timezone.localdate(),
            target_quantity=80,
            work_hours=8,
        )

        result = get_assembly_daily_summary(setup["user"])

        assert result["line"] == setup["line"].name
        assert len(result["hourly"]) == 8
        # ceil(80 / 8) = 10 per hour, applied to every bucket.
        assert all(row["target"] == 10 for row in result["hourly"])
        assert result["hourly"][0]["hour"] == 1

    def test_hourly_counts_bundles_and_assembly_by_hour(self, setup):
        """BUNDLE_COMPLETED scans populate bundles_received; GARMENT_ISSUED_FOR_
        ASSEMBLY scans populate assembly_complete — bucketed by the shared shift
        anchor (normal shift starts 08:15, so 08:30 -> H1, 09:30 -> H2)."""
        LineTarget.objects.create(
            line=setup["line"],
            date=timezone.localdate(),
            target_quantity=80,
            work_hours=8,
        )
        scanner = setup["scanner"]

        # Two bundles received in H1, one in H2.
        self._scan_at(
            scanner, time(8, 30),
            event=ScanEventType.BUNDLE_COMPLETED,
            bundle=self._bundle(setup["order"], setup["part"], setup["line"]),
        )
        self._scan_at(
            scanner, time(8, 45),
            event=ScanEventType.BUNDLE_COMPLETED,
            bundle=self._bundle(setup["order"], setup["part"], setup["line"]),
        )
        self._scan_at(
            scanner, time(9, 30),
            event=ScanEventType.BUNDLE_COMPLETED,
            bundle=self._bundle(setup["order"], setup["part"], setup["line"]),
        )

        # One garment issued for assembly in H1. Use a high sequence_number so it
        # never collides with the garments auto-created by the bundles above.
        self._scan_at(
            scanner, time(8, 40),
            event=ScanEventType.GARMENT_ISSUED_FOR_ASSEMBLY,
            garment=GarmentFactory(order=setup["order"], sequence_number=9001),
        )

        result = get_assembly_daily_summary(setup["user"])
        hourly = result["hourly"]

        assert hourly[0]["bundles_received"] == 2
        assert hourly[0]["assembly_complete"] == 1
        assert hourly[1]["bundles_received"] == 1
        assert hourly[1]["assembly_complete"] == 0
        # Nothing leaks into later buckets.
        assert sum(r["bundles_received"] for r in hourly) == 3
        assert sum(r["assembly_complete"] for r in hourly) == 1
        # total_assemble (line-wide garment issues today) matches the assembly total.
        assert result["total_assemble"] == 1

    def test_hidden_order_excluded_from_hourly(self, setup):
        """A manually-completed (hidden) order's scans are excluded from the hourly
        counts, matching every other Group A surface."""
        LineTarget.objects.create(
            line=setup["line"],
            date=timezone.localdate(),
            target_quantity=80,
            work_hours=8,
        )
        scanner = setup["scanner"]

        self._scan_at(
            scanner, time(8, 30),
            event=ScanEventType.BUNDLE_COMPLETED,
            bundle=self._bundle(setup["order"], setup["part"], setup["line"]),
        )
        self._scan_at(
            scanner, time(8, 40),
            event=ScanEventType.GARMENT_ISSUED_FOR_ASSEMBLY,
            garment=GarmentFactory(order=setup["order"], sequence_number=9001),
        )

        # Visible before completion.
        before = get_assembly_daily_summary(setup["user"])
        assert sum(r["bundles_received"] for r in before["hourly"]) == 1
        assert sum(r["assembly_complete"] for r in before["hourly"]) == 1

        # Hide the order on this line.
        LineStyleCompletion.objects.create(
            production_line=setup["line"], order=setup["order"]
        )

        after = get_assembly_daily_summary(setup["user"])
        assert sum(r["bundles_received"] for r in after["hourly"]) == 0
        assert sum(r["assembly_complete"] for r in after["hourly"]) == 0
        assert after["total_assemble"] == 0

    def test_no_line_target_returns_empty_hourly(self, setup):
        """With no daily target configured for the line/date, the hourly block is
        empty so the UI can show a 'no daily target' fallback (mirrors sewing v3).
        Must not crash even though scans exist."""
        # A scan today, but no LineTarget for the line.
        self._scan_at(
            setup["scanner"], time(8, 30),
            event=ScanEventType.BUNDLE_COMPLETED,
            bundle=self._bundle(setup["order"], setup["part"], setup["line"]),
        )

        result = get_assembly_daily_summary(setup["user"])

        assert result["hourly"] == []

    def test_user_without_scanner_raises(self):
        """No assigned scanner -> ValueError (the shared user->line guard)."""
        user = UserFactory()
        with pytest.raises(ValueError):
            get_assembly_daily_summary(user)
