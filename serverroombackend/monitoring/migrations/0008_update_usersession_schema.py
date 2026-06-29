from django.db import migrations, models


def normalize_session_statuses(apps, schema_editor):
    UserSession = apps.get_model("monitoring", "UserSession")
    UserSession.objects.filter(status="active").update(status="ACTIVE")
    UserSession.objects.filter(status="closed").update(status="CLOSED")


class Migration(migrations.Migration):
    dependencies = [
        ("monitoring", "0007_task"),
    ]

    operations = [
        migrations.RunPython(normalize_session_statuses, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="usersession",
            name="duration",
        ),
        migrations.RemoveField(
            model_name="usersession",
            name="user_email",
        ),
        migrations.RemoveField(
            model_name="usersession",
            name="user_name",
        ),
        migrations.AlterField(
            model_name="usersession",
            name="status",
            field=models.CharField(
                choices=[("ACTIVE", "Active"), ("CLOSED", "Closed")],
                db_index=True,
                default="ACTIVE",
                max_length=16,
            ),
        ),
    ]
