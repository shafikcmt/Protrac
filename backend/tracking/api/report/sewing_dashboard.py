from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from tracking.services.report import get_sewing_dashboard_data
from tracking.serializers.report import (
    SewingLineDashboardSerializer,
    SewingDashboardFilterSerializer,
)
from common.utils import normalize_query_params


class SewingDashboardView(APIView):
    """
    Sewing Dashboard API endpoint.

    Provides real-time sewing production metrics for all sewing lines and orders:
    - Input: Total possible garments from bundles
    - Materials Before Assembly: Cut parts ready for assembly
    - Garment Assembly WIP: Garments issued for assembly but not yet passed sewing QC
    - Output: Garments that passed sewing QC
    - Assembly part inventory details for bottleneck identification
    """

    serializer_class = SewingDashboardFilterSerializer

    @extend_schema(
        tags=["reports"],
        summary="Sewing Dashboard Data",
        description="Get sewing dashboard data with KPIs for all sewing lines and orders",
        parameters=[
            # Single filters
            OpenApiParameter(
                name="production_line_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by specific production line ID",
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
            OpenApiParameter(
                name="active_only",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Show only incomplete orders (default: true)",
            ),
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
        ],
        responses={200: SewingLineDashboardSerializer(many=True)},
    )
    def get(self, request):
        """Get sewing dashboard data with optional filters."""

        # Normalize query parameters to handle frontend array parameters
        normalized_params = normalize_query_params(request.query_params)
        
        # Validate query parameters
        serializer = SewingDashboardFilterSerializer(data=normalized_params)
        serializer.is_valid(raise_exception=True)

        try:
            # Get dashboard data using service
            dashboard_data = get_sewing_dashboard_data(**serializer.validated_data)

            # Return list of sewing lines directly
            response_serializer = SewingLineDashboardSerializer(
                dashboard_data, many=True
            )

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Failed to generate dashboard data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
