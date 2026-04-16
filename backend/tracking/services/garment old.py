import logging
from typing import TYPE_CHECKING
from django.db import transaction, models

# Avoid circular import issues by using TYPE_CHECKING
if TYPE_CHECKING:
    from tracking.models.tracking import Order


logger = logging.getLogger(__name__)


@transaction.atomic
def sync_garment_records_for_order(order: "Order") -> int:
    """
    Ensure garment records match the total garment count from bundles.

    1. Sum garment_quantity from all bundles for this order
    2. Ensure we have that many garment records
    3. Create missing garment records if needed

    Returns: Number of new garment records created
    """
    from tracking.models import Garment

    # Calculate total garments from bundles
    total_garments_from_bundles = (
        order.bundles.aggregate(total=models.Sum("garment_quantity"))["total"] or 0
    )

    current_garment_count = order.garments.count()

    if total_garments_from_bundles > current_garment_count:
        # Create missing garment records
        missing_count = total_garments_from_bundles - current_garment_count
        created_count = 0

        # Get the next sequence number
        last_sequence = (
            order.garments.aggregate(max_seq=models.Max("sequence_number"))["max_seq"]
            or 0
        )

        # Create garment records and link them to bundle sets
        bundle_sets = _get_bundle_sets_for_order(order)

        for i in range(missing_count):
            sequence_number = last_sequence + i + 1
            bundle_info = _get_bundle_info_for_garment(sequence_number, bundle_sets)

            try:
                Garment.objects.create(
                    order=order,
                    sequence_number=sequence_number,
                    bundle_set_number=bundle_info["bundle_set_number"],
                    part_number_in_bundle=bundle_info["part_number_in_bundle"],
                )
                created_count += 1
            except Exception as e:
                logger.error(
                    f"Failed to create garment {sequence_number} for order {order.order_number}: {e}"
                )
                continue

        logger.info(
            f"Auto-created {created_count} garment records for order {order.order_number}. "
            f"Total garments: {order.garments.count()} (was {current_garment_count})"
        )

        return created_count

    elif total_garments_from_bundles < current_garment_count:
        # This shouldn't happen in normal workflow, but log it for debugging
        logger.warning(
            f"Order {order.order_number} has more garment records ({current_garment_count}) "
            f"than total garments from bundles ({total_garments_from_bundles}). "
            f"This may indicate bundles were deleted or modified."
        )

    return 0


def _get_bundle_sets_for_order(order: "Order") -> list:
    """Get all bundle sets for an order, ordered by bundle number."""
    bundle_sets = []

    # Group bundles by bundle_number_in_spread
    bundle_numbers = (
        order.bundles.values_list("bundle_number_in_spread", flat=True)
        .distinct()
        .order_by("bundle_number_in_spread")
    )

    for bundle_number in bundle_numbers:
        # Get any bundle from this set to get the range info
        sample_bundle = order.bundles.filter(
            bundle_number_in_spread=bundle_number
        ).first()

        if sample_bundle:
            bundle_sets.append(
                {
                    "bundle_number": bundle_number,
                    "garment_quantity": sample_bundle.garment_quantity,
                    "part_start": sample_bundle.part_number_start,
                    "part_end": sample_bundle.part_number_end,
                }
            )

    return bundle_sets


def _get_bundle_info_for_garment(sequence_number: int, bundle_sets: list) -> dict:
    """
    Determine which bundle set a garment belongs to and its position within the bundle.
    """
    current_position = 0

    for bundle_set in bundle_sets:
        bundle_start = current_position + 1
        bundle_end = current_position + bundle_set["garment_quantity"]

        if bundle_start <= sequence_number <= bundle_end:
            part_number_in_bundle = sequence_number - current_position
            return {
                "bundle_set_number": bundle_set["bundle_number"],
                "part_number_in_bundle": part_number_in_bundle,
            }

        current_position = bundle_end

    # Fallback if not found (shouldn't happen)
    return {
        "bundle_set_number": None,
        "part_number_in_bundle": None,
    }
