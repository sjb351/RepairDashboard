import base64
import imghdr
import uuid

from django.contrib.auth.models import Group, User
from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import (
    Product,
    Photo,
    FeatureOfFault,
    RepairAction,
    ReasonNotRepaired,
    RepairResult,
    Fault,
)

class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ["url", "username", "email", "groups"]


class GroupSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Group
        fields = ["url", "name"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "name", "barcode_serial"]


class Base64ImageField(serializers.ImageField):
    def to_internal_value(self, data):
        if isinstance(data, str):
            if "base64," in data:
                _, data = data.split("base64,", 1)
            try:
                decoded = base64.b64decode(data)
            except (TypeError, ValueError):
                raise serializers.ValidationError("Invalid image data.")

            file_name = uuid.uuid4().hex[:12]
            file_ext = imghdr.what(None, decoded) or "jpg"
            data = ContentFile(decoded, name=f"{file_name}.{file_ext}")
        return super().to_internal_value(data)


class PhotoSerializer(serializers.ModelSerializer):
    image = Base64ImageField()
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
        allow_null=True,
    )
    product = ProductSerializer(source="product_id", read_only=True)
    feature_id = serializers.PrimaryKeyRelatedField(
        source="feature",
        queryset=FeatureOfFault.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Photo
        fields = [
            "id",
            "title",
            "image",
            "uploaded_at",
            "product_id",
            "product",
            "feature_id",
        ]


class FeatureOfFaultSerializer(serializers.ModelSerializer):
    photos = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
        allow_null=True,
    )
    product = ProductSerializer(source="product_id", read_only=True)

    class Meta:
        model = FeatureOfFault
        fields = ["id", "name", "description", "photos", "product_id", "product"]


class RepairActionSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
        allow_null=True,
    )
    product = ProductSerializer(source="product_id", read_only=True)

    class Meta:
        model = RepairAction
        fields = ["id", "name", "description", "product_id", "product"]


class ReasonNotRepairedSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
        allow_null=True,
    )
    product = ProductSerializer(source="product_id", read_only=True)

    class Meta:
        model = ReasonNotRepaired
        fields = ["id", "name", "description", "product_id", "product"]


class RepairResultSerializer(serializers.ModelSerializer):
    # FK to product: write via product_id, read nested product
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
        allow_null=True,
    )
    product = ProductSerializer(source="product_id", read_only=True)

    # M2M: write via lists of IDs
    repair_action = serializers.PrimaryKeyRelatedField(
        queryset=RepairAction.objects.all(),
        many=True,
        required=False,
    )
    reason_not_repaired = serializers.PrimaryKeyRelatedField(
        queryset=ReasonNotRepaired.objects.all(),
        many=True,
        required=False,
    )
    fault_features = serializers.PrimaryKeyRelatedField(
        queryset=FeatureOfFault.objects.all(),
        many=True,
        required=False,
    )

    # Optional: include read-friendly nested forms too
    repair_action_details = RepairActionSerializer(source="repair_action", many=True, read_only=True)
    reason_not_repaired_details = ReasonNotRepairedSerializer(source="reason_not_repaired", many=True, read_only=True)
    fault_diagnosed = serializers.PrimaryKeyRelatedField(
        queryset=Fault.objects.all(),
        required=False,
        allow_null=True,
    )
    photo_id = serializers.PrimaryKeyRelatedField(
        queryset=Photo.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = RepairResult
        fields = [
            "id",
            "text",
            "type",
            "product_id",
            "product",
            "date",
            "repair_action",
            "repair_action_details",
            "reason_not_repaired",
            "reason_not_repaired_details",
            "fault_diagnosed",
            "fault_features",
            "photo_id",
            "notes",
            "time_to_repair",
            "time_to_diagnose",
        ]


# ---- Optional "nested read" serializers (handy for GET endpoints) ----

class ProductDetailSerializer(serializers.ModelSerializer):
    results = RepairResultSerializer(source="repair_results", many=True, read_only=True)

    class Meta:
        model = Product
        fields = ["id", "name", "barcode_serial", "results"]


class PhotoDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Photo
        fields = ["id", "title", "image", "uploaded_at", "feature"]

class FaultSerializer(serializers.ModelSerializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
        allow_null=True,
    )
    product = ProductSerializer(source="product_id", read_only=True)

    class Meta:
        model = Fault
        fields = ["id", "name", "description", "features", "product_id", "product"]
