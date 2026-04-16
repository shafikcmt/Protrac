from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema, OpenApiParameter


def create_qc_scan_endpoint(
    service_function, scan_serializer, response_serializer, qc_type
):
    """Factory function to create QC scan endpoints."""

    @extend_schema(
        tags=["scanning"],
        request=scan_serializer,
        responses={201: response_serializer},
        description=f"Process {qc_type} QC scan for garment",
    )
    @api_view(["POST"])
    def qc_scan_endpoint(request):
        f"""Process {qc_type} QC scan for garment."""

        serializer = scan_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            defect_ids = [
                defect.id for defect in serializer.validated_data.get("defect_ids", [])
            ]

            result = service_function(
                tracking_code=serializer.validated_data["tracking_code"],
                qc_status=serializer.validated_data["qc_status"],
                defect_ids=defect_ids,
                user=request.user,
                is_reevaluation=serializer.validated_data.get("is_reevaluation", False),
            )
            return Response(result, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return qc_scan_endpoint


def create_qc_info_endpoint(
    service_function,
    info_filter_serializer,
    info_serializer,
    response_serializer,
    qc_type,
):
    """Factory function to create QC info endpoints."""

    @extend_schema(
        tags=["scanning"],
        parameters=[
            OpenApiParameter("order", int, description="Filter by order ID"),
            OpenApiParameter(
                "tracking_code", str, description="Search by tracking code"
            ),
            OpenApiParameter("qc_status", str, description="Filter by QC status"),
            OpenApiParameter(
                "date_from", str, description="Filter from date (ISO format)"
            ),
            OpenApiParameter("date_to", str, description="Filter to date (ISO format)"),
            OpenApiParameter("limit", int, description="Max results (default: 50)"),
        ],
        responses={200: response_serializer},
        description=f"Get {qc_type} QC history for current scanner",
    )
    @api_view(["GET"])
    def qc_info_endpoint(request):
        f"""Get {qc_type} QC history for current scanner."""

        filter_serializer = info_filter_serializer(data=request.query_params)
        filter_serializer.is_valid(raise_exception=True)

        try:
            validated_data = filter_serializer.validated_data

            result = service_function(
                user=request.user,
                limit=validated_data.get("limit", 50),
                order_id=(
                    validated_data.get("order").id
                    if validated_data.get("order")
                    else None
                ),
                tracking_code=validated_data.get("tracking_code"),
                qc_status=validated_data.get("qc_status"),
                date_from=validated_data.get("date_from"),
                date_to=validated_data.get("date_to"),
            )

            serializer = info_serializer(result["scans"], many=True)

            return Response(
                {
                    "scanner_info": result["scanner_info"],
                    "count": result["count"],
                    "results": serializer.data,
                }
            )

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return qc_info_endpoint
