import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  SafeAreaView,
  Modal,
  PanResponder,
} from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import {
  API_BASE_URL,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "./api/client";
import {
  DARK_BG,
  DARK_CARD,
  DARK_CARD_ALT,
  DARK_ACCENT_ORANGE,
  DARK_ACCENT_ORANGE_SOFT,
  DARK_TEXT_PRIMARY,
  DARK_TEXT_MUTED,
  LIGHT_BG,
  LIGHT_CARD,
  LIGHT_CARD_ALT,
  LIGHT_ACCENT_ORANGE,
  LIGHT_TEXT_PRIMARY,
  LIGHT_TEXT_MUTED,
  SAGE_GRADIENT_START,
  SAGE_GRADIENT_END,
  GLASS_BG_DARK,
  GLASS_CARD_DARK,
  GLASS_BORDER_DARK,
  GLASS_ACCENT_GREEN,
  GLASS_ACCENT_GREEN_SOFT,
  GLASS_TEXT_PRIMARY,
  GLASS_TEXT_MUTED,
  PS_BLUE,
  PS_CYAN,
} from "./styles/theme";

// Re-export theme colors and constants for feature screens
export { GLASS_ACCENT_GREEN } from "./styles/theme";
export { API_BASE_URL } from "./api/client";

import { ThemeToggle } from "./components/ThemeToggle";
import { styles } from "./styles/appStyles";

// Re-export styles for feature screens
export { styles } from "./styles/appStyles";
import { useUserProfileBasic } from "./hooks/useUserProfileBasic";
import { useDashboardSummary } from "./hooks/useDashboardSummary";
import { useWorkoutHistory } from "./hooks/useWorkoutHistory";
import ChallengesScreen from "./screens/challenges/ChallengesScreen";
import HomeScreen from "./screens/home/HomeScreen";
import ExercisesFeatureScreen from "./screens/exercises/ExerciseListScreen";
import PlansFeatureScreen from "./screens/plans/PlansScreen";
import PlanDetailScreenV2 from "./screens/plans/PlanDetailScreenV2";
import CommunityScreen from "./screens/community/CommunityScreen";
import ConsistencyScreen from "./screens/consistency/ConsistencyScreen";
import LoginScreen from "./screens/auth/LoginScreen";
import RegisterScreen from "./screens/auth/RegisterScreen";
import FitnessAgeDetailScreen from "./screens/home/components/FitnessAgeDetailScreen";
import RaceReadinessDetailScreen from "./screens/home/components/RaceReadinessDetailScreen";
import PercentileDetailScreen from "./screens/home/components/PercentileDetailScreen";
import AccountScreen from "./screens/profile/AccountScreen";

// Backwards-compat export for older imports that referenced HomeScreenInner
// from App.tsx. The real implementation now lives in the Home feature file.
export { default as HomeScreenInner } from "./screens/home/HomeScreen";

// Re-export modals so they can be imported from App.tsx by other screens
export {
  ViewWorkoutWeekModal,
  type ViewWorkoutWeekModalProps,
} from "./screens/plans/components/ViewWorkoutWeekModal";
export {
  ViewNutritionWeekModal,
  type ViewNutritionWeekModalProps,
} from "./screens/plans/components/ViewNutritionWeekModal";
import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  useNavigation,
} from "@react-navigation/native";
import BodyMuscleFront, {
  MuscleName,
  MuscleSelection,
} from "./BodyMuscleFront";
import BodyMuscleBack from "./BodyMuscleBack";
import { FancyWorkoutTypeIcon } from "./TrainingDayIcons";

// Re-export FancyWorkoutTypeIcon for modal components
export { FancyWorkoutTypeIcon } from "./TrainingDayIcons";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import {
  createBottomTabNavigator,
  BottomTabNavigationProp,
  BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

export type Exercise = {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles?: string[];
  movement_pattern?: string;
  equipment?: string[];
  level: string;
  is_compound: boolean;
  is_featured?: boolean;
  thumbnail_url?: string;
  video_url?: string;
  gif_url?: string;
  image_url?: string;
  instructions?: string[];
  target?: string;
  secondary_targets?: string[];
  body_part?: string;
  description?: string;
};

export type LevelFilter = "all" | "beginner" | "intermediate" | "advanced";
export type FilterSheetKey = "muscles" | "mechanic" | "force" | "level" | null;
export type MechanicFilter = "all" | "compound" | "isolation";
export type ForceFilter = "all" | "push" | "pull" | "hold";

export type ExerciseListResponse = {
  /**
   * Total number of matching exercises on the server. This comes from
   * DRF's LimitOffsetPagination and is useful for diagnostics & future UX.
   */
  count?: number;
  /** Next page URL (or null) returned by the backend paginator. */
  next?: string | null;
  /** Previous page URL (or null) returned by the backend paginator. */
  previous?: string | null;
  results: Exercise[];
};

// Page size for the exercises list. This keeps memory usage predictable on
// mobile while still showing a generous slice of the library.
export const EXERCISES_PAGE_SIZE = 20;

// Local images for Barbell Bench Press (top and bottom positions)
const CHEST_PRESS_IMAGE_UP = require("./assets/chest/0.jpg");
const CHEST_PRESS_IMAGE_DOWN = require("./assets/chest/1.jpg");

export type MuscleGroupApi = {
  id: string;
  name: string;
  side: string;
  regions: string[];
  aliases: string[];
};

type TrainingCalendarDay = {
  date: string;
  workouts: number;
};

// Lightweight summary used for the Home dashboard active card (workouts / nutrition)
// When we need the full "Workout design" row layout (exercise + metrics
// like 50kg • 6 reps x 3), use exerciseSegments which reuses the
// ViewWorkoutSegment shape from the Workout design modal.
type ActiveWorkoutSummary = {
  id: string;
  // When derived from a real plan, this links back to the backend PlanDay.id
  planDayId?: number | null;
  // Optional metadata so we can still identify the scheduled plan day even if
  // the numeric PlanDay.id is missing or cannot be parsed.
  planWeekNumber?: number | null;
  // This is the absolute PlanDay.day_index in the plan, not the weekday.
  planDayIndex?: number | null;
  title: string;
  durationMinutes: number;
  durationDisplay?: string; // Original duration string for display (e.g., "100-120 min")
  style: string;
  progressPercent: number; // 0-100, used only to seed initial completion state
  shortDescription?: string;
  exercises?: string[]; // legacy: simple list used in older designs
  exerciseSegments?: ViewWorkoutSegment[]; // Workout design rows
  targetMuscles?: string[]; // for workouts
  dietDetails?: string[]; // for nutrition plans
};

// Static sample content to match the product design; can be wired up to
// real active workout / nutrition data later without changing the card layout.
export const SAMPLE_ACTIVE_WORKOUTS: ActiveWorkoutSummary[] = [
  {
    id: "active_1",
    title: "Full-Body Strength & Conditioning Blast",
    durationMinutes: 32,
    style: "HIIT",
    progressPercent: 100,
    shortDescription:
      "A high-intensity circuit that combines compound lifts and cardio bursts to push your whole body.",
    exercises: ["Bench press", "Push-ups", "Treadmill run"],
    exerciseSegments: [
      {
        id: "deadlift",
        label: "Deadlift",
        primary: "50kg",
        secondary: "6 reps x 3",
      },
      {
        id: "dumbbell_squat_1",
        label: "Dumbbell Squat",
        primary: "10kg",
        secondary: "20 reps x 3",
      },
      {
        id: "barbell_leg_raise",
        label: "Barbell Leg Raise",
        primary: "30kg",
        secondary: "12 reps x 3",
      },
      {
        id: "barbell_row",
        label: "Barbell Row",
        primary: "20kg",
        secondary: "12 reps x 3",
      },
      {
        id: "bench_press",
        label: "Bench Press",
        primary: "30kg",
        secondary: "8 reps x 3",
      },
      {
        id: "dumbbell_squat_2",
        label: "Dumbbell Squat",
        primary: "20kg",
        secondary: "12 reps x 3",
      },
    ],
    targetMuscles: ["Chest", "Back", "Legs", "Core"],
  },
  {
    id: "active_2",
    title: "Full-Body Strength & Conditioning Blast",
    durationMinutes: 32,
    style: "HIIT",
    progressPercent: 25,
    shortDescription:
      "Focuses on controlled tempo and time-under-tension to build strength safely.",
    exercises: [
      "Front squats",
      "Romanian deadlifts",
      "Dumbbell shoulder press",
    ],
    targetMuscles: ["Glutes", "Hamstrings", "Shoulders", "Core"],
  },
  {
    id: "active_3",
    title: "Full-Body Strength & Conditioning Blast",
    durationMinutes: 32,
    style: "HIIT",
    progressPercent: 0,
    shortDescription:
      "Intro friendly version of the full-body session with extra rest and simple movements.",
    exercises: ["Bodyweight squats", "Band rows", "Incline treadmill walk"],
    targetMuscles: ["Quads", "Back", "Arms"],
  },
];

export const SAMPLE_ACTIVE_NUTRITIONS: ActiveWorkoutSummary[] = [
  {
    id: "nutrition_1",
    title: "High-Protein Performance Plan",
    durationMinutes: 7,
    style: "Meal plan",
    progressPercent: 80,
    shortDescription:
      "Daily structure to keep protein high and energy steady around your training.",
    dietDetails: [
      "Breakfast: Oats with whey, berries, and almonds",
      "Lunch: Grilled chicken, brown rice, and vegetables",
      "Snack: Greek yogurt with fruit and nuts",
      "Dinner: Salmon with quinoa and mixed greens",
    ],
  },
  {
    id: "nutrition_2",
    title: "Balanced Recovery Nutrition Guide",
    durationMinutes: 5,
    style: "Nutrition",
    progressPercent: 40,
    shortDescription:
      "Gentle approach that balances carbs, fats, and protein to support recovery days.",
    dietDetails: [
      "Focus on whole grains and colorful vegetables",
      "Include a lean protein source at every meal",
      "Use fruit and nuts for simple snacks",
    ],
  },
  {
    id: "nutrition_3",
    title: "Hydration & Electrolytes Checklist",
    durationMinutes: 3,
    style: "Hydration",
    progressPercent: 10,
    shortDescription:
      "Keep fluids and electrolytes topped up before, during, and after sessions.",
    dietDetails: [
      "Drink 500–700ml water in the hour before training",
      "Sip an electrolyte drink during longer workouts",
      "Add a pinch of salt to one meal if sweating heavily",
    ],
  },
];

const normalizeMuscleLabel = (label: string): string =>
  label
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const getMuscleIdsForSelection = (
  selected: MuscleName[],
  muscleGroups: MuscleGroupApi[],
): string[] => {
  if (!selected.length || !muscleGroups.length) {
    return [];
  }

  const byLabel = new Map<string, string[]>();

  for (const group of muscleGroups) {
    const allNames = [group.name, ...(group.aliases ?? [])];
    for (const raw of allNames) {
      const key = normalizeMuscleLabel(raw);
      const existing = byLabel.get(key);
      if (existing) {
        existing.push(group.id);
      } else {
        byLabel.set(key, [group.id]);
      }
    }
  }

  const result = new Set<string>();
  for (const muscle of selected) {
    const key = normalizeMuscleLabel(muscle);
    const ids = byLabel.get(key);
    if (ids) {
      for (const id of ids) {
        result.add(id);
      }
    }
  }

  return Array.from(result);
};

/**
 * Build the exercises list URL with optional filters. We centralise this in
 * one helper so the same logic is used for initial load, filter changes, and
 * pagination.
 */
export const buildExercisesUrl = (
  baseUrl: string,
  options: {
    limit?: number;
    offset?: number;
    muscleIds?: string[];
    search?: string;
    level?: LevelFilter;
    mechanic?: MechanicFilter;
    force?: ForceFilter;
    startsWith?: string | null;
  },
): string => {
  const params: string[] = [];
  const limitValue = options.limit ?? EXERCISES_PAGE_SIZE;
  params.push(`limit=${encodeURIComponent(String(limitValue))}`);

  if (typeof options.offset === "number" && options.offset > 0) {
    params.push(`offset=${encodeURIComponent(String(options.offset))}`);
  }

  if (options.muscleIds && options.muscleIds.length > 0) {
    params.push(`muscles=${encodeURIComponent(options.muscleIds.join(","))}`);
  }

  if (options.search && options.search.trim().length > 0) {
    params.push(`search=${encodeURIComponent(options.search.trim())}`);
  }

  if (options.level && options.level !== "all") {
    params.push(`level=${encodeURIComponent(options.level)}`);
  }

  if (options.mechanic && options.mechanic !== "all") {
    params.push(`mechanic=${encodeURIComponent(options.mechanic)}`);
  }

  if (options.force && options.force !== "all") {
    params.push(`force=${encodeURIComponent(options.force)}`);
  }

  if (options.startsWith && options.startsWith.trim().length > 0) {
    params.push(
      `starts_with=${encodeURIComponent(options.startsWith.trim()[0])}`,
    );
  }

  const query = params.length ? `?${params.join("&")}` : "";
  return `${baseUrl}/exercises/${query}`;
};

export const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thr",
  "Fri",
  "Sat",
] as const;

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const toISODate = (date: Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const mm = month < 10 ? `0${month}` : `${month}`;
  const dd = day < 10 ? `0${day}` : `${day}`;
  return `${year}-${mm}-${dd}`;
};

