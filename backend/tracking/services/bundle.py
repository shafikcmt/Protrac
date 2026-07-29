from collections import defaultdict
from typing import TYPE_CHECKING

from django.db.models import Sum

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


def get_potential_garments_map(orders) -> "dict[int, int]":
    """
    Bulk equivalent of calculate_potential_garments_for_order.

    Uses a single aggregate query for every order instead of two queries per
    order. The result is identical to calling the per-object function on each
    order; this only changes how the data is fetched.

    Callers should prefetch "style__parts" so the per-order part lookup below
    does not fall back to a query.
    """
    order_list = list(orders)
    if not order_list:
        return {}

    from tracking.models import Bundle

    # {order_id: {part_id: summed garment_quantity}}
    per_order = defaultdict(dict)
    rows = (
        Bundle.objects.filter(order_id__in=[order.id for order in order_list])
        .values("order_id", "part_id")
        .annotate(total=Sum("garment_quantity"))
    )
    for row in rows:
        per_order[row["order_id"]][row["part_id"]] = row["total"] or 0

    result = {}
    for order in order_list:
        bundle_quantities = per_order.get(order.id, {})

        if not bundle_quantities:
            result[order.id] = 0
            continue

        potential_per_part = [
            bundle_quantities.get(part.id, 0) for part in order.style.parts.all()
        ]

        # The bottleneck part determines total possible garments
        result[order.id] = min(potential_per_part) if potential_per_part else 0

    return result


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
