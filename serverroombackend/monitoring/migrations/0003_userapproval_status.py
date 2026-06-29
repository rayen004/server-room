from django.conf import settings
from django.db import migrations, models


def migrate_approval_status(apps, schema_editor):
    User = apps.get_model(
        settings.AUTH_USER_MODEL.split(".")[0],
        settings.AUTH_USER_MODEL.split(".")[1],
    )
    UserApproval = apps.get_model("monitoring", "UserApproval")

    for approval in UserApproval.objects.select_related("user"):
        approval.status = "approved" if approval.is_approved else "pending"
        approval.save(update_fields=["status"])

    for user in User.objects.all():
        UserApproval.objects.get_or_create(
            user=user,
            defaults={
                "status": "approved" if user.is_staff or user.is_superuser else "pending",
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("monitoring", "0002_userapproval"),
    ]

    operations = [
        migrations.AddField(
            model_name="userapproval",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("approved", "Approved"),
                    ("rejected", "Rejected"),
                ],
                default="pending",
                max_length=16,
            ),
        ),
        migrations.RunPython(migrate_approval_status, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="userapproval",
            name="is_approved",
        ),
    ]
