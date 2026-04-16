from rest_framework import status, serializers
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema, OpenApiParameter
from tracking.services.scan import (
    process_part_receive_scan,
    get_part_receive_info,
)
from tracking.serializers.scan import (
    AssemblyPartReceiveScanSerializer,
    AssemblyPartReceiveScanResponseSerializer,
    PartReceiveInfoResponseSerializer,
)


@extend_schema(
    tags=["scanning"],
    request=AssemblyPartReceiveScanSerializer,
    responses={201: AssemblyPartReceiveScanResponseSerializer},
    summary="Process Part Receive Scan",
    description="Process a part receive scan to update inventory when parts are completed and ready for assembly",
)
@api_view(["POST"])
def part_receive_scan(request):
    """Process part receive scan."""
    try:
        serializer = AssemblyPartReceiveScanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        result = process_part_receive_scan(
            tracking_code=serializer.validated_data["tracking_code"],
            user=request.user,
        )

        return Response(result, status=status.HTTP_201_CREATED)

    except serializers.ValidationError as e:
        return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
    except PermissionDenied as e:
        return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@extend_schema(
    tags=["scanning"],
    parameters=[
        OpenApiParameter(
            name="limit",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Number of scans to return (default: 50)",
        ),
        OpenApiParameter(
            name="order_id",
            type=int,
            location=OpenApiParameter.QUERY,
            description="Filter by order ID",
        ),
        OpenApiParameter(
            name="tracking_code",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Search by tracking code",
        ),
        OpenApiParameter(
            name="date_from",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Filter scans from this date/time (ISO format)",
        ),
        OpenApiParameter(
            name="date_to",
            type=str,
            location=OpenApiParameter.QUERY,
            description="Filter scans until this date/time (ISO format)",
        ),
    ],
    responses={200: PartReceiveInfoResponseSerializer},
    summary="Get Part Receive Scan History",
    description="Get part receive scan history for the user's scanner with filtering options",
)
@api_view(["GET"])
def part_receive_info(request):
    """Get part receive scan history for user's scanner."""
    try:
        # Parse query parameters
        limit = int(request.GET.get("limit", 50))
        order_id = request.GET.get("order_id")
        tracking_code = request.GET.get("tracking_code")
        date_from = request.GET.get("date_from")
        date_to = request.GET.get("date_to")
        part_id = request.GET.get("part")

        # Convert order_id to int if provided
        if order_id:
            order_id = int(order_id)

        # Convert part_id to int if provided
        if part_id:
            part_id = int(part_id)

        result = get_part_receive_info(
            user=request.user,
            limit=limit,
            order_id=order_id,
            tracking_code=tracking_code,
            date_from=date_from,
            date_to=date_to,
            part_id=part_id,
        )

        return Response(result, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
