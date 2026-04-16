from typing import List, Dict, Any
import logging
from django.db import transaction, IntegrityError
from django.db import models
from tracking.models import Bundle, Order, Spread


logger = logging.getLogger(__name__)


def create_single_bundle_set(
    order: Order, spread: Spread, garment_quantity: int, created_by=None
) -> Dict[str, Any]:
    """
    Create a single bundle set for all parts of a style.
    Garments are automatically created by Bundle model signals.

    Args:
        order: The order to create bundles for
        spread: The spread to use
        garment_quantity: Number of garments this bundle set produces
        created_by: User creating the bundles

    Returns:
        Dict with created bundles and metadata
    """
    if not order.style.parts.exists():
        raise ValueError("Order's style has no parts defined.")

    max_retries = 5
    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            with transaction.atomic():
                # Get the next bundle number in the spread inside the transaction
                bundle_number = _get_next_bundle_number(spread)
                logger.debug(
                    "bundle.create_single_set: attempt=%s order_id=%s spread=%s next_bundle_no=%s parts=%s qty=%s user=%s",
                    attempt,
                    getattr(order, "id", None),
                    getattr(spread, "number", None),
                    bundle_number,
                    order.style.parts.count(),
                    garment_quantity,
                    getattr(created_by, "id", None),
                )

                # Create bundles for each part - this will trigger garment creation
                bundles = []
                for part in order.style.parts.all():
                    # Calculate part number range for this specific part
                    part_start, part_end = _calculate_part_range(
                        spread, bundle_number, garment_quantity, part
                    )

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

                logger.debug(
                    "bundle.create_single_set.done: order_id=%s spread=%s bundle_no=%s created_bundles=%s",
                    getattr(order, "id", None),
                    getattr(spread, "number", None),
                    bundle_number,
                    len(bundles),
                )
                return {
                    "bundles": bundles,
                    "bundle_count": len(bundles),
                    "bundle_number": bundle_number,
                    "garment_quantity": garment_quantity,
                    "part_range": f"{part_start}-{part_end}",
                }
        except IntegrityError as e:
            # Collision likely due to concurrent bundle number allocation or tracking code
            last_error = e
            logger.warning(
                "bundle.create_single_set.integrity_collision: attempt=%s order_id=%s spread=%s error=%s",
                attempt,
                getattr(order, "id", None),
                getattr(spread, "number", None),
                str(e),
            )
            # retry loop continues; new transaction/context will pick a new number

    # If all retries failed, re-raise last IntegrityError
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

    Args:
        order: The order to create bundles for
        spread: The spread to use
        total_garment_quantity: Total garments needed
        bundle_size: Preferred size for each bundle
        created_by: User creating the bundles

    Returns:
        Dict with all created bundles and metadata
    """
    if not order.style.parts.exists():
        raise ValueError("Order's style has no parts defined.")

    # Calculate bundle distribution using smart rounding
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


def _calculate_part_range(
    spread: Spread, bundle_number: int, garment_quantity: int, part=None
) -> tuple[int, int]:
    """
    Calculate the part number range for a bundle.

    The range is calculated based on previous bundles of the SAME PART in the same spread.
    Each part has its own sequential numbering within the spread.
    """
    if part is None:
        # Fallback for backward compatibility - use global numbering
        previous_garments = (
            Bundle.objects.filter(
                spread=spread, bundle_number_in_spread__lt=bundle_number
            ).aggregate(total=models.Sum("garment_quantity"))["total"]
            or 0
        )
    else:
        # Calculate based on previous bundles of the same part in the same spread
        previous_garments = (
            Bundle.objects.filter(
                spread=spread, part=part, bundle_number_in_spread__lt=bundle_number
            ).aggregate(total=models.Sum("garment_quantity"))["total"]
            or 0
        )

    part_start = previous_garments + 1
    part_end = previous_garments + garment_quantity

    return part_start, part_end


def _calculate_bundle_distribution(total_quantity: int, bundle_size: int) -> List[int]:
    """
    Calculate smart bundle distribution.

    Rules:
    - If remainder > 5, create a separate bundle for the remainder
    - If remainder <= 5, create a separate bundle for the remainder
    - Never merge remainder with the last bundle

    Example: 115 garments, bundle size 10
    - 115 / 10 = 11.5
    - Result: 11 bundles of 10, 1 bundle of 5
    - Final: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 5]

    Example: 111 garments, bundle size 10
    - 111 / 10 = 11.1
    - Result: 11 bundles of 10, 1 bundle of 1
    - Final: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 1]

    Example: 116 garments, bundle size 10
    - 116 / 10 = 11.6
    - Result: 11 bundles of 10, 1 bundle of 6
    - Final: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 6]
    """
    if total_quantity <= 0 or bundle_size <= 0:
        raise ValueError("Total quantity and bundle size must be positive")

    if total_quantity <= bundle_size:
        return [total_quantity]

    full_bundles = total_quantity // bundle_size
    remainder = total_quantity % bundle_size

    distribution = [bundle_size] * full_bundles

    if remainder > 0:
        # Always create a separate bundle for the remainder
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
