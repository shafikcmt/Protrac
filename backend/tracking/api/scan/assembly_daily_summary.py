from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema, OpenApiParameter

from tracking.services.scan import get_assembly_daily_summary
from tracking.serializers.scan import (
    DailySummaryFilterSerializer,
    AssemblyDailySummaryResponseSerializer,
)


@extend_schema(
    tags=["scanning"],
    parameters=[
        OpenApiParameter(
            "date",
            str,
            description="Date to summarise (YYYY-MM-DD). Defaults to today.",
        ),
    ],
    responses={200: AssemblyDailySummaryResponseSerializer},
    summary="Assembly Daily Summary",
    description=(
        "Today's assembly summary for the current user's line: garments issued "
        "for assembly and parts received, scoped to the active order's style."
    ),
)
@api_view(["GET"])
def assembly_daily_summary(request):
    """Return today's assembly summary for the current user's line."""

    filter_serializer = DailySummaryFilterSerializer(data=request.query_params)
    filter_serializer.is_valid(raise_exception=True)

    try:
        result = get_assembly_daily_summary(
            user=request.user,
            summary_date=filter_serializer.validated_data.get("date"),
        )
        return Response(result, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
