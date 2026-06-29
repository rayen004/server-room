from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def create_user_approvals(apps, schema_editor):
    User = apps.get_model(settings.AUTH_USER_MODEL.split(".")[0], settings.AUTH_USER_MODEL.split(".")[1])
    UserApproval = apps.get_model("monitoring", "UserApproval")

    for user in User.objects.all():
        UserApproval.objects.get_or_create(
            user=user,
            defaults={"is_approved": user.is_staff or user.is_superuser},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("monitoring", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserApproval",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("is_approved", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="approval",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "User approval",
                "verbose_name_plural": "User approvals",
            },
        ),
        migrations.RunPython(create_user_approvals, migrations.RunPython.noop),
    ]
