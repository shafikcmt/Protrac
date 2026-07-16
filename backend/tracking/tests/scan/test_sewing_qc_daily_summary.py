from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest

from django.utils import timezone

from tracking.models import (
    Scanner,
    QualityCheck,
    Scan,
    LineStyleCompletion,
    LineTarget,
)
from tracking.models.constants import (
    ScannerType,
    LineType,
    GarmentStatus,
    QualityCheckStatus,
    QualityCheckCheckpoint,
    ScanEventType,
)
from tracking.services.scan.sewing_qc_daily_summary import (
    get_sewing_qc_daily_summary,
)
from tracking.tests.conftest import (
    ProductionLineFactory,
    UserFactory,
    OrderFactory,
    GarmentFactory,
    DefectFactory,
    StyleFactory,
    SizeFactory,
)


@pytest.mark.django_db
class TestSewingQCDailySummary:
    """Today's sewing-QC tally, scoped to the scanner's line."""

    @pytest.fixture
    def setup(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = Scanner.objects.create(
            name="Sewing QC Scanner",
            scanner_type=ScannerType.SEWING_QC_CHECK,
            production_line=line,
        )
        user = UserFactory(assigned_scanner=scanner)
        order = OrderFactory()
        return {"line": line, "scanner": scanner, "user": user, "order": order}

    def _garment(self, setup, seq, status=GarmentStatus.SEWING_QC_PASS, **extra):
        return GarmentFactory(
            order=setup["order"],
            sequence_number=seq,
            sewing_line=setup["line"],
            status=status,
            **extra,
        )

    def _qc_scan(self, setup, garment):
        """A sewing-QC scan today — makes `garment`'s order the line's active order."""
        return Scan.objects.create(
            garment=garment,
            scanner=setup["scanner"],
            event_type=ScanEventType.SEWING_QUALITY_CHECK,
        )

    def _pass_qc_at(self, setup, seq, local_time):
        """A PASS QualityCheck today whose created_at is forced to a specific local
        (Dhaka) time, so it lands in a deterministic hour bucket."""
        qc = QualityCheck.objects.create(
            garment=self._garment(setup, seq), status=QualityCheckStatus.PASS
        )
        today = timezone.localdate()
        aware = datetime.combine(today, local_time, tzinfo=ZoneInfo("Asia/Dhaka"))
        # created_at has auto_now_add=True, so bypass it with an explicit update.
        QualityCheck.objects.filter(pk=qc.pk).update(created_at=aware)
        return qc

    def test_hourly_target_vs_actual_with_target(self, setup):
        """With a daily target, hourly has one row per work hour, the per-hour
        target from the target, and QC-pass actuals bucketed by the shared shift
        anchor (normal shift starts 08:15, so 08:30 -> H1, 09:30 -> H2)."""
        LineTarget.objects.create(
            line=setup["line"],
            date=timezone.localdate(),
            target_quantity=80,
            work_hours=8,
        )
        # Two passes in H1, one in H2.
        self._pass_qc_at(setup, 1, time(8, 30))
        self._pass_qc_at(setup, 2, time(8, 45))
        self._pass_qc_at(setup, 3, time(9, 30))

        hourly = get_sewing_qc_daily_summary(setup["user"])["hourly"]

        assert len(hourly) == 8
        assert [r["hour"] for r in hourly] == list(range(1, 9))
        # ceil(80 / 8) = 10 per hour.
        assert all(r["target"] == 10 for r in hourly)
        assert hourly[0]["actual"] == 2
        assert hourly[1]["actual"] == 1
        assert sum(r["actual"] for r in hourly) == 3

    def test_hourly_default_8hr_without_target(self, setup):
        """With no daily target, hourly defaults to 8 hours (H1..H8) with target 0
        and QC-pass actuals still filled from real scans."""
        self._pass_qc_at(setup, 1, time(8, 30))  # H1

        hourly = get_sewing_qc_daily_summary(setup["user"])["hourly"]

        assert len(hourly) == 8
        assert [r["hour"] for r in hourly] == list(range(1, 9))
        assert all(r["target"] == 0 for r in hourly)
        assert hourly[0]["actual"] == 1
        assert sum(r["actual"] for r in hourly) == 1

    def test_finishing_qc_records_excluded_from_sewing_card(self, setup):
        """A garment passing BOTH sewing QC and finishing QC the same day must count
        only ONCE here. Finishing-QC records (checkpoint FINISHING_QC) hang off the
        same sewing-line garment, so without the checkpoint scope they would leak
        into output / inspected / DHU / the hourly Actual — this guards against that."""
        dhaka = ZoneInfo("Asia/Dhaka")
        today = timezone.localdate()
        garment = self._garment(setup, 1, GarmentStatus.SEWING_QC_PASS)

        # Sewing QC PASS at 08:30 (H1) — the only record that should count here.
        sew = QualityCheck.objects.create(
            garment=garment,
            status=QualityCheckStatus.PASS,
            checkpoint=QualityCheckCheckpoint.SEWING_QC,
        )
        QualityCheck.objects.filter(pk=sew.pk).update(
            created_at=datetime.combine(today, time(8, 30), tzinfo=dhaka)
        )

        # Finishing QC PASS at 10:00 the SAME day on the SAME garment — must NOT
        # count on the sewing-QC card.
        fin = QualityCheck.objects.create(
            garment=garment,
            status=QualityCheckStatus.PASS,
            checkpoint=QualityCheckCheckpoint.FINISHING_QC,
        )
        QualityCheck.objects.filter(pk=fin.pk).update(
            created_at=datetime.combine(today, time(10, 0), tzinfo=dhaka)
        )

        result = get_sewing_qc_daily_summary(setup["user"])

        # Only the sewing pass counts — not the finishing pass.
        assert result["total_output"] == 1
        assert result["total_inspected"] == 1
        # Hourly Actual: the sewing pass in H1 only (finishing 10:00 excluded).
        assert result["hourly"][0]["actual"] == 1
        assert sum(h["actual"] for h in result["hourly"]) == 1

    def test_user_without_scanner_raises(self):
        user = UserFactory(assigned_scanner=None)
        with pytest.raises(ValueError):
            get_sewing_qc_daily_summary(user)

    def test_counts_output_rework_and_fail(self, setup):
        """Pass -> output, plus rework and fail tallies for the line today."""
        for seq, st in [
            (1, QualityCheckStatus.PASS),
            (2, QualityCheckStatus.PASS),
            (3, QualityCheckStatus.REWORK),
            (4, QualityCheckStatus.FAIL),
        ]:
            QualityCheck.objects.create(garment=self._garment(setup, seq), status=st)

        result = get_sewing_qc_daily_summary(setup["user"])

        assert result["line"] == setup["line"].name
        assert result["total_output"] == 2
        assert result["total_rework"] == 1
        assert result["total_fail"] == 1
        assert result["total_inspected"] == 4
        # Pass rate = 2 pass / 4 checks = 50%.
        assert result["pass_rate"] == 50.0

    def test_other_line_excluded(self, setup):
        """QC on a garment from another sewing line is not counted."""
        other_line = ProductionLineFactory(line_type=LineType.SEWING)
        other_garment = GarmentFactory(
            order=setup["order"], sequence_number=99, sewing_line=other_line
        )
        QualityCheck.objects.create(
            garment=other_garment, status=QualityCheckStatus.PASS
        )
        QualityCheck.objects.create(
            garment=self._garment(setup, 1), status=QualityCheckStatus.PASS
        )

        result = get_sewing_qc_daily_summary(setup["user"])
        assert result["total_output"] == 1
        assert result["total_inspected"] == 1

    def test_dhu_and_top_defects(self, setup):
        """DHU% = total defect tags / distinct inspected garments * 100, and the
        defect-frequency breakdown counts each code's occurrences."""
        skip = DefectFactory(code="A", name="A-SKIP STC")
        oil = DefectFactory(code="O", name="O-OIL SPOT")

        # Garment 1: fail with 2 defects (A, O).
        qc1 = QualityCheck.objects.create(
            garment=self._garment(setup, 1, GarmentStatus.SEWING_QC_FAIL),
            status=QualityCheckStatus.FAIL,
        )
        qc1.defects.set([skip, oil])
        # Garment 2: rework with 1 defect (A).
        qc2 = QualityCheck.objects.create(
            garment=self._garment(setup, 2, GarmentStatus.SEWING_QC_REWORK),
            status=QualityCheckStatus.REWORK,
        )
        qc2.defects.set([skip])
        # Garment 3: clean pass, no defects.
        QualityCheck.objects.create(
            garment=self._garment(setup, 3), status=QualityCheckStatus.PASS
        )

        result = get_sewing_qc_daily_summary(setup["user"])

        assert result["total_defects"] == 3  # A,O + A
        assert result["total_inspected"] == 3
        assert result["dhu"] == 100.0  # 3 / 3 * 100
        # Most-frequent defect first: A (2) then O (1).
        assert result["top_defects"] == [
            {"code": "A", "name": "A-SKIP STC", "count": 2},
            {"code": "O", "name": "O-OIL SPOT", "count": 1},
        ]

    def test_reevaluated_garment_counts_once_as_inspected(self, setup):
        """A garment failed then re-scanned to pass today: one inspected unit,
        both QC records counted (a fail and a pass), defects still tallied."""
        defect = DefectFactory(code="A", name="A-SKIP STC")
        garment = self._garment(setup, 1, GarmentStatus.SEWING_QC_PASS)

        qc_fail = QualityCheck.objects.create(
            garment=garment, status=QualityCheckStatus.FAIL
        )
        qc_fail.defects.set([defect])
        QualityCheck.objects.create(garment=garment, status=QualityCheckStatus.PASS)

        result = get_sewing_qc_daily_summary(setup["user"])

        assert result["total_output"] == 1
        assert result["total_fail"] == 1
        # Distinct garment inspected once despite two scans.
        assert result["total_inspected"] == 1
        assert result["total_defects"] == 1
        assert result["dhu"] == 100.0

    # --- Serial-status grid ---

    def test_grid_absent_without_scan_today(self, setup):
        """No sewing-QC scan today -> no active order -> empty grid."""
        self._garment(setup, 1, GarmentStatus.ISSUED_FOR_ASSEMBLY)

        result = get_sewing_qc_daily_summary(setup["user"])

        assert result["active_order"] is None
        assert result["garments_grid"] == []

    def test_grid_groups_statuses_and_merges_fail_into_rework(self, setup):
        """Grid shows the active order's garments: pending (issued), pass (today),
        and fail+rework merged into one 'sewing_qc_rework' bucket, ascending serial."""
        today = timezone.localdate()
        pending = self._garment(setup, 1, GarmentStatus.ISSUED_FOR_ASSEMBLY)
        rework = self._garment(setup, 2, GarmentStatus.SEWING_QC_REWORK)
        fail = self._garment(setup, 3, GarmentStatus.SEWING_QC_FAIL)
        passed = self._garment(
            setup, 4, GarmentStatus.SEWING_QC_PASS,
            assembly_completed_at=timezone.now(),
        )
        # A sewing-QC scan today anchors the active order.
        self._qc_scan(setup, passed)

        result = get_sewing_qc_daily_summary(setup["user"])

        assert result["active_order"] == {
            "order_number": setup["order"].order_number,
            "style": setup["order"].style.name,
        }
        assert result["garments_grid"] == [
            {"sequence_number": 1, "tracking_code": pending.tracking_code,
             "status": "issued_for_assembly"},
            {"sequence_number": 2, "tracking_code": rework.tracking_code,
             "status": "sewing_qc_rework"},
            {"sequence_number": 3, "tracking_code": fail.tracking_code,
             "status": "sewing_qc_rework"},
            {"sequence_number": 4, "tracking_code": passed.tracking_code,
             "status": "sewing_qc_pass"},
        ]
        assert result["date"] == today.isoformat()

    def test_grid_pass_ages_out_after_its_day_but_pending_rework_persist(self, setup):
        """A garment that passed on a PREVIOUS day drops off the grid entirely,
        while pending + rework garments from earlier days are still shown."""
        yesterday = timezone.now() - timedelta(days=1)
        pending = self._garment(setup, 1, GarmentStatus.ISSUED_FOR_ASSEMBLY)
        rework = self._garment(setup, 2, GarmentStatus.SEWING_QC_REWORK)
        # Passed yesterday: status is still sewing_qc_pass, but it has aged out.
        self._garment(
            setup, 3, GarmentStatus.SEWING_QC_PASS,
            assembly_completed_at=yesterday,
        )
        # A scan today (on a still-pending garment) keeps the order active.
        self._qc_scan(setup, pending)

        result = get_sewing_qc_daily_summary(setup["user"])

        seqs = [c["sequence_number"] for c in result["garments_grid"]]
        assert seqs == [1, 2]  # yesterday's pass (seq 3) is gone
        statuses = {c["sequence_number"]: c["status"] for c in result["garments_grid"]}
        assert statuses[1] == "issued_for_assembly"
        assert statuses[2] == "sewing_qc_rework"

    def test_grid_scoped_to_active_order_and_line(self, setup):
        """Grid only includes the active order's garments on this line."""
        other_order = OrderFactory()
        # Active order = setup['order'] (scanned today).
        active_pending = self._garment(setup, 1, GarmentStatus.ISSUED_FOR_ASSEMBLY)
        self._qc_scan(setup, active_pending)
        # A garment on the same line but a DIFFERENT order must not appear.
        GarmentFactory(
            order=other_order,
            sequence_number=1,
            sewing_line=setup["line"],
            status=GarmentStatus.ISSUED_FOR_ASSEMBLY,
        )

        result = get_sewing_qc_daily_summary(setup["user"])

        assert result["active_order"]["order_number"] == setup["order"].order_number
        assert [c["tracking_code"] for c in result["garments_grid"]] == [
            active_pending.tracking_code
        ]


@pytest.mark.django_db
class TestSewingQCDailySummaryOrderGroups:
    """`order_groups`: every order active in sewing-QC TODAY (size-wise) gets its
    own serial grid, most recently active on top."""

    @pytest.fixture
    def setup(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = Scanner.objects.create(
            name="Sewing QC Scanner",
            scanner_type=ScannerType.SEWING_QC_CHECK,
            production_line=line,
        )
        user = UserFactory(assigned_scanner=scanner)
        style = StyleFactory()
        return {"line": line, "scanner": scanner, "user": user, "style": style}

    def _qc_scan_at(self, setup, garment, minutes_ago):
        """A sewing-QC scan today, pinned to a specific time (created_at has
        auto_now_add, so overwrite it) to make recency deterministic."""
        scan = Scan.objects.create(
            garment=garment,
            scanner=setup["scanner"],
            event_type=ScanEventType.SEWING_QUALITY_CHECK,
        )
        when = timezone.now() - timedelta(minutes=minutes_ago)
        Scan.objects.filter(pk=scan.pk).update(created_at=when)
        return scan

    def _garment(self, order, line, seq, status=GarmentStatus.SEWING_QC_PASS, **extra):
        return GarmentFactory(
            order=order,
            sequence_number=seq,
            sewing_line=line,
            status=status,
            **extra,
        )

    def test_multiple_sizes_same_style_all_appear_sorted_by_recency(self, setup):
        """Two sizes of the same style QC'd today -> two order_groups, the more
        recently active order on top, each carrying its own size + grid."""
        style, line = setup["style"], setup["line"]
        order_s = OrderFactory(style=style, size=SizeFactory(name="S"))
        order_l = OrderFactory(style=style, size=SizeFactory(name="L"))

        g_s = self._garment(order_s, line, 1, GarmentStatus.ISSUED_FOR_ASSEMBLY)
        g_l = self._garment(order_l, line, 1, GarmentStatus.ISSUED_FOR_ASSEMBLY)
        # Size S scanned earlier (10 min ago), size L later (2 min ago) -> L on top.
        self._qc_scan_at(setup, g_s, minutes_ago=10)
        self._qc_scan_at(setup, g_l, minutes_ago=2)

        result = get_sewing_qc_daily_summary(setup["user"])
        groups = result["order_groups"]

        assert len(groups) == 2
        assert groups[0]["size"] == "L"
        assert groups[1]["size"] == "S"
        assert groups[0]["style"] == style.name
        assert groups[0]["order_number"] == order_l.order_number
        assert [c["sequence_number"] for c in groups[0]["garments_grid"]] == [1]
        # Backward-compat: active_order + flat grid mirror the top group.
        assert result["active_order"]["order_number"] == order_l.order_number
        assert result["garments_grid"] == groups[0]["garments_grid"]

    def test_order_with_no_qc_scan_today_absent(self, setup):
        """An order with garments on this line but no sewing-QC scan today never
        appears in order_groups."""
        style, line = setup["style"], setup["line"]
        active = OrderFactory(style=style, size=SizeFactory(name="M"))
        idle = OrderFactory(style=style, size=SizeFactory(name="XL"))
        self._garment(idle, line, 1, GarmentStatus.ISSUED_FOR_ASSEMBLY)

        g = self._garment(active, line, 1, GarmentStatus.ISSUED_FOR_ASSEMBLY)
        self._qc_scan_at(setup, g, minutes_ago=1)

        result = get_sewing_qc_daily_summary(setup["user"])
        numbers = [grp["order_number"] for grp in result["order_groups"]]

        assert active.order_number in numbers
        assert idle.order_number not in numbers
        assert len(result["order_groups"]) == 1

    def test_hidden_order_excluded_from_order_groups(self, setup):
        """A manually-completed (hidden) order is dropped from order_groups."""
        style, line = setup["style"], setup["line"]
        order = OrderFactory(style=style, size=SizeFactory(name="S"))
        g = self._garment(order, line, 1, GarmentStatus.ISSUED_FOR_ASSEMBLY)
        self._qc_scan_at(setup, g, minutes_ago=1)

        before = get_sewing_qc_daily_summary(setup["user"])
        assert len(before["order_groups"]) == 1

        LineStyleCompletion.objects.create(production_line=line, order=order)

        after = get_sewing_qc_daily_summary(setup["user"])
        assert after["order_groups"] == []
        assert after["active_order"] is None
        assert after["garments_grid"] == []
