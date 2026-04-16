from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from tracking.services.report.garment_heatmap import get_garment_heatmap_data
from tracking.serializers.report.garment_heatmap import (
    GarmentHeatmapFilterSerializer,
    GarmentHeatmapResponseSerializer,
)
from common.utils import normalize_query_params


class GarmentHeatmapView(APIView):
    """
    Garment Heatmap API endpoint.

    Provides a GitHub-style heatmap view of garments grouped by orders,
    showing the status of each garment for visualization purposes.
    Each garment is represented with its current status, allowing
    frontend to apply appropriate styling/colors.
    """

    serializer_class = GarmentHeatmapFilterSerializer

    @extend_schema(
        tags=["reports"],
        summary="Garment Heatmap Data",
        description="""
        Get garment heatmap data showing garments grouped by orders with their statuses.
        
        **Features:**
        - Garments grouped by order with order metadata
        - Each garment includes status and timestamps
        - Status counts summary per order and overall
        - Comprehensive filtering support
        
        **Garment Statuses:**
        - pending_assembly: Garment created but not yet issued for assembly
        - issued_for_assembly: Garment issued to production line for assembly
        - sewing_qc_pass: Garment passed sewing quality check
        - sewing_qc_fail: Garment failed sewing quality check
        - sewing_qc_rework: Garment marked for rework during sewing QC
        - finishing_qc_pass: Garment passed finishing quality check
        - finishing_qc_fail: Garment failed finishing quality check
        - finishing_qc_rework: Garment marked for rework during finishing QC
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
        responses={200: GarmentHeatmapResponseSerializer},
    )
    def get(self, request):
        """Get garment heatmap data with optional filters."""

        # Normalize query parameters to handle frontend array parameters
        normalized_params = normalize_query_params(request.query_params)
        
        # Validate query parameters
        serializer = GarmentHeatmapFilterSerializer(data=normalized_params)
        serializer.is_valid(raise_exception=True)

        try:
            # Get heatmap data using service
            heatmap_data = get_garment_heatmap_data(**serializer.validated_data)

            # Serialize response
            response_serializer = GarmentHeatmapResponseSerializer(data=heatmap_data)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Failed to generate garment heatmap data: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
