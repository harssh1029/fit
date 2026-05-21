from django.contrib import admin

from .models import (
    Challenge,
    TrainingChallenge,
    UserChallengeCompletion,
    UserChallengeEnrollment,
    UserChallengeProgress,
)


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


@admin.register(UserChallengeCompletion)
class UserChallengeCompletionAdmin(admin.ModelAdmin):
    list_display = ("user", "challenge", "completed_at")
    search_fields = (
        "user__username",
        "user__email",
        "challenge__id",
        "challenge__card__name",
    )
    list_filter = ("completed_at",)
    readonly_fields = ("completed_at",)


@admin.register(TrainingChallenge)
class TrainingChallengeAdmin(admin.ModelAdmin):
    list_display = ("name", "visibility", "status", "participant_count", "group", "created_by", "start_date", "end_date")
    search_fields = ("name", "description", "requirement", "group__name", "created_by__username", "created_by__email")
    list_filter = ("visibility", "status", "is_official", "start_date", "end_date")
    autocomplete_fields = ("group", "created_by")
    readonly_fields = ("participant_count", "created_at", "updated_at")


@admin.register(UserChallengeEnrollment)
class UserChallengeEnrollmentAdmin(admin.ModelAdmin):
    list_display = ("user", "challenge", "status", "joined_at", "completed_at")
    search_fields = ("user__username", "user__email", "challenge__name")
    list_filter = ("status", "joined_at", "completed_at")
    autocomplete_fields = ("user", "challenge")
    readonly_fields = ("joined_at",)


@admin.register(UserChallengeProgress)
class UserChallengeProgressAdmin(admin.ModelAdmin):
    list_display = ("enrollment", "sessions_completed", "progress_percent", "points", "active_days", "updated_at")
    search_fields = ("enrollment__user__username", "enrollment__user__email", "enrollment__challenge__name")
    list_filter = ("updated_at",)
    autocomplete_fields = ("enrollment",)
    readonly_fields = ("updated_at",)
