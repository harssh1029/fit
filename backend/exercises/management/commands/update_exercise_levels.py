from django.core.management.base import BaseCommand

from exercises.models import Exercise


class Command(BaseCommand):
    help = "Update Exercise.level based on curated mapping."

    def handle(self, *args, **options):
        mapping = {
            "exdb_0001": "beginner",
            "exdb_0002": "beginner",
            "chest_press_barbell_flat": "intermediate",
            "exdb_0003": "beginner",
            "exdb_0006": "beginner",
            "exdb_0007": "beginner",
            "exdb_0009": "beginner",
            "exdb_0011": "beginner",
            "exdb_0010": "intermediate",
            "exdb_0012": "intermediate",
            "exdb_0013": "beginner",
            "exdb_0014": "beginner",
            "exdb_0015": "beginner",
            "exdb_0016": "beginner",
            "exdb_0017": "beginner",
            "exdb_0018": "beginner",
            "exdb_0019": "beginner",
            "exdb_0020": "intermediate",
            "exdb_0023": "intermediate",
            "exdb_0024": "intermediate",
            "exdb_0025": "intermediate",
            "exdb_0026": "intermediate",
            "exdb_0027": "intermediate",
            "exdb_0028": "advanced",
            "exdb_0029": "advanced",
            "exdb_0030": "intermediate",
            "exdb_0031": "beginner",
            "exdb_0032": "intermediate",
            "exdb_0033": "intermediate",
            "exdb_0034": "intermediate",
            "exdb_0035": "advanced",
            "exdb_0036": "intermediate",
            "exdb_0037": "intermediate",
            "exdb_0038": "intermediate",
            "exdb_0039": "intermediate",
            "exdb_0041": "beginner",
            "exdb_0040": "intermediate",
            "exdb_0042": "intermediate",
            "exdb_0043": "intermediate",
            "exdb_0045": "advanced",
            "exdb_0047": "intermediate",
            "exdb_0048": "advanced",
            "exdb_0049": "intermediate",
            "exdb_0050": "intermediate",
            "exdb_0052": "advanced",
            "exdb_0055": "intermediate",
            "exdb_0064": "intermediate",
            "exdb_0067": "advanced",
            "exdb_0071": "intermediate",
            "exdb_0073": "intermediate",
            "exdb_0022": "advanced",
            "exdb_0075": "intermediate",
            "exdb_0076": "intermediate",
            "exdb_0082": "beginner",
            "exdb_0079": "beginner",
            "exdb_0086": "advanced",
            "exdb_0087": "advanced",
            "exdb_0088": "beginner",
            "exdb_0091": "intermediate",
            "exdb_0100": "advanced",
            "exdb_0104": "beginner",
            "exdb_0105": "advanced",
            "exdb_0107": "intermediate",
            "exdb_0108": "beginner",
            "exdb_0111": "intermediate",
            "exdb_0122": "intermediate",
            "exdb_0126": "beginner",
            "exdb_0125": "beginner",
            "exdb_1160": "intermediate",
            "exdb_0151": "intermediate",
            "exdb_0210": "beginner",
            "exdb_0224": "beginner",
            "exdb_0247": "beginner",
            "exdb_0257": "beginner",
            "exdb_0284": "beginner",
            "exdb_1201": "advanced",
            "exdb_0347": "beginner",
            "exdb_0349": "beginner",
            "exdb_0400": "beginner",
            "exdb_0409": "beginner",
            "exdb_0417": "beginner",
            "exdb_0501": "advanced",
            "exdb_0594": "beginner",
            "exdb_0605": "beginner",
            "exdb_0630": "intermediate",
            "exdb_1403": "beginner",
            "exdb_0685": "beginner",
            "exdb_0684": "beginner",
            "exdb_0716": "beginner",
            "exdb_2138": "intermediate",
            "exdb_0798": "beginner",
            "exdb_2141": "beginner",
            "exdb_2311": "beginner",
        }

        updated = 0
        missing = []

        for ex_id, level in mapping.items():
            try:
                ex = Exercise.objects.get(pk=ex_id)
            except Exercise.DoesNotExist:
                missing.append(ex_id)
                continue

            if ex.level != level:
                ex.level = level
                ex.save(update_fields=["level"])
                updated += 1

        self.stdout.write(self.style.SUCCESS(f"Updated {updated} exercises."))
        if missing:
            self.stdout.write(self.style.WARNING(f"Missing IDs: {', '.join(missing)}"))

