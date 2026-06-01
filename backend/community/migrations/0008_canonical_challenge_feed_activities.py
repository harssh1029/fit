from django.db import migrations


def canonicalize_challenge_feed_activities(apps, schema_editor):
	CommunityActivity = apps.get_model("community", "CommunityActivity")
	UserBadge = apps.get_model("achievements", "UserBadge")
	UserChallengeCompletion = apps.get_model("challenges", "UserChallengeCompletion")

	for completion in UserChallengeCompletion.objects.select_related("challenge").iterator():
		card = completion.challenge.card if isinstance(completion.challenge.card, dict) else {}
		challenge_name = card.get("name") or completion.challenge_id
		source_id = f"challenge:{completion.challenge_id}"
		activities = CommunityActivity.objects.filter(
			user_id=completion.user_id,
			activity_type="challenge",
			metadata__source_id=source_id,
		).order_by("-occurred_at", "-id")
		activity = activities.first()
		metadata = {
			**(activity.metadata if activity and isinstance(activity.metadata, dict) else {}),
			"source_id": source_id,
			"event_type": "challenge_completed",
			"challenge_id": completion.challenge_id,
			"challenge_name": challenge_name,
		}
		if activity is None:
			CommunityActivity.objects.create(
				user_id=completion.user_id,
				activity_type="challenge",
				title=f"Completed {challenge_name}",
				description="Challenge completed",
				metadata=metadata,
				occurred_at=completion.completed_at,
			)
			continue
		activity.title = f"Completed {challenge_name}"
		activity.description = "Challenge completed"
		activity.metadata = metadata
		activity.occurred_at = completion.completed_at
		activity.save(update_fields=["title", "description", "metadata", "occurred_at"])
		activities.exclude(id=activity.id).delete()

	challenge_badge_ids = UserBadge.objects.filter(source_type="challenge").values_list("id", flat=True)
	for user_badge_id in challenge_badge_ids.iterator():
		CommunityActivity.objects.filter(
			activity_type="badge",
			metadata__source_id=f"badge:{user_badge_id}",
		).delete()

	seen_sources = set()
	for activity in CommunityActivity.objects.filter(activity_type="challenge").order_by("-occurred_at", "-id").iterator():
		metadata = activity.metadata if isinstance(activity.metadata, dict) else {}
		source_id = metadata.get("source_id")
		if not source_id:
			continue
		key = (activity.user_id, source_id)
		if key in seen_sources:
			activity.delete()
			continue
		seen_sources.add(key)


class Migration(migrations.Migration):
	dependencies = [
		("achievements", "0001_initial"),
		("challenges", "0011_remove_mock_community_challenges"),
		("community", "0007_userpubliccard_avatar_url"),
	]

	operations = [
		migrations.RunPython(canonicalize_challenge_feed_activities, migrations.RunPython.noop),
	]
