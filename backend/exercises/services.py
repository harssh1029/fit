from __future__ import annotations

import json
import re
from typing import Dict, List, Set, Tuple
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen

from django.conf import settings

from .models import Exercise, MuscleGroup


EXERCISEDB_API_BASE_URL = "https://exercisedb.p.rapidapi.com"
EXERCISEDB_API_HOST = "exercisedb.p.rapidapi.com"


# Mapping between our internal label and ExerciseDB bodyPart name.
MUSCLE_GROUPS: Dict[str, str] = {
    "neck": "neck",
    "upper_back": "back",  # For trapezius and lats
    "shoulders": "shoulders",  # For deltoids
    "chest": "chest",
    "upper_arms": "upper arms",  # For biceps and triceps
    "lower_arms": "lower arms",  # For forearms
    "waist": "waist",  # For abs and obliques
    "upper_legs": "upper legs",  # For quadriceps, hip flexors, hamstrings
    "lower_legs": "lower legs",  # For calves and tibialis
    "cardio": "cardio",
}


# Fallback mapping from ExerciseDB bodyPart/import group labels to our
# MuscleGroup slugs. These slugs are what the mobile body map and filters use.
BODY_PART_FALLBACK_MAP: Dict[str, List[str]] = {
    "neck": ["neck"],
    "back": ["trapezius", "lats", "lower_back"],
    "upper_back": ["trapezius", "lats"],
    "shoulders": ["deltoids"],
    "chest": ["chest"],
    "upper_arms": ["biceps", "triceps"],
    "lower_arms": ["forearms"],
    "waist": ["abs", "obliques"],
    "upper_legs": ["hip_flexors", "quadriceps", "hamstrings", "glutes"],
    "lower_legs": ["tibialis", "calves"],
    "cardio": [],
}


# Extra mappings from ExerciseDB "target" labels to our MuscleGroup slugs.
TARGET_SYNONYMS: Dict[str, List[str]] = {
    "pectorals": ["chest"],
    "pecs": ["chest"],
    "upper_chest": ["chest"],
    "lower_chest": ["chest"],
    "delts": ["deltoids"],
    "anterior_deltoid": ["deltoids"],
    "posterior_deltoid": ["deltoids"],
    "traps": ["trapezius"],
    "upper_back": ["trapezius", "lats"],
    "mid_back": ["trapezius", "lats"],
    "lower_back": ["lower_back"],
    "spine": ["lower_back"],
    "abdominals": ["abs"],
    "core": ["abs", "obliques"],
    "obliques": ["obliques"],
    "gluteus_maximus": ["glutes"],
    "quads": ["quadriceps"],
    "cardiovascular_system": [],
}


def _infer_mechanic_and_movement(
    *, name: str, body_part: str, target: str
) -> Tuple[str, bool]:
    """Infer a coarse movement pattern and mechanic for an exercise.

    This is used to power the "Force" (push/pull/hold) and
    "Mechanic" (compound/isolation) filters for imported ExerciseDB
    exercises.

    The goal is to keep the rules simple, explicit, and easy to
    refine as we see real data. If you notice misclassified
    exercises in admin, you can tweak the keyword lists below.
    """

    text = f"{name} {body_part} {target}".lower()

    movement_tags: List[str] = []
    is_compound = True  # assume compound unless we detect isolation patterns

    # --- Force: push / pull / hold -------------------------------------
    # We classify based on common words in the exercise name/metadata.
    # The mobile app treats an exercise as:
    #   - PUSH when movement_pattern contains "push" or "press"
    #   - PULL when it contains "pull", "row", or "curl"
    #   - HOLD when it contains "hold" or "carry"

    push_keywords = [
        "press",
        "push-up",
        "push up",
        "pushup",
        "push",
        "dip",
    ]
    if any(k in text for k in push_keywords):
        movement_tags.append("push")

    pull_keywords = [
        "row",
        "pulldown",
        "pull-down",
        "pull up",
        "pull-up",
        "pullover",
        "face pull",
        "curl",
        "chin-up",
        "chin up",
    ]
    if any(k in text for k in pull_keywords):
        movement_tags.append("pull")

    hold_keywords = [
        "plank",
        "hold",
        "carry",
        "farmer",
        "suitcase",
        "static hold",
        "isometric",
    ]
    if any(k in text for k in hold_keywords):
        movement_tags.append("hold")

    # --- Mechanic: compound vs isolation -------------------------------
    # Treat classic single-joint patterns as isolation. Everything
    # else stays as compound.
    isolation_keywords = [
        "curl",
        "extension",
        "raise",
        "fly",
        "flye",
        "pullover",
        "kickback",
        "crunch",
        "leg curl",
        "leg extension",
        "calf raise",
        "wrist curl",
        "lateral raise",
        "front raise",
        "reverse fly",
    ]
    if any(k in text for k in isolation_keywords):
        is_compound = False

    # Build the movement_pattern string that the mobile app inspects.
    if movement_tags:
        # deduplicate while keeping a stable order
        seen = set()
        ordered: List[str] = []
        for tag in movement_tags:
            if tag not in seen:
                seen.add(tag)
                ordered.append(tag)
        movement_pattern = " ".join(ordered)
    else:
        # neutral label that won't match any specific Force filter
        movement_pattern = "other"

    return movement_pattern, is_compound


