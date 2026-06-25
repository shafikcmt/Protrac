from typing import List, Dict, Any, Optional
from collections import defaultdict
from django.db.models import Q
from tracking.models import Order


def get_garment_heatmap_data(
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
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    active_only: bool = True,
) -> Dict[str, Any]:
    """
    Get garment heatmap data showing garments grouped by orders with their statuses.

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
        date_from: Filter orders created after this date
        date_to: Filter orders created before this date
        active_only: Show only incomplete orders

    Returns:
        Structured data for garment heatmap
    """
    # Base queryset for orders
    orders_qs = Order.objects.select_related(
        "style__buyer", "style__season", "size", "color"
    ).prefetch_related("garments")

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

    # Apply production line filters (through garments)
    if production_line_id:
        orders_qs = orders_qs.filter(
            Q(garments__sewing_line_id=production_line_id) |
            Q(garments__finishing_line_id=production_line_id)
        ).distinct()
    elif production_line_ids:
        orders_qs = orders_qs.filter(
            Q(garments__sewing_line_id__in=production_line_ids) |
            Q(garments__finishing_line_id__in=production_line_ids)
        ).distinct()
        
    # Apply date range filters
    if date_from:
        orders_qs = orders_qs.filter(created_at__gte=date_from)
    if date_to:
        orders_qs = orders_qs.filter(created_at__lte=date_to)
        
    # Apply active_only filter using delivery date
    if active_only:
        from datetime import date
        today = date.today()
        orders_qs = orders_qs.filter(
            Q(delivery_date__isnull=True) | Q(delivery_date__gt=today)
        )
        # Hide styles that are hidden in the Daily Production Report — both
        # manual completions and auto-completed (fully output) styles — using
        # the shared line-visibility source of truth, so the heatmap stays
        # consistent with every other surface.
        from tracking.models import ProductionLine
        from tracking.models.constants import LineType
        from tracking.services.line_visibility import get_hidden_order_ids_for_line

        hidden_order_ids: set = set()
        for line in ProductionLine.objects.filter(line_type=LineType.SEWING):
            hidden_order_ids |= get_hidden_order_ids_for_line(line)
        if hidden_order_ids:
            orders_qs = orders_qs.exclude(id__in=hidden_order_ids)

    # Build result
    orders_data = []
    overall_status_summary = defaultdict(int)
    total_garments = 0

    for order in orders_qs:
        # Get all garments for this order
        garments = order.garments.all().order_by('sequence_number')
        
        if not garments.exists():
            continue  # Skip orders with no garments
            
        garments_data = []
        status_summary = defaultdict(int)
        
        for garment in garments:
            garment_data = {
                "sequence_number": garment.sequence_number,
                "status": garment.status,
                "status_display": garment.get_status_display(),
                "tracking_code": garment.tracking_code,
                "created_at": garment.created_at,
                "issued_for_assembly_at": garment.issued_for_assembly_at,
                "assembly_completed_at": garment.assembly_completed_at,
                "finishing_completed_at": garment.finishing_completed_at,
            }
            garments_data.append(garment_data)
            
            # Update status counts
            status_summary[garment.status] += 1
            overall_status_summary[garment.status] += 1
            total_garments += 1

        order_data = {
            "order_id": order.id,
            "order_number": order.order_number,
            "style_name": order.style.name,
            "buyer_name": order.style.buyer.name,
            "season_name": order.style.season.name,
            "size_name": order.size.name,
            "color_name": order.color.name,
            "total_quantity": order.quantity,
            "garments": garments_data,
            "status_summary": dict(status_summary),
        }
        orders_data.append(order_data)

    return {
        "orders": orders_data,
        "total_orders": len(orders_data),
        "total_garments": total_garments,
        "overall_status_summary": dict(overall_status_summary),
    }
