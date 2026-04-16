from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema, OpenApiParameter
from tracking.services.scan import (
    process_garment_issue_for_assembly_scan,
    get_assembly_tracking_issue_info,
)
from tracking.serializers.scan import (
    AssemblyTrackingIssueScanSerializer,
    AssemblyTrackingIssueScanResponseSerializer,
    AssemblyTrackingIssueInfoSerializer,
    AssemblyTrackingIssueInfoResponseSerializer,
    AssemblyTrackingIssueInfoFilterSerializer,
)


@extend_schema(
    tags=["scanning"],
    request=AssemblyTrackingIssueScanSerializer,
    responses={201: AssemblyTrackingIssueScanResponseSerializer},
    description="Process garment issue for assembly scan",
)
@api_view(["POST"])
def assembly_tracking_issue_scan(request):
    """Process garment issue for assembly scan."""

    # Validate input format
    serializer = AssemblyTrackingIssueScanSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        result = process_garment_issue_for_assembly_scan(
            tracking_code=serializer.validated_data["tracking_code"],
            user=request.user,
        )
        return Response(result, status=status.HTTP_201_CREATED)

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=["scanning"],
    parameters=[
        OpenApiParameter("order", int, description="Filter by order ID"),
        OpenApiParameter("tracking_code", str, description="Search by tracking code"),
        OpenApiParameter("date_from", str, description="Filter from date (ISO format)"),
        OpenApiParameter("date_to", str, description="Filter to date (ISO format)"),
        OpenApiParameter("limit", int, description="Max results (default: 50)"),
    ],
    responses={200: AssemblyTrackingIssueInfoResponseSerializer},
    description="Get garment issue for assembly history for current scanner",
)
@api_view(["GET"])
def assembly_tracking_issue_info(request):
    """Get garment issue for assembly history for current scanner."""

    # Validate filter parameters
    filter_serializer = AssemblyTrackingIssueInfoFilterSerializer(
        data=request.query_params
    )
    filter_serializer.is_valid(raise_exception=True)

    try:
        # Extract validated data
        validated_data = filter_serializer.validated_data

        result = get_assembly_tracking_issue_info(
            user=request.user,
            limit=validated_data.get("limit", 50),
            order_id=(
                validated_data.get("order").id if validated_data.get("order") else None
            ),
            tracking_code=validated_data.get("tracking_code"),
            date_from=validated_data.get("date_from"),
            date_to=validated_data.get("date_to"),
        )

        # Serialize the scans
        serializer = AssemblyTrackingIssueInfoSerializer(result["scans"], many=True)

        return Response(
            {
                "scanner_info": result["scanner_info"],
                "count": result["count"],
                "results": serializer.data,
            }
        )

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
