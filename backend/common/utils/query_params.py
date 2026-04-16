from typing import Dict, Any
from django.http import QueryDict


def normalize_query_params(query_params: QueryDict) -> Dict[str, Any]:
    """
    Normalize query parameters to handle both standard and array-style parameters.
    
    Converts frontend array parameters like 'order_ids[]=191&order_ids[]=192'
    to Django-compatible format like 'order_ids=191&order_ids=192'.
    
    Args:
        query_params: Django QueryDict from request.query_params
        
    Returns:
        Dict with normalized parameters suitable for DRF serializers
    """
    # Convert QueryDict to regular dict for easier manipulation
    normalized = {}
    
    # Process each parameter
    for key, values in query_params.lists():
        # Handle array-style parameters (e.g., 'order_ids[]')
        if key.endswith('[]'):
            # Remove the '[]' suffix to get the clean parameter name
            clean_key = key[:-2]
            normalized[clean_key] = values
        else:
            # Handle regular parameters
            if len(values) == 1:
                # Single value - use as string
                normalized[key] = values[0]
            else:
                # Multiple values - use as list
                normalized[key] = values
    
    return normalized


def handle_frontend_arrays(query_params: QueryDict) -> Dict[str, Any]:
    """
    Handle frontend array parameters for compatibility with DRF serializers.
    
    This is a simpler alias for normalize_query_params focused on the specific
    use case of handling frontend array parameters.
    
    Args:
        query_params: Django QueryDict from request.query_params
        
    Returns:
        Dict with parameters suitable for DRF ListField validation
    """
    return normalize_query_params(query_params)
