from __future__ import annotations

from django.utils import timezone

from .models import Task

DEFAULT_DAILY_TASKS = [
    "Check temperature and humidity levels",
    "Verify proper functioning of cooling systems",
    "Monitor server status on dashboard",
    "Inspect physical connections and cables",
    "Ensure no unauthorized access to server room",
    "Scan RFID access logs",
    "Clean and organize server racks (if needed)",
    "Report anomalies or alerts to admin",
    "Verify power supply and backup systems",
    "Update task status in dashboard",
]


def generate_daily_tasks_for_date(target_date=None) -> int:
    target_date = target_date or timezone.localdate()
    created_count = 0

    for title in DEFAULT_DAILY_TASKS:
        _, created = Task.objects.get_or_create(
            title=title,
            date=target_date,
            is_daily=True,
            defaults={
                "description": title,
                "status": Task.Status.TODO,
                "priority": Task.Priority.MEDIUM,
                "due_date": target_date,
                "is_completed": False,
                "user": None,
            },
        )
        if created:
            created_count += 1

    return created_count
