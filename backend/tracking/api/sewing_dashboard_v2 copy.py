from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from tracking.services.sewing_dashboard_v2 import get_sewing_dashboard_v2_data
from tracking.serializers.sewing_dashboard_v2 import (
    SewingLineDashboardV2Serializer,
    SewingDashboardV2FilterSerializer,
)
from common.utils import normalize_query_params


class SewingLineDashboardV2View(APIView):
    """
    Sewing Line Dashboard V2 API endpoint.

    Provides enhanced sewing production metrics including:
    - Header metrics (target, pass, rework, reject quantities)
    - Gauge metrics (efficiency, rejection, DHU percentages)
    - Hourly breakdown table
    - Line metrics (WIP, today's loading)
    - End line defects analysis
    - Part inventory details
    """

    serializer_class = SewingDashboardV2FilterSerializer

    @extend_schema(
        tags=["reports"],
        summary="Enhanced Sewing Line Dashboard V2",
        description="""
        Get comprehensive sewing dashboard data matching the production dashboard UI:
        
        **Header Metrics:**
        - Target Quantity (daily target)
        - Pass Quantity (QC passed garments)
        - Rework Quantity (QC rework garments) 
        - Rejected Quantity (QC failed garments)
        
        **Gauge Metrics:**
        - Efficiency % (calculated using SMV and worker count)
        - Rejection % (failed/total QC'd)
        - DHU % (defects per hundred units)
        
        **Additional Data:**
        - Hourly breakdown (target vs output vs rework per hour)
        - Line WIP count (garments in assembly)
        - Today's loading (garments from today's input)
        - End line defects (top defects for the day)
        """,
        parameters=[
            # Single filters
            OpenApiParameter(
                name="production_line_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by specific production line ID",
            ),
            OpenApiParameter(
                name="date",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Date to get data for (ISO format, defaults to today)",
            ),
            OpenApiParameter(
                name="date_from",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Start date for date range filter (ISO format)",
            ),
            OpenApiParameter(
                name="date_to",
                type=str,
                location=OpenApiParameter.QUERY,
                description="End date for date range filter (ISO format)",
            ),
            OpenApiParameter(
                name="order_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by specific order ID",
            ),
            OpenApiParameter(
                name="style_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by specific style ID",
            ),
            OpenApiParameter(
                name="buyer_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by specific buyer ID",
            ),
            OpenApiParameter(
                name="size",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by specific garment size",
            ),
            OpenApiParameter(
                name="color",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by specific garment color",
            ),
            # Multiple filters
            OpenApiParameter(
                name="production_line_ids",
                type={"type": "array", "items": {"type": "integer"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple production line IDs (comma-separated)",
            ),
            OpenApiParameter(
                name="order_ids",
                type={"type": "array", "items": {"type": "integer"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple order IDs (comma-separated)",
            ),
            OpenApiParameter(
                name="style_ids",
                type={"type": "array", "items": {"type": "integer"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple style IDs (comma-separated)",
            ),
            OpenApiParameter(
                name="buyer_ids",
                type={"type": "array", "items": {"type": "integer"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple buyer IDs (comma-separated)",
            ),
            OpenApiParameter(
                name="sizes",
                type={"type": "array", "items": {"type": "string"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple sizes (comma-separated)",
            ),
            OpenApiParameter(
                name="colors",
                type={"type": "array", "items": {"type": "string"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple colors (comma-separated)",
            ),
        ],
        responses={200: SewingLineDashboardV2Serializer(many=True)},
    )
    def get(self, request):
        """Get enhanced sewing line dashboard v2 data with all dashboard metrics."""

        # Normalize query parameters to handle frontend array parameters
        normalized_params = normalize_query_params(request.query_params)
        
        # Validate query parameters
        serializer = SewingDashboardV2FilterSerializer(data=normalized_params)
        serializer.is_valid(raise_exception=True)

        try:
            # Get enhanced dashboard data using service
            dashboard_data = get_sewing_dashboard_v2_data(**serializer.validated_data)

            # Return list of sewing lines with enhanced data
            response_serializer = SewingLineDashboardV2Serializer(
                dashboard_data, many=True
            )

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Failed to generate enhanced dashboard data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
