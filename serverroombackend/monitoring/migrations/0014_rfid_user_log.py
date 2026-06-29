from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("monitoring", "0013_taskcompletion_date"),
    ]

    operations = [
        migrations.CreateModel(
            name="RFIDUser",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("uid", models.CharField(db_index=True, max_length=32, unique=True)),
                ("username", models.CharField(max_length=150)),
                ("role", models.CharField(choices=[("admin", "Admin"), ("user", "User")], max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "verbose_name": "RFID user",
                "verbose_name_plural": "RFID users",
                "ordering": ["username", "uid"],
            },
        ),
        migrations.CreateModel(
            name="RFIDLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("uid", models.CharField(db_index=True, max_length=32)),
                ("role", models.CharField(blank=True, max_length=16)),
                ("status", models.CharField(choices=[("authorized", "Authorized"), ("denied", "Denied")], db_index=True, max_length=16)),
                ("timestamp", models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                "verbose_name": "RFID log",
                "verbose_name_plural": "RFID logs",
                "ordering": ["-timestamp"],
            },
        ),
    ]
