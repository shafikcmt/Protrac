from django.db import models


# --- Choice Classes ---


class LineType(models.TextChoices):
    CUTTING = "cutting", "Cutting Line"
    SEWING = "sewing", "Sewing Line"
    FINISHING = "finishing", "Finishing Line"


class ScannerType(models.TextChoices):
    BUNDLE_ISSUE = "bundle_issue", "Bundle Issue"
    ASSEMBLY_TRACKING = "assembly_tracking", "Assembly Tracking"
    SEWING_QC_CHECK = "sewing_qc_check", "Sewing QC"
    FINISHING_QC_CHECK = "finishing_qc_check", "Finishing QC"


class BundleStatus(models.TextChoices):
    CREATED = "created", "Created"
    ISSUED_TO_SEWING = "issued_to_sewing", "Issued to Sewing"
    COMPLETED = "completed", "Completed"


class GarmentStatus(models.TextChoices):
    PENDING_ASSEMBLY = "pending_assembly", "Pending Assembly"
    ISSUED_FOR_ASSEMBLY = "issued_for_assembly", "Issued for Assembly"
    SEWING_QC_PASS = "sewing_qc_pass", "Sewing QC Pass"
    SEWING_QC_FAIL = "sewing_qc_fail", "Sewing QC Fail"
    SEWING_QC_REWORK = "sewing_qc_rework", "Sewing QC Rework"
    FINISHING_QC_PASS = "finishing_qc_pass", "Finishing QC Pass"
    FINISHING_QC_FAIL = "finishing_qc_fail", "Finishing QC Fail"
    FINISHING_QC_REWORK = "finishing_qc_rework", "Finishing QC Rework"


class QualityCheckStatus(models.TextChoices):
    PASS = "pass", "Pass"
    FAIL = "fail", "Fail"
    REWORK = "rework", "Rework"


class QualityCheckCheckpoint(models.TextChoices):
    """Which QC stage recorded a QualityCheck. A garment keeps its sewing_line
    forever, so both sewing- and finishing-QC records hang off the same garment;
    this field is what distinguishes them (there is no other discriminator)."""

    SEWING_QC = "sewing_qc", "Sewing QC"
    FINISHING_QC = "finishing_qc", "Finishing QC"


class ScanEventType(models.TextChoices):
    BUNDLE_ISSUED_TO_SEWING = "bundle_issued_to_sewing", "Bundle Issued to Sewing"
    BUNDLE_COMPLETED = "bundle_completed", "Bundle Completed"
    GARMENT_ISSUED_FOR_ASSEMBLY = (
        "garment_issued_for_assembly",
        "Garment Issued for Assembly",
    )
    SEWING_QUALITY_CHECK = "sewing_quality_check", "Sewing Quality Check"
    FINISHING_QUALITY_CHECK = "finishing_quality_check", "Finishing Quality Check"


# --- Constants ---


SCANNER_TYPE_MAPPING = {
    LineType.CUTTING: [ScannerType.BUNDLE_ISSUE],
    LineType.SEWING: [ScannerType.ASSEMBLY_TRACKING, ScannerType.SEWING_QC_CHECK],
    LineType.FINISHING: [ScannerType.FINISHING_QC_CHECK],
}
