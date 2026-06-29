from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("monitoring", "0004_seed_default_admin"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("user_name", models.CharField(max_length=255)),
                ("user_email", models.EmailField(max_length=254)),
                ("login_time", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("logout_time", models.DateTimeField(blank=True, null=True)),
                ("duration", models.DurationField(blank=True, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[("active", "Active"), ("closed", "Closed")],
                        db_index=True,
                        default="active",
                        max_length=16,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "User session",
                "verbose_name_plural": "User sessions",
                "ordering": ["-login_time"],
            },
        ),
    ]
