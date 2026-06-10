from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from tracking.models import LineTarget, ProductionLine
from tracking.serializers.line_target import LineTargetSerializer
from tracking.models.constants import LineType


class LineTargetListCreateView(generics.ListCreateAPIView):
    """List and create line targets."""

    queryset = LineTarget.objects.filter(line__line_type="sewing")
    serializer_class = LineTargetSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["line", "date"]
    search_fields = ["line__name"]
    ordering_fields = ["date", "line__name"]
    ordering = ["-date", "line__name"]


class LineTargetDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete line targets."""

    queryset = LineTarget.objects.all()
    serializer_class = LineTargetSerializer


class LineTargetBulkUpsertView(APIView):
    """
    Bulk create or update line targets for a given date.
    Accepts: { date: "YYYY-MM-DD", targets: [ { line_id, target_quantity, work_hours, worker_count }, ... ] }
    Uses update_or_create per line+date pair.
    Skips entries where target_quantity is 0 or null.
    """

    def post(self, request):
        date = request.data.get("date")
        targets = request.data.get("targets", [])

        if not date:
            return Response({"error": "date is required"}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        errors = []

        for entry in targets:
            line_id = entry.get("line_id")
            target_quantity = entry.get("target_quantity")

            if not target_quantity or int(target_quantity) == 0:
                continue

            try:
                line = ProductionLine.objects.get(id=line_id, line_type=LineType.SEWING)
                obj, created = LineTarget.objects.update_or_create(
                    line=line,
                    date=date,
                    defaults={
                        "target_quantity": int(target_quantity),
                        "work_hours": entry.get("work_hours") or 8,
                        "worker_count": entry.get("worker_count") or 1,
                    },
                )
                results.append(LineTargetSerializer(obj).data)
            except ProductionLine.DoesNotExist:
                errors.append(f"Line {line_id} not found or not a sewing line")
            except Exception as e:
                errors.append(str(e))

        return Response({"saved": results, "errors": errors}, status=status.HTTP_200_OK)
