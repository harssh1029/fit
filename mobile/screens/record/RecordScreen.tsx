import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import { API_BASE_URL } from "../../api/client";
import { useAuth } from "../../App";
import { useActiveUserPlan } from "../../hooks/useActiveUserPlan";
import { fontFamily } from "../../styles/typography";
import {
  DARK_BG,
  DARK_CARD,
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
  const { activeUserPlan } = useActiveUserPlan();

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
  } | null>(null);
  const [fillProgress, setFillProgress] = useState(1);

  const pulse = useRef(new Animated.Value(0)).current;
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
        let tokenToUse = accessToken;
        let response = await fetch(`${API_BASE_URL}/workouts/drafts/`, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
        });
        if (response.status === 401) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) return;
          tokenToUse = refreshed;
          response = await fetch(`${API_BASE_URL}/workouts/drafts/`, {
            headers: { Authorization: `Bearer ${tokenToUse}` },
          });
        }
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
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    const shouldPulse = phase === "recording" && !paused;
    if (!shouldPulse) {
      pulse.stopAnimation();
      pulse.setValue(0);
      setFillProgress(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1050,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1050,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    if (phase !== "recording") {
      setFillProgress(1);
      return () => {
        loop.stop();
      };
    }
    const fillInterval = setInterval(() => {
      setFillProgress((current) => (current >= 1 ? 0.12 : Math.min(1, current + 0.08)));
    }, 110);
    return () => {
      loop.stop();
      clearInterval(fillInterval);
    };
  }, [paused, phase, pulse]);

  const pulseStyle = {
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.18, 0.58],
    }),
    transform: [
      {
        scale: pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1.08],
        }),
      },
    ],
  };

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
    const request = (token: string) =>
      fetch(`${API_BASE_URL}/workouts/drafts/${isServerDraft ? `${draft.id}/` : ""}`, {
        method: isServerDraft ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draft.title,
          duration_seconds: draft.durationSeconds,
          payload: draft.payload,
        }),
      });
    try {
      let tokenToUse = accessToken;
      let response = await request(tokenToUse);
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) return;
        tokenToUse = refreshed;
        response = await request(tokenToUse);
      }
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
      await fetch(`${API_BASE_URL}/workouts/drafts/${draftId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
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

  const uploadWorkoutImage = async (uri: string, token: string) => {
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
    return fetch(`${API_BASE_URL}/workouts/images/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  };

  const postPayload = async (payload: WorkoutPayload, onPosted: () => void) => {
    if (!accessToken) {
      setError("Sign in again to save this workout.");
      return;
    }

    setSaving(true);
    setError(null);

    const runRequest = async (token: string, requestPayload: WorkoutPayload) =>
      fetch(`${API_BASE_URL}/workouts/log/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
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
      let tokenToUse = accessToken;
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
          let uploadResponse = await uploadWorkoutImage(imageCandidate, tokenToUse);
          if (uploadResponse.status === 401) {
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
              await signOut();
              setError("Session expired. Please sign in again.");
              return;
            }
            tokenToUse = refreshed;
            uploadResponse = await uploadWorkoutImage(imageCandidate, tokenToUse);
          }
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

      let response = await runRequest(tokenToUse, payloadToPost);
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          await signOut();
          setError("Session expired. Please sign in again.");
          return;
        }
        tokenToUse = refreshed;
        response = await runRequest(tokenToUse, payloadToPost);
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data && typeof data.detail === "string"
            ? data.detail
            : "Could not save workout.",
        );
      }

      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save workout.");
    } finally {
      setImageUploading(false);
      setSaving(false);
    }
  };

  const saveSession = async () => {
    const draft = upsertDraft();
    await postPayload(draft.payload, () => {
      setDrafts((items) => items.filter((item) => item.id !== draft.id));
      void deleteDraftFromApi(draft.id);
      setCurrentDraftId(null);
      setCompletedCard({
        title: draft.title,
        durationMinutes: draft.payload.duration_minutes,
        muscles: selectedMuscles,
      });
      setPhase("complete");
    });
  };

  const postDraft = async (draft: WorkoutDraft) => {
    await postPayload(draft.payload, () => {
      setDrafts((items) => items.filter((item) => item.id !== draft.id));
      void deleteDraftFromApi(draft.id);
      if (currentDraftId === draft.id) setCurrentDraftId(null);
      setDraftsVisible(false);
      setCompletedCard({
        title: draft.title,
        durationMinutes: draft.payload.duration_minutes,
        muscles: draft.payload.muscles,
      });
      setPhase("complete");
    });
  };

  const renderMap = (height: number, readOnly = false) => (
    <View style={[recordStyles.mapFrame, { height }]}>
      {phase === "recording" && !paused ? (
        <Animated.View style={[recordStyles.mapGlow, pulseStyle]} />
      ) : null}
      <View style={recordStyles.mapFigure}>
        {mapSide === "front" ? (
          <BodyMuscleFront
            isLight={false}
            activeMuscles={selectedMuscles}
            onSelectionChange={handleMuscleSelection}
            readOnly={readOnly}
            highlightColor={WORKOUT_ACCENT}
            fillProgress={phase === "recording" && !paused ? fillProgress : 1}
          />
        ) : (
          <BodyMuscleBack
            isLight={false}
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
    <View style={[recordStyles.dualMapFrame, { height }]}>
      {phase === "recording" && !paused ? (
        <Animated.View style={[recordStyles.mapGlow, pulseStyle]} />
      ) : null}
      <View style={recordStyles.dualMapFigure}>
        <BodyMuscleFront
          isLight={false}
          activeMuscles={selectedMuscles}
          onSelectionChange={handleMuscleSelection}
          readOnly={readOnly}
          highlightColor={WORKOUT_ACCENT}
          fillProgress={phase === "recording" && !paused ? fillProgress : 1}
        />
      </View>
      <View style={recordStyles.dualMapFigure}>
        <BodyMuscleBack
          isLight={false}
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
    <View style={recordStyles.timerDial}>
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
      <View style={recordStyles.timerDialContent}>
        <View style={recordStyles.activePillCentered}>
          <View style={recordStyles.statusDot} />
          <Text style={recordStyles.statusPillText}>ACTIVE</Text>
        </View>
        <Text style={recordStyles.timerLabel}>Active Time</Text>
        <Text style={recordStyles.timerValue} adjustsFontSizeToFit numberOfLines={1}>
          {formatElapsed(elapsedSeconds)}
        </Text>
        <View style={recordStyles.waveButton}>
          <Ionicons name="pulse-outline" size={23} color="#8EA2FF" />
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={recordStyles.screen}
      contentContainerStyle={recordStyles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={recordStyles.headerRow}>
        <TouchableOpacity style={recordStyles.iconButton} activeOpacity={0.84} onPress={() => navigation.navigate("Home")}>
          <Ionicons name="close" size={23} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={recordStyles.headerTextBlock}>
          <Text style={recordStyles.headerTitle}>
            {phase === "setup" ? "Today's Session" : phase === "recording" ? "Session Active" : "Workout Completed"}
          </Text>
          <Text style={recordStyles.headerSubtitle}>
            {phase === "setup"
              ? "What are you training today?"
              : phase === "recording"
                ? "You are in training mode."
                : "Turn the work into an activity."}
          </Text>
        </View>
        <TouchableOpacity style={[recordStyles.iconButton, recordStyles.draftsButton]} activeOpacity={0.84} onPress={openDrafts}>
          <Ionicons name="document-text-outline" size={17} color="#CBD5E1" />
          <Text style={recordStyles.draftsText}>Drafts</Text>
          {drafts.length ? (
            <View style={recordStyles.draftsCount}>
              <Text style={recordStyles.draftsCountText}>{drafts.length}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {todayPlanWorkout ? (
        <View style={recordStyles.todayPlanCard}>
          <View style={recordStyles.todayPlanIcon}>
            <Ionicons name="calendar-outline" size={20} color="#93C5FD" />
          </View>
          <View style={recordStyles.todayPlanCopy}>
            <Text style={recordStyles.todayPlanLabel}>Today's plan workout</Text>
            <Text style={recordStyles.todayPlanTitle} numberOfLines={1}>
              {todayPlanWorkout.plan_day.title}
            </Text>
            <Text style={recordStyles.todayPlanMeta} numberOfLines={1}>
              {todayPlanWorkout.plan_day.duration || `${todayPlanWorkout.plan_day.day_type} session`}
            </Text>
          </View>
        </View>
      ) : null}

      {phase === "setup" ? (
        <View style={recordStyles.stagePanel}>
          <View style={recordStyles.heroPanel}>
            <View style={recordStyles.mapHeaderRow}>
              <View>
                <Text style={recordStyles.eyebrow}>Training map</Text>
                <Text style={recordStyles.panelTitle}>Select body focus</Text>
              </View>
              <TouchableOpacity activeOpacity={0.8} onPress={clearSelection}>
                <Text style={recordStyles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {renderDualMap(300)}
            <Text style={recordStyles.mapHint}>Tap muscles to select</Text>
            <View style={recordStyles.selectedRail}>
              {selectedMuscles.length ? (
                selectedMuscles.map((muscle) => (
                  <TouchableOpacity
                    key={muscle}
                    style={recordStyles.musclePill}
                    activeOpacity={0.78}
                    onPress={() => removeMuscle(muscle)}
                  >
                    <View style={recordStyles.muscleDot} />
                    <Text style={recordStyles.musclePillText} numberOfLines={1}>{muscle}</Text>
                    <Ionicons name="close" size={14} color="#8EA0B8" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={recordStyles.emptySelection}>Tap a muscle or choose a preset.</Text>
              )}
            </View>
          </View>

          <View style={recordStyles.section}>
            <Text style={recordStyles.sectionTitle}>Quick presets</Text>
            <View style={recordStyles.presetGrid}>
              {PRESETS.map((preset) => {
                const selected = selectedPreset === preset.key;
                return (
                  <TouchableOpacity
                    key={preset.key}
                    style={[recordStyles.presetChip, selected && recordStyles.presetChipActive]}
                    activeOpacity={0.86}
                    onPress={() => applyPreset(preset)}
                  >
                    <Ionicons name={preset.icon} size={17} color={selected ? "#FFFFFF" : "#8EA2FF"} />
                    <Text style={[recordStyles.presetText, selected && recordStyles.presetTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={recordStyles.section}>
            <Text style={recordStyles.sectionTitle}>Workout type</Text>
            <View style={recordStyles.typeGrid}>
              {WORKOUT_TYPES.map((item) => {
                const selected = selectedWorkoutTypes.includes(item.key);
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[recordStyles.typeCard, selected && recordStyles.typeCardActive]}
                    activeOpacity={0.86}
                    onPress={() => toggleWorkoutType(item.key)}
                  >
                    <Ionicons name={item.icon} size={19} color={selected ? "#FFFFFF" : "#9FB0C8"} />
                    <Text style={[recordStyles.typeText, selected && recordStyles.typeTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {error ? <Text style={recordStyles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={recordStyles.primaryButton} activeOpacity={0.9} onPress={startRecording}>
            <Ionicons name="play" size={18} color="#FFFFFF" />
            <Text style={recordStyles.primaryButtonText}>Start Session</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {phase === "recording" ? (
        <View style={recordStyles.stagePanel}>
          <View style={recordStyles.activeHero}>
            <View style={recordStyles.activeTopRow}>
              <TouchableOpacity style={recordStyles.smallIconButton} activeOpacity={0.82}>
                <Ionicons name="expand-outline" size={19} color="#CBD5E1" />
              </TouchableOpacity>
              {paused ? (
                <View style={[recordStyles.statusPill, recordStyles.statusPillPaused]}>
                  <View style={[recordStyles.statusDot, recordStyles.statusDotPaused]} />
                  <Text style={recordStyles.statusPillText}>PAUSED</Text>
                </View>
              ) : null}
              <TouchableOpacity style={recordStyles.smallIconButton} activeOpacity={0.82}>
                <Ionicons name="settings-outline" size={19} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
            {renderTimerDial()}
            <Text style={recordStyles.focusEyebrow}>Today's focus</Text>
            <Text style={recordStyles.sessionTitle} numberOfLines={2}>{sessionTitle}</Text>
            <Text style={recordStyles.sessionMuscles} numberOfLines={2}>{muscleText}</Text>
          </View>

          {renderDualMap(260, true)}

          <View style={recordStyles.insightCard}>
            <Ionicons name="sparkles-outline" size={19} color="#8EA2FF" />
            <Text style={recordStyles.insightText}>{activeInsight}</Text>
          </View>

          <View style={recordStyles.progressGrid}>
            <View style={recordStyles.progressCard}>
              <Text style={recordStyles.progressValue}>3</Text>
              <Text style={recordStyles.progressLabel}>Day streak</Text>
            </View>
            <View style={recordStyles.progressCard}>
              <Text style={recordStyles.progressValue}>4</Text>
              <Text style={recordStyles.progressLabel}>This week</Text>
            </View>
            <View style={recordStyles.progressCard}>
              <Text style={recordStyles.progressValue}>{elapsedSeconds >= 2700 ? "45" : "20"}</Text>
              <Text style={recordStyles.progressLabel}>Min target</Text>
            </View>
          </View>

          <View style={recordStyles.recordingActions}>
            <TouchableOpacity style={recordStyles.secondaryAction} activeOpacity={0.86} onPress={togglePause}>
              <Ionicons name={paused ? "play" : "pause"} size={20} color="#F8FAFC" />
              <Text style={recordStyles.secondaryActionText}>{paused ? "Resume" : "Pause"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={recordStyles.finishButton} activeOpacity={0.9} onPress={finishRecording}>
              <View style={recordStyles.stopIcon}>
                <View style={recordStyles.stopSquare} />
              </View>
              <Text style={recordStyles.finishText}>Finish Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={recordStyles.secondaryAction} activeOpacity={0.86} onPress={() => navigation.navigate("Exercises")}>
              <Ionicons name="add-circle-outline" size={20} color="#8EA2FF" />
              <Text style={recordStyles.secondaryActionText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
          <Text style={recordStyles.finishHint}>Swipe up to finish workout</Text>
        </View>
      ) : null}

      {phase === "review" ? (
        <View style={recordStyles.stagePanel}>
          <View style={recordStyles.completionPanel}>
            <View style={recordStyles.completionCheck}>
              <Ionicons name="checkmark" size={42} color="#8EA2FF" />
            </View>
            <Text style={recordStyles.completionTitle}>Workout Completed!</Text>
            <Text style={recordStyles.completionSubtitle}>Great work. Review and post your activity.</Text>
            <View style={recordStyles.completeActivityCard}>
              <View style={recordStyles.completeActivityHeader}>
                <View style={recordStyles.completeIconBox}>
                  <Ionicons name="barbell-outline" size={19} color="#AAB7CB" />
                </View>
                <View style={recordStyles.completeHeaderCopy}>
                  <Text style={recordStyles.completeActivityTitle}>{sessionTitle}</Text>
                  <Text style={recordStyles.completeActivityMeta}>{titleCase(workoutMode)} • {focusLabel}</Text>
                </View>
                <View style={recordStyles.completeDurationBlock}>
                  <Text style={recordStyles.completeDuration}>{formatElapsed(elapsedSeconds)}</Text>
                  <Text style={recordStyles.completeDurationLabel}>Duration</Text>
                </View>
              </View>
              <View style={recordStyles.completeVisualRow}>
                <View style={recordStyles.completeMapWrap}>{renderDualMap(200, true)}</View>
                <View style={recordStyles.musclesTrainedList}>
                  <Text style={recordStyles.musclesTrainedTitle}>Muscles Trained</Text>
                  {(selectedMuscles.length ? selectedMuscles.slice(0, 5) : [focusLabel]).map((item) => (
                    <View key={item} style={recordStyles.musclesTrainedItem}>
                      <View style={recordStyles.muscleDot} />
                      <Text style={recordStyles.musclesTrainedText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={recordStyles.summaryCard}>
            <View style={recordStyles.summaryItem}>
              <Text style={recordStyles.summaryValue}>{durationMinutes}</Text>
              <Text style={recordStyles.summaryLabel}>Minutes</Text>
            </View>
            <View style={recordStyles.summaryItem}>
              <Text style={recordStyles.summaryValue}>{titleCase(workoutMode)}</Text>
              <Text style={recordStyles.summaryLabel}>Type</Text>
            </View>
            <View style={recordStyles.summaryItem}>
              <Text style={recordStyles.summaryValue}>{focusLabel}</Text>
              <Text style={recordStyles.summaryLabel}>Focus</Text>
            </View>
          </View>

          <View style={recordStyles.questionBlock}>
            <Text style={recordStyles.questionTitle}>How intense was this session?</Text>
            <View style={recordStyles.optionRow}>
              {INTENSITY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[recordStyles.optionChip, intensity === option && recordStyles.optionChipActive]}
                  activeOpacity={0.86}
                  onPress={() => setIntensity(option)}
                >
                  <Text style={[recordStyles.optionText, intensity === option && recordStyles.optionTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={recordStyles.questionBlock}>
            <Text style={recordStyles.questionTitle}>How do you feel?</Text>
            <View style={recordStyles.optionRow}>
              {FEELING_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[recordStyles.optionChip, feeling === option && recordStyles.optionChipActive]}
                  activeOpacity={0.86}
                  onPress={() => setFeeling(option)}
                >
                  <Text style={[recordStyles.optionText, feeling === option && recordStyles.optionTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={recordStyles.shareBlock}>
            <Text style={recordStyles.questionTitle}>Activity post</Text>
            <TextInput
              style={recordStyles.captionInput}
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption"
              placeholderTextColor="#64748B"
              multiline
            />
            <TouchableOpacity
              style={recordStyles.imageUploadButton}
              activeOpacity={0.86}
              onPress={pickWorkoutImage}
              disabled={saving || imageUploading}
            >
              <View style={recordStyles.imageUploadIcon}>
                {imageUploading ? (
                  <ActivityIndicator size="small" color="#8EA2FF" />
                ) : (
                  <Ionicons name="image-outline" size={19} color="#8EA2FF" />
                )}
              </View>
              <View style={recordStyles.imageUploadCopy}>
                <Text style={recordStyles.imageUploadTitle}>
                  {selectedImageUris.length || selectedImageUri || imageUrl ? "Change images" : "Upload images"}
                </Text>
                <Text style={recordStyles.imageUploadSubtitle}>
                  Optional photos for this workout post
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </TouchableOpacity>
            {selectedImageUris.length || selectedImageUri || imageUrl ? (
              <View style={[recordStyles.imagePreviewWrap, { width: imagePreviewWidth }]}>
                {(() => {
                  const previewImages = selectedImageUris.length ? selectedImageUris : [selectedImageUri || imageUrl];
                  return previewImages.length > 1 ? (
                    <View style={recordStyles.imageCounter}>
                      <Text style={recordStyles.imageCounterText}>
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
                      style={[recordStyles.imagePreview, { width: imagePreviewWidth }]}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={recordStyles.imageRemoveButton}
                  activeOpacity={0.82}
                  onPress={clearWorkoutImage}
                >
                  <Ionicons name="close" size={16} color="#F8FAFC" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <TouchableOpacity style={recordStyles.detailsToggle} activeOpacity={0.86} onPress={() => setDetailsOpen((current) => !current)}>
            <View style={recordStyles.detailsCopy}>
              <Text style={recordStyles.detailsTitle}>Optional details</Text>
              <Text style={recordStyles.detailsSubtitle}>Exercises, PRs, and notes can be added before posting.</Text>
            </View>
            <Ionicons name={detailsOpen ? "chevron-up" : "chevron-down"} size={20} color="#CBD5E1" />
          </TouchableOpacity>

          {detailsOpen ? (
            <View style={recordStyles.detailsPanel}>
              {exerciseRows.map((row) => (
                <View key={row.id} style={recordStyles.exerciseRow}>
                  <TextInput
                    style={recordStyles.exerciseNameInput}
                    value={row.name}
                    onChangeText={(value) => updateExerciseRow(row.id, "name", value)}
                    placeholder="Exercise name"
                    placeholderTextColor="#64748B"
                  />
                  <TextInput
                    style={recordStyles.exerciseVolumeInput}
                    value={row.volume}
                    onChangeText={(value) => updateExerciseRow(row.id, "volume", value)}
                    placeholder="Weight x sets"
                    placeholderTextColor="#64748B"
                  />
                  <TouchableOpacity
                    style={[recordStyles.prToggle, row.pr && recordStyles.prToggleActive]}
                    activeOpacity={0.84}
                    onPress={() => toggleExercisePr(row.id)}
                  >
                    <Text style={[recordStyles.prToggleText, row.pr && recordStyles.prToggleTextActive]}>
                      PR
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={recordStyles.addExerciseRowButton} activeOpacity={0.86} onPress={addExerciseRow}>
                <Ionicons name="add" size={18} color="#8EA2FF" />
                <Text style={recordStyles.addExerciseRowText}>Add more exercises</Text>
              </TouchableOpacity>
              <TextInput
                style={recordStyles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes"
                placeholderTextColor="#64748B"
                multiline
              />
            </View>
          ) : null}

          <View style={recordStyles.insightCard}>
            <Ionicons name="bulb-outline" size={19} color="#FBBF24" />
            <Text style={recordStyles.insightText}>{completionInsight}</Text>
          </View>

          {error ? <Text style={recordStyles.errorText}>{error}</Text> : null}

          <View style={recordStyles.completionActions}>
            <TouchableOpacity
              style={recordStyles.discardButton}
              activeOpacity={0.86}
              onPress={discardCurrentWorkout}
              disabled={saving}
            >
              <Text style={recordStyles.discardButtonText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[recordStyles.postButton, saving && { opacity: 0.65 }]}
              activeOpacity={0.9}
              onPress={saveSession}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                  <Text style={recordStyles.primaryButtonText}>Post Activity</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {phase === "complete" && completedCard ? (
        <View style={recordStyles.postedCard}>
          <Ionicons name="checkmark-circle" size={42} color="#34D399" />
          <Text style={recordStyles.postedTitle}>Activity posted</Text>
          <Text style={recordStyles.postedBody}>
            {completedCard.title} • {completedCard.durationMinutes} min
          </Text>
          <View style={recordStyles.finalActions}>
            <TouchableOpacity style={recordStyles.secondaryWideButton} activeOpacity={0.86} onPress={resetSession}>
              <Text style={recordStyles.secondaryWideButtonText}>Record again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={recordStyles.primarySmallButton} activeOpacity={0.88} onPress={() => navigation.navigate("Home")}>
              <Text style={recordStyles.primarySmallButtonText}>View feed</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Modal visible={draftsVisible} transparent animationType="fade" onRequestClose={() => setDraftsVisible(false)}>
        <View style={recordStyles.draftsModalRoot}>
          <TouchableOpacity
            style={recordStyles.draftsBackdrop}
            activeOpacity={1}
            onPress={() => setDraftsVisible(false)}
          />
          <View style={recordStyles.draftsSheet}>
            <View style={recordStyles.draftsHeader}>
              <View>
                <Text style={recordStyles.draftsTitle}>Drafts</Text>
                <Text style={recordStyles.draftsSubtitle}>Workouts logged but not posted</Text>
              </View>
              <TouchableOpacity style={recordStyles.smallIconButton} activeOpacity={0.82} onPress={() => setDraftsVisible(false)}>
                <Ionicons name="close" size={19} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
            {drafts.length ? (
              drafts.map((draft) => (
                <View key={draft.id} style={recordStyles.draftItem}>
                  <View style={recordStyles.draftIcon}>
                    <Ionicons name="barbell-outline" size={18} color="#8EA2FF" />
                  </View>
                  <View style={recordStyles.draftCopy}>
                    <Text style={recordStyles.draftTitle} numberOfLines={1}>{draft.title}</Text>
                    <Text style={recordStyles.draftMeta}>
                      {formatElapsed(draft.durationSeconds)} • {draft.payload.focus_label}
                    </Text>
                    {draft.payload.caption ? (
                      <Text style={recordStyles.draftCaption} numberOfLines={1}>{draft.payload.caption}</Text>
                    ) : null}
                  </View>
                  <View style={recordStyles.draftActions}>
                    <TouchableOpacity
                      style={recordStyles.draftEditButton}
                      activeOpacity={0.86}
                      onPress={() => editDraft(draft)}
                      disabled={saving}
                    >
                      <Text style={recordStyles.draftEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={recordStyles.draftPostButton}
                      activeOpacity={0.86}
                      onPress={() => postDraft(draft)}
                      disabled={saving}
                    >
                      <Text style={recordStyles.draftPostText}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={recordStyles.emptyDrafts}>
                <Ionicons name="document-text-outline" size={24} color="#64748B" />
                <Text style={recordStyles.emptyDraftsTitle}>No drafts yet</Text>
                <Text style={recordStyles.emptyDraftsBody}>Finished workouts you have not posted will appear here.</Text>
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
  mapGlow: {
    position: "absolute",
    left: 24,
    right: 24,
    top: 46,
    bottom: 46,
    borderRadius: 220,
    backgroundColor: "rgba(124,107,255,0.16)",
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

export default RecordScreen;
