from django.contrib.auth.models import Group, User
from rest_framework import permissions, viewsets
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser

from .models import (
    Product,
    Photo,
    FeatureOfFault,
    RepairAction,
    ReasonNotRepaired,
    RepairResult,
    Fault,
)
from .serializers import (
    ProductSerializer,
    PhotoSerializer,
    FeatureOfFaultSerializer,
    RepairActionSerializer,
    ReasonNotRepairedSerializer,
    RepairResultSerializer,
    UserSerializer,
    GroupSerializer,
    FaultSerializer,
)

class UserViewSet(viewsets.ModelViewSet): 
    """ API endpoint that allows users to be viewed or edited. """ 
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

class GroupViewSet(viewsets.ModelViewSet): 
    """ API endpoint that allows groups to be viewed or edited. """
    queryset = Group.objects.all().order_by("name") 
    serializer_class = GroupSerializer 
    permission_classes = [permissions.AllowAny]


class ProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows products to be viewed or edited.
    """
    queryset = Product.objects.all().order_by("id")
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]


class PhotoViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows photos to be viewed or edited.
    """
    queryset = Photo.objects.select_related("product_id").all().order_by("-uploaded_at")
    serializer_class = PhotoSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class FeatureOfFaultViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows fault features to be viewed or edited.
    """
    queryset = FeatureOfFault.objects.select_related("product_id").all().order_by("id")
    serializer_class = FeatureOfFaultSerializer
    permission_classes = [permissions.AllowAny]


class RepairActionViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows repair actions to be viewed or edited.
    """
    queryset = RepairAction.objects.select_related("product_id").all().order_by("name")
    serializer_class = RepairActionSerializer
    permission_classes = [permissions.AllowAny]


class ReasonNotRepairedViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows reasons-not-repaired to be viewed or edited.
    """
    queryset = ReasonNotRepaired.objects.select_related("product_id").all().order_by("name")
    serializer_class = ReasonNotRepairedSerializer
    permission_classes = [permissions.AllowAny]


class RepairResultViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows repair results to be viewed or edited.
    """
    queryset = RepairResult.objects.select_related("product_id", "fault_diagnosed").all().order_by("-date")
    serializer_class = RepairResultSerializer
    permission_classes = [permissions.AllowAny]

class FaultViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows faults to be viewed or edited.
    """
    queryset = Fault.objects.select_related("product_id").all().order_by("id")
    serializer_class = FaultSerializer
    permission_classes = [permissions.AllowAny]
