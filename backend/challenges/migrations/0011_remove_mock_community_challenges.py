from django.db import migrations


MOCK_COMMUNITY_CHALLENGE_NAMES = [
    "Leg Day League",
    "Push Week",
    "Morning Club",
    "Office Pull Ladder",
]


def remove_mock_community_challenges(apps, schema_editor):
    TrainingChallenge = apps.get_model("challenges", "TrainingChallenge")
    TrainingChallenge.objects.filter(
        name__in=MOCK_COMMUNITY_CHALLENGE_NAMES,
        visibility="community",
        created_by__isnull=True,
        group__isnull=True,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("challenges", "0010_trainingchallenge_userchallengeenrollment_and_more"),
    ]

    operations = [
        migrations.RunPython(remove_mock_community_challenges, migrations.RunPython.noop),
    ]
