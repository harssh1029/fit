from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Mapping, MutableMapping, Optional

from django.contrib.auth import get_user_model

from insights.models import UserMetricsSnapshot
from insights.services import recalculate_user_metrics

from .models import Challenge

User = get_user_model()


LEVEL_ORDER: List[str] = ["recruit", "soldier", "warrior", "beast", "legend"]


@dataclass
class BodyGroupState:
    group: str
    sessions: int
    rank: str

    @property
    def level_index(self) -> int:
        try:
            return LEVEL_ORDER.index(self.rank.lower())
        except ValueError:
            return 0


def _normalize_body_part_label(label: str) -> List[str]:
    """Map human body-part labels in unlock rules to canonical groups.

    The Body Battle Map uses the seven canonical groups:
    chest, shoulders, arms, back, core, glutes, legs.

    Unlock conditions sometimes use human-friendly labels like
    "Chest / Legs / Core" – for those we treat any of the mentioned
    groups as satisfying the *single* condition.
    """

    raw = (label or "").strip().lower()
    if not raw:
        return []

    def _map_single(token: str) -> Optional[str]:
        t = token.strip().lower()
        if not t:
            return None

        # Canonical one-to-one mappings
        if t in {"chest", "shoulders", "arms", "back", "core", "glutes", "legs"}:
            return t

        # Handle simple alias-style labels used in copy, just in case.
        if t in {"shoulder", "delts", "deltoids"}:
            return "shoulders"
        if t in {"arm"}:
            return "arms"
        if t in {"abs", "abdominals"}:
            return "core"

        # Combined copy like "full body" or "all body parts" is *not*
        # expected in unlock conditions; when present we conservatively
        # return all groups.
        if t in {"full body", "all body parts"}:
            return "*"

        return None

    # Support composite strings like "Chest / Legs / Core".
    if "/" in raw:
        parts = [p.strip() for p in raw.split("/") if p.strip()]
    else:
        parts = [raw]

    groups: List[str] = []
    for part in parts:
        mapped = _map_single(part)
        if mapped is None:
            continue
        if mapped == "*":
            # Wildcard – all canonical groups.
            groups.extend(
                g for g in ["chest", "shoulders", "arms", "back", "core", "glutes", "legs"]
            )
        else:
            groups.append(mapped)

    # De-duplicate while preserving order.
    seen = set()
    unique: List[str] = []
    for g in groups:
        if g not in seen:
            seen.add(g)
            unique.append(g)
    return unique


def _load_body_battle_groups(user: User) -> Mapping[str, BodyGroupState]:
    """Fetch Body Battle Map canonical-group stats for a user.

    This piggybacks on the existing dashboard metrics snapshot so we compute
    the body map in a single place (``recalculate_user_metrics``).
    """

    try:
        snapshot: UserMetricsSnapshot = user.metrics_snapshot  # type: ignore[attr-defined]
    except UserMetricsSnapshot.DoesNotExist:  # type: ignore[attr-defined]
        snapshot = recalculate_user_metrics(user)

    detail = snapshot.body_battle_map_detail or {}
    groups_detail: MutableMapping[str, MutableMapping[str, object]] = detail.get("groups", {})  # type: ignore[assignment]

    states: Dict[str, BodyGroupState] = {}
    for key, info in groups_detail.items():
        sessions = int(info.get("sessions", 0))  # type: ignore[arg-type]
        rank = str(info.get("rank", "Recruit"))  # type: ignore[arg-type]
        states[key] = BodyGroupState(group=key, sessions=sessions, rank=rank)
    return states


def challenge_is_unlocked_for_user(challenge: Challenge, user: Optional[User]) -> bool:
    """Return True if ``challenge`` should be unlocked for ``user``.

    Rules:
    * The first three beginner challenges (B01–B03) are always unlocked.
    * For authenticated users, we evaluate each ``unlock.conditions`` entry
      against Body Battle Map stats (sessions + rank).
    * ``challenges_completed_required`` is *not* enforced yet – challenge
      completion tracking will hook into this later.
    * Anonymous users only see the static seed status, except that the
      beginner trio remains unlocked.
    """

    # Hard-coded always-open beginner trio.
    if challenge.id in {"B01", "B02", "B03"}:
        return True

    unlock: Mapping[str, object] = challenge.unlock or {}
    is_free = bool(unlock.get("is_free"))

    # If the challenge is marked as free with no conditions, keep it open.
    conditions: Iterable[Mapping[str, object]] = unlock.get("conditions", []) or []  # type: ignore[assignment]
    if is_free and not list(conditions):
        return True

    if user is None or not getattr(user, "is_authenticated", False):
        # For anonymous users we do *not* evaluate body map state. Everything
        # beyond the always-open trio stays locked.
        return False

    groups = _load_body_battle_groups(user)

    def _group_state(key: str) -> BodyGroupState:
        if key in groups:
            return groups[key]
        # Default: zero sessions, Recruit.
        return BodyGroupState(group=key, sessions=0, rank="Recruit")

    for cond in conditions:
        raw_body_part = str(cond.get("body_part", ""))
        min_workouts = int(cond.get("min_workouts", 0))
        level_required = str(cond.get("level_required", "recruit")).lower()

        groups_for_cond = _normalize_body_part_label(raw_body_part)
        if not groups_for_cond:
            # If we cannot map the body part label, be conservative and
            # require unlock via other conditions only.
            continue

        try:
            required_level_idx = LEVEL_ORDER.index(level_required)
        except ValueError:
            required_level_idx = 0

        # Composite conditions (e.g. "Chest / Legs / Core") are treated as
        # satisfied if *any* of the referenced groups meets the threshold.
        satisfied = False
        for g in groups_for_cond:
            state = _group_state(g)
            if state.sessions >= min_workouts and state.level_index >= required_level_idx:
                satisfied = True
                break

        if not satisfied:
            return False

    # ``challenges_completed_required`` will be wired up once challenge
    # completion tracking is implemented. For now, it is informational only.
    return True

