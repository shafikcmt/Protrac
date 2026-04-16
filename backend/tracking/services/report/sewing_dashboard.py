from typing import List, Dict, Any, Optional
from django.db.models import Q
from tracking.models import ProductionLine, Order, Bundle
from tracking.models.constants import (
    GarmentStatus,
    QualityCheckStatus,
    BundleStatus,
    LineType,
)


def get_sewing_dashboard_data(
    production_line_id: Optional[int] = None,
    order_id: Optional[int] = None,
    style_id: Optional[int] = None,
    buyer_id: Optional[int] = None,
    production_line_ids: Optional[List[int]] = None,
    order_ids: Optional[List[int]] = None,
    style_ids: Optional[List[int]] = None,
    buyer_ids: Optional[List[int]] = None,
    sizes: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    active_only: bool = True,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get sewing dashboard data for all sewing production lines and their orders.

    Args:
        production_line_id: Filter by specific production line
        order_id: Filter by specific order
        style_id: Filter by specific style
        buyer_id: Filter by specific buyer
        production_line_ids: Filter by multiple production line IDs
        order_ids: Filter by multiple order IDs
        style_ids: Filter by multiple style IDs
        buyer_ids: Filter by multiple buyer IDs
        sizes: Filter by multiple sizes
        colors: Filter by multiple colors
        active_only: Show only incomplete orders (default: True)
        date_from: Filter orders created after this date
        date_to: Filter orders created before this date

    Returns:
        Structured data for sewing dashboard
    """
    # Base queryset for production lines
    production_lines_qs = ProductionLine.objects.filter(
        line_type=LineType.SEWING  # Only sewing lines have part inventory
    ).prefetch_related("part_inventories__order", "part_inventories__part")

    # Apply production line filters
    if production_line_id:
        production_lines_qs = production_lines_qs.filter(id=production_line_id)
    elif production_line_ids:
        production_lines_qs = production_lines_qs.filter(id__in=production_line_ids)

    # Base queryset for orders
    orders_qs = Order.objects.select_related(
        "style__season", "style__buyer", "size", "color"
    ).prefetch_related("garments", "part_inventories", "bundles")

    # Apply order filters
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

    if sizes:
        orders_qs = orders_qs.filter(size__name__in=sizes)

    if colors:
        orders_qs = orders_qs.filter(color__name__in=colors)

    if date_from:
        orders_qs = orders_qs.filter(created_at__gte=date_from)

    if date_to:
        orders_qs = orders_qs.filter(created_at__lte=date_to)

    # Build result structure
    production_lines_data = []

    for production_line in production_lines_qs:
        # Get all orders that have any relationship with this sewing line:
        # 1. Have part inventory on this line
        # 2. Have garments assigned to this line
        # 3. Have bundles assigned to this line
        line_orders = orders_qs.filter(
            Q(part_inventories__production_line=production_line)
            | Q(garments__sewing_line=production_line)
            | Q(bundles__assigned_sewing_line=production_line)
        ).distinct()

        orders_data = []

        for order in line_orders:
            order_data = _calculate_sewing_order_metrics(order, production_line)
            # Apply active_only filter
            if active_only and order_data["completion_rate"] >= 1.0:
                continue

            orders_data.append(order_data)

        # Always include production lines, even if no active orders
        # Get minimal FIFO summary for this production line
        fifo_summary = _get_production_line_fifo_summary(production_line)

        # Get QC summary with defects and DHU data for this production line
        qc_summary = _get_production_line_qc_summary(production_line)

        production_lines_data.append(
            {
                "production_line_id": production_line.id,
                "production_line_name": production_line.name,
                "orders": orders_data,
                "fifo_summary": fifo_summary,
                "qc_summary": qc_summary,
            }
        )

    return production_lines_data


def _calculate_sewing_order_metrics(
    order: Order, production_line: ProductionLine
) -> Dict[str, Any]:
    """Calculate all metrics for a single order on a specific sewing production line."""
    # 1. Input: Complete garments possible from bundles assigned to this production line
    # For each garment, we need all parts - so take the minimum quantity across all parts
    line_bundles = order.bundles.filter(
        assigned_sewing_line=production_line,
        status__in=[BundleStatus.ISSUED_TO_SEWING, BundleStatus.COMPLETED],
    )

    # Group bundles by part and sum their garment quantities
    part_quantities = {}
    for bundle in line_bundles:
        part_id = bundle.part.id
        if part_id not in part_quantities:
            part_quantities[part_id] = 0
        part_quantities[part_id] += bundle.garment_quantity

    # Input is the minimum quantity across all parts (bottleneck determines complete garments)
    input_count = min(part_quantities.values()) if part_quantities else 0

    # 2. Garment Assembly WIP: Garments issued for assembly but not QC'd
    garment_assembly_wip = order.garments.filter(
        status=GarmentStatus.ISSUED_FOR_ASSEMBLY, sewing_line=production_line
    ).count()

    # 3. Output: Garments that passed sewing QC on this production line
    output_count = order.garments.filter(
        status=GarmentStatus.SEWING_QC_PASS, sewing_line=production_line
    ).count()

    # 4. Calculate inventory totals from part inventories
    part_inventories = order.part_inventories.filter(production_line=production_line)

    total_inventory = sum(inv.total_quantity for inv in part_inventories)
    issued_inventory = sum(inv.issued_quantity for inv in part_inventories)
    available_inventory = sum(inv.available_quantity for inv in part_inventories)

    # Assembly Ready Count: Maximum possible garments based on bottleneck part
    if part_inventories.exists():
        assembly_ready_count = min(
            inventory.available_quantity for inventory in part_inventories
        )
    else:
        assembly_ready_count = 0

    # 5. QC Stats: Current sewing QC statistics for this order on this production line
    qc_stats = _get_sewing_qc_stats(order, production_line)

    # 6. Part details for inventory visualization
    parts_data = _get_sewing_assembly_parts_details(order, production_line)

    # 7. Calculate completion rate based on line-specific input
    completion_rate = output_count / input_count if input_count > 0 else 0

    # 8. Get FIFO status for this order on this line
    fifo_status = _get_order_fifo_status(order, production_line)

    return {
        "order_id": order.id,
        "order_number": order.order_number,
        "style": order.style.name,
        "season": order.style.season.name,
        "size": order.size.name,
        "color": order.color.name,
        "order_quantity": order.quantity,
        "input": input_count,
        "assembly_ready_count": assembly_ready_count,
        "garment_assembly_wip": garment_assembly_wip,
        "output": output_count,
        "completion_rate": round(completion_rate, 3),
        "total_inventory": total_inventory,
        "issued_inventory": issued_inventory,
        "available_inventory": available_inventory,
        "qc_stats": qc_stats,
        "assembly_parts": parts_data,
        "fifo_status": fifo_status,
    }


def _get_sewing_qc_stats(
    order: Order, production_line: ProductionLine
) -> Dict[str, Any]:
    """Get current sewing QC statistics for garments produced on this sewing line."""
    # Get all garments for this order produced on this sewing line
    garments = order.garments.filter(sewing_line=production_line)

    # Initialize counters
    qc_pass_count = 0
    qc_fail_count = 0
    qc_rework_count = 0
    total_defects = 0
    defect_counts = {}

    for garment in garments:
        # Get the latest quality check for this garment
        latest_qc = garment.quality_checks.all().order_by("-created_at").first()

        if latest_qc:
            if latest_qc.status == QualityCheckStatus.PASS:
                qc_pass_count += 1
            elif latest_qc.status == QualityCheckStatus.FAIL:
                qc_fail_count += 1
                # Count defects for failed QC
                defects = latest_qc.defects.all()
                total_defects += defects.count()
                for defect in defects:
                    defect_name = defect.name
                    defect_counts[defect_name] = defect_counts.get(defect_name, 0) + 1
            elif latest_qc.status == QualityCheckStatus.REWORK:
                qc_rework_count += 1
                # Count defects for rework QC
                defects = latest_qc.defects.all()
                total_defects += defects.count()
                for defect in defects:
                    defect_name = defect.name
                    defect_counts[defect_name] = defect_counts.get(defect_name, 0) + 1

    # Calculate DHU (Defects per Hundred Units)
    total_qc_completed = qc_pass_count + qc_fail_count + qc_rework_count
    dhu_percentage = (
        (total_defects / total_qc_completed * 100) if total_qc_completed > 0 else 0.0
    )

    # Get top 5 defects
    top_defects = []
    if defect_counts:
        sorted_defects = sorted(
            defect_counts.items(), key=lambda x: x[1], reverse=True
        )[:5]
        for defect_name, count in sorted_defects:
            percentage = (count / total_defects * 100) if total_defects > 0 else 0.0
            top_defects.append(
                {
                    "defect_name": defect_name,
                    "count": count,
                    "percentage": round(percentage, 2),
                }
            )

    return {
        "qc_pass": qc_pass_count,
        "qc_fail": qc_fail_count,
        "qc_rework": qc_rework_count,
        "total_qc_completed": total_qc_completed,
        "total_defects": total_defects,
        "dhu_percentage": round(dhu_percentage, 2),
        "top_defects": top_defects,
    }


def _get_sewing_assembly_parts_details(
    order: Order, production_line: ProductionLine
) -> List[Dict[str, Any]]:
    """Get detailed parts inventory for sewing line bar charts and bottleneck identification."""

    parts_data = []

    # Get all part inventories for this order on this production line
    inventories = order.part_inventories.filter(
        production_line=production_line
    ).select_related("part")

    # Calculate line-specific input to use as max_possible
    line_bundles = order.bundles.filter(
        assigned_sewing_line=production_line,
        status__in=[BundleStatus.ISSUED_TO_SEWING, BundleStatus.COMPLETED],
    )

    # Group bundles by part to get line-specific quantities
    line_part_quantities = {}
    for bundle in line_bundles:
        part_id = bundle.part.id
        if part_id not in line_part_quantities:
            line_part_quantities[part_id] = 0
        line_part_quantities[part_id] += bundle.garment_quantity

    # Use minimum as the line's target garment count
    line_target_garments = (
        min(line_part_quantities.values()) if line_part_quantities else 0
    )

    for inventory in inventories:
        # Use line-specific target instead of global order quantity
        max_possible = line_target_garments
        utilization = (
            (inventory.total_quantity / max_possible * 100) if max_possible > 0 else 0
        )

        parts_data.append(
            {
                "name": inventory.part.name,
                "available": inventory.available_quantity,
                "total_produced": inventory.total_quantity,
                "issued": inventory.issued_quantity,
                "max_possible": max_possible,
                "utilization_percentage": round(utilization, 1),
            }
        )

    # Sort by available quantity (lowest first) to identify bottlenecks
    parts_data.sort(key=lambda x: x["available"])

    # Mark top 25% (minimum 1) as bottlenecks based on lowest availability
    total_parts = len(parts_data)
    bottleneck_count = max(1, int(total_parts * 0.25))
    for i, part_data in enumerate(parts_data):
        part_data["is_bottleneck"] = i < bottleneck_count

    return parts_data


def _get_production_line_fifo_summary(
    production_line: ProductionLine,
) -> Dict[str, int]:
    """Get minimal FIFO summary for a production line."""
    # Count bundles with FIFO violations
    violation_count = Bundle.objects.filter(
        assigned_sewing_line=production_line, fifo_violation_flag=True
    ).count()

    # Count recent violations (last 24 hours)
    from django.utils import timezone
    from datetime import timedelta

    recent_violations = Bundle.objects.filter(
        assigned_sewing_line=production_line,
        fifo_violation_flag=True,
        completed_at__gte=timezone.now() - timedelta(hours=24),
    ).count()

    return {
        "total_fifo_violations": violation_count,
        "recent_fifo_violations": recent_violations,
    }


def _get_order_fifo_status(
    order: Order, production_line: ProductionLine
) -> Dict[str, Any]:
    """Get minimal FIFO status for an order on a production line."""
    # Count bundles with violations for this order
    violation_count = Bundle.objects.filter(
        order=order, assigned_sewing_line=production_line, fifo_violation_flag=True
    ).count()

    # Get total completed bundles for this order on this line
    total_bundles = Bundle.objects.filter(
        order=order, assigned_sewing_line=production_line, status=BundleStatus.COMPLETED
    ).count()

    return {
        "has_fifo_violations": violation_count > 0,
        "violation_count": violation_count,
        "total_completed_bundles": total_bundles,
    }


def _get_production_line_qc_summary(production_line: ProductionLine) -> Dict[str, Any]:
    """Get QC summary and defect analysis for entire production line across all orders."""
    # Get all garments produced on this sewing line
    garments = production_line.produced_garments.all()

    # Initialize counters
    total_qc_pass = 0
    total_qc_fail = 0
    total_qc_rework = 0
    total_defects = 0
    defect_counts = {}

    for garment in garments:
        # Get the latest quality check for this garment
        latest_qc = garment.quality_checks.all().order_by("-created_at").first()

        if latest_qc:
            if latest_qc.status == QualityCheckStatus.PASS:
                total_qc_pass += 1
            elif latest_qc.status == QualityCheckStatus.FAIL:
                total_qc_fail += 1
                # Count defects for failed QC
                defects = latest_qc.defects.all()
                total_defects += defects.count()
                for defect in defects:
                    defect_name = defect.name
                    defect_counts[defect_name] = defect_counts.get(defect_name, 0) + 1
            elif latest_qc.status == QualityCheckStatus.REWORK:
                total_qc_rework += 1
                # Count defects for rework QC
                defects = latest_qc.defects.all()
                total_defects += defects.count()
                for defect in defects:
                    defect_name = defect.name
                    defect_counts[defect_name] = defect_counts.get(defect_name, 0) + 1

    # Calculate line-level DHU
    total_qc_completed = total_qc_pass + total_qc_fail + total_qc_rework
    line_dhu_percentage = (
        (total_defects / total_qc_completed * 100) if total_qc_completed > 0 else 0.0
    )

    # Get top 5 defects for the line
    top_line_defects = []
    if defect_counts:
        sorted_defects = sorted(
            defect_counts.items(), key=lambda x: x[1], reverse=True
        )[:5]
        for defect_name, count in sorted_defects:
            percentage = (count / total_defects * 100) if total_defects > 0 else 0.0
            top_line_defects.append(
                {
                    "defect_name": defect_name,
                    "count": count,
                    "percentage": round(percentage, 2),
                }
            )

    return {
        "total_qc_pass": total_qc_pass,
        "total_qc_fail": total_qc_fail,
        "total_qc_rework": total_qc_rework,
        "total_qc_completed": total_qc_completed,
        "total_defects": total_defects,
        "line_dhu_percentage": round(line_dhu_percentage, 2),
        "top_line_defects": top_line_defects,
    }
