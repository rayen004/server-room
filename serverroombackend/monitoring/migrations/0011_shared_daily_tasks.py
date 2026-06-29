from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def consolidate_daily_tasks(apps, schema_editor):
    Task = apps.get_model("monitoring", "Task")

    seen = set()
    daily_tasks = (
        Task.objects.filter(is_daily=True)
        .order_by("date", "title", "created_at", "id")
    )

    for task in daily_tasks.iterator():
        key = (task.title, task.date)
        if key in seen:
            task.delete()
            continue

        seen.add(key)
        task.user_id = None
        task.is_completed = task.status == "Completed"
        task.save(update_fields=["user", "is_completed"])


class Migration(migrations.Migration):

    dependencies = [
        ("monitoring", "0010_task_is_daily_task_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="is_completed",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.AlterField(
            model_name="task",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="tasks",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RemoveConstraint(
            model_name="task",
            name="unique_daily_task_per_user_title_date",
        ),
        migrations.RunPython(consolidate_daily_tasks, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="task",
            constraint=models.UniqueConstraint(
                condition=models.Q(is_daily=True),
                fields=("title", "date"),
                name="unique_daily_task_per_title_date",
            ),
        ),
    ]
