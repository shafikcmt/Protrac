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
    SizeFactory,
    backdate_completion,
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

        # Hide the order on this line. Backdated: a completion takes effect the
        # day after it is recorded, and this test is about the exclusion itself.
        backdate_completion(
            LineStyleCompletion.objects.create(
                production_line=setup["line"], order=setup["order"]
            )
        )

        after = get_assembly_daily_summary(setup["user"])
        assert sum(r["bundles_received"] for r in after["hourly"]) == 0
        assert sum(r["assembly_complete"] for r in after["hourly"]) == 0
        assert after["total_assemble"] == 0

    def test_garments_grid_shows_pending_and_issued_today_only(self, setup):
        """The active order's serial grid is a fresh-each-day worklist: garments
        still pending + garments issued for assembly TODAY are both shown (issued
        stay visible all day), while garments issued on a PREVIOUS day drop off."""
        order = setup["order"]
        scanner = setup["scanner"]

        today = timezone.localdate()
        now_today = datetime.combine(today, time(9, 0), tzinfo=DHAKA)
        yesterday_dt = now_today - timezone.timedelta(days=1)

        # Pending — never issued.
        GarmentFactory(order=order, sequence_number=1, issued_for_assembly_at=None)
        # Issued today — stays visible in the grid all day.
        issued_today = GarmentFactory(
            order=order, sequence_number=2, issued_for_assembly_at=now_today
        )
        # Issued yesterday — must drop off (fresh reset each day).
        GarmentFactory(
            order=order, sequence_number=3, issued_for_assembly_at=yesterday_dt
        )

        # A garment-issue scan today makes this the active order for the grid.
        self._scan_at(
            scanner, time(9, 0),
            event=ScanEventType.GARMENT_ISSUED_FOR_ASSEMBLY,
            garment=issued_today,
        )

        result = get_assembly_daily_summary(setup["user"])

        assert result["active_order"]["order_number"] == order.order_number
        grid = result["garments_grid"]
        # Only the pending (#1) and issued-today (#2) garments; yesterday's #3 gone.
        assert [g["sequence_number"] for g in grid] == [1, 2]
        by_seq = {g["sequence_number"]: g["status"] for g in grid}
        assert by_seq[1] == "pending_assembly"
        assert by_seq[2] == "issued_for_assembly"

    def test_no_line_target_returns_default_8hr_hourly(self, setup):
        """With no daily target configured, the hourly block defaults to 8 hours
        (H1..H8) with a per-hour target of 0, and actuals are still filled from
        real scan data (bucketed by the shared shift anchor)."""
        # A bundle received at 08:30 (H1) and a garment issued at 08:40 (H1), but
        # no LineTarget for the line.
        self._scan_at(
            setup["scanner"], time(8, 30),
            event=ScanEventType.BUNDLE_COMPLETED,
            bundle=self._bundle(setup["order"], setup["part"], setup["line"]),
        )
        self._scan_at(
            setup["scanner"], time(8, 40),
            event=ScanEventType.GARMENT_ISSUED_FOR_ASSEMBLY,
            garment=GarmentFactory(order=setup["order"], sequence_number=9002),
        )

        result = get_assembly_daily_summary(setup["user"])
        hourly = result["hourly"]

        # Default 8-hour grid, every target 0.
        assert len(hourly) == 8
        assert [r["hour"] for r in hourly] == list(range(1, 9))
        assert all(r["target"] == 0 for r in hourly)

        # Actuals filled from real scans — both land in H1.
        assert hourly[0]["bundles_received"] == 1
        assert hourly[0]["assembly_complete"] == 1
        assert sum(r["bundles_received"] for r in hourly) == 1
        assert sum(r["assembly_complete"] for r in hourly) == 1

    def test_user_without_scanner_raises(self):
        """No assigned scanner -> ValueError (the shared user->line guard)."""
        user = UserFactory()
        with pytest.raises(ValueError):
            get_assembly_daily_summary(user)


