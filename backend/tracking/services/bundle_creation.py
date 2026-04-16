from typing import List, Dict, Any
import logging
from django.db import transaction, IntegrityError
from django.db import models
from tracking.models import Bundle, Order, Spread


logger = logging.getLogger(__name__)


def create_single_bundle_set(
    order: Order, spread: Spread, garment_quantity: int, created_by=None
) -> Dict[str, Any]:
    if not order.style.parts.exists():
        raise ValueError("Order's style has no parts defined.")

    max_retries = 5
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            with transaction.atomic():
                bundle_number = _get_next_bundle_number(spread)

                # One shared range for the whole bundle set
                part_start, part_end = _calculate_bundle_set_range(
                    spread=spread,
                    order=order,
                    garment_quantity=garment_quantity,
                )

                bundles = []
                for part in order.style.parts.all():
                    bundle = Bundle.objects.create(
                        order=order,
                        part=part,
                        spread=spread,
                        bundle_number_in_spread=bundle_number,
                        garment_quantity=garment_quantity,
                        part_number_start=part_start,
                        part_number_end=part_end,
                        created_by=created_by,
                    )
                    bundles.append(bundle)

                return {
                    "bundles": bundles,
                    "bundle_count": len(bundles),
                    "bundle_number": bundle_number,
                    "garment_quantity": garment_quantity,
                    "part_range": f"{part_start}-{part_end}",
                }

        except IntegrityError as e:
            last_error = e
            logger.warning(
                "bundle.create_single_set.integrity_collision: attempt=%s order_id=%s spread=%s error=%s",
                attempt,
                getattr(order, "id", None),
                getattr(spread, "number", None),
                str(e),
            )

    raise last_error if last_error else RuntimeError("Failed to create bundle set")


def create_bulk_bundle_sets(
    order: Order,
    spread: Spread,
    total_garment_quantity: int,
    bundle_size: int,
    created_by=None,
) -> Dict[str, Any]:
    """
    Create multiple bundle sets using smart rounding logic.
    """
    if not order.style.parts.exists():
        raise ValueError("Order's style has no parts defined.")

    bundle_distribution = _calculate_bundle_distribution(
        total_garment_quantity, bundle_size
    )

    all_bundles = []
    bundle_sets = []

    with transaction.atomic():
        logger.debug(
            "bundle.create_bulk_sets: order_id=%s spread=%s total_qty=%s bundle_size=%s distribution=%s parts=%s user=%s",
            getattr(order, "id", None),
            getattr(spread, "number", None),
            total_garment_quantity,
            bundle_size,
            bundle_distribution,
            order.style.parts.count(),
            getattr(created_by, "id", None),
        )

        for bundle_qty in bundle_distribution:
            bundle_set = create_single_bundle_set(
                order=order,
                spread=spread,
                garment_quantity=bundle_qty,
                created_by=created_by,
            )
            all_bundles.extend(bundle_set["bundles"])
            bundle_sets.append(bundle_set)

    return {
        "bundles": all_bundles,
        "bundle_sets": bundle_sets,
        "total_bundle_count": len(all_bundles),
        "total_garment_quantity": total_garment_quantity,
        "distribution": bundle_distribution,
    }


def _get_next_bundle_number(spread: Spread) -> int:
    """Get the next available bundle number in the spread."""
    from django.db.models import Max

    max_bundle_number = (
        Bundle.objects.filter(spread=spread).aggregate(
            max_number=Max("bundle_number_in_spread")
        )["max_number"]
        or 0
    )
    next_no = max_bundle_number + 1

    logger.debug(
        "bundle.next_number: spread=%s max=%s next=%s",
        getattr(spread, "number", None),
        max_bundle_number,
        next_no,
    )

    return next_no


def _calculate_bundle_set_range(
    spread: Spread,
    order: Order,
    garment_quantity: int,
) -> tuple[int, int]:
    """
    Calculate ONE shared garment range for a bundle set.

    Rules:
    - Same order row keeps its own sequence
    - Same bundle set's all required parts share the same range
    - Deleted bundles do not affect future range
    - Count previous bundle sets once, not once per part
    """
    bundle_numbers = (
        Bundle.objects.filter(
            spread=spread,
            order=order,
        )
        .values_list("bundle_number_in_spread", flat=True)
        .distinct()
        .order_by("bundle_number_in_spread")
    )

    previous_garments = 0

    for bundle_number in bundle_numbers:
        sample_bundle = Bundle.objects.filter(
            spread=spread,
            order=order,
            bundle_number_in_spread=bundle_number,
        ).first()

        if sample_bundle:
            previous_garments += sample_bundle.garment_quantity

    part_start = previous_garments + 1
    part_end = previous_garments + garment_quantity

    return part_start, part_end


def _calculate_bundle_distribution(total_quantity: int, bundle_size: int) -> List[int]:
    """
    Calculate smart bundle distribution.

    Always keep the remainder as a separate last bundle.
    """
    if total_quantity <= 0 or bundle_size <= 0:
        raise ValueError("Total quantity and bundle size must be positive")

    if total_quantity <= bundle_size:
        return [total_quantity]

    full_bundles = total_quantity // bundle_size
    remainder = total_quantity % bundle_size

    distribution = [bundle_size] * full_bundles

    if remainder > 0:
        distribution.append(remainder)

    return distribution


def preview_bundle_creation(
    order: Order, spread: Spread, total_garment_quantity: int, bundle_size: int
) -> Dict[str, Any]:
    """
    Preview what bundles would be created without actually creating them.
    """
    if not order.style.parts.exists():
        raise ValueError("Order's style has no parts defined.")

    bundle_distribution = _calculate_bundle_distribution(
        total_garment_quantity, bundle_size
    )

    preview_data = {
        "order_info": {
            "order_number": order.order_number,
            "style_name": order.style.name,
            "size_name": order.size.name,
            "color_name": order.color.name,
        },
        "spread_number": spread.number,
        "total_garment_quantity": total_garment_quantity,
        "bundle_sets": len(bundle_distribution),
        "total_bundles": len(bundle_distribution) * order.style.parts.count(),
        "distribution": bundle_distribution,
        "parts": [
            {
                "part_id": part.id,
                "part_name": part.name,
                "bundles_count": len(bundle_distribution),
            }
            for part in order.style.parts.all()
        ],
    }

    return preview_data