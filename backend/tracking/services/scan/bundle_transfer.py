from django.db import transaction
from typing import Dict, List, TYPE_CHECKING
from tracking.models import Bundle, BundleTransfer, Garment
from tracking.models.constants import BundleStatus
from tracking.services.scan.bundle_issue import _validate_user_scanner

if TYPE_CHECKING:
    from accounts.models import User
    from tracking.models import ProductionLine


def _bundle_has_started_assembly(bundle: Bundle) -> bool:
    """True if any garment in this bundle's set has already been placed on a
    sewing line (i.e. assembly has started). Garments map to a bundle set via
    (order, bundle_set_number == bundle.bundle_number_in_spread), and get a
    ``sewing_line`` stamped when issued for assembly. Once that has happened,
    moving the bundle's line would desync the bundle from its produced garments,
    so such bundles are not transferable (guard option A)."""
    return Garment.objects.filter(
        order=bundle.order,
        bundle_set_number=bundle.bundle_number_in_spread,
        sewing_line__isnull=False,
    ).exists()


@transaction.atomic
def transfer_bundles_to_line(
    bundle_ids: List[int],
    sewing_line: "ProductionLine",
    user: "User",
    reason: str = "",
) -> Dict[str, any]:
    """Transfer one or more already-issued bundles to a different sewing line.

    Validates the whole batch first and transfers nothing unless every bundle is
    eligible, so the caller gets an all-or-nothing result with a clear reason.

    Raises:
        ValueError: if the user has no bundle-issue scanner, a bundle is missing,
            or any selected bundle is not eligible for transfer.
    """
    # Consistent with the Bundle Issue page: only bundle-issue scanner users.
    _validate_user_scanner(user)

    if not bundle_ids:
        raise ValueError("No bundles selected for transfer")

    # De-duplicate while preserving order.
    unique_ids = list(dict.fromkeys(bundle_ids))

    bundles = list(
        Bundle.objects.select_related("assigned_sewing_line", "order").filter(
            id__in=unique_ids
        )
    )
    found_ids = {b.id for b in bundles}
    missing = [i for i in unique_ids if i not in found_ids]
    if missing:
        raise ValueError(
            f"Bundle(s) not found: {', '.join(str(i) for i in missing)}"
        )

    # Validate the entire batch before changing anything.
    errors: List[str] = []
    for bundle in bundles:
        if bundle.status != BundleStatus.ISSUED_TO_SEWING:
            errors.append(
                f"{bundle.tracking_code}: not issued to a sewing line "
                f"(status: {bundle.get_status_display()})"
            )
            continue
        if bundle.assigned_sewing_line_id == sewing_line.id:
            errors.append(
                f"{bundle.tracking_code}: already on {sewing_line.name}"
            )
            continue
        if _bundle_has_started_assembly(bundle):
            current = (
                bundle.assigned_sewing_line.name
                if bundle.assigned_sewing_line
                else "its current line"
            )
            errors.append(
                f"{bundle.tracking_code}: assembly already started on {current}; "
                "cannot transfer"
            )

    if errors:
        raise ValueError("Cannot transfer — " + "; ".join(errors))

    # All eligible: perform the moves and write one audit row per bundle. The
    # original issued_at is intentionally left unchanged.
    transferred = []
    for bundle in bundles:
        from_line = bundle.assigned_sewing_line
        bundle.assigned_sewing_line = sewing_line
        bundle.updated_by = user
        bundle.save(
            update_fields=["assigned_sewing_line", "updated_by", "updated_at"]
        )
        BundleTransfer.objects.create(
            bundle=bundle,
            from_line=from_line,
            to_line=sewing_line,
            reason=reason,
            created_by=user,
        )
        transferred.append(
            {
                "bundle_id": bundle.id,
                "tracking_code": bundle.tracking_code,
                "from_line": from_line.name if from_line else None,
                "to_line": sewing_line.name,
            }
        )

    return {
        "success": True,
        "message": f"Transferred {len(transferred)} bundle(s) to {sewing_line.name}",
        "transferred_count": len(transferred),
        "transferred": transferred,
    }
