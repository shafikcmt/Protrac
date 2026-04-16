from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from tracking.services.report.finishing_dashboard import get_finishing_dashboard_data
from tracking.serializers.report.finishing_dashboard import (
    FinishingDashboardFilterSerializer,
    FinishingOrderDashboardSerializer,
)
from common.utils import normalize_query_params


class FinishingDashboardView(APIView):
    """
    Finishing Dashboard API endpoint.

    Provides finishing production metrics per order showing:
    - Input: Garments ready for finishing (passed sewing QC)
    - Output: Garments that passed finishing QC
    - QC statistics for finishing quality checks
    - Source sewing lines that produced garments for each order
    """

    serializer_class = FinishingDashboardFilterSerializer

    @extend_schema(
        tags=["reports"],
        summary="Finishing Dashboard Data",
        description="Get finishing dashboard data with metrics per order and source sewing lines",
        parameters=[
            # Single filters
            OpenApiParameter(
                name="finishing_line_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by specific finishing line ID",
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
                name="style",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by style name (case-insensitive partial match)",
            ),
            OpenApiParameter(
                name="size",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by size name (case-insensitive partial match)",
            ),
            OpenApiParameter(
                name="color",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter by color name (case-insensitive partial match)",
            ),
            # Multiple filters
            OpenApiParameter(
                name="finishing_line_ids",
                type={"type": "array", "items": {"type": "integer"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple finishing line IDs (comma-separated)",
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
            # Date filters
            OpenApiParameter(
                name="date_from",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter orders created after this date (ISO format)",
            ),
            OpenApiParameter(
                name="date_to",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Filter orders created before this date (ISO format)",
            ),
            OpenApiParameter(
                name="active_only",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Show only incomplete orders (default: true)",
            ),
        ],
        responses={200: FinishingOrderDashboardSerializer(many=True)},
    )
    def get(self, request):
        """Get finishing dashboard data with optional filters."""

        # Normalize query parameters to handle frontend array parameters
        normalized_params = normalize_query_params(request.query_params)
        
        # Validate query parameters
        serializer = FinishingDashboardFilterSerializer(data=normalized_params)
        serializer.is_valid(raise_exception=True)

        try:
            # Get dashboard data using service
            dashboard_data = get_finishing_dashboard_data(**serializer.validated_data)

            # Return list of orders directly
            response_serializer = FinishingOrderDashboardSerializer(
                dashboard_data, many=True
            )

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Failed to generate finishing dashboard data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
