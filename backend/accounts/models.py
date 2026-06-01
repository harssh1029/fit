from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from plans.models import Plan


User = get_user_model()


class Profile(models.Model):
	"""User profile fields used by the Account screen."""

	GENDER_CHOICES = [
		('male', 'Male'),
		('female', 'Female'),
		('other', 'Other'),
		('prefer_not_to_say', 'Prefer not to say'),
	]
	FITNESS_LEVEL_CHOICES = [
		('beginner', 'Beginner'),
		('consistent', 'Consistent'),
		('advanced', 'Advanced'),
	]

	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
	display_name = models.CharField(max_length=255, blank=True)
	avatar_url = models.URLField(blank=True)
	height_cm = models.FloatField(null=True, blank=True)
	weight_kg = models.FloatField(null=True, blank=True)
	waist_cm = models.FloatField(null=True, blank=True)
	gender = models.CharField(
		max_length=24,
		choices=GENDER_CHOICES,
		blank=True,
	)
	date_of_birth = models.DateField(null=True, blank=True)
	timezone = models.CharField(max_length=64, default='UTC')
	active_plan = models.ForeignKey(
		Plan,
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name='profiles',
		help_text='Currently active training plan for this user.',
	)
	personal_bests = models.JSONField(
		default=dict,
		blank=True,
		help_text='Personal best records for exercises. Format: {exerciseId: {weight, sets, reps, date}}',
	)
	fitness_level = models.CharField(
		max_length=24,
		choices=FITNESS_LEVEL_CHOICES,
		blank=True,
		help_text='Self-reported onboarding fitness level.',
	)
	fitness_goals = models.JSONField(default=list, blank=True)
	training_preferences = models.JSONField(default=dict, blank=True)
	training_restrictions = models.JSONField(default=dict, blank=True)
	onboarding_answers = models.JSONField(default=dict, blank=True)
	onboarding_version = models.PositiveSmallIntegerField(default=0)
	onboarding_completed_at = models.DateTimeField(null=True, blank=True)

	def __str__(self) -> str:  # pragma: no cover - trivial
		return self.display_name or self.user.get_username()


@receiver(post_save, sender=User)
def create_or_update_profile(sender, instance: User, created: bool, **kwargs):
	"""Ensure every user has a Profile row.

	For a brand-new project this is sufficient; if we ever import existing
	users, we can backfill profiles via a management command.
	"""
	if created:
		Profile.objects.create(user=instance)
	else:
		# If a profile does not exist for some reason, create it on the fly.
		Profile.objects.get_or_create(user=instance)
