from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from django.utils import timezone
from tracking.services.report import get_daily_production_report_data
from tracking.serializers.report import (
    DailyProductionReportFilterSerializer,
    DailyProductionReportResponseSerializer,
)
from common.utils import normalize_query_params


class DailyProductionReportView(APIView):
    """
    Daily Production Report API endpoint.

    Generates a comprehensive daily production report similar to the manual
    cumulative daily production efficiency report. Includes:
    - Production line organization by BUYER and STYLE
    - Parts production tracking (Front, Back, Sleeve, etc.)
    - Assembly input/output metrics
    - Quality control (DHU %) statistics
    - Inspection and packing counts
    - Daily vs cumulative comparisons
    """

    serializer_class = DailyProductionReportFilterSerializer

    @extend_schema(
        tags=["reports"],
        summary="Daily Production Report",
        description="Generate daily cumulative production efficiency report for all production lines",
        parameters=[
            OpenApiParameter(
                name="report_date",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Date for the report in YYYY-MM-DD format (defaults to today)",
                required=False,
            ),
            OpenApiParameter(
                name="date_from",
                type=str,
                location=OpenApiParameter.QUERY,
                description="Start date for date range filter in YYYY-MM-DD format",
                required=False,
            ),
            OpenApiParameter(
                name="date_to",
                type=str,
                location=OpenApiParameter.QUERY,
                description="End date for date range filter in YYYY-MM-DD format",
                required=False,
            ),
            # Single filters
            OpenApiParameter(
                name="production_line_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by specific production line ID",
                required=False,
            ),
            OpenApiParameter(
                name="buyer_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by specific buyer ID",
                required=False,
            ),
            OpenApiParameter(
                name="style_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by specific style ID",
                required=False,
            ),
            OpenApiParameter(
                name="order_id",
                type=int,
                location=OpenApiParameter.QUERY,
                description="Filter by specific order ID",
                required=False,
            ),
            # Multiple filters
            OpenApiParameter(
                name="production_line_ids",
                type={"type": "array", "items": {"type": "integer"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple production line IDs (comma-separated)",
                required=False,
            ),
            OpenApiParameter(
                name="buyer_ids",
                type={"type": "array", "items": {"type": "integer"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple buyer IDs (comma-separated)",
                required=False,
            ),
            OpenApiParameter(
                name="style_ids",
                type={"type": "array", "items": {"type": "integer"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple style IDs (comma-separated)",
                required=False,
            ),
            OpenApiParameter(
                name="order_ids",
                type={"type": "array", "items": {"type": "integer"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple order IDs (comma-separated)",
                required=False,
            ),
            OpenApiParameter(
                name="sizes",
                type={"type": "array", "items": {"type": "string"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple sizes (comma-separated)",
                required=False,
            ),
            OpenApiParameter(
                name="colors",
                type={"type": "array", "items": {"type": "string"}},
                location=OpenApiParameter.QUERY,
                description="Filter by multiple colors (comma-separated)",
                required=False,
            ),
            OpenApiParameter(
                name="include_hidden",
                type=bool,
                location=OpenApiParameter.QUERY,
                description="Include manually-completed (hidden) rows, flagged is_hidden "
                "(excluded from summary totals). Defaults to false.",
                required=False,
            ),
        ],
        responses={200: DailyProductionReportResponseSerializer},
    )
    def get(self, request):
        """Get daily production report data."""

        # Normalize query parameters to handle frontend array parameters
        normalized_params = normalize_query_params(request.query_params)
        
        # Validate query parameters
        filter_serializer = DailyProductionReportFilterSerializer(
            data=normalized_params
        )
        filter_serializer.is_valid(raise_exception=True)

        # Get validated data
        validated_data = filter_serializer.validated_data
        report_date = validated_data.get("report_date", timezone.now().date())

        # Get report data
        try:
            production_lines_data = get_daily_production_report_data(
                report_date=report_date,
                date_from=validated_data.get("date_from"),
                date_to=validated_data.get("date_to"),

                production_line_id=validated_data.get("production_line_id"),
                buyer_id=validated_data.get("buyer_id"),
                style_id=validated_data.get("style_id"),
                order_id=validated_data.get("order_id"),

                production_line_ids=validated_data.get("production_line_ids"),
                buyer_ids=validated_data.get("buyer_ids"),
                style_ids=validated_data.get("style_ids"),
                order_ids=validated_data.get("order_ids"),

                sizes=validated_data.get("sizes"),
                colors=validated_data.get("colors"),
                include_hidden=validated_data.get("include_hidden", False),
            )

            # Prepare response data
            response_data = {
                "report_date": report_date,
                "company_name": "HUMANA APPARELS PVT. LTD",
                "report_title": "DAILY PRODUCTION REPORT",
                "production_lines": production_lines_data,
                "summary": _generate_summary(production_lines_data),
            }

            # Serialize response
            response_serializer = DailyProductionReportResponseSerializer(
                data=response_data
            )
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Failed to generate report: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


def _generate_summary(production_lines_data):
    """Generate summary statistics for the report."""

    total_orders = 0
    total_quantity = 0
    total_input = 0
    total_output = 0
    total_inspection = 0
    total_packed = 0

    for line_data in production_lines_data:
        for order_data in line_data.get("orders", []):
            # Hidden (manually-completed) rows are only present when the caller
            # asked to reveal them; they must never contribute to totals so the
            # summary stays identical whether or not include_hidden is set.
            if order_data.get("is_hidden"):
                continue
            total_orders += 1
            total_quantity += order_data.get("order_quantity", 0)
            total_input += int(order_data.get("input", 0) or 0)

            output_data = order_data.get("output", {}) or {}
            total_output += output_data.get("day", 0)

            inspection_data = order_data.get("inspection", {}) or {}
            total_inspection += inspection_data.get("day", 0)

            packed_data = order_data.get("packed", {}) or {}
            total_packed += packed_data.get("day", 0)

    # Count only lines that actually have visible (non-hidden) rows. The response
    # now carries every sewing line, including empty ones, so len() here would
    # otherwise report the number of lines that exist rather than the number
    # producing anything.
    lines_with_data = sum(
        1
        for line_data in production_lines_data
        if any(
            not o.get("is_hidden") for o in (line_data.get("orders") or [])
        )
    )

    return {
        "total_production_lines": lines_with_data,
        "total_orders": total_orders,
        "total_order_quantity": total_quantity,
        "daily_input": total_input,
        "daily_output": total_output,
        "daily_inspection": total_inspection,
        "daily_packed": total_packed,
        "overall_efficiency": round(
            (total_output / total_input * 100) if total_input > 0 else 0, 2
        ),
    }