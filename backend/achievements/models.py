from django.conf import settings
from django.db import models


class Badge(models.Model):
	CATEGORY_CHOICES = [
		('consistency', 'Consistency'),
		('pr', 'PR'),
		('challenge', 'Challenge'),
		('leaderboard', 'Leaderboard'),
		('monthly', 'Monthly'),
		('plan', 'Plan completion'),
		('group', 'Group'),
		('body_focus', 'Body focus'),
		('comeback', 'Comeback'),
		('special_event', 'Special event'),
	]
	TIER_CHOICES = [
		('bronze', 'Bronze'),
		('silver', 'Silver'),
		('gold', 'Gold'),
		('platinum', 'Platinum'),
		('elite', 'Elite'),
	]
	RARITY_CHOICES = [
		('common', 'Common'),
		('rare', 'Rare'),
		('elite', 'Elite'),
		('legendary', 'Legendary'),
	]

	id = models.SlugField(primary_key=True, max_length=96)
	name = models.CharField(max_length=160)
	description = models.CharField(max_length=500)
	category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
	tier = models.CharField(max_length=24, choices=TIER_CHOICES, default='bronze')
	icon = models.CharField(max_length=64, blank=True)
	rarity = models.CharField(max_length=24, choices=RARITY_CHOICES, default='common')
	unlock_description = models.CharField(max_length=500, blank=True)
	is_repeatable = models.BooleanField(default=False)
	is_periodic = models.BooleanField(default=False)
	display_priority = models.PositiveIntegerField(default=100)
	shareable_card_enabled = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['display_priority', 'name']

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return self.name


class BadgeRule(models.Model):
	TRIGGER_CHOICES = [
		('workout_saved', 'Workout saved'),
		('challenge_completed', 'Challenge completed'),
		('plan_completed', 'Plan completed'),
		('weekly_period_closed', 'Weekly period closed'),
		('monthly_period_closed', 'Monthly period closed'),
		('quarterly_period_closed', 'Quarterly period closed'),
		('group_event', 'Group event'),
		('pr_detected', 'PR detected'),
	]

	badge = models.ForeignKey(Badge, related_name='rules', on_delete=models.CASCADE)
	trigger_type = models.CharField(max_length=40, choices=TRIGGER_CHOICES)
	condition_type = models.CharField(max_length=80)
	threshold = models.FloatField(default=1)
	period = models.CharField(max_length=32, blank=True)
	metadata = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		indexes = [
			models.Index(fields=['trigger_type', 'condition_type']),
			models.Index(fields=['badge', 'trigger_type']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.badge_id}: {self.trigger_type}/{self.condition_type}'


class UserBadge(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='user_badges', on_delete=models.CASCADE)
	badge = models.ForeignKey(Badge, related_name='earned_rows', on_delete=models.CASCADE)
	earned_at = models.DateTimeField(auto_now_add=True)
	source_type = models.CharField(max_length=40, blank=True)
	source_id = models.CharField(max_length=128, blank=True)
	period_key = models.CharField(max_length=80, blank=True)
	metadata = models.JSONField(default=dict, blank=True)

	class Meta:
		ordering = ['-earned_at', '-id']
		unique_together = ('user', 'badge', 'period_key')
		indexes = [
			models.Index(fields=['user', 'earned_at']),
			models.Index(fields=['badge', 'earned_at']),
			models.Index(fields=['period_key']),
		]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.user_id}: {self.badge_id}'


class UserLevel(models.Model):
	user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name='achievement_level', on_delete=models.CASCADE)
	career_xp = models.PositiveIntegerField(default=0)
	current_level = models.PositiveSmallIntegerField(default=1)
	current_title = models.CharField(max_length=32, default='Rookie')
	current_level_xp = models.PositiveIntegerField(default=0)
	next_level_xp = models.PositiveIntegerField(default=1000)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.user_id}: {self.current_title} L{self.current_level}'


class CategoryLevel(models.Model):
	CATEGORY_CHOICES = [
		('strength', 'Strength'),
		('cardio', 'Cardio'),
		('conditioning', 'Conditioning'),
		('mobility', 'Mobility'),
		('sport', 'Sport'),
		('consistency', 'Consistency'),
	]

	user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='category_levels', on_delete=models.CASCADE)
	category = models.CharField(max_length=32, choices=CATEGORY_CHOICES)
	xp = models.PositiveIntegerField(default=0)
	tier = models.CharField(max_length=24, default='bronze')
	next_tier_xp = models.PositiveIntegerField(default=1500)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('user', 'category')
		ordering = ['category']


class LeaderboardPeriod(models.Model):
	TYPE_CHOICES = [
		('weekly', 'Weekly'),
		('monthly', 'Monthly'),
		('quarterly', 'Quarterly'),
	]
	STATUS_CHOICES = [
		('open', 'Open'),
		('closed', 'Closed'),
		('archived', 'Archived'),
	]

	type = models.CharField(max_length=16, choices=TYPE_CHOICES)
	period_key = models.CharField(max_length=32)
	start_date = models.DateField()
	end_date = models.DateField()
	status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='closed')
	closed_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ('type', 'period_key')
		ordering = ['-start_date', 'type']
		indexes = [models.Index(fields=['type', 'status', 'start_date'])]

	def __str__(self) -> str:  # pragma: no cover - admin convenience
		return f'{self.type} {self.period_key}'


class LeaderboardResult(models.Model):
	period = models.ForeignKey(LeaderboardPeriod, related_name='results', on_delete=models.CASCADE)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='leaderboard_results', on_delete=models.CASCADE)
	rank = models.PositiveIntegerField()
	score = models.FloatField(default=0)
	percentile = models.FloatField(default=0)
	awarded_badges = models.JSONField(default=list, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = ('period', 'user')
		ordering = ['rank', '-score']
		indexes = [
			models.Index(fields=['period', 'rank']),
			models.Index(fields=['user', 'rank']),
		]


class AchievementEvent(models.Model):
	EVENT_CHOICES = [
		('badge_earned', 'Badge earned'),
		('level_up', 'Level up'),
		('rank_moved', 'Rank moved'),
		('challenge_almost_complete', 'Challenge almost complete'),
		('group_goal_close', 'Group goal close'),
		('monthly_badge_near_unlock', 'Monthly badge near unlock'),
		('weekly_top_10_opportunity', 'Weekly top 10 opportunity'),
		('plan_completion_milestone', 'Plan completion milestone'),
	]

	user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='achievement_events', on_delete=models.CASCADE)
	event_type = models.CharField(max_length=48, choices=EVENT_CHOICES)
	title = models.CharField(max_length=180)
	body = models.CharField(max_length=500, blank=True)
	source_type = models.CharField(max_length=40, blank=True)
	source_id = models.CharField(max_length=128, blank=True)
	metadata = models.JSONField(default=dict, blank=True)
	is_read = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at', '-id']
		indexes = [
			models.Index(fields=['user', 'event_type', 'created_at']),
			models.Index(fields=['user', 'is_read']),
		]


class FeaturedBadge(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='featured_badges', on_delete=models.CASCADE)
	user_badge = models.ForeignKey(UserBadge, related_name='featured_rows', on_delete=models.CASCADE)
	slot = models.PositiveSmallIntegerField()
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		unique_together = [
			('user', 'slot'),
			('user', 'user_badge'),
		]
		ordering = ['slot']
