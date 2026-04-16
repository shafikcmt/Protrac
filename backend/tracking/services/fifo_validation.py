from typing import Dict, List
from django.db import transaction, models
from tracking.models import Bundle
from tracking.models.constants import BundleStatus


def validate_bundle_fifo_sequence(bundle: Bundle) -> Dict[str, any]:
    """
    Check if bundle completion violates FIFO and return warning info.

    FIFO validation checks if there are incomplete bundles with lower
    sequence numbers in the same spread for the same cut part and production line.

    Args:
        bundle: The bundle being completed

    Returns:
        Dict with FIFO compliance info including:
        - fifo_compliant: bool
        - warnings: List[str]
        - earlier_incomplete_bundles: List[dict]
        - violation_context: dict
    """
    if not bundle.spread or bundle.bundle_number_in_spread is None:
        return {
            "fifo_compliant": True,
            "warnings": [],
            "earlier_incomplete_bundles": [],
            "violation_context": {
                "reason": "no_spread_sequence",
                "message": "Bundle has no spread or sequence number",
            },
        }

    if not bundle.assigned_sewing_line:
        return {
            "fifo_compliant": True,
            "warnings": [],
            "earlier_incomplete_bundles": [],
            "violation_context": {
                "reason": "no_production_line",
                "message": "Bundle not assigned to production line",
            },
        }

    # Find incomplete bundles with lower sequence numbers
    # Same spread + same cut part + lower sequence
    # Include bundles assigned to same line OR bundles not yet assigned (CREATED status)
    earlier_incomplete = (
        Bundle.objects.filter(
            spread=bundle.spread,
            part=bundle.part,
            bundle_number_in_spread__lt=bundle.bundle_number_in_spread,
            status__in=[BundleStatus.CREATED, BundleStatus.ISSUED_TO_SEWING],
        )
        .filter(
            models.Q(assigned_sewing_line=bundle.assigned_sewing_line)
            | models.Q(assigned_sewing_line__isnull=True, status=BundleStatus.CREATED)
        )
        .select_related("order", "part", "spread")
        .order_by("bundle_number_in_spread")
    )

    warnings = []
    earlier_incomplete_list = []

    for incomplete_bundle in earlier_incomplete:
        warning_msg = (
            f"Bundle {incomplete_bundle.display_bundle_number} "
            f"({incomplete_bundle.part.name}) is not completed yet"
        )
        warnings.append(warning_msg)

        earlier_incomplete_list.append(
            {
                "id": incomplete_bundle.id,
                "display_bundle_number": incomplete_bundle.display_bundle_number,
                "bundle_number_in_spread": incomplete_bundle.bundle_number_in_spread,
                "cut_part_name": incomplete_bundle.part.name,
                "status": incomplete_bundle.status,
                "order_number": incomplete_bundle.order.order_number,
            }
        )

    is_compliant = len(warnings) == 0

    violation_context = {}
    if not is_compliant:
        violation_context = {
            "spread_number": bundle.spread.number,
            "bundle_sequence": bundle.bundle_number_in_spread,
            "cut_part": bundle.part.name,
            "production_line": bundle.assigned_sewing_line.name,
            "earliest_incomplete_sequence": (
                min(b.bundle_number_in_spread for b in earlier_incomplete)
                if earlier_incomplete
                else None
            ),
            "total_violations": len(earlier_incomplete),
        }

    return {
        "fifo_compliant": is_compliant,
        "warnings": warnings,
        "earlier_incomplete_bundles": earlier_incomplete_list,
        "violation_context": violation_context,
    }


@transaction.atomic
def update_bundle_fifo_flags(bundle: Bundle, fifo_result: Dict[str, any]) -> None:
    """
    Update bundle's FIFO violation flags based on validation result.

    Args:
        bundle: The bundle to update
        fifo_result: Result from validate_bundle_fifo_sequence
    """
    bundle.fifo_violation_flag = not fifo_result["fifo_compliant"]
    bundle.fifo_violation_details = (
        fifo_result["violation_context"] if not fifo_result["fifo_compliant"] else None
    )
    bundle.save(update_fields=["fifo_violation_flag", "fifo_violation_details"])


def get_fifo_violations_for_production_line(
    production_line, limit: int = 50
) -> List[Dict[str, any]]:
    """
    Get bundles with FIFO violations for a specific production line.

    Args:
        production_line: ProductionLine instance
        limit: Maximum number of results to return

    Returns:
        List of bundle data with FIFO violation details
    """
    violated_bundles = (
        Bundle.objects.filter(
            assigned_sewing_line=production_line, fifo_violation_flag=True
        )
        .select_related("order", "part", "spread", "assigned_sewing_line")
        .order_by("-completed_at")[:limit]
    )

    results = []
    for bundle in violated_bundles:
        results.append(
            {
                "id": bundle.id,
                "tracking_code": bundle.tracking_code,
                "display_bundle_number": bundle.display_bundle_number,
                "cut_part_name": bundle.part.name,
                "order_number": bundle.order.order_number,
                "status": bundle.status,
                "completed_at": bundle.completed_at,
                "fifo_violation_details": bundle.fifo_violation_details,
            }
        )

    return results
