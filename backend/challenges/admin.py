from django.contrib import admin

from .models import Challenge


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "get_name", "get_level", "get_status")
    list_filter = ("order",)
    search_fields = ("id", "card__name")

    def get_name(self, obj):  # pragma: no cover - admin only
        return obj.card.get("name")

    get_name.short_description = "Name"  # type: ignore[attr-defined]

    def get_level(self, obj):  # pragma: no cover - admin only
        return obj.card.get("level")

    get_level.short_description = "Level"  # type: ignore[attr-defined]

    def get_status(self, obj):  # pragma: no cover - admin only
        return obj.card.get("status")

    get_status.short_description = "Status"  # type: ignore[attr-defined]
