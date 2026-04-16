from rest_framework import serializers


class MessageSerializer(serializers.Serializer):
    message = serializers.CharField(
        help_text="A message to be returned in the response."
    )
