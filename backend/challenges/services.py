from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import Dict, List, Mapping, MutableMapping, Optional, Sequence, Set

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone

from insights.models import UserMetricsSnapshot
from insights.services import recalculate_user_metrics

from .models import Challenge, TrainingChallenge, UserChallengeCompletion, UserChallengeEnrollment, UserChallengeProgress

User = get_user_model()


LEVEL_ORDER: List[str] = ["recruit", "soldier", "warrior", "beast", "legend"]
CANONICAL_GROUPS: List[str] = [
    "chest",
    "shoulders",
    "arms",
    "back",
    "core",
    "glutes",
    "legs",
]


@dataclass(frozen=True)
class BodyGroupState:
    group: str
    sessions: int
    rank: str

    @property
    def level_index(self) -> int:
        return level_index_for_rank(self.rank)


@dataclass(frozen=True)
class ChallengeUnlockEvaluation:
    is_unlocked: bool
    is_free: bool
    conditions: List[dict]
    challenges_completed_required: int
    challenges_completed_count: int
    unlock_message: str

    def as_dict(self) -> dict:
        return {
            "isUnlocked": self.is_unlocked,
            "isFree": self.is_free,
            "conditions": self.conditions,
            "challengesCompletedRequired": self.challenges_completed_required,
            "challengesCompletedCount": self.challenges_completed_count,
            "unlockMessage": self.unlock_message,
        }


def level_index_for_rank(rank: str) -> int:
    try:
        return LEVEL_ORDER.index((rank or "recruit").lower())
    except ValueError:
        return 0


def display_label_for_group(group: str) -> str:
    return " ".join(part.capitalize() for part in group.replace("_", " ").split())


def _normalize_body_part_label(label: str) -> List[str]:
    """Map challenge body-part copy to canonical Body Battle groups.

    A composite label such as "Chest / Legs / Core" means any listed group can
    satisfy that one condition. Multiple condition rows still all need to pass.
    """

    raw = (label or "").strip().lower()
    if not raw:
        return []

    def _map_single(token: str) -> Optional[str]:
        t = token.strip().lower()
        if not t:
            return None
        if t in CANONICAL_GROUPS:
            return t
        if t in {"shoulder", "delts", "deltoids"}:
            return "shoulders"
        if t in {"arm"}:
            return "arms"
        if t in {"abs", "abdominals"}:
            return "core"
        if t in {"full body", "all body parts"}:
            return "*"
        return None

    parts = (
        [part.strip() for part in raw.split("/") if part.strip()]
        if "/" in raw
        else [raw]
    )
    groups: List[str] = []
    for part in parts:
        mapped = _map_single(part)
        if mapped == "*":
            groups.extend(CANONICAL_GROUPS)
        elif mapped is not None:
            groups.append(mapped)

    seen: Set[str] = set()
    unique: List[str] = []
    for group in groups:
        if group not in seen:
            seen.add(group)
            unique.append(group)
    return unique


def _default_body_group_states() -> Dict[str, BodyGroupState]:
    return {
        group: BodyGroupState(group=group, sessions=0, rank="Recruit")
        for group in CANONICAL_GROUPS
    }


def load_body_battle_groups(user: User) -> Mapping[str, BodyGroupState]:
    """Return canonical body-part ranks used by challenge unlock rules."""

    try:
        snapshot: UserMetricsSnapshot = user.metrics_snapshot  # type: ignore[attr-defined]
    except UserMetricsSnapshot.DoesNotExist:  # type: ignore[attr-defined]
        snapshot = recalculate_user_metrics(user)

    detail = snapshot.body_battle_map_detail or {}
    groups_detail: MutableMapping[str, MutableMapping[str, object]] = detail.get(
        "groups",
        {},
    )  # type: ignore[assignment]

    states = _default_body_group_states()
    for key, info in groups_detail.items():
        if key not in states:
            continue
        sessions = int(info.get("sessions", 0))  # type: ignore[arg-type]
        # Registration onboarding can display an estimated starting rank, but
        # challenge unlocks must only use ranks earned through real sessions.
        if bool(info.get("rank_estimated")):
            rank = "Recruit"
        else:
            rank = str(info.get("rank", "Recruit"))  # type: ignore[arg-type]
        states[key] = BodyGroupState(group=key, sessions=sessions, rank=rank)
    return states


def completed_challenge_ids_for_user(user: User) -> Set[str]:
    return set(
        UserChallengeCompletion.objects.filter(user=user).values_list(
            "challenge_id",
            flat=True,
        )
    )


