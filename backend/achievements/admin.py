from django.contrib import admin

from .models import (
	AchievementEvent,
	Badge,
	BadgeRule,
	CategoryLevel,
	FeaturedBadge,
	LeaderboardPeriod,
	LeaderboardResult,
	UserBadge,
	UserLevel,
)


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
	list_display = ('id', 'name', 'category', 'tier', 'rarity', 'display_priority')
	list_filter = ('category', 'tier', 'rarity', 'is_periodic')
	search_fields = ('id', 'name', 'description')


@admin.register(BadgeRule)
class BadgeRuleAdmin(admin.ModelAdmin):
	list_display = ('badge', 'trigger_type', 'condition_type', 'threshold', 'period')
	list_filter = ('trigger_type', 'condition_type', 'period')
	search_fields = ('badge__name', 'badge_id', 'condition_type')


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
	list_display = ('user', 'badge', 'period_key', 'source_type', 'earned_at')
	list_filter = ('badge__category', 'badge__rarity', 'source_type')
	search_fields = ('user__username', 'badge__name', 'badge_id', 'period_key')


admin.site.register(UserLevel)
admin.site.register(CategoryLevel)
admin.site.register(LeaderboardPeriod)
admin.site.register(LeaderboardResult)
admin.site.register(AchievementEvent)
admin.site.register(FeaturedBadge)
