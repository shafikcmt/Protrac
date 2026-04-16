import pytest
from tracking.models import Scanner
from tracking.models.constants import ScannerType, BundleStatus, LineType
from tracking.services.fifo_validation import (
    validate_bundle_fifo_sequence,
    update_bundle_fifo_flags,
)
from tracking.tests.conftest import (
    BundleFactory,
    ProductionLineFactory,
    UserFactory,
    PartFactory,
    OrderFactory,
    StyleFactory,
    SpreadFactory,
)


@pytest.mark.django_db
class TestFifoValidation:
    """Test FIFO validation functionality."""

    @pytest.fixture
    def setup_fifo_data(self):
        """Setup test data for FIFO validation."""
        # Create sewing line and production setup
        sewing_line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = Scanner.objects.create(
            name="Part Tracking Scanner",
            scanner_type=ScannerType.ASSEMBLY_TRACKING,
            production_line=sewing_line,
        )
        user = UserFactory(assigned_scanner=scanner)

        # Create style and part
        style = StyleFactory()
        part = PartFactory()
        style.parts.add(part)  # Associate part with style

        # Create order and spread
        order = OrderFactory(style=style)
        spread = SpreadFactory(number="SP001")

        return {
            "user": user,
            "scanner": scanner,
            "sewing_line": sewing_line,
            "order": order,
            "spread": spread,
            "part": part,
        }

    def test_fifo_compliant_when_no_earlier_bundles(self, setup_fifo_data):
        """Test that bundle is FIFO compliant when no earlier bundles exist."""
        bundle = BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=1,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        result = validate_bundle_fifo_sequence(bundle)

        assert result["fifo_compliant"] is True
        assert len(result["warnings"]) == 0
        assert len(result["earlier_incomplete_bundles"]) == 0

    def test_fifo_compliant_when_earlier_bundles_completed(self, setup_fifo_data):
        """Test FIFO compliance when earlier bundles are already completed."""
        # Create earlier completed bundle
        BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=1,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.COMPLETED,
        )

        # Create later bundle
        bundle = BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=2,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        result = validate_bundle_fifo_sequence(bundle)

        assert result["fifo_compliant"] is True
        assert len(result["warnings"]) == 0

    def test_fifo_violation_with_earlier_incomplete_bundles(self, setup_fifo_data):
        """Test FIFO violation when earlier bundles are incomplete."""
        # Create earlier incomplete bundle
        earlier_bundle = BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=1,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        # Create later bundle being processed
        bundle = BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=2,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        result = validate_bundle_fifo_sequence(bundle)

        assert result["fifo_compliant"] is False
        assert len(result["warnings"]) > 0
        assert len(result["earlier_incomplete_bundles"]) == 1
        assert result["earlier_incomplete_bundles"][0]["id"] == earlier_bundle.id

    def test_fifo_validation_cross_cut_part(self, setup_fifo_data):
        """Test FIFO validation considers bundles from different parts separately."""
        # Create different part
        different_part = PartFactory()

        # Create bundle for different part with earlier bundle number
        BundleFactory(
            order=setup_fifo_data["order"],
            part=different_part,
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=1,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        # Create bundle for our part with later bundle number
        bundle = BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=2,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        result = validate_bundle_fifo_sequence(bundle)

        # Should be compliant as different parts don't affect each other
        assert result["fifo_compliant"] is True
        assert len(result["warnings"]) == 0

    def test_update_bundle_fifo_flags_compliant(self, setup_fifo_data):
        """Test updating bundle FIFO flags when compliant."""
        bundle = BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=1,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        # Test FIFO validation for compliant bundle
        fifo_result = validate_bundle_fifo_sequence(bundle)
        update_bundle_fifo_flags(bundle, fifo_result)

        bundle.refresh_from_db()
        assert bundle.fifo_violation_flag is False
        assert bundle.fifo_violation_details is None

    def test_update_bundle_fifo_flags_violation(self, setup_fifo_data):
        """Test updating bundle FIFO flags when violation exists."""
        # Create earlier incomplete bundle
        BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=1,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        # Create later bundle
        bundle = BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=2,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        # Test FIFO validation for violation bundle
        fifo_result = validate_bundle_fifo_sequence(bundle)
        update_bundle_fifo_flags(bundle, fifo_result)

        bundle.refresh_from_db()
        assert bundle.fifo_violation_flag is True
        assert bundle.fifo_violation_details is not None

    def test_fifo_validation_different_spreads(self, setup_fifo_data):
        """Test FIFO validation considers bundles from different spreads separately."""
        different_spread = SpreadFactory(number="SP002")

        # Create bundle in different spread
        BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=different_spread,
            bundle_number_in_spread=1,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        # Create bundle in original spread
        bundle = BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=1,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        result = validate_bundle_fifo_sequence(bundle)

        # Should be compliant as different spreads don't affect each other
        assert result["fifo_compliant"] is True
        assert len(result["warnings"]) == 0

    def test_fifo_validation_different_sewing_lines(self, setup_fifo_data):
        """Test FIFO validation considers bundles from different sewing lines separately."""
        different_sewing_line = ProductionLineFactory(line_type=LineType.SEWING)

        # Create bundle assigned to different sewing line
        BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=1,
            assigned_sewing_line=different_sewing_line,
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        # Create bundle assigned to original sewing line
        bundle = BundleFactory(
            order=setup_fifo_data["order"],
            part=setup_fifo_data["part"],
            spread=setup_fifo_data["spread"],
            bundle_number_in_spread=2,
            assigned_sewing_line=setup_fifo_data["sewing_line"],
            status=BundleStatus.ISSUED_TO_SEWING,
        )

        result = validate_bundle_fifo_sequence(bundle)

        # Should be compliant as different sewing lines don't affect each other
        assert result["fifo_compliant"] is True
        assert len(result["warnings"]) == 0

    # Note: API endpoint test removed as the bundle-fifo-validate endpoint
    # does not exist in the current system. FIFO validation is handled
    # internally by the scanning and bundle completion processes.