def _coerce_conditions(raw_conditions: object) -> Sequence[Mapping[str, object]]:
    if not isinstance(raw_conditions, list):
        return []
    return [item for item in raw_conditions if isinstance(item, Mapping)]


def evaluate_challenge_unlock(
    challenge: Challenge,
    user: Optional[User],
    *,
    completed_ids: Optional[Set[str]] = None,
    body_groups: Optional[Mapping[str, BodyGroupState]] = None,
) -> ChallengeUnlockEvaluation:
    """Evaluate every unlock prerequisite for one challenge.

    The API and completion endpoint both use this function so the mobile UI and
    backend enforcement cannot drift apart.
    """

    unlock: Mapping[str, object] = challenge.unlock or {}
    raw_conditions = _coerce_conditions(unlock.get("conditions", []))
    is_free = bool(unlock.get("is_free"))
    required_completed = int(unlock.get("challenges_completed_required") or 0)
    unlock_message = str(unlock.get("unlock_message") or "")

    is_authenticated = bool(
        user is not None and getattr(user, "is_authenticated", False)
    )
    if is_authenticated and completed_ids is None:
        completed_ids = completed_challenge_ids_for_user(user)  # type: ignore[arg-type]
    completed_ids = completed_ids or set()
    completed_count = len(completed_ids)

    if challenge.id in {"B01", "B02", "B03"}:
        is_free = True

    groups = body_groups
    if is_authenticated and groups is None:
        groups = load_body_battle_groups(user)  # type: ignore[arg-type]
    groups = groups or _default_body_group_states()

    condition_payloads: List[dict] = []
    all_conditions_met = True

    for condition in raw_conditions:
        body_part = str(condition.get("body_part", ""))
        min_workouts = int(condition.get("min_workouts") or 0)
        required_rank = str(condition.get("level_required") or "recruit").lower()
        required_rank_index = level_index_for_rank(required_rank)
        condition_groups = _normalize_body_part_label(body_part)

        group_payloads: List[dict] = []
        for group in condition_groups:
            state = groups.get(
                group,
                BodyGroupState(group=group, sessions=0, rank="Recruit"),
            )
            sessions_met = state.sessions >= min_workouts
            rank_met = state.level_index >= required_rank_index
            group_payloads.append(
                {
                    "key": group,
                    "label": display_label_for_group(group),
                    "sessions": state.sessions,
                    "rank": state.rank,
                    "rankIndex": state.level_index,
                    "sessionsMet": sessions_met,
                    "rankMet": rank_met,
                    "isMet": sessions_met and rank_met,
                }
            )

        # A composite condition is met if any listed group satisfies it.
        condition_met = bool(group_payloads) and any(
            group["isMet"] for group in group_payloads
        )
        all_conditions_met = all_conditions_met and condition_met
        condition_payloads.append(
            {
                "bodyPart": body_part,
                "minWorkouts": min_workouts,
                "levelRequired": required_rank,
                "levelRequiredIndex": required_rank_index,
                "isMet": condition_met,
                "mode": "any",
                "groups": group_payloads,
            }
        )

    completed_requirement_met = completed_count >= required_completed
    free_without_requirements = is_free and not raw_conditions and required_completed == 0
    is_unlocked = (
        free_without_requirements
        or (
            is_authenticated
            and all_conditions_met
            and completed_requirement_met
        )
    )

    return ChallengeUnlockEvaluation(
        is_unlocked=is_unlocked,
        is_free=is_free,
        conditions=condition_payloads,
        challenges_completed_required=required_completed,
        challenges_completed_count=completed_count,
        unlock_message=unlock_message,
    )


def challenge_is_unlocked_for_user(challenge: Challenge, user: Optional[User]) -> bool:
    return evaluate_challenge_unlock(challenge, user).is_unlocked