export const addDays = (date: Date, amount: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
};

export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  d.setDate(d.getDate() - day);
  return d;
};

const buildSampleCalendarDays = (weekStart: Date): TrainingCalendarDay[] => {
  const days: TrainingCalendarDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const current = addDays(weekStart, i);
    const iso = toISODate(current);
    // Mirror Figma example: workouts on Mon and Thu
    const workouts = i === 1 || i === 4 ? 1 : 0;
    days.push({ date: iso, workouts });
  }
  return days;
};

export const addMonths = (date: Date, amount: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const buildSampleMonthCalendarDays = (
  monthDate: Date,
): TrainingCalendarDay[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: TrainingCalendarDay[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(year, month, day);
    const iso = toISODate(current);
    const weekday = current.getDay();
    // Sample pattern: workouts on Mondays and Thursdays
    const workouts = weekday === 1 || weekday === 4 ? 1 : 0;
    days.push({ date: iso, workouts });
  }
  return days;
};

// Build a month view of calendar days from the dashboard summary "calendar"
// payload. This maps the backend's week slice (range_start, range_end,
// days[ {date, workouts} ]) onto the current month grid used by the
// Training Days calendar. Days outside the provided range default to 0
// workouts.
export const buildMonthCalendarDaysFromDashboard = (
  monthDate: Date,
  calendar: any | null | undefined,
): TrainingCalendarDay[] => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const workoutsByDate = new Map<string, number>();

  if (calendar && Array.isArray((calendar as any).days)) {
    for (const raw of (calendar as any).days as any[]) {
      if (!raw || typeof raw.date !== "string") continue;
      const date = raw.date as string;
      const workoutsValue =
        typeof raw.workouts === "number" && !Number.isNaN(raw.workouts)
          ? (raw.workouts as number)
          : 0;
      workoutsByDate.set(date, workoutsValue);
    }
  }

  const days: TrainingCalendarDay[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(year, month, day);
    const iso = toISODate(current);
    const workouts = workoutsByDate.get(iso) ?? 0;
    days.push({ date: iso, workouts });
  }
  return days;
};

// Map a plan/workout day type to a calendar icon. This is shared between
// completed / missed states so the calendar can visually show whether a day is
// strength, cardio, run, or recovery-focused.
const getIconNameForWorkoutType = (
  type: string | null | undefined,
): string | null => {
  if (!type) return null;
  switch (type) {
    case "strength":
      return "barbell-outline";
    case "cardio":
      return "flame-outline";
    case "run":
      return "stopwatch-outline";
    case "recovery":
    case "rest":
      return "moon-outline";
    default:
      return null;
  }
};

// Map workout day types to icon colours used in the Training Days calendar and
// legend. These are chosen to stay punchy and readable on both the dark glass
// background and the light theme.
const getIconColorForWorkoutType = (
  type: string | null | undefined,
): string => {
  switch (type) {
    case "strength":
      // Warm orange for lifting / strength
      return "#F97316";
    case "cardio":
    case "run":
      // Bright teal/blue for cardio & running
      return "#0EA5E9";
    case "recovery":
    case "rest":
      // Calm indigo for recovery days
      return "#6366F1";
    default:
      // Fallback: dark navy used elsewhere in the UI
      return "#0F172A";
  }
};

export type MuscleFilterSection = {
  id: string;
  title: string;
  muscles: MuscleName[];
};

export const MUSCLE_FILTER_SECTIONS: MuscleFilterSection[] = [
  {
    id: "front_upper",
    title: "Front upper body",
    muscles: ["Neck", "Trapezius", "Deltoids", "Chest", "Biceps", "Forearms"],
  },
  {
    id: "front_core",
    title: "Front core",
    muscles: ["Abs", "Obliques", "Hip Flexors"],
  },
  {
    id: "front_lower",
    title: "Front lower body",
    muscles: ["Quadriceps", "Tibialis", "Calves"],
  },
  {
    id: "back_upper",
    title: "Back upper body",
    muscles: ["Trapezius", "Deltoids", "Triceps", "Forearms", "Lats"],
  },
  {
    id: "back_lower",
    title: "Back lower body",
    muscles: ["Lower Back", "Glutes", "Hamstrings", "Calves"],
  },
];

export type UserProfile = {
  id: number;
  username: string;
  email: string;
  profile: {
    display_name: string;
    height_cm: number | null;
    weight_kg: number | null;
    timezone: string;
    active_plan_id: string | null;
    personal_bests?: Record<string, any>;
  };
};

import type {
  DashboardFitnessAgeMetric,
  DashboardRaceReadinessMetric,
  DashboardPercentileMetric,
  DashboardStreakMetric,
  DashboardTotalTimeMetric,
  DashboardBodyBattleMapMetric,
  DashboardMetrics,
  DashboardSummary,
} from "./types/dashboard";

export const BODY_BATTLE_CANONICAL_LABELS: Record<string, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  arms: "Arms",
  back: "Back",
  core: "Core",
  glutes: "Glutes",
  legs: "Legs",
};

