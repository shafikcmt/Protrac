from typing import List, Dict, Any, Optional
from datetime import date
import pendulum
from django.db.models import Q, Count
from common.utils.time import today, day_range
from tracking.models import ProductionLine, Order, QualityCheck
from tracking.models.constants import LineType, GarmentStatus


def get_daily_production_report_data(
    report_date: Optional[date] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    production_line_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    style_id: Optional[int] = None,
    order_id: Optional[int] = None,
    production_line_ids: Optional[List[int]] = None,
    buyer_ids: Optional[List[int]] = None,
    style_ids: Optional[List[int]] = None,
    order_ids: Optional[List[int]] = None,
    sizes: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Generate daily production report data for all production lines.

    Args:
        report_date: Date for the report (defaults to today)
        date_from: Start date for date range filter
        date_to: End date for date range filter
        production_line_id: Filter by specific production line
        buyer_id: Filter by specific buyer
        style_id: Filter by specific style
        order_id: Filter by specific order
        production_line_ids: Filter by multiple production line IDs
        buyer_ids: Filter by multiple buyer IDs
        style_ids: Filter by multiple style IDs
        order_ids: Filter by multiple order IDs
        sizes: Filter by multiple sizes
        colors: Filter by multiple colors

    Returns:
        List of production line reports with order details
    """
    if report_date is None:
        report_date = today()

    # Get sewing lines that have active production
    lines_qs = ProductionLine.objects.filter(line_type=LineType.SEWING)

    # Apply production line filters
    if production_line_id:
        lines_qs = lines_qs.filter(id=production_line_id)
    elif production_line_ids:
        lines_qs = lines_qs.filter(id__in=production_line_ids)

    # Get orders with production activity
    orders_qs = Order.objects.select_related(
        "style__buyer", "style__season", "size", "color"
    ).prefetch_related("bundles", "garments", "part_inventories")

    # Apply order filters
    if buyer_id:
        orders_qs = orders_qs.filter(style__buyer_id=buyer_id)
    elif buyer_ids:
        orders_qs = orders_qs.filter(style__buyer_id__in=buyer_ids)

    if style_id:
        orders_qs = orders_qs.filter(style_id=style_id)
    elif style_ids:
        orders_qs = orders_qs.filter(style_id__in=style_ids)

    if order_id:
        orders_qs = orders_qs.filter(id=order_id)
    elif order_ids:
        orders_qs = orders_qs.filter(id__in=order_ids)

    if sizes:
        orders_qs = orders_qs.filter(size__name__in=sizes)

    if colors:
        orders_qs = orders_qs.filter(color__name__in=colors)

    # Apply date range filters
    if date_from:
        orders_qs = orders_qs.filter(created_at__date__gte=date_from)
    if date_to:
        orders_qs = orders_qs.filter(created_at__date__lte=date_to)

    report_data = []

    for line in lines_qs:
        # Get orders that have production activity on this line
        line_orders = orders_qs.filter(
            Q(bundles__assigned_sewing_line=line)
            | Q(garments__sewing_line=line)
            | Q(part_inventories__production_line=line)
        ).distinct()

        line_report = {
            "production_line_id": line.id,
            "production_line_name": line.name,
            "orders": [],
        }

        for order in line_orders:
            order_data = _calculate_order_metrics(order, line, report_date)
            if order_data:  # Only include orders with activity
                line_report["orders"].append(order_data)

        if line_report["orders"]:  # Only include lines with orders
            report_data.append(line_report)

    return report_data


def _calculate_order_metrics(
    order: Order, production_line: ProductionLine, report_date: date
) -> Optional[Dict[str, Any]]:
    """Calculate all metrics for a single order on a production line for the report date."""

    # Date range for daily calculations in Asia/Dhaka timezone
    day_start, day_end = day_range(report_date)

    # Get garments for this order on this line
    order_garments = order.garments.filter(sewing_line=production_line)

    # Skip if no garments on this line
    if not order_garments.exists():
        return None

    # Basic order info
    base_data = {
        "line": production_line.name,
        "buyer": order.style.buyer.name,
        "style": order.style.name,
        "order_quantity": order.quantity,
        "working_hours": 8.0,  # Default as requested
        "working_days": 1,  # Minimal handling as requested
    }

    # Calculate input (garments entering production)
    input_day = _get_daily_input(order, production_line, day_start, day_end)

    # Calculate parts production (Front, Back, Sleeve, etc.)
    parts_data = _get_parts_production(order, production_line, report_date)

    # Calculate assembly metrics
    assembly_data = _get_assembly_metrics(order, production_line, day_start, day_end)

    # Calculate output (finished garments)
    output_data = _get_output_metrics(order, production_line, day_start, day_end)

    # Calculate DHU (Defect per Hundred Units)
    dhu_data = _get_dhu_metrics(order, production_line, day_start, day_end)

    # Calculate inspection and packing
    inspection_data = _get_inspection_metrics(
        order, production_line, day_start, day_end
    )

    return {
        **base_data,
        "input": input_day,
        **parts_data,
        **assembly_data,
        **output_data,
        **dhu_data,
        **inspection_data,
    }


def _get_daily_input(
    order: Order,
    production_line: ProductionLine,
    day_start: pendulum.DateTime,
    day_end: pendulum.DateTime,
) -> int:
    """Get daily input count (garments entering production from bundle issues)."""
    # Count garments from bundles issued to sewing on this day
    return order.garments.filter(
        primary_bundle__assigned_sewing_line=production_line,
        primary_bundle__issued_at__range=(day_start, day_end),
    ).count()


def _get_parts_production(
    order: Order, production_line: ProductionLine, report_date: date
) -> Dict[str, Dict[str, int]]:
    """Get parts production data for each part type."""

    # Get all parts for this style
    parts = order.style.parts.all()

    # Date range for daily calculations in Asia/Dhaka timezone
    day_start, day_end = day_range(report_date)

    parts_data = {}

    for part in parts:
        # Get bundle completions for this part on this day
        daily_bundles = order.bundles.filter(
            part=part,
            assigned_sewing_line=production_line,
            completed_at__range=(day_start, day_end),
        )

        # Get cumulative bundle completions for this part
        cumulative_bundles = order.bundles.filter(
            part=part, assigned_sewing_line=production_line, completed_at__lte=day_end
        )

        daily_qty = sum(b.garment_quantity for b in daily_bundles)
        cumulative_qty = sum(b.garment_quantity for b in cumulative_bundles)

        # Use part name as key (e.g., "front", "back", "sleeve")
        part_key = part.name.lower().replace(" ", "_")
        parts_data[part_key] = {"day": daily_qty, "cumulative": cumulative_qty}

    return parts_data


def _get_assembly_metrics(
    order: Order,
    production_line: ProductionLine,
    day_start: pendulum.DateTime,
    day_end: pendulum.DateTime,
) -> Dict[str, Dict[str, int]]:
    """Get assembly input metrics."""

    # Daily assembly input (garments issued for assembly)
    daily_input = order.garments.filter(
        sewing_line=production_line, issued_for_assembly_at__range=(day_start, day_end)
    ).count()

    # Cumulative assembly input
    cumulative_input = order.garments.filter(
        sewing_line=production_line, issued_for_assembly_at__lte=day_end
    ).count()

    return {"assembly_input": {"day": daily_input, "cumulative": cumulative_input}}


def _get_output_metrics(
    order: Order,
    production_line: ProductionLine,
    day_start: pendulum.DateTime,
    day_end: pendulum.DateTime,
) -> Dict[str, Dict[str, int]]:
    """Get output (finished garments) metrics."""

    # Daily output (garments passing sewing QC)
    daily_output = order.garments.filter(
        sewing_line=production_line,
        status=GarmentStatus.SEWING_QC_PASS,
        assembly_completed_at__range=(day_start, day_end),
    ).count()

    # Cumulative output
    cumulative_output = order.garments.filter(
        sewing_line=production_line,
        status=GarmentStatus.SEWING_QC_PASS,
        assembly_completed_at__lte=day_end,
    ).count()

    return {"output": {"day": daily_output, "cumulative": cumulative_output}}


def _get_dhu_metrics(
    order: Order,
    production_line: ProductionLine,
    day_start: pendulum.DateTime,
    day_end: pendulum.DateTime,
) -> Dict[str, float]:
    """Calculate DHU (Defect per Hundred Units) percentages."""

    # Get garments QC'd on this day
    daily_qc_garments = order.garments.filter(
        sewing_line=production_line,
        quality_checks__created_at__range=(day_start, day_end),
    ).distinct()

    # Get all QC'd garments (cumulative)
    cumulative_qc_garments = order.garments.filter(
        sewing_line=production_line, quality_checks__created_at__lte=day_end
    ).distinct()

    # Calculate daily DHU
    daily_inspected = daily_qc_garments.count()
    daily_defects = (
        QualityCheck.objects.filter(
            garment__in=daily_qc_garments, created_at__range=(day_start, day_end)
        ).aggregate(total_defects=Count("defects"))["total_defects"]
        or 0
    )

    daily_dhu = (daily_defects / daily_inspected * 100) if daily_inspected > 0 else 0

    # Calculate average DHU
    cumulative_inspected = cumulative_qc_garments.count()
    cumulative_defects = (
        QualityCheck.objects.filter(
            garment__in=cumulative_qc_garments, created_at__lte=day_end
        ).aggregate(total_defects=Count("defects"))["total_defects"]
        or 0
    )

    average_dhu = (
        (cumulative_defects / cumulative_inspected * 100)
        if cumulative_inspected > 0
        else 0
    )

    return {"dhu_day": round(daily_dhu, 2), "dhu_average": round(average_dhu, 2)}


def _get_inspection_metrics(
    order: Order,
    production_line: ProductionLine,
    day_start: pendulum.DateTime,
    day_end: pendulum.DateTime,
) -> Dict[str, Dict[str, int]]:
    """Get inspection and packing metrics."""

    # Daily inspection (QC scans)
    daily_inspection = (
        order.garments.filter(
            sewing_line=production_line,
            quality_checks__created_at__range=(day_start, day_end),
        )
        .distinct()
        .count()
    )

    # Cumulative inspection
    cumulative_inspection = (
        order.garments.filter(
            sewing_line=production_line, quality_checks__created_at__lte=day_end
        )
        .distinct()
        .count()
    )

    # Packing = Finishing QC Pass (as requested)
    daily_packed = order.garments.filter(
        sewing_line=production_line,
        status=GarmentStatus.FINISHING_QC_PASS,
        finishing_completed_at__range=(day_start, day_end),
    ).count()

    cumulative_packed = order.garments.filter(
        sewing_line=production_line,
        status=GarmentStatus.FINISHING_QC_PASS,
        finishing_completed_at__lte=day_end,
    ).count()

    return {
        "inspection": {"day": daily_inspection, "cumulative": cumulative_inspection},
        "packed": {"day": daily_packed, "cumulative": cumulative_packed},
    }
