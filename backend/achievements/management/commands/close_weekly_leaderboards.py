from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from achievements.services import close_leaderboard_period


class Command(BaseCommand):
	help = 'Close and archive the previous weekly leaderboard.'

	def handle(self, *args, **options):
		today = timezone.localdate()
		this_week_start = today - timedelta(days=today.weekday())
		start = this_week_start - timedelta(days=7)
		end = this_week_start - timedelta(days=1)
		period = close_leaderboard_period('weekly', start, end)
		self.stdout.write(self.style.SUCCESS(f'Closed weekly leaderboard {period.period_key}'))
