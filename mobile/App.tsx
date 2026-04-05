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
import Constants from "expo-constants";
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
import Svg, { Circle, Path } from "react-native-svg";
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
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import {
  createBottomTabNavigator,
  BottomTabNavigationProp,
} from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

type Exercise = {
  id: string;
  name: string;
  primary_muscles: string[];
  secondary_muscles?: string[];
  movement_pattern?: string;
  equipment?: string[];
  level: string;
  is_compound: boolean;
  is_featured?: boolean;
  video_url?: string;
  image_url?: string;
  description?: string;
};

type LevelFilter = "all" | "beginner" | "intermediate" | "advanced";
type FilterSheetKey = "muscles" | "mechanic" | "force" | "level" | null;
type MechanicFilter = "all" | "compound" | "isolation";
type ForceFilter = "all" | "push" | "pull" | "hold";

type ExerciseListResponse = {
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
const EXERCISES_PAGE_SIZE = 20;

// Local images for Barbell Bench Press (top and bottom positions)
const CHEST_PRESS_IMAGE_UP = require("./assets/chest/0.jpg");
const CHEST_PRESS_IMAGE_DOWN = require("./assets/chest/1.jpg");

type MuscleGroupApi = {
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
  title: string;
  durationMinutes: number;
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
const SAMPLE_ACTIVE_WORKOUTS: ActiveWorkoutSummary[] = [
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

const SAMPLE_ACTIVE_NUTRITIONS: ActiveWorkoutSummary[] = [
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

const getMuscleIdsForSelection = (
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
const buildExercisesUrl = (
  baseUrl: string,
  options: {
    limit?: number;
    offset?: number;
    muscleIds?: string[];
    search?: string;
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

  const query = params.length ? `?${params.join("&")}` : "";
  return `${baseUrl}/exercises/${query}`;
};

const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thr",
  "Fri",
  "Sat",
] as const;

const MONTH_LABELS = [
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

const toISODate = (date: Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const mm = month < 10 ? `0${month}` : `${month}`;
  const dd = day < 10 ? `0${day}` : `${day}`;
  return `${year}-${mm}-${dd}`;
};

const addDays = (date: Date, amount: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
};

const getWeekStart = (date: Date): Date => {
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

const addMonths = (date: Date, amount: number): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const buildSampleMonthCalendarDays = (
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
const buildMonthCalendarDaysFromDashboard = (
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

type MuscleFilterSection = {
  id: string;
  title: string;
  muscles: MuscleName[];
};

const MUSCLE_FILTER_SECTIONS: MuscleFilterSection[] = [
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

type UserProfile = {
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

type DashboardFitnessAgeMetric = {
  available: boolean;
  fitness_age_years: number | null;
  chronological_age: number | null;
  detail: any;
};

type DashboardRaceReadinessMetric = {
  available: boolean;
  score: number | null;
  detail: any;
};

type DashboardPercentileMetric = {
  available: boolean;
  percentile: number | null;
  detail: any;
};

type DashboardStreakMetric = {
  available: boolean;
  current_streak_days: number | null;
  longest_streak_days: number | null;
  multiplier: number | null;
  detail: any;
};

type DashboardTotalTimeMetric = {
  available: boolean;
  total_minutes_7d: number | null;
  total_minutes_30d: number | null;
  total_minutes_all_time: number | null;
  detail: any;
};

type DashboardBodyBattleMapMetric = {
  available: boolean;
  balance_score: number | null;
  detail: any;
};

type DashboardMetrics = {
  fitness_age: DashboardFitnessAgeMetric;
  race_readiness: DashboardRaceReadinessMetric;
  percentile_rank: DashboardPercentileMetric;
  streak: DashboardStreakMetric;
  total_time: DashboardTotalTimeMetric;
  body_battle_map: DashboardBodyBattleMapMetric;
};

type DashboardSummary = {
  hero: any;
  metrics: DashboardMetrics;
  quick_workouts: any[];
  recent_activity: any[];
  calendar: any;
  ai_estimation: any;
  badge_preview: any;
};

const BODY_BATTLE_CANONICAL_LABELS: Record<string, string> = {
  chest: "Chest",
  shoulders: "Shoulders",
  arms: "Arms",
  back: "Back",
  core: "Core",
  glutes: "Glutes",
  legs: "Legs",
};

// Order to display muscle groups in the Body Battle Map legend.
const BODY_BATTLE_GROUP_ORDER: string[] = [
  "shoulders",
  "chest",
  "arms",
  "core",
  "back",
  "glutes",
  "legs",
];

// Rank colours matching the Body Battle Map spec.
const BODY_BATTLE_RANK_COLORS: Record<string, string> = {
  Legend: "#EF4444",
  Beast: "#FB923C",
  Warrior: "#FACC15",
  Soldier: "#94A3B8",
  Recruit: "#64748B",
};

// Map tapped body‑map muscles to the coarser Body Battle Map groups used
// in the dashboard metric (chest, arms, legs, etc.).
const MUSCLE_TO_BODY_BATTLE_GROUP: Partial<
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

function useUserProfileBasic() {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!accessToken) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }
      try {
        setLoading(true);
        setError(null);
        let tokenToUse = accessToken;
        let response = await fetch(`${API_BASE_URL}/me/`, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
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
        if (isMounted) {
          setProfile(json);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Error loading profile",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshAccessToken, signOut]);

  return { profile, loading, error };
}

function useDashboardSummary() {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reload = async () => {
    if (!accessToken) {
      if (!isMountedRef.current) return;
      setSummary(null);
      setLoading(false);
      return;
    }

    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      let tokenToUse = accessToken;
      let response = await fetch(`${API_BASE_URL}/dashboard/summary/`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          await signOut();
          return;
        }
        tokenToUse = refreshed;
        response = await fetch(`${API_BASE_URL}/dashboard/summary/`, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
        });
      }
      if (!response.ok) {
        throw new Error("Failed to load dashboard metrics");
      }
      const json = (await response.json()) as DashboardSummary;
      if (!isMountedRef.current) return;
      setSummary(json);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(
        err instanceof Error ? err.message : "Error loading dashboard metrics",
      );
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [accessToken, refreshAccessToken, signOut]);

  return { summary, loading, error, reload };
}

type WorkoutHistoryEntry = {
  date: string;
  status: "completed" | "missed" | string;
  title: string;
  day_type?: string | null;
  week_number?: number | null;
  scheduled_day_index?: number | null;
  completed_at?: string | null;
};

function useWorkoutHistory(limit: number = 60) {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [items, setItems] = useState<WorkoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = async () => {
    if (!isMountedRef.current) return;
    if (!accessToken) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      let tokenToUse = accessToken;
      let response = await fetch(
        `${API_BASE_URL}/workouts/history/?limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${tokenToUse}` },
        },
      );
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          await signOut();
          return;
        }
        tokenToUse = refreshed;
        response = await fetch(
          `${API_BASE_URL}/workouts/history/?limit=${limit}`,
          {
            headers: { Authorization: `Bearer ${tokenToUse}` },
          },
        );
      }
      if (!response.ok) {
        throw new Error("Failed to load workout history");
      }
      const json = (await response.json()) as {
        results?: WorkoutHistoryEntry[];
        has_more?: boolean;
      };
      if (!isMountedRef.current) return;
      setItems(json.results ?? []);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(
        err instanceof Error ? err.message : "Error loading workout history",
      );
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [accessToken, refreshAccessToken, signOut, limit]);

  return { items, loading, error, reload: load };
}

type PlanWeek = {
  weekNumber: number;
  title: string;
  focus: string;
  highlights: string[];
};

type Plan = {
  id: string;
  name: string;
  level: "beginner" | "intermediate" | "advanced";
  durationWeeks: number;
  goal: string; // high-level focus of the plan
  summary: string; // what the plan offers structurally
  audience: string; // who this plan is for
  result: string; // what you can expect after completing the plan
  sessionsPerWeek: number;
  weeks: PlanWeek[];
};

type ApiPlanExercise = {
  id: number | string;
  order: number;
  label: string;
  primary: string;
  secondary?: string;
};

type ApiPlanDay = {
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

type ApiPlanWeek = {
  id: number | string;
  number: number;
  title: string;
  focus: string;
  highlights: string[];
  days?: ApiPlanDay[];
};

type ApiPlan = {
  id: string;
  name: string;
  level: Plan["level"];
  duration_weeks: number;
  goal: string;
  summary: string;
  audience: string;
  result: string;
  sessions_per_week: number;
  long_description?: string | null;
  weeks?: ApiPlanWeek[];
};

function mapApiPlan(api: ApiPlan): Plan {
  return {
    id: api.id,
    name: api.name,
    level: api.level,
    durationWeeks: api.duration_weeks,
    goal: api.goal,
    summary: api.summary,
    audience: api.audience,
    result: api.result,
    sessionsPerWeek: api.sessions_per_week,
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

type PlanDetail = {
  id: string;
  name: string;
  level: Plan["level"];
  durationWeeks: number;
  goal: string;
  summary: string;
  audience: string;
  result: string;
  sessionsPerWeek: number;
  weeks: PlanWeekDetail[];
  longDescription?: string | null;
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

function mapApiPlanDetail(api: ApiPlan): PlanDetail {
  return {
    id: api.id,
    name: api.name,
    level: api.level,
    durationWeeks: api.duration_weeks,
    goal: api.goal,
    summary: api.summary,
    audience: api.audience,
    result: api.result,
    sessionsPerWeek: api.sessions_per_week,
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

function buildActiveWorkoutsFromPlan(
  plan: PlanDetail | null,
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

  // Map JS weekday (Sun=0) to plan day index (Mon=1 ... Sun=7).
  const today = new Date();
  const jsWeekday = today.getDay();
  const todayPlanDayIndex = jsWeekday === 0 ? 7 : jsWeekday;

  const sorted = entries.sort((a, b) => {
    if (a.weekNumber !== b.weekNumber) {
      return a.weekNumber - b.weekNumber;
    }
    return (a.day.day ?? 1) - (b.day.day ?? 1);
  });

  const todayEntry =
    sorted.find((entry) => entry.day.day === todayPlanDayIndex) ?? sorted[0];

  if (!todayEntry) {
    return SAMPLE_ACTIVE_WORKOUTS.slice(0, 1);
  }

  const { weekNumber, day } = todayEntry;

  const mapped: ActiveWorkoutSummary = (() => {
    const durationNumeric = day.duration
      ? parseInt(day.duration.replace(/[^0-9]/g, ""), 10)
      : NaN;
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

    return {
      id: `${plan.id}_w${weekNumber}_d${day.day}`,
      title: day.title || plan.name,
      durationMinutes,
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

function buildActiveNutritionsFromPlan(
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

const SAMPLE_PLANS: Plan[] = [
  {
    id: "beginner_4_week",
    name: "4-Week Beginner Strength Plan",
    level: "beginner",
    durationWeeks: 4,
    goal: "Build a foundation of full-body strength and consistency.",
    summary:
      "Three full-body sessions per week with progressive overload and clear structure.",
    audience:
      "Beginners who want to learn the main lifts, build confidence in the gym, and create a repeatable routine.",
    result:
      "By the end of 4 weeks you will feel confident with core barbell movements and have a solid base to progress from.",
    sessionsPerWeek: 3,
    weeks: [
      {
        weekNumber: 1,
        title: "Learn the Movements",
        focus: "Master form with lighter weights and controlled tempo.",
        highlights: [
          "3 full-body sessions focusing on squat, hinge, push, and pull.",
          "Use RPE 6–7 (leave 3–4 reps in the tank) on main lifts.",
          "Add a short walk or light cardio on non-lifting days.",
        ],
      },
      {
        weekNumber: 2,
        title: "Build Confidence",
        focus: "Increase load slightly while keeping technique clean.",
        highlights: [
          "Add 2.5–5 kg (or the smallest plate) to main lifts where safe.",
          "Introduce one extra accessory per session for weak points.",
          "Focus on consistent sleep and hydration all week.",
        ],
      },
      {
        weekNumber: 3,
        title: "Push a Little Harder",
        focus: "Stay in control but work closer to your limits.",
        highlights: [
          "Aim for RPE 7–8 on your final sets of the big lifts.",
          "Keep total volume similar; don't add endless sets.",
          "Add one extra mobility or stretching session this week.",
        ],
      },
      {
        weekNumber: 4,
        title: "Deload & Consolidate",
        focus: "Back off slightly so you can recover and lock in progress.",
        highlights: [
          "Reduce working weights by ~10–20% on all main lifts.",
          "Keep movement quality high and focus on smooth, fast reps.",
          "End the week by reviewing progress and setting next goals.",
        ],
      },
    ],
  },
];

type PlanDayNutrition = {
  title?: string;
  description?: string;
  bullets?: string[];
};

type PlanDayDetail = {
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

type PlanWeekDetail = {
  id: string;
  number: number;
  title: string;
  description: string;
  days: PlanDayDetail[];
};

const PLAN_DETAIL_WEEKS: PlanWeekDetail[] = [
  {
    id: "w1",
    number: 1,
    title: "Foundation & Form",
    description:
      "Establishing essential movement patterns and core stability. Focus entirely on feeling the targeted muscles rather than lifting heavy. We want to bulletproof your joints before adding major weight next week.",
    days: [
      {
        id: "d1",
        day: 1,
        title: "Lower Body Basics",
        exercises: "Squats, Lunges, Glute Bridges",
        duration: "45 min",
        type: "strength",
      },
      {
        id: "d2",
        day: 2,
        title: "Upper Body Pull",
        exercises: "Dumbbell Rows, Lat Pulldowns",
        duration: "40 min",
        type: "strength",
      },
      {
        id: "d3",
        day: 3,
        title: "Active Recovery",
        exercises: "Light stretching, Mobility",
        duration: "20 min",
        type: "recovery",
      },
      {
        id: "d4",
        day: 4,
        title: "Upper Body Push",
        exercises: "Push-ups, Overhead Press",
        duration: "40 min",
        type: "strength",
      },
    ],
  },
  {
    id: "w2",
    number: 2,
    title: "Intensity Increase",
    description:
      "Adding volume and decreasing rest times. This week pushes the cardiovascular system while maintaining form under fatigue. Track your reps and try to beat your day 1 numbers.",
    days: [
      {
        id: "d5",
        day: 1,
        title: "Lower Body Power",
        exercises: "Jump Squats, Leg Press",
        duration: "50 min",
        type: "strength",
      },
      {
        id: "d6",
        day: 2,
        title: "Upper Body Compound",
        exercises: "Bench Press, Rows",
        duration: "45 min",
        type: "strength",
      },
      {
        id: "d7",
        day: 3,
        title: "Core & Conditioning",
        exercises: "Planks, HIIT intervals",
        duration: "30 min",
        type: "cardio",
      },
      {
        id: "d8",
        day: 4,
        title: "Full Body Circuit",
        exercises: "Kettlebell swings, Thrusters",
        duration: "50 min",
        type: "strength",
      },
    ],
  },
];

// "View workout" weekly template – used to show a full week in
// the bottom sheet with the exact design from the running schedule
// reference (Mon/Tue/Wed/Thu cards).
type ViewWorkoutSegment = {
  id: string;
  label: string;
  primary: string;
  secondary?: string;
};

type ViewWorkoutDay = {
  id: string;
  weekdayLabel: string; // e.g. "Mon"
  dateLabel: string; // e.g. "02 MAR"
  type: "run" | "strength" | "rest";
  title: string;
  subtitle: string;
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
type ViewWorkoutWeek = {
  id: string;
  label: string;
  days: ViewWorkoutDay[];
};

// NUTRITION DESIGN
// Simple per-day nutrition structure for the nutrition bottom sheet.
type ViewNutritionDay = {
  id: string;
  weekdayLabel: string;
  dateLabel: string;
  title?: string;
  description?: string;
  bullets?: string[];
};
type ViewNutritionWeek = {
  id: string;
  label: string;
  days: ViewNutritionDay[];
};

const VIEW_WORKOUT_SAMPLE_WEEK: ViewWorkoutWeek = {
  id: "week1",
  label: "Week 1",
  days: [
    {
      id: "mon",
      weekdayLabel: "Mon",
      dateLabel: "02 MAR",
      type: "run",
      title: "Easy Run",
      subtitle: "45 mins \u2022 Low Effort",
    },
    {
      id: "tue",
      weekdayLabel: "Tue",
      dateLabel: "03 MAR",
      type: "run",
      title: "Interval Run",
      subtitle: "Warm up \u2022 Interval \u2022 Cool Down",
      headerTags: ["Warm up", "Interval", "Cool Down"],
      segments: [
        {
          id: "warmup",
          label: "Warm up",
          primary: "2km",
          secondary: "6:30-6:41",
        },
        {
          id: "interval",
          label: "Interval",
          primary: "10 \u00D7 400m",
          secondary: "4:45-4:50",
        },
        {
          id: "cooldown",
          label: "Cool Down",
          primary: "2km",
          secondary: "6:30-6:41",
        },
      ],
      notes:
        "Keep your pace, don't overpace. The warm-up session also shouldn't be too fast. So that the interval results are optimal.",
      exercises: "2km warm up, 10\u00D7400m intervals, 2km cool down",
    },
    {
      id: "wed",
      weekdayLabel: "Wed",
      dateLabel: "04 MAR",
      type: "strength",
      title: "Strength Training",
      subtitle: "Deadlift, Squat, Bench Press…",
      segments: [
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
      notes:
        "No rush, always focus on form to avoid injury. Take a break max 30 seconds for each set.",
    },
    {
      id: "thu",
      weekdayLabel: "Thu",
      dateLabel: "05 MAR",
      type: "rest",
      title: "Rest Day",
      subtitle: "Cross Training or Walking",
    },
  ],
};

function mapPlanWeekToViewWorkoutWeek(week: PlanWeekDetail): ViewWorkoutWeek {
  return {
    id: week.id,
    label: `Week ${week.number}: ${week.title}`,
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

function mapPlanWeekToViewNutritionWeek(
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

// NOTE:
// API base URL helper that works across web, simulator, and Expo Go on device.
// - On web / simulators, we can safely use localhost.
// - On a physical device running Expo Go, we derive the dev machine's IP from
//   Expo's host URI (the same one Metro dev tools use), so you don't have to
//   keep hard-coding your LAN IP.
const getApiBaseUrl = (): string => {
  if (Platform.OS === "web") {
    return "http://localhost:8000/api/v1";
  }
  // Native (iOS / Android) via Expo Go or simulator
  // Try to infer the host (e.g. "192.168.1.10") from Expo's config.
  const expoConfig: any =
    (Constants as any).expoConfig ?? (Constants as any).manifest2;
  const hostUri: string | undefined =
    (expoConfig && expoConfig.hostUri) ||
    (expoConfig &&
      expoConfig.extra &&
      expoConfig.extra.expoClient &&
      expoConfig.extra.expoClient.hostUri);

  if (hostUri) {
    // hostUri looks like "192.168.1.10:19000" or "192.168.1.10:19000/--/"
    const host = hostUri.split(":")[0];
    return `http://${host}:8000/api/v1`;
  }

  // Fallback: if we can't detect it, default to localhost (works on simulator).
  return "http://localhost:8000/api/v1";
};

const API_BASE_URL = getApiBaseUrl();
const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

// Global theme color tokens – dark glossy + light variants
const DARK_BG = "#050814";
const DARK_CARD = "#171C2A";
const DARK_CARD_ALT = "#191E30";
const DARK_ACCENT_ORANGE = "#FF7A3C";
const DARK_ACCENT_ORANGE_SOFT = "#FF9055";
const DARK_TEXT_PRIMARY = "#F7F9FF";
const DARK_TEXT_MUTED = "#8C93A8";

const LIGHT_BG = "#F0F2F5";
const LIGHT_CARD = "#FFFFFF";
const LIGHT_CARD_ALT = "#EEF2FF";
const LIGHT_ACCENT_ORANGE = "#FF7A3C";
const LIGHT_TEXT_PRIMARY = "#111827";
const LIGHT_TEXT_MUTED = "#4B5563";

// Sage glass theme – legacy; map its tokens back onto the original dark navy/orange palette
const SAGE_GRADIENT_START = "#8FA89B";
const SAGE_GRADIENT_END = "#5A7268";

const GLASS_BG_DARK = DARK_BG;
const GLASS_CARD_DARK = DARK_CARD;
const GLASS_BORDER_DARK = "rgba(15, 23, 42, 0.75)";
// Updated to match new light-theme accent (soft blue instead of orange)
const GLASS_ACCENT_GREEN = "#A3D2E7";
const GLASS_ACCENT_GREEN_SOFT = "#90C4DA";
const GLASS_TEXT_PRIMARY = DARK_TEXT_PRIMARY;
const GLASS_TEXT_MUTED = DARK_TEXT_MUTED;

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

function useAuth(): AuthContextValue {
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

function useThemeMode(): ThemeContextValue {
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

function useExercisePrs(): ExercisePrContextValue {
  const ctx = useContext(ExercisePrContext);
  if (!ctx) {
    throw new Error("useExercisePrs must be used within ExercisePrProvider");
  }
  return ctx;
}

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type MainTabParamList = {
  Home: undefined;
  Plans: undefined;
  Exercises: undefined;
  Account: undefined;
};

type RootTabNavigation = BottomTabNavigationProp<MainTabParamList>;

type HomeStackParamList = {
  HomeMain: undefined;
  FitnessAgeDetail: undefined;
  RaceReadinessDetail: undefined;
  PercentileDetail: undefined;
};

type HomeStackNavigation = NativeStackNavigationProp<HomeStackParamList>;

type PlansStackParamList = {
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

type LoginProps = NativeStackScreenProps<AuthStackParamList, "Login">;
type RegisterProps = NativeStackScreenProps<AuthStackParamList, "Register">;
type PlansHomeProps = NativeStackScreenProps<PlansStackParamList, "PlansHome">;
type PlanDetailProps = NativeStackScreenProps<
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
    <PlansStack.Screen name="PlansHome" component={PlansScreen} />
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
};

const TabBarIcon: React.FC<TabBarIconProps> = ({
  routeName,
  focused,
  isLight,
}) => {
  let iconName: keyof typeof Ionicons.glyphMap;
  let label: string;

  switch (routeName) {
    case "Home":
      // Use outline variants that are guaranteed to exist in
      // @expo/vector-icons/Ionicons so icons always render on
      // device (some solid names can be missing on certain
      // versions).
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
    case "Account":
      iconName = "person-circle-outline";
      label = "Account";
      break;
    default:
      iconName = "ellipse";
      label = routeName;
  }

  const activeIconColor = isLight ? "#0F172A" : "#ffffff";
  const inactiveIconColor = isLight ? "#6b7280" : "#cbd5f5";
  const iconColor = focused ? activeIconColor : inactiveIconColor;

  return (
    <View style={styles.tabBarItem}>
      <View
        style={[
          styles.tabBarIconContainer,
          isLight && styles.tabBarIconContainerLight,
          focused &&
            (isLight
              ? styles.tabBarIconContainerActiveLight
              : styles.tabBarIconContainerActive),
        ]}
      >
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>
      <Text
        style={[
          styles.tabBarLabel,
          isLight && styles.tabBarLabelLight,
          focused && styles.tabBarLabelActive,
          focused && isLight && styles.tabBarLabelActiveLight,
        ]}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {label}
      </Text>
    </View>
  );
};

const MainTabsNavigator: React.FC = () => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";

  return (
    <MainTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          isLight && styles.tabBarLight,
          isLight && {
            backgroundColor: LIGHT_CARD,
            borderTopColor: "#E5E7EB",
          },
        ],
        tabBarActiveTintColor: isLight ? GLASS_ACCENT_GREEN : "#F9FAFB",
        tabBarInactiveTintColor: isLight ? "#6b7280" : "#6b7280",
        tabBarIcon: ({ focused }) => (
          <TabBarIcon
            routeName={route.name}
            focused={focused}
            isLight={isLight}
          />
        ),
      })}
    >
      <MainTabs.Screen name="Home" component={HomeStackNavigator} />
      <MainTabs.Screen name="Plans" component={PlansStackNavigator} />
      <MainTabs.Screen name="Exercises" component={ExerciseListScreen} />
      <MainTabs.Screen name="Account" component={AccountScreen} />
    </MainTabs.Navigator>
  );
};

// ---------------------------
// Screens
// ---------------------------

const ThemeToggle: React.FC<{ inHeader?: boolean }> = ({
  inHeader = false,
}) => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const iconName: keyof typeof Ionicons.glyphMap = isLight ? "sunny" : "moon";
  const iconColor = isLight ? "#FBBF24" : "#E5E7EB";

  return (
    <TouchableOpacity
      onPress={toggle}
      style={[
        styles.themeToggle,
        isLight && styles.themeToggleLight,
        inHeader && styles.themeToggleInHeader,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Toggle color mode"
    >
      <View style={styles.themeToggleInner}>
        <Ionicons
          name={iconName}
          size={14}
          color={iconColor}
          style={styles.themeToggleIcon}
        />
        <Text
          style={[
            styles.themeToggleLabel,
            isLight && styles.themeToggleLabelLight,
          ]}
        >
          {isLight ? "Light" : "Dark"}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const HeaderAvatar: React.FC<{ isLight: boolean; name?: string | null }> = ({
  isLight,
  name,
}) => {
  const navigation = useNavigation<RootTabNavigation>();
  const initials = getInitials(name) ?? "FIT";

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
      <Text
        style={[
          styles.homeAvatarInitials,
          isLight && styles.homeAvatarInitialsLight,
        ]}
      >
        {initials}
      </Text>
    </TouchableOpacity>
  );
};

const LoginScreen: React.FC<LoginProps> = ({ navigation }) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const { signIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.authContainer, isLight && styles.authContainerLight]}>
      <ThemeToggle />
      <Text style={[styles.authTitle, isLight && styles.authTitleLight]}>
        Welcome back
      </Text>
      <Text style={[styles.authSubtitle, isLight && styles.authSubtitleLight]}>
        Log in to continue your training.
      </Text>

      <View style={styles.authFieldGroup}>
        <Text style={[styles.authLabel, isLight && styles.authLabelLight]}>
          Username
        </Text>
        <TextInput
          style={[styles.authInput, isLight && styles.authInputLight]}
          placeholder="alex"
          placeholderTextColor="#6b7280"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.authFieldGroup}>
        <Text style={[styles.authLabel, isLight && styles.authLabelLight]}>
          Password
        </Text>
        <TextInput
          style={[styles.authInput, isLight && styles.authInputLight]}
          placeholder="••••••••"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          isLight && styles.primaryButtonLight,
          loading && styles.primaryButtonDisabled,
        ]}
        onPress={onSubmit}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? "Logging in…" : "Log In"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={[styles.linkText, isLight && styles.linkTextLight]}>
          Create an account
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const RegisterScreen: React.FC<RegisterProps> = ({ navigation }) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const { signUp } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(username.trim(), email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.authContainer, isLight && styles.authContainerLight]}>
      <ThemeToggle />
      <Text style={[styles.authTitle, isLight && styles.authTitleLight]}>
        Create account
      </Text>
      <Text style={[styles.authSubtitle, isLight && styles.authSubtitleLight]}>
        Join the program and start training.
      </Text>

      <View style={styles.authFieldGroup}>
        <Text style={[styles.authLabel, isLight && styles.authLabelLight]}>
          Username
        </Text>
        <TextInput
          style={[styles.authInput, isLight && styles.authInputLight]}
          placeholder="alex"
          placeholderTextColor="#6b7280"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.authFieldGroup}>
        <Text style={[styles.authLabel, isLight && styles.authLabelLight]}>
          Email
        </Text>
        <TextInput
          style={[styles.authInput, isLight && styles.authInputLight]}
          placeholder="you@example.com"
          placeholderTextColor="#6b7280"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.authFieldGroup}>
        <Text style={[styles.authLabel, isLight && styles.authLabelLight]}>
          Password
        </Text>
        <TextInput
          style={[styles.authInput, isLight && styles.authInputLight]}
          placeholder="••••••••"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      <View style={styles.authFieldGroup}>
        <Text style={[styles.authLabel, isLight && styles.authLabelLight]}>
          Confirm password
        </Text>
        <TextInput
          style={[styles.authInput, isLight && styles.authInputLight]}
          placeholder="••••••••"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          isLight && styles.primaryButtonLight,
          loading && styles.primaryButtonDisabled,
        ]}
        onPress={onSubmit}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? "Creating…" : "Create Account"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.replace("Login")}>
        <Text style={[styles.linkText, isLight && styles.linkTextLight]}>
          Back to login
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type MetricGaugeProps = {
  progress: number | null;
  isLight: boolean;
  size?: "large" | "small";
  leftLabel?: string;
  rightLabel?: string;
  centerText?: string | null;
  centerSubText?: string | null;
};

const MetricGauge: React.FC<MetricGaugeProps> = ({
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

  const radius = size === "small" ? 26 : 38;
  const strokeWidth = size === "small" ? 5 : 7;
  const viewBoxSize = radius * 2;
  const effectiveRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * effectiveRadius;

  const animated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animated, {
      toValue: clamped,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, animated]);

  const strokeDashoffset = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const trackColor = isLight ? "#E5E7EB" : "#111827";
  const fillColor = GLASS_ACCENT_GREEN;

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
                isLight && styles.metricGaugeCenterPrimaryLight,
              ]}
            >
              {centerText}
            </Text>
            {centerSubText ? (
              <Text
                style={[
                  styles.metricGaugeCenterSecondary,
                  size === "small" && styles.metricGaugeCenterSecondarySmall,
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

const PercentileCurve: React.FC<PercentileCurveProps> = ({
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

const StreakDotsRow: React.FC<StreakDotsRowProps> = ({
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

const HomeScreen: React.FC = () => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const { savePr } = useExercisePrs();
  const navigation = useNavigation<HomeStackNavigation>();
  const {
    summary,
    loading: metricsLoading,
    error: metricsError,
    reload: reloadMetrics,
  } = useDashboardSummary();
  const { profile } = useUserProfileBasic();
  const activePlanId = profile?.profile.active_plan_id ?? null;
  const {
    plan: activePlan,
    loading: activePlanLoading,
    error: activePlanError,
  } = usePlanDetail(activePlanId);
  const [homeActiveTab, setHomeActiveTab] = useState<"workouts" | "nutrition">(
    "workouts",
  );
  const [isAllActiveSheetVisible, setIsAllActiveSheetVisible] = useState(false);
  const [allActiveTab, setAllActiveTab] = useState<"workouts" | "nutrition">(
    "workouts",
  );
  const {
    items: workoutHistoryItems,
    loading: workoutHistoryLoading,
    error: workoutHistoryError,
    reload: reloadWorkoutHistory,
  } = useWorkoutHistory();
  const [isWorkoutHistoryVisible, setIsWorkoutHistoryVisible] = useState(false);
  const [completedWorkouts, setCompletedWorkouts] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    for (const item of SAMPLE_ACTIVE_WORKOUTS) {
      if (item.progressPercent >= 100) {
        initial[item.id] = true;
      }
    }
    return initial;
  });
  const [completedNutritions, setCompletedNutritions] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    for (const item of SAMPLE_ACTIVE_NUTRITIONS) {
      if (item.progressPercent >= 100) {
        initial[item.id] = true;
      }
    }
    return initial;
  });
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [exercisePrInputs, setExercisePrInputs] = useState<
    Record<string, { weight: string; sets: string }>
  >({});
  const [savedExercisePrs, setSavedExercisePrs] = useState<
    Record<string, boolean>
  >({});
  const calendar = summary?.calendar as any | null;
  const trainingDays =
    calendar != null
      ? buildMonthCalendarDaysFromDashboard(currentMonth, calendar)
      : buildSampleMonthCalendarDays(currentMonth);
  const todayDate = new Date();
  const todayIso = toISODate(todayDate);
  const activeWorkoutItems = useMemo(
    () => buildActiveWorkoutsFromPlan(activePlan),
    [activePlan],
  );
  const activeNutritionItems = useMemo(
    () => buildActiveNutritionsFromPlan(activePlan),
    [activePlan],
  );
  const activeItems =
    homeActiveTab === "workouts" ? activeWorkoutItems : activeNutritionItems;
  const planDayTypeByWeekday = useMemo<Record<
    number,
    PlanDayDetail["type"]
  > | null>(() => {
    if (!activePlan) return null;
    const map: Record<number, PlanDayDetail["type"]> = {};
    for (const week of activePlan.weeks) {
      for (const day of week.days) {
        const idx = day.day;
        if (idx >= 1 && idx <= 7 && !map[idx]) {
          map[idx] = day.type;
        }
      }
    }
    return map;
  }, [activePlan]);
  const monthLabel = MONTH_LABELS[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
  const monthSlots: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i += 1) {
    monthSlots.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    monthSlots.push(new Date(year, monthIndex, day));
  }
  while (monthSlots.length % 7 !== 0) {
    monthSlots.push(null);
  }
  const monthWeeks: (Date | null)[][] = [];
  for (let i = 0; i < monthSlots.length; i += 7) {
    monthWeeks.push(monthSlots.slice(i, i + 7));
  }
  const currentWeekStart = getWeekStart(todayDate);
  const currentWeekDates: Date[] = [];
  for (let i = 0; i < 7; i += 1) {
    currentWeekDates.push(addDays(currentWeekStart, i));
  }
  const todayWeekday = todayDate.getDay(); // 0 (Sun) - 6 (Sat)
  const todayPlanDayIndex = todayWeekday === 0 ? 7 : todayWeekday;
  const todayPlannedWorkoutType =
    planDayTypeByWeekday?.[todayPlanDayIndex] ?? null;

  const [activeMetricTooltip, setActiveMetricTooltip] = useState<
    null | "fitness_age" | "race_readiness" | "percentile" | "body_battle_map"
  >(null);
  const [activeBodyBattleGroup, setActiveBodyBattleGroup] = useState<
    string | null
  >(null);

  const calendarRangeStart: string | null =
    calendar && typeof calendar.range_start === "string"
      ? (calendar.range_start as string)
      : null;
  const calendarRangeEnd: string | null =
    calendar && typeof calendar.range_end === "string"
      ? (calendar.range_end as string)
      : null;

  const metrics = summary?.metrics;
  const fitness = metrics?.fitness_age;
  const race = metrics?.race_readiness;
  const percentile = metrics?.percentile_rank;
  const streak = metrics?.streak;
  const totalTime = metrics?.total_time;
  const bodyBattle = metrics?.body_battle_map;

  const fitnessAgeValue =
    typeof fitness?.fitness_age_years === "number"
      ? `${fitness.fitness_age_years} yrs`
      : metricsLoading
        ? "Loading…"
        : "—";

  let fitnessAgeDelta: string | null = null;
  let fitnessAgeDeltaTone:
    | "positive"
    | "negative"
    | "neutral"
    | "error"
    | null = null;
  if (metricsError) {
    fitnessAgeDelta = "Unable to load";
    fitnessAgeDeltaTone = "error";
  } else if (
    fitness?.chronological_age != null &&
    typeof fitness?.fitness_age_years === "number"
  ) {
    const diff = fitness.chronological_age - fitness.fitness_age_years;
    if (diff > 1) {
      fitnessAgeDelta = `${Math.round(diff)} yrs younger`;
      fitnessAgeDeltaTone = "positive";
    } else if (diff < -1) {
      fitnessAgeDelta = `${Math.abs(Math.round(diff))} yrs older`;
      fitnessAgeDeltaTone = "negative";
    } else {
      fitnessAgeDelta = "On track";
      fitnessAgeDeltaTone = "neutral";
    }
  }

  const raceScoreValue =
    typeof race?.score === "number"
      ? `${Math.round(race.score)} / 100`
      : metricsLoading
        ? "Loading…"
        : "—";

  let raceScoreLabel: string | null = null;
  let raceScoreTone: "positive" | "negative" | "neutral" | "error" | null =
    null;
  if (metricsError) {
    raceScoreLabel = "Unable to load";
    raceScoreTone = "error";
  } else if (typeof race?.score === "number") {
    if (race.score >= 80) {
      raceScoreLabel = "Race ready";
      raceScoreTone = "positive";
    } else if (race.score >= 60) {
      raceScoreLabel = "Solid base";
      raceScoreTone = "neutral";
    } else if (race.score >= 40) {
      raceScoreLabel = "Building base";
      raceScoreTone = "negative";
    } else {
      raceScoreLabel = "Early days";
      raceScoreTone = "negative";
    }
  }

  const percentileValue =
    typeof percentile?.percentile === "number"
      ? `${Math.round(percentile.percentile)}th`
      : metricsLoading
        ? "Loading…"
        : "—";

  let percentileLabel: string | null = null;
  let percentileTone: "positive" | "negative" | "neutral" | "error" | null =
    null;
  if (metricsError) {
    percentileLabel = "Unable to load";
    percentileTone = "error";
  } else if (typeof percentile?.percentile === "number") {
    const p = percentile.percentile;
    if (p >= 80) {
      const topShare = 100 - Math.round(p);
      percentileLabel = `Top ${Math.max(topShare, 1)}% of peers`;
      percentileTone = "positive";
    } else if (p >= 50) {
      percentileLabel = "Above average";
      percentileTone = "positive";
    } else if (p >= 30) {
      percentileLabel = "Around average";
      percentileTone = "neutral";
    } else {
      percentileLabel = "Below average";
      percentileTone = "negative";
    }
  }

  let fitnessDeltaColor: string | undefined;
  if (fitnessAgeDeltaTone === "positive") {
    fitnessDeltaColor = GLASS_ACCENT_GREEN_SOFT;
  } else if (
    fitnessAgeDeltaTone === "negative" ||
    fitnessAgeDeltaTone === "error"
  ) {
    fitnessDeltaColor = isLight ? LIGHT_ACCENT_ORANGE : DARK_ACCENT_ORANGE;
  } else if (fitnessAgeDeltaTone === "neutral") {
    fitnessDeltaColor = isLight ? LIGHT_TEXT_MUTED : GLASS_TEXT_MUTED;
  }

  let raceDeltaColor: string | undefined;
  if (raceScoreTone === "positive") {
    raceDeltaColor = GLASS_ACCENT_GREEN_SOFT;
  } else if (raceScoreTone === "negative" || raceScoreTone === "error") {
    raceDeltaColor = isLight ? LIGHT_ACCENT_ORANGE : DARK_ACCENT_ORANGE;
  } else if (raceScoreTone === "neutral") {
    raceDeltaColor = isLight ? LIGHT_TEXT_MUTED : GLASS_TEXT_MUTED;
  }

  let percentileDeltaColor: string | undefined;
  if (percentileTone === "positive") {
    percentileDeltaColor = GLASS_ACCENT_GREEN_SOFT;
  } else if (percentileTone === "negative" || percentileTone === "error") {
    percentileDeltaColor = isLight ? LIGHT_ACCENT_ORANGE : DARK_ACCENT_ORANGE;
  } else if (percentileTone === "neutral") {
    percentileDeltaColor = isLight ? LIGHT_TEXT_MUTED : GLASS_TEXT_MUTED;
  }

  const chronologicalAge =
    typeof fitness?.chronological_age === "number"
      ? fitness.chronological_age
      : null;

  const fitnessGaugeProgress =
    fitness?.chronological_age != null &&
    typeof fitness?.fitness_age_years === "number"
      ? Math.max(
          0,
          Math.min(
            1,
            (fitness.chronological_age - fitness.fitness_age_years + 20) / 40,
          ),
        )
      : null;

  const racePercent =
    typeof race?.score === "number" ? Math.round(race.score) : null;
  const racePercentDisplay =
    racePercent != null ? `${racePercent}%` : metricsLoading ? "Loading…" : "—";
  const raceGaugeProgress =
    racePercent != null ? Math.max(0, Math.min(1, racePercent / 100)) : null;

  const raceDetail: any = race?.detail;
  const racePlanPercent =
    raceDetail && typeof raceDetail.plan_progress_pct === "number"
      ? raceDetail.plan_progress_pct
      : null;

  let raceConsistencyPercent: number | null = null;
  let raceBenchmarksPercent: number | null = null;
  if (raceDetail && raceDetail.components) {
    const components = raceDetail.components as any;
    if (typeof components.energy_score === "number") {
      raceConsistencyPercent = components.energy_score;
    }
    const scores: number[] = [];
    if (typeof components.run_1km_score === "number") {
      scores.push(components.run_1km_score);
    }
    if (typeof components.wall_balls_score === "number") {
      scores.push(components.wall_balls_score);
    }
    if (typeof components.sled_score === "number") {
      scores.push(components.sled_score);
    }
    if (scores.length > 0) {
      raceBenchmarksPercent =
        scores.reduce((sum, v) => sum + v, 0) / scores.length;
    }
  }

  const percentilePercent =
    typeof percentile?.percentile === "number"
      ? Math.round(percentile.percentile)
      : null;
  const percentilePercentDisplay =
    percentilePercent != null
      ? `${percentilePercent}%`
      : metricsLoading
        ? "Loading…"
        : "—";

  const formatMinutesShort = (minutes: number | null | undefined): string => {
    if (typeof minutes !== "number") {
      return metricsLoading ? "Loading…" : "—";
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h${mins ? ` ${mins}m` : ""}`;
    }
    return `${mins}m`;
  };

  const streakCurrentDays =
    typeof streak?.current_streak_days === "number"
      ? streak.current_streak_days
      : null;
  const streakLongestDays =
    typeof streak?.longest_streak_days === "number"
      ? streak.longest_streak_days
      : null;
  const streakMultiplier =
    typeof streak?.multiplier === "number" ? streak.multiplier : null;

  const streakCurrentLabel =
    streakCurrentDays != null
      ? `${streakCurrentDays} day${streakCurrentDays === 1 ? "" : "s"}`
      : metricsLoading
        ? "Loading…"
        : "—";
  const streakBestLabel =
    streakLongestDays != null ? `Best: ${streakLongestDays}d` : null;
  const streakMultiplierLabel =
    streakMultiplier != null ? `${streakMultiplier.toFixed(1)}x` : null;

  const totalTimeAllLabel = formatMinutesShort(
    (totalTime?.total_minutes_all_time ?? null) as number | null,
  );
  const totalTime30dLabel = formatMinutesShort(
    (totalTime?.total_minutes_30d ?? null) as number | null,
  );
  const totalTime7dLabel = formatMinutesShort(
    (totalTime?.total_minutes_7d ?? null) as number | null,
  );

  const totalMinutesAllTime =
    typeof totalTime?.total_minutes_all_time === "number"
      ? totalTime.total_minutes_all_time
      : null;
  const totalTimeAllHours =
    totalMinutesAllTime != null ? Math.floor(totalMinutesAllTime / 60) : null;
  const totalTimeAllMinutes =
    totalMinutesAllTime != null ? totalMinutesAllTime % 60 : null;

  const bodyBalanceScore =
    typeof bodyBattle?.balance_score === "number"
      ? Math.round(bodyBattle.balance_score)
      : null;
  const bodyBalanceDisplay =
    bodyBalanceScore != null
      ? `${bodyBalanceScore} / 100`
      : metricsLoading
        ? "Loading…"
        : "—";
  let bodyBalanceLabel: string | null = null;
  if (metricsError) {
    bodyBalanceLabel = "Unable to load";
  } else if (typeof bodyBattle?.balance_score === "number") {
    const score = bodyBattle.balance_score;
    if (score >= 80) {
      bodyBalanceLabel = "Legendary balance";
    } else if (score >= 60) {
      bodyBalanceLabel = "Balanced";
    } else if (score > 0) {
      bodyBalanceLabel = "Focus on weak spots";
    }
  }

  // Build per-group legend entries for the Body Battle Map. If there is
  // no metric data yet, we still render the canonical groups, all at
  // "Recruit" level, so the UI matches the design instead of
  // disappearing entirely.
  const bodyBattleGroups: Record<string, any> | null =
    !metricsError && bodyBattle?.detail && (bodyBattle.detail as any).groups
      ? ((bodyBattle.detail as any).groups as Record<string, any>)
      : null;

  const bodyMapRows: {
    key: string;
    label: string;
    rank: string;
    color: string;
    sessions: number;
  }[] = BODY_BATTLE_GROUP_ORDER.map(
    (
      gKey,
    ): {
      key: string;
      label: string;
      rank: string;
      color: string;
      sessions: number;
    } => {
      const info = bodyBattleGroups?.[gKey] || {};
      const rank: string = info.rank || "Recruit";
      const label = BODY_BATTLE_CANONICAL_LABELS[gKey] ?? gKey;
      const sessions: number =
        typeof info.sessions === "number" ? info.sessions : 0;
      const color =
        BODY_BATTLE_RANK_COLORS[rank] ?? BODY_BATTLE_RANK_COLORS["Recruit"];
      return { key: gKey, label, rank, color, sessions };
    },
  );

  const bodyBalanceFillProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const target =
      bodyBalanceScore != null
        ? Math.max(0, Math.min(100, bodyBalanceScore)) / 100
        : 0;
    Animated.timing(bodyBalanceFillProgress, {
      toValue: target,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [bodyBalanceScore, bodyBalanceFillProgress]);

  const bodyBalanceFillHeight = bodyBalanceFillProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  const handlePressFitnessAge = () => {
    setActiveMetricTooltip("fitness_age");
  };

  const handlePressRaceReadiness = () => {
    setActiveMetricTooltip("race_readiness");
  };

  const handlePressPercentile = () => {
    setActiveMetricTooltip("percentile");
  };

  const handlePressBodyBattleMap = () => {
    setActiveMetricTooltip("body_battle_map");
  };

  const handleBodyMapSelectionChange = (selection: MuscleSelection) => {
    const groupKey = MUSCLE_TO_BODY_BATTLE_GROUP[selection.muscle];
    if (!groupKey) return;
    if (selection.active) {
      setActiveBodyBattleGroup(groupKey);
    } else {
      setActiveBodyBattleGroup((prev) => (prev === groupKey ? null : prev));
    }
  };

  const toggleItemCompleted = (kind: "workouts" | "nutrition", id: string) => {
    if (kind === "workouts") {
      setCompletedWorkouts((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    } else {
      setCompletedNutritions((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    }
  };

  const updateExercisePrInput = (
    segmentId: string,
    field: "weight" | "sets",
    value: string,
  ) => {
    setExercisePrInputs((prev) => ({
      ...prev,
      [segmentId]: {
        weight: field === "weight" ? value : (prev[segmentId]?.weight ?? ""),
        sets: field === "sets" ? value : (prev[segmentId]?.sets ?? ""),
      },
    }));
  };

  const handleSaveExercisePr = (
    segmentId: string,
    segmentLabel: string,
    basePrimary: string,
    baseSecondary: string | undefined,
    workoutTitle: string,
  ) => {
    setSavedExercisePrs((prev) => ({
      ...prev,
      [segmentId]: true,
    }));
    const pr = exercisePrInputs[segmentId] ?? { weight: "", sets: "" };
    savePr({
      segmentId,
      exerciseLabel: segmentLabel,
      workoutTitle,
      basePrimary,
      baseSecondary,
      prWeight: pr.weight,
      prSets: pr.sets,
      savedAt: Date.now(),
    });
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const renderMetricTooltip = () => {
    if (!activeMetricTooltip) return null;
    const close = () => setActiveMetricTooltip(null);

    const renderMetricHeader = (
      iconName: React.ComponentProps<typeof Ionicons>["name"],
      title: string,
      subtitle?: string,
    ) => (
      <View style={styles.metricTooltipHeaderRow}>
        <View
          style={[
            styles.metricTooltipIconCircle,
            isLight && styles.metricTooltipIconCircleLight,
          ]}
        >
          <Ionicons
            name={iconName}
            size={18}
            color={isLight ? "#0F172A" : "#ECFEFF"}
          />
        </View>
        <View style={styles.metricTooltipHeaderTextGroup}>
          <Text
            style={[
              styles.metricTooltipTitle,
              isLight && styles.metricTooltipTitleLight,
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.metricTooltipSubtitle,
                isLight && styles.metricTooltipSubtitleLight,
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    );

    const renderSubMetricRow = (
      label: string,
      value: number | null | undefined,
    ) => {
      if (value == null) return null;
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      return (
        <View key={label} style={styles.metricTooltipSubMetricRow}>
          <Text
            style={[
              styles.metricTooltipSubMetricLabel,
              isLight && styles.metricTooltipSubMetricLabelLight,
            ]}
          >
            {label}
          </Text>
          <View style={styles.metricTooltipSubMetricTrack}>
            <View
              style={[
                styles.metricTooltipSubMetricFill,
                { width: `${clamped}%` },
              ]}
            />
          </View>
          <Text
            style={[
              styles.metricTooltipSubMetricValue,
              isLight && styles.metricTooltipSubMetricValueLight,
            ]}
          >
            {clamped}%
          </Text>
        </View>
      );
    };

    let content: React.ReactNode = null;

    if (activeMetricTooltip === "fitness_age") {
      const isYounger =
        typeof fitnessAgeDelta === "string" &&
        fitnessAgeDelta.toLowerCase().includes("younger");

      content = (
        <View style={styles.metricTooltipContent}>
          {renderMetricHeader(
            "hourglass-outline",
            "Fitness age",
            'How "young" your training makes you',
          )}
          <View style={styles.metricTooltipPrimaryRow}>
            <View>
              <Text
                style={[
                  styles.metricTooltipValue,
                  isLight && styles.metricTooltipValueLight,
                ]}
              >
                {fitnessAgeValue}
              </Text>
              {chronologicalAge != null && (
                <Text
                  style={[
                    styles.metricTooltipText,
                    isLight && styles.metricTooltipTextLight,
                  ]}
                >
                  {`Actual age: ${chronologicalAge} yrs`}
                </Text>
              )}
            </View>
            {fitnessAgeDelta && (
              <View
                style={[
                  styles.metricTooltipBadge,
                  isYounger && styles.metricTooltipBadgePositive,
                ]}
              >
                <Text style={styles.metricTooltipBadgeText}>
                  {fitnessAgeDelta}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.metricTooltipSection}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              WHAT THIS MEANS
            </Text>
            <Text
              style={[
                styles.metricTooltipBody,
                isLight && styles.metricTooltipBodyLight,
              ]}
            >
              Your fitness age compares your recent training volume and
              intensity against your chronological age to estimate how "young"
              your body is moving.
            </Text>
          </View>
          <View style={styles.metricTooltipSectionLast}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              WHAT AFFECTS THIS
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Consistency of your weekly training
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Overall volume (time on feet)
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Intensity of your key workouts
            </Text>
          </View>
        </View>
      );
    } else if (activeMetricTooltip === "race_readiness") {
      content = (
        <View style={styles.metricTooltipContent}>
          {renderMetricHeader(
            "flag-outline",
            "Race readiness",
            "How prepared you are for race day",
          )}
          <View style={styles.metricTooltipPrimaryRow}>
            <View>
              <Text
                style={[
                  styles.metricTooltipValue,
                  isLight && styles.metricTooltipValueLight,
                ]}
              >
                {racePercentDisplay}
              </Text>
              {raceScoreLabel && (
                <Text
                  style={[
                    styles.metricTooltipText,
                    isLight && styles.metricTooltipTextLight,
                  ]}
                >
                  {raceScoreLabel}
                </Text>
              )}
            </View>
          </View>
          {racePercent != null && (
            <View style={styles.metricTooltipSection}>
              <Text
                style={[
                  styles.metricTooltipSectionTitle,
                  isLight && styles.metricTooltipSectionTitleLight,
                ]}
              >
                OVERALL READINESS
              </Text>
              <View style={styles.metricTooltipProgressSection}>
                <View style={styles.metricTooltipProgressTrack}>
                  <View
                    style={[
                      styles.metricTooltipProgressFill,
                      {
                        width: `${Math.max(0, Math.min(100, racePercent))}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.metricTooltipProgressLabelsRow}>
                  <Text
                    style={[
                      styles.metricTooltipSubMetricLabel,
                      isLight && styles.metricTooltipSubMetricLabelLight,
                    ]}
                  >
                    Base
                  </Text>
                  <Text
                    style={[
                      styles.metricTooltipSubMetricLabel,
                      isLight && styles.metricTooltipSubMetricLabelLight,
                    ]}
                  >
                    Race ready
                  </Text>
                </View>
              </View>
            </View>
          )}
          <View style={styles.metricTooltipSection}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              KEY DRIVERS
            </Text>
            <View style={styles.metricTooltipSubMetricGroup}>
              {renderSubMetricRow("Plan progress", racePlanPercent)}
              {renderSubMetricRow("Consistency", raceConsistencyPercent)}
              {renderSubMetricRow("Benchmarks", raceBenchmarksPercent)}
            </View>
          </View>
          <View style={styles.metricTooltipSectionLast}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              HOW TO IMPROVE
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Stick to your planned long runs and key workouts
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Keep weekly training consistent (avoid big spikes)
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Hit the benchmark workouts at goal pace
            </Text>
          </View>
        </View>
      );
    } else if (activeMetricTooltip === "percentile") {
      content = (
        <View style={styles.metricTooltipContent}>
          {renderMetricHeader(
            "stats-chart-outline",
            "Fitter than",
            "Where you sit vs similar athletes",
          )}
          <View style={styles.metricTooltipPrimaryRow}>
            <View>
              <Text
                style={[
                  styles.metricTooltipValue,
                  isLight && styles.metricTooltipValueLight,
                ]}
              >
                {percentilePercentDisplay}
              </Text>
              {percentileLabel && (
                <Text
                  style={[
                    styles.metricTooltipText,
                    isLight && styles.metricTooltipTextLight,
                  ]}
                >
                  {percentileLabel}
                </Text>
              )}
            </View>
          </View>
          {percentilePercent != null && (
            <View style={styles.metricTooltipSection}>
              <Text
                style={[
                  styles.metricTooltipSectionTitle,
                  isLight && styles.metricTooltipSectionTitleLight,
                ]}
              >
                WHERE YOU RANK
              </Text>
              <View style={styles.metricTooltipProgressSection}>
                <View style={styles.metricTooltipProgressTrack}>
                  <View
                    style={[
                      styles.metricTooltipProgressFill,
                      {
                        width: `${Math.max(
                          0,
                          Math.min(100, percentilePercent),
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.metricTooltipProgressLabelsRow}>
                  <Text
                    style={[
                      styles.metricTooltipSubMetricLabel,
                      isLight && styles.metricTooltipSubMetricLabelLight,
                    ]}
                  >
                    Behind
                  </Text>
                  <Text
                    style={[
                      styles.metricTooltipSubMetricLabel,
                      isLight && styles.metricTooltipSubMetricLabelLight,
                    ]}
                  >
                    Elite
                  </Text>
                </View>
              </View>
            </View>
          )}
          <View style={styles.metricTooltipSectionLast}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              WHAT THIS MEANS
            </Text>
            <Text
              style={[
                styles.metricTooltipBody,
                isLight && styles.metricTooltipBodyLight,
              ]}
            >
              Your percentile rank compares your overall performance to other
              athletes of similar age and gender using our internal dataset.
            </Text>
          </View>
        </View>
      );
    } else if (activeMetricTooltip === "body_battle_map") {
      content = (
        <View style={styles.metricTooltipContent}>
          {renderMetricHeader(
            "grid-outline",
            "Body battle map",
            "How balanced your full-body training is",
          )}
          <View style={styles.metricTooltipPrimaryRow}>
            <View>
              <Text
                style={[
                  styles.metricTooltipValue,
                  isLight && styles.metricTooltipValueLight,
                ]}
              >
                {bodyBalanceDisplay}
              </Text>
              {bodyBalanceLabel && (
                <Text
                  style={[
                    styles.metricTooltipText,
                    isLight && styles.metricTooltipTextLight,
                  ]}
                >
                  {bodyBalanceLabel}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.metricTooltipSection}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              MUSCLE GROUP BALANCE
            </Text>
            {bodyMapRows.length > 0 ? (
              <View style={styles.metricTooltipBodyMapList}>
                {bodyMapRows.map((row) => (
                  <View key={row.key} style={styles.metricTooltipBodyMapRow}>
                    <View style={styles.metricTooltipBodyMapBullet} />
                    <View style={styles.metricTooltipBodyMapTextGroup}>
                      <Text
                        style={[
                          styles.metricTooltipText,
                          isLight && styles.metricTooltipTextLight,
                        ]}
                      >
                        {row.label}
                      </Text>
                      <Text
                        style={[
                          styles.metricTooltipSubMetricLabel,
                          isLight && styles.metricTooltipSubMetricLabelLight,
                        ]}
                      >
                        {`${row.sessions} session${
                          row.sessions === 1 ? "" : "s"
                        } · ${row.rank}`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={[
                  styles.metricTooltipText,
                  isLight && styles.metricTooltipTextLight,
                ]}
              >
                No completed workouts mapped to muscle groups yet.
              </Text>
            )}
          </View>
          <View style={styles.metricTooltipSectionLast}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              WHAT THIS MEANS
            </Text>
            <Text
              style={[
                styles.metricTooltipBody,
                isLight && styles.metricTooltipBodyLight,
              ]}
            >
              Body battle map counts how many completed sessions hit each major
              muscle group and scores how balanced your training is across your
              body.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <Modal
        visible={!!activeMetricTooltip}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.metricTooltipBackdrop}>
          <View
            style={[
              styles.metricTooltipCard,
              isLight && styles.metricTooltipCardLight,
            ]}
          >
            <ScrollView>{content}</ScrollView>
            <TouchableOpacity
              onPress={close}
              style={styles.metricTooltipCloseButton}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.metricTooltipCloseText,
                  isLight && styles.metricTooltipCloseTextLight,
                ]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      <ScrollView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
        contentContainerStyle={styles.homeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              Good morning,
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Ready to train?
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} />
          </View>
        </View>

        {/*
							<View style={styles.statsRow}>
							<TouchableOpacity
									style={[
											styles.statCard,
											isLight && styles.statCardLight,
										]}
									activeOpacity={0.9}
									onPress={handlePressFitnessAge}
							>
								<Text
										style={[
												styles.statLabel,
												isLight && styles.statLabelLight,
											]}
								>
									Fitness age
								</Text>
								<Text
										style={[
												styles.statValue,
												isLight && styles.statValueLight,
										]}
								>
									{fitnessAgeValue}
								</Text>
								{fitnessAgeDelta && (
									<Text
											style={[
													styles.statDelta,
											isLight && styles.statDeltaLight,
											fitnessDeltaColor && { color: fitnessDeltaColor },
											]}
									>
										{fitnessAgeDelta}
									</Text>
								)}
							</TouchableOpacity>
							<TouchableOpacity
									style={[
											styles.statCard,
											isLight && styles.statCardLight,
										]}
									activeOpacity={0.9}
									onPress={handlePressRaceReadiness}
							>
								<Text
										style={[
												styles.statLabel,
												isLight && styles.statLabelLight,
											]}
								>
									Race readiness
								</Text>
								<Text
										style={[
												styles.statValue,
												isLight && styles.statValueLight,
										]}
								>
									{raceScoreValue}
								</Text>
								{raceScoreLabel && (
									<Text
											style={[
													styles.statDelta,
											isLight && styles.statDeltaLight,
											raceDeltaColor && { color: raceDeltaColor },
											]}
									>
										{raceScoreLabel}
									</Text>
								)}
							</TouchableOpacity>
							<TouchableOpacity
									style={[
											styles.statCard,
											isLight && styles.statCardLight,
										]}
									activeOpacity={0.9}
									onPress={handlePressPercentile}
							>
								<Text
										style={[
												styles.statLabel,
												isLight && styles.statLabelLight,
											]}
								>
									Percentile
								</Text>
								<Text
										style={[
												styles.statValue,
												isLight && styles.statValueLight,
										]}
								>
									{percentileValue}
								</Text>
								{percentileLabel && (
									<Text
											style={[
													styles.statDelta,
											isLight && styles.statDeltaLight,
											percentileDeltaColor && { color: percentileDeltaColor },
											]}
									>
										{percentileLabel}
									</Text>
								)}
								</TouchableOpacity>
								</View>
							*/}

        <View
          style={[styles.homeHeroCard, isLight && styles.homeHeroCardLight]}
        >
          <View style={styles.homeActiveTabsRow}>
            <TouchableOpacity
              style={styles.homeActiveTabButton}
              activeOpacity={0.9}
              onPress={() => setHomeActiveTab("workouts")}
            >
              <Text
                style={[
                  styles.homeActiveTabLabel,
                  isLight && styles.homeActiveTabLabelLight,
                  homeActiveTab === "workouts" &&
                    styles.homeActiveTabLabelActive,
                  homeActiveTab === "workouts" &&
                    isLight &&
                    styles.homeActiveTabLabelActiveLight,
                ]}
              >
                Workouts
              </Text>
              {homeActiveTab === "workouts" && (
                <View
                  style={[
                    styles.homeActiveTabIndicator,
                    isLight && styles.homeActiveTabIndicatorLight,
                  ]}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeActiveTabButton}
              activeOpacity={0.9}
              onPress={() => setHomeActiveTab("nutrition")}
            >
              <Text
                style={[
                  styles.homeActiveTabLabel,
                  isLight && styles.homeActiveTabLabelLight,
                  homeActiveTab === "nutrition" &&
                    styles.homeActiveTabLabelActive,
                  homeActiveTab === "nutrition" &&
                    isLight &&
                    styles.homeActiveTabLabelActiveLight,
                ]}
              >
                Nutritions
              </Text>
              {homeActiveTab === "nutrition" && (
                <View
                  style={[
                    styles.homeActiveTabIndicator,
                    isLight && styles.homeActiveTabIndicatorLight,
                  ]}
                />
              )}
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.homeHeroLabel, isLight && styles.homeHeroLabelLight]}
          >
            {homeActiveTab === "workouts"
              ? "My Active Workout"
              : "My Active Nutrition"}
          </Text>

          {activeItems.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.homeActiveListItem,
                index === 0 && { marginTop: 12 },
              ]}
            >
              <View
                style={[
                  styles.homeActiveListIndexPill,
                  isLight && styles.homeActiveListIndexPillLight,
                ]}
              >
                <Ionicons
                  name={
                    homeActiveTab === "workouts"
                      ? "barbell-outline"
                      : "fast-food-outline"
                  }
                  size={14}
                  color={isLight ? "#0F172A" : "#E5E7EB"}
                />
                <Text
                  style={[
                    styles.homeActiveListIndexText,
                    isLight && styles.homeActiveListIndexTextLight,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <View style={styles.homeActiveListContent}>
                <View style={styles.homeActiveItemHeaderRow}>
                  <View style={styles.homeActiveItemHeaderText}>
                    <Text
                      style={[
                        styles.homeActiveItemTitle,
                        isLight && styles.homeActiveItemTitleLight,
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.homeActiveItemMetaRow}>
                      <Text
                        style={[
                          styles.homeActiveItemMeta,
                          isLight && styles.homeActiveItemMetaLight,
                        ]}
                      >
                        {`${item.durationMinutes} min • ${item.style}`}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.homeActiveItemCheckButton}
                    activeOpacity={0.8}
                    onPress={() => toggleItemCompleted(homeActiveTab, item.id)}
                  >
                    <Ionicons
                      name={
                        (
                          homeActiveTab === "workouts"
                            ? completedWorkouts[item.id]
                            : completedNutritions[item.id]
                        )
                          ? "checkmark-circle"
                          : "checkmark-circle-outline"
                      }
                      size={20}
                      color={
                        (
                          homeActiveTab === "workouts"
                            ? completedWorkouts[item.id]
                            : completedNutritions[item.id]
                        )
                          ? GLASS_ACCENT_GREEN
                          : isLight
                            ? "#CBD5E1"
                            : "#4B5563"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.homeActiveDivider} />

          <TouchableOpacity
            style={styles.homeActiveSeeAllRow}
            activeOpacity={0.8}
            onPress={() => {
              setAllActiveTab(homeActiveTab);
              setIsAllActiveSheetVisible(true);
            }}
          >
            <Text
              style={[
                styles.homeActiveSeeAllLabel,
                isLight && styles.homeActiveSeeAllLabelLight,
              ]}
            >
              {homeActiveTab === "workouts"
                ? "See All Active Workouts"
                : "Watch complete details"}
            </Text>
            <Text
              style={[
                styles.homeActiveSeeAllArrow,
                isLight && styles.homeActiveSeeAllArrowLight,
              ]}
            >
              →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Training Days calendar */}
        <View style={styles.trainingSection}>
          <View style={styles.trainingHeaderRow}>
            <Text
              style={[
                styles.trainingTitle,
                isLight && styles.trainingTitleLight,
              ]}
            >
              Training Days
            </Text>
            <View style={styles.trainingMonthControls}>
              <TouchableOpacity
                style={styles.trainingNavButton}
                onPress={handlePrevMonth}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={isLight ? "#0F172A" : "#E5E7EB"}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.trainingMonthLabel,
                  isLight && styles.trainingMonthLabelLight,
                ]}
              >
                {monthLabel}
              </Text>
              <TouchableOpacity
                style={styles.trainingNavButton}
                onPress={handleNextMonth}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isLight ? "#0F172A" : "#E5E7EB"}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.trainingCalendarContainer}>
            <View style={styles.trainingWeekdayHeaderRow}>
              {WEEKDAY_LABELS.map((label) => (
                <View key={label} style={styles.trainingDayColumn}>
                  <Text
                    style={[
                      styles.trainingDayWeekday,
                      isLight && styles.trainingDayWeekdayLight,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.trainingMonthGrid}>
              <View style={styles.trainingWeekRow}>
                {currentWeekDates.map((date) => {
                  const iso = toISODate(date);
                  const trainingDay = trainingDays.find(
                    (day) => day.date === iso,
                  );
                  const workoutsCount = trainingDay?.workouts ?? 0;
                  const isToday = iso === todayIso;
                  const weekday = date.getDay();
                  const planDayIndex = weekday === 0 ? 7 : weekday; // Plan uses Mon=1 ... Sun=7
                  const plannedWorkoutType =
                    planDayTypeByWeekday?.[planDayIndex] ?? null;

                  const inCalendarRange =
                    calendarRangeStart &&
                    calendarRangeEnd &&
                    iso >= calendarRangeStart &&
                    iso <= calendarRangeEnd;

                  const isCompleted = inCalendarRange && workoutsCount > 0;
                  const hasPlannedWorkout = !!plannedWorkoutType;
                  const isMissed =
                    inCalendarRange &&
                    hasPlannedWorkout &&
                    workoutsCount === 0 &&
                    iso < todayIso;

                  const showStatusCircle =
                    hasPlannedWorkout || isCompleted || isMissed || isToday;
                  const statusCircleStyles: any[] = [
                    styles.trainingDayStickerCircle,
                  ];
                  if (hasPlannedWorkout) {
                    // Color circle by planned workout type (Strength vs Run/Hybrid vs Rest),
                    // matching the blue/green tiles from the reference UI.
                    if (plannedWorkoutType === "strength") {
                      statusCircleStyles.push(
                        styles.trainingDayActiveCircleSecondary,
                      );
                    } else if (plannedWorkoutType === "cardio") {
                      statusCircleStyles.push(
                        styles.trainingDayActiveCirclePrimary,
                      );
                    } else if (
                      plannedWorkoutType === "recovery" ||
                      plannedWorkoutType === "rest"
                    ) {
                      statusCircleStyles.push(
                        styles.trainingDayActiveCirclePrimary,
                      );
                    }
                  }
                  if (isToday) {
                    statusCircleStyles.push(
                      isLight
                        ? styles.trainingDayTodayCircleLight
                        : styles.trainingDayTodayCircleDark,
                    );
                  }
                  if (isMissed) {
                    // Missed days get a soft red tint, still using the same icon.
                    statusCircleStyles.push(styles.trainingDayMissedCircle);
                  }

                  return (
                    <View key={iso} style={styles.trainingDayColumn}>
                      {showStatusCircle && (
                        <View style={statusCircleStyles}>
                          {hasPlannedWorkout && (
                            <FancyWorkoutTypeIcon
                              type={plannedWorkoutType as any}
                              size={22}
                            />
                          )}
                        </View>
                      )}
                      <Text
                        style={[
                          styles.trainingDayDate,
                          isLight && styles.trainingDayDateLight,
                          isToday &&
                            (isLight
                              ? styles.trainingDayDateTodayLight
                              : styles.trainingDayDateTodayDark),
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={styles.trainingLegendRow}>
              {[
                {
                  key: "strength",
                  label: "Strength",
                  type: "strength" as const,
                },
                { key: "run", label: "Run", type: "run" as const },
                { key: "hybrid", label: "Hybrid", type: "hybrid" as const },
                { key: "rest", label: "Rest", type: "recovery" as const },
              ].map(({ key, label, type }) => {
                let isActive = false;
                if (todayPlannedWorkoutType) {
                  if (
                    key === "strength" &&
                    todayPlannedWorkoutType === "strength"
                  ) {
                    isActive = true;
                  } else if (
                    (key === "run" || key === "hybrid") &&
                    todayPlannedWorkoutType === "cardio"
                  ) {
                    isActive = true;
                  } else if (
                    key === "rest" &&
                    todayPlannedWorkoutType === "recovery"
                  ) {
                    isActive = true;
                  }
                }
                const iconSize = isActive ? 24 : 22;
                const iconColor = isLight ? "#1E293B" : "#F9FAFB";
                return (
                  <View
                    key={key}
                    style={[
                      styles.trainingLegendItem,
                      isActive &&
                        (isLight
                          ? styles.trainingLegendItemActiveLight
                          : styles.trainingLegendItemActiveDark),
                    ]}
                  >
                    <View
                      style={[
                        styles.trainingLegendIconWrap,
                        isActive
                          ? styles.trainingLegendIconActive
                          : styles.trainingLegendIconDimmed,
                      ]}
                    >
                      <FancyWorkoutTypeIcon
                        type={type}
                        size={iconSize}
                        color={iconColor}
                      />
                    </View>
                    <Text
                      style={[
                        styles.metricCaption,
                        isLight && styles.metricCaptionLight,
                        styles.trainingLegendLabel,
                        isActive &&
                          (isLight
                            ? styles.trainingLegendLabelActiveLight
                            : styles.trainingLegendLabelActiveDark),
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.homeActiveSeeAllRow}
              activeOpacity={0.8}
              onPress={() => {
                void reloadWorkoutHistory();
                setIsWorkoutHistoryVisible(true);
              }}
            >
              <Text
                style={[
                  styles.homeActiveSeeAllLabel,
                  isLight && styles.homeActiveSeeAllLabelLight,
                ]}
              >
                View previous workouts
              </Text>
              <Text
                style={[
                  styles.homeActiveSeeAllArrow,
                  isLight && styles.homeActiveSeeAllArrowLight,
                ]}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* All active workouts/nutrition bottom sheet (like Exercise Library) */}
        <Modal
          visible={isAllActiveSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsAllActiveSheetVisible(false)}
        >
          <View style={styles.filterSheetRoot}>
            <TouchableOpacity
              style={styles.filterSheetBackdrop}
              activeOpacity={1}
              onPress={() => setIsAllActiveSheetVisible(false)}
            />
            <View
              style={[
                styles.filterSheetContainer,
                styles.homeAllActiveSheetContainer,
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
                    Active workouts & nutrition
                  </Text>
                  <Text
                    style={[
                      styles.filterSheetSubtitle,
                      isLight && styles.filterSheetSubtitleLight,
                    ]}
                  >
                    Browse all your current plans in one place.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.homeAllActiveCloseButton}
                  activeOpacity={0.8}
                  onPress={() => setIsAllActiveSheetVisible(false)}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={isLight ? "#4B5563" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.exerciseTabsToggle,
                  isLight && styles.exerciseTabsToggleLight,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.exerciseTabButton,
                    isLight && styles.exerciseTabButtonLight,
                    allActiveTab === "workouts" &&
                      (isLight
                        ? styles.exerciseTabButtonActiveLight
                        : styles.exerciseTabButtonActive),
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setAllActiveTab("workouts")}
                >
                  <Text
                    style={[
                      styles.exerciseTabLabel,
                      isLight && styles.exerciseTabLabelLight,
                      allActiveTab === "workouts" &&
                        styles.exerciseTabLabelActive,
                    ]}
                  >
                    Workouts
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.exerciseTabButton,
                    isLight && styles.exerciseTabButtonLight,
                    allActiveTab === "nutrition" &&
                      (isLight
                        ? styles.exerciseTabButtonActiveLight
                        : styles.exerciseTabButtonActive),
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setAllActiveTab("nutrition")}
                >
                  <Text
                    style={[
                      styles.exerciseTabLabel,
                      isLight && styles.exerciseTabLabelLight,
                      allActiveTab === "nutrition" &&
                        styles.exerciseTabLabelActive,
                    ]}
                  >
                    Nutritions
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.homeAllActiveListScroll}
              >
                {(allActiveTab === "workouts"
                  ? activeWorkoutItems
                  : activeNutritionItems
                ).map((item) => {
                  const isCompleted =
                    allActiveTab === "workouts"
                      ? completedWorkouts[item.id]
                      : completedNutritions[item.id];

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.homeAllActiveWorkoutCard,
                        isLight && styles.homeAllActiveWorkoutCardLight,
                      ]}
                    >
                      {/* Workout Header */}
                      <View style={styles.homeAllActiveWorkoutHeader}>
                        <View style={styles.homeAllActiveWorkoutTitleRow}>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.homeAllActiveWorkoutTitle,
                                isLight &&
                                  styles.homeAllActiveWorkoutTitleLight,
                              ]}
                            >
                              {item.title}
                            </Text>
                            <Text
                              style={[
                                styles.homeAllActiveWorkoutMeta,
                                isLight && styles.homeAllActiveWorkoutMetaLight,
                              ]}
                            >
                              {`${item.durationMinutes} min • ${item.style}`}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.homeActiveItemCheckButton}
                            activeOpacity={0.8}
                            onPress={() =>
                              toggleItemCompleted(allActiveTab, item.id)
                            }
                          >
                            <Ionicons
                              name={
                                isCompleted
                                  ? "checkmark-circle"
                                  : "checkmark-circle-outline"
                              }
                              size={24}
                              color={
                                isCompleted
                                  ? GLASS_ACCENT_GREEN
                                  : isLight
                                    ? "#CBD5E1"
                                    : "#4B5563"
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Exercises List */}
                      {allActiveTab === "workouts" &&
                      item.exerciseSegments &&
                      item.exerciseSegments.length ? (
                        <View style={styles.homeAllActiveExerciseList}>
                          {item.exerciseSegments.map((segment, index) => {
                            const pr = exercisePrInputs[segment.id] ?? {
                              weight: "",
                              sets: "",
                            };
                            const isSaved = savedExercisePrs[segment.id];
                            return (
                              <View
                                key={segment.id}
                                style={[
                                  styles.homeAllActiveExerciseCard,
                                  isLight &&
                                    styles.homeAllActiveExerciseCardLight,
                                ]}
                              >
                                {/* Exercise Info */}
                                <View style={styles.homeAllActiveExerciseInfo}>
                                  <Text
                                    style={[
                                      styles.homeAllActiveExerciseName,
                                      isLight &&
                                        styles.homeAllActiveExerciseNameLight,
                                    ]}
                                  >
                                    {segment.label}
                                  </Text>
                                  <View
                                    style={styles.homeAllActiveExerciseMetaRow}
                                  >
                                    <Text
                                      style={[
                                        styles.homeAllActiveExerciseDetail,
                                        isLight &&
                                          styles.homeAllActiveExerciseDetailLight,
                                      ]}
                                    >
                                      {segment.primary}
                                    </Text>
                                    {segment.secondary && (
                                      <>
                                        <Text
                                          style={
                                            styles.homeAllActiveExerciseSeparator
                                          }
                                        >
                                          •
                                        </Text>
                                        <Text
                                          style={[
                                            styles.homeAllActiveExerciseDetail,
                                            isLight &&
                                              styles.homeAllActiveExerciseDetailLight,
                                          ]}
                                        >
                                          {segment.secondary}
                                        </Text>
                                      </>
                                    )}
                                  </View>
                                </View>

                                {/* Personal Best Input */}
                                <View style={styles.homeAllActivePrContainer}>
                                  <Text
                                    style={[
                                      styles.homeAllActivePrLabel,
                                      isLight &&
                                        styles.homeAllActivePrLabelLight,
                                    ]}
                                  >
                                    PERSONAL BEST
                                  </Text>
                                  <View style={styles.homeAllActivePrInputRow}>
                                    <TextInput
                                      style={[
                                        styles.homeAllActivePrInput,
                                        isLight &&
                                          styles.homeAllActivePrInputLight,
                                      ]}
                                      placeholder="Weight"
                                      placeholderTextColor={
                                        isLight ? "#9CA3AF" : "#6B7280"
                                      }
                                      keyboardType="numeric"
                                      value={pr.weight}
                                      onChangeText={(text) =>
                                        updateExercisePrInput(
                                          segment.id,
                                          "weight",
                                          text,
                                        )
                                      }
                                    />
                                    <TextInput
                                      style={[
                                        styles.homeAllActivePrInput,
                                        isLight &&
                                          styles.homeAllActivePrInputLight,
                                      ]}
                                      placeholder="Sets"
                                      placeholderTextColor={
                                        isLight ? "#9CA3AF" : "#6B7280"
                                      }
                                      keyboardType="numeric"
                                      value={pr.sets}
                                      onChangeText={(text) =>
                                        updateExercisePrInput(
                                          segment.id,
                                          "sets",
                                          text,
                                        )
                                      }
                                    />
                                    <TouchableOpacity
                                      style={[
                                        styles.homeAllActivePrSaveButton,
                                        isLight &&
                                          styles.homeAllActivePrSaveButtonLight,
                                        isSaved &&
                                          styles.homeAllActivePrSaveButtonSaved,
                                      ]}
                                      activeOpacity={0.85}
                                      onPress={() =>
                                        handleSaveExercisePr(
                                          segment.id,
                                          segment.label,
                                          segment.primary,
                                          segment.secondary,
                                          item.title,
                                        )
                                      }
                                    >
                                      <Text
                                        style={[
                                          styles.homeAllActivePrSaveLabel,
                                          isLight &&
                                            styles.homeAllActivePrSaveLabelLight,
                                          isSaved &&
                                            styles.homeAllActivePrSaveLabelSaved,
                                        ]}
                                      >
                                        {isSaved ? "Saved" : "Save"}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}

                      {/* Nutrition Details */}
                      {allActiveTab === "nutrition" &&
                      item.dietDetails &&
                      item.dietDetails.length ? (
                        <View style={styles.homeAllActiveDietCardsContainer}>
                          {item.dietDetails.map((detail, detailIndex) => (
                            <View
                              key={`${item.id}_detail_${detailIndex}`}
                              style={[
                                styles.homeAllActiveDietCard,
                                isLight && styles.homeAllActiveDietCardLight,
                              ]}
                            >
                              <Text style={styles.homeAllActiveDietBulletDot}>
                                •
                              </Text>
                              <Text
                                style={[
                                  styles.homeAllActiveDietText,
                                  isLight && styles.homeAllActiveDietTextLight,
                                ]}
                              >
                                {detail}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Previous workouts history bottom sheet */}
        <Modal
          visible={isWorkoutHistoryVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsWorkoutHistoryVisible(false)}
        >
          <View style={styles.filterSheetRoot}>
            <TouchableOpacity
              style={styles.filterSheetBackdrop}
              activeOpacity={1}
              onPress={() => setIsWorkoutHistoryVisible(false)}
            />
            <View
              style={[
                styles.filterSheetContainer,
                styles.homeAllActiveSheetContainer,
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
                    Previous workouts
                  </Text>
                  <Text
                    style={[
                      styles.filterSheetSubtitle,
                      isLight && styles.filterSheetSubtitleLight,
                    ]}
                  >
                    See your recent completed and missed training days.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.homeAllActiveCloseButton}
                  activeOpacity={0.8}
                  onPress={() => setIsWorkoutHistoryVisible(false)}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={isLight ? "#4B5563" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              </View>

              {workoutHistoryError ? (
                <Text
                  style={[
                    styles.metricCaption,
                    isLight && styles.metricCaptionLight,
                  ]}
                >
                  {workoutHistoryError}
                </Text>
              ) : null}

              {workoutHistoryLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={GLASS_ACCENT_GREEN} />
                </View>
              )}

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.homeAllActiveListScroll}
              >
                {!workoutHistoryLoading &&
                workoutHistoryItems.length === 0 &&
                !workoutHistoryError ? (
                  <Text
                    style={[
                      styles.workoutHistoryEmptyText,
                      isLight && styles.workoutHistoryEmptyTextLight,
                    ]}
                  >
                    No workouts logged yet.
                  </Text>
                ) : (
                  workoutHistoryItems.map((item, index) => {
                    const isCompleted = item.status === "completed";
                    const dateLabel = item.completed_at ?? item.date;
                    return (
                      <View
                        key={`${item.date}-${item.title}-${index}`}
                        style={[
                          styles.workoutHistoryRow,
                          isLight && styles.workoutHistoryRowLight,
                        ]}
                      >
                        <View style={styles.workoutHistoryTextCol}>
                          <Text
                            style={[
                              styles.workoutHistoryTitle,
                              isLight && styles.workoutHistoryTitleLight,
                            ]}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[
                              styles.workoutHistoryDate,
                              isLight && styles.workoutHistoryDateLight,
                            ]}
                          >
                            {dateLabel}
                          </Text>
                        </View>
                        <View style={styles.workoutHistoryStatusWrap}>
                          <Ionicons
                            name={
                              isCompleted
                                ? "checkmark-circle"
                                : "close-circle-outline"
                            }
                            size={20}
                            color={
                              isCompleted
                                ? GLASS_ACCENT_GREEN
                                : DARK_ACCENT_ORANGE
                            }
                          />
                          <Text
                            style={[
                              styles.workoutHistoryStatusLabel,
                              isCompleted
                                ? styles.workoutHistoryStatusCompleted
                                : styles.workoutHistoryStatusMissed,
                            ]}
                          >
                            {isCompleted ? "Completed" : "Missed"}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Today metrics section */}
        <View style={styles.homeSectionHeaderRow}>
          <Text
            style={[
              styles.homeSectionTitle,
              isLight && styles.homeSectionTitleLight,
            ]}
          >
            Today metrics
          </Text>
          <TouchableOpacity
            onPress={reloadMetrics}
            activeOpacity={0.8}
            disabled={metricsLoading}
            style={[
              styles.homeHeaderRefreshButton,
              metricsLoading && { opacity: 0.5 },
            ]}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={isLight ? LIGHT_TEXT_MUTED : GLASS_TEXT_MUTED}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.metricsSection}>
          <TouchableOpacity
            style={[
              styles.metricCardLarge,
              isLight && styles.metricCardLargeLight,
            ]}
            activeOpacity={0.9}
            onPress={handlePressFitnessAge}
          >
            <View style={styles.metricCardHeaderRow}>
              <Text
                style={[
                  styles.metricCardTitle,
                  isLight && styles.metricCardTitleLight,
                ]}
              >
                Fitness age
              </Text>
              <Ionicons
                name="pulse-outline"
                size={18}
                color={isLight ? "#6B7280" : "#9CA3AF"}
              />
            </View>
            <MetricGauge
              progress={fitnessGaugeProgress}
              isLight={isLight}
              size="large"
              leftLabel="Younger"
              rightLabel="Older"
              centerText={
                typeof fitness?.fitness_age_years === "number"
                  ? String(fitness.fitness_age_years)
                  : metricsLoading
                    ? "..."
                    : "--"
              }
              centerSubText="yrs"
            />
            <View style={styles.metricFitnessMetaRow}>
              {chronologicalAge != null && (
                <Text
                  style={[
                    styles.metricMetaText,
                    isLight && styles.metricMetaTextLight,
                  ]}
                >
                  {`Actual: ${chronologicalAge}`}
                </Text>
              )}
              {fitnessAgeDelta && (
                <Text
                  style={[
                    styles.metricDeltaText,
                    isLight && styles.metricDeltaTextLight,
                    fitnessDeltaColor && { color: fitnessDeltaColor },
                  ]}
                >
                  {fitnessAgeDelta}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.metricCaption,
                isLight && styles.metricCaptionLight,
              ]}
            >
              Based on heart rate, strength, flexibility & endurance
            </Text>
            <Text
              style={[styles.metricLink, isLight && styles.metricLinkLight]}
            >
              Retake test
            </Text>
          </TouchableOpacity>

          <View style={styles.metricsRow}>
            <TouchableOpacity
              style={[
                styles.metricCardSmall,
                isLight && styles.metricCardSmallLight,
              ]}
              activeOpacity={0.9}
              onPress={handlePressRaceReadiness}
            >
              <View style={styles.metricCardHeaderRow}>
                <Text
                  style={[
                    styles.metricCardTitle,
                    isLight && styles.metricCardTitleLight,
                  ]}
                >
                  Race readiness
                </Text>
                <Ionicons
                  name="trophy-outline"
                  size={18}
                  color={isLight ? "#6B7280" : "#9CA3AF"}
                />
              </View>
              {raceScoreLabel && (
                <Text
                  style={[
                    styles.metricDeltaText,
                    isLight && styles.metricDeltaTextLight,
                    raceDeltaColor && { color: raceDeltaColor },
                  ]}
                >
                  {raceScoreLabel}
                </Text>
              )}
              <MetricGauge
                progress={raceGaugeProgress}
                isLight={isLight}
                size="small"
                leftLabel="Base"
                rightLabel="Ready"
                centerText={
                  racePercent != null
                    ? String(racePercent)
                    : metricsLoading
                      ? "..."
                      : "--"
                }
                centerSubText="%"
              />
              <View style={styles.metricProgressGroup}>
                {racePlanPercent != null && (
                  <View style={styles.metricProgressRow}>
                    <Text
                      style={[
                        styles.metricProgressLabel,
                        isLight && styles.metricProgressLabelLight,
                      ]}
                    >
                      Plan
                    </Text>
                    <View style={styles.metricProgressBarTrack}>
                      <View
                        style={[
                          styles.metricProgressBarFill,
                          {
                            width: `${Math.max(0, Math.min(100, racePlanPercent))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.metricProgressValue,
                        isLight && styles.metricProgressValueLight,
                      ]}
                    >
                      {`${Math.round(racePlanPercent)}%`}
                    </Text>
                  </View>
                )}
                {raceConsistencyPercent != null && (
                  <View style={styles.metricProgressRow}>
                    <Text
                      style={[
                        styles.metricProgressLabel,
                        isLight && styles.metricProgressLabelLight,
                      ]}
                    >
                      Consistency
                    </Text>
                    <View style={styles.metricProgressBarTrack}>
                      <View
                        style={[
                          styles.metricProgressBarFill,
                          {
                            width: `${Math.max(0, Math.min(100, raceConsistencyPercent))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.metricProgressValue,
                        isLight && styles.metricProgressValueLight,
                      ]}
                    >
                      {`${Math.round(raceConsistencyPercent)}%`}
                    </Text>
                  </View>
                )}
                {raceBenchmarksPercent != null && (
                  <View style={styles.metricProgressRow}>
                    <Text
                      style={[
                        styles.metricProgressLabel,
                        isLight && styles.metricProgressLabelLight,
                      ]}
                    >
                      Benchmarks
                    </Text>
                    <View style={styles.metricProgressBarTrack}>
                      <View
                        style={[
                          styles.metricProgressBarFill,
                          {
                            width: `${Math.max(0, Math.min(100, raceBenchmarksPercent))}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.metricProgressValue,
                        isLight && styles.metricProgressValueLight,
                      ]}
                    >
                      {`${Math.round(raceBenchmarksPercent)}%`}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.metricCardSmall,
                styles.metricCardSmallRight,
                isLight && styles.metricCardSmallLight,
              ]}
              activeOpacity={0.9}
              onPress={handlePressPercentile}
            >
              <View style={styles.metricCardHeaderRow}>
                <Text
                  style={[
                    styles.metricCardTitle,
                    isLight && styles.metricCardTitleLight,
                  ]}
                >
                  Fitter than
                </Text>
                <Ionicons
                  name="stats-chart-outline"
                  size={18}
                  color={isLight ? "#6B7280" : "#9CA3AF"}
                />
              </View>
              <Text
                style={[
                  styles.metricSecondaryValue,
                  isLight && styles.metricSecondaryValueLight,
                ]}
              >
                {percentilePercentDisplay}
              </Text>
              {percentilePercent != null && (
                <Text
                  style={[
                    styles.metricCaption,
                    isLight && styles.metricCaptionLight,
                  ]}
                >
                  Fitter than {percentilePercent}% of peers
                </Text>
              )}
              <PercentileCurve
                isLight={isLight}
                percentile={percentilePercent}
              />
              {percentileLabel && (
                <Text
                  style={[
                    styles.metricDeltaText,
                    isLight && styles.metricDeltaTextLight,
                    percentileDeltaColor && { color: percentileDeltaColor },
                  ]}
                >
                  {percentileLabel}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View
            style={[
              styles.metricCardSmall,
              isLight && styles.metricCardSmallLight,
            ]}
          >
            <View style={styles.metricCardHeaderRow}>
              <Text
                style={[
                  styles.metricCardTitle,
                  isLight && styles.metricCardTitleLight,
                ]}
              >
                Streak
              </Text>
              <Ionicons
                name="flame-outline"
                size={18}
                color={isLight ? "#F97316" : "#FDBA74"}
              />
            </View>
            <View style={styles.metricStreakPrimaryRow}>
              <Text
                style={[
                  styles.metricSecondaryValue,
                  isLight && styles.metricSecondaryValueLight,
                ]}
              >
                {streakCurrentLabel}
              </Text>
              {streakMultiplierLabel && (
                <Text
                  style={[
                    styles.metricStreakMultiplierText,
                    isLight && styles.metricStreakMultiplierTextLight,
                  ]}
                >
                  {streakMultiplierLabel}
                </Text>
              )}
            </View>
            <StreakDotsRow current={streakCurrentDays} isLight={isLight} />
            <View style={styles.metricStreakMetaRow}>
              {streakBestLabel && (
                <Text
                  style={[
                    styles.metricCaption,
                    isLight && styles.metricCaptionLight,
                  ]}
                >
                  {streakBestLabel}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.metricCaption,
                isLight && styles.metricCaptionLight,
              ]}
            >
              Don't break the chain
            </Text>
          </View>

          <View
            style={[
              styles.metricCardSmall,
              styles.metricCardSmallRight,
              isLight && styles.metricCardSmallLight,
            ]}
          >
            <View style={styles.metricCardHeaderRow}>
              <Text
                style={[
                  styles.metricCardTitle,
                  isLight && styles.metricCardTitleLight,
                ]}
              >
                Time invested
              </Text>
              <Ionicons
                name="time-outline"
                size={18}
                color={isLight ? "#6B7280" : "#9CA3AF"}
              />
            </View>
            <View style={styles.metricTimePrimaryRow}>
              <Text
                style={[
                  styles.metricTimePrimaryHours,
                  isLight && styles.metricTimePrimaryHoursLight,
                ]}
              >
                {totalTimeAllHours != null ? totalTimeAllHours : "--"}
              </Text>
              <Text
                style={[
                  styles.metricTimePrimaryUnit,
                  isLight && styles.metricTimePrimaryUnitLight,
                ]}
              >
                h
              </Text>
              <Text
                style={[
                  styles.metricTimePrimaryMinutes,
                  isLight && styles.metricTimePrimaryMinutesLight,
                ]}
              >
                {totalTimeAllMinutes != null ? totalTimeAllMinutes : "--"}
              </Text>
              <Text
                style={[
                  styles.metricTimePrimaryUnit,
                  isLight && styles.metricTimePrimaryUnitLight,
                ]}
              >
                m
              </Text>
            </View>
            <View style={styles.metricTimeBreakdownRow}>
              <Text
                style={[
                  styles.metricCaption,
                  isLight && styles.metricCaptionLight,
                ]}
              >
                30d: {totalTime30dLabel}
              </Text>
              <Text
                style={[
                  styles.metricCaption,
                  isLight && styles.metricCaptionLight,
                ]}
              >
                7d: {totalTime7dLabel}
              </Text>
            </View>
            <View style={styles.metricTimeTag}>
              <Text
                style={[
                  styles.metricTimeTagText,
                  isLight && styles.metricTimeTagTextLight,
                ]}
              >
                Like running Mumbai → Pune
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.metricCardLarge,
            isLight && styles.metricCardLargeLight,
            { marginTop: 12 },
          ]}
        >
          <View style={styles.metricCardHeaderRow}>
            <Text
              style={[
                styles.metricCardTitle,
                isLight && styles.metricCardTitleLight,
              ]}
            >
              Body battle map
            </Text>
            <TouchableOpacity
              onPress={handlePressBodyBattleMap}
              activeOpacity={0.8}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={isLight ? "#6B7280" : "#9CA3AF"}
              />
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <View
              style={{
                flexBasis: 112,
                maxWidth: 112,
                height: 165,
                marginRight: 16,
              }}
            >
              <BodyMuscleFront
                isLight={isLight}
                resetKey={0}
                singleSelect
                onSelectionChange={handleBodyMapSelectionChange}
              />
            </View>
            <View style={{ flex: 1 }}>
              {bodyMapRows.length > 0 && (
                <View>
                  {bodyMapRows.map((row) => {
                    const isActive = row.key === activeBodyBattleGroup;
                    return (
                      <View
                        key={row.key}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginVertical: 8,
                          paddingVertical: isActive ? 4 : 0,
                          paddingHorizontal: 8,
                          borderRadius: isActive ? 999 : 0,
                          backgroundColor: isActive
                            ? "rgba(148,163,184,0.18)"
                            : "transparent",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                          }}
                        >
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 999,
                              backgroundColor: row.color,
                              marginRight: 8,
                            }}
                          />
                          <Text
                            style={[
                              styles.metricCaption,
                              isLight && styles.metricCaptionLight,
                              isActive && { fontWeight: "600" },
                              { marginTop: 0 },
                            ]}
                          >
                            {row.label}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.metricCaption,
                            {
                              color: row.color,
                              fontWeight: isActive ? "700" : "600",
                              marginTop: 0,
                            },
                          ]}
                        >
                          {row.rank}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
          {bodyMapRows.length > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              {["Recruit", "Soldier", "Warrior", "Beast", "Legend"].map(
                (rank) => {
                  const color =
                    BODY_BATTLE_RANK_COLORS[rank] ??
                    BODY_BATTLE_RANK_COLORS["Recruit"];
                  return (
                    <View
                      key={rank}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginRight: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: color,
                          marginRight: 4,
                          marginTop: 6,
                        }}
                      />
                      <Text
                        style={[
                          styles.metricCaption,
                          isLight && styles.metricCaptionLight,
                        ]}
                      >
                        {rank}
                      </Text>
                    </View>
                  );
                },
              )}
            </View>
          )}
        </View>
      </ScrollView>
      {renderMetricTooltip()}
    </>
  );
};

const PlansScreen: React.FC<PlansHomeProps> = ({ navigation }) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const sectionIconColor = isLight ? "#0F172A" : DARK_TEXT_PRIMARY;

  const { profile } = useUserProfileBasic();
  const plansUserName =
    profile?.profile.display_name || profile?.username || null;

  const { plans, loading: plansLoading, error: plansError } = usePlans();

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const planFilters = [
    "All",
    "Most enrolled",
    "New",
    "Running/Cardio",
    "Strength",
    "Bodyweight",
    "Home",
    "Completed",
  ];

  // Find the user's active plan
  const activePlanId = profile?.profile.active_plan_id;
  const activePlan = activePlanId
    ? plans.find((p) => p.id === activePlanId)
    : null;

  // Loading state
  if (plansLoading) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {plansUserName ? `Hi ${plansUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your plans
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} name={plansUserName} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading plans…</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (plansError) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {plansUserName ? `Hi ${plansUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your plans
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} name={plansUserName} />
          </View>
        </View>
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          Plans
        </Text>
        <Text style={styles.errorText}>{plansError}</Text>
      </View>
    );
  }

  if (!plans.length) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {plansUserName ? `Hi ${plansUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your plans
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} name={plansUserName} />
          </View>
        </View>
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          Plans
        </Text>
        <Text
          style={[styles.screenSubtitle, isLight && styles.screenSubtitleLight]}
        >
          Training plans coming soon.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.screenContainer,
        styles.screenContainerNoPadding,
        isLight && styles.screenContainerLight,
      ]}
      contentContainerStyle={styles.plansScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 20 }}>
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {plansUserName ? `Hi ${plansUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your plans
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} name={plansUserName} />
          </View>
        </View>
      </View>

      {activePlan && (
        <View
          style={[
            styles.plansHeaderContainer,
            isLight && styles.plansHeaderContainerLight,
          ]}
        >
          <View style={styles.plansHeaderRow}>
            <Text
              style={[
                styles.plansHeaderTitle,
                isLight
                  ? styles.plansHeaderTitleLight
                  : styles.plansHeaderTitleDark,
              ]}
            >
              Your Plan
            </Text>
          </View>

          <View
            style={[
              styles.plansActiveCard,
              isLight && styles.plansActiveCardLight,
            ]}
          >
            <View style={styles.plansActiveTitleRow}>
              <View style={styles.plansActiveTitlePillRow}>
                <Text
                  style={[
                    styles.plansActiveTitle,
                    isLight
                      ? styles.plansActiveTitleLight
                      : styles.plansActiveTitleDark,
                  ]}
                >
                  {activePlan.name}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.plansActiveSubtitle,
                !isLight && styles.plansActiveSubtitleDark,
              ]}
            >
              {activePlan.durationWeeks} weeks • {activePlan.sessionsPerWeek}{" "}
              sessions/week
            </Text>

            <View
              style={[
                styles.plansNextRow,
                isLight ? styles.plansNextRowLight : styles.plansNextRowDark,
              ]}
            >
              <View>
                <Text
                  style={[
                    styles.plansNextLabel,
                    isLight
                      ? styles.plansNextLabelLight
                      : styles.plansNextLabelDark,
                  ]}
                >
                  Next workout
                </Text>
                <Text
                  style={[
                    styles.plansNextValue,
                    isLight
                      ? styles.plansNextValueLight
                      : styles.plansNextValueDark,
                  ]}
                >
                  Tomorrow • Full body
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.plansNextButton,
                  isLight
                    ? styles.plansNextButtonLight
                    : styles.plansNextButtonDark,
                ]}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("PlanDetail", { planId: activePlan.id })
                }
              >
                <Text
                  style={[
                    styles.plansNextButtonLabel,
                    isLight
                      ? styles.plansNextButtonLabelLight
                      : styles.plansNextButtonLabelDark,
                  ]}
                >
                  View
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.plansActiveButtonsRow}>
              <TouchableOpacity
                style={styles.plansPrimaryButton}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("PlanDetail", { planId: activePlan.id })
                }
              >
                <Text style={styles.plansPrimaryButtonLabel}>View plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.plansSecondaryButton}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.plansSecondaryButtonLabel,
                    isLight
                      ? styles.plansSecondaryButtonLabelLight
                      : styles.plansSecondaryButtonLabelDark,
                  ]}
                >
                  Switch plan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.planFiltersScroll}
      >
        {planFilters.map((filter) => {
          const isActive = filter === activeFilter;
          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.planFilterPill,
                isActive && styles.planFilterPillActive,
              ]}
              activeOpacity={0.9}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.planFilterLabel,
                  isActive && styles.planFilterLabelActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.plansBodyContainer}>
        <View style={styles.planSection}>
          <View style={styles.planSectionHeader}>
            <Ionicons
              name="ribbon-outline"
              size={20}
              color={sectionIconColor}
              style={styles.planSectionHeaderIcon}
            />
            <Text
              style={[
                styles.planSectionTitle,
                isLight
                  ? styles.planSectionTitleLight
                  : styles.planSectionTitleDark,
              ]}
            >
              Available plans
            </Text>
          </View>

          <View>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                title={plan.name}
                tag={plan.goal}
                duration={`${plan.durationWeeks} weeks · ${plan.sessionsPerWeek} days/wk`}
                level={plan.level.charAt(0).toUpperCase() + plan.level.slice(1)}
                equipment={["Full program"]}
                enrolledCount="–"
                status={activePlanId === plan.id ? "enrolled" : "preview"}
                onPress={() =>
                  navigation.navigate("PlanDetail", {
                    planId: plan.id,
                  })
                }
              />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

type PlanCardStatus = "preview" | "enrolled" | "completed";

type PlanCardProps = {
  title: string;
  tag: string;
  duration: string;
  level: string;
  equipment: string[];
  enrolledCount: string;
  status: PlanCardStatus;
  onPress?: () => void;
};

const PlanCard: React.FC<PlanCardProps> = ({
  title,
  tag,
  duration,
  level,
  equipment,
  enrolledCount,
  status,
  onPress,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const metaIconColor = isLight ? LIGHT_TEXT_MUTED : DARK_TEXT_MUTED;
  const buttonLabel =
    status === "completed"
      ? "View completion details"
      : status === "enrolled"
        ? "Switch to this plan"
        : "Preview plan";

  const iconColor = status === "enrolled" ? "#FFFFFF" : "#0F172A";

  return (
    <View style={[styles.planCard, isLight && styles.planCardLight]}>
      {status === "completed" && (
        <View style={styles.planCardCompletedBadge}>
          <Ionicons
            name="checkmark-circle-outline"
            size={24}
            color={metaIconColor}
          />
        </View>
      )}

      <View style={styles.planCardHeaderRow}>
        <View>
          <Text
            style={[
              styles.planCardTitle,
              isLight ? styles.planCardTitleLight : styles.planCardTitleDark,
            ]}
          >
            {title}
          </Text>
          <View style={styles.planCardTagPill}>
            <Text
              style={[
                styles.planCardTagLabel,
                isLight
                  ? styles.planCardTagLabelLight
                  : styles.planCardTagLabelDark,
              ]}
            >
              {tag}
            </Text>
          </View>
        </View>

        <View style={styles.planCardMetaColumn}>
          <View style={styles.planCardMetaRow}>
            <Ionicons name="time-outline" size={14} color={metaIconColor} />
            <Text
              style={[
                styles.planCardMetaText,
                isLight
                  ? styles.planCardMetaTextLight
                  : styles.planCardMetaTextDark,
              ]}
            >
              {duration}
            </Text>
          </View>
          <View style={styles.planCardMetaRow}>
            <Ionicons name="flame-outline" size={14} color={metaIconColor} />
            <Text
              style={[
                styles.planCardMetaText,
                isLight
                  ? styles.planCardMetaTextLight
                  : styles.planCardMetaTextDark,
              ]}
            >
              {level}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.planCardFooterRow}>
        <View style={styles.planCardEquipmentRow}>
          {equipment.includes("dumbbells") && (
            <View style={styles.planCardEquipIcon}>
              <Ionicons
                name="barbell-outline"
                size={16}
                color={metaIconColor}
              />
            </View>
          )}
          {equipment.includes("bodyweight") && (
            <View style={styles.planCardEquipIcon}>
              <Ionicons name="person-outline" size={16} color={metaIconColor} />
            </View>
          )}
          {equipment.includes("barbell") && (
            <View style={styles.planCardEquipIcon}>
              <Ionicons
                name="barbell-outline"
                size={16}
                color={metaIconColor}
              />
            </View>
          )}
        </View>

        <View style={styles.planCardEnrolledRow}>
          <Ionicons name="people-outline" size={14} color={metaIconColor} />
          <Text
            style={[
              styles.planCardEnrolledText,
              isLight
                ? styles.planCardEnrolledTextLight
                : styles.planCardEnrolledTextDark,
            ]}
          >
            {enrolledCount} joined
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.planCardButton,
          status === "completed"
            ? styles.planCardButtonCompleted
            : status === "enrolled"
              ? styles.planCardButtonEnrolled
              : styles.planCardButtonPreview,
        ]}
        activeOpacity={0.9}
        onPress={onPress}
      >
        <Text
          style={[
            styles.planCardButtonLabel,
            status === "completed" && styles.planCardButtonLabelCompleted,
            status === "enrolled" && styles.planCardButtonLabelEnrolled,
            status === "preview" && styles.planCardButtonLabelPreview,
          ]}
        >
          {buttonLabel}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={iconColor} />
      </TouchableOpacity>
    </View>
  );
};

const PlanBodyFigure: React.FC<{
  fillHeight: Animated.AnimatedInterpolation<number>;
  isLight: boolean;
}> = ({ fillHeight, isLight }) => {
  // Outline stays subtle and theme-aware; the inner fill is higher
  // contrast and also adapts to the theme so it reads as a "progress"
  // bar inside the body silhouette.
  const outlineColor = isLight ? "#E2E8F0" : "#1F2937";
  const fillColor = isLight ? "#0F172A" : DARK_TEXT_PRIMARY;

  return (
    <View style={styles.planBodyContainer}>
      {/* Background outline body */}
      <Svg viewBox="0 0 64 128" fill={outlineColor} style={styles.planBodySvg}>
        <Circle cx={32} cy={14} r={10} />
        <Path d="M 32 28 C 45 28 54 32 58 40 L 62 60 C 63 62 60 64 58 62 L 50 46 L 46 70 L 46 118 C 46 122 40 122 40 118 L 40 80 L 24 80 L 24 118 C 24 122 18 122 18 118 L 18 70 L 14 46 L 6 62 C 4 64 1 62 2 60 L 6 40 C 10 32 19 28 32 28 Z" />
      </Svg>
      {/* Foreground body fill, revealed from the bottom up via the mask */}
      <Animated.View style={[styles.planBodyFillMask, { height: fillHeight }]}>
        <Svg viewBox="0 0 64 128" fill={fillColor} style={styles.planBodySvg}>
          <Circle cx={32} cy={14} r={10} />
          <Path d="M 32 28 C 45 28 54 32 58 40 L 62 60 C 63 62 60 64 58 62 L 50 46 L 46 70 L 46 118 C 46 122 40 122 40 118 L 40 80 L 24 80 L 24 118 C 24 122 18 122 18 118 L 18 70 L 14 46 L 6 62 C 4 64 1 62 2 60 L 6 40 C 10 32 19 28 32 28 Z" />
        </Svg>
      </Animated.View>
    </View>
  );
};

type ViewWorkoutWeekModalProps = {
  week: ViewWorkoutWeek | null;
  isLight: boolean;
  // Only show and enable "Mark as complete" when the viewed plan is the
  // user's currently enrolled plan.
  canMarkComplete?: boolean;
  onClose: () => void;
  // Optional callback so parents (like HomeScreen) can refresh dashboard
  // metrics/calendar after a day is marked complete.
  onDayMarkedComplete?: () => void;
};

const ViewWorkoutWeekModal: React.FC<ViewWorkoutWeekModalProps> = ({
  week,
  isLight,
  canMarkComplete = false,
  onClose,
  onDayMarkedComplete,
}) => {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [completingDayId, setCompletingDayId] = useState<string | null>(null);
  const [completedDayIds, setCompletedDayIds] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!week) {
      setExpandedDayId(null);
      return;
    }
    // Default to the first day that has segments (like the Interval Run)
    // so the user sees the detailed pattern immediately, matching the
    // reference design.
    const firstWithSegments = week.days.find(
      (day) => day.segments && day.segments.length > 0,
    );
    setExpandedDayId(firstWithSegments?.id ?? week.days[0]?.id ?? null);
  }, [week]);

  if (!week) return null;

  const handleMarkComplete = async (dayId: string) => {
    if (!canMarkComplete || !accessToken) return;
    if (completingDayId) return;
    setCompletingDayId(dayId);
    try {
      let tokenToUse = accessToken;
      let response = await fetch(`${API_BASE_URL}/plans/complete-day/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({ plan_day_id: Number(dayId) || dayId }),
      });
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          await signOut();
          return;
        }
        response = await fetch(`${API_BASE_URL}/plans/complete-day/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshed}`,
          },
          body: JSON.stringify({ plan_day_id: Number(dayId) || dayId }),
        });
      }
      if (!response.ok) {
        // For now we silently ignore failures; in a later iteration we can surface
        // a toast or inline error.
        return;
      }
      setCompletedDayIds((prev) => ({ ...prev, [dayId]: true }));
      // Ask parent to refresh dashboard summary so the Home calendar reflects
      // the newly completed day.
      if (onDayMarkedComplete) {
        try {
          onDayMarkedComplete();
        } catch {
          // Best-effort; ignore errors from refresh.
        }
      }
    } finally {
      setCompletingDayId(null);
    }
  };

  return (
    <Modal
      visible={!!week}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.viewWorkoutModalRoot}>
        <TouchableOpacity
          style={styles.viewWorkoutModalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.viewWorkoutModalCard,
            isLight && styles.viewWorkoutModalCardLight,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.viewWorkoutCloseButton,
              isLight && styles.viewWorkoutCloseButtonLight,
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons
              name="close"
              size={22}
              color={isLight ? "#0F172A" : "#E5E7EB"}
            />
          </TouchableOpacity>
          <View style={styles.viewWorkoutHandle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.viewWorkoutScrollContent}
          >
            <Text
              style={[
                styles.viewWorkoutWeekLabel,
                isLight
                  ? styles.viewWorkoutWeekLabelLight
                  : styles.viewWorkoutWeekLabelDark,
              ]}
            >
              {week.label}
            </Text>

            {week.days.map((day, index) => {
              const isExpanded = expandedDayId === day.id;
              const circleStyle =
                day.type === "strength"
                  ? styles.viewWorkoutIconCircleStrength
                  : day.type === "rest"
                    ? styles.viewWorkoutIconCircleRest
                    : styles.viewWorkoutIconCircleRun;

              const isCompleted = !!completedDayIds[day.id];
              const isCompleting = completingDayId === day.id;

              return (
                <View key={day.id}>
                  <View style={styles.viewWorkoutDayRow}>
                    <View style={styles.viewWorkoutCardWrapper}>
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={[
                          styles.viewWorkoutCard,
                          isLight
                            ? styles.viewWorkoutCardLight
                            : styles.viewWorkoutCardDark,
                        ]}
                        onPress={() =>
                          setExpandedDayId(isExpanded ? null : day.id)
                        }
                      >
                        <View style={styles.viewWorkoutDayLabelInCardRow}>
                          <Text
                            style={[
                              styles.viewWorkoutDayLabelInCardText,
                              isLight
                                ? styles.viewWorkoutDayLabelInCardTextLight
                                : styles.viewWorkoutDayLabelInCardTextDark,
                            ]}
                          >
                            {day.weekdayLabel} {day.dateLabel}
                          </Text>
                          {canMarkComplete && (
                            <TouchableOpacity
                              style={[
                                styles.viewWorkoutDayCompleteButton,
                                isCompleted &&
                                  styles.viewWorkoutDayCompleteButtonDone,
                              ]}
                              activeOpacity={0.8}
                              onPress={() => handleMarkComplete(day.id)}
                            >
                              <Text
                                style={[
                                  styles.viewWorkoutDayCompleteButtonText,
                                  isCompleted &&
                                    styles.viewWorkoutDayCompleteButtonTextDone,
                                ]}
                              >
                                {isCompleted
                                  ? "Completed"
                                  : isCompleting
                                    ? "Marking..."
                                    : "Mark as complete"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.viewWorkoutCardHeaderRow}>
                          <View style={circleStyle}>
                            {day.type === "run" && (
                              <Ionicons
                                name="stopwatch-outline"
                                size={20}
                                color="#FFFFFF"
                              />
                            )}
                            {day.type === "strength" && (
                              <Ionicons
                                name="barbell-outline"
                                size={20}
                                color="#111827"
                              />
                            )}
                            {day.type === "rest" && (
                              <Ionicons
                                name="moon-outline"
                                size={20}
                                color="#111827"
                              />
                            )}
                          </View>
                          <View style={styles.viewWorkoutHeaderTextBlock}>
                            <Text
                              style={[
                                styles.viewWorkoutHeaderTitle,
                                isLight
                                  ? styles.viewWorkoutHeaderTitleLight
                                  : styles.viewWorkoutHeaderTitleDark,
                              ]}
                            >
                              {day.title}
                            </Text>
                            <Text
                              style={[
                                styles.viewWorkoutHeaderSubtitle,
                                isLight
                                  ? styles.viewWorkoutHeaderSubtitleLight
                                  : styles.viewWorkoutHeaderSubtitleDark,
                              ]}
                            >
                              {day.subtitle}
                            </Text>
                          </View>
                          <Ionicons
                            name={
                              isExpanded
                                ? "chevron-up-outline"
                                : "chevron-down-outline"
                            }
                            size={20}
                            color="#9CA3AF"
                          />
                        </View>

                        {isExpanded && (
                          <>
                            {day.headerTags && day.headerTags.length > 0 && (
                              <View style={styles.viewWorkoutHeaderTagsRow}>
                                <Text
                                  style={[
                                    styles.viewWorkoutHeaderTagText,
                                    isLight &&
                                      styles.viewWorkoutHeaderTagTextLight,
                                  ]}
                                >
                                  {day.headerTags.join(" \u2022 ")}
                                </Text>
                              </View>
                            )}
                            {day.segments && day.segments.length > 0 && (
                              <View style={styles.viewWorkoutSegmentsContainer}>
                                <View
                                  style={styles.viewWorkoutSegmentHeaderRow}
                                >
                                  <View
                                    style={styles.viewWorkoutSegmentColLabel}
                                  >
                                    <Text
                                      style={[
                                        styles.viewWorkoutSegmentHeaderText,
                                        isLight &&
                                          styles.viewWorkoutSegmentHeaderTextLight,
                                      ]}
                                    >
                                      Label
                                    </Text>
                                  </View>
                                  <View
                                    style={styles.viewWorkoutSegmentColPrimary}
                                  >
                                    <Text
                                      style={[
                                        styles.viewWorkoutSegmentHeaderText,
                                        isLight &&
                                          styles.viewWorkoutSegmentHeaderTextLight,
                                      ]}
                                    >
                                      Primary
                                    </Text>
                                  </View>
                                  <View
                                    style={
                                      styles.viewWorkoutSegmentColSecondary
                                    }
                                  >
                                    <Text
                                      style={[
                                        styles.viewWorkoutSegmentHeaderText,
                                        isLight &&
                                          styles.viewWorkoutSegmentHeaderTextLight,
                                      ]}
                                    >
                                      Secondary
                                    </Text>
                                  </View>
                                </View>
                                {day.segments.map((segment) => (
                                  <View
                                    key={segment.id}
                                    style={styles.viewWorkoutSegmentRow}
                                  >
                                    <View
                                      style={styles.viewWorkoutSegmentColLabel}
                                    >
                                      <Text
                                        style={[
                                          styles.viewWorkoutSegmentLabel,
                                          isLight &&
                                            styles.viewWorkoutSegmentLabelLight,
                                        ]}
                                      >
                                        {segment.label}
                                      </Text>
                                    </View>
                                    <View
                                      style={
                                        styles.viewWorkoutSegmentColPrimary
                                      }
                                    >
                                      <Text
                                        style={[
                                          styles.viewWorkoutSegmentPrimary,
                                          isLight &&
                                            styles.viewWorkoutSegmentPrimaryLight,
                                        ]}
                                      >
                                        {segment.primary}
                                      </Text>
                                    </View>
                                    <View
                                      style={
                                        styles.viewWorkoutSegmentColSecondary
                                      }
                                    >
                                      {segment.secondary ? (
                                        <Text
                                          style={[
                                            styles.viewWorkoutSegmentSecondary,
                                            isLight &&
                                              styles.viewWorkoutSegmentSecondaryLight,
                                          ]}
                                        >
                                          {segment.secondary}
                                        </Text>
                                      ) : null}
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}
                            {day.notes ? (
                              <Text
                                style={[
                                  styles.viewWorkoutNotes,
                                  isLight && styles.viewWorkoutNotesLight,
                                ]}
                              >
                                {day.notes}
                              </Text>
                            ) : null}
                            {day.exercises ? (
                              <Text
                                style={[
                                  styles.viewWorkoutExercises,
                                  isLight && styles.viewWorkoutExercisesLight,
                                ]}
                              >
                                {day.exercises}
                              </Text>
                            ) : null}
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                  {index < week.days.length - 1 && (
                    <View style={styles.viewWorkoutDayDivider} />
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

type ViewNutritionWeekModalProps = {
  week: ViewNutritionWeek | null;
  isLight: boolean;
  onClose: () => void;
};

const ViewNutritionWeekModal: React.FC<ViewNutritionWeekModalProps> = ({
  week,
  isLight,
  onClose,
}) => {
  if (!week) return null;

  return (
    <Modal
      visible={!!week}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.viewWorkoutModalRoot}>
        <TouchableOpacity
          style={styles.viewWorkoutModalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.viewWorkoutModalCard,
            isLight && styles.viewWorkoutModalCardLight,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.viewWorkoutCloseButton,
              isLight && styles.viewWorkoutCloseButtonLight,
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close nutrition details"
          >
            <Ionicons
              name="close"
              size={22}
              color={isLight ? "#0F172A" : "#E5E7EB"}
            />
          </TouchableOpacity>
          <View style={styles.viewWorkoutHandle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.viewWorkoutScrollContent}
          >
            <Text
              style={[
                styles.viewWorkoutWeekLabel,
                isLight
                  ? styles.viewWorkoutWeekLabelLight
                  : styles.viewWorkoutWeekLabelDark,
              ]}
            >
              {week.label}
            </Text>

            {week.days.map((day, index) => (
              <View key={day.id}>
                <View style={styles.viewWorkoutDayRow}>
                  <View style={styles.viewWorkoutCardWrapper}>
                    <View
                      style={[
                        styles.viewWorkoutCard,
                        isLight
                          ? styles.viewWorkoutCardLight
                          : styles.viewWorkoutCardDark,
                      ]}
                    >
                      <View style={styles.viewWorkoutDayLabelInCardRow}>
                        <Text
                          style={[
                            styles.viewWorkoutDayLabelInCardText,
                            isLight
                              ? styles.viewWorkoutDayLabelInCardTextLight
                              : styles.viewWorkoutDayLabelInCardTextDark,
                          ]}
                        >
                          {day.weekdayLabel} {day.dateLabel}
                        </Text>
                      </View>
                      <View style={styles.viewWorkoutCardHeaderRow}>
                        <View style={styles.viewWorkoutIconCircleRun}>
                          <Ionicons
                            name="restaurant-outline"
                            size={20}
                            color="#FFFFFF"
                          />
                        </View>
                        <View style={styles.viewWorkoutHeaderTextBlock}>
                          {day.title ? (
                            <Text
                              style={[
                                styles.viewWorkoutHeaderTitle,
                                isLight
                                  ? styles.viewWorkoutHeaderTitleLight
                                  : styles.viewWorkoutHeaderTitleDark,
                              ]}
                            >
                              {day.title}
                            </Text>
                          ) : null}
                          {day.description ? (
                            <Text
                              style={[
                                styles.viewWorkoutHeaderSubtitle,
                                isLight
                                  ? styles.viewWorkoutHeaderSubtitleLight
                                  : styles.viewWorkoutHeaderSubtitleDark,
                              ]}
                            >
                              {day.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {day.bullets && day.bullets.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                          {day.bullets.map((bullet, idx) => (
                            <View
                              key={idx}
                              style={{ flexDirection: "row", marginBottom: 4 }}
                            >
                              <View style={styles.planWeekHighlightDot} />
                              <Text
                                style={[
                                  styles.planWeekHighlightText,
                                  isLight
                                    ? styles.planWeekHighlightTextLight
                                    : styles.planWeekHighlightTextDark,
                                ]}
                              >
                                {bullet}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {index < week.days.length - 1 && (
                  <View style={styles.viewWorkoutDayDivider} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const PlanDetailScreenV2: React.FC<PlanDetailProps> = ({
  route,
  navigation,
}) => {
  const { planId } = route.params;
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  // Reuse the same basic profile info so the header matches
  // the rest of the app (avatar + greeting context).
  const { profile } = useUserProfileBasic();
  const plansUserName =
    profile?.profile.display_name || profile?.username || null;

  // Fetch plan details from API
  const { plan, loading, error } = usePlanDetail(planId);
  // We also keep a handle to the dashboard summary reload function so that
  // when the user marks a plan day as complete, the Home dashboard
  // calendar/metrics can be refreshed to reflect it.
  const { reload: reloadDashboardSummary } = useDashboardSummary();

  const [activeViewWorkoutWeek, setActiveViewWorkoutWeek] =
    useState<ViewWorkoutWeek | null>(null);
  const [activeNutritionWeek, setActiveNutritionWeek] =
    useState<ViewNutritionWeek | null>(null);

  // Loading state
  if (loading) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={styles.homeHeaderRow}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.linkText, isLight && styles.linkTextLight]}>
                {"\u2039 Back to plans"}
              </Text>
            </TouchableOpacity>
            <View style={{ marginTop: 8 }}>
              <Text
                style={[
                  styles.homeGreetingLabel,
                  isLight && styles.homeGreetingLabelLight,
                ]}
              >
                {plansUserName ? `Hi ${plansUserName},` : "Hi,"}
              </Text>
              <Text
                style={[
                  styles.homeGreetingTitle,
                  isLight && styles.homeGreetingTitleLight,
                ]}
              >
                Your plan
              </Text>
            </View>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} name={plansUserName} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading plan…</Text>
        </View>
      </View>
    );
  }

  // Error or no plan state
  if (error || !plan) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={styles.homeHeaderRow}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.linkText, isLight && styles.linkTextLight]}>
                {"\u2039 Back to plans"}
              </Text>
            </TouchableOpacity>
            <View style={{ marginTop: 8 }}>
              <Text
                style={[
                  styles.homeGreetingLabel,
                  isLight && styles.homeGreetingLabelLight,
                ]}
              >
                {plansUserName ? `Hi ${plansUserName},` : "Hi,"}
              </Text>
              <Text
                style={[
                  styles.homeGreetingTitle,
                  isLight && styles.homeGreetingTitleLight,
                ]}
              >
                Your plan
              </Text>
            </View>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} name={plansUserName} />
          </View>
        </View>
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          Plan Details
        </Text>
        <Text style={styles.errorText}>{error || "Plan not found"}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
        contentContainerStyle={styles.plansScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with back link plus the same greeting pattern
								   used on other screens so this feels consistent. */}
        <View style={styles.homeHeaderRow}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={[styles.linkText, isLight && styles.linkTextLight]}>
                {"\u2039 Back to plans"}
              </Text>
            </TouchableOpacity>
            <View style={{ marginTop: 8 }}>
              <Text
                style={[
                  styles.homeGreetingLabel,
                  isLight && styles.homeGreetingLabelLight,
                ]}
              >
                {plansUserName ? `Hi ${plansUserName},` : "Hi,"}
              </Text>
              <Text
                style={[
                  styles.homeGreetingTitle,
                  isLight && styles.homeGreetingTitleLight,
                ]}
              >
                Your plan
              </Text>
            </View>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} name={plansUserName} />
          </View>
        </View>

        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          {plan.name}
        </Text>
        <View style={styles.planMetaChipsRow}>
          <View
            style={[styles.planMetaChip, isLight && styles.planMetaChipLight]}
          >
            <Text
              style={[
                styles.planMetaChipText,
                isLight
                  ? styles.planMetaChipTextLight
                  : styles.planMetaChipTextDark,
              ]}
            >
              {plan.durationWeeks} weeks
            </Text>
          </View>
          <View
            style={[styles.planMetaChip, isLight && styles.planMetaChipLight]}
          >
            <Text
              style={[
                styles.planMetaChipText,
                isLight
                  ? styles.planMetaChipTextLight
                  : styles.planMetaChipTextDark,
              ]}
            >
              {plan.sessionsPerWeek} sessions/week
            </Text>
          </View>
          <View
            style={[styles.planMetaChip, isLight && styles.planMetaChipLight]}
          >
            <Text
              style={[
                styles.planMetaChipText,
                isLight
                  ? styles.planMetaChipTextLight
                  : styles.planMetaChipTextDark,
              ]}
            >
              {plan.level.toUpperCase()}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.planOverviewCard,
            isLight && styles.planOverviewCardLight,
          ]}
        >
          <Text
            style={[
              styles.planOverviewHeading,
              isLight
                ? styles.planOverviewHeadingLight
                : styles.planOverviewHeadingDark,
            ]}
          >
            About this plan
          </Text>

          <View style={[styles.planOverviewRow, styles.planOverviewRowFirst]}>
            <Text
              style={[
                styles.planOverviewLabel,
                isLight
                  ? styles.planOverviewLabelLight
                  : styles.planOverviewLabelDark,
              ]}
            >
              Overview
            </Text>
            <Text
              style={[
                styles.planOverviewValue,
                isLight
                  ? styles.planOverviewValueLight
                  : styles.planOverviewValueDark,
              ]}
            >
              {plan.summary}
            </Text>
          </View>
        </View>

        <View style={styles.planOverviewInfoRow}>
          <View
            style={[styles.planInfoCard, isLight && styles.planInfoCardLight]}
          >
            <View style={styles.planInfoCardHeaderRow}>
              <View
                style={[
                  styles.planInfoIconCircle,
                  styles.planInfoIconCircleFocus,
                ]}
              >
                <Ionicons name="flame-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.planInfoCardHeaderTextBlock}>
                <Text
                  style={[
                    styles.planInfoCardTitle,
                    isLight
                      ? styles.planInfoCardTitleLight
                      : styles.planInfoCardTitleDark,
                  ]}
                >
                  Focus
                </Text>
                <Text
                  style={[
                    styles.planInfoCardSubtitle,
                    isLight
                      ? styles.planInfoCardSubtitleLight
                      : styles.planInfoCardSubtitleDark,
                  ]}
                >
                  Our program focus
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.planInfoCardBody,
                isLight
                  ? styles.planInfoCardBodyLight
                  : styles.planInfoCardBodyDark,
              ]}
            >
              {plan.goal}
            </Text>
          </View>

          <View style={styles.planOverviewInfoSpacer} />

          <View
            style={[styles.planInfoCard, isLight && styles.planInfoCardLight]}
          >
            <View style={styles.planInfoCardHeaderRow}>
              <View
                style={[
                  styles.planInfoIconCircle,
                  styles.planInfoIconCircleAudience,
                ]}
              >
                <Ionicons name="people-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.planInfoCardHeaderTextBlock}>
                <Text
                  style={[
                    styles.planInfoCardTitle,
                    isLight
                      ? styles.planInfoCardTitleLight
                      : styles.planInfoCardTitleDark,
                  ]}
                >
                  Who is it for
                </Text>
                <Text
                  style={[
                    styles.planInfoCardSubtitle,
                    isLight
                      ? styles.planInfoCardSubtitleLight
                      : styles.planInfoCardSubtitleDark,
                  ]}
                >
                  Who should follow
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.planInfoCardBody,
                isLight
                  ? styles.planInfoCardBodyLight
                  : styles.planInfoCardBodyDark,
              ]}
            >
              {plan.audience}
            </Text>
          </View>
        </View>

        <View style={styles.planDetailContainer}>
          <Text
            style={[
              styles.planDetailHeading,
              isLight
                ? styles.planDetailHeadingLight
                : styles.planDetailHeadingDark,
            ]}
          >
            Plan structure
          </Text>

          <View
            style={{
              marginTop: 16,
            }}
          >
            {plan.weeks.map((week) => {
              const nutritionWeek = mapPlanWeekToViewNutritionWeek(week);

              return (
                <View key={week.id} style={{ marginBottom: 24 }}>
                  {/* Week Overview Box */}
                  <View
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      backgroundColor: isLight ? LIGHT_CARD : DARK_CARD,
                      borderWidth: 1,
                      borderColor: isLight
                        ? "#E2E8F0"
                        : "rgba(148, 163, 184, 0.35)",
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: isLight ? "#0F172A" : "#1E293B",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "#FFFFFF",
                            fontSize: 14,
                            fontWeight: "700",
                          }}
                        >
                          {week.number}
                        </Text>
                      </View>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 16,
                          fontWeight: "700",
                          color: isLight
                            ? LIGHT_TEXT_PRIMARY
                            : DARK_TEXT_PRIMARY,
                        }}
                        numberOfLines={1}
                      >
                        Week {week.number}: {week.title}
                      </Text>
                    </View>

                    <Text
                      style={{
                        fontSize: 13,
                        lineHeight: 19,
                        color: isLight ? "#4B5563" : DARK_TEXT_MUTED,
                        marginBottom: 12,
                      }}
                    >
                      {week.description}
                    </Text>

                    {/* Workout & Nutrition actions */}
                    <View
                      style={{
                        flexDirection: "row",
                      }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.planWeekViewFullButton,
                          isLight && styles.planWeekViewFullButtonLight,
                          { marginRight: 8 },
                        ]}
                        activeOpacity={0.85}
                        onPress={() =>
                          setActiveViewWorkoutWeek(
                            mapPlanWeekToViewWorkoutWeek(week),
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.planWeekViewFullButtonLabel,
                            isLight
                              ? styles.planWeekViewFullButtonLabelLight
                              : styles.planWeekViewFullButtonLabelDark,
                          ]}
                        >
                          Workout
                        </Text>
                        <Ionicons
                          name="chevron-up-outline"
                          size={16}
                          color={isLight ? "#0F172A" : DARK_TEXT_PRIMARY}
                          style={styles.planWeekViewFullButtonIcon}
                        />
                      </TouchableOpacity>

                      {nutritionWeek && (
                        <TouchableOpacity
                          style={[
                            styles.planWeekViewFullButton,
                            isLight && styles.planWeekViewFullButtonLight,
                          ]}
                          activeOpacity={0.85}
                          onPress={() => setActiveNutritionWeek(nutritionWeek)}
                        >
                          <Text
                            style={[
                              styles.planWeekViewFullButtonLabel,
                              isLight
                                ? styles.planWeekViewFullButtonLabelLight
                                : styles.planWeekViewFullButtonLabelDark,
                            ]}
                          >
                            Nutrition
                          </Text>
                          <Ionicons
                            name="restaurant-outline"
                            size={16}
                            color={isLight ? "#0F172A" : DARK_TEXT_PRIMARY}
                            style={styles.planWeekViewFullButtonIcon}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <ViewWorkoutWeekModal
        week={activeViewWorkoutWeek}
        isLight={isLight}
        canMarkComplete={
          !!profile?.profile.active_plan_id &&
          profile.profile.active_plan_id === plan.id
        }
        onClose={() => setActiveViewWorkoutWeek(null)}
        onDayMarkedComplete={reloadDashboardSummary}
      />
      <ViewNutritionWeekModal
        week={activeNutritionWeek}
        isLight={isLight}
        onClose={() => setActiveNutritionWeek(null)}
      />
    </View>
  );
};

/*
	const ExerciseListScreen: React.FC = () => {
	const { mode } = useThemeMode();
	const isLight = mode === 'light';
	const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
		null,
	);
	const [heroImageIndex, setHeroImageIndex] = useState(0);
																	<TouchableOpacity
																		style={[
																			styles.planWeekBlock,
																			isLight && styles.planWeekBlockLight,
																			isActive && styles.planWeekBlockActive,
																			isLight && isActive && styles.planWeekBlockActiveLight,
																		]}
																		onPress={() => handleWeekPress(week, index)}
																	>
																		<Text
																			style={[
																				styles.planWeekBlockTitle,
																				isLight && styles.planWeekBlockTitleLight,
																			]}
																		>
																			Week {week.weekNumber}
																		</Text>
																		<Text
																			style={[
																				styles.planWeekBlockSubtitle,
																				isLight && styles.planWeekBlockSubtitleLight,
																			]}
																		>
																			{week.title}
																		</Text>
																		{isActive && (
																			<>
																				<Text
																					style={[
																						styles.planWeekOutcomeLabel,
																						isLight
																							? styles.planWeekOutcomeLabelLight
																							: styles.planWeekOutcomeLabelDark,
																					]}
																				>
																					By the end of Week {week.weekNumber}, you'll:
																				</Text>
																				<Text
																					style={[
																						styles.planWeekOutcomeText,
																						isLight
																							? styles.planWeekOutcomeTextLight
																							: styles.planWeekOutcomeTextDark,
																					]}
																				>
																					{week.focus}
																				</Text>

																				<View style={styles.planWeekHighlightsContainer}>
																					{week.highlights.map((highlight) => (
																						<View
																							key={highlight}
																							style={styles.planWeekHighlightRow}
																						>
																							<View style={styles.planWeekHighlightDot} />
																							<Text
																								style={[
																									styles.planWeekHighlightText,
																									isLight
																										? styles.planWeekHighlightTextLight
																										: styles.planWeekHighlightTextDark,
																								]}
																							>
																								{highlight}
																							</Text>
																						</View>
																					))}
																				</View>

																				<View style={styles.planWeekExercisesContainer}>
																					<Text
																						style={[
																							styles.planWeekExercisesHeading,
																							isLight
																								? styles.planWeekExercisesHeadingLight
																								: styles.planWeekExercisesHeadingDark,
																						]}
																					>
																							Key exercises this week
																						</Text>
																					{weekExercises.map((exercise) => (
																						<View
																							key={`${week.weekNumber}-${exercise.name}`}
																							style={[
																								styles.planWeekExerciseCard,
																								isLight && styles.planWeekExerciseCardLight,
																							]}
																						>
																							<Text
																								style={[
																									styles.planWeekExerciseTitle,
																									isLight && styles.planWeekExerciseTitleLight,
																								]}
																							>
																								{exercise.name}
																							</Text>
																							<Text
																								style={[
																									styles.planWeekExerciseSubtitle,
																									isLight && styles.planWeekExerciseSubtitleLight,
																								]}
																							>
																								{exercise.description}
																												</Text>
																											</View>
																										))}
																									</View>
																								</>
																							)}
																						</TouchableOpacity>
																					</View>
																					</View>
																			);
																		})}
							</Animated.ScrollView>
					</View>
					<View style={styles.planWeekControlsRow}>
						<TouchableOpacity
								style={[
									styles.planWeekControlButton,
									!hasPreviousWeek && styles.planWeekControlButtonDisabled,
								]}
								onPress={handleGoToPreviousWeek}
								disabled={!hasPreviousWeek}
						>
							<Text
									style={[
										styles.planWeekControlLabel,
										isLight
											? styles.planWeekControlLabelLight
											: styles.planWeekControlLabelDark,
									]}
							>
								Previous week
							</Text>
						</TouchableOpacity>
						<View style={styles.planWeekControlsSummary}>
							<Text
									style={[
										styles.planWeekSummaryText,
										isLight
											? styles.planWeekSummaryTextLight
											: styles.planWeekSummaryTextDark,
									]}
							>
								Week {currentWeekIndex + 1} of {weeksCount}
							</Text>
						</View>
						<TouchableOpacity
								style={[
									styles.planWeekControlButton,
									!hasNextWeek && styles.planWeekControlButtonDisabled,
								]}
								onPress={handleGoToNextWeek}
								disabled={!hasNextWeek}
						>
							<Text
									style={[
										styles.planWeekControlLabel,
										isLight
											? styles.planWeekControlLabelLight
											: styles.planWeekControlLabelDark,
									]}
							>
								Next week
							</Text>
						</TouchableOpacity>
					</View>
				</View>
				</ScrollView>
			);
		};
	*/

const ExerciseListScreen: React.FC = () => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupApi[]>([]);
  const [nextExercisesPageUrl, setNextExercisesPageUrl] = useState<
    string | null
  >(null);
  const [isLoadingMoreExercises, setIsLoadingMoreExercises] =
    useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bodySide, setBodySide] = useState<"front" | "back">("front");
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [frontSelection, setFrontSelection] = useState<MuscleName[]>([]);
  const [backSelection, setBackSelection] = useState<MuscleName[]>([]);
  const [activeFilterMuscleNames, setActiveFilterMuscleNames] = useState<
    MuscleName[] | null
  >(null);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeFilterSheet, setActiveFilterSheet] =
    useState<FilterSheetKey>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [mechanicFilter, setMechanicFilter] = useState<MechanicFilter>("all");
  const [forceFilter, setForceFilter] = useState<ForceFilter>("all");

  const { profile } = useUserProfileBasic();
  const exercisesUserName =
    profile?.profile.display_name || profile?.username || null;

  const selectedMuscles = useMemo(
    () =>
      Array.from(new Set<MuscleName>([...frontSelection, ...backSelection])),
    [frontSelection, backSelection],
  );
  const hasSelection = selectedMuscles.length > 0;

  useEffect(() => {
    // Debounce the raw search input so we don't trigger a network request on
    // every keystroke. The server-side filter will use this debounced value.
    const handle = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(handle);
  }, [searchQuery]);

  const selectedExerciseDetail = useMemo(() => {
    if (!selectedExercise) {
      return null;
    }

    const primaryMusclesLabel =
      selectedExercise.primary_muscles.length > 0
        ? selectedExercise.primary_muscles.join(", ")
        : null;

    const levelLabel = selectedExercise.level
      ? selectedExercise.level.charAt(0).toUpperCase() +
        selectedExercise.level.slice(1)
      : "";

    const equipmentLabel =
      selectedExercise.equipment && selectedExercise.equipment.length > 0
        ? selectedExercise.equipment[0]
        : null;

    const aboutText =
      selectedExercise.description ||
      "Strengthen the primary target muscles with controlled repetitions and focus on good technique.";

    const howToPerformSteps = [
      "Start with a light warm-up set and focus on your setup and alignment.",
      "Lower the weight under control, keeping a stable brace throughout the movement.",
      "Drive back to the start position without bouncing or rushing the reps.",
    ];

    const commonMistakes = [
      "Using more weight than you can control with solid technique.",
      "Letting posture or joint alignment collapse at the bottom of the rep.",
      "Relying on momentum instead of controlled, smooth repetitions.",
    ];

    return {
      primaryMusclesLabel,
      levelLabel,
      equipmentLabel,
      aboutText,
      howToPerformSteps,
      commonMistakes,
    };
  }, [selectedExercise]);

  // Initial load: fetch the first page of exercises and the full list of
  // muscle groups. This gives us the metadata we need for later filter
  // requests, while keeping the initial payload small via pagination.
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [exercisesResponse, musclesResponse] = await Promise.all([
          fetch(
            buildExercisesUrl(API_BASE_URL, {
              limit: EXERCISES_PAGE_SIZE,
            }),
          ),
          fetch(`${API_BASE_URL}/muscles/`),
        ]);

        if (!exercisesResponse.ok) {
          throw new Error(
            `Failed to load exercises (${exercisesResponse.status})`,
          );
        }

        if (!musclesResponse.ok) {
          throw new Error(`Failed to load muscles (${musclesResponse.status})`);
        }

        const exercisesJson =
          (await exercisesResponse.json()) as ExerciseListResponse;
        const musclesJson = await musclesResponse.json();

        // The muscles endpoint may be paginated ({ results: [...] }) or a raw list.
        let muscleList: MuscleGroupApi[] = [];
        if (Array.isArray(musclesJson)) {
          muscleList = musclesJson as MuscleGroupApi[];
        } else if (musclesJson && Array.isArray(musclesJson.results)) {
          muscleList = musclesJson.results as MuscleGroupApi[];
        }

        if (isMounted) {
          setExercises(exercisesJson.results ?? []);
          setNextExercisesPageUrl(exercisesJson.next ?? null);
          setMuscleGroups(muscleList);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  // When the list view is visible and the user changes filters or search,
  // ask the backend for a fresh, filtered page instead of filtering on the
  // client. This keeps memory usage low and makes image loading more
  // reliable for large exercise libraries.
  useEffect(() => {
    if (!showAllExercises) {
      return;
    }

    const filterMuscleNames = activeFilterMuscleNames ?? [];
    const hasMuscleFilter = filterMuscleNames.length > 0;
    const hasSearchFilter = debouncedSearchQuery.length > 0;

    // If we have a muscle filter but the muscle metadata hasn't loaded yet,
    // wait until it has so we can map labels to IDs correctly.
    if (hasMuscleFilter && muscleGroups.length === 0) {
      return;
    }

    let isMounted = true;

    const loadFiltered = async () => {
      try {
        setLoading(true);
        setError(null);

        const muscleIds =
          hasMuscleFilter && muscleGroups.length
            ? getMuscleIdsForSelection(filterMuscleNames, muscleGroups)
            : [];

        const exercisesUrl = buildExercisesUrl(API_BASE_URL, {
          limit: EXERCISES_PAGE_SIZE,
          muscleIds,
          // Let the backend handle text search over name/description.
          search: hasSearchFilter ? debouncedSearchQuery : undefined,
        });

        const response = await fetch(exercisesUrl);
        if (!response.ok) {
          throw new Error(`Failed to load exercises (${response.status})`);
        }
        const json = (await response.json()) as ExerciseListResponse;

        if (!isMounted) {
          return;
        }

        setExercises(json.results ?? []);
        setNextExercisesPageUrl(json.next ?? null);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadFiltered();

    return () => {
      isMounted = false;
    };
  }, [
    showAllExercises,
    activeFilterMuscleNames,
    debouncedSearchQuery,
    muscleGroups,
  ]);

  const handleViewExercisesPress = () => {
    if (!hasSelection) {
      return;
    }

    // When entering the list view from the body map, reset search & other filters
    setSearchQuery("");
    setLevelFilter("all");
    setMechanicFilter("all");
    setForceFilter("all");
    setActiveFilterSheet(null);
    setActiveFilterMuscleNames(selectedMuscles);
    setShowAllExercises(true);
  };

  const handleBackToBodyMap = () => {
    setShowAllExercises(false);
    setActiveFilterMuscleNames(null);
    setFrontSelection([]);
    setBackSelection([]);
    setSelectionResetKey((key) => key + 1);
    setSearchQuery("");
    setLevelFilter("all");
    setMechanicFilter("all");
    setForceFilter("all");
    setActiveFilterSheet(null);
  };

  const handleLoadMoreExercises = async () => {
    // If there's no next page from the server or we're already fetching,
    // do nothing.
    if (!nextExercisesPageUrl || isLoadingMoreExercises || loading) {
      return;
    }

    setIsLoadingMoreExercises(true);
    try {
      const response = await fetch(nextExercisesPageUrl);
      if (!response.ok) {
        // Treat pagination failures as non-fatal: keep the items we already
        // have and simply stop trying to load more.
        return;
      }
      const json = (await response.json()) as ExerciseListResponse;
      setExercises((prev: Exercise[]) => [...prev, ...(json.results ?? [])]);
      setNextExercisesPageUrl(json.next ?? null);
    } finally {
      setIsLoadingMoreExercises(false);
    }
  };

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setHeroImageIndex(0);
  };

  const handleCloseExerciseDetail = () => {
    setSelectedExercise(null);
  };

  const heroImages = [CHEST_PRESS_IMAGE_UP, CHEST_PRESS_IMAGE_DOWN];

  const heroPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 10,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -40) {
            setHeroImageIndex((prev) =>
              prev < heroImages.length - 1 ? prev + 1 : prev,
            );
          } else if (gestureState.dx > 40) {
            setHeroImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
          }
        },
      }),
    [],
  );

  const renderFilterSheetContent = () => {
    if (!activeFilterSheet) {
      return null;
    }

    if (activeFilterSheet === "level") {
      const options: { key: LevelFilter; label: string }[] = [
        { key: "all", label: "All levels" },
        { key: "beginner", label: "Beginner" },
        { key: "intermediate", label: "Intermediate" },
        { key: "advanced", label: "Advanced" },
      ];

      return (
        <>
          <Text
            style={[
              styles.filterSheetTitle,
              isLight && styles.filterSheetTitleLight,
            ]}
          >
            Select level
          </Text>
          <Text
            style={[
              styles.filterSheetSubtitle,
              isLight && styles.filterSheetSubtitleLight,
            ]}
          >
            Filter by beginner, intermediate, or advanced difficulty.
          </Text>
          {options.map((option) => {
            const isActive = levelFilter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.exerciseFilterRow,
                  isLight && styles.exerciseFilterRowLight,
                  isActive && styles.exerciseFilterRowActive,
                  isLight && isActive && styles.exerciseFilterRowActiveLight,
                ]}
                onPress={() => {
                  setLevelFilter(option.key);
                  setActiveFilterSheet(null);
                }}
              >
                <Text
                  style={[
                    styles.exerciseFilterLabel,
                    isLight && styles.exerciseFilterLabelLight,
                    isActive && styles.exerciseFilterLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
                {isActive && <Text style={styles.exerciseFilterCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    if (activeFilterSheet === "mechanic") {
      const options: { key: MechanicFilter; label: string }[] = [
        { key: "all", label: "All mechanics" },
        { key: "compound", label: "Compound" },
        { key: "isolation", label: "Isolation" },
      ];

      return (
        <>
          <Text
            style={[
              styles.filterSheetTitle,
              isLight && styles.filterSheetTitleLight,
            ]}
          >
            Select mechanic
          </Text>
          <Text
            style={[
              styles.filterSheetSubtitle,
              isLight && styles.filterSheetSubtitleLight,
            ]}
          >
            Filter by compound vs isolation exercises.
          </Text>
          {options.map((option) => {
            const isActive = mechanicFilter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.exerciseFilterRow,
                  isLight && styles.exerciseFilterRowLight,
                  isActive && styles.exerciseFilterRowActive,
                  isLight && isActive && styles.exerciseFilterRowActiveLight,
                ]}
                onPress={() => {
                  setMechanicFilter(option.key);
                  setActiveFilterSheet(null);
                }}
              >
                <Text
                  style={[
                    styles.exerciseFilterLabel,
                    isLight && styles.exerciseFilterLabelLight,
                    isActive && styles.exerciseFilterLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
                {isActive && <Text style={styles.exerciseFilterCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    if (activeFilterSheet === "force") {
      const options: { key: ForceFilter; label: string }[] = [
        { key: "all", label: "All" },
        { key: "push", label: "Push" },
        { key: "pull", label: "Pull" },
        { key: "hold", label: "Hold" },
      ];

      return (
        <>
          <Text
            style={[
              styles.filterSheetTitle,
              isLight && styles.filterSheetTitleLight,
            ]}
          >
            Select force
          </Text>
          <Text
            style={[
              styles.filterSheetSubtitle,
              isLight && styles.filterSheetSubtitleLight,
            ]}
          >
            Filter by push, pull, or hold.
          </Text>
          {options.map((option) => {
            const isActive = forceFilter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.exerciseFilterRow,
                  isLight && styles.exerciseFilterRowLight,
                  isActive && styles.exerciseFilterRowActive,
                  isLight && isActive && styles.exerciseFilterRowActiveLight,
                ]}
                onPress={() => {
                  setForceFilter(option.key);
                  setActiveFilterSheet(null);
                }}
              >
                <Text
                  style={[
                    styles.exerciseFilterLabel,
                    isLight && styles.exerciseFilterLabelLight,
                    isActive && styles.exerciseFilterLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
                {isActive && <Text style={styles.exerciseFilterCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    if (activeFilterSheet === "muscles") {
      const selectedSet = new Set(activeFilterMuscleNames ?? []);

      return (
        <>
          <Text
            style={[
              styles.filterSheetTitle,
              isLight && styles.filterSheetTitleLight,
            ]}
          >
            Select muscles
          </Text>
          <Text
            style={[
              styles.filterSheetSubtitle,
              isLight && styles.filterSheetSubtitleLight,
            ]}
          >
            Group by front/back and upper/lower body. Combine with Force for
            push / pull / hold.
          </Text>
          <ScrollView style={styles.filterSheetMuscleList}>
            {MUSCLE_FILTER_SECTIONS.map((section) => (
              <View key={section.id} style={styles.filterSheetMuscleCategory}>
                <Text
                  style={[
                    styles.filterSheetMuscleCategoryTitle,
                    isLight && styles.filterSheetMuscleCategoryTitleLight,
                  ]}
                >
                  {section.title}
                </Text>
                {section.muscles.map((muscle) => {
                  const isActive = selectedSet.has(muscle);
                  return (
                    <TouchableOpacity
                      key={muscle}
                      style={[
                        styles.exerciseFilterRow,
                        isLight && styles.exerciseFilterRowLight,
                        isActive && styles.exerciseFilterRowActive,
                        isLight &&
                          isActive &&
                          styles.exerciseFilterRowActiveLight,
                      ]}
                      onPress={() => {
                        setActiveFilterMuscleNames((prev) => {
                          const current = new Set(prev ?? []);
                          if (current.has(muscle)) {
                            current.delete(muscle);
                          } else {
                            current.add(muscle);
                          }
                          return Array.from(current);
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.exerciseFilterLabel,
                          isLight && styles.exerciseFilterLabelLight,
                          isActive && styles.exerciseFilterLabelActive,
                        ]}
                      >
                        {muscle}
                      </Text>
                      {isActive && (
                        <Text style={styles.exerciseFilterCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <View style={styles.filterSheetFooterRow}>
            <TouchableOpacity
              style={styles.filterSheetFooterButton}
              onPress={() => {
                setActiveFilterMuscleNames(null);
                setActiveFilterSheet(null);
              }}
            >
              <Text style={styles.filterSheetFooterButtonText}>
                Clear selection
              </Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {exercisesUserName ? `Hi ${exercisesUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Exercise library
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} name={exercisesUserName} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading exercises…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {exercisesUserName ? `Hi ${exercisesUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Exercise library
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} name={exercisesUserName} />
          </View>
        </View>
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          Exercises
        </Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (showAllExercises) {
    const exercisesAfterMechanicFilter =
      mechanicFilter === "all"
        ? exercises
        : exercises.filter((exercise) =>
            mechanicFilter === "compound"
              ? exercise.is_compound
              : !exercise.is_compound,
          );

    const exercisesAfterForceFilter =
      forceFilter === "all"
        ? exercisesAfterMechanicFilter
        : exercisesAfterMechanicFilter.filter((exercise) => {
            const pattern = (exercise.movement_pattern ?? "").toLowerCase();
            if (forceFilter === "push") {
              return pattern.includes("push") || pattern.includes("press");
            }
            if (forceFilter === "pull") {
              return (
                pattern.includes("pull") ||
                pattern.includes("row") ||
                pattern.includes("curl")
              );
            }
            if (forceFilter === "hold") {
              return (
                pattern.includes("hold") ||
                pattern.includes("carry") ||
                pattern.includes("carry")
              );
            }
            return true;
          });

    const exercisesAfterLevelFilter =
      levelFilter === "all"
        ? exercisesAfterForceFilter
        : exercisesAfterForceFilter.filter(
            (exercise) => exercise.level === levelFilter,
          );

    const finalExercises = exercisesAfterLevelFilter;

    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {exercisesUserName ? `Hi ${exercisesUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Exercise library
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader />
            <HeaderAvatar isLight={isLight} name={exercisesUserName} />
          </View>
        </View>
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          All exercises
        </Text>
        <View style={styles.exerciseSearchContainer}>
          <TextInput
            style={[
              styles.exerciseSearchInput,
              isLight && styles.exerciseSearchInputLight,
            ]}
            placeholder="Search exercises"
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
        <View style={styles.exerciseFilterChipRow}>
          {(
            [
              { key: "muscles", label: "Muscles" },
              { key: "level", label: "Level" },
              { key: "mechanic", label: "Mechanic" },
              { key: "force", label: "Force" },
            ] as const
          ).map((chip) => {
            const isActiveChip = (() => {
              if (chip.key === "muscles") {
                return (
                  (activeFilterMuscleNames?.length ?? 0) > 0 ||
                  activeFilterSheet === "muscles"
                );
              }

              if (chip.key === "mechanic") {
                return (
                  mechanicFilter !== "all" || activeFilterSheet === "mechanic"
                );
              }

              if (chip.key === "level") {
                return levelFilter !== "all" || activeFilterSheet === "level";
              }

              if (chip.key === "force") {
                return forceFilter !== "all" || activeFilterSheet === "force";
              }

              return false;
            })();
            return (
              <TouchableOpacity
                key={chip.key}
                style={[
                  styles.exerciseFilterChip,
                  isLight && styles.exerciseFilterChipLight,
                  isActiveChip && styles.exerciseFilterChipActive,
                ]}
                onPress={() => setActiveFilterSheet(chip.key)}
              >
                <Text
                  style={[
                    styles.exerciseFilterChipLabel,
                    isLight && styles.exerciseFilterChipLabelLight,
                  ]}
                >
                  {chip.label}
                </Text>
                <Text
                  style={[
                    styles.exerciseFilterChipCaret,
                    isLight && styles.exerciseFilterChipCaretLight,
                  ]}
                >
                  ▾
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Modal
          visible={activeFilterSheet !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveFilterSheet(null)}
        >
          <View style={styles.filterSheetRoot}>
            <TouchableOpacity
              style={styles.filterSheetBackdrop}
              activeOpacity={1}
              onPress={() => setActiveFilterSheet(null)}
            />
            <View
              style={[
                styles.filterSheetContainer,
                isLight && styles.filterSheetContainerLight,
              ]}
            >
              <View style={styles.filterSheetHandle} />
              {renderFilterSheetContent()}
            </View>
          </View>
        </Modal>
        <FlatList
          data={finalExercises}
          keyExtractor={(item) => item.id}
          style={{ alignSelf: "stretch" }}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          onEndReached={handleLoadMoreExercises}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMoreExercises ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={GLASS_ACCENT_GREEN} />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            // NOTE: We'll use a single local chest image for now on all cards
            // so the hero area is guaranteed to show something while we
            // finalize API-driven images per exercise.

            const primaryMusclesLabel =
              item.primary_muscles.length > 0
                ? item.primary_muscles.join(", ")
                : null;

            const tagLabel = primaryMusclesLabel
              ? primaryMusclesLabel
              : item.is_compound
                ? "Compound"
                : "Isolation";

            const levelLabel = item.level
              ? item.level.charAt(0).toUpperCase() + item.level.slice(1)
              : "";

            const equipmentLabel =
              item.equipment && item.equipment.length > 0
                ? item.equipment[0]
                : null;

            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleExercisePress(item)}
              >
                <View
                  style={[
                    styles.exerciseCard,
                    isLight && styles.exerciseCardLight,
                  ]}
                >
                  <View style={styles.exerciseImageStack}>
                    <Image
                      source={CHEST_PRESS_IMAGE_UP}
                      style={styles.exerciseImage}
                      resizeMode="contain"
                    />

                    {tagLabel && (
                      <View style={styles.exerciseTagPill}>
                        <Text style={styles.exerciseTagLabel}>
                          {tagLabel.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.exerciseCardBody}>
                    <Text
                      style={[
                        styles.exerciseCardTitle,
                        isLight
                          ? styles.exerciseCardTitleLight
                          : styles.exerciseCardTitleDark,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    {(item.description || primaryMusclesLabel) && (
                      <Text
                        style={[
                          styles.exerciseCardDescription,
                          isLight
                            ? styles.exerciseCardDescriptionLight
                            : styles.exerciseCardDescriptionDark,
                        ]}
                        numberOfLines={2}
                      >
                        {item.description || primaryMusclesLabel}
                      </Text>
                    )}
                  </View>

                  <View style={styles.exerciseCardFooter}>
                    <View style={styles.exerciseMetaRow}>
                      {equipmentLabel && (
                        <View style={styles.exerciseMetaPill}>
                          <Ionicons
                            name="barbell-outline"
                            size={14}
                            color={isLight ? "#0F172A" : "#E5E7EB"}
                          />
                          <Text
                            style={[
                              styles.exerciseMetaPillLabel,
                              isLight
                                ? styles.exerciseMetaPillLabelLight
                                : styles.exerciseMetaPillLabelDark,
                            ]}
                          >
                            {equipmentLabel}
                          </Text>
                        </View>
                      )}

                      {levelLabel ? (
                        <View style={styles.exerciseMetaPill}>
                          <Ionicons
                            name="flame-outline"
                            size={14}
                            color={isLight ? "#0F172A" : "#E5E7EB"}
                          />
                          <Text
                            style={[
                              styles.exerciseMetaPillLabel,
                              isLight
                                ? styles.exerciseMetaPillLabelLight
                                : styles.exerciseMetaPillLabelDark,
                            ]}
                          >
                            {levelLabel}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[
                        styles.exercisePlayButton,
                        isLight && styles.exercisePlayButtonLight,
                      ]}
                    >
                      <Ionicons name="play" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {!!selectedExercise && (
          <Modal
            visible
            transparent
            animationType="slide"
            onRequestClose={handleCloseExerciseDetail}
          >
            <View style={styles.exerciseDetailModalRoot}>
              <TouchableOpacity
                style={styles.exerciseDetailModalBackdrop}
                activeOpacity={1}
                onPress={handleCloseExerciseDetail}
              />
              <View
                style={[
                  styles.exerciseDetailModalCard,
                  isLight && styles.exerciseDetailModalCardLight,
                ]}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  <View
                    style={styles.exerciseDetailHero}
                    {...heroPanResponder.panHandlers}
                  >
                    <View style={styles.exerciseDetailHeroImageWrapper}>
                      <Image
                        source={heroImages[heroImageIndex]}
                        style={styles.exerciseDetailHeroImage}
                        resizeMode="contain"
                      />
                    </View>

                    {heroImages.length > 1 && (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.exerciseDetailHeroArrow,
                            styles.exerciseDetailHeroArrowLeft,
                            heroImageIndex === 0 && { opacity: 0.35 },
                          ]}
                          onPress={() => {
                            if (heroImageIndex > 0) {
                              setHeroImageIndex(heroImageIndex - 1);
                            }
                          }}
                        >
                          <Ionicons
                            name="chevron-back"
                            size={18}
                            color="#E5E7EB"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.exerciseDetailHeroArrow,
                            styles.exerciseDetailHeroArrowRight,
                            heroImageIndex === heroImages.length - 1 && {
                              opacity: 0.35,
                            },
                          ]}
                          onPress={() => {
                            if (heroImageIndex < heroImages.length - 1) {
                              setHeroImageIndex(heroImageIndex + 1);
                            }
                          }}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#E5E7EB"
                          />
                        </TouchableOpacity>
                      </>
                    )}

                    {selectedExerciseDetail?.primaryMusclesLabel && (
                      <View style={styles.exerciseDetailHeroTagRow}>
                        <View style={styles.exerciseTagPill}>
                          <Text style={styles.exerciseTagLabel}>
                            {selectedExerciseDetail.primaryMusclesLabel.toUpperCase()}
                          </Text>
                        </View>
                        {selectedExerciseDetail.levelLabel ? (
                          <View style={styles.exerciseMetaPill}>
                            <Ionicons
                              name="flame-outline"
                              size={14}
                              color={isLight ? "#0F172A" : "#E5E7EB"}
                            />
                            <Text
                              style={[
                                styles.exerciseMetaPillLabel,
                                isLight
                                  ? styles.exerciseMetaPillLabelLight
                                  : styles.exerciseMetaPillLabelDark,
                              ]}
                            >
                              {selectedExerciseDetail.levelLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>

                  <View style={styles.exerciseDetailBody}>
                    {selectedExercise && (
                      <>
                        <Text
                          style={[
                            styles.exerciseCardTitle,
                            isLight
                              ? styles.exerciseCardTitleLight
                              : styles.exerciseCardTitleDark,
                          ]}
                        >
                          {selectedExercise.name}
                        </Text>

                        <View style={styles.exerciseDetailMetaRow}>
                          {selectedExerciseDetail?.equipmentLabel && (
                            <View style={styles.exerciseDetailMetaItem}>
                              <Text style={styles.exerciseDetailMetaLabel}>
                                Equipment
                              </Text>
                              <Text
                                style={[
                                  styles.exerciseDetailMetaValue,
                                  isLight
                                    ? styles.exerciseDetailMetaValueLight
                                    : styles.exerciseDetailMetaValueDark,
                                ]}
                              >
                                {selectedExerciseDetail.equipmentLabel}
                              </Text>
                            </View>
                          )}

                          {selectedExerciseDetail?.primaryMusclesLabel && (
                            <View style={styles.exerciseDetailMetaItem}>
                              <Text style={styles.exerciseDetailMetaLabel}>
                                Target
                              </Text>
                              <Text
                                style={[
                                  styles.exerciseDetailMetaValue,
                                  isLight
                                    ? styles.exerciseDetailMetaValueLight
                                    : styles.exerciseDetailMetaValueDark,
                                ]}
                              >
                                {selectedExerciseDetail.primaryMusclesLabel}
                              </Text>
                            </View>
                          )}
                        </View>

                        {selectedExerciseDetail?.aboutText && (
                          <View style={styles.exerciseDetailSection}>
                            <Text
                              style={[
                                styles.exerciseDetailSectionTitle,
                                isLight &&
                                  styles.exerciseDetailSectionTitleLight,
                              ]}
                            >
                              About this exercise
                            </Text>
                            <Text
                              style={[
                                styles.exerciseDetailSectionText,
                                isLight &&
                                  styles.exerciseDetailSectionTextLight,
                              ]}
                            >
                              {selectedExerciseDetail.aboutText}
                            </Text>
                          </View>
                        )}

                        {selectedExerciseDetail?.howToPerformSteps && (
                          <View style={styles.exerciseDetailSection}>
                            <Text
                              style={[
                                styles.exerciseDetailSectionTitle,
                                isLight &&
                                  styles.exerciseDetailSectionTitleLight,
                              ]}
                            >
                              How to perform
                            </Text>
                            {selectedExerciseDetail.howToPerformSteps.map(
                              (step, index) => (
                                <View
                                  key={index}
                                  style={styles.exerciseDetailBulletRow}
                                >
                                  <Text style={styles.exerciseDetailBulletDot}>
                                    •
                                  </Text>
                                  <Text
                                    style={[
                                      styles.exerciseDetailSectionText,
                                      isLight &&
                                        styles.exerciseDetailSectionTextLight,
                                    ]}
                                  >
                                    {step}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        )}

                        {selectedExerciseDetail?.commonMistakes && (
                          <View style={styles.exerciseDetailSection}>
                            <Text
                              style={[
                                styles.exerciseDetailSectionTitle,
                                isLight &&
                                  styles.exerciseDetailSectionTitleLight,
                              ]}
                            >
                              Common mistakes
                            </Text>
                            {selectedExerciseDetail.commonMistakes.map(
                              (mistake, index) => (
                                <View
                                  key={index}
                                  style={styles.exerciseDetailBulletRow}
                                >
                                  <Text style={styles.exerciseDetailBulletDot}>
                                    •
                                  </Text>
                                  <Text
                                    style={[
                                      styles.exerciseDetailSectionText,
                                      isLight &&
                                        styles.exerciseDetailSectionTextLight,
                                    ]}
                                  >
                                    {mistake}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[
                    styles.exerciseDetailCloseButton,
                    isLight && styles.exerciseDetailCloseButtonLight,
                  ]}
                  onPress={handleCloseExerciseDetail}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={isLight ? "#0F172A" : "#E5E7EB"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isLight && styles.primaryButtonLight,
            { marginTop: 8 },
          ]}
          onPress={handleBackToBodyMap}
        >
          <Text style={styles.primaryButtonText}>Back to body map</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[styles.screenContainer, isLight && styles.screenContainerLight]}
    >
      <View style={styles.homeHeaderRow}>
        <View>
          <Text
            style={[
              styles.homeGreetingLabel,
              isLight && styles.homeGreetingLabelLight,
            ]}
          >
            {exercisesUserName ? `Hi ${exercisesUserName},` : "Hi,"}
          </Text>
          <Text
            style={[
              styles.homeGreetingTitle,
              isLight && styles.homeGreetingTitleLight,
            ]}
          >
            Exercise library
          </Text>
        </View>
        <View style={styles.homeHeaderRightRow}>
          <ThemeToggle inHeader />
          <HeaderAvatar isLight={isLight} name={exercisesUserName} />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, isLight && styles.primaryButtonLight]}
        onPress={() => {
          setActiveFilterMuscleNames(null);
          setSearchQuery("");
          setLevelFilter("all");
          setMechanicFilter("all");
          setForceFilter("all");
          setActiveFilterSheet(null);
          setShowAllExercises(true);
        }}
      >
        <Text style={styles.primaryButtonText}>All exercises</Text>
      </TouchableOpacity>
      <View
        style={[
          styles.premiumSideToggle,
          isLight && styles.premiumSideToggleLight,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.premiumSideButton,
            bodySide === "front" && styles.premiumSideButtonActive,
            isLight && styles.premiumSideButtonLight,
            isLight &&
              bodySide === "front" &&
              styles.premiumSideButtonActiveLight,
          ]}
          onPress={() => setBodySide("front")}
        >
          <Text
            style={[
              styles.premiumSideLabel,
              bodySide === "front" && styles.premiumSideLabelActive,
              isLight && styles.premiumSideLabelLight,
            ]}
          >
            Front
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.premiumSideButton,
            bodySide === "back" && styles.premiumSideButtonActive,
            isLight && styles.premiumSideButtonLight,
            isLight &&
              bodySide === "back" &&
              styles.premiumSideButtonActiveLight,
          ]}
          onPress={() => setBodySide("back")}
        >
          <Text
            style={[
              styles.premiumSideLabel,
              bodySide === "back" && styles.premiumSideLabelActive,
              isLight && styles.premiumSideLabelLight,
            ]}
          >
            Back
          </Text>
        </TouchableOpacity>
      </View>
      <View
        style={[
          styles.premium3dPreview,
          isLight && styles.premium3dPreviewLight,
        ]}
      >
        {bodySide === "front" ? (
          <BodyMuscleFront
            isLight={isLight}
            resetKey={selectionResetKey}
            onSelectionChange={(selection) =>
              setFrontSelection(selection.allActive)
            }
          />
        ) : (
          <BodyMuscleBack
            isLight={isLight}
            resetKey={selectionResetKey}
            onSelectionChange={(selection) =>
              setBackSelection(selection.allActive)
            }
          />
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.primaryButton,
          isLight && styles.primaryButtonLight,
          !hasSelection && styles.primaryButtonDisabled,
        ]}
        onPress={handleViewExercisesPress}
        disabled={!hasSelection}
      >
        <Text style={styles.primaryButtonText}>
          {hasSelection
            ? `View Exercises (${selectedMuscles.length})`
            : "View Exercises"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

type FitnessAgeDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "FitnessAgeDetail"
>;

const FitnessAgeDetailScreen: React.FC<FitnessAgeDetailScreenProps> = ({
  navigation,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const { profile } = useUserProfileBasic();
  const userName = profile?.profile.display_name || profile?.username || null;
  const {
    summary,
    loading: metricsLoading,
    error: metricsError,
  } = useDashboardSummary();

  const fitness = summary?.metrics?.fitness_age;
  const fitnessAgeValue =
    typeof fitness?.fitness_age_years === "number"
      ? `${fitness.fitness_age_years} yrs`
      : "\u2014";

  let fitnessAgeDelta: string | null = null;
  if (metricsError) {
    fitnessAgeDelta = "Unable to load";
  } else if (
    fitness?.chronological_age != null &&
    typeof fitness?.fitness_age_years === "number"
  ) {
    const diff = fitness.chronological_age - fitness.fitness_age_years;
    if (diff > 1) {
      fitnessAgeDelta = `${Math.round(diff)} yrs younger`;
    } else if (diff < -1) {
      fitnessAgeDelta = `${Math.abs(Math.round(diff))} yrs older`;
    } else {
      fitnessAgeDelta = "On track";
    }
  }

  return (
    <ScrollView
      style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.homeHeaderRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.linkText, isLight && styles.linkTextLight]}>
              {"\u2039 Back to dashboard"}
            </Text>
          </TouchableOpacity>
          <View style={{ marginTop: 8 }}>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {userName ? `Hi ${userName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your fitness age
            </Text>
          </View>
        </View>
        <View style={styles.homeHeaderRightRow}>
          <ThemeToggle inHeader />
          <HeaderAvatar isLight={isLight} name={userName} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, isLight && styles.statCardLight]}>
          <Text style={[styles.statLabel, isLight && styles.statLabelLight]}>
            Fitness age
          </Text>
          <Text style={[styles.statValue, isLight && styles.statValueLight]}>
            {metricsLoading ? "Loading…" : fitnessAgeValue}
          </Text>
          {fitnessAgeDelta && !metricsLoading && (
            <Text style={[styles.statDelta, isLight && styles.statDeltaLight]}>
              {fitnessAgeDelta}
            </Text>
          )}
        </View>
      </View>

      <Text
        style={[styles.sectionHeader, isLight && styles.sectionHeaderLight]}
      >
        Details
      </Text>
      <Text
        style={[
          styles.filterSheetSubtitle,
          isLight && styles.filterSheetSubtitleLight,
        ]}
      >
        Your fitness age compares your recent training volume and intensity
        against your chronological age to estimate how “young” your body is
        moving.
      </Text>
    </ScrollView>
  );
};

type RaceReadinessDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "RaceReadinessDetail"
>;

const RaceReadinessDetailScreen: React.FC<RaceReadinessDetailScreenProps> = ({
  navigation,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const { profile } = useUserProfileBasic();
  const userName = profile?.profile.display_name || profile?.username || null;
  const {
    summary,
    loading: metricsLoading,
    error: metricsError,
  } = useDashboardSummary();

  const race = summary?.metrics?.race_readiness;
  const raceScoreValue =
    typeof race?.score === "number" ? `${Math.round(race.score)} / 100` : "—";

  let raceScoreLabel: string | null = null;
  if (metricsError) {
    raceScoreLabel = "Unable to load";
  } else if (typeof race?.score === "number") {
    if (race.score >= 80) {
      raceScoreLabel = "Race ready";
    } else if (race.score >= 60) {
      raceScoreLabel = "Solid base";
    } else if (race.score >= 40) {
      raceScoreLabel = "Building base";
    } else {
      raceScoreLabel = "Early days";
    }
  }

  return (
    <ScrollView
      style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.homeHeaderRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.linkText, isLight && styles.linkTextLight]}>
              {"\u2039 Back to dashboard"}
            </Text>
          </TouchableOpacity>
          <View style={{ marginTop: 8 }}>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {userName ? `Hi ${userName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Race readiness
            </Text>
          </View>
        </View>
        <View style={styles.homeHeaderRightRow}>
          <ThemeToggle inHeader />
          <HeaderAvatar isLight={isLight} name={userName} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, isLight && styles.statCardLight]}>
          <Text style={[styles.statLabel, isLight && styles.statLabelLight]}>
            Race readiness score
          </Text>
          <Text style={[styles.statValue, isLight && styles.statValueLight]}>
            {metricsLoading ? "Loading…" : raceScoreValue}
          </Text>
          {raceScoreLabel && !metricsLoading && (
            <Text style={[styles.statDelta, isLight && styles.statDeltaLight]}>
              {raceScoreLabel}
            </Text>
          )}
        </View>
      </View>

      <Text
        style={[styles.sectionHeader, isLight && styles.sectionHeaderLight]}
      >
        Details
      </Text>
      <Text
        style={[
          styles.filterSheetSubtitle,
          isLight && styles.filterSheetSubtitleLight,
        ]}
      >
        Your race readiness score blends pace, long-run volume, strength work,
        and recovery consistency into a single readiness number.
      </Text>
    </ScrollView>
  );
};

type PercentileDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "PercentileDetail"
>;

const PercentileDetailScreen: React.FC<PercentileDetailScreenProps> = ({
  navigation,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const { profile } = useUserProfileBasic();
  const userName = profile?.profile.display_name || profile?.username || null;
  const {
    summary,
    loading: metricsLoading,
    error: metricsError,
  } = useDashboardSummary();

  const percentile = summary?.metrics?.percentile_rank;
  const percentileValue =
    typeof percentile?.percentile === "number"
      ? `${Math.round(percentile.percentile)}th`
      : "—";

  let percentileLabel: string | null = null;
  if (metricsError) {
    percentileLabel = "Unable to load";
  } else if (typeof percentile?.percentile === "number") {
    const p = percentile.percentile;
    if (p >= 80) {
      const topShare = 100 - Math.round(p);
      percentileLabel = `Top ${Math.max(topShare, 1)}% of peers`;
    } else if (p >= 50) {
      percentileLabel = "Above average";
    } else if (p >= 30) {
      percentileLabel = "Around average";
    } else {
      percentileLabel = "Below average";
    }
  }

  return (
    <ScrollView
      style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.homeHeaderRow}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.linkText, isLight && styles.linkTextLight]}>
              {"\u2039 Back to dashboard"}
            </Text>
          </TouchableOpacity>
          <View style={{ marginTop: 8 }}>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {userName ? `Hi ${userName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Percentile rank
            </Text>
          </View>
        </View>
        <View style={styles.homeHeaderRightRow}>
          <ThemeToggle inHeader />
          <HeaderAvatar isLight={isLight} name={userName} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, isLight && styles.statCardLight]}>
          <Text style={[styles.statLabel, isLight && styles.statLabelLight]}>
            Percentile rank
          </Text>
          <Text style={[styles.statValue, isLight && styles.statValueLight]}>
            {metricsLoading ? "Loading…" : percentileValue}
          </Text>
          {percentileLabel && !metricsLoading && (
            <Text style={[styles.statDelta, isLight && styles.statDeltaLight]}>
              {percentileLabel}
            </Text>
          )}
        </View>
      </View>

      <Text
        style={[styles.sectionHeader, isLight && styles.sectionHeaderLight]}
      >
        Details
      </Text>
      <Text
        style={[
          styles.filterSheetSubtitle,
          isLight && styles.filterSheetSubtitleLight,
        ]}
      >
        Your percentile rank compares your overall performance to other athletes
        of similar age and gender using our internal dataset.
      </Text>
    </ScrollView>
  );
};

const AccountScreen: React.FC = () => {
  const { mode } = useThemeMode();
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
        <View style={styles.homeHeaderRow}>
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
            <ThemeToggle inHeader />
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
        <View style={styles.homeHeaderRow}>
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
            <ThemeToggle inHeader />
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
        <View style={styles.homeHeaderRow}>
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
            <ThemeToggle inHeader />
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  rootLight: {
    backgroundColor: LIGHT_BG,
  },
  fullscreenCenter: {
    flex: 1,
    backgroundColor: DARK_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  screenContainer: {
    flex: 1,
    backgroundColor: DARK_BG,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  screenContainerLight: {
    backgroundColor: LIGHT_BG,
  },
  screenContainerNoPadding: {
    paddingHorizontal: 0,
  },
  screenContainerGreenGlass: {
    backgroundColor: GLASS_BG_DARK,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: DARK_TEXT_PRIMARY,
    marginBottom: 8,
  },
  screenTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  screenSubtitle: {
    color: DARK_TEXT_MUTED,
    marginBottom: 16,
  },
  screenSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeScrollContent: {
    paddingBottom: 32,
  },
  homeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  homeHeaderRightRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  homeHeaderRefreshButton: {
    marginRight: 12,
    padding: 8,
    borderRadius: 999,
  },
  homeGreetingLabel: {
    color: DARK_TEXT_MUTED,
    fontSize: 13,
    marginBottom: 4,
  },
  homeGreetingLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeGreetingTitle: {
    color: DARK_TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: "700",
  },
  homeGreetingTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK_CARD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  homeAvatarLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#e5e7eb",
  },
  homeAvatarInitials: {
    color: DARK_TEXT_PRIMARY,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  homeAvatarInitialsLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homePillRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginBottom: 20,
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  homePillRowLight: {
    backgroundColor: LIGHT_CARD,
  },
  homePill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 999,
  },
  homePillActive: {
    backgroundColor: GLASS_ACCENT_GREEN,
  },
  homePillActiveLight: {
    backgroundColor: "#0F172A",
  },
  homePillLabel: {
    color: DARK_TEXT_MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
  homePillLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homePillLabelActive: {
    color: "#F9FAFB",
    fontSize: 13,
    fontWeight: "600",
  },
  homeHeroCard: {
    marginTop: 4,
    borderRadius: 20,
    padding: 20,
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  homeHeroCardLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#e5e7eb",
  },
  homeActiveTabsRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  homeActiveTabButton: {
    flex: 1,
    alignItems: "center",
    paddingBottom: 8,
  },
  homeActiveTabLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 14,
    fontWeight: "600",
  },
  homeActiveTabLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeActiveTabLabelActive: {
    color: GLASS_TEXT_PRIMARY,
  },
  homeActiveTabLabelActiveLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeActiveTabIndicator: {
    marginTop: 6,
    height: 2,
    borderRadius: 999,
    alignSelf: "stretch",
    backgroundColor: GLASS_ACCENT_GREEN,
  },
  homeActiveTabIndicatorLight: {
    backgroundColor: GLASS_ACCENT_GREEN,
  },
  homeHeroLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 13,
    marginBottom: 4,
  },
  homeHeroLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeHeroTitle: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  homeHeroTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeHeroSubtitle: {
    color: GLASS_TEXT_MUTED,
    fontSize: 13,
    marginBottom: 12,
  },
  homeHeroSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeHeroMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  homeHeroMetaText: {
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
  },
  homeActiveListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  homeActiveListThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#111827",
    marginRight: 12,
    overflow: "hidden",
  },
  homeActiveListThumbLight: {
    backgroundColor: "#E5E7EB",
  },
  homeActiveListIndexPill: {
    width: 52,
    height: 52,
    borderRadius: 999,
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.22)",
  },
  homeActiveListIndexPillLight: {
    backgroundColor: "rgba(15,23,42,0.05)",
  },
  homeActiveListIndexText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#E5E7EB",
  },
  homeActiveListIndexTextLight: {
    color: "#0F172A",
  },
  homeActiveListContent: {
    flex: 1,
  },
  homeActiveItemHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  homeActiveItemHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  homeActiveItemTitle: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  homeActiveItemTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeActiveItemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  homeActiveItemMeta: {
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
  },
  homeActiveItemMetaLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeActiveItemProgressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.4)",
    overflow: "hidden",
  },
  homeActiveItemProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: DARK_ACCENT_ORANGE,
  },
  homeActiveItemProgressFillLight: {
    backgroundColor: LIGHT_ACCENT_ORANGE,
  },
  homeActiveItemStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  homeActiveItemCheckButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  homeActiveItemStatusText: {
    marginTop: 0,
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
  },
  homeActiveItemStatusTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeActiveItemStatusCheck: {
    marginLeft: 4,
    fontSize: 12,
    color: "#22c55e",
  },
  homeActiveDivider: {
    marginTop: 16,
    marginBottom: 8,
    height: 1,
    backgroundColor: "rgba(148,163,184,0.35)",
  },
  homeActiveSeeAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeActiveSeeAllLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: GLASS_ACCENT_GREEN_SOFT,
  },
  homeActiveSeeAllLabelLight: {
    color: GLASS_ACCENT_GREEN_SOFT,
  },
  homeActiveSeeAllArrow: {
    fontSize: 16,
    color: GLASS_ACCENT_GREEN_SOFT,
  },
  homeActiveSeeAllArrowLight: {
    color: GLASS_ACCENT_GREEN_SOFT,
  },
  homeAllActiveHeaderRow: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  homeAllActiveListScroll: {
    maxHeight: 360,
    marginTop: 8,
  },
  homeAllActiveBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  homeAllActiveBulletDot: {
    fontSize: 13,
    color: GLASS_ACCENT_GREEN_SOFT,
    marginRight: 8,
    marginTop: 4,
  },
  homeAllActiveBulletContent: {
    flex: 1,
  },
  homeAllActiveBulletTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  homeAllActiveBulletTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeAllActiveBulletMeta: {
    marginTop: 2,
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
  },
  homeAllActiveBulletMetaLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeAllActiveBulletHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  homeAllActiveBulletHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  homeAllActiveBulletDesc: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: GLASS_TEXT_MUTED,
  },
  homeAllActiveBulletDescLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeAllActiveTargetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  homeAllActiveTargetPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.6)",
    backgroundColor: "rgba(23,23,23,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginTop: 4,
  },
  homeAllActiveTargetPillLight: {
    backgroundColor: "#FEF9C3",
    borderColor: "#FBBF24",
  },
  homeAllActiveTargetPillText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#FACC15",
  },
  homeAllActiveDietCardsContainer: {
    marginTop: 8,
  },
  homeAllActiveDietCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 6,
    backgroundColor: "rgba(15,23,42,0.8)",
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.55)",
  },
  homeAllActiveDietCardLight: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
  },
  homeAllActiveDietText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#E5E7EB",
  },
  homeAllActiveDietTextLight: {
    color: "#0F172A",
  },
  homeAllActiveDietBulletDot: {
    marginRight: 8,
    marginTop: 2,
    fontSize: 11,
    color: "rgba(250,204,21,0.9)",
  },
  homeAllActiveExerciseList: {
    marginTop: 12,
    gap: 10,
  },
  // New card-based workout design
  homeAllActiveWorkoutCard: {
    backgroundColor: "rgba(15,23,42,0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    marginBottom: 16,
    overflow: "hidden",
  },
  homeAllActiveWorkoutCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  homeAllActiveWorkoutHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.1)",
  },
  homeAllActiveWorkoutTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  homeAllActiveWorkoutTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
    marginBottom: 4,
  },
  homeAllActiveWorkoutTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeAllActiveWorkoutMeta: {
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
  },
  homeAllActiveWorkoutMetaLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeAllActiveExerciseCard: {
    backgroundColor: "rgba(30,41,59,0.4)",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
  },
  homeAllActiveExerciseCardLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  homeAllActiveExerciseInfo: {
    marginBottom: 12,
  },
  homeAllActiveExerciseName: {
    fontSize: 15,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
    marginBottom: 6,
  },
  homeAllActiveExerciseNameLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeAllActiveExerciseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  homeAllActiveExerciseDetail: {
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
  },
  homeAllActiveExerciseDetailLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeAllActiveExerciseSeparator: {
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
  },
  homeAllActivePrContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.15)",
    paddingTop: 12,
  },
  homeAllActivePrInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap",
  },
  homeAllActivePrRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },
  homeAllActivePrLabel: {
    fontSize: 10,
    color: GLASS_TEXT_MUTED,
    marginBottom: 8,
    fontWeight: "600",
    letterSpacing: 1.0,
    textTransform: "uppercase",
  },
  homeAllActivePrLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeAllActivePrInput: {
    flex: 1,
    maxWidth: 120,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
    backgroundColor: "rgba(15,23,42,0.6)",
    color: "#E5E7EB",
    fontSize: 13,
  },
  homeAllActivePrInputLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    color: "#111827",
  },
  homeAllActivePrSaveButton: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS_ACCENT_GREEN,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
    flexShrink: 0,
    minWidth: 70,
  },
  homeAllActivePrSaveButtonLight: {
    backgroundColor: "#10B981",
    borderColor: "#059669",
  },
  homeAllActivePrSaveButtonSaved: {
    backgroundColor: "rgba(22,163,74,0.3)",
    borderColor: "rgba(34,197,94,0.5)",
  },
  homeAllActivePrSaveLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  homeAllActivePrSaveLabelLight: {
    color: "#FFFFFF",
  },
  homeAllActivePrSaveLabelSaved: {
    color: GLASS_ACCENT_GREEN,
  },
  homeAllActiveExerciseItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  homeAllActiveExerciseBulletDot: {
    marginRight: 8,
    marginTop: 2,
    fontSize: 11,
    color: "rgba(96,165,250,0.9)",
  },
  homeAllActiveExerciseText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#E5E7EB",
  },
  homeAllActiveExerciseTextLight: {
    color: "#111827",
  },
  homeAllActiveSheetContainer: {
    minHeight: "60%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  homeAllActiveHeaderTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  homeAllActiveCloseButton: {
    padding: 4,
    marginLeft: 4,
  },
  homeActiveHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  homeActiveStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.5)",
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  homeActiveStatusPillLight: {
    backgroundColor: "rgba(15,23,42,0.04)",
    borderColor: "#E2E8F0",
  },
  homeActiveStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: GLASS_ACCENT_GREEN,
    marginRight: 6,
  },
  homeActiveStatusText: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: "600",
  },
  homeActiveStatusTextLight: {
    color: "#0F172A",
  },
  homeActiveProgressRow: {
    marginTop: 12,
    marginBottom: 16,
  },
  homeActiveProgressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.4)",
    overflow: "hidden",
  },
  homeActiveProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: GLASS_ACCENT_GREEN,
  },
  homeActiveProgressLabel: {
    marginTop: 8,
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
  },
  homeActiveProgressLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homePrimaryCta: {
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: GLASS_ACCENT_GREEN,
    borderWidth: 1,
    borderColor: GLASS_ACCENT_GREEN,
  },
  homePrimaryCtaLight: {
    backgroundColor: GLASS_ACCENT_GREEN,
    borderColor: GLASS_ACCENT_GREEN,
  },
  homePrimaryCtaLabel: {
    color: "#050814",
    fontSize: 14,
    fontWeight: "700",
  },
  trainingSection: {
    marginTop: 20,
  },
  trainingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  trainingTitle: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: "700",
  },
  trainingTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  trainingMonthControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  trainingMonthLabel: {
    marginHorizontal: 12,
    fontSize: 15,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  trainingMonthLabelLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  trainingNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.45)",
    backgroundColor: "rgba(15, 23, 42, 0.02)",
  },
  trainingCalendarContainer: {
    paddingHorizontal: 4,
  },
  trainingDaysRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  trainingWeekdayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  trainingMonthGrid: {
    marginTop: 2,
  },
  trainingWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  trainingDayColumn: {
    flex: 1,
    alignItems: "center",
  },
  trainingDayStickerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  trainingDayWeekday: {
    fontSize: 13,
    fontWeight: "500",
    color: DARK_TEXT_MUTED,
    marginBottom: 4,
  },
  trainingDayWeekdayLight: {
    color: LIGHT_TEXT_MUTED,
  },
  trainingDayDateBox: {
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  trainingDayDateBoxLight: {
    backgroundColor: "#E5E7EB",
    borderColor: "#CBD5E1",
  },
  trainingDayDateBoxToday: {
    borderColor: GLASS_ACCENT_GREEN,
    borderWidth: 2,
  },
  trainingDayDate: {
    fontSize: 14,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  trainingDayDateLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  trainingDayDateTodayLight: {
    color: "#0F172A",
    fontWeight: "700",
  },
  trainingDayDateTodayDark: {
    color: "#F9FAFB",
    fontWeight: "700",
  },
  trainingDayTodayCircleLight: {
    borderWidth: 3,
    borderColor: "#0EA5E9",
    shadowColor: "#0EA5E9",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  trainingDayTodayCircleDark: {
    borderWidth: 3,
    borderColor: "#22D3EE",
    shadowColor: "#22D3EE",
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  trainingTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    backgroundColor: GLASS_ACCENT_GREEN,
  },
  trainingTodayDotLight: {
    backgroundColor: GLASS_ACCENT_GREEN,
  },
  trainingDayActiveCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  trainingDayActiveCirclePrimary: {
    backgroundColor: "#7CB8E2", // darker, more saturated for better contrast in light theme
  },
  trainingDayActiveCircleSecondary: {
    backgroundColor: "#C6DC6F", // slightly deeper green for clearer visibility
  },
  trainingDayMissedCircle: {
    backgroundColor: "#FEE2E2",
  },
  trainingLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  trainingLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
    marginBottom: 4,
  },
  trainingLegendIconWrap: {
    marginRight: 7,
  },
  trainingLegendIconDimmed: {
    opacity: 0.8,
  },
  trainingLegendIconActive: {
    opacity: 1,
  },
  trainingLegendItemActiveLight: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#8FA4D4",
  },
  trainingLegendItemActiveDark: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#4B5563",
  },
  trainingLegendLabelActiveLight: {
    fontWeight: "700",
    color: "#0F172A",
  },
  trainingLegendLabelActiveDark: {
    fontWeight: "600",
    color: "#E5E7EB",
  },
  trainingLegendLabel: {
    marginTop: -2,
    fontSize: 13,
  },
  workoutHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  workoutHistoryRowLight: {
    borderColor: "#E5E7EB",
  },
  workoutHistoryTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  workoutHistoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  workoutHistoryTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  workoutHistoryDate: {
    marginTop: 2,
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
  },
  workoutHistoryDateLight: {
    color: LIGHT_TEXT_MUTED,
  },
  workoutHistoryStatusWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  workoutHistoryStatusLabel: {
    marginLeft: 6,
    fontSize: 12,
  },
  workoutHistoryStatusCompleted: {
    color: GLASS_ACCENT_GREEN_SOFT,
    fontWeight: "600",
  },
  workoutHistoryStatusMissed: {
    color: DARK_ACCENT_ORANGE,
    fontWeight: "600",
  },
  workoutHistoryEmptyText: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
    textAlign: "center",
  },
  workoutHistoryEmptyTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeSectionHeaderRow: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeSectionTitle: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: "700",
  },
  homeSectionTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeSectionFilterLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 13,
    fontWeight: "500",
  },
  homeSectionFilterLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeExerciseCards: {
    marginTop: 8,
  },
  homeExerciseCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  homeExerciseCardPrimary: {
    backgroundColor: GLASS_CARD_DARK,
  },
  homeExerciseCardPrimaryLight: {
    backgroundColor: "#F8FAFC",
  },
  homeExerciseCardSecondary: {
    backgroundColor: "#A3D2E7",
  },
  homeExerciseTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  homeExerciseTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeExerciseTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  homeExerciseSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  homeExerciseSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeExerciseSubtitleDark: {
    color: DARK_TEXT_MUTED,
  },
  homeExerciseDurationRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 16,
  },
  homeExerciseDurationNumber: {
    fontSize: 32,
    fontWeight: "600",
    marginRight: 4,
  },
  homeExerciseDurationNumberLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  homeExerciseDurationNumberDark: {
    color: DARK_TEXT_PRIMARY,
  },
  homeExerciseDurationUnit: {
    fontSize: 14,
    fontWeight: "500",
  },
  homeExerciseDurationUnitLight: {
    color: LIGHT_TEXT_MUTED,
  },
  homeExerciseDurationUnitDark: {
    color: DARK_TEXT_MUTED,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: "#9ca3af",
    marginLeft: 8,
  },
  errorText: {
    color: "#f97373",
    marginTop: 8,
  },
  emptyText: {
    color: "#9ca3af",
    marginTop: 8,
  },
  // Theme toggle pill used at top of main screens
  themeToggle: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    marginBottom: 12,
  },
  themeToggleLight: {
    borderColor: "rgba(148, 163, 184, 0.45)",
    backgroundColor: "rgba(15, 23, 42, 0.04)",
  },
  themeToggleInHeader: {
    alignSelf: "center",
    marginBottom: 0,
  },
  themeToggleInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  themeToggleIcon: {
    marginRight: 6,
  },
  themeToggleLabel: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "500",
  },
  themeToggleLabelLight: {
    color: "#111827",
  },
  tabBar: {
    backgroundColor: "rgba(5, 8, 20, 0.95)",
    borderTopColor: "rgba(15, 23, 42, 0.85)",
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 72,
    paddingBottom: 10,
    paddingTop: 6,
  },
  tabBarLight: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderTopColor: "rgba(148, 163, 184, 0.45)",
  },
  tabBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarIconContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  tabBarIconContainerLight: {
    borderColor: "#e5e7eb",
  },
  tabBarIconContainerActive: {
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_ACCENT_GREEN,
  },
  tabBarIconContainerActiveLight: {
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_ACCENT_GREEN,
  },
  tabBarLabel: {
    marginTop: 4,
    fontSize: 11,
    color: "#9ca3af",
  },
  tabBarLabelLight: {
    color: "#6b7280",
  },
  tabBarLabelActive: {
    color: "#e5e7eb",
    fontWeight: "600",
  },
  tabBarLabelActiveLight: {
    color: "#111827",
  },
  card: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderColor: GLASS_BORDER_DARK,
    borderWidth: 1,
  },
  cardLight: {
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_BORDER_DARK,
    borderRadius: 18,
  },
  cardTitle: {
    color: "#F5F7FA",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardTitleLight: {
    color: "#111827",
  },
  cardSubtitle: {
    color: "#9ca3af",
    marginBottom: 4,
  },
  cardSubtitleLight: {
    color: "#4b5563",
  },
  cardMeta: {
    color: GLASS_ACCENT_GREEN,
    fontSize: 12,
  },
  cardMetaLight: {
    color: "#166534",
  },
  authContainer: {
    flex: 1,
    backgroundColor: GLASS_BG_DARK,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  authContainerLight: {
    backgroundColor: GLASS_BG_DARK,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F5F7FA",
    marginBottom: 4,
  },
  authTitleLight: {
    color: "#111827",
  },
  authSubtitle: {
    color: "#9ca3af",
    marginBottom: 24,
  },
  authSubtitleLight: {
    color: "#4b5563",
  },
  authFieldGroup: {
    marginBottom: 16,
  },
  authLabel: {
    color: "#9ca3af",
    marginBottom: 4,
  },
  authLabelLight: {
    color: "#6b7280",
  },
  authInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F5F7FA",
    backgroundColor: GLASS_CARD_DARK,
  },
  authInputLight: {
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    color: GLASS_TEXT_PRIMARY,
  },
  primaryButton: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: GLASS_ACCENT_GREEN,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  primaryButtonLight: {
    backgroundColor: GLASS_ACCENT_GREEN,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: GLASS_TEXT_PRIMARY,
    fontWeight: "600",
  },
  linkText: {
    color: GLASS_ACCENT_GREEN,
    marginTop: 16,
    textAlign: "center",
  },
  linkTextLight: {
    color: GLASS_ACCENT_GREEN,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  profileCardLight: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderColor: "#E2E8F0",
    borderWidth: 1,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: GLASS_CARD_DARK,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarCircleLight: {
    backgroundColor: LIGHT_CARD,
  },
  avatarInitials: {
    color: "#F5F7FA",
    fontSize: 20,
    fontWeight: "700",
  },
  avatarInitialsLight: {
    color: "#111827",
  },
  profileTextBlock: {
    flex: 1,
  },
  profileName: {
    color: "#F5F7FA",
    fontSize: 18,
    fontWeight: "600",
  },
  profileNameLight: {
    color: "#111827",
  },
  profileGoal: {
    color: "#9ca3af",
    marginTop: 2,
  },
  profileGoalLight: {
    color: "#4b5563",
  },
  profilePrCard: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  profilePrCardLight: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  profilePrRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  profilePrTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  profilePrExercise: {
    color: "#F9FAFB",
    fontSize: 14,
    fontWeight: "500",
  },
  profilePrExerciseLight: {
    color: "#111827",
  },
  profilePrWorkoutTitle: {
    marginTop: 2,
    color: "#9ca3af",
    fontSize: 12,
  },
  profilePrWorkoutTitleLight: {
    color: "#6b7280",
  },
  profilePrBadgeRow: {
    flexDirection: "row",
  },
  profilePrBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
  },
  profilePrBadgeLabel: {
    fontSize: 10,
    color: "#9ca3af",
  },
  profilePrBadgeValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  profilePrTriggerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    marginBottom: 16,
  },
  profilePrTriggerCardLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  profilePrTriggerTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  profilePrTriggerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  profilePrTriggerTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  profilePrTriggerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
  },
  profilePrTriggerSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  profilePrTriggerChevron: {
    fontSize: 16,
    color: GLASS_TEXT_MUTED,
  },
  premiumPill: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  premiumPillLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  premiumText: {
    color: "#F5F7FA",
    fontSize: 10,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    borderColor: GLASS_BORDER_DARK,
    borderWidth: 1,
  },
  statCardLight: {
    flex: 1,
    backgroundColor: LIGHT_CARD,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 4,
    borderColor: "#E2E8F0",
    borderWidth: 1,
  },
  statLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 10,
    marginBottom: 4,
  },
  statLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  statValue: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  statValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  statDelta: {
    color: GLASS_ACCENT_GREEN_SOFT,
    fontSize: 11,
    marginTop: 2,
  },
  statDeltaLight: {
    color: GLASS_ACCENT_GREEN_SOFT,
  },
  metricsSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  metricCardLarge: {
    flex: 1,
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 20,
    padding: 16,
    borderColor: GLASS_BORDER_DARK,
    borderWidth: 1,
  },
  metricCardLargeLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  metricCardSmall: {
    flex: 1,
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderColor: GLASS_BORDER_DARK,
    borderWidth: 1,
  },
  metricCardSmallRight: {
    marginLeft: 12,
  },
  metricCardSmallLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  metricCardTitle: {
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
    marginBottom: 4,
  },
  metricCardTitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricGaugeContainer: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  metricGaugeContainerSmall: {
    marginTop: 8,
  },
  metricGaugeSvgWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  metricGaugeSvg: {
    alignSelf: "center",
  },
  metricGaugeCenter: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  metricGaugeCenterPrimary: {
    fontSize: 28,
    fontWeight: "700",
    color: GLASS_TEXT_PRIMARY,
  },
  metricGaugeCenterPrimaryLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricGaugeCenterPrimarySmall: {
    fontSize: 18,
  },
  metricGaugeCenterSecondary: {
    marginTop: 2,
    fontSize: 11,
    color: GLASS_TEXT_MUTED,
  },
  metricGaugeCenterSecondaryLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricGaugeCenterSecondarySmall: {
    fontSize: 10,
  },
  metricGaugeLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metricGaugeLabel: {
    fontSize: 11,
    color: GLASS_TEXT_MUTED,
  },
  metricGaugeLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricCurveContainer: {
    marginTop: 10,
  },
  metricCurveSvg: {
    width: "100%",
    height: 60,
  },
  metricStreakDotsRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  metricStreakDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
    backgroundColor: "#111827",
    opacity: 0.25,
  },
  metricStreakDotLight: {
    backgroundColor: "#E5E7EB",
  },
  metricStreakDotFilled: {
    backgroundColor: DARK_ACCENT_ORANGE,
    opacity: 1,
  },
  metricStreakDotFilledLight: {
    backgroundColor: DARK_ACCENT_ORANGE,
  },
  metricStreakPrimaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metricStreakMultiplierText: {
    color: DARK_ACCENT_ORANGE,
    fontSize: 12,
    fontWeight: "600",
  },
  metricStreakMultiplierTextLight: {
    color: DARK_ACCENT_ORANGE,
  },
  metricStreakMetaRow: {
    marginTop: 6,
  },
  metricPrimaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
  },
  metricPrimaryValue: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 32,
    fontWeight: "700",
  },
  metricPrimaryValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricPrimaryUnit: {
    color: GLASS_TEXT_MUTED,
    fontSize: 14,
    marginLeft: 4,
    marginBottom: 2,
  },
  metricPrimaryUnitLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricFitnessMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  metricMetaText: {
    color: GLASS_TEXT_MUTED,
    fontSize: 12,
  },
  metricMetaTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricDeltaText: {
    color: GLASS_ACCENT_GREEN_SOFT,
    fontSize: 12,
    fontWeight: "500",
  },
  metricDeltaTextLight: {
    color: GLASS_ACCENT_GREEN_SOFT,
  },
  metricCaption: {
    color: GLASS_TEXT_MUTED,
    fontSize: 11,
    marginTop: 8,
  },
  metricCaptionLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricLink: {
    color: GLASS_ACCENT_GREEN,
    fontSize: 12,
    marginTop: 8,
    fontWeight: "500",
  },
  metricLinkLight: {
    color: GLASS_ACCENT_GREEN,
  },
  metricSecondaryValue: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: "600",
    marginTop: 4,
  },
  metricSecondaryValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricProgressGroup: {
    marginTop: 10,
  },
  metricProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  metricProgressLabel: {
    color: GLASS_TEXT_MUTED,
    fontSize: 11,
    width: 80,
  },
  metricProgressLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricProgressBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    overflow: "hidden",
    marginHorizontal: 8,
  },
  metricProgressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: GLASS_ACCENT_GREEN_SOFT,
  },
  metricProgressValue: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 11,
  },
  metricProgressValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTimePrimaryRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginTop: 4,
  },
  metricTimePrimaryHours: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: "700",
  },
  metricTimePrimaryHoursLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTimePrimaryMinutes: {
    color: GLASS_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 6,
  },
  metricTimePrimaryMinutesLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTimePrimaryUnit: {
    color: GLASS_TEXT_MUTED,
    fontSize: 13,
    marginLeft: 4,
    marginBottom: 3,
  },
  metricTimePrimaryUnitLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricTimeBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  metricTimeTag: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  metricTimeTagText: {
    fontSize: 11,
    color: GLASS_TEXT_PRIMARY,
  },
  metricTimeTagTextLight: {
    color: "#0F172A",
  },
  metricTooltipBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  metricTooltipCard: {
    width: "100%",
    maxHeight: "70%",
    borderRadius: 20,
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_BORDER_DARK,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  metricTooltipCardLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  metricTooltipContent: {
    paddingBottom: 8,
    paddingTop: 2,
  },
  metricTooltipHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metricTooltipIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(45,212,191,0.12)",
    marginRight: 10,
  },
  metricTooltipIconCircleLight: {
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  metricTooltipHeaderTextGroup: {
    flex: 1,
  },
  metricTooltipTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GLASS_TEXT_PRIMARY,
    marginBottom: 4,
  },
  metricTooltipTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTooltipValue: {
    fontSize: 20,
    fontWeight: "700",
    color: GLASS_TEXT_PRIMARY,
    marginBottom: 4,
  },
  metricTooltipValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTooltipSubtitle: {
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
  },
  metricTooltipSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricTooltipText: {
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
    marginTop: 4,
  },
  metricTooltipTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricTooltipBody: {
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
    marginTop: 8,
    marginBottom: 2,
  },
  metricTooltipBodyLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricTooltipList: {
    marginTop: 8,
  },
  metricTooltipPrimaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  metricTooltipBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.18)",
    alignSelf: "flex-start",
  },
  metricTooltipBadgePositive: {
    backgroundColor: "rgba(16,185,129,0.18)",
  },
  metricTooltipBadgeText: {
    fontSize: 11,
    color: GLASS_TEXT_PRIMARY,
    fontWeight: "500",
  },
  metricTooltipDivider: {
    height: 1,
    backgroundColor: "rgba(148,163,184,0.4)",
    marginVertical: 12,
  },
  metricTooltipProgressSection: {
    marginTop: 6,
    marginBottom: 4,
  },
  metricTooltipProgressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    overflow: "hidden",
  },
  metricTooltipProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: GLASS_ACCENT_GREEN_SOFT,
  },
  metricTooltipProgressLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  metricTooltipSubMetricGroup: {
    marginTop: 10,
  },
  metricTooltipSubMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  metricTooltipSubMetricLabel: {
    flex: 1,
    fontSize: 12,
    color: GLASS_TEXT_MUTED,
  },
  metricTooltipSubMetricLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  metricTooltipSubMetricTrack: {
    flex: 2,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    marginHorizontal: 8,
    overflow: "hidden",
  },
  metricTooltipSubMetricFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#38bdf8",
  },
  metricTooltipSubMetricValue: {
    width: 40,
    textAlign: "right",
    fontSize: 12,
    color: GLASS_TEXT_PRIMARY,
  },
  metricTooltipSubMetricValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  metricTooltipSection: {
    marginTop: 12,
  },
  metricTooltipSectionLast: {
    marginTop: 14,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.35)",
  },
  metricTooltipSectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: GLASS_TEXT_MUTED,
    marginBottom: 4,
  },
  metricTooltipSectionTitleLight: {
    color: "#6b7280",
  },
  metricTooltipCloseButton: {
    marginTop: 12,
    alignSelf: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metricTooltipCloseText: {
    fontSize: 13,
    color: GLASS_ACCENT_GREEN,
    fontWeight: "500",
  },
  metricTooltipCloseTextLight: {
    color: GLASS_ACCENT_GREEN,
  },
  metricTooltipBodyMapList: {
    marginTop: 6,
  },
  metricTooltipBodyMapRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  metricTooltipBodyMapBullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: GLASS_ACCENT_GREEN_SOFT,
    marginTop: 6,
    marginRight: 8,
  },
  metricTooltipBodyMapTextGroup: {
    flex: 1,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeaderLight: {
    color: "#6b7280",
  },
  settingsCard: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderColor: GLASS_BORDER_DARK,
    borderWidth: 1,
  },
  settingsCardLight: {
    backgroundColor: LIGHT_CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderColor: "#E2E8F0",
    borderWidth: 1,
  },
  settingsItemPrimary: {
    color: "#F5F7FA",
    fontSize: 14,
    fontWeight: "500",
  },
  settingsItemPrimaryLight: {
    color: "#111827",
  },
  settingsItemSecondary: {
    color: "#9ca3af",
    marginTop: 2,
    fontSize: 12,
  },
  settingsItemSecondaryLight: {
    color: "#4b5563",
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#f97373",
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutButtonLight: {
    borderColor: "#ef4444",
  },
  logoutText: {
    color: "#f97373",
    fontWeight: "600",
  },
  logoutTextLight: {
    color: "#b91c1c",
  },
  plansScrollContent: {
    paddingBottom: 24,
  },
  plansHeaderContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.35)",
    backgroundColor: DARK_BG,
  },
  plansHeaderContainerLight: {
    borderBottomColor: "#E2E8F0",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  plansHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  plansHeaderTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  plansHeaderTitleLight: {
    color: "#0F172A",
  },
  plansHeaderTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  plansActiveCard: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    padding: 24,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  plansActiveCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  plansActiveTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  plansActiveTitlePillRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  plansActiveTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginRight: 8,
  },
  plansActiveTitleLight: {
    color: "#0F172A",
  },
  plansActiveTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  plansActiveTag: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#D1E2A3",
    color: "#0F172A",
  },
  plansActiveSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
  },
  plansActiveSubtitleDark: {
    color: DARK_TEXT_MUTED,
  },
  plansNextRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  plansNextRowLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  plansNextRowDark: {
    backgroundColor: DARK_CARD_ALT,
    borderColor: "rgba(148,163,184,0.4)",
  },
  plansNextLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  plansNextLabelLight: {
    color: "#64748B",
  },
  plansNextLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  plansNextValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  plansNextValueLight: {
    color: "#0F172A",
  },
  plansNextValueDark: {
    color: DARK_TEXT_PRIMARY,
  },
  plansNextButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  plansNextButtonLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  plansNextButtonDark: {
    backgroundColor: DARK_BG,
    borderColor: "rgba(148,163,184,0.5)",
  },
  plansNextButtonLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  plansNextButtonLabelLight: {
    color: "#0F172A",
  },
  plansNextButtonLabelDark: {
    color: DARK_TEXT_PRIMARY,
  },
  plansActiveButtonsRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  plansPrimaryButton: {
    flex: 1,
    backgroundColor: GLASS_ACCENT_GREEN,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginRight: 12,
  },
  plansPrimaryButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#050814",
  },
  plansSecondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  plansSecondaryButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  plansSecondaryButtonLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  plansSecondaryButtonLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  plansBodyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  planSection: {
    marginBottom: 24,
  },
  planSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  planSectionHeaderIcon: {
    marginRight: 8,
  },
  planSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  planSectionTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planSectionTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planFiltersScroll: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  planFilterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  planFilterPillActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  planFilterLabel: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  planFilterLabelActive: {
    color: "#F9FAFB",
  },
  planCard: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    padding: 24,
    marginTop: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: "hidden",
  },
  planCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  planCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  planCardTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  planCardTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planCardTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planCardTagPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  planCardTagLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  planCardTagLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planCardTagLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  planCardMetaColumn: {
    alignItems: "flex-end",
  },
  planCardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  planCardMetaText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  planCardMetaTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planCardMetaTextDark: {
    color: DARK_TEXT_MUTED,
  },
  planCardFooterRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planCardEquipmentRow: {
    flexDirection: "row",
  },
  planCardEquipIcon: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  planCardEnrolledRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  planCardEnrolledText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "700",
  },
  planCardEnrolledTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planCardEnrolledTextDark: {
    color: DARK_TEXT_MUTED,
  },
  planCardCompletedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 96,
    height: 96,
    backgroundColor: "rgba(209,226,163,0.3)",
    borderBottomLeftRadius: 96,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    padding: 16,
  },
  planCardButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  planCardButtonCompleted: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  planCardButtonEnrolled: {
    backgroundColor: "#0F172A",
  },
  planCardButtonPreview: {
    backgroundColor: "#A3D2E7",
  },
  planCardButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginRight: 6,
  },
  planCardButtonLabelCompleted: {
    color: "#0F172A",
  },
  planCardButtonLabelEnrolled: {
    color: "#FFFFFF",
  },
  planCardButtonLabelPreview: {
    color: "#0F172A",
  },
  planOverviewCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 24,
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  planOverviewCardLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
  },
  planMetaChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  planMetaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: GLASS_ACCENT_GREEN,
    backgroundColor: "rgba(22, 163, 74, 0.08)",
    marginRight: 8,
    marginBottom: 8,
  },
  planMetaChipLight: {
    backgroundColor: "#ECFDF3",
    borderColor: "#16A34A",
  },
  planMetaChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: GLASS_ACCENT_GREEN,
  },
  planMetaChipTextLight: {
    color: "#166534",
  },
  planMetaChipTextDark: {
    color: "#22C55E",
  },
  planOverviewInfoRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  planOverviewInfoSpacer: {
    width: 12,
  },
  planOverviewHeading: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  planOverviewHeadingLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planOverviewHeadingDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planOverviewRow: {
    marginTop: 8,
  },
  planOverviewRowFirst: {
    marginTop: 0,
  },
  planOverviewLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: LIGHT_TEXT_MUTED,
    marginBottom: 2,
  },
  planOverviewLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planOverviewLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  planOverviewValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  planOverviewValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planOverviewValueDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planInfoCard: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  planInfoCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  planInfoCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  planInfoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  planInfoIconCircleFocus: {
    backgroundColor: "#F97316",
  },
  planInfoIconCircleAudience: {
    backgroundColor: "#8B5CF6",
  },
  planInfoCardHeaderTextBlock: {
    flex: 1,
  },
  planInfoCardTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  planInfoCardTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planInfoCardTitleDark: {
    color: GLASS_TEXT_PRIMARY,
  },
  planInfoCardSubtitle: {
    marginTop: 2,
    fontSize: 11,
  },
  planInfoCardSubtitleLight: {
    color: "#6B7280",
  },
  planInfoCardSubtitleDark: {
    color: DARK_TEXT_MUTED,
  },
  planInfoCardBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
  },
  planInfoCardBodyLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planInfoCardBodyDark: {
    color: GLASS_TEXT_PRIMARY,
  },
  planDetailContainer: {
    marginTop: 24,
  },
  planDetailHeading: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  planDetailHeadingLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planDetailHeadingDark: {
    color: DARK_TEXT_MUTED,
  },
  planTimeline: {
    position: "relative",
    marginBottom: 16,
  },
  planTimelineLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  planTimelineScrollContent: {
    paddingVertical: 4,
  },
  planWeekTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  planWeekTagActive: {
    borderColor: "#0F172A",
    backgroundColor: "#0F172A",
  },
  planWeekTagLabel: {
    color: "#475569",
    fontSize: 12,
  },
  planWeekTagLabelActive: {
    color: "#F9FAFB",
    fontWeight: "600",
  },
  planTimelineVerticalRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  planBodyColumn: {
    width: 72,
    marginRight: 12,
    alignItems: "center",
  },
  planBodyContainer: {
    width: 60,
    height: 140,
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  planBodySvg: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "100%",
  },
  planBodyFillMask: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  planTimelineVerticalLine: {
    width: 3,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    marginRight: 0,
  },
  planTimelineVerticalLineContainer: {
    width: 3,
    borderRadius: 999,
    marginRight: 0,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  planTimelineVerticalLineContainerLight: {
    backgroundColor: "#E2E8F0",
  },
  planTimelineVerticalLineFill: {
    width: "100%",
    backgroundColor: "#0F172A",
  },
  planTimelineVerticalLineFillLight: {
    backgroundColor: "#0F172A",
  },
  planTimelineVerticalCards: {
    // Let the ScrollView size itself to its content instead of stretching
    // to fill the remaining screen height. This avoids large empty space
    // below the first week card, especially on web.
    flexGrow: 0,
  },
  planTimelineVerticalCardsContent: {
    paddingBottom: 0,
  },
  planWeekPage: {
    justifyContent: "flex-start",
    paddingVertical: 8,
    paddingLeft: 12,
  },
  planWeekControlsRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planWeekControlButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  planWeekControlButtonDisabled: {
    opacity: 0.35,
  },
  planWeekControlLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  planWeekControlLabelLight: {
    color: "#0F172A",
  },
  planWeekControlLabelDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planWeekControlsSummary: {
    flex: 1,
    alignItems: "center",
  },
  planWeekSummaryText: {
    fontSize: 12,
    fontWeight: "500",
  },
  planWeekSummaryTextLight: {
    color: "#64748B",
  },
  planWeekSummaryTextDark: {
    color: DARK_TEXT_MUTED,
  },
  planWeekRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  planWeekConnector: {
    height: 2,
    borderRadius: 999,
    backgroundColor: "#A3D2E7",
    marginTop: 18,
    marginRight: 8,
  },
  planWeekConnectorLight: {
    backgroundColor: "#A3D2E7",
  },
  planWeekBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  planWeekBlockActive: {
    borderColor: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  planWeekBlockLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  planWeekBlockActiveLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#0F172A",
  },
  planWeekBlockTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  planWeekBlockTitleLight: {
    color: "#0F172A",
  },
  planWeekBlockSubtitle: {
    color: "#64748B",
    fontSize: 13,
  },
  planWeekBlockSubtitleLight: {
    color: "#64748B",
  },
  planWeekOutcomeLabel: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "600",
  },
  planWeekOutcomeLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planWeekOutcomeLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  planWeekOutcomeText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  planWeekOutcomeTextLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planWeekOutcomeTextDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planWeekHighlightsContainer: {
    marginTop: 12,
  },
  planWeekHighlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  planWeekHighlightDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#0F172A",
    marginTop: 6,
    marginRight: 8,
  },
  planWeekHighlightText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  planWeekHighlightTextLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planWeekHighlightTextDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planWeekExercisesContainer: {
    marginTop: 16,
  },
  planWeekExercisesHeading: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  planWeekExercisesHeadingLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planWeekExercisesHeadingDark: {
    color: DARK_TEXT_MUTED,
  },
  planWeekExerciseCard: {
    borderRadius: 12,
    padding: 12,
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    borderLeftWidth: 3,
    borderLeftColor: GLASS_ACCENT_GREEN_SOFT,
  },
  planWeekExerciseCardLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderLeftColor: "#A3D2E7",
  },
  planWeekExerciseTitle: {
    color: DARK_TEXT_PRIMARY,
    fontWeight: "600",
    fontSize: 14,
  },
  planWeekExerciseTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  planWeekExerciseSubtitle: {
    color: DARK_TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  planWeekExerciseSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  planWeekViewFullButton: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    // Dark theme default: glass card + border so text/icons stay readable
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    flexDirection: "row",
    alignItems: "center",
  },
  planWeekViewFullButtonLight: {
    // Light theme override: soft light pill
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
  },
  planWeekViewFullButtonLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  planWeekViewFullButtonLabelLight: {
    color: "#0F172A",
  },
  planWeekViewFullButtonLabelDark: {
    color: DARK_TEXT_PRIMARY,
  },
  planWeekViewFullButtonIcon: {
    marginLeft: 6,
    marginTop: 1,
  },
  exerciseImageStack: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#020617",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
  },
  exerciseImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#020617",
  },
  exerciseTagPill: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.88)",
  },
  exerciseTagLabel: {
    color: "#F9FAFB",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  exerciseCard: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    overflow: "hidden",
  },
  exerciseCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  exerciseCardBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  exerciseCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  exerciseCardTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  exerciseCardTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  exerciseCardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  exerciseCardDescriptionLight: {
    color: LIGHT_TEXT_MUTED,
  },
  exerciseCardDescriptionDark: {
    color: DARK_TEXT_MUTED,
  },
  exerciseCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
  },
  exerciseMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.04)",
    marginRight: 8,
  },
  exerciseMetaPillLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  exerciseMetaPillLabelLight: {
    color: "#1F2937",
  },
  exerciseMetaPillLabelDark: {
    color: "#E5E7EB",
  },
  exercisePlayButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#38BDF8",
  },
  exercisePlayButtonLight: {
    backgroundColor: "#BAE6FD",
  },
  viewWorkoutModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  viewWorkoutModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  viewWorkoutModalCard: {
    maxHeight: "90%",
    backgroundColor: GLASS_CARD_DARK,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    paddingTop: 12,
    paddingBottom: 24,
  },
  viewWorkoutModalCardLight: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  viewWorkoutCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.8)",
    zIndex: 10,
    elevation: 10,
  },
  viewWorkoutCloseButtonLight: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#E2E8F0",
  },
  viewWorkoutHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 12,
  },
  viewWorkoutScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  viewWorkoutWeekLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    alignSelf: "center",
  },
  viewWorkoutWeekLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  viewWorkoutWeekLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  viewWorkoutDayRow: {
    flexDirection: "row",
    paddingVertical: 12,
  },
  viewWorkoutDayLabelColumn: {
    width: 64,
    paddingRight: 8,
  },
  viewWorkoutDayName: {
    fontSize: 16,
    fontWeight: "700",
  },
  viewWorkoutDayNameLight: {
    color: "#111827",
  },
  viewWorkoutDayNameDark: {
    color: DARK_TEXT_PRIMARY,
  },
  viewWorkoutDayDate: {
    marginTop: 2,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  viewWorkoutDayDateLight: {
    color: "#9CA3AF",
  },
  viewWorkoutDayDateDark: {
    color: DARK_TEXT_MUTED,
  },
  viewWorkoutDayLabelInCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  viewWorkoutDayLabelInCardText: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  viewWorkoutDayLabelInCardTextLight: {
    color: "#9CA3AF",
  },
  viewWorkoutDayLabelInCardTextDark: {
    color: DARK_TEXT_MUTED,
  },
  viewWorkoutDayCompleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4ADE80",
    backgroundColor: "rgba(22, 163, 74, 0.08)",
  },
  viewWorkoutDayCompleteButtonDone: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  viewWorkoutDayCompleteButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#22C55E",
  },
  viewWorkoutDayCompleteButtonTextDone: {
    color: "#0F172A",
  },
  viewWorkoutCardWrapper: {
    flex: 1,
  },
  viewWorkoutCard: {
    borderRadius: 20,
    padding: 16,
  },
  viewWorkoutCardLight: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  viewWorkoutCardDark: {
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  viewWorkoutCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewWorkoutIconCircleRun: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#A855F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  viewWorkoutIconCircleStrength: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  viewWorkoutIconCircleRest: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  viewWorkoutHeaderTextBlock: {
    flex: 1,
  },
  viewWorkoutHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  viewWorkoutHeaderTitleLight: {
    color: "#111827",
  },
  viewWorkoutHeaderTitleDark: {
    color: GLASS_TEXT_PRIMARY,
  },
  viewWorkoutHeaderSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  viewWorkoutHeaderSubtitleLight: {
    color: "#6B7280",
  },
  viewWorkoutHeaderSubtitleDark: {
    color: DARK_TEXT_MUTED,
  },
  viewWorkoutHeaderTagsRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  viewWorkoutHeaderTagText: {
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
  },
  viewWorkoutHeaderTagTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  viewWorkoutSegmentsContainer: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  viewWorkoutSegmentHeaderRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  viewWorkoutSegmentHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: GLASS_TEXT_MUTED,
  },
  viewWorkoutSegmentHeaderTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  viewWorkoutSegmentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  viewWorkoutSegmentColLabel: {
    flex: 1.2,
    paddingRight: 8,
    minWidth: 0,
  },
  viewWorkoutSegmentColPrimary: {
    flex: 1,
    paddingRight: 8,
    minWidth: 0,
  },
  viewWorkoutSegmentColSecondary: {
    flex: 1,
    minWidth: 0,
  },
  viewWorkoutSegmentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: GLASS_TEXT_PRIMARY,
  },
  viewWorkoutSegmentLabelLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  viewWorkoutSegmentRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewWorkoutSegmentPrimary: {
    fontSize: 14,
    color: GLASS_TEXT_PRIMARY,
  },
  viewWorkoutSegmentPrimaryLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  viewWorkoutSegmentDot: {
    marginHorizontal: 6,
    fontSize: 14,
    color: "#9CA3AF",
  },
  viewWorkoutSegmentSecondary: {
    fontSize: 13,
    color: GLASS_TEXT_MUTED,
  },
  viewWorkoutSegmentSecondaryLight: {
    color: LIGHT_TEXT_MUTED,
  },
  viewWorkoutNotes: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: GLASS_TEXT_MUTED,
  },
  viewWorkoutNotesLight: {
    color: LIGHT_TEXT_MUTED,
  },
  viewWorkoutExercises: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    color: GLASS_TEXT_PRIMARY,
  },
  viewWorkoutExercisesLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  viewWorkoutDayDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginLeft: 0,
  },
  exerciseDetailModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  exerciseDetailModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  exerciseDetailModalCard: {
    maxHeight: "88%",
    backgroundColor: GLASS_CARD_DARK,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    paddingBottom: 16,
    overflow: "hidden",
  },
  exerciseDetailModalCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  exerciseDetailHero: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#020617",
    overflow: "hidden",
  },
  exerciseDetailHeroArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseDetailHeroArrowLeft: {
    left: 12,
  },
  exerciseDetailHeroArrowRight: {
    right: 12,
  },
  exerciseDetailHeroImageWrapper: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseDetailHeroImage: {
    width: "100%",
    height: "100%",
  },
  exerciseDetailHeroTagRow: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseDetailBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  exerciseDetailMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    marginBottom: 8,
  },
  exerciseDetailMetaItem: {
    marginRight: 16,
  },
  exerciseDetailMetaLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  exerciseDetailMetaValue: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  exerciseDetailMetaValueLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  exerciseDetailMetaValueDark: {
    color: DARK_TEXT_PRIMARY,
  },
  exerciseDetailSection: {
    marginTop: 18,
  },
  exerciseDetailSectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 8,
    color: DARK_TEXT_PRIMARY,
  },
  exerciseDetailSectionTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  exerciseDetailSectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: DARK_TEXT_MUTED,
  },
  exerciseDetailSectionTextLight: {
    color: LIGHT_TEXT_MUTED,
  },
  exerciseDetailBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  exerciseDetailBulletDot: {
    width: 14,
    textAlign: "center",
    marginTop: 2,
    color: "#A3D2E7",
  },
  exerciseDetailCloseButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.7)",
  },
  exerciseDetailCloseButtonLight: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#E2E8F0",
  },
  planDetailCard: {
    marginTop: 8,
  },
  planDetailTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  planDetailFocus: {
    color: "#64748B",
    marginBottom: 8,
  },
  planDetailBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  planDetailBulletDot: {
    color: "#A3D2E7",
    marginRight: 6,
    marginTop: 2,
  },
  planDetailBulletText: {
    color: "#64748B",
    flex: 1,
    fontSize: 13,
  },
  exerciseSearchContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  exerciseSearchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F5F7FA",
    backgroundColor: GLASS_CARD_DARK,
  },
  exerciseSearchInputLight: {
    borderColor: "#E2E8F0",
    backgroundColor: LIGHT_CARD,
    color: LIGHT_TEXT_PRIMARY,
  },
  exerciseFilterChipRow: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginTop: 4,
    marginBottom: 12,
  },
  exerciseFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    marginRight: 8,
  },
  exerciseFilterChipLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  exerciseFilterChipActive: {
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_ACCENT_GREEN,
  },
  exerciseFilterChipLabel: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "500",
  },
  exerciseFilterChipLabelLight: {
    color: "#111827",
  },
  exerciseFilterChipCaret: {
    marginLeft: 4,
    color: "#9ca3af",
    fontSize: 12,
  },
  exerciseFilterChipCaretLight: {
    color: "#6b7280",
  },
  exerciseFilterList: {
    marginBottom: 12,
  },
  exerciseFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    marginBottom: 8,
  },
  exerciseFilterRowLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  exerciseFilterRowActive: {
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_ACCENT_GREEN,
  },
  exerciseFilterRowActiveLight: {
    backgroundColor: GLASS_ACCENT_GREEN_SOFT,
    borderColor: GLASS_ACCENT_GREEN,
  },
  exerciseFilterLabel: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  exerciseFilterLabelLight: {
    color: "#111827",
  },
  exerciseFilterLabelActive: {
    color: "#ecfeff",
    fontWeight: "600",
  },
  exerciseFilterCheck: {
    color: GLASS_ACCENT_GREEN,
    fontSize: 16,
    fontWeight: "600",
  },
  filterSheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
    // Use the same neutral dark navy overlay as the
    // exercise detail modal so the background doesn't
    // pick up a green tint when the filter is open.
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  filterSheetBackdrop: {
    flex: 1,
  },
  filterSheetContainer: {
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: GLASS_CARD_DARK,
  },
  filterSheetContainerLight: {
    backgroundColor: LIGHT_CARD,
  },
  filterSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    alignSelf: "center",
    marginBottom: 12,
    backgroundColor: "#4b5563",
  },
  filterSheetTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F5F7FA",
    marginBottom: 4,
  },
  filterSheetTitleLight: {
    color: "#111827",
  },
  filterSheetSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 12,
  },
  filterSheetSubtitleLight: {
    color: "#4b5563",
  },
  filterSheetMuscleList: {
    maxHeight: 260,
    marginBottom: 12,
  },
  filterSheetMuscleCategory: {
    marginBottom: 12,
  },
  filterSheetMuscleCategoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 6,
  },
  filterSheetMuscleCategoryTitleLight: {
    color: "#111827",
  },
  filterSheetFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  filterSheetFooterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterSheetFooterButtonText: {
    fontSize: 13,
    color: GLASS_ACCENT_GREEN,
    fontWeight: "500",
  },
  exerciseTabsToggle: {
    flexDirection: "row",
    alignSelf: "stretch",
    marginTop: 16,
    marginBottom: 12,
    padding: 4,
    borderRadius: 999,
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  exerciseTabsToggleLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  exerciseTabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  exerciseTabButtonActive: {
    // Dark-theme active state: keep the green as an accent,
    // not the whole background, so the toggle doesn't look
    // like a light green slab.
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_ACCENT_GREEN,
  },
  exerciseTabButtonLight: {
    backgroundColor: "transparent",
  },
  exerciseTabButtonActiveLight: {
    backgroundColor: GLASS_ACCENT_GREEN_SOFT,
  },
  exerciseTabLabel: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "500",
  },
  exerciseTabLabelActive: {
    color: "#F5F7FA",
  },
  exerciseTabLabelLight: {
    color: "#111827",
  },
  premium3dCard: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: GLASS_CARD_DARK,
    padding: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  premium3dCardLight: {
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_BORDER_DARK,
  },
  premium3dHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  premium3dHeaderTextBlock: {
    flex: 1,
    marginRight: 8,
  },
  premium3dTitle: {
    color: "#F5F7FA",
    fontSize: 16,
    fontWeight: "600",
  },
  premium3dTitleLight: {
    color: "#111827",
  },
  premium3dSubtitle: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 4,
  },
  premium3dSubtitleLight: {
    color: "#4b5563",
  },
  premiumBadge: {
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  premiumBadgeText: {
    color: "#F5F7FA",
    fontSize: 10,
    fontWeight: "700",
  },
  premiumSideToggle: {
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: GLASS_CARD_DARK,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  premiumSideToggleLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E2E8F0",
  },
  premiumSideButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  premiumSideButtonActive: {
    // In dark mode, keep the toggle background aligned with
    // the rest of the glass UI and use the accent only as a
    // border so it doesn't become a bright green block.
    backgroundColor: GLASS_CARD_DARK,
    borderWidth: 1,
    borderColor: GLASS_ACCENT_GREEN,
  },
  premiumSideButtonLight: {
    backgroundColor: "transparent",
  },
  premiumSideButtonActiveLight: {
    backgroundColor: GLASS_ACCENT_GREEN_SOFT,
  },
  premiumSideLabel: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "500",
  },
  premiumSideLabelActive: {
    color: "#F5F7FA",
  },
  premiumSideLabelLight: {
    color: "#111827",
  },
  premium3dPreview: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  premium3dPreviewLight: {
    borderColor: "#E2E8F0",
    backgroundColor: LIGHT_CARD,
  },
  premium3dPreviewLarge: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: GLASS_CARD_DARK,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  premium3dPreviewLabel: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  premium3dCtaButton: {
    marginTop: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11, 31, 26, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  premium3dModalCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: GLASS_CARD_DARK,
    padding: 20,
    borderWidth: 1,
    borderColor: GLASS_BORDER_DARK,
  },
  premium3dModalCardLight: {
    backgroundColor: GLASS_CARD_DARK,
    borderColor: GLASS_BORDER_DARK,
  },
  premium3dModalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  premium3dModalClose: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  premium3dModalCloseText: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "500",
  },
});
