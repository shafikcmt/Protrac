"""
Helper functions for applying filters to querysets in service layer.
"""
from typing import List, Optional
from django.db.models import QuerySet


def apply_order_filters(
    queryset: QuerySet,
    order_id: Optional[int] = None,
    order_ids: Optional[List[int]] = None,
    style_id: Optional[int] = None,
    style_ids: Optional[List[int]] = None,
    buyer_id: Optional[int] = None,
    buyer_ids: Optional[List[int]] = None,
    sizes: Optional[List[str]] = None,
    colors: Optional[List[str]] = None,
    order_field_prefix: str = "",
) -> QuerySet:
    """
    Apply common order-related filters to a queryset.
    
    Args:
        queryset: The queryset to filter
        order_id: Single order ID filter
        order_ids: Multiple order IDs filter
        style_id: Single style ID filter
        style_ids: Multiple style IDs filter
        buyer_id: Single buyer ID filter
        buyer_ids: Multiple buyer IDs filter
        sizes: Multiple sizes filter
        colors: Multiple colors filter
        order_field_prefix: Prefix for order fields (e.g., "garment__primary_bundle__order")
    
    Returns:
        Filtered queryset
    """
    prefix = f"{order_field_prefix}__" if order_field_prefix else ""
    
    # Order filters
    if order_id:
        queryset = queryset.filter(**{f"{prefix}id": order_id})
    elif order_ids:
        queryset = queryset.filter(**{f"{prefix}id__in": order_ids})
    
    # Style filters
    if style_id:
        queryset = queryset.filter(**{f"{prefix}style_id": style_id})
    elif style_ids:
        queryset = queryset.filter(**{f"{prefix}style_id__in": style_ids})
    
    # Buyer filters
    if buyer_id:
        queryset = queryset.filter(**{f"{prefix}style__buyer_id": buyer_id})
    elif buyer_ids:
        queryset = queryset.filter(**{f"{prefix}style__buyer_id__in": buyer_ids})
    
    # Size filters
    if sizes:
        queryset = queryset.filter(**{f"{prefix}size__name__in": sizes})
    
    # Color filters
    if colors:
        queryset = queryset.filter(**{f"{prefix}color__name__in": colors})
    
    return queryset


def apply_production_line_filters(
    queryset: QuerySet,
    production_line_id: Optional[int] = None,
    production_line_ids: Optional[List[int]] = None,
    field_name: str = "id",
) -> QuerySet:
    """
    Apply production line filters to a queryset.
    
    Args:
        queryset: The queryset to filter
        production_line_id: Single production line ID
        production_line_ids: Multiple production line IDs
        field_name: Field name for production line (default: "id")
    
    Returns:
        Filtered queryset
    """
    if production_line_id:
        queryset = queryset.filter(**{field_name: production_line_id})
    elif production_line_ids:
        queryset = queryset.filter(**{f"{field_name}__in": production_line_ids})
    
    return queryset
