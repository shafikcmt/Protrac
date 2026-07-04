from datetime import timedelta

import pytest

from django.utils import timezone

from tracking.models import Scanner, QualityCheck, Scan
from tracking.models.constants import (
    ScannerType,
    LineType,
    GarmentStatus,
    QualityCheckStatus,
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