def _normalize_label(value: str) -> str:
    """Normalize a free-text label to a slug-like key.

    Matches the mobile ``normalizeMuscleLabel`` helper so that labels like
    "Hip Flexors" become ``"hip_flexors"``.
    """

    text = (value or "").strip().lower()
    if not text:
        return ""
    return re.sub(r"[\s\-]+", "_", text)


def _map_target_to_muscle_slugs(target: str, all_slugs: Set[str]) -> List[str]:
    """Map an ExerciseDB ``target`` label to our MuscleGroup slugs."""

    norm = _normalize_label(target)
    if not norm:
        return []

    result: List[str] = []
    if norm in all_slugs:
        result.append(norm)

    for slug in TARGET_SYNONYMS.get(norm, []):
        if slug in all_slugs and slug not in result:
            result.append(slug)
    return result


def _map_body_part_to_muscle_slugs(body_part: str, all_slugs: Set[str]) -> List[str]:
    """Fallback from ExerciseDB ``bodyPart`` (e.g. "back", "upper legs")."""

    norm = _normalize_label(body_part)
    slugs = BODY_PART_FALLBACK_MAP.get(norm, [])
    return [slug for slug in slugs if slug in all_slugs]


def _infer_muscles_for_payload(
    payload: dict,
    *,
    all_slugs: Set[str],
    import_group: str | None = None,
) -> Tuple[List[str], List[str]]:
    """Infer primary/secondary muscle slugs for a single ExerciseDB payload."""

    primary: List[str] = []
    secondary: List[str] = []

    target = (payload.get("target") or "").strip()
    body_part = (payload.get("bodyPart") or "").strip()
    secondary_list = payload.get("secondaryMuscles") or []
    if not isinstance(secondary_list, list):
        secondary_list = [str(secondary_list)]

    for slug in _map_target_to_muscle_slugs(target, all_slugs):
        if slug not in primary:
            primary.append(slug)

    for sec in secondary_list:
        for slug in _map_target_to_muscle_slugs(str(sec), all_slugs):
            if slug not in primary and slug not in secondary:
                secondary.append(slug)

    # If we still don't have a primary muscle, fall back to the broader bodyPart.
    if not primary:
        for slug in _map_body_part_to_muscle_slugs(body_part, all_slugs):
            if slug not in primary:
                primary.append(slug)

    # As a last resort, fall back to the internal import group label
    # (neck/upper_back/shoulders/...).
    if not primary and import_group:
        fallback_slugs = BODY_PART_FALLBACK_MAP.get(import_group, [])
        for slug in fallback_slugs:
            if slug in all_slugs and slug not in primary:
                primary.append(slug)

    return primary, secondary


class ExerciseDBError(Exception):
    """Raised when the ExerciseDB API returns an error or cannot be used."""


def _get_api_key() -> str:
    """Return the ExerciseDB API key from Django settings.

    Expected to be provided via the ``EXERCISEDB_API_KEY`` setting, which can be
    wired from an environment variable in ``core.settings``.
    """

    key = getattr(settings, "EXERCISEDB_API_KEY", "")
    if not key:
        raise ExerciseDBError(
            "EXERCISEDB_API_KEY is not configured. Set it in settings or via the "
            "EXERCISEDB_API_KEY environment variable."
        )
    return key


def _fetch_exercises_page(body_part: str, *, limit: int = 200, offset: int = 0) -> List[dict]:
    """Fetch a single page of exercises for a given body part from ExerciseDB."""

    api_key = _get_api_key()
    params = {"limit": str(limit), "offset": str(offset)}
    # Body-part values like "upper arms" contain spaces, which must be URL-encoded
    # in the path segment (the ExerciseDB API expects e.g. "upper%20arms").
    encoded_body_part = quote(body_part, safe="")
    url = f"{EXERCISEDB_API_BASE_URL}/exercises/bodyPart/{encoded_body_part}?{urlencode(params)}"
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": EXERCISEDB_API_HOST,
    }
    req = Request(url, headers=headers)
    try:
        with urlopen(req, timeout=30) as resp:  # nosec: external API by design
            body = resp.read().decode("utf-8", errors="ignore")
            if resp.status != 200:
                raise ExerciseDBError(
                    f"ExerciseDB API error {resp.status}: {body[:200]}"
                )
            try:
                data = json.loads(body)
            except json.JSONDecodeError as exc:  # pragma: no cover - defensive
                raise ExerciseDBError(
                    "Unexpected ExerciseDB response format while decoding JSON"
                ) from exc
            if not isinstance(data, list):
                raise ExerciseDBError(
                    "Unexpected ExerciseDB response structure: expected a list of exercises"
                )
            return data
    except ExerciseDBError:
        raise
    except Exception as exc:  # pragma: no cover - network errors
        raise ExerciseDBError(f"Error calling ExerciseDB API: {exc}") from exc


