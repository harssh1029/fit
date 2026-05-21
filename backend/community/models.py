from django.conf import settings
from django.db import models


class UserPublicCard(models.Model):
	"""Public community snapshot shown on friend cards and leaderboards."""

	user = models.OneToOneField(
		settings.AUTH_USER_MODEL,
		related_name='public_card',
		on_delete=models.CASCADE,
	)
	display_name = models.CharField(max_length=255, blank=True)
	username = models.CharField(max_length=150, blank=True)
	avatar_initials = models.CharField(max_length=4, blank=True)
	overall_score = models.PositiveSmallIntegerField(default=0)
	consistency_score = models.PositiveSmallIntegerField(default=0)
	challenges_completed = models.PositiveIntegerField(default=0)
	body_balance_percent = models.PositiveSmallIntegerField(default=0)
	active_plan_name = models.CharField(max_length=255, blank=True)
	streak_days = models.PositiveIntegerField(default=0)
	recent_sessions_this_week = models.PositiveIntegerField(default=0)
	fitness_age_years = models.PositiveSmallIntegerField(null=True, blank=True)
	followers_count = models.PositiveIntegerField(default=0)
	following_count = models.PositiveIntegerField(default=0)
	post_count = models.PositiveIntegerField(default=0)
	performance_score = models.FloatField(default=0)
	weekly_xp = models.PositiveIntegerField(default=0)
	tier = models.CharField(max_length=32, default='Rookie')
	metadata = models.JSONField(default=dict, blank=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['display_name', 'username']

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return self.display_name or self.username or f'User {self.user_id}'


class Friendship(models.Model):
	"""Friend graph edge between two users.

	For the current mobile flow, adding a friend creates an accepted friendship
	immediately. The status field keeps the model ready for request/accept UX.
	"""

	STATUS_PENDING = 'pending'
	STATUS_ACCEPTED = 'accepted'
	STATUS_BLOCKED = 'blocked'
	STATUS_CHOICES = [
		(STATUS_PENDING, 'Pending'),
		(STATUS_ACCEPTED, 'Accepted'),
		(STATUS_BLOCKED, 'Blocked'),
	]

	from_user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name='friendships_sent',
		on_delete=models.CASCADE,
	)
	to_user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name='friendships_received',
		on_delete=models.CASCADE,
	)
	status = models.CharField(
		max_length=16,
		choices=STATUS_CHOICES,
		default=STATUS_ACCEPTED,
	)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('from_user', 'to_user')
		indexes = [
			models.Index(fields=['from_user', 'status']),
			models.Index(fields=['to_user', 'status']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.from_user_id} -> {self.to_user_id} ({self.status})'


class UserFollow(models.Model):
	STATUS_ACTIVE = 'active'
	STATUS_BLOCKED = 'blocked'
	STATUS_CHOICES = [
		(STATUS_ACTIVE, 'Active'),
		(STATUS_BLOCKED, 'Blocked'),
	]

	follower = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name='following_edges',
		on_delete=models.CASCADE,
	)
	following = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name='follower_edges',
		on_delete=models.CASCADE,
	)
	status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('follower', 'following')
		indexes = [
			models.Index(fields=['follower', 'status']),
			models.Index(fields=['following', 'status']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.follower_id} follows {self.following_id}'


class CommunityActivity(models.Model):
	"""Public activity item visible to friends."""

	ACTIVITY_WORKOUT = 'workout'
	ACTIVITY_CHALLENGE = 'challenge'
	ACTIVITY_PLAN = 'plan'
	ACTIVITY_TEST = 'test'
	ACTIVITY_BADGE = 'badge'
	ACTIVITY_GROUP = 'group'
	ACTIVITY_CHOICES = [
		(ACTIVITY_WORKOUT, 'Workout'),
		(ACTIVITY_CHALLENGE, 'Challenge'),
		(ACTIVITY_PLAN, 'Plan'),
		(ACTIVITY_TEST, 'Fitness test'),
		(ACTIVITY_BADGE, 'Badge'),
		(ACTIVITY_GROUP, 'Group'),
	]

	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name='community_activities',
		on_delete=models.CASCADE,
	)
	activity_type = models.CharField(max_length=24, choices=ACTIVITY_CHOICES)
	title = models.CharField(max_length=255)
	description = models.CharField(max_length=500, blank=True)
	score = models.FloatField(null=True, blank=True)
	metadata = models.JSONField(default=dict, blank=True)
	occurred_at = models.DateTimeField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-occurred_at', '-id']
		indexes = [
			models.Index(fields=['user', 'occurred_at']),
			models.Index(fields=['activity_type', 'occurred_at']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.user_id}: {self.title}'


class ActivityLike(models.Model):
	activity = models.ForeignKey(
		CommunityActivity,
		related_name='likes',
		on_delete=models.CASCADE,
	)
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name='activity_likes',
		on_delete=models.CASCADE,
	)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('activity', 'user')
		indexes = [
			models.Index(fields=['activity', 'created_at']),
			models.Index(fields=['user', 'created_at']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.user_id} liked {self.activity_id}'


class ActivityComment(models.Model):
	activity = models.ForeignKey(
		CommunityActivity,
		related_name='comments',
		on_delete=models.CASCADE,
	)
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name='activity_comments',
		on_delete=models.CASCADE,
	)
	body = models.TextField(max_length=1000)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['created_at', 'id']
		indexes = [
			models.Index(fields=['activity', 'created_at']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.user_id} commented on {self.activity_id}'


class ActivityShare(models.Model):
	activity = models.ForeignKey(
		CommunityActivity,
		related_name='shares',
		on_delete=models.CASCADE,
	)
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name='activity_shares',
		on_delete=models.CASCADE,
	)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		indexes = [
			models.Index(fields=['activity', 'created_at']),
			models.Index(fields=['user', 'created_at']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.user_id} shared {self.activity_id}'


class CommunityGroup(models.Model):
	PRIVACY_PUBLIC = 'public'
	PRIVACY_PRIVATE = 'private'
	PRIVACY_INVITE_ONLY = 'invite_only'
	PRIVACY_CHOICES = [
		(PRIVACY_PUBLIC, 'Public'),
		(PRIVACY_PRIVATE, 'Private'),
		(PRIVACY_INVITE_ONLY, 'Invite only'),
	]
	TYPE_CHOICES = [
		('strength', 'Strength'),
		('running', 'Running'),
		('hybrid', 'Hybrid'),
		('office', 'Office'),
		('college', 'College'),
		('sports', 'Sports'),
		('recovery', 'Recovery'),
		('open', 'Open'),
	]
	GOAL_CHOICES = [
		('competitive', 'Competitive'),
		('accountability', 'Accountability'),
		('casual', 'Casual'),
		('event_prep', 'Event prep'),
		('transformation', 'Transformation'),
	]

	name = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	category = models.CharField(max_length=64, blank=True)
	group_type = models.CharField(max_length=32, choices=TYPE_CHOICES, default='open')
	privacy = models.CharField(max_length=16, choices=PRIVACY_CHOICES, default=PRIVACY_PUBLIC)
	goal = models.CharField(max_length=32, choices=GOAL_CHOICES, default='accountability')
	cover_image_url = models.URLField(max_length=1000, blank=True)
	weekly_goal_target = models.PositiveIntegerField(default=300)
	weekly_activity_count = models.PositiveIntegerField(default=0)
	group_rank = models.PositiveIntegerField(null=True, blank=True)
	active_challenge_title = models.CharField(max_length=255, blank=True)
	owner = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name='owned_community_groups',
		on_delete=models.CASCADE,
	)
	member_count = models.PositiveIntegerField(default=0)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-updated_at', 'name']
		indexes = [
			models.Index(fields=['privacy', 'updated_at']),
			models.Index(fields=['owner', 'updated_at']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return self.name


class GroupMembership(models.Model):
	ROLE_OWNER = 'owner'
	ROLE_ADMIN = 'admin'
	ROLE_MEMBER = 'member'
	ROLE_CHOICES = [
		(ROLE_OWNER, 'Owner'),
		(ROLE_ADMIN, 'Admin'),
		(ROLE_MEMBER, 'Member'),
	]
	STATUS_ACTIVE = 'active'
	STATUS_PENDING = 'pending'
	STATUS_CHOICES = [
		(STATUS_ACTIVE, 'Active'),
		(STATUS_PENDING, 'Pending'),
	]

	group = models.ForeignKey(CommunityGroup, related_name='memberships', on_delete=models.CASCADE)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='group_memberships', on_delete=models.CASCADE)
	role = models.CharField(max_length=16, choices=ROLE_CHOICES, default=ROLE_MEMBER)
	status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('group', 'user')
		indexes = [
			models.Index(fields=['group', 'status']),
			models.Index(fields=['user', 'status']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.user_id} in {self.group_id}'


class GroupInvite(models.Model):
	STATUS_PENDING = 'pending'
	STATUS_ACCEPTED = 'accepted'
	STATUS_DECLINED = 'declined'
	STATUS_CHOICES = [
		(STATUS_PENDING, 'Pending'),
		(STATUS_ACCEPTED, 'Accepted'),
		(STATUS_DECLINED, 'Declined'),
	]

	group = models.ForeignKey(CommunityGroup, related_name='invites', on_delete=models.CASCADE)
	invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='sent_group_invites', on_delete=models.CASCADE)
	invitee = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='received_group_invites', on_delete=models.CASCADE)
	status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_PENDING)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('group', 'invitee')
		indexes = [
			models.Index(fields=['group', 'status']),
			models.Index(fields=['invitee', 'status']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.invitee_id} invited to {self.group_id}'


class GroupChallenge(models.Model):
	group = models.ForeignKey(CommunityGroup, related_name='challenges', on_delete=models.CASCADE)
	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='created_group_challenges', on_delete=models.CASCADE)
	title = models.CharField(max_length=255)
	challenge_type = models.CharField(max_length=64, default='custom')
	eligible_workout_types = models.JSONField(default=list, blank=True)
	eligible_body_parts = models.JSONField(default=list, blank=True)
	min_duration = models.PositiveSmallIntegerField(default=20)
	max_daily_entries = models.PositiveSmallIntegerField(default=1)
	start_date = models.DateField()
	end_date = models.DateField()
	scoring_rules = models.JSONField(default=dict, blank=True)
	completion_bonus = models.PositiveIntegerField(default=0)
	required_sessions = models.PositiveSmallIntegerField(default=1)
	reward_xp = models.PositiveIntegerField(default=150)
	badge_icon = models.CharField(max_length=64, blank=True)
	visibility = models.CharField(max_length=32, default='group')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-start_date', '-id']
		indexes = [
			models.Index(fields=['group', 'start_date', 'end_date']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return self.title


class GroupChallengeProgress(models.Model):
	challenge = models.ForeignKey(GroupChallenge, related_name='progress_rows', on_delete=models.CASCADE)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='group_challenge_progress', on_delete=models.CASCADE)
	points = models.PositiveIntegerField(default=0)
	active_days = models.PositiveIntegerField(default=0)
	recorded_workouts = models.PositiveIntegerField(default=0)
	manual_logs = models.PositiveIntegerField(default=0)
	completed_at = models.DateTimeField(null=True, blank=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('challenge', 'user')
		ordering = ['-points', '-active_days', '-recorded_workouts', 'manual_logs', 'completed_at']
		indexes = [
			models.Index(fields=['challenge', 'points']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.user_id}: {self.points} pts'


class ContactSyncInvite(models.Model):
	"""Stores invite targets discovered during contact sync/search.

	We keep only a normalized identifier so admins can inspect invite intent
	without requiring device contact-book storage in the app.
	"""

	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		related_name='community_invites',
		on_delete=models.CASCADE,
	)
	identifier = models.CharField(max_length=255)
	source = models.CharField(max_length=32, default='contacts')
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('user', 'identifier')
		ordering = ['-created_at']

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.user_id}: {self.identifier}'


class GroupAnnouncement(models.Model):
	TYPE_CHOICES = [
		('workout_event', 'Workout event'),
		('challenge_update', 'Challenge update'),
		('milestone', 'Milestone'),
		('celebration', 'Celebration'),
		('admin_note', 'Admin note'),
	]

	group = models.ForeignKey(CommunityGroup, related_name='announcements', on_delete=models.CASCADE)
	created_by = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='group_announcements', on_delete=models.CASCADE)
	announcement_type = models.CharField(max_length=32, choices=TYPE_CHOICES, default='admin_note')
	title = models.CharField(max_length=180)
	body = models.CharField(max_length=700, blank=True)
	is_pinned = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-is_pinned', '-created_at']
		indexes = [
			models.Index(fields=['group', 'is_pinned', 'created_at']),
		]
