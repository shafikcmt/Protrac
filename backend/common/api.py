from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from common.serializers import MessageSerializer


class HealthCheckView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = MessageSerializer

    def get(self, request):
        """
        Returns a simple message indicating the API is healthy.
        """
        data = {"message": "System is healthy"}

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)