OFFICIAL_TRAINING_CHALLENGES = [
	{
		"name": "Consistency King",
		"description": "Complete 5 workouts in 7 days.",
		"requirement": "5 workouts in 7 days",
		"duration_days": 7,
		"required_sessions": 5,
		"eligible_workout_types": ["strength", "cardio", "conditioning", "mobility", "sport", "recovery"],
		"minimum_duration": 10,
		"badge_icon": "shield-checkmark",
		"reward_xp": 150,
	},
	{
		"name": "Upper Body Month",
		"description": "Complete 12 upper-body sessions this month.",
		"requirement": "12 upper-body sessions",
		"duration_days": 30,
		"required_sessions": 12,
		"eligible_workout_types": ["strength", "conditioning"],
		"eligible_body_parts": ["chest", "shoulders", "arms", "back"],
		"minimum_duration": 20,
		"badge_icon": "barbell",
		"reward_xp": 250,
	},
	{
		"name": "Leg Builder",
		"description": "Complete 8 lower-body sessions this month.",
		"requirement": "8 lower-body sessions",
		"duration_days": 30,
		"required_sessions": 8,
		"eligible_workout_types": ["strength", "conditioning"],
		"eligible_body_parts": ["legs", "glutes", "quads", "hamstrings"],
		"minimum_duration": 20,
		"badge_icon": "walk",
		"reward_xp": 220,
	},
	{
		"name": "Morning Athlete",
		"description": "Complete 5 workouts before 9 AM.",
		"requirement": "5 workouts before 9 AM",
		"duration_days": 14,
		"required_sessions": 5,
		"eligible_workout_types": ["strength", "cardio", "conditioning", "mobility", "sport"],
		"minimum_duration": 10,
		"badge_icon": "sunrise",
		"reward_xp": 180,
	},
	{
		"name": "Workout Explorer",
		"description": "Complete strength, cardio, mobility, and conditioning in one week.",
		"requirement": "4 training modes in 7 days",
		"duration_days": 7,
		"required_sessions": 4,
		"eligible_workout_types": ["strength", "cardio", "conditioning", "mobility"],
		"minimum_duration": 10,
		"badge_icon": "compass",
		"reward_xp": 180,
	},
	{
		"name": "Plan Finisher",
		"description": "Complete any full training plan.",
		"requirement": "Finish a training plan",
		"duration_days": 60,
		"required_sessions": 1,
		"eligible_workout_types": [],
		"minimum_duration": 0,
		"badge_icon": "flag",
		"reward_xp": 300,
	},
	{
		"name": "Comeback Week",
		"description": "Complete 3 workouts after 14 inactive days.",
		"requirement": "3 workouts after a break",
		"duration_days": 7,
		"required_sessions": 3,
		"eligible_workout_types": ["strength", "cardio", "conditioning", "mobility", "sport", "recovery"],
		"minimum_duration": 10,
		"badge_icon": "refresh",
		"reward_xp": 160,
	},
	{
		"name": "Community Grinder",
		"description": "Contribute 5 workouts to a group challenge.",
		"requirement": "5 group challenge workouts",
		"duration_days": 14,
		"required_sessions": 5,
		"eligible_workout_types": ["strength", "cardio", "conditioning", "mobility", "sport"],
		"minimum_duration": 20,
		"badge_icon": "people",
		"reward_xp": 220,
	},
]

def ensure_official_training_challenges() -> None:
	today = timezone.localdate()
	existing = {
		challenge.name: challenge
		for challenge in TrainingChallenge.objects.filter(
			name__in=[payload["name"] for payload in OFFICIAL_TRAINING_CHALLENGES],
			visibility=TrainingChallenge.VISIBILITY_OFFICIAL,
		)
	}
	if len(existing) == len(OFFICIAL_TRAINING_CHALLENGES) and all(
		challenge.is_official
		and challenge.status == TrainingChallenge.STATUS_ACTIVE
		and challenge.start_date == today - timedelta(days=7)
		and challenge.end_date == today + timedelta(days=payload["duration_days"])
		for payload in OFFICIAL_TRAINING_CHALLENGES
		if (challenge := existing.get(payload["name"])) is not None
	):
		return
	for index, payload in enumerate(OFFICIAL_TRAINING_CHALLENGES, start=1):
		TrainingChallenge.objects.update_or_create(
			name=payload["name"],
			visibility=TrainingChallenge.VISIBILITY_OFFICIAL,
			defaults={
				"description": payload["description"],
				"requirement": payload["requirement"],
				"duration_days": payload["duration_days"],
				"eligible_workout_types": payload.get("eligible_workout_types", []),
				"eligible_body_parts": payload.get("eligible_body_parts", []),
				"minimum_duration": payload["minimum_duration"],
				"required_sessions": payload["required_sessions"],
				"allowed_intensity": [],
				"is_official": True,
				"start_date": today - timedelta(days=7),
				"end_date": today + timedelta(days=payload["duration_days"]),
				"badge_icon": payload["badge_icon"],
				"reward_xp": payload["reward_xp"],
				"status": TrainingChallenge.STATUS_ACTIVE,
				"trending_score": 100 - index,
			},
		)
