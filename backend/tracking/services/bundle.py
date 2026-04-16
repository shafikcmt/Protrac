from typing import TYPE_CHECKING

# Avoid circular import issues by using TYPE_CHECKING
if TYPE_CHECKING:
    from tracking.models.tracking import Order


def calculate_potential_garments_for_order(order: "Order") -> int:
    """
    Calculate how many complete garments can be made with all bundles for this order.

    With simplified Part model:
    1. Count available bundles per part
    2. Return the minimum quantity across all parts (bottleneck)
    """
    # Get total bundle quantities per part
    bundle_quantities = _get_total_part_quantities(order)

    if not bundle_quantities:
        return 0

    potential_per_part = []

    for part in order.style.parts.all():
        garments_possible = bundle_quantities.get(part.id, 0)
        potential_per_part.append(garments_possible)

    # The bottleneck part determines total possible garments
    return min(potential_per_part) if potential_per_part else 0


def _get_total_part_quantities(order: "Order") -> "dict[int, int]":
    """
    Sum up quantities of all bundles per part for this order.
    """
    quantities = {}
    for bundle in order.bundles.all():
        part_id = bundle.part_id
        if part_id not in quantities:
            quantities[part_id] = 0
        quantities[part_id] += bundle.garment_quantity
    return quantities