// Order to display muscle groups in the Body Battle Map legend.
export const BODY_BATTLE_GROUP_ORDER: string[] = [
  "shoulders",
  "chest",
  "arms",
  "core",
  "back",
  "glutes",
  "legs",
];

// Rank colours matching the Body Battle Map spec.
export const BODY_BATTLE_RANK_COLORS: Record<string, string> = {
  Legend: "#EF4444",
  Beast: "#FB923C",
  Warrior: "#FACC15",
  Soldier: "#94A3B8",
  Recruit: "#64748B",
};

// Map tapped body‑map muscles to the coarser Body Battle Map groups used
// in the dashboard metric (chest, arms, legs, etc.).
export const MUSCLE_TO_BODY_BATTLE_GROUP: Partial<
  Record<MuscleName, keyof typeof BODY_BATTLE_CANONICAL_LABELS>
> = {
  Chest: "chest",
  Deltoids: "shoulders",
  Neck: "shoulders",
  Trapezius: "shoulders",
  Biceps: "arms",
  Triceps: "arms",
  Forearms: "arms",
  Abs: "core",
  Obliques: "core",
  "Hip Flexors": "core",
  Lats: "back",
  "Lower Back": "back",
  Quadriceps: "legs",
  Hamstrings: "legs",
  Calves: "legs",
  Tibialis: "legs",
  Glutes: "glutes",
};

function getInitials(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  if (!parts.length) return null;
  return parts
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export type WorkoutHistoryEntry = {
  date: string;
  status: "completed" | "missed" | string;
  title: string;
  day_type?: string | null;
  week_number?: number | null;
  scheduled_day_index?: number | null;
  plan_id?: string | number | null;
  plan_name?: string | null;
  user_plan_id?: string | number | null;
  completed_at?: string | null;
};

export type PlanWeek = {
  weekNumber: number;
  title: string;
  focus: string;
  highlights: string[];
};

export type Plan = {
  id: string;
  name: string;
  subtitle?: string | null;
  level: "beginner" | "intermediate" | "advanced";
  durationWeeks: number;
  goal: string; // high-level focus of the plan
  summary: string; // what the plan offers structurally
  audience: string; // who this plan is for
  result: string; // what you can expect after completing the plan
  sessionsPerWeek: number;
  defaultSessionsPerWeek?: number;
  supportedSessionsPerWeek?: number[];
  versions?: PlanVersion[];
  weeks: PlanWeek[];
  userProgress?: PlanUserProgress | null;
};

export type PlanUserProgress = {
  isActive: boolean;
  status: "active" | "completed" | "cancelled" | "paused";
  startedAt: string | null;
  expectedEndAt: string | null;
  currentWeekNumber: number | null;
  completedSessions: number;
  totalSessions: number;
  completionPercent: number;
};

export type PlanVersion = {
  id: string;
  planId: string;
  sessionsPerWeek: number;
  title: string;
  description: string;
  isDefault: boolean;
  isPremium: boolean;
  splitType: string;
  trainingDaysPattern: string[];
  totalSessions: number;
  weeklyStructure: string[];
};

export type ApiPlanExercise = {
  id: number | string;
  order: number;
  label: string;
  primary: string;
  secondary?: string;
};

export type ApiPlanDay = {
  id: number | string;
  day_index: number;
  title: string;
  description: string;
  duration: string;
  day_type: string;
  workout_template_id: string | null;
  nutrition: unknown;
  supplements: unknown;
  exercises?: ApiPlanExercise[];
};

export type ApiPlanWeek = {
  id: number | string;
  number: number;
  title: string;
  focus: string;
  highlights: string[];
  days?: ApiPlanDay[];
};

export type ApiPlan = {
  id: string;
  name: string;
  subtitle?: string | null;
  level: Plan["level"];
  duration_weeks: number;
  default_sessions_per_week?: number;
  goal: string;
  summary: string;
  audience: string;
  result: string;
  sessions_per_week: number;
  long_description?: string | null;
  supported_sessions_per_week?: number[];
  versions?: {
    id: string;
    plan_id: string;
    sessions_per_week: number;
    title: string;
    description: string;
    is_default: boolean;
    is_premium: boolean;
    split_type: string;
    training_days_pattern: string[];
    total_sessions: number;
    weekly_structure: string[];
  }[];
  weeks?: ApiPlanWeek[];
  user_progress?: {
    is_active: boolean;
    status: PlanUserProgress["status"];
    started_at: string | null;
    expected_end_at: string | null;
    current_week_number: number | null;
    completed_sessions: number;
    total_sessions: number;
    completion_percent: number;
  } | null;
};

function mapApiPlanProgress(
  progress: ApiPlan["user_progress"],
): PlanUserProgress | null {
  if (!progress) return null;
  return {
    isActive: progress.is_active,
    status: progress.status,
    startedAt: progress.started_at,
    expectedEndAt: progress.expected_end_at,
    currentWeekNumber: progress.current_week_number,
    completedSessions: progress.completed_sessions,
    totalSessions: progress.total_sessions,
    completionPercent: progress.completion_percent,
  };
}

export function mapApiPlan(api: ApiPlan): Plan {
  return {
    id: api.id,
    name: api.name,
    subtitle: api.subtitle ?? null,
    level: api.level,
    durationWeeks: api.duration_weeks,
    goal: api.goal,
    summary: api.summary,
    audience: api.audience,
    result: api.result,
    sessionsPerWeek: api.sessions_per_week,
    defaultSessionsPerWeek: api.default_sessions_per_week,
    supportedSessionsPerWeek: api.supported_sessions_per_week ?? [],
    versions: (api.versions ?? []).map((version) => ({
      id: version.id,
      planId: version.plan_id,
      sessionsPerWeek: version.sessions_per_week,
      title: version.title,
      description: version.description,
      isDefault: version.is_default,
      isPremium: version.is_premium,
      splitType: version.split_type,
      trainingDaysPattern: version.training_days_pattern ?? [],
      totalSessions: version.total_sessions,
      weeklyStructure: version.weekly_structure ?? [],
    })),
    userProgress: mapApiPlanProgress(api.user_progress),
    weeks: (api.weeks ?? []).map((week) => ({
      weekNumber: week.number,
      title: week.title,
      focus: week.focus,
      highlights: week.highlights ?? [],
    })),
  };
}

function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPlans = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/plans/`);
        if (!response.ok) {
          throw new Error(`Failed to load plans (${response.status})`);
        }

        const json = (await response.json()) as
          | ApiPlan[]
          | { results: ApiPlan[] };
        let apiPlans: ApiPlan[] = [];
        if (Array.isArray(json)) {
          apiPlans = json as ApiPlan[];
        } else if (json && Array.isArray((json as any).results)) {
          apiPlans = (json as any).results as ApiPlan[];
        }

        if (isMounted) {
          setPlans(apiPlans.map(mapApiPlan));
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error loading plans");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadPlans();

    return () => {
      isMounted = false;
    };
  }, []);

  return { plans, loading, error };
}

export type PlanDetail = {
  id: string;
  name: string;
  subtitle?: string | null;
  level: Plan["level"];
  durationWeeks: number;
  goal: string;
  summary: string;
  audience: string;
  result: string;
  sessionsPerWeek: number;
  defaultSessionsPerWeek?: number;
  supportedSessionsPerWeek?: number[];
  versions?: PlanVersion[];
  weeks: PlanWeekDetail[];
  longDescription?: string | null;
  userProgress?: PlanUserProgress | null;
};

function normalizePlanDayNutrition(raw: unknown): PlanDayNutrition | null {
  if (raw == null) return null;

  // Simple string: treat as a single description paragraph.
  if (typeof raw === "string") {
    const description = raw.trim();
    if (!description) return null;
    return { description };
  }

  // Array of strings: treat as bullets.
  if (Array.isArray(raw)) {
    const bullets = raw
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
    if (!bullets.length) return null;
    return { bullets };
  }

  if (typeof raw !== "object") return null;

  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : undefined;
  const descriptionSource =
    typeof obj.description === "string"
      ? obj.description
      : typeof obj.summary === "string"
        ? obj.summary
        : typeof obj.overview === "string"
          ? obj.overview
          : undefined;
  const description = descriptionSource?.trim();

  let bullets: string[] | undefined;
  const bulletKeys = ["bullets", "lines", "items", "points"];
  for (const key of bulletKeys) {
    const maybe = obj[key];
    if (Array.isArray(maybe)) {
      const cleaned = maybe
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item.length > 0);
      if (cleaned.length) {
        bullets = cleaned;
        break;
      }
    }
  }

  if (!title && !description && (!bullets || bullets.length === 0)) {
    return null;
  }

  return {
    title,
    description,
    bullets,
  };
}

export function mapApiPlanDetail(api: ApiPlan): PlanDetail {
  return {
    id: api.id,
    name: api.name,
    subtitle: api.subtitle ?? null,
    level: api.level,
    durationWeeks: api.duration_weeks,
    goal: api.goal,
    summary: api.summary,
    audience: api.audience,
    result: api.result,
    sessionsPerWeek: api.sessions_per_week,
    defaultSessionsPerWeek: api.default_sessions_per_week,
    supportedSessionsPerWeek: api.supported_sessions_per_week ?? [],
    versions: (api.versions ?? []).map((version) => ({
      id: version.id,
      planId: version.plan_id,
      sessionsPerWeek: version.sessions_per_week,
      title: version.title,
      description: version.description,
      isDefault: version.is_default,
      isPremium: version.is_premium,
      splitType: version.split_type,
      trainingDaysPattern: version.training_days_pattern ?? [],
      totalSessions: version.total_sessions,
      weeklyStructure: version.weekly_structure ?? [],
    })),
    userProgress: mapApiPlanProgress(api.user_progress),
    weeks: (api.weeks ?? []).map((week) => ({
      id: String(week.id),
      number: week.number,
      title: week.title,
      description: week.focus,
      days: (week.days ?? []).map((day) => ({
        id: String(day.id),
        day: day.day_index,
        title: day.title,
        duration: day.duration,
        type:
          day.day_type === "cardio" || day.day_type === "recovery"
            ? (day.day_type as PlanDayDetail["type"])
            : "strength",
        exercises: day.description,
        segments: (day.exercises ?? []).map((ex) => ({
          id: String((ex as any).id ?? `${day.id}-${ex.order}`),
          label: ex.label,
          primary: ex.primary,
          secondary: ex.secondary,
        })),
        nutrition: normalizePlanDayNutrition(day.nutrition),
      })),
    })),
    longDescription: api.long_description ?? null,
  };
}

function usePlanDetail(planId: string | null) {
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) {
      setPlan(null);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const loadPlan = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/plans/${planId}/`);
        if (!response.ok) {
          throw new Error(`Failed to load plan (${response.status})`);
        }

        const json = (await response.json()) as ApiPlan;
        if (isMounted) {
          setPlan(mapApiPlanDetail(json));
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error loading plan");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadPlan();

    return () => {
      isMounted = false;
    };
  }, [planId]);

  return { plan, loading, error };
}

