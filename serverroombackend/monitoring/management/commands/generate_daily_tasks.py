from django.core.management.base import BaseCommand
from django.utils import timezone

from monitoring.daily_tasks import generate_daily_tasks_for_date


class Command(BaseCommand):
    help = "Generate the default shared daily server room checklist for today."

    def handle(self, *args, **options):
        target_date = timezone.localdate()
        created_count = generate_daily_tasks_for_date(target_date)
        self.stdout.write(
            self.style.SUCCESS(
                f"Generated {created_count} daily tasks for {target_date.isoformat()}."
            )
        )
