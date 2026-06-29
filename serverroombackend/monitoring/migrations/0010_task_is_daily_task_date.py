from django.db import migrations, models
import django.utils.timezone


def backfill_task_date(apps, schema_editor):
    Task = apps.get_model("monitoring", "Task")
    for task in Task.objects.all().iterator():
        task.date = task.due_date
        task.save(update_fields=["date"])


class Migration(migrations.Migration):

    dependencies = [
        ("monitoring", "0009_alertevent"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="date",
            field=models.DateField(db_index=True, default=django.utils.timezone.localdate),
        ),
        migrations.AddField(
            model_name="task",
            name="is_daily",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.RunPython(backfill_task_date, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="task",
            constraint=models.UniqueConstraint(
                condition=models.Q(is_daily=True),
                fields=("user", "title", "date"),
                name="unique_daily_task_per_user_title_date",
            ),
        ),
    ]
