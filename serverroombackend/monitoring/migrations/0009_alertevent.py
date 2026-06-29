from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("monitoring", "0008_update_usersession_schema"),
    ]

    operations = [
        migrations.CreateModel(
            name="AlertEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("alert_type", models.CharField(choices=[("TEMPERATURE", "Temperature"), ("HUMIDITY", "Humidity")], db_index=True, max_length=32)),
                ("message", models.TextField()),
                ("temperature", models.DecimalField(decimal_places=2, max_digits=5)),
                ("humidity", models.DecimalField(decimal_places=2, max_digits=5)),
                ("threshold", models.DecimalField(decimal_places=2, max_digits=5)),
                ("email_sent", models.BooleanField(default=False)),
                ("sms_sent", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("sensor_data", models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name="alerts", to="monitoring.sensordata")),
            ],
            options={
                "verbose_name": "Alert event",
                "verbose_name_plural": "Alert events",
                "ordering": ["-created_at"],
            },
        ),
    ]
