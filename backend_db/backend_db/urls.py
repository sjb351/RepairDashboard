"""
URL configuration for backend_db project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from rest_framework import routers

from backend.views import *

router = routers.DefaultRouter()
router.register(r"products", ProductViewSet)
router.register(r"photos", PhotoViewSet)
router.register(r"features", FeatureOfFaultViewSet)
router.register(r"repair-actions", RepairActionViewSet)
router.register(r"reasons-not-repaired", ReasonNotRepairedViewSet)
router.register(r"repair-results", RepairResultViewSet)
router.register(r"faults", FaultViewSet)

#urlpatterns = router.urls

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include(router.urls)),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
