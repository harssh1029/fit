import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RouteProp } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";

import BodyMuscleBack from "../../BodyMuscleBack";
import BodyMuscleFront, { MuscleName, MuscleSelection } from "../../BodyMuscleFront";
import { fetchRequiredAuth, invalidateWorkoutData } from "../../api/client";
import {
  MotionEntrance,
  MotionPulse,
  MotionTouchable,
} from "../../components/PremiumMotion";
import { useAuth, useThemeMode } from "../../App";
import { useActiveUserPlan } from "../../hooks/useActiveUserPlan";
import { useAllWorkoutHistory } from "../../hooks/useAllWorkoutHistory";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import { fontFamily } from "../../styles/typography";
import {
  DARK_BG,
  DARK_CARD,
  LIGHT_BG,
  LIGHT_CARD,
  LIGHT_TEXT_MUTED,
  PS_BLUE,
  WORKOUT_ACCENT,
  WORKOUT_ACCENT_BLUE,
  WORKOUT_CARD_ELEVATED,
} from "../../styles/theme";

type RecordNavigation = BottomTabNavigationProp<{
  Home: undefined;
  Exercises: undefined;
}>;
type RecordPlanContext = {
  scheduledWorkoutId: number;
  userPlanId: number;
  planId: string;
  planName: string;
  planDayId: number | string;
  title: string;
  dayType: string;
  intensity?: string;
  durationMinutes?: number;
  focusLabel?: string;
  weekNumber: number;
  dayIndex: number;
  exercises?: Array<{
    name: string;
    volume?: string;
    muscles?: string[];
  }>;
};
type RecordRoute = RouteProp<
  { Record: { planContext?: RecordPlanContext } | undefined },
  "Record"
>;

type SessionPhase = "setup" | "recording" | "review" | "complete";
type MapSide = "front" | "back";
type WorkoutMode = "strength" | "cardio" | "conditioning" | "mobility" | "sport";
type Intensity = "Light" | "Moderate" | "Hard" | "Max Effort";
type Feeling = "Strong" | "Pumped" | "Tired" | "Exhausted" | "Fresh";
type ExerciseEntry = {
  id: string;
  name: string;
  volume: string;
  pr: boolean;
};
type WorkoutPayload = {
  body_groups: string[];
  muscles: MuscleName[];
  body_map_side: MapSide;
  exercise_count: number;
  duration_minutes: number;
  cardio: boolean;
  mode: WorkoutMode;
  modes: WorkoutMode[];
  title: string;
  focus_label: string;
  intensity: Intensity | null;
  feeling: Feeling | null;
  notes: string;
  caption: string;
  image_url: string;
  image_urls: string[];
  pr: string;
  exercises: Array<{ name: string; volume: string; pr: boolean }>;
};
type WorkoutDraft = {
  id: string;
  title: string;
  durationSeconds: number;
  createdAt: number;
  payload: WorkoutPayload;
};
type WorkoutLogResponse = {
  activity_xp?: number;
  leaderboard_xp?: number;
  challenge_points?: number;
};

const WORKOUT_TYPES: Array<{
  key: WorkoutMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "strength", label: "Strength", icon: "barbell-outline" },
  { key: "cardio", label: "Cardio", icon: "walk-outline" },
  { key: "conditioning", label: "Conditioning", icon: "pulse-outline" },
  { key: "mobility", label: "Mobility", icon: "leaf-outline" },
  { key: "sport", label: "Sport", icon: "football-outline" },
];

const PRESETS: Array<{
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  mode: WorkoutMode;
  cardio?: boolean;
  muscles: MuscleName[];
}> = [
  { key: "push", label: "Push Day", icon: "barbell-outline", mode: "strength", muscles: ["Chest", "Deltoids", "Triceps"] },
  { key: "pull", label: "Pull Day", icon: "bag-handle-outline", mode: "strength", muscles: ["Lats", "Trapezius", "Biceps", "Forearms"] },
  { key: "legs", label: "Leg Day", icon: "walk-outline", mode: "strength", muscles: ["Quadriceps", "Hamstrings", "Glutes", "Calves"] },
  { key: "upper", label: "Upper Body", icon: "body-outline", mode: "strength", muscles: ["Chest", "Deltoids", "Biceps", "Triceps", "Lats"] },
  { key: "lower", label: "Lower Body", icon: "accessibility-outline", mode: "strength", muscles: ["Quadriceps", "Hamstrings", "Glutes", "Calves"] },
  { key: "full", label: "Full Body", icon: "body-outline", mode: "strength", muscles: ["Chest", "Deltoids", "Abs", "Quadriceps", "Glutes", "Lats"] },
  { key: "cardio", label: "Cardio", icon: "heart-outline", mode: "cardio", cardio: true, muscles: [] },
  { key: "sport", label: "Sport", icon: "basketball-outline", mode: "sport", cardio: true, muscles: ["Quadriceps", "Calves", "Abs"] },
  { key: "recovery", label: "Recovery", icon: "leaf-outline", mode: "mobility", muscles: ["Abs", "Hip Flexors", "Calves"] },
];

const INTENSITY_OPTIONS: Intensity[] = ["Light", "Moderate", "Hard", "Max Effort"];
const FEELING_OPTIONS: Feeling[] = ["Strong", "Pumped", "Tired", "Exhausted", "Fresh"];
const TIMER_TARGET_SECONDS = 60 * 60;
const TIMER_RING_RADIUS = 104;
const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * TIMER_RING_RADIUS;

const MUSCLE_TO_BODY_GROUP: Partial<Record<MuscleName, string>> = {
  Chest: "chest",
  Deltoids: "shoulders",
  Biceps: "arms",
  Triceps: "arms",
  Forearms: "arms",
  Abs: "core",
  Obliques: "core",
  "Hip Flexors": "legs",
  Quadriceps: "legs",
  Hamstrings: "legs",
  Calves: "legs",
  Tibialis: "legs",
  Trapezius: "back",
  Lats: "back",
  "Lower Back": "back",
  Glutes: "glutes",
};

const MUSCLE_ALIASES: Record<string, MuscleName> = {
  chest: "Chest",
  pectorals: "Chest",
  deltoids: "Deltoids",
  shoulders: "Deltoids",
  shoulder: "Deltoids",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  core: "Abs",
  obliques: "Obliques",
  quadriceps: "Quadriceps",
  quads: "Quadriceps",
  hamstrings: "Hamstrings",
  calves: "Calves",
  tibialis: "Tibialis",
  trapezius: "Trapezius",
  traps: "Trapezius",
  lats: "Lats",
  back: "Lats",
  glutes: "Glutes",
  "lower back": "Lower Back",
  lower_back: "Lower Back",
  hip_flexors: "Hip Flexors",
  "hip flexors": "Hip Flexors",
};

const BODY_GROUP_LABELS: Record<string, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  arms: "Arms",
  back: "Back",
  core: "Core",
  glutes: "Glutes",
  legs: "Legs",
};

const titleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatElapsed = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const uniqueMuscles = (muscles: MuscleName[]) => Array.from(new Set(muscles));

const normalizePlanMuscles = (values: string[] = []) =>
  uniqueMuscles(
    values
      .map((value) => MUSCLE_ALIASES[String(value).trim().toLowerCase()])
      .filter((value): value is MuscleName => Boolean(value)),
  );

const planDayTypeToWorkoutMode = (value: string): WorkoutMode => {
  const normalized = value.toLowerCase();
  if (normalized.includes("cardio") || normalized.includes("run")) return "cardio";
  if (normalized.includes("recovery") || normalized.includes("mobility")) return "mobility";
  if (normalized.includes("sport")) return "sport";
  if (normalized.includes("hybrid") || normalized.includes("conditioning")) return "conditioning";
  return "strength";
};

const planIntensityToOption = (value?: string): Intensity | null => {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("max") || normalized.includes("race")) return "Max Effort";
  if (normalized.includes("hard")) return "Hard";
  if (normalized.includes("easy") || normalized.includes("light")) return "Light";
  if (normalized) return "Moderate";
  return null;
};

