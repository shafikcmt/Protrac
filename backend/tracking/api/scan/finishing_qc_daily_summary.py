from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from drf_spectacular.utils import extend_schema, OpenApiParameter

from tracking.services.scan import get_finishing_qc_daily_summary
from tracking.serializers.scan import (
    DailySummaryFilterSerializer,
    FinishingQCDailySummaryResponseSerializer,
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
    responses={200: FinishingQCDailySummaryResponseSerializer},
    summary="Finishing QC Daily Summary",
    description=(
        "Today's finishing-QC tally for the current user's line: output (pass), "
        "rework, fail, pass-rate and DHU%, plus a per-order serial grid where each "
        "serial shows both its sewing-QC and finishing-QC status."
    ),
)
@api_view(["GET"])
def finishing_qc_daily_summary(request):
    """Return today's finishing QC summary for the current user's line."""

    filter_serializer = DailySummaryFilterSerializer(data=request.query_params)
    filter_serializer.is_valid(raise_exception=True)

    try:
        result = get_finishing_qc_daily_summary(
            user=request.user,
            summary_date=filter_serializer.validated_data.get("date"),
        )
        return Response(result, status=status.HTTP_200_OK)

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
