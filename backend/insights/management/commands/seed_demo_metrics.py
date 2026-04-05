import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Profile
from exercises.models import Exercise
from insights.models import FitnessAssessment, RaceBenchmark
from plans.models import Plan, UserPlan
from workouts.models import SessionExercise, WorkoutSession


class Command(BaseCommand):
	"""Seed random-but-plausible metric data for all existing users.

	This command is intended for local/dev environments so that the dashboard
	metrics have realistic data to work with while you build the frontend.

	For each user it will:
	- Ensure Profile fields needed for metrics are filled in (if blank).
	- Attach the single available Plan via a UserPlan (active).
	- Create one FitnessAssessment snapshot (Metric 1 & 3 inputs) if missing.
	- Create one RaceBenchmark tied to the UserPlan if missing.
	- Create several completed WorkoutSessions + SessionExercises so that
	  Streak, Total Time, and Body Battle Map have underlying data.
	"""

	help = "Seed random metrics data for all users (dev/demo only)."

	def handle(self, *args, **options):
		User = get_user_model()
		users = list(User.objects.all())
		plan = Plan.objects.first()
		exercises = list(Exercise.objects.all())

		if not users:
			self.stdout.write(self.style.WARNING("No users found; nothing to seed."))
			return

		if not plan:
			self.stdout.write(
				self.style.WARNING(
					"No Plan found. Create at least one Plan before seeding metrics."
				)
			)
			return

		if not exercises:
			self.stdout.write(
				self.style.WARNING(
					"No Exercises found. Run exercise seed migrations before seeding metrics."
				)
			)
			return

		now = timezone.now()
		self.stdout.write(
			self.style.SUCCESS(
				f"Seeding metrics for {len(users)} user(s) using plan '{plan.id}'."
			)
		)

		for user in users:
			self._seed_for_user(user, plan, exercises, now)

		self.stdout.write(self.style.SUCCESS("Done seeding demo metrics."))

	def _seed_for_user(self, user, plan, exercises, now):
		profile, _ = Profile.objects.get_or_create(user=user)
		updated_profile = False

		# Fill in missing profile fields with plausible demo values
		if not profile.gender:
			profile.gender = random.choice(["male", "female"])
			updated_profile = True

		if profile.height_cm is None:
			profile.height_cm = random.uniform(160, 190)
			updated_profile = True

		if profile.weight_kg is None:
			profile.weight_kg = random.uniform(55, 95)
			updated_profile = True

		if profile.waist_cm is None:
			profile.waist_cm = random.uniform(70, 100)
			updated_profile = True

		if profile.active_plan is None:
			profile.active_plan = plan
			updated_profile = True

		if updated_profile:
			profile.save()

		# Attach or get UserPlan for this plan
		started_at_default = now - timedelta(days=random.randint(3, 14))
		user_plan, created = UserPlan.objects.get_or_create(
			user=user,
			plan=plan,
			defaults={
				"is_active": True,
				"status": "active",
				"started_at": started_at_default,
				"expected_end_at": started_at_default
				+ timedelta(weeks=plan.duration_weeks),
			},
		)

		# Metric 1 & 3: FitnessAssessment snapshot (only if none exists yet)
		if not FitnessAssessment.objects.filter(user=user).exists():
			age_years = 30
			if profile.date_of_birth:
				# Approximate age from DOB
				age_years = max(16, now.year - profile.date_of_birth.year)
			else:
				age_years = random.randint(22, 45)

			FitnessAssessment.objects.create(
				user=user,
				age_years=age_years,
				gender=profile.gender or random.choice(["male", "female"]),
				height_cm=profile.height_cm,
				weight_kg=profile.weight_kg,
				waist_cm=profile.waist_cm,
				resting_heart_rate=random.randint(55, 80),
				max_pushups=random.randint(10, 40),
				max_run_minutes=random.randint(15, 40),
				can_touch_toes=random.choice(["yes", "almost", "no"]),
				sleep_hours=round(random.uniform(6.0, 8.5), 1),
				source="seed_demo",
			)

		# Metric 2: RaceBenchmark baseline (only if none exists yet for this plan)
		if not RaceBenchmark.objects.filter(user=user, plan=plan, user_plan=user_plan).exists():
			RaceBenchmark.objects.create(
				user=user,
				plan=plan,
				user_plan=user_plan,
				run_1km_seconds=random.randint(240, 420),
				wall_balls_unbroken=random.randint(15, 60),
				sled_difficulty=random.randint(2, 5),
				energy_level=random.randint(2, 5),
				is_initial=True,
				notes="Seeded demo benchmark",
			)

		# Metrics 2, 4, 5, 6: WorkoutSessions + SessionExercises
		# Avoid duplicating demo sessions if we've already seeded them once.
		if WorkoutSession.objects.filter(
			user=user, plan=plan, metadata__seeded_demo=True
		).exists():
			return

		completed_count = 0
		# Spread sessions over the last ~10 days to create a realistic streak pattern
		day_offsets = sorted(random.sample(range(1, 11), k=5))
		for day_offset in day_offsets:
			start = now - timedelta(days=day_offset, hours=random.randint(0, 2))
			duration = random.randint(25, 70)
			completed = start + timedelta(minutes=duration)

			session = WorkoutSession.objects.create(
				user=user,
				plan=plan,
				user_plan=user_plan,
				status="completed",
			)
			# Override auto_now_add timestamps with our backdated values
			WorkoutSession.objects.filter(pk=session.pk).update(
				started_at=start,
				completed_at=completed,
				duration_minutes=duration,
				metadata={"seeded_demo": True},
			)
			session.refresh_from_db()
			completed_count += 1

			# Attach a few random exercises to this session
			k = min(4, len(exercises))
			for ex in random.sample(exercises, k=k):
				SessionExercise.objects.create(
					session=session,
					exercise=ex,
					sets_prescribed=random.randint(2, 4),
					reps_prescribed=random.randint(8, 15),
					is_completed=True,
					completed_at=completed,
				)

		# Update cached sessions_completed on the UserPlan
		user_plan.sessions_completed = (
			user_plan.sessions_completed + completed_count
			if user_plan.sessions_completed
			else completed_count
		)
		user_plan.save(update_fields=["sessions_completed", "updated_at"])
