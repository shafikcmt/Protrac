from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema, OpenApiParameter
from tracking.services.fifo_validation import get_fifo_violations_for_production_line
from tracking.models import ProductionLine
from rest_framework import serializers


class FifoViolationSerializer(serializers.Serializer):
    """Serializer for FIFO violation information."""

    id = serializers.IntegerField()
    tracking_code = serializers.CharField()
    display_bundle_number = serializers.CharField()
    cut_part_name = serializers.CharField()
    order_number = serializers.CharField()
    status = serializers.CharField()
    completed_at = serializers.DateTimeField(allow_null=True)
    fifo_violation_details = serializers.JSONField(allow_null=True)


class FifoViolationResponseSerializer(serializers.Serializer):
    """Response serializer for FIFO violations."""

    production_line_id = serializers.IntegerField()
    production_line_name = serializers.CharField()
    total_violations = serializers.IntegerField()
    violations = FifoViolationSerializer(many=True)


@extend_schema(
    tags=["reports"],
    parameters=[
        OpenApiParameter("production_line", int, description="Production line ID"),
        OpenApiParameter("limit", int, description="Max results (default: 50)"),
    ],
    responses={200: FifoViolationResponseSerializer},
    description="Get FIFO violations for production line",
)
@api_view(["GET"])
def fifo_violations_report(request):
    """Get FIFO violations for a production line."""

    # Get production line parameter
    production_line_id = request.query_params.get("production_line")
    if not production_line_id:
        return Response(
            {"error": "production_line parameter is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        production_line = ProductionLine.objects.get(id=production_line_id)
    except ProductionLine.DoesNotExist:
        return Response(
            {"error": "Production line not found"}, status=status.HTTP_404_NOT_FOUND
        )

    # Get limit parameter
    limit = int(request.query_params.get("limit", 50))

    # Get violations
    violations = get_fifo_violations_for_production_line(production_line, limit)

    return Response(
        {
            "production_line_id": production_line.id,
            "production_line_name": production_line.name,
            "total_violations": len(violations),
            "violations": violations,
        }
    )
