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


class CommunityActivity(models.Model):
	"""Public activity item visible to friends."""

	ACTIVITY_WORKOUT = 'workout'
	ACTIVITY_CHALLENGE = 'challenge'
	ACTIVITY_PLAN = 'plan'
	ACTIVITY_TEST = 'test'
	ACTIVITY_CHOICES = [
		(ACTIVITY_WORKOUT, 'Workout'),
		(ACTIVITY_CHALLENGE, 'Challenge'),
		(ACTIVITY_PLAN, 'Plan'),
		(ACTIVITY_TEST, 'Fitness test'),
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
