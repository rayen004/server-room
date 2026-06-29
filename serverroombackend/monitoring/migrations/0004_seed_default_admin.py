from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db import migrations


def seed_default_admin(apps, schema_editor):
    app_label, model_name = settings.AUTH_USER_MODEL.split(".")
    User = apps.get_model(app_label, model_name)
    UserApproval = apps.get_model("monitoring", "UserApproval")

    admin_user, created = User.objects.get_or_create(
        username="admin",
        defaults={
            "email": "admin@example.com",
            "first_name": "Admin",
            "is_staff": True,
            "is_superuser": True,
        },
    )

    if created:
        admin_user.password = make_password("admin123")
        admin_user.save(update_fields=["password"])
    else:
        fields_to_update = []

        if admin_user.email != "admin@example.com":
            admin_user.email = "admin@example.com"
            fields_to_update.append("email")

        if admin_user.first_name != "Admin":
            admin_user.first_name = "Admin"
            fields_to_update.append("first_name")

        if not admin_user.is_staff:
            admin_user.is_staff = True
            fields_to_update.append("is_staff")

        if not admin_user.is_superuser:
            admin_user.is_superuser = True
            fields_to_update.append("is_superuser")

        if fields_to_update:
            admin_user.save(update_fields=fields_to_update)

    UserApproval.objects.update_or_create(
        user=admin_user,
        defaults={"status": "approved"},
    )


class Migration(migrations.Migration):
    dependencies = [
        ("monitoring", "0003_userapproval_status"),
    ]

    operations = [
        migrations.RunPython(seed_default_admin, migrations.RunPython.noop),
    ]