def enroll_user_in_training_challenge(user: User, challenge: TrainingChallenge) -> UserChallengeEnrollment:
	enrollment, created = UserChallengeEnrollment.objects.get_or_create(user=user, challenge=challenge)
	if not created and enrollment.status == UserChallengeEnrollment.STATUS_LEFT:
		enrollment.status = UserChallengeEnrollment.STATUS_ACTIVE
		enrollment.completed_at = None
		enrollment.save(update_fields=["status", "completed_at"])
	actual_count = challenge.enrollments.exclude(status=UserChallengeEnrollment.STATUS_LEFT).count()
	if challenge.participant_count != actual_count:
		challenge.participant_count = actual_count
		challenge.save(update_fields=["participant_count", "updated_at"])
	UserChallengeProgress.objects.get_or_create(enrollment=enrollment)
	return enrollment


def _session_matches_challenge(session, challenge: TrainingChallenge) -> bool:
	if challenge.start_date and session.completed_at and session.completed_at.date() < challenge.start_date:
		return False
	if challenge.end_date and session.completed_at and session.completed_at.date() > challenge.end_date:
		return False
	if challenge.eligible_workout_types and session.workout_type not in challenge.eligible_workout_types:
		return False
	if challenge.eligible_body_parts:
		required = set(str(item).lower().replace(" ", "_") for item in challenge.eligible_body_parts)
		actual = set(str(item).lower().replace(" ", "_") for item in ((session.body_groups or []) + (session.muscles or [])))
		upper = {"upper_body", "chest", "shoulders", "arms", "back", "biceps", "triceps", "lats", "trapezius"}
		lower = {"lower_body", "legs", "glutes", "quads", "quadriceps", "hamstrings", "calves"}
		core = {"core", "abs", "obliques"}
		if "upper_body" in actual:
			actual |= upper
		if "lower_body" in actual:
			actual |= lower
		if "core" in actual:
			actual |= core
		if required & upper:
			required |= upper
		if required & lower:
			required |= lower
		if required & core:
			required |= core
		if not required.intersection(actual):
			return False
	if challenge.allowed_intensity and session.intensity not in challenge.allowed_intensity:
		return False
	if (session.duration_minutes or 0) < challenge.minimum_duration:
		return False
	if challenge.name == "Morning Athlete" and session.completed_at and session.completed_at.hour >= 9:
		return False
	return True


def update_training_challenge_progress_for_workout(session, score=None) -> int:
	from achievements.services import earned_badge_summaries, evaluate_challenge_completion
	from community.services import materialize_challenge_activity

	reward_xp = 0
	active = UserChallengeEnrollment.objects.filter(
		user=session.user,
		status=UserChallengeEnrollment.STATUS_ACTIVE,
		challenge__status=TrainingChallenge.STATUS_ACTIVE,
	).select_related("challenge")
	for enrollment in active:
		challenge = enrollment.challenge
		if not _session_matches_challenge(session, challenge):
			continue
		progress, _ = UserChallengeProgress.objects.get_or_create(enrollment=enrollment)
		ids = [
			int(item)
			for item in (progress.qualifying_workout_ids or [])
			if str(item).isdigit()
		]
		if session.id not in ids:
			ids.append(session.id)
		ids = list(dict.fromkeys(ids))
		qualifying_sessions = list(
			session.user.workout_sessions.filter(
				id__in=ids,
				status="completed",
			).select_related("score_record")
		)
		progress.qualifying_workout_ids = [row.id for row in qualifying_sessions]
		progress.sessions_completed = min(len(qualifying_sessions), challenge.required_sessions)
		progress.points = sum(
			max(
				0,
				int(getattr(getattr(row, "score_record", None), "challenge_points", 0) or 0)
				or (
					int(getattr(getattr(row, "score_record", None), "activity_xp", 0) or 0)
					- int(
						(
							getattr(getattr(row, "score_record", None), "calculation_breakdown", {})
							or {}
						).get("training_challenge_reward_xp", 0)
						or 0
					)
				),
			)
			for row in qualifying_sessions
		)
		progress.active_days = len(
			{
				item.completed_at.date()
				for item in qualifying_sessions
				if item.completed_at
			}
		)
		progress.progress_percent = min(100, int(round((progress.sessions_completed / max(1, challenge.required_sessions)) * 100)))
		progress.save()
		if progress.sessions_completed >= challenge.required_sessions:
			enrollment.status = UserChallengeEnrollment.STATUS_COMPLETED
			enrollment.completed_at = session.completed_at or timezone.now()
			enrollment.save(update_fields=["status", "completed_at"])
			earned_badges = evaluate_challenge_completion(
				session.user,
				challenge=challenge,
				context={
					"challenge_completed_count": UserChallengeEnrollment.objects.filter(user=session.user, status=UserChallengeEnrollment.STATUS_COMPLETED).count(),
					"challenge_joined_count": UserChallengeEnrollment.objects.filter(user=session.user).count(),
					"challenges_completed_this_month": UserChallengeEnrollment.objects.filter(
						user=session.user,
						status=UserChallengeEnrollment.STATUS_COMPLETED,
						completed_at__year=enrollment.completed_at.year,
						completed_at__month=enrollment.completed_at.month,
					).count() if enrollment.completed_at else 0,
					"challenge_visibility": "official" if challenge.is_official else "community",
					"rank": 1,
					"as_of": enrollment.completed_at or timezone.now(),
				},
				create_feed_activity=False,
			)
			materialize_challenge_activity(
				session.user,
				source_id=f'training_challenge:{challenge.id}',
				title=f"Completed {challenge.name}",
				metadata={
					"event_type": "challenge_completed",
					"challenge_id": challenge.id,
					"challenge_name": challenge.name,
					"earned_badges": earned_badge_summaries(earned_badges),
					"frontend_summary": {
						"title": challenge.name,
						"xp": challenge.reward_xp,
						"challenge_badge": challenge.badge_icon or "Challenge",
					},
				},
				occurred_at=enrollment.completed_at,
			)
			if challenge.is_official:
				reward_xp += challenge.reward_xp
	return reward_xp