export function buildActiveWorkoutsFromPlan(
  plan: PlanDetail | null,
  workoutHistoryItems: WorkoutHistoryEntry[],
  todayIso: string,
): ActiveWorkoutSummary[] {
  // If we don't yet have a structured plan, fall back to the
  // design-time sample content so the UI still renders nicely.
  if (!plan) {
    return SAMPLE_ACTIVE_WORKOUTS.slice(0, 1);
  }

  const entries: { weekNumber: number; day: PlanDayDetail }[] = [];
  for (const week of plan.weeks) {
    for (const day of week.days) {
      entries.push({ weekNumber: week.number, day });
    }
  }

  if (!entries.length) {
    return SAMPLE_ACTIVE_WORKOUTS.slice(0, 1);
  }

  // Sort all plan days by their absolute day index in the plan so we can walk
  // forward through the schedule regardless of week boundaries.
  const sortedByDayIndex = entries
    .filter(
      (entry) =>
        typeof entry.day.day === "number" &&
        !Number.isNaN(entry.day.day as unknown as number),
    )
    .sort((a, b) => (a.day.day ?? 0) - (b.day.day ?? 0));

  if (!sortedByDayIndex.length) {
    return SAMPLE_ACTIVE_WORKOUTS.slice(0, 1);
  }

  let targetEntry: { weekNumber: number; day: PlanDayDetail } =
    sortedByDayIndex[0];

  // Use workout history to find the latest scheduled day (completed or
  // missed) for the active plan, then advance to the next plan day when we
  // move past that date. This prevents the dashboard card from resetting to
  // Week 1 every calendar week and instead walks through the full plan.
  const historyWithIndex = workoutHistoryItems.filter(
    (entry) =>
      typeof entry.scheduled_day_index === "number" &&
      entry.scheduled_day_index !== null &&
      typeof entry.date === "string",
  );

  if (historyWithIndex.length > 0) {
    const sortedHistory = [...historyWithIndex].sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      return 0;
    });

    const latest = sortedHistory[sortedHistory.length - 1];
    const latestIndex = latest.scheduled_day_index as number;
    const latestDate = latest.date;

    if (latestDate < todayIso) {
      // We're past the date of the last known scheduled day, so advance to the
      // next plan day after that index if possible.
      const next = sortedByDayIndex.find(
        (entry) => (entry.day.day ?? 0) > latestIndex,
      );
      targetEntry = next ?? sortedByDayIndex[sortedByDayIndex.length - 1];
    } else {
      // Today is the same as the last scheduled day we've seen in history;
      // show that day (it may already be completed, and the checkbox state is
      // handled separately).
      const current = sortedByDayIndex.find(
        (entry) => entry.day.day === latestIndex,
      );
      if (current) {
        targetEntry = current;
      }
    }
  }

  const { weekNumber, day } = targetEntry;

  const mapped: ActiveWorkoutSummary = (() => {
    // Parse duration - handle formats like "100-120 min" by taking the first number
    let durationNumeric = NaN;
    if (day.duration) {
      const match = day.duration.match(/\d+/);
      if (match) {
        durationNumeric = parseInt(match[0], 10);
      }
    }
    const durationMinutes =
      Number.isFinite(durationNumeric) && durationNumeric > 0
        ? durationNumeric
        : 30;

    let style: string;
    if (day.type === "cardio") style = "Cardio";
    else if (day.type === "recovery") style = "Recovery";
    else style = "Strength";

    const exerciseSegments =
      day.segments && day.segments.length
        ? day.segments.map((segment) => ({
            id: segment.id,
            label: segment.label,
            primary: segment.primary,
            secondary: segment.secondary,
          }))
        : undefined;

    const rawPlanDayId: unknown = (day as any).id;
    const numericPlanDayId =
      typeof rawPlanDayId === "number"
        ? rawPlanDayId
        : typeof rawPlanDayId === "string"
          ? Number(rawPlanDayId)
          : NaN;

    return {
      id: `${plan.id}_w${weekNumber}_d${day.day}`,
      planDayId:
        Number.isFinite(numericPlanDayId) && numericPlanDayId > 0
          ? numericPlanDayId
          : undefined,
      // Also carry enough metadata to identify the scheduled day even if the
      // numeric PlanDay.id is not available on the client for some reason.
      planWeekNumber: weekNumber,
      planDayIndex: day.day,
      title: day.title || plan.name,
      durationMinutes,
      durationDisplay: day.duration || `${durationMinutes} min`, // Keep original or format
      style,
      progressPercent: 0,
      shortDescription: undefined,
      exercises: undefined,
      exerciseSegments,
      targetMuscles: undefined,
      dietDetails: undefined,
    };
  })();

  return [mapped];
}

export function buildActiveNutritionsFromPlan(
  plan: PlanDetail | null,
): ActiveWorkoutSummary[] {
  // If we don't yet have a structured plan or no nutrition info,
  // fall back to a single sample item.
  if (!plan) {
    return SAMPLE_ACTIVE_NUTRITIONS.slice(0, 1);
  }

  const entries: { weekNumber: number; day: PlanDayDetail }[] = [];
  for (const week of plan.weeks) {
    for (const day of week.days) {
      if (day.nutrition) {
        entries.push({ weekNumber: week.number, day });
      }
    }
  }

  if (!entries.length) {
    return SAMPLE_ACTIVE_NUTRITIONS.slice(0, 1);
  }

  const today = new Date();
  const jsWeekday = today.getDay();
  const todayPlanDayIndex = jsWeekday === 0 ? 7 : jsWeekday;

  entries.sort((a, b) => {
    if (a.weekNumber !== b.weekNumber) {
      return a.weekNumber - b.weekNumber;
    }
    return (a.day.day ?? 1) - (b.day.day ?? 1);
  });

  const todayEntry =
    entries.find((entry) => entry.day.day === todayPlanDayIndex) ?? entries[0];

  if (!todayEntry) {
    return SAMPLE_ACTIVE_NUTRITIONS.slice(0, 1);
  }

  const { weekNumber, day } = todayEntry;
  const n = day.nutrition;

  if (!n) {
    return SAMPLE_ACTIVE_NUTRITIONS.slice(0, 1);
  }

  const dietDetails: string[] = [];
  if (n.title) dietDetails.push(n.title);
  if (n.description) dietDetails.push(n.description);
  if (n.bullets && n.bullets.length) {
    for (const bullet of n.bullets) {
      dietDetails.push(bullet);
    }
  }

  if (!dietDetails.length) {
    return SAMPLE_ACTIVE_NUTRITIONS.slice(0, 1);
  }

  const mapped: ActiveWorkoutSummary = {
    id: `${plan.id}_w${weekNumber}_d${day.day}_nutrition`,
    title: day.title || plan.name,
    durationMinutes: 5,
    style: "Nutrition",
    progressPercent: 0,
    shortDescription: undefined,
    exercises: undefined,
    exerciseSegments: undefined,
    targetMuscles: undefined,
    dietDetails,
  };

  return [mapped];
}

export type PlanDayNutrition = {
  title?: string;
  description?: string;
  bullets?: string[];
};

export type PlanDayDetail = {
  id: string;
  day: number;
  title: string;
  exercises: string;
  duration: string;
  type: "strength" | "cardio" | "recovery";
  segments?: {
    id: string;
    label: string;
    primary: string;
    secondary?: string;
  }[];
  nutrition?: PlanDayNutrition | null;
};

