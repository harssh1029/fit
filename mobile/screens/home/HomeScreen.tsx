import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  GLASS_ACCENT_GREEN,
  GLASS_ACCENT_GREEN_SOFT,
  LIGHT_ACCENT_ORANGE,
  DARK_ACCENT_ORANGE,
  LIGHT_TEXT_MUTED,
  GLASS_TEXT_MUTED,
} from "../../styles/theme";
import { ThemeToggle } from "../../components/ThemeToggle";
import { API_BASE_URL } from "../../api/client";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import { useWorkoutHistory } from "../../hooks/useWorkoutHistory";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { usePlanDetail } from "../../hooks/usePlanDetail";
import BodyMuscleFront, { MuscleSelection } from "../../BodyMuscleFront";
import { FancyWorkoutTypeIcon } from "../../TrainingDayIcons";

import {
  useThemeMode,
  useExercisePrs,
  useAuth,
  HeaderAvatar,
  styles,
  type PlanDayDetail,
  SAMPLE_ACTIVE_WORKOUTS,
  SAMPLE_ACTIVE_NUTRITIONS,
  WEEKDAY_LABELS,
  MONTH_LABELS,
  toISODate,
  addDays,
  getWeekStart,
  addMonths,
  buildSampleMonthCalendarDays,
  buildMonthCalendarDaysFromDashboard,
  buildActiveWorkoutsFromPlan,
  buildActiveNutritionsFromPlan,
  BODY_BATTLE_CANONICAL_LABELS,
  BODY_BATTLE_GROUP_ORDER,
  BODY_BATTLE_RANK_COLORS,
  MUSCLE_TO_BODY_BATTLE_GROUP,
  MetricGauge,
  PercentileCurve,
  StreakDotsRow,
} from "../../App";

type AnimatedMetricProgressRowProps = {
  label: string;
  percent: number;
  isLight: boolean;
};