const RecordScreen: React.FC = () => {
  const navigation = useNavigation<RecordNavigation>();
  const route = useRoute<RecordRoute>();
  const { width: viewportWidth } = useWindowDimensions();
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const auth = useMemo(
    () => ({ accessToken, refreshAccessToken, signOut }),
    [accessToken, refreshAccessToken, signOut],
  );
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const rs = useMemo(() => createRecordStyles(isLight), [isLight]);
  const { activeUserPlan, reload: reloadActiveUserPlan } = useActiveUserPlan();
  const { items: workoutHistory, reload: reloadWorkoutHistory } =
    useAllWorkoutHistory(200);
  const { summary: dashboardSummary, reload: reloadDashboardSummary } =
    useDashboardSummary();

  const [phase, setPhase] = useState<SessionPhase>("setup");
  const [mapSide, setMapSide] = useState<MapSide>("front");
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleName[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>("strength");
  const [selectedWorkoutTypes, setSelectedWorkoutTypes] = useState<WorkoutMode[]>(["strength"]);
  const [includeCardio, setIncludeCardio] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<Intensity | null>(null);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [exerciseRows, setExerciseRows] = useState<ExerciseEntry[]>([
    { id: "exercise-1", name: "", volume: "", pr: false },
  ]);
  const [notes, setNotes] = useState("");
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImageUri, setSelectedImageUri] = useState("");
  const [selectedImageUris, setSelectedImageUris] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);
  const [draftsVisible, setDraftsVisible] = useState(false);
  const [drafts, setDrafts] = useState<WorkoutDraft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [activePlanContext, setActivePlanContext] =
    useState<RecordPlanContext | null>(route.params?.planContext ?? null);
  const [completedCard, setCompletedCard] = useState<{
    title: string;
    durationMinutes: number;
    muscles: MuscleName[];
    activityXp: number;
    leaderboardXp: number;
    challengePoints: number;
  } | null>(null);
  const [fillProgress, setFillProgress] = useState(1);

  const imagePreviewWidth = Math.max(260, Math.min(520, viewportWidth - 48));

  const bodyGroups = useMemo(() => {
    const groups = selectedMuscles
      .map((muscle) => MUSCLE_TO_BODY_GROUP[muscle])
      .filter((group): group is string => Boolean(group));
    return Array.from(new Set(groups));
  }, [selectedMuscles]);

  const focusLabel = useMemo(() => {
    if (activePlanContext?.focusLabel && selectedPreset === null) {
      return activePlanContext.focusLabel;
    }
    if (bodyGroups.length) {
      const hasUpper = bodyGroups.some((group) => ["chest", "shoulders", "arms", "back"].includes(group));
      const hasLower = bodyGroups.some((group) => ["legs", "glutes"].includes(group));
      if (hasUpper && hasLower) return "Full Body";
      if (hasUpper) return "Upper Body";
      if (hasLower) return "Lower Body";
      if (bodyGroups.includes("core")) return "Core";
    }
    if (workoutMode === "cardio") return "Cardio";
    if (workoutMode === "mobility") return "Mobility";
    if (workoutMode === "sport") return "Sport";
    return "General Training";
  }, [activePlanContext, bodyGroups, selectedPreset, workoutMode]);

  const muscleText = useMemo(() => {
    if (selectedMuscles.length) return selectedMuscles.slice(0, 5).join(" • ");
    if (includeCardio || selectedWorkoutTypes.includes("cardio")) return "Cardio";
    return focusLabel;
  }, [focusLabel, includeCardio, selectedMuscles, selectedWorkoutTypes]);

  const sessionTitle = useMemo(() => {
    if (activePlanContext?.title && selectedPreset === null) {
      return activePlanContext.title;
    }
    const preset = PRESETS.find((item) => item.key === selectedPreset);
    if (preset?.key === "push") return "Push Workout";
    if (preset?.key === "pull") return "Pull Workout";
    if (preset?.key === "legs") return "Leg Day";
    if (preset?.key === "full") return "Full Body Training";
    if (preset?.key === "recovery") return "Recovery Mobility";
    if (selectedWorkoutTypes.includes("strength") && selectedWorkoutTypes.includes("cardio")) return "Strength + Cardio";
    if (selectedWorkoutTypes.includes("cardio")) return "Cardio Session";
    if (selectedWorkoutTypes.includes("conditioning")) return "Conditioning Session";
    if (selectedWorkoutTypes.includes("mobility")) return "Recovery Mobility";
    if (selectedWorkoutTypes.includes("sport")) return "Sport Session";
    if (focusLabel === "Upper Body") return "Upper Body Strength";
    if (focusLabel === "Lower Body") return "Lower Body Strength";
    if (focusLabel === "Full Body") return "Full Body Session";
    return `${titleCase(workoutMode)} Session`;
  }, [activePlanContext, focusLabel, selectedPreset, selectedWorkoutTypes, workoutMode]);

  const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
  const workoutsThisWeek = useMemo(() => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 6);
    const thresholdIso = threshold.toISOString().slice(0, 10);
    return workoutHistory.filter(
      (item) => item.status === "completed" && item.date >= thresholdIso,
    ).length;
  }, [workoutHistory]);
  const currentStreak =
    dashboardSummary?.metrics.streak.current_streak_days ?? 0;
  const canStart = Boolean(activePlanContext) || selectedMuscles.length > 0 || includeCardio || selectedWorkoutTypes.some((type) => type !== "strength");
  const todayPlanWorkout = useMemo(() => {
    if (activePlanContext) {
      return {
        id: activePlanContext.scheduledWorkoutId,
        scheduled_date: new Date().toISOString().slice(0, 10),
        status: "scheduled",
        plan_day: {
          title: activePlanContext.title,
          duration: activePlanContext.durationMinutes
            ? `${activePlanContext.durationMinutes} min`
            : "",
          day_type: activePlanContext.dayType,
        },
      };
    }
    if (!activeUserPlan) return null;
    const today = new Date().toISOString().slice(0, 10);
    return activeUserPlan.scheduled_workouts.find(
      (workout) => workout.scheduled_date === today && workout.status === "scheduled",
    ) ?? null;
  }, [activePlanContext, activeUserPlan]);

  useEffect(() => {
    const context = route.params?.planContext ?? null;
    setActivePlanContext(context);
    if (!context || phase !== "setup") return;
    const mode = planDayTypeToWorkoutMode(context.dayType);
    const muscles = normalizePlanMuscles(
      (context.exercises ?? []).flatMap((exercise) => exercise.muscles ?? []),
    );
    setSelectedPreset(null);
    setWorkoutMode(mode);
    setSelectedWorkoutTypes([mode]);
    setIncludeCardio(mode === "cardio" || mode === "conditioning");
    setSelectedMuscles(muscles);
    setMapSide(muscles.some((muscle) => ["Lats", "Trapezius", "Lower Back"].includes(muscle)) ? "back" : "front");
    setIntensity(planIntensityToOption(context.intensity));
    setExerciseRows(
      context.exercises?.length
        ? context.exercises.slice(0, 8).map((exercise, index) => ({
            id: `plan-exercise-${context.scheduledWorkoutId}-${index}`,
            name: exercise.name,
            volume: exercise.volume ?? "",
            pr: false,
          }))
        : [{ id: "exercise-1", name: "", volume: "", pr: false }],
    );
    setDetailsOpen(Boolean(context.exercises?.length));
  }, [phase, route.params?.planContext]);

  const activeInsight = useMemo(() => {
    if (paused) return "Session paused. Resume when ready.";
    if (elapsedSeconds >= 2700) return "45 min milestone reached.";
    if (elapsedSeconds >= 1200) return "Consistency session in progress.";
    if (elapsedSeconds >= 300) return "Strong start. Keep moving.";
    return "Session active.";
  }, [elapsedSeconds, paused]);

  const completionInsight = useMemo(() => {
    if (selectedMuscles.length >= 3) return `You trained ${selectedMuscles.length} muscle groups.`;
    if (focusLabel === "Upper Body") return "Strong upper body focus.";
    if (focusLabel === "Lower Body") return "Leg day completed.";
    if (focusLabel === "Full Body") return "Balanced strength session.";
    if (workoutMode === "mobility") return "Mobility work logged.";
    if (workoutMode === "cardio") return "Cardio session completed.";
    return "Consistency improving.";
  }, [focusLabel, selectedMuscles.length, workoutMode]);

  useEffect(() => {
    if (phase !== "recording" || startedAt == null || paused) return;
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [paused, phase, startedAt]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const loadDrafts = async () => {
      try {
        const response = await fetchRequiredAuth("/workouts/drafts/", auth);
        if (!response.ok) return;
        const json = (await response.json()) as Array<{
          id: number;
          title: string;
          duration_seconds: number;
          payload: WorkoutPayload;
          created_at: string;
        }>;
        if (!active) return;
        setDrafts(
          json.map((draft) => ({
            id: String(draft.id),
            title: draft.title,
            durationSeconds: draft.duration_seconds,
            createdAt: new Date(draft.created_at).getTime(),
            payload: draft.payload,
          })),
        );
      } catch {
        // Draft loading should not block recording.
      }
    };
    void loadDrafts();
    return () => {
      active = false;
    };
  }, [accessToken, auth]);

  useEffect(() => {
    if (phase !== "recording" || paused) {
      setFillProgress(1);
      return;
    }
    const fillInterval = setInterval(() => {
      setFillProgress((current) => (current >= 1 ? 0.12 : Math.min(1, current + 0.08)));
    }, 110);
    return () => {
      clearInterval(fillInterval);
    };
  }, [paused, phase]);

  const handleMuscleSelection = (selection: MuscleSelection) => {
    setError(null);
    setSelectedPreset(null);
    setSelectedMuscles(selection.allActive);
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setError(null);
    setSelectedPreset(preset.key);
    setWorkoutMode(preset.mode);
    setSelectedWorkoutTypes([preset.mode]);
    setIncludeCardio(Boolean(preset.cardio));
    setSelectedMuscles(uniqueMuscles(preset.muscles));
    if (preset.key === "pull") setMapSide("back");
    if (preset.key === "push" || preset.key === "legs" || preset.key === "upper") setMapSide("front");
  };

  const removeMuscle = (muscle: MuscleName) => {
    setSelectedPreset(null);
    setSelectedMuscles((prev) => prev.filter((item) => item !== muscle));
  };

  const clearSelection = () => {
    setSelectedPreset(null);
    setSelectedMuscles([]);
    setIncludeCardio(false);
    setError(null);
  };

  const startRecording = () => {
    if (!canStart) {
      setError("Choose a preset, muscle, or workout type to start.");
      return;
    }
    setError(null);
    setElapsedSeconds(0);
    setStartedAt(Date.now());
    setPaused(false);
    setCompletedCard(null);
    setPhase("recording");
  };

  const toggleWorkoutType = (type: WorkoutMode) => {
    setError(null);
    setSelectedPreset(null);
    setSelectedWorkoutTypes((current) => {
      const exists = current.includes(type);
      const next = exists
        ? current.length > 1
          ? current.filter((item) => item !== type)
          : current
        : [...current, type];
      setWorkoutMode(next[0] ?? "strength");
      setIncludeCardio(next.includes("cardio") || next.includes("conditioning"));
      return next;
    });
  };

  const togglePause = () => {
    if (paused) {
      setStartedAt(Date.now() - elapsedSeconds * 1000);
      setPaused(false);
      return;
    }
    if (startedAt != null) {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }
    setStartedAt(null);
    setPaused(true);
  };

  const finishRecording = () => {
    let finalElapsed = elapsedSeconds;
    if (!paused && startedAt != null) {
      finalElapsed = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
      setElapsedSeconds(finalElapsed);
    }
    setStartedAt(null);
    setPaused(false);
    upsertDraft(finalElapsed);
    setPhase("review");
  };

  const resetSession = () => {
    setPhase("setup");
    setMapSide("front");
    setSelectedMuscles([]);
    setSelectedPreset(null);
    setWorkoutMode("strength");
    setSelectedWorkoutTypes(["strength"]);
    setIncludeCardio(false);
    setStartedAt(null);
    setElapsedSeconds(0);
    setPaused(false);
    setSaving(false);
    setError(null);
    setIntensity(null);
    setFeeling(null);
    setDetailsOpen(false);
    setExerciseRows([{ id: "exercise-1", name: "", volume: "", pr: false }]);
    setNotes("");
    setCaption("");
    setImageUrl("");
    setSelectedImageUri("");
    setSelectedImageUris([]);
    setSelectedImageIndex(0);
    setImageUploading(false);
    setCurrentDraftId(null);
    setCompletedCard(null);
    setFillProgress(1);
  };

  const updateExerciseRow = (id: string, key: "name" | "volume", value: string) => {
    setExerciseRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  };

  const toggleExercisePr = (id: string) => {
    setExerciseRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, pr: !row.pr } : row)),
    );
  };

  const addExerciseRow = () => {
    setExerciseRows((rows) => [
      ...rows,
      { id: `exercise-${Date.now()}`, name: "", volume: "", pr: false },
    ]);
  };

  const buildPayload = (seconds = elapsedSeconds): WorkoutPayload => {
    const savedExercises = exerciseRows
      .map((row) => ({
        name: row.name.trim(),
        volume: row.volume.trim(),
        pr: row.pr,
      }))
      .filter((row) => row.name || row.volume);
    const prExercises = savedExercises
      .filter((row) => row.pr)
      .map((row) => row.name || "Exercise PR");
    const imageUrls = selectedImageUris.length
      ? selectedImageUris
      : imageUrl.trim()
        ? [imageUrl.trim()]
        : selectedImageUri
          ? [selectedImageUri]
          : [];
    return {
      body_groups: bodyGroups,
      muscles: selectedMuscles,
      body_map_side: mapSide,
      exercise_count: savedExercises.length,
      duration_minutes: Math.max(1, Math.round(seconds / 60)),
      cardio: includeCardio || workoutMode === "cardio" || workoutMode === "conditioning",
      mode: workoutMode,
      modes: selectedWorkoutTypes,
      title: sessionTitle,
      focus_label: focusLabel,
      intensity,
      feeling,
      notes: notes.trim(),
      caption: caption.trim(),
      image_url: imageUrls[0] ?? "",
      image_urls: imageUrls,
      pr: prExercises.join(", "),
      exercises: savedExercises,
    };
  };

  const upsertDraft = (seconds = elapsedSeconds) => {
    const payload = buildPayload(seconds);
    const draftId = currentDraftId ?? `draft-${Date.now()}`;
    const draft: WorkoutDraft = {
      id: draftId,
      title: payload.title,
      durationSeconds: Math.max(1, seconds),
      createdAt: Date.now(),
      payload,
    };
    setCurrentDraftId(draftId);
    setDrafts((items) => [draft, ...items.filter((item) => item.id !== draftId)]);
    void persistDraft(draft);
    return draft;
  };

  const persistDraft = async (draft: WorkoutDraft) => {
    if (!accessToken) return;
    const isServerDraft = /^\d+$/.test(draft.id);
    const request = () =>
      fetchRequiredAuth(`/workouts/drafts/${isServerDraft ? `${draft.id}/` : ""}`, auth, {
        method: isServerDraft ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draft.title,
          duration_seconds: draft.durationSeconds,
          payload: draft.payload,
        }),
      });
    try {
      const response = await request();
      if (!response.ok || isServerDraft) return;
      const saved = (await response.json()) as { id: number };
      setCurrentDraftId(String(saved.id));
      setDrafts((items) =>
        items.map((item) => (item.id === draft.id ? { ...item, id: String(saved.id) } : item)),
      );
    } catch {
      // Keep the local draft if persistence fails.
    }
  };

  const deleteDraftFromApi = async (draftId: string) => {
    if (!accessToken || !/^\d+$/.test(draftId)) return;
    try {
      await fetchRequiredAuth(`/workouts/drafts/${draftId}/`, auth, {
        method: "DELETE",
      });
    } catch {
      // Local removal is enough for the current UI.
    }
  };

  const openDrafts = () => {
    if (phase === "review") {
      upsertDraft();
    }
    setDraftsVisible(true);
  };

  const editDraft = (draft: WorkoutDraft) => {
    const payload = draft.payload;
    setCurrentDraftId(draft.id);
    setSelectedPreset(null);
    setMapSide(payload.body_map_side);
    setSelectedMuscles(payload.muscles);
    setWorkoutMode(payload.mode);
    setSelectedWorkoutTypes(payload.modes?.length ? payload.modes : [payload.mode]);
    setIncludeCardio(payload.cardio);
    setElapsedSeconds(Math.max(1, draft.durationSeconds));
    setStartedAt(null);
    setPaused(false);
    setIntensity(payload.intensity);
    setFeeling(payload.feeling);
    setNotes(payload.notes);
    setCaption(payload.caption);
    const draftImages = Array.isArray(payload.image_urls) && payload.image_urls.length
      ? payload.image_urls
      : payload.image_url
        ? [payload.image_url]
        : [];
    setImageUrl(draftImages.find((item) => /^https?:\/\//i.test(item)) ?? "");
    setSelectedImageUri(draftImages[0] ?? "");
    setSelectedImageUris(draftImages);
    setSelectedImageIndex(0);
    setExerciseRows(
      payload.exercises.length
        ? payload.exercises.map((exercise, index) => ({
            id: `draft-exercise-${draft.id}-${index}`,
            name: exercise.name,
            volume: exercise.volume,
            pr: exercise.pr,
          }))
        : [{ id: "exercise-1", name: "", volume: "", pr: false }],
    );
    setDetailsOpen(Boolean(payload.exercises.length || payload.notes));
    setCompletedCard(null);
    setDraftsVisible(false);
    setPhase("review");
  };

  const discardCurrentWorkout = () => {
    upsertDraft();
    resetSession();
  };

  const pickWorkoutImage = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Allow photo access to attach a workout image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.86,
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 6,
    });
    if (result.canceled || !result.assets.length) return;
    const uris = result.assets.map((asset) => asset.uri).filter(Boolean).slice(0, 6);
    if (!uris.length) return;
    setSelectedImageUris(uris);
    setSelectedImageUri(uris[0] ?? "");
    setSelectedImageIndex(0);
    setImageUrl("");
  };

  const clearWorkoutImage = () => {
    setSelectedImageUri("");
    setSelectedImageUris([]);
    setSelectedImageIndex(0);
    setImageUrl("");
  };

  const uploadWorkoutImage = async (uri: string) => {
    const name = uri.split("/").pop() || `workout-${Date.now()}.jpg`;
    const extension = name.split(".").pop()?.toLowerCase();
    const type =
      extension === "png"
        ? "image/png"
        : extension === "webp"
          ? "image/webp"
          : extension === "heic"
            ? "image/heic"
            : "image/jpeg";
    const formData = new FormData();
    formData.append("image", { uri, name, type } as any);
    return fetchRequiredAuth("/workouts/images/", auth, {
      method: "POST",
      body: formData,
    });
  };

  const postPayload = async (
    payload: WorkoutPayload,
    onPosted: (result: WorkoutLogResponse) => void,
  ) => {
    if (!accessToken) {
      setError("Sign in again to save this workout.");
      return;
    }

    setSaving(true);
    setError(null);

    const runRequest = async (requestPayload: WorkoutPayload) =>
      fetchRequiredAuth("/workouts/log/", auth, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...requestPayload,
          ...(activePlanContext
            ? {
                entry_source: "plan_workout",
                scheduled_workout_id: activePlanContext.scheduledWorkoutId,
                user_plan_id: activePlanContext.userPlanId,
                plan_id: activePlanContext.planId,
                plan_name: activePlanContext.planName,
                plan_day_id: activePlanContext.planDayId,
                planned_week_number: activePlanContext.weekNumber,
                planned_day_key: String(activePlanContext.dayIndex),
              }
            : { entry_source: "recorded_timer" }),
          recorded_seconds: elapsedSeconds,
        }),
      });

    try {
      let payloadToPost = payload;
      const imageCandidates = payload.image_urls.length ? payload.image_urls : payload.image_url ? [payload.image_url] : [];
      const localImages = imageCandidates.filter((item) => item && !/^https?:\/\//i.test(item));
      if (localImages.length) {
        setImageUploading(true);
        const uploadedUrls: string[] = [];
        for (const imageCandidate of imageCandidates) {
          if (!imageCandidate) continue;
          if (/^https?:\/\//i.test(imageCandidate)) {
            uploadedUrls.push(imageCandidate);
            continue;
          }
          const uploadResponse = await uploadWorkoutImage(imageCandidate);
          if (!uploadResponse.ok) {
            const data = await uploadResponse.json().catch(() => null);
            throw new Error(
              data && typeof data.detail === "string"
                ? data.detail
                : "Could not upload image.",
            );
          }
          const uploaded = (await uploadResponse.json()) as { image_url?: string };
          if (uploaded.image_url) uploadedUrls.push(uploaded.image_url);
        }
        if (uploadedUrls.length) {
          payloadToPost = { ...payload, image_url: uploadedUrls[0] ?? "", image_urls: uploadedUrls };
          setImageUrl(uploadedUrls[0] ?? "");
          setSelectedImageUri(uploadedUrls[0] ?? "");
          setSelectedImageUris(uploadedUrls);
          setSelectedImageIndex(0);
        }
      }

      const response = await runRequest(payloadToPost);

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data && typeof data.detail === "string"
            ? data.detail
            : "Could not save workout.",
        );
      }

      const result = (await response.json()) as WorkoutLogResponse;
      onPosted(result);
      invalidateWorkoutData();
      void Promise.all([
        reloadActiveUserPlan(),
        reloadWorkoutHistory(),
        reloadDashboardSummary(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save workout.");
    } finally {
      setImageUploading(false);
      setSaving(false);
    }
  };

  const saveSession = async () => {
    const draft = upsertDraft();
    await postPayload(draft.payload, (result) => {
      setDrafts((items) => items.filter((item) => item.id !== draft.id));
      void deleteDraftFromApi(draft.id);
      setCurrentDraftId(null);
      setCompletedCard({
        title: draft.title,
        durationMinutes: draft.payload.duration_minutes,
        muscles: selectedMuscles,
        activityXp: result.activity_xp ?? 0,
        leaderboardXp: result.leaderboard_xp ?? 0,
        challengePoints: result.challenge_points ?? 0,
      });
      setPhase("complete");
    });
  };

  const postDraft = async (draft: WorkoutDraft) => {
    await postPayload(draft.payload, (result) => {
      setDrafts((items) => items.filter((item) => item.id !== draft.id));
      void deleteDraftFromApi(draft.id);
      if (currentDraftId === draft.id) setCurrentDraftId(null);
      setDraftsVisible(false);
      setCompletedCard({
        title: draft.title,
        durationMinutes: draft.payload.duration_minutes,
        muscles: draft.payload.muscles,
        activityXp: result.activity_xp ?? 0,
        leaderboardXp: result.leaderboard_xp ?? 0,
        challengePoints: result.challenge_points ?? 0,
      });
      setPhase("complete");
    });
  };

  const renderMap = (height: number, readOnly = false) => (
    <View style={[rs.mapFrame, { height }]}>
      <View style={rs.mapFigure}>
        {mapSide === "front" ? (
          <BodyMuscleFront
            isLight={isLight}
            activeMuscles={selectedMuscles}
            onSelectionChange={handleMuscleSelection}
            readOnly={readOnly}
            highlightColor={WORKOUT_ACCENT}
            fillProgress={phase === "recording" && !paused ? fillProgress : 1}
          />
        ) : (
          <BodyMuscleBack
            isLight={isLight}
            activeMuscles={selectedMuscles}
            onSelectionChange={handleMuscleSelection}
            readOnly={readOnly}
            highlightColor={WORKOUT_ACCENT_BLUE}
            fillProgress={phase === "recording" && !paused ? fillProgress : 1}
          />
        )}
      </View>
    </View>
  );

  const renderDualMap = (height: number, readOnly = false) => (
    <View style={[rs.dualMapFrame, { height }]}>
      <View style={rs.dualMapFigure}>
        <BodyMuscleFront
          isLight={isLight}
          activeMuscles={selectedMuscles}
          onSelectionChange={handleMuscleSelection}
          readOnly={readOnly}
          highlightColor={WORKOUT_ACCENT}
          fillProgress={phase === "recording" && !paused ? fillProgress : 1}
        />
      </View>
      <View style={rs.dualMapFigure}>
        <BodyMuscleBack
          isLight={isLight}
          activeMuscles={selectedMuscles}
          onSelectionChange={handleMuscleSelection}
          readOnly={readOnly}
          highlightColor={WORKOUT_ACCENT_BLUE}
          fillProgress={phase === "recording" && !paused ? fillProgress : 1}
        />
      </View>
    </View>
  );

  const renderTimerDial = () => (
    <MotionPulse active={phase === "recording" && !paused}>
      <View style={rs.timerDial}>
        <Svg width="100%" height="100%" viewBox="0 0 240 240" style={StyleSheet.absoluteFillObject}>
          <Circle
            cx="120"
            cy="120"
            r={TIMER_RING_RADIUS}
            stroke="rgba(124,107,255,0.14)"
            strokeWidth="8"
            fill="transparent"
          />
          <Circle
            cx="120"
            cy="120"
            r={TIMER_RING_RADIUS}
            stroke="#6577FF"
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(
              8,
              Math.min(1, elapsedSeconds / TIMER_TARGET_SECONDS) * TIMER_RING_CIRCUMFERENCE,
            )} ${TIMER_RING_CIRCUMFERENCE}`}
            rotation="-90"
            origin="120, 120"
          />
        </Svg>
        <View style={rs.timerDialContent}>
          <View style={rs.activePillCentered}>
            <View style={rs.statusDot} />
            <Text style={rs.statusPillText}>ACTIVE</Text>
          </View>
          <Text style={rs.timerLabel}>Active Time</Text>
          <Text style={rs.timerValue} adjustsFontSizeToFit numberOfLines={1}>
            {formatElapsed(elapsedSeconds)}
          </Text>
          <View style={rs.waveButton}>
            <Ionicons name="pulse-outline" size={23} color="#8EA2FF" />
          </View>
        </View>
      </View>
    </MotionPulse>
  );

  return (
    <ScrollView
      style={rs.screen}
      contentContainerStyle={rs.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={rs.headerRow}>
        <TouchableOpacity style={rs.iconButton} activeOpacity={0.84} onPress={() => navigation.navigate("Home")}>
          <Ionicons name="close" size={23} color={isLight ? "#334155" : "#F8FAFC"} />
        </TouchableOpacity>
        <View style={rs.headerTextBlock}>
          <Text style={rs.headerTitle}>
            {phase === "setup" ? "Today's Session" : phase === "recording" ? "Session Active" : "Workout Completed"}
          </Text>
          <Text style={rs.headerSubtitle}>
            {phase === "setup"
              ? "What are you training today?"
              : phase === "recording"
                ? "You are in training mode."
                : "Turn the work into an activity."}
          </Text>
        </View>
        <TouchableOpacity style={[rs.iconButton, rs.draftsButton]} activeOpacity={0.84} onPress={openDrafts}>
          <Ionicons name="document-text-outline" size={17} color={isLight ? "#475569" : "#CBD5E1"} />
          <Text style={rs.draftsText}>Drafts</Text>
          {drafts.length ? (
            <View style={rs.draftsCount}>
              <Text style={rs.draftsCountText}>{drafts.length}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {todayPlanWorkout ? (
        <View style={rs.todayPlanCard}>
          <View style={rs.todayPlanIcon}>
            <Ionicons name="calendar-outline" size={20} color={isLight ? "#0068BD" : "#93C5FD"} />
          </View>
          <View style={rs.todayPlanCopy}>
            <Text style={rs.todayPlanLabel}>Today's plan workout</Text>
            <Text style={rs.todayPlanTitle} numberOfLines={1}>
              {todayPlanWorkout.plan_day.title}
            </Text>
            <Text style={rs.todayPlanMeta} numberOfLines={1}>
              {todayPlanWorkout.plan_day.duration || `${todayPlanWorkout.plan_day.day_type} session`}
            </Text>
          </View>
        </View>
      ) : null}

      {phase === "setup" ? (
        <MotionEntrance replayKey="setup" style={rs.stagePanel}>
          <View style={rs.heroPanel}>
            <View style={rs.mapHeaderRow}>
              <View>
                <Text style={rs.eyebrow}>Training map</Text>
                <Text style={rs.panelTitle}>Select body focus</Text>
              </View>
              <TouchableOpacity activeOpacity={0.8} onPress={clearSelection}>
                <Text style={rs.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {renderDualMap(300)}
            <Text style={rs.mapHint}>Tap muscles to select</Text>
            <View style={rs.selectedRail}>
              {selectedMuscles.length ? (
                selectedMuscles.map((muscle) => (
                  <TouchableOpacity
                    key={muscle}
                    style={rs.musclePill}
                    activeOpacity={0.78}
                    onPress={() => removeMuscle(muscle)}
                  >
                    <View style={rs.muscleDot} />
                    <Text style={rs.musclePillText} numberOfLines={1}>{muscle}</Text>
                    <Ionicons name="close" size={14} color="#8EA0B8" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={rs.emptySelection}>Tap a muscle or choose a preset.</Text>
              )}
            </View>
          </View>

          <View style={rs.section}>
            <Text style={rs.sectionTitle}>Quick presets</Text>
            <View style={rs.presetGrid}>
              {PRESETS.map((preset) => {
                const selected = selectedPreset === preset.key;
                return (
                  <TouchableOpacity
                    key={preset.key}
                    style={[rs.presetChip, selected && rs.presetChipActive]}
                    activeOpacity={0.86}
                    onPress={() => applyPreset(preset)}
                  >
                    <Ionicons name={preset.icon} size={17} color={selected ? "#FFFFFF" : "#8EA2FF"} />
                    <Text style={[rs.presetText, selected && rs.presetTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={rs.section}>
            <Text style={rs.sectionTitle}>Workout type</Text>
            <View style={rs.typeGrid}>
              {WORKOUT_TYPES.map((item) => {
                const selected = selectedWorkoutTypes.includes(item.key);
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[rs.typeCard, selected && rs.typeCardActive]}
                    activeOpacity={0.86}
                    onPress={() => toggleWorkoutType(item.key)}
                  >
                    <Ionicons name={item.icon} size={19} color={selected ? "#FFFFFF" : "#9FB0C8"} />
                    <Text style={[rs.typeText, selected && rs.typeTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {error ? <Text style={rs.errorText}>{error}</Text> : null}

          <MotionTouchable style={rs.primaryButton} activeOpacity={0.94} onPress={startRecording}>
            <Ionicons name="play" size={18} color="#FFFFFF" />
            <Text style={rs.primaryButtonText}>Start Session</Text>
          </MotionTouchable>
        </MotionEntrance>
      ) : null}

      {phase === "recording" ? (
        <MotionEntrance replayKey="recording" style={rs.stagePanel}>
          <View style={rs.activeHero}>
            <View style={rs.activeTopRow}>
              <TouchableOpacity style={rs.smallIconButton} activeOpacity={0.82}>
                <Ionicons name="expand-outline" size={19} color={isLight ? "#475569" : "#CBD5E1"} />
              </TouchableOpacity>
              {paused ? (
                <View style={[rs.statusPill, rs.statusPillPaused]}>
                  <View style={[rs.statusDot, rs.statusDotPaused]} />
                  <Text style={rs.statusPillText}>PAUSED</Text>
                </View>
              ) : null}
              <TouchableOpacity style={rs.smallIconButton} activeOpacity={0.82}>
                <Ionicons name="settings-outline" size={19} color={isLight ? "#475569" : "#CBD5E1"} />
              </TouchableOpacity>
            </View>
            {renderTimerDial()}
            <Text style={rs.focusEyebrow}>Today's focus</Text>
            <Text style={rs.sessionTitle} numberOfLines={2}>{sessionTitle}</Text>
            <Text style={rs.sessionMuscles} numberOfLines={2}>{muscleText}</Text>
          </View>

          {renderDualMap(260, true)}

          <View style={rs.insightCard}>
            <Ionicons name="sparkles-outline" size={19} color="#8EA2FF" />
            <Text style={rs.insightText}>{activeInsight}</Text>
          </View>

          <View style={rs.progressGrid}>
            <View style={rs.progressCard}>
              <Text style={rs.progressValue}>{currentStreak}</Text>
              <Text style={rs.progressLabel}>Day streak</Text>
            </View>
            <View style={rs.progressCard}>
              <Text style={rs.progressValue}>{workoutsThisWeek}</Text>
              <Text style={rs.progressLabel}>This week</Text>
            </View>
            <View style={[rs.progressCard, rs.progressCardLast]}>
              <Text style={rs.progressValue}>
                {activePlanContext?.durationMinutes ?? 20}
              </Text>
              <Text style={rs.progressLabel}>Min target</Text>
            </View>
          </View>

          <View style={rs.recordingActions}>
            <MotionTouchable style={rs.secondaryAction} activeOpacity={0.9} onPress={togglePause}>
              <Ionicons name={paused ? "play" : "pause"} size={20} color={isLight ? "#334155" : "#F8FAFC"} />
              <Text style={rs.secondaryActionText}>{paused ? "Resume" : "Pause"}</Text>
            </MotionTouchable>
            <MotionTouchable style={rs.finishButton} activeOpacity={0.94} onPress={finishRecording}>
              <View style={rs.stopIcon}>
                <View style={rs.stopSquare} />
              </View>
              <Text style={rs.finishText}>Finish Workout</Text>
            </MotionTouchable>
            <TouchableOpacity style={rs.secondaryAction} activeOpacity={0.86} onPress={() => navigation.navigate("Exercises")}>
              <Ionicons name="add-circle-outline" size={20} color="#8EA2FF" />
              <Text style={rs.secondaryActionText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
          <Text style={rs.finishHint}>Swipe up to finish workout</Text>
        </MotionEntrance>
      ) : null}

      {phase === "review" ? (
        <MotionEntrance replayKey="review" style={rs.stagePanel}>
          <View style={rs.completionPanel}>
            <View style={rs.completionCheck}>
              <Ionicons name="checkmark" size={42} color="#8EA2FF" />
            </View>
            <Text style={rs.completionTitle}>Workout Completed!</Text>
            <Text style={rs.completionSubtitle}>Great work. Review and post your activity.</Text>
            <View style={rs.completeActivityCard}>
              <View style={rs.completeActivityHeader}>
                <View style={rs.completeIconBox}>
                  <Ionicons name="barbell-outline" size={19} color="#AAB7CB" />
                </View>
                <View style={rs.completeHeaderCopy}>
                  <Text style={rs.completeActivityTitle}>{sessionTitle}</Text>
                  <Text style={rs.completeActivityMeta}>{titleCase(workoutMode)} • {focusLabel}</Text>
                </View>
                <View style={rs.completeDurationBlock}>
                  <Text style={rs.completeDuration}>{formatElapsed(elapsedSeconds)}</Text>
                  <Text style={rs.completeDurationLabel}>Duration</Text>
                </View>
              </View>
              <View style={rs.completeVisualRow}>
                <View style={rs.completeMapWrap}>{renderDualMap(200, true)}</View>
                <View style={rs.musclesTrainedList}>
                  <Text style={rs.musclesTrainedTitle}>Muscles Trained</Text>
                  {(selectedMuscles.length ? selectedMuscles.slice(0, 5) : [focusLabel]).map((item) => (
                    <View key={item} style={rs.musclesTrainedItem}>
                      <View style={rs.muscleDot} />
                      <Text style={rs.musclesTrainedText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={rs.summaryCard}>
            <View style={rs.summaryItem}>
              <Text style={rs.summaryValue}>{durationMinutes}</Text>
              <Text style={rs.summaryLabel}>Minutes</Text>
            </View>
            <View style={rs.summaryItem}>
              <Text style={rs.summaryValue}>{titleCase(workoutMode)}</Text>
              <Text style={rs.summaryLabel}>Type</Text>
            </View>
            <View style={rs.summaryItem}>
              <Text style={rs.summaryValue}>{focusLabel}</Text>
              <Text style={rs.summaryLabel}>Focus</Text>
            </View>
          </View>

          <View style={rs.questionBlock}>
            <Text style={rs.questionTitle}>How intense was this session?</Text>
            <View style={rs.optionRow}>
              {INTENSITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[rs.optionChip, intensity === option && rs.optionChipActive]}
                  activeOpacity={0.86}
                  onPress={() => setIntensity(option)}
                >
                  <Text style={[rs.optionText, intensity === option && rs.optionTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={rs.questionBlock}>
            <Text style={rs.questionTitle}>How do you feel?</Text>
            <View style={rs.optionRow}>
              {FEELING_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[rs.optionChip, feeling === option && rs.optionChipActive]}
                  activeOpacity={0.86}
                  onPress={() => setFeeling(option)}
                >
                  <Text style={[rs.optionText, feeling === option && rs.optionTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={rs.shareBlock}>
            <Text style={rs.questionTitle}>Activity post</Text>
            <TextInput
              style={rs.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption"
              placeholderTextColor="#64748B"
              multiline
            />
            <TouchableOpacity
              style={rs.imageUploadButton}
              activeOpacity={0.86}
              onPress={pickWorkoutImage}
              disabled={saving || imageUploading}
            >
              <View style={rs.imageUploadIcon}>
                {imageUploading ? (
                  <ActivityIndicator size="small" color="#8EA2FF" />
                ) : (
                  <Ionicons name="image-outline" size={19} color="#8EA2FF" />
                )}
              </View>
              <View style={rs.imageUploadCopy}>
                <Text style={rs.imageUploadTitle}>
                  {selectedImageUris.length || selectedImageUri || imageUrl ? "Change images" : "Upload images"}
                </Text>
                <Text style={rs.imageUploadSubtitle}>
                  Optional photos for this workout post
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </TouchableOpacity>
            {selectedImageUris.length || selectedImageUri || imageUrl ? (
              <View style={[rs.imagePreviewWrap, { width: imagePreviewWidth }]}>
                {(() => {
                  const previewImages = selectedImageUris.length ? selectedImageUris : [selectedImageUri || imageUrl];
                  return previewImages.length > 1 ? (
                    <View style={rs.imageCounter}>
                      <Text style={rs.imageCounterText}>
                        {Math.min(selectedImageIndex + 1, previewImages.length)}/{previewImages.length}
                      </Text>
                    </View>
                  ) : null;
                })()}
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    const previewImages = selectedImageUris.length ? selectedImageUris : [selectedImageUri || imageUrl];
                    const offsetX = event.nativeEvent.contentOffset.x;
                    setSelectedImageIndex(
                      Math.max(
                        0,
                        Math.min(previewImages.length - 1, Math.round(offsetX / imagePreviewWidth)),
                      ),
                    );
                  }}
                >
                  {(selectedImageUris.length ? selectedImageUris : [selectedImageUri || imageUrl]).map((uri) => (
                    <Image
                      key={uri}
                      source={{ uri }}
                      style={[rs.imagePreview, { width: imagePreviewWidth }]}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={rs.imageRemoveButton}
                  activeOpacity={0.82}
                  onPress={clearWorkoutImage}
                >
                  <Ionicons name="close" size={16} color="#F8FAFC" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <TouchableOpacity style={rs.detailsToggle} activeOpacity={0.86} onPress={() => setDetailsOpen((current) => !current)}>
            <View style={rs.detailsCopy}>
              <Text style={rs.detailsTitle}>Optional details</Text>
              <Text style={rs.detailsSubtitle}>Exercises, PRs, and notes can be added before posting.</Text>
            </View>
            <Ionicons name={detailsOpen ? "chevron-up" : "chevron-down"} size={20} color="#CBD5E1" />
          </TouchableOpacity>

          {detailsOpen ? (
            <View style={rs.detailsPanel}>
              {exerciseRows.map((row) => (
                <View key={row.id} style={rs.exerciseRow}>
                  <TextInput
                    style={rs.exerciseNameInput}
                    value={row.name}
                    onChangeText={(value) => updateExerciseRow(row.id, "name", value)}
                    placeholder="Exercise name"
                    placeholderTextColor="#64748B"
                  />
                  <TextInput
                    style={rs.exerciseVolumeInput}
                    value={row.volume}
                    onChangeText={(value) => updateExerciseRow(row.id, "volume", value)}
                    placeholder="Weight x sets"
                    placeholderTextColor="#64748B"
                  />
                  <TouchableOpacity
                    style={[rs.prToggle, row.pr && rs.prToggleActive]}
                    activeOpacity={0.84}
                    onPress={() => toggleExercisePr(row.id)}
                  >
                    <Text style={[rs.prToggleText, row.pr && rs.prToggleTextActive]}>
                      PR
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={rs.addExerciseRowButton} activeOpacity={0.86} onPress={addExerciseRow}>
                <Ionicons name="add" size={18} color="#8EA2FF" />
                <Text style={rs.addExerciseRowText}>Add more exercises</Text>
              </TouchableOpacity>
              <TextInput
                style={rs.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes"
                placeholderTextColor="#64748B"
                multiline
              />
            </View>
          ) : null}

          <View style={rs.insightCard}>
            <Ionicons name="bulb-outline" size={19} color="#FBBF24" />
            <Text style={rs.insightText}>{completionInsight}</Text>
          </View>

          {error ? <Text style={rs.errorText}>{error}</Text> : null}

          <View style={rs.completionActions}>
            <TouchableOpacity
              style={rs.discardButton}
              activeOpacity={0.86}
              onPress={discardCurrentWorkout}
              disabled={saving}
            >
              <Text style={rs.discardButtonText}>Discard</Text>
            </TouchableOpacity>
            <MotionTouchable
              style={[rs.postButton, saving && { opacity: 0.65 }]}
              activeOpacity={0.94}
              onPress={saveSession}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                  <Text style={rs.primaryButtonText}>Post Activity</Text>
                </>
              )}
            </MotionTouchable>
          </View>
        </MotionEntrance>
      ) : null}

      {phase === "complete" && completedCard ? (
        <MotionEntrance replayKey="complete" style={rs.postedCard}>
          <Ionicons name="checkmark-circle" size={42} color="#34D399" />
          <Text style={rs.postedTitle}>Activity posted</Text>
          <Text style={rs.postedBody}>
            {completedCard.title} • {completedCard.durationMinutes} min
          </Text>
          <View style={rs.summaryCard}>
            <View style={rs.summaryItem}>
              <Text style={rs.summaryValue}>+{completedCard.activityXp}</Text>
              <Text style={rs.summaryLabel}>XP earned</Text>
            </View>
            <View style={rs.summaryItem}>
              <Text style={rs.summaryValue}>{completedCard.leaderboardXp}</Text>
              <Text style={rs.summaryLabel}>Board XP</Text>
            </View>
            <View style={rs.summaryItem}>
              <Text style={rs.summaryValue}>{completedCard.challengePoints}</Text>
              <Text style={rs.summaryLabel}>Challenge pts</Text>
            </View>
          </View>
          <View style={rs.finalActions}>
            <TouchableOpacity style={rs.secondaryWideButton} activeOpacity={0.86} onPress={resetSession}>
              <Text style={rs.secondaryWideButtonText}>Record again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={rs.primarySmallButton} activeOpacity={0.88} onPress={() => navigation.navigate("Home")}>
              <Text style={rs.primarySmallButtonText}>View feed</Text>
            </TouchableOpacity>
          </View>
        </MotionEntrance>
      ) : null}

      <Modal visible={draftsVisible} transparent animationType="fade" onRequestClose={() => setDraftsVisible(false)}>
        <View style={rs.draftsModalRoot}>
          <TouchableOpacity
            style={rs.draftsBackdrop}
            activeOpacity={1}
            onPress={() => setDraftsVisible(false)}
          />
          <View style={rs.draftsSheet}>
            <View style={rs.draftsHeader}>
              <View>
                <Text style={rs.draftsTitle}>Drafts</Text>
                <Text style={rs.draftsSubtitle}>Workouts logged but not posted</Text>
              </View>
              <TouchableOpacity style={rs.smallIconButton} activeOpacity={0.82} onPress={() => setDraftsVisible(false)}>
                <Ionicons name="close" size={19} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
            {drafts.length ? (
              drafts.map((draft) => (
                <View key={draft.id} style={rs.draftItem}>
                  <View style={rs.draftIcon}>
                    <Ionicons name="barbell-outline" size={18} color="#8EA2FF" />
                  </View>
                  <View style={rs.draftCopy}>
                    <Text style={rs.draftTitle} numberOfLines={1}>{draft.title}</Text>
                    <Text style={rs.draftMeta}>
                      {formatElapsed(draft.durationSeconds)} • {draft.payload.focus_label}
                    </Text>
                    {draft.payload.caption ? (
                      <Text style={rs.draftCaption} numberOfLines={1}>{draft.payload.caption}</Text>
                    ) : null}
                  </View>
                  <View style={rs.draftActions}>
                    <TouchableOpacity
                      style={rs.draftEditButton}
                      activeOpacity={0.86}
                      onPress={() => editDraft(draft)}
                      disabled={saving}
                    >
                      <Text style={rs.draftEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={rs.draftPostButton}
                      activeOpacity={0.86}
                      onPress={() => postDraft(draft)}
                      disabled={saving}
                    >
                      <Text style={rs.draftPostText}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={rs.emptyDrafts}>
                <Ionicons name="document-text-outline" size={24} color="#64748B" />
                <Text style={rs.emptyDraftsTitle}>No drafts yet</Text>
                <Text style={rs.emptyDraftsBody}>Finished workouts you have not posted will appear here.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const recordStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 116,
  },
  stagePanel: {
    paddingTop: 2,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  headerRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,31,51,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  draftsButton: {
    width: 104,
    flexDirection: "row",
    paddingHorizontal: 10,
  },
  draftsText: {
    marginLeft: 6,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  draftsCount: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WORKOUT_ACCENT,
  },
  draftsCountText: {
    color: "#07111F",
    fontFamily: fontFamily.uiBold,
    fontSize: 10,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 14,
  },
  headerTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 26,
    lineHeight: 31,
  },
  headerSubtitle: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 19,
  },
  heroPanel: {
    borderRadius: 24,
  },
  mapHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  eyebrow: {
    color: "#8EA2FF",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    lineHeight: 15,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  panelTitle: {
    marginTop: 4,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 20,
    lineHeight: 25,
  },
  clearText: {
    color: "#8EA2FF",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  sideToggle: {
    minHeight: 50,
    padding: 4,
    borderRadius: 17,
    flexDirection: "row",
    backgroundColor: "rgba(12,24,40,0.82)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  sideToggleButton: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sideToggleButtonActive: {
    backgroundColor: WORKOUT_ACCENT,
  },
  sideToggleText: {
    color: "#9FB0C8",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  sideToggleTextActive: {
    color: "#F8FAFC",
  },
  mapFrame: {
    marginTop: 14,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: WORKOUT_CARD_ELEVATED,
    borderWidth: 1,
    borderColor: "rgba(124,107,255,0.18)",
    position: "relative",
  },
  dualMapFrame: {
    marginTop: 14,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: WORKOUT_CARD_ELEVATED,
    borderWidth: 1,
    borderColor: "rgba(124,107,255,0.18)",
    position: "relative",
    flexDirection: "row",
    justifyContent: "center",
  },
  dualMapFigure: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  mapHint: {
    marginTop: 8,
    color: "#9FB0C8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
    textAlign: "center",
  },
  mapFigure: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  selectedRail: {
    minHeight: 70,
    paddingTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  musclePill: {
    maxWidth: "48%",
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,31,53,0.88)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  muscleDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 8,
    backgroundColor: WORKOUT_ACCENT,
  },
  musclePillText: {
    flexShrink: 1,
    marginRight: 6,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  emptySelection: {
    color: "#8EA0B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 17,
    lineHeight: 22,
  },
  presetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  presetChip: {
    width: "22%",
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,31,51,0.7)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  presetChipActive: {
    backgroundColor: "rgba(124,107,255,0.18)",
    borderColor: "rgba(124,107,255,0.58)",
  },
  presetText: {
    marginTop: 5,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
  },
  presetTextActive: {
    color: "#F8FAFC",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -3,
  },
  typeCard: {
    width: "18%",
    minHeight: 84,
    marginHorizontal: 3,
    marginBottom: 9,
    borderRadius: 18,
    padding: 12,
    justifyContent: "space-between",
    backgroundColor: DARK_CARD,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  typeCardActive: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  typeText: {
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  typeTextActive: {
    color: "#FFFFFF",
  },
  primaryButton: {
    marginTop: 24,
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: PS_BLUE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: WORKOUT_ACCENT,
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  primaryButtonText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontFamily: fontFamily.uiBold,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    color: "#FCA5A5",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
  },
  activeHero: {
    borderRadius: 26,
    paddingBottom: 8,
    alignItems: "center",
  },
  activeTopRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statusPill: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34,197,94,0.14)",
  },
  statusPillPaused: {
    backgroundColor: "rgba(251,191,36,0.15)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: "#34D399",
  },
  statusDotPaused: {
    backgroundColor: "#FBBF24",
  },
  statusPillText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    letterSpacing: 0.7,
  },
  smallIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.1)",
  },
  timerValue: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 44,
    lineHeight: 52,
    textAlign: "center",
  },
  timerLabel: {
    color: "#8EA0B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
  },
  timerDial: {
    width: 270,
    height: 270,
    alignItems: "center",
    justifyContent: "center",
  },
  timerDialContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  activePillCentered: {
    minHeight: 31,
    borderRadius: 999,
    paddingHorizontal: 13,
    marginBottom: 26,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.12)",
  },
  waveButton: {
    marginTop: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(100,120,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(124,107,255,0.18)",
  },
  focusEyebrow: {
    marginTop: 2,
    color: "#8EA0B8",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    textTransform: "uppercase",
  },
  sessionTitle: {
    marginTop: 6,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
  },
  sessionMuscles: {
    marginTop: 6,
    color: "#AAB7CB",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  insightCard: {
    marginTop: 16,
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,31,51,0.72)",
    borderWidth: 1,
    borderColor: "rgba(124,107,255,0.18)",
  },
  insightText: {
    flex: 1,
    marginLeft: 10,
    color: "#D8E1EF",
    fontFamily: fontFamily.uiSemi,
    fontSize: 14,
    lineHeight: 20,
  },
  progressGrid: {
    marginTop: 14,
    flexDirection: "row",
  },
  progressCard: {
    flex: 1,
    minHeight: 74,
    borderRadius: 18,
    padding: 12,
    marginRight: 8,
    backgroundColor: "rgba(17,31,51,0.64)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  progressCardLast: {
    marginRight: 0,
  },
  progressValue: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 22,
  },
  progressLabel: {
    marginTop: 4,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 11,
    lineHeight: 15,
  },
  recordingActions: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  secondaryAction: {
    width: 104,
    minHeight: 62,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,31,51,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  secondaryActionText: {
    marginTop: 5,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    textAlign: "center",
  },
  finishButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  stopIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  stopSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#07111F",
  },
  finishText: {
    marginTop: 9,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  completionPanel: {
    borderRadius: 26,
    paddingTop: 16,
    overflow: "hidden",
  },
  completionGlow: {
    position: "absolute",
    top: -60,
    alignSelf: "center",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(52,211,153,0.14)",
  },
  completionEyebrow: {
    color: "#7CFFB2",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    textAlign: "center",
  },
  completionCheck: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(31,48,128,0.42)",
    borderWidth: 2,
    borderColor: "#6478FF",
  },
  completionTitle: {
    marginTop: 8,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 25,
    lineHeight: 31,
    textAlign: "center",
  },
  completionSubtitle: {
    marginTop: 6,
    color: "#AAB7CB",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  summaryCard: {
    marginTop: 16,
    minHeight: 78,
    borderRadius: 20,
    flexDirection: "row",
    backgroundColor: "rgba(17,31,51,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  completeActivityCard: {
    marginTop: 18,
    overflow: "hidden",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  completeActivityHeader: {
    minHeight: 70,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  completeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.12)",
  },
  completeHeaderCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  completeActivityTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  completeActivityMeta: {
    marginTop: 3,
    color: "#8EA2FF",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  completeDurationBlock: {
    alignItems: "flex-end",
  },
  completeDuration: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 16,
  },
  completeDurationLabel: {
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 11,
  },
  completeVisualRow: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  completeMapWrap: {
    flex: 1.3,
    minWidth: 0,
  },
  musclesTrainedList: {
    flex: 0.8,
    paddingLeft: 12,
  },
  musclesTrainedTitle: {
    color: "#CBD5E1",
    fontFamily: fontFamily.uiSemi,
    fontSize: 12,
    marginBottom: 10,
  },
  musclesTrainedItem: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  musclesTrainedText: {
    flex: 1,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  summaryValue: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 16,
    textAlign: "center",
  },
  summaryLabel: {
    marginTop: 4,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 11,
    textTransform: "uppercase",
  },
  questionBlock: {
    marginTop: 22,
  },
  questionTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  optionChip: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    marginRight: 9,
    marginBottom: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,31,51,0.7)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  optionChipActive: {
    backgroundColor: "rgba(124,107,255,0.18)",
    borderColor: "rgba(124,107,255,0.58)",
  },
  optionText: {
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  optionTextActive: {
    color: "#F8FAFC",
  },
  shareBlock: {
    marginTop: 22,
    paddingTop: 18,
    borderTopWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  captionInput: {
    minHeight: 74,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: "rgba(17,31,51,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  imageUploadButton: {
    minHeight: 62,
    borderRadius: 16,
    marginTop: 10,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,31,51,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  imageUploadIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(96,165,250,0.12)",
  },
  imageUploadCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  imageUploadTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  imageUploadSubtitle: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.ui,
    fontSize: 12,
  },
  imagePreviewWrap: {
    marginTop: 12,
    position: "relative",
  },
  imageCounter: {
    position: "absolute",
    top: 10,
    left: 10,
    zIndex: 3,
    minWidth: 42,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  imageCounterText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  imagePreview: {
    width: "100%",
    height: 180,
    borderRadius: 18,
    backgroundColor: "rgba(17,31,51,0.72)",
  },
  imageRemoveButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  detailsToggle: {
    marginTop: 16,
    minHeight: 68,
    borderRadius: 18,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(17,31,51,0.62)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.13)",
  },
  detailsCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  detailsTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  detailsSubtitle: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  detailsPanel: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  finishHint: {
    marginTop: 14,
    color: "#9FB0C8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
    textAlign: "center",
  },
  inputRow: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DARK_CARD,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  inputLabel: {
    flex: 1,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiSemi,
    fontSize: 14,
  },
  input: {
    minWidth: 96,
    textAlign: "right",
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  notesInput: {
    marginTop: 10,
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    backgroundColor: DARK_CARD,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  completionActions: {
    marginTop: 24,
    flexDirection: "row",
  },
  discardButton: {
    flex: 0.8,
    minHeight: 58,
    borderRadius: 20,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,31,51,0.72)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.22)",
  },
  discardButtonText: {
    color: "#FCA5A5",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  postButton: {
    flex: 1.2,
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: PS_BLUE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: WORKOUT_ACCENT,
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  draftsModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.58)",
  },
  draftsBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  draftsSheet: {
    maxHeight: "74%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    backgroundColor: DARK_BG,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  draftsHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  draftsTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 22,
    lineHeight: 28,
  },
  draftsSubtitle: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
  },
  draftItem: {
    minHeight: 82,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  draftIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,107,255,0.12)",
  },
  draftCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  draftTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  draftMeta: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  draftCaption: {
    marginTop: 3,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  draftPostButton: {
    minHeight: 38,
    borderRadius: 14,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PS_BLUE,
  },
  draftActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  draftEditButton: {
    minHeight: 38,
    borderRadius: 14,
    paddingHorizontal: 13,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(17,31,51,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  draftEditText: {
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  draftPostText: {
    color: "#FFFFFF",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  emptyDrafts: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDraftsTitle: {
    marginTop: 10,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 17,
  },
  emptyDraftsBody: {
    marginTop: 5,
    maxWidth: 260,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  exerciseRow: {
    minHeight: 52,
    borderRadius: 16,
    marginBottom: 10,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,31,51,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  exerciseNameInput: {
    flex: 1.1,
    minWidth: 0,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  exerciseVolumeInput: {
    flex: 0.9,
    minWidth: 0,
    marginLeft: 8,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
  },
  prToggle: {
    width: 42,
    height: 32,
    borderRadius: 12,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.1)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  prToggleActive: {
    backgroundColor: "rgba(255,138,31,0.16)",
    borderColor: "rgba(255,138,31,0.72)",
  },
  prToggleText: {
    color: "#AAB7CB",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  prToggleTextActive: {
    color: "#F2C16F",
  },
  addExerciseRowButton: {
    minHeight: 42,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,107,255,0.1)",
  },
  addExerciseRowText: {
    marginLeft: 6,
    color: "#C8D1FF",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  todayPlanCard: {
    minHeight: 76,
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17,31,51,0.78)",
    borderWidth: 1,
    borderColor: "rgba(147,197,253,0.2)",
  },
  todayPlanIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147,197,253,0.12)",
  },
  todayPlanCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  todayPlanLabel: {
    color: "#93C5FD",
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  todayPlanTitle: {
    marginTop: 4,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 16,
  },
  todayPlanMeta: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  postedCard: {
    marginTop: 24,
    borderRadius: 28,
    padding: 22,
    alignItems: "center",
    backgroundColor: "rgba(17,31,51,0.76)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.18)",
  },
  postedTitle: {
    marginTop: 12,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 24,
    lineHeight: 30,
  },
  postedBody: {
    marginTop: 6,
    color: "#AAB7CB",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  finalActions: {
    marginTop: 20,
    flexDirection: "row",
    width: "100%",
  },
  secondaryWideButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DARK_CARD,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  secondaryWideButtonText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  primarySmallButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 17,
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PS_BLUE,
  },
  primarySmallButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
});

const recordLightStyles = StyleSheet.create({
  screen: {
    backgroundColor: LIGHT_BG,
  },
  stagePanel: {
    borderColor: "rgba(0,0,0,0.08)",
  },
  iconButton: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  draftsText: {
    color: "#1F1F1F",
  },
  headerTitle: {
    color: "#1F1F1F",
  },
  headerSubtitle: {
    color: LIGHT_TEXT_MUTED,
  },
  heroPanel: {
    backgroundColor: "transparent",
  },
  eyebrow: {
    color: "#0068BD",
  },
  panelTitle: {
    color: "#1F1F1F",
  },
  clearText: {
    color: "#0068BD",
  },
  sideToggle: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(148,163,184,0.22)",
  },
  sideToggleText: {
    color: LIGHT_TEXT_MUTED,
  },
  mapFrame: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  dualMapFrame: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  mapHint: {
    color: LIGHT_TEXT_MUTED,
  },
  selectedRail: {
    borderColor: "#E5E7EB",
  },
  musclePill: {
    backgroundColor: "#EEF6FF",
    borderColor: "#D5E9FF",
  },
  musclePillText: {
    color: "#0068BD",
  },
  emptySelection: {
    color: LIGHT_TEXT_MUTED,
  },
  sectionTitle: {
    color: "#1F1F1F",
  },
  presetChip: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  presetText: {
    color: "#1F1F1F",
  },
  typeCard: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  typeText: {
    color: "#1F1F1F",
  },
  activeHero: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  smallIconButton: {
    backgroundColor: "rgba(255,255,255,0.48)",
    borderColor: "rgba(148,163,184,0.22)",
  },
  statusPillText: {
    color: "#334155",
  },
  timerDial: {
    backgroundColor: "rgba(255,255,255,0.74)",
  },
  timerLabel: {
    color: LIGHT_TEXT_MUTED,
  },
  timerValue: {
    color: "#1F1F1F",
  },
  focusEyebrow: {
    color: "#0068BD",
  },
  sessionTitle: {
    color: "#1F1F1F",
  },
  sessionMuscles: {
    color: LIGHT_TEXT_MUTED,
  },
  insightCard: {
    backgroundColor: "#EEF6FF",
    borderColor: "#D5E9FF",
  },
  insightText: {
    color: "#1F1F1F",
  },
  progressCard: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  progressValue: {
    color: "#1F1F1F",
  },
  progressLabel: {
    color: LIGHT_TEXT_MUTED,
  },
  secondaryAction: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  secondaryActionText: {
    color: "#1F1F1F",
  },
  finishHint: {
    color: LIGHT_TEXT_MUTED,
  },
  finishText: {
    color: "#334155",
  },
  completionPanel: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  completionTitle: {
    color: "#1F1F1F",
  },
  completionSubtitle: {
    color: LIGHT_TEXT_MUTED,
  },
  summaryCard: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  completeActivityCard: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(148,163,184,0.22)",
  },
  completeActivityTitle: {
    color: "#1F1F1F",
  },
  completeActivityMeta: {
    color: LIGHT_TEXT_MUTED,
  },
  completeDuration: {
    color: "#1F1F1F",
  },
  completeDurationLabel: {
    color: LIGHT_TEXT_MUTED,
  },
  musclesTrainedTitle: {
    color: "#1F1F1F",
  },
  musclesTrainedText: {
    color: "#1F1F1F",
  },
  summaryValue: {
    color: "#1F1F1F",
  },
  summaryLabel: {
    color: LIGHT_TEXT_MUTED,
  },
  questionTitle: {
    color: "#1F1F1F",
  },
  optionChip: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  optionText: {
    color: "#1F1F1F",
  },
  shareBlock: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  captionInput: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: "rgba(148,163,184,0.34)",
    color: "#1F1F1F",
  },
  imageUploadButton: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(148,163,184,0.22)",
  },
  imageUploadTitle: {
    color: "#1F1F1F",
  },
  imageUploadSubtitle: {
    color: LIGHT_TEXT_MUTED,
  },
  detailsToggle: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  detailsTitle: {
    color: "#1F1F1F",
  },
  detailsSubtitle: {
    color: LIGHT_TEXT_MUTED,
  },
  detailsPanel: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(148,163,184,0.22)",
  },
  exerciseRow: {
    backgroundColor: "transparent",
  },
  exerciseNameInput: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: "rgba(148,163,184,0.34)",
    color: "#1F1F1F",
  },
  exerciseVolumeInput: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: "rgba(148,163,184,0.34)",
    color: "#1F1F1F",
  },
  prToggle: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: "rgba(148,163,184,0.34)",
  },
  prToggleText: {
    color: "#1F1F1F",
  },
  notesInput: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: "rgba(148,163,184,0.34)",
    color: "#1F1F1F",
  },
  addExerciseRowButton: {
    backgroundColor: "#EEF6FF",
    borderColor: "#D5E9FF",
  },
  addExerciseRowText: {
    color: "#0068BD",
  },
  discardButton: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(148,163,184,0.22)",
  },
  discardButtonText: {
    color: "#1F1F1F",
  },
  draftsModalRoot: {
    backgroundColor: "rgba(15,23,42,0.34)",
  },
  draftsSheet: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  draftsTitle: {
    color: "#1F1F1F",
  },
  draftsSubtitle: {
    color: LIGHT_TEXT_MUTED,
  },
  draftItem: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(148,163,184,0.22)",
  },
  draftTitle: {
    color: "#1F1F1F",
  },
  draftMeta: {
    color: LIGHT_TEXT_MUTED,
  },
  draftCaption: {
    color: LIGHT_TEXT_MUTED,
  },
  draftEditButton: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(148,163,184,0.34)",
  },
  draftEditText: {
    color: "#1F1F1F",
  },
  emptyDraftsTitle: {
    color: "#1F1F1F",
  },
  emptyDraftsBody: {
    color: LIGHT_TEXT_MUTED,
  },
  todayPlanCard: {
    backgroundColor: "#EEF6FF",
    borderColor: "#D5E9FF",
  },
  todayPlanIcon: {
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  todayPlanLabel: {
    color: "#0068BD",
  },
  todayPlanTitle: {
    color: "#1F1F1F",
  },
  todayPlanMeta: {
    color: LIGHT_TEXT_MUTED,
  },
  postedCard: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#D5E9FF",
  },
  postedTitle: {
    color: "#1F1F1F",
  },
  postedBody: {
    color: LIGHT_TEXT_MUTED,
  },
  secondaryWideButton: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(148,163,184,0.22)",
  },
  secondaryWideButtonText: {
    color: "#1F1F1F",
  },
});

const createRecordStyles = (isLight: boolean) => {
  if (!isLight) return recordStyles;

  const themed: Record<string, unknown> = {};
  Object.keys(recordStyles).forEach((key) => {
    const baseStyle = (recordStyles as Record<string, unknown>)[key];
    const overrideStyle = (recordLightStyles as Record<string, unknown>)[key];
    themed[key] = overrideStyle ? [baseStyle, overrideStyle] : baseStyle;
  });

  return themed as typeof recordStyles;
};

export default RecordScreen;