export type PlanWeekDetail = {
  id: string;
  number: number;
  title: string;
  description: string;
  days: PlanDayDetail[];
};

// "View workout" weekly template – used to show a full week in
// the bottom sheet with the exact design from the running schedule
// reference (Mon/Tue/Wed/Thu cards).
type ViewWorkoutSegment = {
  id: string;
  label: string;
  primary: string;
  secondary?: string;
};

export type ViewWorkoutDay = {
  id: string;
  weekdayLabel: string; // e.g. "Mon"
  dateLabel: string; // e.g. "02 MAR"
  type: "run" | "strength" | "rest";
  title: string;
  subtitle: string;
  // When backed by a real PlanDay, these link back to the scheduled
  // week/day so we can reconcile with backend workout history.
  planWeekNumber?: number | null;
  planDayIndex?: number | null;
  headerTags?: string[];
  segments?: ViewWorkoutSegment[];
  notes?: string;
  exercises?: string;
};

// WORKOUT DESIGN
// Canonical weekly "workout design" structure used by the
// ViewWorkout bottom sheet (Mon/Tue/Wed/Thu cards in the
// reference). Reuse this shape whenever we need that same
// UI pattern.
export type ViewWorkoutWeek = {
  id: string;
  label: string;
  // Optional numeric week number in the plan, when known.
  weekNumber?: number | null;
  days: ViewWorkoutDay[];
};

// NUTRITION DESIGN
// Simple per-day nutrition structure for the nutrition bottom sheet.
export type ViewNutritionDay = {
  id: string;
  weekdayLabel: string;
  dateLabel: string;
  title?: string;
  description?: string;
  bullets?: string[];
};
export type ViewNutritionWeek = {
  id: string;
  label: string;
  days: ViewNutritionDay[];
};

export function mapPlanWeekToViewWorkoutWeek(
  week: PlanWeekDetail,
): ViewWorkoutWeek {
  return {
    id: week.id,
    label: `Week ${week.number}: ${week.title}`,
    weekNumber: week.number,

    days: week.days.map((day) => {
      const weekdayIndex = Math.max(
        0,
        Math.min(WEEKDAY_LABELS.length - 1, (day.day ?? 1) - 1),
      );
      const weekdayLabel = WEEKDAY_LABELS[weekdayIndex] ?? `Day ${day.day}`;

      const mappedType: ViewWorkoutDay["type"] =
        day.type === "cardio"
          ? "run"
          : day.type === "recovery"
            ? "rest"
            : "strength";

      const exercisesSummary = day.exercises;
      const duration = day.duration;

      return {
        id: day.id,
        weekdayLabel,
        dateLabel: `Day ${day.day}`,
        type: mappedType,
        title: day.title,
        subtitle: duration
          ? `${duration}${exercisesSummary ? ` • ${exercisesSummary}` : ""}`
          : exercisesSummary,
        planWeekNumber: week.number,
        planDayIndex: day.day,
        segments: day.segments?.map((segment) => ({
          id: segment.id,
          label: segment.label,
          primary: segment.primary,
          secondary: segment.secondary,
        })),
        notes: undefined,
        exercises: undefined,
      };
    }),
  };
}

export function mapPlanWeekToViewNutritionWeek(
  week: PlanWeekDetail,
): ViewNutritionWeek | null {
  const days = week.days
    .map((day): ViewNutritionDay | null => {
      const nutrition = day.nutrition;
      if (!nutrition) return null;

      const weekdayIndex = Math.max(
        0,
        Math.min(WEEKDAY_LABELS.length - 1, (day.day ?? 1) - 1),
      );
      const weekdayLabel = WEEKDAY_LABELS[weekdayIndex] ?? `Day ${day.day}`;

      const title = nutrition.title?.trim() || day.title || undefined;
      const description = nutrition.description?.trim();
      const bullets =
        nutrition.bullets && nutrition.bullets.length
          ? nutrition.bullets
          : undefined;

      if (!title && !description && !bullets) {
        return null;
      }

      return {
        id: day.id,
        weekdayLabel,
        dateLabel: `Day ${day.day}`,
        title,
        description,
        bullets,
      };
    })
    .filter((d): d is ViewNutritionDay => d !== null);

  if (!days.length) return null;

  return {
    id: week.id,
    label: `Nutrition • Week ${week.number}: ${week.title}`,
    days,
  };
}
// Small wrapper so that on web we fall back to localStorage instead of expo-secure-store
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// ---------------------------
// Auth context
// ---------------------------

