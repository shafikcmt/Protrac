from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema, OpenApiParameter
from tracking.services.scan.bundle_issue import (
    process_bundle_issue_scan,
    get_bundle_issue_info,
)
from tracking.serializers.scan import (
    BundleIssueScanSerializer,
    BundleIssueScanResponseSerializer,
    BundleIssueInfoSerializer,
    BundleIssueInfoResponseSerializer,
    BundleIssueInfoFilterSerializer,
)


@extend_schema(
    tags=["scanning"],
    request=BundleIssueScanSerializer,
    responses={201: BundleIssueScanResponseSerializer},
    description="Issue bundle from cutting line to specified sewing line",
)
@api_view(["POST"])
def bundle_issue_scan(request):
    """Issue bundle from cutting line to sewing line."""

    # Validate input format
    serializer = BundleIssueScanSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        result = process_bundle_issue_scan(
            tracking_code=serializer.validated_data["tracking_code"],
            sewing_line=serializer.validated_data["sewing_line"],
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
        OpenApiParameter("mother_only", bool, description="Filter to only show mother cut part bundles"),
    ],
    responses={200: BundleIssueInfoResponseSerializer},
    description="Get bundle issue history for current scanner",
)
@api_view(["GET"])
def bundle_issue_info(request):
    """Get bundle issue history for current scanner."""

    # Clean validation using filter serializer
    filter_serializer = BundleIssueInfoFilterSerializer(data=request.query_params)
    filter_serializer.is_valid(raise_exception=True)

    try:
        # Extract validated data
        validated_data = filter_serializer.validated_data

        result = get_bundle_issue_info(
            user=request.user,
            limit=validated_data.get("limit", 50),
            order_id=(
                validated_data.get("order").id if validated_data.get("order") else None
            ),
            tracking_code=validated_data.get("tracking_code"),
            date_from=validated_data.get("date_from"),
            date_to=validated_data.get("date_to"),
            mother_only=validated_data.get("mother_only", False),
        )

        # Serialize the scans
        serializer = BundleIssueInfoSerializer(result["scans"], many=True)

        return Response(
            {
                "scanner_info": result["scanner_info"],
                "count": result["count"],
                "results": serializer.data,
            }
        )

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
