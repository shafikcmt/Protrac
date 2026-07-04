import re

from django.db import migrations

# Defect names follow a "<code>-<label>" convention from the paper QC register,
# e.g. "A-SKIP STC", "Aa-INSECURE". Only a short alphabetic prefix is treated as
# a code so junk rows (tracking codes, ".p", free-text entries) get an empty code.
_CODE_RE = re.compile(r"^([A-Za-z]{1,3})-")


def backfill_code(apps, schema_editor):
    Defect = apps.get_model("tracking", "Defect")
    for defect in Defect.objects.all():
        if defect.code:
            continue
        match = _CODE_RE.match(defect.name or "")
        if match:
            defect.code = match.group(1)
            defect.save(update_fields=["code"])


def clear_code(apps, schema_editor):
    Defect = apps.get_model("tracking", "Defect")
    Defect.objects.update(code="")


class Migration(migrations.Migration):

    dependencies = [
        ("tracking", "0009_alter_defect_options_defect_code"),
    ]

    operations = [
        migrations.RunPython(backfill_code, clear_code),
    ]
