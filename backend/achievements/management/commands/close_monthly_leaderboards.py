from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from achievements.services import close_leaderboard_period


class Command(BaseCommand):
	help = 'Close and archive the previous monthly leaderboard.'

	def handle(self, *args, **options):
		first_this_month = timezone.localdate().replace(day=1)
		end = first_this_month - timedelta(days=1)
		start = end.replace(day=1)
		period = close_leaderboard_period('monthly', start, end)
		self.stdout.write(self.style.SUCCESS(f'Closed monthly leaderboard {period.period_key}'))
