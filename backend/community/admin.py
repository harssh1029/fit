from django.contrib import admin

from .models import CommunityActivity, ContactSyncInvite, Friendship, UserPublicCard


@admin.register(UserPublicCard)
class UserPublicCardAdmin(admin.ModelAdmin):
	list_display = (
		'user',
		'display_name',
		'username',
		'overall_score',
		'consistency_score',
		'challenges_completed',
		'body_balance_percent',
		'streak_days',
		'updated_at',
	)
	search_fields = ('user__username', 'user__email', 'display_name', 'username')
	list_filter = ('updated_at',)
	readonly_fields = ('updated_at',)


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
	list_display = ('from_user', 'to_user', 'status', 'created_at', 'updated_at')
	search_fields = ('from_user__username', 'to_user__username', 'from_user__email', 'to_user__email')
	list_filter = ('status', 'created_at')
	readonly_fields = ('created_at', 'updated_at')


@admin.register(CommunityActivity)
class CommunityActivityAdmin(admin.ModelAdmin):
	list_display = ('user', 'activity_type', 'title', 'score', 'occurred_at')
	search_fields = ('user__username', 'user__email', 'title', 'description')
	list_filter = ('activity_type', 'occurred_at')
	readonly_fields = ('created_at',)


@admin.register(ContactSyncInvite)
class ContactSyncInviteAdmin(admin.ModelAdmin):
	list_display = ('user', 'identifier', 'source', 'created_at')
	search_fields = ('user__username', 'user__email', 'identifier')
	list_filter = ('source', 'created_at')
	readonly_fields = ('created_at',)
