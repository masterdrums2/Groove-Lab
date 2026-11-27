from rest_framework import serializers

from .models import User


class UserPublicSerializer(serializers.ModelSerializer):
    displayName = serializers.CharField(source="display_name", allow_null=True)
    createdAt = serializers.DateTimeField(source="created_at")
    activatedAt = serializers.DateTimeField(source="activated_at", allow_null=True)

    class Meta:
        model = User
        fields = (
            "id",
            "phone",
            "email",
            "displayName",
            "status",
            "market",
            "createdAt",
            "activatedAt",
        )
