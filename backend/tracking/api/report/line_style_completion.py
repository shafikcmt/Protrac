from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from tracking.models import LineStyleCompletion
from tracking.serializers.report.line_style_completion import LineStyleCompletionSerializer


class LineStyleCompletionView(APIView):
    """
    GET  /api/tracking/reports/line-style-completion/  — list all manual completions
    POST /api/tracking/reports/line-style-completion/  — mark a line+order as complete

    The POST is idempotent: marking an already-recorded line+order complete
    upgrades the existing (usually AUTO) row to MANUAL and answers 200 instead of
    failing the unique_together validation. See
    ``LineStyleCompletionSerializer.create``.
    """

    def get(self, request):
        qs = LineStyleCompletion.objects.select_related(
            "production_line",
            "order__style__buyer",
            "order__size",
            "order__color",
            "completed_by",
        ).order_by("-created_at")
        serializer = LineStyleCompletionSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = LineStyleCompletionSerializer(
            data=request.data, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            # 201 for a brand-new completion, 200 when an existing row was
            # upgraded to MANUAL (the idempotent path).
            created = getattr(serializer, "instance_created", True)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LineStyleCompletionDetailView(APIView):
    """
    DELETE /api/tracking/reports/line-style-completion/{id}/  — undo manual completion
    """

    def delete(self, request, pk):
        try:
            instance = LineStyleCompletion.objects.get(pk=pk)
        except LineStyleCompletion.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
