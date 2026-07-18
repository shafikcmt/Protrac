from datetime import timedelta

import pytest

from django.utils import timezone

from tracking.models import Scanner, QualityCheck, Scan
from tracking.models.constants import (
    ScannerType,
    LineType,
    GarmentStatus,
    QualityCheckStatus,
    QualityCheckCheckpoint,
    ScanEventType,
)
from tracking.services.scan.finishing_qc_daily_summary import (
    get_finishing_qc_daily_summary,
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


def _line_setup():
    line = ProductionLineFactory(line_type=LineType.FINISHING)
    sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
    scanner = Scanner.objects.create(
        name="Finishing QC Scanner",
        scanner_type=ScannerType.FINISHING_QC_CHECK,
        production_line=line,
    )
    user = UserFactory(assigned_scanner=scanner)
    return {"line": line, "sewing_line": sewing_line, "scanner": scanner, "user": user}


@pytest.mark.django_db
class TestFinishingQCDailySummaryTiles:
    """Top tiles stay scoped to TODAY + the operator's finishing line."""

    @pytest.fixture
    def setup(self):
        s = _line_setup()
        s["order"] = OrderFactory()
        return s

    def _garment(self, setup, seq, status, on_finishing_line=True, **extra):
        return GarmentFactory(
            order=setup["order"],
            sequence_number=seq,
            sewing_line=setup["sewing_line"],
            finishing_line=setup["line"] if on_finishing_line else None,
            status=status,
            **extra,
        )

    def _finishing_qc(self, garment, status, defects=None):
        qc = QualityCheck.objects.create(
            garment=garment,
            status=status,
            checkpoint=QualityCheckCheckpoint.FINISHING_QC,
        )
        if defects:
            qc.defects.set(defects)
        return qc

    def _sewing_qc(self, garment, status=QualityCheckStatus.PASS):
        return QualityCheck.objects.create(
            garment=garment,
            status=status,
            checkpoint=QualityCheckCheckpoint.SEWING_QC,
        )

    def test_user_without_scanner_raises(self):
        user = UserFactory(assigned_scanner=None)
        with pytest.raises(ValueError):
            get_finishing_qc_daily_summary(user)

    def test_wrong_scanner_type_raises(self, setup):
        setup["scanner"].scanner_type = ScannerType.SEWING_QC_CHECK
        setup["scanner"].save()
        with pytest.raises(ValueError):
            get_finishing_qc_daily_summary(setup["user"])

    def test_counts_output_rework_and_fail(self, setup):
        """Pass -> output, plus rework and fail tallies for this line today."""
        for seq, gstatus, qstatus in [
            (1, GarmentStatus.FINISHING_QC_PASS, QualityCheckStatus.PASS),
            (2, GarmentStatus.FINISHING_QC_PASS, QualityCheckStatus.PASS),
            (3, GarmentStatus.FINISHING_QC_REWORK, QualityCheckStatus.REWORK),
            (4, GarmentStatus.FINISHING_QC_FAIL, QualityCheckStatus.FAIL),
        ]:
            self._finishing_qc(self._garment(setup, seq, gstatus), qstatus)

        result = get_finishing_qc_daily_summary(setup["user"])

        assert result["line"] == setup["line"].name
        assert result["total_output"] == 2
        assert result["total_rework"] == 1
        assert result["total_fail"] == 1
        assert result["total_inspected"] == 4
        assert result["pass_rate"] == 50.0  # 2 pass / 4 checks

    def test_sewing_records_excluded_from_finishing_card(self, setup):
        """A garment's sewing-QC record (checkpoint SEWING_QC) must never count on
        the finishing card — the checkpoint scope guards this."""
        garment = self._garment(setup, 1, GarmentStatus.FINISHING_QC_PASS)
        self._finishing_qc(garment, QualityCheckStatus.PASS)
        self._sewing_qc(garment, QualityCheckStatus.PASS)

        result = get_finishing_qc_daily_summary(setup["user"])

        assert result["total_output"] == 1
        assert result["total_inspected"] == 1

    def test_tiles_scoped_to_this_finishing_line(self, setup):
        """Finishing QC on a garment finished on ANOTHER line is not tallied."""
        other_line = ProductionLineFactory(line_type=LineType.FINISHING)
        other_garment = GarmentFactory(
            order=setup["order"],
            sequence_number=99,
            sewing_line=setup["sewing_line"],
            finishing_line=other_line,
            status=GarmentStatus.FINISHING_QC_PASS,
        )
        self._finishing_qc(other_garment, QualityCheckStatus.PASS)
        self._finishing_qc(
            self._garment(setup, 1, GarmentStatus.FINISHING_QC_PASS),
            QualityCheckStatus.PASS,
        )

        result = get_finishing_qc_daily_summary(setup["user"])
        assert result["total_output"] == 1
        assert result["total_inspected"] == 1

    def test_dhu_and_no_top_defects_or_hourly(self, setup):
        """DHU% = defect tags / distinct inspected garments * 100; the finishing
        card carries no top-defects breakdown and no hourly Target-vs-Actual."""
        skip = DefectFactory(code="A", name="A-SKIP STC")
        oil = DefectFactory(code="O", name="O-OIL SPOT")
        self._finishing_qc(
            self._garment(setup, 1, GarmentStatus.FINISHING_QC_FAIL),
            QualityCheckStatus.FAIL,
            defects=[skip, oil],
        )
        self._finishing_qc(
            self._garment(setup, 2, GarmentStatus.FINISHING_QC_REWORK),
            QualityCheckStatus.REWORK,
            defects=[skip],
        )
        self._finishing_qc(
            self._garment(setup, 3, GarmentStatus.FINISHING_QC_PASS),
            QualityCheckStatus.PASS,
        )

        result = get_finishing_qc_daily_summary(setup["user"])

        assert result["total_defects"] == 3  # A,O + A
        assert result["total_inspected"] == 3
        assert result["dhu"] == 100.0
        assert "top_defects" not in result
        assert "hourly" not in result


@pytest.mark.django_db
class TestFinishingQCDailySummaryGrid:
    """Serial grids are scoped factory-wide by the finishing pipeline (sewing-passed
    garments), NOT by finishing line, and carry a dual sewing/finishing status."""

    @pytest.fixture
    def setup(self):
        s = _line_setup()
        s["order"] = OrderFactory()
        return s

    def _garment(self, setup, seq, status, order=None, **extra):
        return GarmentFactory(
            order=order or setup["order"],
            sequence_number=seq,
            sewing_line=setup["sewing_line"],
            status=status,
            **extra,
        )

    def _sewing_qc(self, garment, status=QualityCheckStatus.PASS):
        return QualityCheck.objects.create(
            garment=garment,
            status=status,
            checkpoint=QualityCheckCheckpoint.SEWING_QC,
        )

    def _finishing_qc(self, garment, status):
        return QualityCheck.objects.create(
            garment=garment,
            status=status,
            checkpoint=QualityCheckCheckpoint.FINISHING_QC,
        )

    def test_order_appears_with_sewing_passed_garment_even_without_finishing(self, setup):
        """An order shows as soon as it has a garment that passed sewing QC —
        regardless of finishing line or any finishing scan (the serial is pending)."""
        pending = self._garment(setup, 1, GarmentStatus.SEWING_QC_PASS)
        self._sewing_qc(pending, QualityCheckStatus.PASS)

        result = get_finishing_qc_daily_summary(setup["user"])

        assert result["active_order"] == {
            "order_number": setup["order"].order_number,
            "style": setup["order"].style.name,
        }
        assert result["garments_grid"] == [
            {"sequence_number": 1, "tracking_code": pending.tracking_code,
             "sewing_status": "sewing_qc_pass",
             "finishing_status": "finishing_qc_pending",
             "finishing_checked_date": None},
        ]

    def test_order_absent_without_sewing_passed_garments(self, setup):
        """A garment only ISSUED_FOR_ASSEMBLY (not through sewing QC) is not in the
        finishing pipeline, so its order never appears."""
        self._garment(setup, 1, GarmentStatus.ISSUED_FOR_ASSEMBLY)

        result = get_finishing_qc_daily_summary(setup["user"])

        assert result["active_order"] is None
        assert result["order_groups"] == []
        assert result["garments_grid"] == []

    def test_grid_shows_dual_sewing_and_finishing_status(self, setup):
        """Each cell carries BOTH statuses: pending (no finishing record), pass, or
        rework (fail merged into rework)."""
        pending = self._garment(setup, 1, GarmentStatus.SEWING_QC_PASS)
        self._sewing_qc(pending)
        rework = self._garment(setup, 2, GarmentStatus.FINISHING_QC_REWORK)
        self._sewing_qc(rework)
        self._finishing_qc(rework, QualityCheckStatus.REWORK)
        fail = self._garment(setup, 3, GarmentStatus.FINISHING_QC_FAIL)
        self._sewing_qc(fail)
        self._finishing_qc(fail, QualityCheckStatus.FAIL)
        passed = self._garment(setup, 4, GarmentStatus.FINISHING_QC_PASS)
        self._sewing_qc(passed)
        self._finishing_qc(passed, QualityCheckStatus.PASS)

        result = get_finishing_qc_daily_summary(setup["user"])

        today = timezone.localdate().isoformat()
        assert result["garments_grid"] == [
            {"sequence_number": 1, "tracking_code": pending.tracking_code,
             "sewing_status": "sewing_qc_pass",
             "finishing_status": "finishing_qc_pending",
             "finishing_checked_date": None},
            {"sequence_number": 2, "tracking_code": rework.tracking_code,
             "sewing_status": "sewing_qc_pass",
             "finishing_status": "finishing_qc_rework",
             "finishing_checked_date": today},
            {"sequence_number": 3, "tracking_code": fail.tracking_code,
             "sewing_status": "sewing_qc_pass",
             "finishing_status": "finishing_qc_rework",
             "finishing_checked_date": today},
            {"sequence_number": 4, "tracking_code": passed.tracking_code,
             "sewing_status": "sewing_qc_pass",
             "finishing_status": "finishing_qc_pass",
             "finishing_checked_date": today},
        ]

    def test_grid_shows_all_serials_no_aging(self, setup):
        """Serials persist until the whole order is hidden — a garment that passed
        finishing on a PREVIOUS day still shows (no per-day aging)."""
        yesterday = timezone.now() - timedelta(days=1)
        pending = self._garment(setup, 1, GarmentStatus.SEWING_QC_PASS)
        self._sewing_qc(pending)
        rework = self._garment(setup, 2, GarmentStatus.FINISHING_QC_REWORK)
        self._sewing_qc(rework)
        self._finishing_qc(rework, QualityCheckStatus.REWORK)
        passed = self._garment(
            setup, 3, GarmentStatus.FINISHING_QC_PASS,
            finishing_completed_at=yesterday,
        )
        self._sewing_qc(passed)
        self._finishing_qc(passed, QualityCheckStatus.PASS)

        result = get_finishing_qc_daily_summary(setup["user"])

        seqs = [c["sequence_number"] for c in result["garments_grid"]]
        assert seqs == [1, 2, 3]  # yesterday's pass (seq 3) still shown

    def test_cell_carries_finishing_check_date_for_daywise_grouping(self, setup):
        """Each finished serial carries the local date of its latest finishing-QC
        record (for day-wise grouping); a pending serial carries null."""
        from datetime import datetime, time

        # Pending: no finishing record -> null date.
        pending = self._garment(setup, 1, GarmentStatus.SEWING_QC_PASS)
        self._sewing_qc(pending)

        # Finished two days ago at a fixed local time.
        two_days_ago = timezone.localdate() - timedelta(days=2)
        done = self._garment(setup, 2, GarmentStatus.FINISHING_QC_PASS)
        self._sewing_qc(done)
        qc = self._finishing_qc(done, QualityCheckStatus.PASS)
        aware = timezone.make_aware(datetime.combine(two_days_ago, time(10, 0)))
        QualityCheck.objects.filter(pk=qc.pk).update(created_at=aware)

        cells = {
            c["sequence_number"]: c
            for c in get_finishing_qc_daily_summary(setup["user"])["garments_grid"]
        }

        assert cells[1]["finishing_checked_date"] is None
        assert cells[2]["finishing_checked_date"] == two_days_ago.isoformat()

    def test_order_hidden_when_fully_finished(self, setup):
        """Hidden once every sewing-passed serial has also passed finishing
        (Input == Sewing Pass == Finishing Pass)."""
        for seq in (1, 2):
            g = self._garment(setup, seq, GarmentStatus.FINISHING_QC_PASS)
            self._sewing_qc(g)
            self._finishing_qc(g, QualityCheckStatus.PASS)

        result = get_finishing_qc_daily_summary(setup["user"])

        assert result["active_order"] is None
        assert result["order_groups"] == []

    def test_order_visible_while_any_serial_not_finished(self, setup):
        """One serial still pending -> not fully finished -> order stays visible."""
        done = self._garment(setup, 1, GarmentStatus.FINISHING_QC_PASS)
        self._sewing_qc(done)
        self._finishing_qc(done, QualityCheckStatus.PASS)
        pending = self._garment(setup, 2, GarmentStatus.SEWING_QC_PASS)
        self._sewing_qc(pending)

        result = get_finishing_qc_daily_summary(setup["user"])

        assert result["active_order"] is not None
        assert [c["sequence_number"] for c in result["garments_grid"]] == [1, 2]

    def test_order_hidden_when_delivery_date_expired(self, setup):
        """Delivery date on/earlier than the summary date -> order hidden."""
        setup["order"].delivery_date = timezone.localdate() - timedelta(days=1)
        setup["order"].save()
        pending = self._garment(setup, 1, GarmentStatus.SEWING_QC_PASS)
        self._sewing_qc(pending)

        result = get_finishing_qc_daily_summary(setup["user"])

        assert result["active_order"] is None
        assert result["order_groups"] == []

    def test_order_visible_with_future_delivery_date(self, setup):
        """A future delivery date keeps the order visible (null is also active)."""
        setup["order"].delivery_date = timezone.localdate() + timedelta(days=10)
        setup["order"].save()
        pending = self._garment(setup, 1, GarmentStatus.SEWING_QC_PASS)
        self._sewing_qc(pending)

        result = get_finishing_qc_daily_summary(setup["user"])

        assert result["active_order"] is not None


@pytest.mark.django_db
class TestFinishingQCDailySummaryOrderGroups:
    """`order_groups`: every visible pipeline order (size-wise) gets its own dual
    serial grid, most recently finishing-active on top."""

    @pytest.fixture
    def setup(self):
        s = _line_setup()
        s["style"] = StyleFactory()
        return s

    def _garment(self, setup, order, seq, status, **extra):
        return GarmentFactory(
            order=order,
            sequence_number=seq,
            sewing_line=setup["sewing_line"],
            status=status,
            **extra,
        )

    def _sewing_qc(self, garment):
        return QualityCheck.objects.create(
            garment=garment,
            status=QualityCheckStatus.PASS,
            checkpoint=QualityCheckCheckpoint.SEWING_QC,
        )

    def _finishing_scan_at(self, setup, garment, minutes_ago):
        scan = Scan.objects.create(
            garment=garment,
            scanner=setup["scanner"],
            event_type=ScanEventType.FINISHING_QUALITY_CHECK,
        )
        when = timezone.now() - timedelta(minutes=minutes_ago)
        Scan.objects.filter(pk=scan.pk).update(created_at=when)
        return scan

    def _visible_order(self, setup, size_name, seq_start):
        """An order with one finishing-passed garment (+ its scan) and one pending
        garment, so it is neither empty nor fully finished -> visible."""
        order = OrderFactory(style=setup["style"], size=SizeFactory(name=size_name))
        done = self._garment(
            setup, order, seq_start, GarmentStatus.FINISHING_QC_PASS,
            finishing_completed_at=timezone.now(),
        )
        self._sewing_qc(done)
        QualityCheck.objects.create(
            garment=done,
            status=QualityCheckStatus.PASS,
            checkpoint=QualityCheckCheckpoint.FINISHING_QC,
        )
        pending = self._garment(
            setup, order, seq_start + 1, GarmentStatus.SEWING_QC_PASS
        )
        self._sewing_qc(pending)
        return order, done

    def test_multiple_sizes_same_style_sorted_by_recency(self, setup):
        order_s, done_s = self._visible_order(setup, "S", 1)
        order_l, done_l = self._visible_order(setup, "L", 1)
        # Size S finishing-scanned earlier, size L later -> L on top.
        self._finishing_scan_at(setup, done_s, minutes_ago=10)
        self._finishing_scan_at(setup, done_l, minutes_ago=2)

        result = get_finishing_qc_daily_summary(setup["user"])
        groups = result["order_groups"]

        assert len(groups) == 2
        assert groups[0]["size"] == "L"
        assert groups[1]["size"] == "S"
        assert groups[0]["order_number"] == order_l.order_number
        # Backward-compat: active_order + flat grid mirror the top group.
        assert result["active_order"]["order_number"] == order_l.order_number
        assert result["garments_grid"] == groups[0]["garments_grid"]
