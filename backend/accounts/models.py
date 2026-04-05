from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from plans.models import Plan


User = get_user_model()


class Profile(models.Model):
	"""User profile fields used by the Account screen."""

	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
	display_name = models.CharField(max_length=255, blank=True)
	height_cm = models.FloatField(null=True, blank=True)
	weight_kg = models.FloatField(null=True, blank=True)
	waist_cm = models.FloatField(null=True, blank=True)
	gender = models.CharField(
		max_length=16,
		choices=[('male', 'Male'), ('female', 'Female')],
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
