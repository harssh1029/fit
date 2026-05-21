from django.contrib import admin

from .models import (
	ActivityComment,
	ActivityLike,
	ActivityShare,
	CommunityActivity,
	CommunityGroup,
	ContactSyncInvite,
	Friendship,
	GroupAnnouncement,
	GroupChallenge,
	GroupChallengeProgress,
	GroupInvite,
	GroupMembership,
	UserFollow,
	UserPublicCard,
)


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
	search_fields = ('user__username', 'user__email', 'title', 'description', 'metadata')
	list_filter = ('activity_type', 'occurred_at')
	readonly_fields = ('created_at',)


@admin.register(ActivityComment)
class ActivityCommentAdmin(admin.ModelAdmin):
	list_display = ('user', 'activity', 'created_at')
	search_fields = ('user__username', 'user__email', 'activity__title', 'body')
	list_filter = ('created_at',)
	readonly_fields = ('created_at', 'updated_at')


@admin.register(ActivityLike)
class ActivityLikeAdmin(admin.ModelAdmin):
	list_display = ('user', 'activity', 'created_at')
	search_fields = ('user__username', 'user__email', 'activity__title')
	list_filter = ('created_at',)
	readonly_fields = ('created_at',)


@admin.register(ActivityShare)
class ActivityShareAdmin(admin.ModelAdmin):
	list_display = ('user', 'activity', 'created_at')
	search_fields = ('user__username', 'user__email', 'activity__title')
	list_filter = ('created_at',)
	readonly_fields = ('created_at',)


@admin.register(UserFollow)
class UserFollowAdmin(admin.ModelAdmin):
	list_display = ('follower', 'following', 'status', 'created_at', 'updated_at')
	search_fields = ('follower__username', 'following__username', 'follower__email', 'following__email')
	list_filter = ('status', 'created_at')
	readonly_fields = ('created_at', 'updated_at')


class GroupMembershipInline(admin.TabularInline):
	model = GroupMembership
	extra = 0
	autocomplete_fields = ('user',)
	fields = ('user', 'role', 'status', 'created_at')
	readonly_fields = ('created_at',)


class GroupChallengeInline(admin.TabularInline):
	model = GroupChallenge
	extra = 0
	fields = ('title', 'created_by', 'challenge_type', 'start_date', 'end_date', 'required_sessions', 'reward_xp', 'visibility')
	autocomplete_fields = ('created_by',)


class GroupAnnouncementInline(admin.TabularInline):
	model = GroupAnnouncement
	extra = 0
	fields = ('title', 'announcement_type', 'created_by', 'is_pinned', 'created_at')
	readonly_fields = ('created_at',)
	autocomplete_fields = ('created_by',)


@admin.register(CommunityGroup)
class CommunityGroupAdmin(admin.ModelAdmin):
	list_display = ('name', 'owner', 'privacy', 'group_type', 'member_count', 'weekly_activity_count', 'active_challenge_title', 'updated_at')
	search_fields = ('name', 'description', 'owner__username', 'owner__email')
	list_filter = ('privacy', 'group_type', 'goal', 'created_at', 'updated_at')
	readonly_fields = ('member_count', 'weekly_activity_count', 'active_challenge_title', 'created_at', 'updated_at')
	autocomplete_fields = ('owner',)
	inlines = (GroupMembershipInline, GroupChallengeInline, GroupAnnouncementInline)


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
	list_display = ('user', 'group', 'role', 'status', 'created_at', 'updated_at')
	search_fields = ('user__username', 'user__email', 'group__name')
	list_filter = ('role', 'status', 'created_at')
	autocomplete_fields = ('user', 'group')
	readonly_fields = ('created_at', 'updated_at')


@admin.register(GroupInvite)
class GroupInviteAdmin(admin.ModelAdmin):
	list_display = ('invitee', 'group', 'invited_by', 'status', 'created_at')
	search_fields = ('invitee__username', 'invitee__email', 'invited_by__username', 'group__name')
	list_filter = ('status', 'created_at')
	autocomplete_fields = ('group', 'invited_by', 'invitee')
	readonly_fields = ('created_at', 'updated_at')


@admin.register(GroupChallenge)
class GroupChallengeAdmin(admin.ModelAdmin):
	list_display = ('title', 'group', 'challenge_type', 'start_date', 'end_date', 'required_sessions', 'reward_xp', 'visibility')
	search_fields = ('title', 'group__name', 'created_by__username')
	list_filter = ('challenge_type', 'visibility', 'start_date', 'end_date')
	autocomplete_fields = ('group', 'created_by')
	readonly_fields = ('created_at', 'updated_at')


@admin.register(GroupChallengeProgress)
class GroupChallengeProgressAdmin(admin.ModelAdmin):
	list_display = ('user', 'challenge', 'points', 'active_days', 'recorded_workouts', 'completed_at', 'updated_at')
	search_fields = ('user__username', 'user__email', 'challenge__title', 'challenge__group__name')
	list_filter = ('completed_at', 'updated_at')
	autocomplete_fields = ('challenge', 'user')
	readonly_fields = ('updated_at',)


@admin.register(GroupAnnouncement)
class GroupAnnouncementAdmin(admin.ModelAdmin):
	list_display = ('title', 'group', 'announcement_type', 'created_by', 'is_pinned', 'created_at')
	search_fields = ('title', 'body', 'group__name', 'created_by__username')
	list_filter = ('announcement_type', 'is_pinned', 'created_at')
	autocomplete_fields = ('group', 'created_by')
	readonly_fields = ('created_at', 'updated_at')


@admin.register(ContactSyncInvite)
class ContactSyncInviteAdmin(admin.ModelAdmin):
	list_display = ('user', 'identifier', 'source', 'created_at')
	search_fields = ('user__username', 'user__email', 'identifier')
	list_filter = ('source', 'created_at')
	readonly_fields = ('created_at',)
