from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Mapping, MutableMapping, Optional, Sequence, Set

from django.contrib.auth import get_user_model

from insights.models import UserMetricsSnapshot
from insights.services import recalculate_user_metrics

from .models import Challenge, UserChallengeCompletion

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
