from typing import TYPE_CHECKING, Optional
import logging
from django.core.exceptions import ValidationError
from django.db import transaction

# Avoid circular import issues by using TYPE_CHECKING
if TYPE_CHECKING:
    from tracking.models.tracking import Scan, Order, Spread, Bundle


logger = logging.getLogger(__name__)


# --- Validation Functions ---


def validate_scan_item_exclusivity(scan: "Scan") -> None:
    """Ensure scan has exactly one of bundle or garment, but not both or neither."""
    has_bundle = scan.bundle is not None
    has_garment = scan.garment is not None

    if has_bundle and has_garment:
        raise ValidationError("Scan cannot have both bundle and garment.")

    if not has_bundle and not has_garment:
        raise ValidationError("Scan must have either bundle or garment.")


# --- Garment Management Functions ---


@transaction.atomic
def create_garments_for_bundle_set(
    order: "Order",
    spread: "Spread",
    bundle_set_number: int,
    primary_bundle: Optional["Bundle"] = None,
) -> int:
    """
    Create garments for a bundle set within a specific spread.

    Important: Bundle numbers reset per spread. Always scope by spread to avoid
    cross-spread collisions that would otherwise skip creation or mis-assign
    the primary bundle.
    """
    from tracking.models import Garment, Bundle
    from django.db import models

    # Check if garments already exist for this bundle set in this spread
    if order.garments.filter(
        primary_bundle__spread=spread, bundle_set_number=bundle_set_number
    ).exists():
        logger.debug(
            "garment.create_set.skip_exists: order_id=%s spread=%s set=%s",
            getattr(order, "id", None),
            getattr(spread, "number", None),
            bundle_set_number,
        )
        return 0

    # Pick the primary bundle scoped to this spread and set
    bundle = primary_bundle or Bundle.objects.filter(
        order=order, spread=spread, bundle_number_in_spread=bundle_set_number
    ).first()

    if not bundle:
        logger.debug(
            "garment.create_set.no_bundle: order_id=%s spread=%s set=%s",
            getattr(order, "id", None),
            getattr(spread, "number", None),
            bundle_set_number,
        )
        return 0

    garment_quantity = bundle.garment_quantity

    # Get the next sequence number for this order (global per order)
    last_sequence = (
        order.garments.aggregate(max_seq=models.Max("sequence_number"))["max_seq"]
        or 0
    )
    logger.debug(
        "garment.create_set.start: order_id=%s spread=%s set=%s qty=%s last_seq=%s primary_bundle_id=%s",
        getattr(order, "id", None),
        getattr(spread, "number", None),
        bundle_set_number,
        garment_quantity,
        last_sequence,
        getattr(bundle, "id", None),
    )

    # Create garments
    created_count = 0
    for i in range(garment_quantity):
        sequence_number = last_sequence + i + 1
        part_number_in_bundle = i + 1

        Garment.objects.create(
            order=order,
            primary_bundle=bundle,  # Use spread-scoped bundle as primary
            sequence_number=sequence_number,
            bundle_set_number=bundle_set_number,
            part_number_in_bundle=part_number_in_bundle,
            created_by=bundle.created_by,
        )
        created_count += 1

    logger.debug(
        "garment.create_set.done: order_id=%s spread=%s set=%s created=%s final_count=%s",
        getattr(order, "id", None),
        getattr(spread, "number", None),
        bundle_set_number,
        created_count,
        order.garments.count(),
    )
    return created_count
