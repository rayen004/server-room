from django.db import migrations, models
import django.utils.timezone


def backfill_completion_dates(apps, schema_editor):
    TaskCompletion = apps.get_model("monitoring", "TaskCompletion")
    for completion in TaskCompletion.objects.select_related("task").all().iterator():
        completion.date = completion.task.date
        completion.save(update_fields=["date"])


class Migration(migrations.Migration):

    dependencies = [
        ("monitoring", "0012_taskcompletion"),
    ]

    operations = [
        migrations.AddField(
            model_name="taskcompletion",
            name="date",
            field=models.DateField(db_index=True, default=django.utils.timezone.localdate),
        ),
        migrations.RemoveConstraint(
            model_name="taskcompletion",
            name="unique_task_completion_per_user_task",
        ),
        migrations.RunPython(backfill_completion_dates, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="taskcompletion",
            constraint=models.UniqueConstraint(
                fields=("user", "task", "date"),
                name="unique_task_completion_per_user_task_date",
            ),
        ),
    ]