@pytest.mark.django_db
class TestAssemblyDailySummaryOrderGroups:
    """`order_groups`: every order active TODAY (size-wise) gets its own serial
    grid, most recently active on top."""

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
        return {
            "line": sewing_line,
            "scanner": scanner,
            "user": user,
            "style": style,
        }

    def _issue_scan_at(self, scanner, local_time, garment):
        """Create a GARMENT_ISSUED_FOR_ASSEMBLY scan pinned to a local Dhaka time
        today (created_at has auto_now_add, so overwrite it explicitly)."""
        aware = datetime.combine(timezone.localdate(), local_time, tzinfo=DHAKA)
        scan = Scan.objects.create(
            scanner=scanner,
            event_type=ScanEventType.GARMENT_ISSUED_FOR_ASSEMBLY,
            garment=garment,
        )
        Scan.objects.filter(pk=scan.pk).update(created_at=aware)
        return scan

    def test_multiple_sizes_same_style_all_appear_sorted_by_recency(self, setup):
        """Two sizes of the same style scanned today -> two order_groups, the more
        recently active order on top, each carrying its own size + grid."""
        style = setup["style"]
        scanner = setup["scanner"]
        now_today = datetime.combine(timezone.localdate(), time(9, 0), tzinfo=DHAKA)

        order_s = OrderFactory(style=style, size=SizeFactory(name="S"))
        order_l = OrderFactory(style=style, size=SizeFactory(name="L"))

        # Size S issued earlier, size L later -> L is the most recently active.
        g_s = GarmentFactory(
            order=order_s, sequence_number=1, issued_for_assembly_at=now_today
        )
        g_l = GarmentFactory(
            order=order_l, sequence_number=1, issued_for_assembly_at=now_today
        )
        self._issue_scan_at(scanner, time(8, 30), g_s)
        self._issue_scan_at(scanner, time(9, 30), g_l)

        result = get_assembly_daily_summary(setup["user"])
        groups = result["order_groups"]

        assert len(groups) == 2
        # Most recently active (size L) first.
        assert groups[0]["size"] == "L"
        assert groups[1]["size"] == "S"
        assert groups[0]["style"] == style.name
        assert groups[0]["order_number"] == order_l.order_number
        # Each group carries its own grid (its own single issued garment here).
        assert [c["sequence_number"] for c in groups[0]["garments_grid"]] == [1]
        assert [c["sequence_number"] for c in groups[1]["garments_grid"]] == [1]
        # Backward-compat: active_order + flat grid mirror the top group.
        assert result["active_order"]["order_number"] == order_l.order_number
        assert result["garments_grid"] == groups[0]["garments_grid"]

    def test_order_with_no_activity_today_absent(self, setup):
        """An order with garments but no issue/receive scan today never appears."""
        style = setup["style"]
        scanner = setup["scanner"]
        now_today = datetime.combine(timezone.localdate(), time(9, 0), tzinfo=DHAKA)

        active = OrderFactory(style=style, size=SizeFactory(name="M"))
        idle = OrderFactory(style=style, size=SizeFactory(name="XL"))
        # `idle` has a pending garment but no scan today.
        GarmentFactory(order=idle, sequence_number=1, issued_for_assembly_at=None)

        g = GarmentFactory(
            order=active, sequence_number=1, issued_for_assembly_at=now_today
        )
        self._issue_scan_at(scanner, time(9, 0), g)

        result = get_assembly_daily_summary(setup["user"])
        numbers = [grp["order_number"] for grp in result["order_groups"]]

        assert active.order_number in numbers
        assert idle.order_number not in numbers
        assert len(result["order_groups"]) == 1

    def test_hidden_order_excluded_from_order_groups(self, setup):
        """A manually-completed (hidden) order is dropped from order_groups too."""
        style = setup["style"]
        scanner = setup["scanner"]
        now_today = datetime.combine(timezone.localdate(), time(9, 0), tzinfo=DHAKA)

        order = OrderFactory(style=style, size=SizeFactory(name="S"))
        g = GarmentFactory(
            order=order, sequence_number=1, issued_for_assembly_at=now_today
        )
        self._issue_scan_at(scanner, time(9, 0), g)

        before = get_assembly_daily_summary(setup["user"])
        assert len(before["order_groups"]) == 1

        backdate_completion(
            LineStyleCompletion.objects.create(
                production_line=setup["line"], order=order
            )
        )

        after = get_assembly_daily_summary(setup["user"])
        assert after["order_groups"] == []
        assert after["active_order"] is None
        assert after["garments_grid"] == []
