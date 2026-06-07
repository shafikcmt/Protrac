from typing import List, Dict, Any, Optional
from django.db.models import Q
from tracking.models import Order
from tracking.models.constants import GarmentStatus


def get_finishing_dashboard_data(
    finishing_line_id: Optional[int] = None,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    style: Optional[str] = None,
    size: Optional[str] = None,
    color: Optional[str] = None,
    finishing_line_ids: Optional[List[int]] = None,
    order_ids: Optional[List[int]] = None,
    style_ids: Optional[List[int]] = None,
    buyer_ids: Optional[List[int]] = None,
    sizes: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    active_only: bool = True,
) -> List[Dict[str, Any]]:
    """
    Get finishing dashboard data showing orders with finishing metrics.

    Returns orders with input/output metrics and source sewing lines.
    """
    # Base queryset for orders that have garments in finishing pipeline
    orders_qs = (
        Order.objects.filter(
            garments__status__in=[
                GarmentStatus.SEWING_QC_PASS,
                GarmentStatus.FINISHING_QC_PASS,
                GarmentStatus.FINISHING_QC_FAIL,
                GarmentStatus.FINISHING_QC_REWORK,
            ]
        )
        .select_related("style__season", "size", "color")
        .prefetch_related("garments")
        .distinct()
    )

    # Apply filters
    if finishing_line_id:
        orders_qs = orders_qs.filter(garments__finishing_line_id=finishing_line_id)
    elif finishing_line_ids:
        orders_qs = orders_qs.filter(garments__finishing_line_id__in=finishing_line_ids)

    if order_id:
        orders_qs = orders_qs.filter(id=order_id)
    elif order_ids:
        orders_qs = orders_qs.filter(id__in=order_ids)
        
    if style_id:
        orders_qs = orders_qs.filter(style_id=style_id)
    elif style_ids:
        orders_qs = orders_qs.filter(style_id__in=style_ids)
        
    if buyer_id:
        orders_qs = orders_qs.filter(style__buyer_id=buyer_id)
    elif buyer_ids:
        orders_qs = orders_qs.filter(style__buyer_id__in=buyer_ids)

    if style:
        orders_qs = orders_qs.filter(style__name__icontains=style)

    if size:
        orders_qs = orders_qs.filter(size__name__icontains=size)
    elif sizes:
        orders_qs = orders_qs.filter(size__name__in=sizes)

    if color:
        orders_qs = orders_qs.filter(color__name__icontains=color)
    elif colors:
        orders_qs = orders_qs.filter(color__name__in=colors)

    if date_from:
        # Use date() comparison to avoid timezone issues
        orders_qs = orders_qs.filter(created_at__date__gte=date_from)

    if date_to:
        # Use date() comparison to avoid timezone issues
        orders_qs = orders_qs.filter(created_at__date__lte=date_to)

    # Apply active_only filter using delivery date
    if active_only:
        from datetime import date

        today = date.today()
        orders_qs = orders_qs.filter(
            Q(delivery_date__isnull=True) | Q(delivery_date__gt=today)
        )

    # Build result
    orders_data = []

    for order in orders_qs:
        order_metrics = _calculate_finishing_order_metrics(order)
        orders_data.append(order_metrics)

    return orders_data


def _calculate_finishing_order_metrics(order: Order) -> Dict[str, Any]:
    """Calculate finishing metrics for a single order."""

    finishing_garments = order.garments.filter(
        status__in=[
            GarmentStatus.SEWING_QC_PASS,
            GarmentStatus.FINISHING_QC_PASS,
            GarmentStatus.FINISHING_QC_FAIL,
            GarmentStatus.FINISHING_QC_REWORK,
        ]
    )

    input_count = finishing_garments.count()

    output_count = finishing_garments.filter(
        status=GarmentStatus.FINISHING_QC_PASS
    ).count()

    qc_stats = _get_finishing_qc_stats(finishing_garments)
    source_lines = _get_source_sewing_lines(finishing_garments)

    total_input = input_count
    completion_rate = output_count / total_input if total_input > 0 else 0

    return {
        "id": order.id,
        "order_number": order.order_number,
        "customer_name": order.style.buyer.name,
        "style_name": order.style.name,
        "size_name": order.size.name if order.size else None,
        "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
        "input_garments": input_count,
        "output_garments": output_count,
        "in_progress_garments": input_count - output_count,
        "completion_rate": round(completion_rate, 3),
        "qc_stats": qc_stats,
        "source_lines": source_lines,
    }


def _get_finishing_qc_stats(garments) -> Dict[str, int]:
    """Get finishing QC statistics for garments based on garment status."""
    qc_pass_count = 0
    qc_fail_count = 0
    qc_rework_count = 0

    for garment in garments:
        # Check garment status directly instead of QualityCheck records
        if garment.status == GarmentStatus.FINISHING_QC_PASS:
            qc_pass_count += 1
        elif garment.status == GarmentStatus.FINISHING_QC_FAIL:
            qc_fail_count += 1
        elif garment.status == GarmentStatus.FINISHING_QC_REWORK:
            qc_rework_count += 1

    total_qc = qc_pass_count + qc_fail_count + qc_rework_count
    qc_pass_rate = qc_pass_count / total_qc if total_qc > 0 else 0

    return {
        "total_qc": total_qc,
        "passed_qc": qc_pass_count,
        "failed_qc": qc_fail_count
        + qc_rework_count,  # Combine fail and rework as "failed"
        "qc_rate": round(qc_pass_rate, 3),  # Changed from qc_pass_rate to qc_rate
    }


def _get_source_sewing_lines(garments) -> List[Dict[str, Any]]:
    """Get source sewing lines that produced garments for this order."""

    # Group garments by sewing line
    sewing_lines_data = {}

    for garment in garments:
        if garment.sewing_line:
            line_id = garment.sewing_line.id
            line_name = garment.sewing_line.name

            if line_id not in sewing_lines_data:
                sewing_lines_data[line_id] = {
                    "id": line_id,  # Expected by SourceLineSerializer
                    "name": line_name,  # Expected by SourceLineSerializer
                    "garment_count": 0,  # Expected by SourceLineSerializer
                }

            sewing_lines_data[line_id]["garment_count"] += 1

    # Convert to list and sort by garment_count (descending)
    source_lines = list(sewing_lines_data.values())
    source_lines.sort(key=lambda x: x["garment_count"], reverse=True)

    return source_lines