type AuthContextValue = {
  accessToken: string | null;
  refreshToken: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

type AuthState = {
  loading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
};

type ThemeMode = "dark" | "light";

type ThemeContextValue = {
  mode: ThemeMode;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return ctx;
}

type ExercisePrRecord = {
  segmentId: string;
  exerciseLabel: string;
  workoutTitle?: string;
  basePrimary: string;
  baseSecondary?: string;
  prWeight: string;
  prSets: string;
  savedAt: number;
};

type ExercisePrContextValue = {
  prs: ExercisePrRecord[];
  savePr: (record: ExercisePrRecord) => void;
};

const ExercisePrContext = createContext<ExercisePrContextValue | undefined>(
  undefined,
);

export function useExercisePrs(): ExercisePrContextValue {
  const ctx = useContext(ExercisePrContext);
  if (!ctx) {
    throw new Error("useExercisePrs must be used within ExercisePrProvider");
  }
  return ctx;
}

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type MainTabParamList = {
  Home: undefined;
  Plans: undefined;
  Exercises: undefined;
  Challenges: undefined;
  Community: undefined;
  Consistency: undefined;
  Account: undefined;
};

type RootTabNavigation = BottomTabNavigationProp<MainTabParamList>;

export type HomeStackParamList = {
  HomeMain: undefined;
  FitnessAgeDetail: undefined;
  RaceReadinessDetail: undefined;
  PercentileDetail: undefined;
};

type HomeStackNavigation = NativeStackNavigationProp<HomeStackParamList>;

export type PlansStackParamList = {
  PlansHome: undefined;
  PlanDetail: { planId: string };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTabs = createBottomTabNavigator<MainTabParamList>();
const PlansStack = createNativeStackNavigator<PlansStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

const App: React.FC = () => {
  const [state, setState] = useState<AuthState>({
    loading: true,
    accessToken: null,
    refreshToken: null,
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [exercisePrs, setExercisePrs] = useState<ExercisePrRecord[]>([]);

  useEffect(() => {
    const loadTokens = async () => {
      try {
        const [access, refresh] = await Promise.all([
          storage.getItem(ACCESS_TOKEN_KEY),
          storage.getItem(REFRESH_TOKEN_KEY),
        ]);
        setState({
          loading: false,
          accessToken: access,
          refreshToken: refresh,
        });
      } catch {
        setState({ loading: false, accessToken: null, refreshToken: null });
      }
    };

    void loadTokens();
  }, []);

  // Load personal bests from backend when user is authenticated
  useEffect(() => {
    const loadPersonalBests = async () => {
      if (!state.accessToken) return;

      try {
        let response = await fetch(`${API_BASE_URL}/me/`, {
          headers: { Authorization: `Bearer ${state.accessToken}` },
        });

        if (response.status === 401 && state.refreshToken) {
          // Try to refresh token
          const refreshResponse = await fetch(
            `${API_BASE_URL}/auth/jwt/refresh/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh: state.refreshToken }),
            },
          );
          if (refreshResponse.ok) {
            const refreshJson = (await refreshResponse.json()) as {
              access: string;
            };
            await storage.setItem(ACCESS_TOKEN_KEY, refreshJson.access);
            setState((prev) => ({ ...prev, accessToken: refreshJson.access }));

            response = await fetch(`${API_BASE_URL}/me/`, {
              headers: { Authorization: `Bearer ${refreshJson.access}` },
            });
          }
        }

        if (response.ok) {
          const json = (await response.json()) as UserProfile;
          const personalBests = json.profile.personal_bests || {};

          // Convert backend format to ExercisePrRecord array
          const prs: ExercisePrRecord[] = Object.entries(personalBests).map(
            ([segmentId, data]: [string, any]) => ({
              segmentId,
              exerciseLabel: data.exerciseLabel || "",
              workoutTitle: data.workoutTitle,
              basePrimary: data.basePrimary || "",
              baseSecondary: data.baseSecondary,
              prWeight: data.weight || "",
              prSets: data.sets || "",
              savedAt: data.savedAt || Date.now(),
            }),
          );

          setExercisePrs(prs);
        }
      } catch (error) {
        console.error("Error loading personal bests:", error);
      }
    };

    void loadPersonalBests();
  }, [state.accessToken, state.refreshToken]);

  const authContext = useMemo<AuthContextValue>(
    () => ({
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      signIn: async (username, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/jwt/create/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
          throw new Error("Invalid credentials");
        }

        const json = (await response.json()) as {
          access: string;
          refresh: string;
        };

        await storage.setItem(ACCESS_TOKEN_KEY, json.access);
        await storage.setItem(REFRESH_TOKEN_KEY, json.refresh);
        setState({
          loading: false,
          accessToken: json.access,
          refreshToken: json.refresh,
        });
      },
      signUp: async (username, email, password) => {
        const response = await fetch(`${API_BASE_URL}/auth/register/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });

        if (!response.ok) {
          const errBody: any = await response.json().catch(() => ({}));
          const messages: string[] = [];
          if (typeof errBody?.detail === "string") {
            messages.push(errBody.detail);
          }
          if (
            Array.isArray(errBody?.non_field_errors) &&
            errBody.non_field_errors[0]
          ) {
            messages.push(String(errBody.non_field_errors[0]));
          }
          if (Array.isArray(errBody?.username) && errBody.username[0]) {
            messages.push(`Username: ${String(errBody.username[0])}`);
          }
          if (Array.isArray(errBody?.email) && errBody.email[0]) {
            messages.push(`Email: ${String(errBody.email[0])}`);
          }
          if (Array.isArray(errBody?.password) && errBody.password[0]) {
            messages.push(`Password: ${String(errBody.password[0])}`);
          }
          const msg = messages.join("\n") || "Failed to create account";
          throw new Error(msg);
        }

        const json = (await response.json()) as {
          access: string;
          refresh: string;
        };

        await storage.setItem(ACCESS_TOKEN_KEY, json.access);
        await storage.setItem(REFRESH_TOKEN_KEY, json.refresh);
        setState({
          loading: false,
          accessToken: json.access,
          refreshToken: json.refresh,
        });
      },
      signOut: async () => {
        await storage.deleteItem(ACCESS_TOKEN_KEY);
        await storage.deleteItem(REFRESH_TOKEN_KEY);
        setState({ loading: false, accessToken: null, refreshToken: null });
      },
      refreshAccessToken: async () => {
        if (!state.refreshToken) return null;
        const response = await fetch(`${API_BASE_URL}/auth/jwt/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh: state.refreshToken }),
        });
        if (!response.ok) {
          await storage.deleteItem(ACCESS_TOKEN_KEY);
          await storage.deleteItem(REFRESH_TOKEN_KEY);
          setState({ loading: false, accessToken: null, refreshToken: null });
          return null;
        }
        const json = (await response.json()) as { access: string };
        await storage.setItem(ACCESS_TOKEN_KEY, json.access);
        setState((prev) => ({ ...prev, accessToken: json.access }));
        return json.access;
      },
    }),
    [state.accessToken, state.refreshToken],
  );

  const themeContext = useMemo<ThemeContextValue>(
    () => ({
      mode: themeMode,
      toggle: () => {
        setThemeMode((prev) => (prev === "dark" ? "light" : "dark"));
      },
    }),
    [themeMode],
  );

  const savePrToBackend = useCallback(
    async (record: ExercisePrRecord, allPrs: ExercisePrRecord[]) => {
      try {
        let tokenToUse = state.accessToken;
        if (!tokenToUse) return;

        // Build the personal_bests object
        const updatedPrs = [...allPrs];
        const index = updatedPrs.findIndex(
          (existing) => existing.segmentId === record.segmentId,
        );
        if (index >= 0) {
          updatedPrs[index] = record;
        } else {
          updatedPrs.push(record);
        }

        // Convert array to object keyed by segmentId
        const personalBests: Record<string, any> = {};
        updatedPrs.forEach((pr) => {
          personalBests[pr.segmentId] = {
            exerciseLabel: pr.exerciseLabel,
            workoutTitle: pr.workoutTitle,
            basePrimary: pr.basePrimary,
            baseSecondary: pr.baseSecondary,
            weight: pr.prWeight,
            sets: pr.prSets,
            savedAt: pr.savedAt,
          };
        });

        let response = await fetch(`${API_BASE_URL}/me/`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ personal_bests: personalBests }),
        });

        if (response.status === 401) {
          // Try to refresh the token
          const refreshResponse = await fetch(
            `${API_BASE_URL}/auth/jwt/refresh/`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refresh: state.refreshToken }),
            },
          );
          if (!refreshResponse.ok) {
            return;
          }
          const refreshJson = (await refreshResponse.json()) as {
            access: string;
          };
          await storage.setItem(ACCESS_TOKEN_KEY, refreshJson.access);
          setState((prev) => ({ ...prev, accessToken: refreshJson.access }));

          response = await fetch(`${API_BASE_URL}/me/`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${refreshJson.access}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ personal_bests: personalBests }),
          });
        }

        if (!response.ok) {
          console.error("Failed to save PR to backend");
        }
      } catch (error) {
        console.error("Error saving PR:", error);
      }
    },
    [state.accessToken, state.refreshToken],
  );

  const exercisePrContext = useMemo<ExercisePrContextValue>(
    () => ({
      prs: exercisePrs,
      savePr: (record: ExercisePrRecord) => {
        // Update local state immediately
        const updatedPrs = [...exercisePrs];
        const index = updatedPrs.findIndex(
          (existing) => existing.segmentId === record.segmentId,
        );
        if (index >= 0) {
          updatedPrs[index] = record;
        } else {
          updatedPrs.push(record);
        }
        setExercisePrs(updatedPrs);

        // Persist to backend asynchronously
        savePrToBackend(record, exercisePrs);
      },
    }),
    [exercisePrs, savePrToBackend],
  );

  const navigationTheme =
    themeMode === "dark" ? NavigationDarkTheme : NavigationLightTheme;

  if (state.loading) {
    return (
      <View style={styles.fullscreenCenter}>
        <ActivityIndicator color={GLASS_ACCENT_GREEN} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={themeContext}>
      <AuthContext.Provider value={authContext}>
        <ExercisePrContext.Provider value={exercisePrContext}>
          <NavigationContainer theme={navigationTheme}>
            <SafeAreaView
              style={[styles.root, themeMode === "light" && styles.rootLight]}
            >
              <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
              {state.accessToken ? (
                <MainTabsNavigator />
              ) : (
                <AuthStackNavigator />
              )}
            </SafeAreaView>
          </NavigationContainer>
        </ExercisePrContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
};

export default App;

// ---------------------------
// Navigation containers
// ---------------------------

export type PlansHomeProps = NativeStackScreenProps<
  PlansStackParamList,
  "PlansHome"
>;
export type PlanDetailProps = NativeStackScreenProps<
  PlansStackParamList,
  "PlanDetail"
>;

const AuthStackNavigator: React.FC = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: styles.root,
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const PlansStackNavigator: React.FC = () => (
  <PlansStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: styles.root,
    }}
  >
    <PlansStack.Screen name="PlansHome" component={PlansFeatureScreen} />
    <PlansStack.Screen name="PlanDetail" component={PlanDetailScreenV2} />
  </PlansStack.Navigator>
);

const HomeStackNavigator: React.FC = () => (
  <HomeStack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: styles.root,
    }}
  >
    <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    <HomeStack.Screen
      name="FitnessAgeDetail"
      component={FitnessAgeDetailScreen}
    />
    <HomeStack.Screen
      name="RaceReadinessDetail"
      component={RaceReadinessDetailScreen}
    />
    <HomeStack.Screen
      name="PercentileDetail"
      component={PercentileDetailScreen}
    />
  </HomeStack.Navigator>
);

type TabBarIconProps = {
  routeName: string;
  focused: boolean;
  isLight: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

const getTabConfig = (routeName: string) => {
  let iconName: keyof typeof Ionicons.glyphMap;
  let label: string;

  switch (routeName) {
    case "Home":
      iconName = "home-outline";
      label = "Home";
      break;
    case "Plans":
      iconName = "calendar-outline";
      label = "Plans";
      break;
    case "Exercises":
      iconName = "barbell-outline";
      label = "Exercises";
      break;
    case "Challenges":
      iconName = "trophy-outline";
      label = "Challenges";
      break;
    case "Community":
      iconName = "people-outline";
      label = "Community";
      break;
    default:
      iconName = "ellipse";
      label = routeName;
  }

  return { iconName, label };
};

const AppTabBarItem: React.FC<TabBarIconProps> = ({
  routeName,
  focused,
  isLight,
  onPress,
  onLongPress,
  accessibilityLabel,
  testID,
}) => {
  const selectionProgress = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const { iconName, label } = getTabConfig(routeName);

  useEffect(() => {
    Animated.spring(selectionProgress, {
      toValue: focused ? 1 : 0,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [focused, selectionProgress]);

  const activeIconColor = "#FFFFFF";
  const inactiveIconColor = isLight ? "#64748B" : "#94A3B8";
  const iconColor = focused ? activeIconColor : inactiveIconColor;
  const iconAnimatedStyle = {
    transform: [
      {
        translateY: selectionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -2],
        }),
      },
      {
        scale: selectionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
  };
  const dotAnimatedStyle = {
    opacity: selectionProgress,
    transform: [
      {
        scaleX: selectionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.35, 1],
        }),
      },
    ],
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      activeOpacity={0.88}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tabBarItem, focused && styles.tabBarItemActive]}
    >
      <Animated.View
        style={[
          styles.tabBarIconContainer,
          isLight && styles.tabBarIconContainerLight,
          focused &&
            (isLight
              ? styles.tabBarIconContainerActiveLight
              : styles.tabBarIconContainerActive),
          iconAnimatedStyle,
        ]}
      >
        <Ionicons name={iconName} size={21} color={iconColor} />
        {focused && (
          <Text style={styles.tabBarActiveLabel} numberOfLines={1}>
            {label}
          </Text>
        )}
      </Animated.View>
      <Animated.View
        style={[
          styles.tabBarActiveDot,
          focused && styles.tabBarActiveDotVisible,
          focused && isLight && styles.tabBarActiveDotVisibleLight,
          dotAnimatedStyle,
        ]}
      />
    </TouchableOpacity>
  );
};

const AppTabBar: React.FC<BottomTabBarProps & { isLight: boolean }> = ({
  state,
  descriptors,
  navigation,
  isLight,
}) => {
  const visibleTabNames = ["Home", "Plans", "Exercises", "Challenges", "Community"];
  const visibleRoutes = state.routes.filter((route) =>
    visibleTabNames.includes(route.name),
  );

  return (
    <View style={[styles.tabBar, isLight && styles.tabBarLight]}>
      {visibleRoutes.map((route) => {
        const options = descriptors[route.key]?.options ?? {};
        const isFocused = state.routes[state.index]?.key === route.key;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <AppTabBarItem
            key={route.key}
            routeName={route.name}
            focused={isFocused}
            isLight={isLight}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
          />
        );
      })}
    </View>
  );
};

const MainTabsNavigator: React.FC = () => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";

  return (
    <MainTabs.Navigator
      tabBar={(props) => <AppTabBar {...props} isLight={isLight} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <MainTabs.Screen name="Home" component={HomeStackNavigator} />
      <MainTabs.Screen name="Plans" component={PlansStackNavigator} />
      <MainTabs.Screen name="Exercises" component={ExercisesFeatureScreen} />
      <MainTabs.Screen name="Challenges" component={ChallengesScreen} />
      <MainTabs.Screen name="Community" component={CommunityScreen} />
      <MainTabs.Screen
        name="Consistency"
        component={ConsistencyScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
      {/* Hidden tab used only for navigating to the Account/profile screen */}
      <MainTabs.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarButton: () => null,
        }}
      />
    </MainTabs.Navigator>
  );
};

// ---------------------------
// Screens
// ---------------------------

export const HeaderAvatar: React.FC<{
  isLight: boolean;
  name?: string | null;
}> = ({ isLight, name }) => {
  const navigation = useNavigation<RootTabNavigation>();
  const initials = getInitials(name) ?? "FIT";
  const compactInitials = initials.length > 2 ? initials.slice(0, 2) : initials;

  return (
    <TouchableOpacity
      style={[
        styles.homeAvatar,
        isLight && styles.homeAvatarLight,
        { marginLeft: 12 },
      ]}
      activeOpacity={0.8}
      onPress={() => navigation.navigate("Account")}
    >
      <View
        style={[
          styles.homeAvatarStatusDot,
          isLight && styles.homeAvatarStatusDotLight,
        ]}
      />
      <Text
        style={[
          styles.homeAvatarInitials,
          isLight && styles.homeAvatarInitialsLight,
        ]}
      >
        {compactInitials}
      </Text>
    </TouchableOpacity>
  );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type MetricGaugeProps = {
  progress: number | null;
  isLight: boolean;
  size?: "large" | "small" | "xlarge";
  leftLabel?: string;
  rightLabel?: string;
  centerText?: string | null;
  centerSubText?: string | null;
};

export const MetricGauge: React.FC<MetricGaugeProps> = ({
  progress,
  isLight,
  size = "large",
  leftLabel,
  rightLabel,
  centerText,
  centerSubText,
}) => {
  const clamped =
    typeof progress === "number" ? Math.max(0, Math.min(1, progress)) : 0;

  const radius = size === "small" ? 26 : size === "xlarge" ? 60 : 38;
  const strokeWidth = size === "small" ? 5 : size === "xlarge" ? 8 : 7;
  const viewBoxSize = radius * 2;
  const effectiveRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * effectiveRadius;

  const animated = useRef(new Animated.Value(0)).current;
  const valueAnimated = useRef(new Animated.Value(0)).current;
  const [displayCenterText, setDisplayCenterText] = useState<string | null>(
    centerText ?? null,
  );

  // Animate gauge arc
  useEffect(() => {
    Animated.timing(animated, {
      toValue: clamped,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, animated]);

  // Animate numeric center text from 0 -> target when value is numeric
  useEffect(() => {
    if (!centerText) {
      setDisplayCenterText(null);
      return;
    }

    const numeric =
      centerText !== "..." && centerText !== "--" ? Number(centerText) : null;

    if (numeric == null || Number.isNaN(numeric)) {
      setDisplayCenterText(centerText);
      return;
    }

    valueAnimated.stopAnimation();
    valueAnimated.setValue(0);

    const listenerId = valueAnimated.addListener(({ value }) => {
      setDisplayCenterText(String(Math.round(value)));
    });

    Animated.timing(valueAnimated, {
      toValue: numeric,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      valueAnimated.removeListener(listenerId);
      setDisplayCenterText(String(Math.round(numeric)));
    });

    return () => {
      valueAnimated.removeListener(listenerId);
    };
  }, [centerText, valueAnimated]);

  const strokeDashoffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const trackColor = isLight ? "#E5E7EB" : "#111827";
  const fillColor = PS_BLUE;

  return (
    <View
      style={[
        styles.metricGaugeContainer,
        size === "small" && styles.metricGaugeContainerSmall,
      ]}
    >
      <View style={styles.metricGaugeSvgWrapper}>
        <Svg
          width={viewBoxSize}
          height={viewBoxSize}
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          style={styles.metricGaugeSvg}
        >
          <Circle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={effectiveRadius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={0}
          />
          <AnimatedCircle
            cx={viewBoxSize / 2}
            cy={viewBoxSize / 2}
            r={effectiveRadius}
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
          />
        </Svg>
        {centerText && (
          <View style={styles.metricGaugeCenter} pointerEvents="none">
            <Text
              style={[
                styles.metricGaugeCenterPrimary,
                size === "small" && styles.metricGaugeCenterPrimarySmall,
                size === "xlarge" && styles.metricGaugeCenterPrimaryXlarge,
                isLight && styles.metricGaugeCenterPrimaryLight,
              ]}
            >
              {displayCenterText ?? centerText}
            </Text>
            {centerSubText ? (
              <Text
                style={[
                  styles.metricGaugeCenterSecondary,
                  size === "small" && styles.metricGaugeCenterSecondarySmall,
                  size === "xlarge" && styles.metricGaugeCenterSecondaryXlarge,
                  isLight && styles.metricGaugeCenterSecondaryLight,
                ]}
              >
                {centerSubText}
              </Text>
            ) : null}
          </View>
        )}
      </View>
      {(leftLabel || rightLabel) && (
        <View style={styles.metricGaugeLabelRow}>
          <Text
            style={[
              styles.metricGaugeLabel,
              isLight && styles.metricGaugeLabelLight,
            ]}
          >
            {leftLabel ?? ""}
          </Text>
          <Text
            style={[
              styles.metricGaugeLabel,
              isLight && styles.metricGaugeLabelLight,
            ]}
          >
            {rightLabel ?? ""}
          </Text>
        </View>
      )}
    </View>
  );
};

type PercentileCurveProps = {
  isLight: boolean;
  percentile: number | null;
};

export const PercentileCurve: React.FC<PercentileCurveProps> = ({
  isLight,
  percentile,
}) => {
  const stroke = isLight ? "#CBD5E1" : "#1F2937";
  const markerColor = isLight ? "#0EA5E9" : "#38BDF8";
  const clamped =
    percentile != null ? Math.max(0, Math.min(100, percentile)) : null;

  return (
    <View style={styles.metricCurveContainer}>
      <Svg viewBox="0 0 100 40" style={styles.metricCurveSvg}>
        <Path
          d="M 0 30 Q 25 10 50 15 T 100 30"
          fill="none"
          stroke={stroke}
          strokeWidth={2}
        />
        {clamped != null && (
          <Path
            d={`M ${clamped} 30 L ${clamped} 8`}
            fill="none"
            stroke={markerColor}
            strokeWidth={1.5}
            strokeDasharray="2 3"
          />
        )}
      </Svg>
    </View>
  );
};

type StreakDotsRowProps = {
  current: number | null;
  maxDots?: number;
  isLight: boolean;
};

export const StreakDotsRow: React.FC<StreakDotsRowProps> = ({
  current,
  maxDots = 14,
  isLight,
}) => {
  const filled = Math.max(0, Math.min(maxDots, current ?? 0));
  const dots = Array.from({ length: maxDots });

  return (
    <View style={styles.metricStreakDotsRow}>
      {dots.map((_, idx) => (
        <View
          // eslint-disable-next-line react/no-array-index-key
          key={idx}
          style={[
            styles.metricStreakDot,
            isLight && styles.metricStreakDotLight,
            idx < filled && styles.metricStreakDotFilled,
            idx < filled && isLight && styles.metricStreakDotFilledLight,
          ]}
        />
      ))}
    </View>
  );
};

// AccountScreen implementation has been moved to screens/profile/AccountScreen.tsx
// and is now imported at the top of this file.

const LegacyAccountScreen_REMOVED: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const { prs: exercisePrs } = useExercisePrs();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrSheetVisible, setIsPrSheetVisible] = useState(false);
  const accountUserName =
    profile?.profile.display_name || profile?.username || null;

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        let tokenToUse = accessToken;
        let response = await fetch(`${API_BASE_URL}/me/`, {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
          },
        });
        if (response.status === 401) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            await signOut();
            return;
          }
          response = await fetch(`${API_BASE_URL}/me/`, {
            headers: { Authorization: `Bearer ${refreshed}` },
          });
        }
        if (!response.ok) {
          throw new Error("Failed to load profile");
        }
        const json = (await response.json()) as UserProfile;
        if (isMounted) setProfile(json);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Error loading profile",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshAccessToken, signOut]);

  if (loading) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={[styles.homeHeaderRow, isLight && styles.homeHeaderRowLight]}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {accountUserName ? `Hi ${accountUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your profile
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={accountUserName} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  if (!profile || error) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={[styles.homeHeaderRow, isLight && styles.homeHeaderRowLight]}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {accountUserName ? `Hi ${accountUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your profile
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={accountUserName} />
          </View>
        </View>
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          My Profile
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  const name = profile.profile.display_name || profile.username;

  return (
    <>
      <ScrollView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
        contentContainerStyle={styles.plansScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.homeHeaderRow, isLight && styles.homeHeaderRowLight]}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {accountUserName ? `Hi ${accountUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your profile
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={accountUserName} />
          </View>
        </View>

        {/* Header */}
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          My Profile
        </Text>

        {/* Profile card */}
        <View style={[styles.profileCard, isLight && styles.profileCardLight]}>
          <View
            style={[styles.avatarCircle, isLight && styles.avatarCircleLight]}
          >
            <Text
              style={[
                styles.avatarInitials,
                isLight && styles.avatarInitialsLight,
              ]}
            >
              {name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileTextBlock}>
            <Text
              style={[styles.profileName, isLight && styles.profileNameLight]}
            >
              {name}
            </Text>
            <Text
              style={[styles.profileGoal, isLight && styles.profileGoalLight]}
            >
              Goal: Hypertrophy & Longevity
            </Text>
          </View>
          <View
            style={[styles.premiumPill, isLight && styles.premiumPillLight]}
          >
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>
        </View>

        {/* Stats row – placeholder values for now */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, isLight && styles.statCardLight]}>
            <Text style={[styles.statLabel, isLight && styles.statLabelLight]}>
              WEIGHT
            </Text>
            <Text style={[styles.statValue, isLight && styles.statValueLight]}>
              {profile.profile.weight_kg ?? "–"} kg
            </Text>
            <Text style={[styles.statDelta, isLight && styles.statDeltaLight]}>
              0.0 kg
            </Text>
          </View>
          <View style={[styles.statCard, isLight && styles.statCardLight]}>
            <Text style={[styles.statLabel, isLight && styles.statLabelLight]}>
              SLEEP
            </Text>
            <Text style={[styles.statValue, isLight && styles.statValueLight]}>
              7h 45m
            </Text>
            <Text style={[styles.statDelta, isLight && styles.statDeltaLight]}>
              +12%
            </Text>
          </View>
          <View style={[styles.statCard, isLight && styles.statCardLight]}>
            <Text style={[styles.statLabel, isLight && styles.statLabelLight]}>
              HEART
            </Text>
            <Text style={[styles.statValue, isLight && styles.statValueLight]}>
              62 bpm
            </Text>
            <Text style={[styles.statDelta, isLight && styles.statDeltaLight]}>
              Stable
            </Text>
          </View>
        </View>

        <Text
          style={[styles.sectionHeader, isLight && styles.sectionHeaderLight]}
        >
          PERSONAL RECORDS
        </Text>
        <TouchableOpacity
          style={[
            styles.profilePrTriggerCard,
            isLight && styles.profilePrTriggerCardLight,
          ]}
          activeOpacity={0.9}
          onPress={() => setIsPrSheetVisible(true)}
        >
          <View style={styles.profilePrTriggerTextCol}>
            <Text
              style={[
                styles.profilePrTriggerTitle,
                isLight && styles.profilePrTriggerTitleLight,
              ]}
            >
              View all PRs
            </Text>
            <Text
              style={[
                styles.profilePrTriggerSubtitle,
                isLight && styles.profilePrTriggerSubtitleLight,
              ]}
            >
              {exercisePrs.length === 0
                ? "No exercise records saved yet"
                : exercisePrs.length === 1
                  ? "1 exercise record saved"
                  : `${exercisePrs.length} exercise records saved`}
            </Text>
          </View>
          <Text style={styles.profilePrTriggerChevron}>⌃</Text>
        </TouchableOpacity>

        {/* Settings sections – simplified */}
        <Text
          style={[styles.sectionHeader, isLight && styles.sectionHeaderLight]}
        >
          TRAINING & PROGRESS
        </Text>
        <View
          style={[styles.settingsCard, isLight && styles.settingsCardLight]}
        >
          <Text
            style={[
              styles.settingsItemPrimary,
              isLight && styles.settingsItemPrimaryLight,
            ]}
          >
            Workout History
          </Text>
          <Text
            style={[
              styles.settingsItemSecondary,
              isLight && styles.settingsItemSecondaryLight,
            ]}
          >
            142 sessions completed
          </Text>
        </View>

        <Text
          style={[styles.sectionHeader, isLight && styles.sectionHeaderLight]}
        >
          SETTINGS & APP
        </Text>
        <View
          style={[styles.settingsCard, isLight && styles.settingsCardLight]}
        >
          <Text
            style={[
              styles.settingsItemPrimary,
              isLight && styles.settingsItemPrimaryLight,
            ]}
          >
            Notifications
          </Text>
          <Text
            style={[
              styles.settingsItemSecondary,
              isLight && styles.settingsItemSecondaryLight,
            ]}
          >
            Daily reminders & alerts
          </Text>
        </View>
        <View
          style={[styles.settingsCard, isLight && styles.settingsCardLight]}
        >
          <Text
            style={[
              styles.settingsItemPrimary,
              isLight && styles.settingsItemPrimaryLight,
            ]}
          >
            Privacy & Security
          </Text>
          <Text
            style={[
              styles.settingsItemSecondary,
              isLight && styles.settingsItemSecondaryLight,
            ]}
          >
            Data sharing & permissions
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, isLight && styles.logoutButtonLight]}
          onPress={signOut}
        >
          <Text style={[styles.logoutText, isLight && styles.logoutTextLight]}>
            Log Out
          </Text>
        </TouchableOpacity>
        {/* PR bottom sheet */}
      </ScrollView>
      <Modal
        visible={isPrSheetVisible && exercisePrs.length > 0}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPrSheetVisible(false)}
      >
        <View style={styles.filterSheetRoot}>
          <TouchableOpacity
            style={styles.filterSheetBackdrop}
            activeOpacity={1}
            onPress={() => setIsPrSheetVisible(false)}
          />
          <View
            style={[
              styles.filterSheetContainer,
              isLight && styles.filterSheetContainerLight,
            ]}
          >
            <View style={styles.filterSheetHandle} />
            <View style={styles.homeAllActiveHeaderRow}>
              <View style={styles.homeAllActiveHeaderTextCol}>
                <Text
                  style={[
                    styles.filterSheetTitle,
                    isLight && styles.filterSheetTitleLight,
                  ]}
                >
                  Personal records
                </Text>
                <Text
                  style={[
                    styles.filterSheetSubtitle,
                    isLight && styles.filterSheetSubtitleLight,
                  ]}
                >
                  Exercise name, weight and sets for your best lifts.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.homeAllActiveCloseButton}
                activeOpacity={0.8}
                onPress={() => setIsPrSheetVisible(false)}
              >
                <Text style={styles.filterSheetFooterButtonText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.homeAllActiveListScroll}
              showsVerticalScrollIndicator={false}
            >
              {exercisePrs.map((pr) => (
                <View
                  key={pr.segmentId}
                  style={[
                    styles.profilePrCard,
                    isLight && styles.profilePrCardLight,
                  ]}
                >
                  <View style={styles.profilePrRow}>
                    <View style={styles.profilePrTextCol}>
                      <Text
                        style={[
                          styles.profilePrExercise,
                          isLight && styles.profilePrExerciseLight,
                        ]}
                      >
                        {pr.exerciseLabel}
                      </Text>
                      {pr.workoutTitle ? (
                        <Text
                          style={[
                            styles.profilePrWorkoutTitle,
                            isLight && styles.profilePrWorkoutTitleLight,
                          ]}
                        >
                          {pr.workoutTitle}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.profilePrBadgeRow}>
                      <View style={styles.profilePrBadge}>
                        <Text style={styles.profilePrBadgeLabel}>Weight</Text>
                        <Text style={styles.profilePrBadgeValue}>
                          {pr.prWeight}
                        </Text>
                      </View>
                      <View style={styles.profilePrBadge}>
                        <Text style={styles.profilePrBadgeLabel}>Sets</Text>
                        <Text style={styles.profilePrBadgeValue}>
                          {pr.prSets}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ---------------------------
// Styles
// ---------------------------

// Styles have been moved to ./styles/appStyles.ts
// Import them from there instead of defining them inline