const AnimatedMetricProgressRow: React.FC<AnimatedMetricProgressRowProps> = ({
  label,
  percent,
  isLight,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const [displayValue, setDisplayValue] = useState(0);
  const barAnimated = useRef(new Animated.Value(0)).current;
  const valueAnimated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!Number.isFinite(clamped)) return;

    barAnimated.stopAnimation();
    valueAnimated.stopAnimation();
    barAnimated.setValue(0);
    valueAnimated.setValue(0);

    const listenerId = valueAnimated.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });

    Animated.parallel([
      Animated.timing(barAnimated, {
        toValue: clamped / 100,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(valueAnimated, {
        toValue: clamped,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start(() => {
      valueAnimated.removeListener(listenerId);
      setDisplayValue(Math.round(clamped));
    });

    return () => {
      valueAnimated.removeListener(listenerId);
    };
  }, [clamped, barAnimated, valueAnimated]);

  const normalized = clamped / 100;
  const fillerFlex = Math.max(0, 1 - normalized);

  return (
    <View style={styles.metricProgressRow}>
      <Text
        style={[
          styles.metricProgressLabel,
          isLight && styles.metricProgressLabelLight,
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.metricProgressBarTrack,
          { flexDirection: "row", alignItems: "stretch" },
        ]}
      >
        <Animated.View
          style={[
            styles.metricProgressBarFill,
            {
              flex: barAnimated,
            },
          ]}
        />
        {fillerFlex > 0 && <View style={{ flex: fillerFlex }} />}
      </View>
      <Text
        style={[
          styles.metricProgressValue,
          isLight && styles.metricProgressValueLight,
        ]}
      >
        {`${displayValue}%`}
      </Text>
    </View>
  );
};

const HomeScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const { savePr } = useExercisePrs();
  const { accessToken, refreshAccessToken, signOut } = useAuth();
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
    () =>
      buildActiveWorkoutsFromPlan(activePlan, workoutHistoryItems, todayIso),
    [activePlan, workoutHistoryItems, todayIso],
  );

  const activeNutritionItems = useMemo(
    () => buildActiveNutritionsFromPlan(activePlan),
    [activePlan],
  );

  // Seed completion state for active workouts based on workout history
  useEffect(() => {
    if (!activeWorkoutItems.length || !workoutHistoryItems.length) {
      return;
    }

    const seeded: Record<string, boolean> = {};
    for (const item of activeWorkoutItems) {
      const weekNumber = item.planWeekNumber ?? null;
      const dayIndex = item.planDayIndex ?? null;
      if (!weekNumber || !dayIndex) continue;

      const matchingEntry = workoutHistoryItems.find(
        (entry) =>
          entry.status === "completed" &&
          entry.week_number === weekNumber &&
          entry.scheduled_day_index === dayIndex,
      );

      if (matchingEntry) {
        seeded[item.id] = true;
      }
    }

    if (Object.keys(seeded).length > 0) {
      setCompletedWorkouts((prev) => ({ ...prev, ...seeded }));
    }
  }, [activeWorkoutItems, workoutHistoryItems]);

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

  type BodyMapRow = {
    key: string;
    label: string;
    rank: string;
    color: string;
    sessions: number;
  };

  const bodyBattleGroups: Record<string, any> | null =
    !metricsError && bodyBattle?.detail && (bodyBattle.detail as any).groups
      ? ((bodyBattle.detail as any).groups as Record<string, any>)
      : null;

  const realBodyMapRows: BodyMapRow[] = BODY_BATTLE_GROUP_ORDER.map(
    (gKey): BodyMapRow => {
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

  // Fallback sample data so charts look meaningful when the API
  // does not yet return real body-battle sessions.
  const SAMPLE_BODY_BATTLE: Record<string, { sessions: number; rank: string }> =
    {
      back: { sessions: 52, rank: "Legend" },
      chest: { sessions: 44, rank: "Beast" },
      legs: { sessions: 32, rank: "Warrior" },
      arms: { sessions: 26, rank: "Warrior" },
      shoulders: { sessions: 20, rank: "Soldier" },
      core: { sessions: 15, rank: "Soldier" },
      glutes: { sessions: 8, rank: "Recruit" },
    };

  const hasRealBodyMapData = realBodyMapRows.some((row) => row.sessions > 0);

  const sampleBodyMapRows: BodyMapRow[] = BODY_BATTLE_GROUP_ORDER.map(
    (gKey): BodyMapRow => {
      const mock = SAMPLE_BODY_BATTLE[gKey] ?? {
        sessions: 0,
        rank: "Recruit",
      };
      const label = BODY_BATTLE_CANONICAL_LABELS[gKey] ?? gKey;
      const rank = mock.rank;
      const sessions = mock.sessions;
      const color =
        BODY_BATTLE_RANK_COLORS[rank] ?? BODY_BATTLE_RANK_COLORS["Recruit"];
      return { key: gKey, label, rank, color, sessions };
    },
  );

  // For now, always show the richer sample data so the UI clearly
  // communicates the different rank levels across body parts.
  // When wiring to real production data, flip this flag to false.
  const USE_SAMPLE_BODY_BATTLE_FOR_UI = true;

  const bodyMapRows: BodyMapRow[] =
    USE_SAMPLE_BODY_BATTLE_FOR_UI || !hasRealBodyMapData
      ? sampleBodyMapRows
      : realBodyMapRows;

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

  const toggleItemCompleted = async (
    kind: "workouts" | "nutrition",
    id: string,
  ) => {
    if (kind === "workouts") {
      const workoutItem = activeWorkoutItems.find((item) => item.id === id);

      if (
        activePlan &&
        workoutItem &&
        accessToken &&
        !completedWorkouts[id] &&
        (workoutItem.planDayId ||
          (workoutItem.planWeekNumber && workoutItem.planDayIndex))
      ) {
        try {
          const payload: Record<string, unknown> = {};
          if (workoutItem.planDayId) {
            payload.plan_day_id = workoutItem.planDayId;
          } else {
            payload.plan_id = activePlan.id;
            payload.plan_week_number = workoutItem.planWeekNumber;
            payload.plan_day_index = workoutItem.planDayIndex;
          }

          let tokenToUse = accessToken;
          let response = await fetch(`${API_BASE_URL}/plans/complete-day/`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tokenToUse}`,
            },
            body: JSON.stringify(payload),
          });

          if (response.status === 401) {
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
              await signOut();
              return;
            }
            tokenToUse = refreshed;
            response = await fetch(`${API_BASE_URL}/plans/complete-day/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${tokenToUse}`,
              },
              body: JSON.stringify(payload),
            });
          }

          if (!response.ok) {
            try {
              const errorText = await response.text();
              console.error(
                "Failed to complete plan day:",
                response.status,
                errorText,
              );
            } catch (e) {
              console.error(
                "Failed to complete plan day (unable to read body):",
                response.status,
              );
            }
            return;
          }

          setCompletedWorkouts((prev) => ({
            ...prev,
            [id]: true,
          }));

          reloadMetrics();
          reloadWorkoutHistory();
          return;
        } catch (err) {
          console.error("Error calling /plans/complete-day/:", err);
          return;
        }
      }

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
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} />
          </View>
        </View>

        {/* Active workouts / nutrition hero card */}
        <View
          style={[styles.homeHeroCard, isLight && styles.homeHeroCardLight]}
        >
          {/* Tabs */}
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

          {activeItems.map((item, index) => {
            const isCompleted =
              homeActiveTab === "workouts"
                ? completedWorkouts[item.id]
                : completedNutritions[item.id];

            return (
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
                          {`${item.durationDisplay || `${item.durationMinutes} min`} • ${item.style}`}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.homeActiveItemCheckButton}
                      activeOpacity={0.8}
                      onPress={() =>
                        toggleItemCompleted(homeActiveTab, item.id)
                      }
                    >
                      <Ionicons
                        name={
                          isCompleted
                            ? "checkmark-circle"
                            : "checkmark-circle-outline"
                        }
                        size={20}
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
              </View>
            );
          })}

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
                  const planDayIndex = weekday === 0 ? 7 : weekday;
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
                              {`${item.durationDisplay || `${item.durationMinutes} min`} • ${item.style}`}
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
                  <AnimatedMetricProgressRow
                    label="Plan"
                    percent={racePlanPercent}
                    isLight={isLight}
                  />
                )}
                {raceConsistencyPercent != null && (
                  <AnimatedMetricProgressRow
                    label="Consistency"
                    percent={raceConsistencyPercent}
                    isLight={isLight}
                  />
                )}
                {raceBenchmarksPercent != null && (
                  <AnimatedMetricProgressRow
                    label="Benchmarks"
                    percent={raceBenchmarksPercent}
                    isLight={isLight}
                  />
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

export default HomeScreen;
