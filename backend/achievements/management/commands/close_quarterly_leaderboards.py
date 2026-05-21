from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from achievements.services import close_leaderboard_period


class Command(BaseCommand):
	help = 'Close and archive the previous quarterly leaderboard.'

	def handle(self, *args, **options):
		today = timezone.localdate()
		current_quarter = (today.month - 1) // 3 + 1
		if current_quarter == 1:
			year = today.year - 1
			quarter = 4
		else:
			year = today.year
			quarter = current_quarter - 1
		start_month = (quarter - 1) * 3 + 1
		start = date(year, start_month, 1)
		if quarter == 4:
			next_start = date(year + 1, 1, 1)
		else:
			next_start = date(year, start_month + 3, 1)
		end = next_start - timedelta(days=1)
		period = close_leaderboard_period('quarterly', start, end)
		self.stdout.write(self.style.SUCCESS(f'Closed quarterly leaderboard {period.period_key}'))
