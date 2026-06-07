from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from tracking.models import LineStyleCompletion
from tracking.serializers.report.line_style_completion import LineStyleCompletionSerializer


class LineStyleCompletionView(APIView):
    """
    GET  /api/tracking/reports/line-style-completion/  — list all manual completions
    POST /api/tracking/reports/line-style-completion/  — mark a line+order as complete
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
            return Response(serializer.data, status=status.HTTP_201_CREATED)
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
