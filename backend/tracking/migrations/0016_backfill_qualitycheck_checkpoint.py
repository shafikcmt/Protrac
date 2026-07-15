"""Backfill QualityCheck.checkpoint for historical rows.

The schema migration (0015) gave every existing QualityCheck the default
`sewing_qc`. This data migration re-classifies the FINISHING ones. A garment
keeps its sewing_line forever and grows a second QualityCheck when it later
reaches finishing QC, and the row itself carries no stage marker — so we recover
the stage per garment:

  Primary  — paired Scan.event_type. Each QC scan (SEWING_QUALITY_CHECK /
             FINISHING_QUALITY_CHECK) is created 1:1 with a QualityCheck in the
             same request. When a garment's QC-scan count equals its QC-record
             count, we pair them positionally (both ordered by created_at) and
             read the stage straight off the scan's event_type.

  Fallback — first-PASS split (used only when scans don't line up 1:1, e.g. rows
             imported/seeded without scans). Domain invariant: sewing QC is
             blocked once a garment first PASSES (see sewing_qc.process_sewing_qc_
             scan) and finishing QC only runs on already-sewing-passed garments —
             so, per garment ordered by created_at, records up to & including the
             first PASS are sewing and everything after is finishing. No PASS at
             all -> all sewing (finishing was impossible).

Only rows classified FINISHING are updated; the rest keep the `sewing_qc` default
set by 0015. Reverse resets all rows back to `sewing_qc`.
"""

from collections import defaultdict

from django.db import migrations

SEWING_QC = "sewing_qc"
FINISHING_QC = "finishing_qc"
SEW_SCAN = "sewing_quality_check"
FIN_SCAN = "finishing_quality_check"
PASS = "pass"
_BATCH = 2000


def _finishing_qc_ids(QualityCheck, Scan):
    """Return the ids of QualityCheck rows that belong to the FINISHING stage."""
    qc_by_garment = defaultdict(list)
    for qc in (
        QualityCheck.objects.all()
        .order_by("garment_id", "created_at", "id")
        .only("id", "garment_id", "status", "created_at")
    ):
        qc_by_garment[qc.garment_id].append(qc)

    scan_by_garment = defaultdict(list)
    for s in (
        Scan.objects.filter(event_type__in=[SEW_SCAN, FIN_SCAN])
        .order_by("garment_id", "created_at", "id")
        .only("id", "garment_id", "event_type", "created_at")
    ):
        scan_by_garment[s.garment_id].append(s)

    finishing_ids = []
    for gid, qcs in qc_by_garment.items():
        scans = scan_by_garment.get(gid, [])
        if qcs and len(scans) == len(qcs):
            # Primary: positional pairing with the garment's QC scans.
            for qc, scan in zip(qcs, scans):
                if scan.event_type == FIN_SCAN:
                    finishing_ids.append(qc.id)
        else:
            # Fallback: first-PASS split.
            first_pass = next(
                (i for i, qc in enumerate(qcs) if qc.status == PASS), None
            )
            if first_pass is not None:
                for i, qc in enumerate(qcs):
                    if i > first_pass:
                        finishing_ids.append(qc.id)
    return finishing_ids


def backfill_checkpoint(apps, schema_editor):
    QualityCheck = apps.get_model("tracking", "QualityCheck")
    Scan = apps.get_model("tracking", "Scan")

    finishing_ids = _finishing_qc_ids(QualityCheck, Scan)
    for i in range(0, len(finishing_ids), _BATCH):
        QualityCheck.objects.filter(
            id__in=finishing_ids[i : i + _BATCH]
        ).update(checkpoint=FINISHING_QC)


def reverse_checkpoint(apps, schema_editor):
    # Restore the post-0015 state (every row = sewing_qc).
    QualityCheck = apps.get_model("tracking", "QualityCheck")
    QualityCheck.objects.all().update(checkpoint=SEWING_QC)


class Migration(migrations.Migration):

    dependencies = [
        ("tracking", "0015_add_qualitycheck_checkpoint"),
    ]

    operations = [
        migrations.RunPython(backfill_checkpoint, reverse_checkpoint),
    ]
