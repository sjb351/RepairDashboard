from django.contrib import admin
from django.contrib.admin import SimpleListFilter
from django.db.models import Count

from .models import (
    Product,
    Photo,
    FeatureOfFault,
    RepairAction,
    ReasonNotRepaired,
    RepairResult,
    Fault,
)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "barcode_serial")
    search_fields = ("name", "barcode_serial")


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "image", "uploaded_at", "product_id")
    search_fields = ("title", "product_id__name", "product_id__barcode_serial")
    list_filter = ("uploaded_at", "product_id")


@admin.register(FeatureOfFault)
class FeatureOfFaultAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description", "product_id")
    search_fields = ("name", "description", "product_id__name", "product_id__barcode_serial")
    list_filter = ("product_id", "name", "photos")


@admin.register(RepairAction)
class RepairActionAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description", "product_id")
    search_fields = ("name", "product_id__name", "product_id__barcode_serial")
    list_filter = ("product_id",)


@admin.register(ReasonNotRepaired)
class ReasonNotRepairedAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description", "product_id")
    search_fields = ("name", "product_id__name", "product_id__barcode_serial")
    list_filter = ("product_id",)


@admin.register(RepairResult)
class RepairResultAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "text",
        "type",
        "product_id",
        "date",
        "time_to_diagnose",
        "time_to_repair",
        "fault_diagnosed",
    )
    list_filter = ("type", "product_id", "fault_diagnosed")
    search_fields = ("text", "notes", "product_id__name", "product_id__barcode_serial", "fault_diagnosed")
    filter_horizontal = ("repair_action", "reason_not_repaired", "photo_id")


class FaultFeaturesMultiSelectFilter(SimpleListFilter):
    """
    Multi-select filter for Fault.features

    Use repeated query params:
      ?features=1&features=4&features=9

    Default below is MATCH ALL selected.
    Flip to MATCH ANY by using the other return line.
    """
    title = "features (multi-select)"
    parameter_name = "features"  # repeated query param key

    def lookups(self, request, model_admin):
        # If Fault.features is M2M to FeatureOfFault, this is correct.
        # Otherwise change FeatureOfFault -> your actual Feature model.
        qs = FeatureOfFault.objects.order_by("name").values_list("pk", "name")
        return [(str(pk), name) for pk, name in qs]

    def queryset(self, request, queryset):
        selected = request.GET.getlist(self.parameter_name)
        if not selected:
            return queryset

        selected = list(dict.fromkeys(selected))  # de-dupe, keep order

        # --- MATCH ANY selected features (OR) ---
        # return queryset.filter(features__in=selected).distinct()

        # --- MATCH ALL selected features (AND) ---
        return (
            queryset.filter(features__in=selected)
            .annotate(_match_count=Count("features", distinct=True))
            .filter(_match_count=len(selected))
            .distinct()
        )


@admin.register(Fault)
class FaultAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "description", "product_id")
    search_fields = ("name", "description", "product_id__name")
    list_filter = ("product_id", FaultFeaturesMultiSelectFilter)
    filter_horizontal = ("features",)  # nice UI when editing a Fault