def challenge_sections_for_user(user: User) -> dict:
	ensure_official_training_challenges()
	now = timezone.localdate()
	enrollments = {
		row.challenge_id: row
		for row in UserChallengeEnrollment.objects.filter(user=user).select_related("progress")
	}
	challenges = list(
		TrainingChallenge.objects.filter(status=TrainingChallenge.STATUS_ACTIVE)
		.select_related("group", "created_by")
		.annotate(
			completed_participant_count=Count(
				"enrollments",
				filter=Q(enrollments__status=UserChallengeEnrollment.STATUS_COMPLETED),
				distinct=True,
			)
		)
	)
	serialized = {}

	def serialize(challenge: TrainingChallenge) -> dict:
		if challenge.id in serialized:
			return serialized[challenge.id]
		enrollment = enrollments.get(challenge.id)
		progress = getattr(enrollment, "progress", None) if enrollment else None
		days_left = (challenge.end_date - now).days if challenge.end_date else challenge.duration_days
		serialized[challenge.id] = {
			"id": challenge.id,
			"name": challenge.name,
			"description": challenge.description,
			"requirement": challenge.requirement,
			"durationDays": challenge.duration_days,
			"eligibleWorkoutTypes": challenge.eligible_workout_types,
			"eligibleBodyParts": challenge.eligible_body_parts,
			"minimumDuration": challenge.minimum_duration,
			"requiredSessions": challenge.required_sessions,
			"allowedIntensity": challenge.allowed_intensity,
			"startDate": challenge.start_date.isoformat() if challenge.start_date else None,
			"endDate": challenge.end_date.isoformat() if challenge.end_date else None,
			"progress": {
				"sessionsCompleted": progress.sessions_completed if progress else 0,
				"requiredSessions": challenge.required_sessions,
				"percent": progress.progress_percent if progress else 0,
			},
			"participants": challenge.participant_count,
			"completedParticipants": challenge.completed_participant_count,
			"daysLeft": max(0, days_left),
			"badgeRewardPreview": challenge.badge_icon,
			"xpReward": challenge.reward_xp,
			"joined": enrollment is not None and enrollment.status != UserChallengeEnrollment.STATUS_LEFT,
			"completed": enrollment is not None and enrollment.status == UserChallengeEnrollment.STATUS_COMPLETED,
			"visibility": challenge.visibility,
			"isOfficial": challenge.is_official,
			"groupId": challenge.group_id,
			"groupName": challenge.group.name if challenge.group_id else None,
		}
		return serialized[challenge.id]

	active = [serialize(challenge) for challenge in challenges if challenge.id in enrollments and enrollments[challenge.id].status == UserChallengeEnrollment.STATUS_ACTIVE]
	completed = [serialize(challenge) for challenge in challenges if challenge.id in enrollments and enrollments[challenge.id].status == UserChallengeEnrollment.STATUS_COMPLETED]
	trending = [serialize(challenge) for challenge in sorted(challenges, key=lambda item: item.trending_score, reverse=True)[:10]]
	official = [serialize(challenge) for challenge in challenges if challenge.is_official]
	community = [serialize(challenge) for challenge in challenges if not challenge.is_official and challenge.visibility in {TrainingChallenge.VISIBILITY_COMMUNITY, TrainingChallenge.VISIBILITY_GROUP}]
	return {
		"active": active,
		"trending": trending,
		"official": official,
		"community": community,
		"completed": completed,
	}
