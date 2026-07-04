import pytest

from tracking.models import Scanner, QualityCheck
from tracking.models.constants import (
    ScannerType,
    LineType,
    GarmentStatus,
    QualityCheckStatus,
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

    def _garment(self, setup, seq, status=GarmentStatus.SEWING_QC_PASS):
        return GarmentFactory(
            order=setup["order"],
            sequence_number=seq,
            sewing_line=setup["line"],
            status=status,
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