def fetch_all_exercises_for_body_part(body_part: str, *, page_size: int = 200) -> List[dict]:
    """Fetch *all* exercises for a body part using limit/offset pagination."""

    all_items: List[dict] = []
    offset = 0
    while True:
        page = _fetch_exercises_page(body_part, limit=page_size, offset=offset)
        if not page:
            break
        all_items.extend(page)
        if len(page) < page_size:
            break
        offset += page_size
    return all_items


def _map_exercisedb_payload_to_defaults(payload: dict) -> Dict:
    """Map a single ExerciseDB payload into ``Exercise`` defaults dict."""

    name = (payload.get("name") or "").strip() or f"Exercise {payload.get('id')}"
    body_part = (payload.get("bodyPart") or "").strip()
    target = (payload.get("target") or "").strip()
    secondary = payload.get("secondaryMuscles") or []
    if not isinstance(secondary, list):
        secondary = [str(secondary)]
    secondary = [str(s).strip() for s in secondary if str(s).strip()]

    gif_url = (payload.get("gifUrl") or "").strip()
    instructions = payload.get("instructions") or []
    if not isinstance(instructions, list):
        instructions = [str(instructions)]
    instructions = [str(step).strip() for step in instructions if str(step).strip()]

    equipment_val = payload.get("equipment")
    if isinstance(equipment_val, list):
        equipment = [str(e).strip() for e in equipment_val if str(e).strip()]
    elif isinstance(equipment_val, str):
        equipment = [equipment_val.strip()]
    else:
        equipment = []

    description = " ".join(instructions)[:2000] if instructions else ""

    # Infer coarse mechanic & movement pattern used by the mobile filters.
    movement_pattern, is_compound = _infer_mechanic_and_movement(
        name=name,
        body_part=body_part,
        target=target,
    )

    return {
        "name": name,
        "movement_pattern": movement_pattern,
        "equipment": equipment,
        "level": "beginner",
        "is_compound": is_compound,
        "is_featured": False,
        "source": "exercisedb",
        "body_part": body_part,
        "target": target,
        "secondary_targets": secondary,
        "video_url": "",
        "gif_url": gif_url,
        "image_url": "",
        "instructions": instructions,
        "description": description,
    }


def import_all_exercises_from_exercisedb(
    *, page_size: int = 200, dry_run: bool = False
) -> Dict[str, Dict[str, int]]:
    """Fetch exercises for all configured muscle groups and upsert into DB.

    Returns a summary dictionary keyed by our internal muscle-group label, e.g.::

        {
          "chest": {"body_part": "chest", "fetched": 120, "created": 110, "updated": 10},
          ...
        }

    If ``dry_run`` is True, no database writes are performed and only the
    ``fetched`` counts are populated.
    """

    summary: Dict[str, Dict[str, int]] = {}
    muscles_by_slug = {m.id: m for m in MuscleGroup.objects.all()}
    all_slugs: Set[str] = set(muscles_by_slug.keys())

    for internal_label, body_part in MUSCLE_GROUPS.items():
        items = fetch_all_exercises_for_body_part(body_part, page_size=page_size)
        created = 0
        updated = 0
        if not dry_run:
            for payload in items:
                external_id = str(payload.get("id"))
                if not external_id:
                    continue
                exercise_id = f"exdb_{external_id}"
                defaults = _map_exercisedb_payload_to_defaults(payload)
                obj, was_created = Exercise.objects.update_or_create(
                    id=exercise_id,
                    defaults=defaults,
                )

                # Infer and apply muscle relationships so UI filters & body map work.
                primary_slugs, secondary_slugs = _infer_muscles_for_payload(
                    payload,
                    all_slugs=all_slugs,
                    import_group=internal_label,
                )
                primary_muscles = [
                    muscles_by_slug[s]
                    for s in primary_slugs
                    if s in muscles_by_slug
                ]
                secondary_muscles = [
                    muscles_by_slug[s]
                    for s in secondary_slugs
                    if s in muscles_by_slug
                ]
                obj.primary_muscles.set(primary_muscles)
                obj.secondary_muscles.set(secondary_muscles)

                if was_created:
                    created += 1
                else:
                    updated += 1

        summary[internal_label] = {
            "body_part": body_part,
            "fetched": len(items),
            "created": created,
            "updated": updated,
        }

    return summary
