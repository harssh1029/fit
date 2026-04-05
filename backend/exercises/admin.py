from django.contrib import admin

from .models import Exercise, MuscleGroup


@admin.register(MuscleGroup)
class MuscleGroupAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "side", "canonical_group")
    search_fields = ("id", "name", "aliases")
    list_filter = ("side", "canonical_group")


@admin.register(Exercise)
class ExerciseAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "source",
        "body_part",
        "target",
        "level",
        "is_compound",
        "is_featured",
    )
    search_fields = ("id", "name", "target", "body_part")
    list_filter = (
        "source",
        "body_part",
        "movement_pattern",
        "level",
        "is_compound",
        "is_featured",
    )
