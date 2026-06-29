from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("monitoring", "0014_rfid_user_log"),
    ]

    operations = [
        migrations.AddField(
            model_name="sensordata",
            name="power",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=7),
        ),
    ]
