import React, { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import {
  GLASS_ACCENT_GREEN,
} from "../../styles/theme";
import { AppHeader } from "../../components/AppHeader";
import {
  FitnessIcon3D,
  type FitnessIcon3DName,
} from "../../components/FitnessIcon3D";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { usePlans } from "../../hooks/usePlans";
import { useActiveUserPlan } from "../../hooks/useActiveUserPlan";
import { API_BASE_URL } from "../../api/client";
import { useAuth, useThemeMode, styles } from "../../App";
import type {
  Plan,
  PlansCategoryProps,
  PlansHomeProps,
  PlanUserProgress,
} from "../../App";

type PlanCardStatus = "preview" | "enrolled" | "completed";
export type PlanDiscoveryKey = "popular" | "forYou" | "events" | "browse";

type PlanCardProps = {
  title: string;
  level: string;
  goal: string;
  focus: string;
  result: string;
  progress?: PlanUserProgress | null;
  status: PlanCardStatus;
  onPress?: () => void;
};

const formatPlanDate = (value: string | null | undefined) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const humanizeGoal = (value: string) =>
  value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const compactPlanDuration = (plan: Plan) =>
  `${plan.durationWeeks} Weeks · ${
    plan.defaultSessionsPerWeek ?? plan.sessionsPerWeek
  }x / Week`;

const isHyroxPlan = (plan: Pick<Plan, "name" | "goal" | "summary">) =>
  [plan.name, plan.goal, plan.summary].join(" ").toLowerCase().includes("hyrox");

const getDisplayGoal = (plan: Plan) => {
  if (isHyroxPlan(plan)) return "Hyrox Race Prep";
  if (/busy professional/i.test(plan.name)) return "Sustainable Fitness";
  if (/lean|muscle|hypertrophy/i.test(`${plan.name} ${plan.goal}`)) {
    return "Lean Muscle";
  }
  if (/marathon/i.test(plan.name)) return "Endurance Build";
  return humanizeGoal(plan.goal) || plan.summary;
};

const getDisplayFocus = (plan: Plan) => {
  const text = `${plan.name} ${plan.goal} ${plan.summary}`.toLowerCase();
  if (text.includes("hyrox")) return "Race, Sled, Run, Functional Strength";
  if (text.includes("busy professional")) {
    return "Strength, Conditioning, Mobility";
  }
  if (text.includes("fat") || text.includes("shred")) {
    return "Metabolic Strength, Conditioning";
  }
  if (text.includes("lean") || text.includes("muscle")) {
    return "Hypertrophy, Strength, Recovery";
  }
  if (text.includes("marathon")) return "Mileage, Tempo, Endurance";
  return plan.weeks[0]?.focus || humanizeGoal(plan.goal) || "Structured Fitness";
};

const getDisplayResult = (plan: Plan) => {
  const text = `${plan.name} ${plan.goal} ${plan.result}`.toLowerCase();
  if (text.includes("hyrox")) {
    return "Stronger station output, better race performance";
  }
  if (text.includes("busy professional")) {
    return "More energy, better consistency";
  }
  return plan.result || "Measurable progress and better training rhythm";
};

const PLAN_DISCOVERY_CARDS: Array<{
  key: PlanDiscoveryKey;
  title: string;
  subtitle: string;
  icon: FitnessIcon3DName;
}> = [
  {
    key: "popular",
    title: "Popular",
    subtitle: "Tried. Tested. Loved.",
    icon: "flame",
  },
  {
    key: "forYou",
    title: "For You",
    subtitle: "Built around your goals.",
    icon: "sparkles",
  },
  {
    key: "events",
    title: "Upcoming Events",
    subtitle: "Train with purpose.",
    icon: "flag",
  },
  {
    key: "browse",
    title: "Browse All",
    subtitle: "Explore every path.",
    icon: "compass",
  },
];

const DISCOVERY_SECTION_COPY: Record<PlanDiscoveryKey, string> = {
  popular: "Plans with the broadest training appeal.",
  forYou: "A tighter selection based on your current training context.",
  events: "Race-minded plans for focused preparation.",
  browse: "Every available path in one place.",
};

const discoveryLabel = (key: PlanDiscoveryKey) =>
  PLAN_DISCOVERY_CARDS.find((card) => card.key === key)?.title ?? "Plans";

const getDiscoveryPlans = (
  plans: Plan[],
  category: PlanDiscoveryKey,
  activePlanId?: string | null,
  activePlan?: Plan | null,
) => {
  const rankActiveFirst = (items: Plan[]) =>
    [...items].sort((a, b) => {
      const aActive = a.id === activePlanId ? 0 : 1;
      const bActive = b.id === activePlanId ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return a.name.localeCompare(b.name);
    });

  if (category === "popular") {
    return rankActiveFirst(plans).sort((a, b) => {
      const score = (plan: Plan) =>
        (plan.userProgress ? 3 : 0) +
        (plan.level === "intermediate" ? 2 : 0) +
        (plan.level === "beginner" ? 1 : 0);
      return score(b) - score(a);
    });
  }

  if (category === "forYou") {
    const currentLevel = activePlan?.level ?? "beginner";
    const matching = plans.filter(
      (plan) => plan.id === activePlanId || plan.level === currentLevel,
    );
    return rankActiveFirst(matching.length ? matching : plans);
  }

  if (category === "events") {
    const eventPlans = plans.filter((plan) => {
      const text = [
        plan.name,
        plan.goal,
        plan.summary,
        plan.audience,
        plan.result,
      ]
        .join(" ")
        .toLowerCase();
      return (
        text.includes("race") ||
        text.includes("hyrox") ||
        text.includes("event") ||
        text.includes("competition")
      );
    });
    return rankActiveFirst(eventPlans.length ? eventPlans : plans);
  }

  return [...plans].sort((a, b) => {
    const aActive = a.id === activePlanId ? 0 : 1;
    const bActive = b.id === activePlanId ? 0 : 1;
    if (aActive !== bActive) return aActive - bActive;
    const aHyrox = isHyroxPlan(a) ? 0 : 1;
    const bHyrox = isHyroxPlan(b) ? 0 : 1;
    if (aHyrox !== bHyrox) return aHyrox - bHyrox;
    return a.name.localeCompare(b.name);
  });
};

const ProgressDots: React.FC<{
  total: number;
  completed: number;
  isLight: boolean;
}> = ({ total, completed, isLight }) => {
  const dotCount = Math.max(8, Math.min(24, total || 12));
  const filledCount =
    total > 0 ? Math.round((Math.min(completed, total) / total) * dotCount) : 0;

  return (
    <View style={styles.planProgressDotsRow}>
      {Array.from({ length: dotCount }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.planProgressDot,
            isLight && styles.planProgressDotLight,
            index < filledCount && styles.planProgressDotFilled,
            index < filledCount && isLight && styles.planProgressDotFilledLight,
          ]}
        />
      ))}
    </View>
  );
};

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const PlanCard: React.FC<PlanCardProps> = ({
  title,
  level,
  goal,
  focus,
  result,
  progress,
  status,
  onPress,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const pressProgress = useRef(new Animated.Value(0)).current;
  const isEnrolled = status === "enrolled";
  const buttonLabel =
    status === "completed"
      ? "Completed"
      : status === "enrolled"
        ? "View Current Week"
        : "View Plan";
  const weekLabel = progress?.currentWeekNumber
    ? `Week ${progress.currentWeekNumber}`
    : "Week 1";
  const completionPercent = progress?.completionPercent ?? 0;
  const totalSessions = progress?.totalSessions ?? 32;
  const completedForDots = progress?.completedSessions ?? 0;
  const buttonIconColor = !isEnrolled && isLight ? "#0F172A" : "#FFFFFF";

  const animatePress = (toValue: number) => {
    Animated.spring(pressProgress, {
      toValue,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  };

  const animatedCardStyle = {
    transform: [
      {
        translateY: pressProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        }),
      },
      {
        scale: pressProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.01],
        }),
      },
    ],
  };

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.planCard,
        isLight && styles.planCardLight,
        animatedCardStyle,
      ]}
      activeOpacity={0.96}
      onPress={onPress}
      onPressIn={() => animatePress(1)}
      onPressOut={() => animatePress(0)}
    >
      <View
        style={[
          styles.planCardHeroImage,
          isLight && styles.planCardHeroImageLight,
        ]}
      >
        <View style={styles.planCardHeroContent}>
          <View
            style={[
              styles.planCardMetaChip,
              isLight && styles.planCardMetaChipLight,
            ]}
          >
            <FitnessIcon3D name="flame" size={18} tile={false} />
            <Text
              style={[
                styles.planCardMetaText,
                isLight && styles.planCardMetaTextLight,
              ]}
            >
              {level}
            </Text>
          </View>

          <View style={styles.planCardSelectionRing}>
            {status === "enrolled" && (
              <View style={styles.planCardSelectionDot} />
            )}
            {status === "completed" && (
              <Ionicons name="checkmark" size={16} color="#0F172A" />
            )}
          </View>

          <View>
            <Text
              style={[
                styles.planCardTitleOnImage,
                isLight && styles.planCardTitleOnImageLight,
              ]}
              numberOfLines={2}
            >
              {title}
            </Text>

            <Text
              style={[
                styles.planCardGoalText,
                isLight && styles.planCardGoalTextLight,
              ]}
              numberOfLines={1}
            >
              {goal}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.planCardBody, !isLight && styles.planCardBodyDark]}>
        <View style={styles.planCardStatsRow}>
          {[
            {
              icon: "target" as FitnessIcon3DName,
              label: "Goal",
              value: goal,
              iconStyle: styles.planCardStatIconGoal,
            },
            {
              icon: "gym" as FitnessIcon3DName,
              label: "Focus",
              value: focus,
              iconStyle: styles.planCardStatIconFocus,
            },
            {
              icon: "progress" as FitnessIcon3DName,
              label: "Result",
              value: result,
              iconStyle: styles.planCardStatIconResult,
            },
          ].map((item, index) => (
            <View
              key={item.label}
              style={[
                styles.planCardStatItem,
                index > 0 && styles.planCardStatItemWithDivider,
                index > 0 && !isLight && styles.planCardStatItemWithDividerDark,
              ]}
            >
              <View style={styles.planCardStatHeader}>
                <View
                  style={[
                    styles.planCardStatIconCircle,
                    item.iconStyle,
                    !isLight && styles.planCardStatIconCircleDark,
                  ]}
                >
                  <FitnessIcon3D name={item.icon} size={18} tile={false} />
                </View>
                <Text
                  style={[
                    styles.planCardStatLabel,
                    !isLight && styles.planCardStatLabelDark,
                  ]}
                >
                  {item.label}
                </Text>
              </View>
              <Text
                style={[
                  styles.planCardStatValue,
                  !isLight && styles.planCardStatValueDark,
                ]}
                numberOfLines={3}
              >
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {isEnrolled && (
          <View style={styles.planCardProgressBlock}>
            <View style={styles.planCardProgressHeader}>
              <Text
                style={[
                  styles.planCardProgressText,
                  !isLight && styles.planCardProgressTextDark,
                ]}
              >
                {weekLabel}
              </Text>
              <View style={styles.planCardProgressDotsWrap}>
                <ProgressDots
                  total={totalSessions}
                  completed={completedForDots}
                  isLight={isLight}
                />
              </View>
              <Text
                style={[
                  styles.planCardProgressText,
                  !isLight && styles.planCardProgressTextDark,
                ]}
              >
                {completionPercent}% complete
              </Text>
            </View>
          </View>
        )}

        <View
          style={[
            styles.planCardButton,
            !isLight && styles.planCardButtonDark,
            !isEnrolled && styles.planCardButtonPreviewQuiet,
            !isEnrolled && !isLight && styles.planCardButtonPreviewQuietDark,
          ]}
        >
          <Text
            style={[
              styles.planCardButtonLabel,
              !isEnrolled && styles.planCardButtonLabelPreviewQuiet,
              !isEnrolled && !isLight && styles.planCardButtonLabelPreviewQuietDark,
            ]}
          >
            {buttonLabel}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={buttonIconColor} />
        </View>
      </View>
    </AnimatedTouchableOpacity>
  );
};

const PlansScreen: React.FC<PlansHomeProps> = ({ navigation }) => {
  const { mode, toggle } = useThemeMode();
  const { accessToken } = useAuth();
  const isLight = mode === "light";

  const { profile } = useUserProfileBasic();
  const plansUserName =
    profile?.profile.display_name || profile?.username || null;

  const {
    plans,
    loading: plansLoading,
    error: plansError,
    reload: reloadPlans,
  } = usePlans();
  const {
    activeUserPlan,
    loading: activeUserPlanLoading,
    reload: reloadActiveUserPlan,
  } = useActiveUserPlan();

  useFocusEffect(
    useCallback(() => {
      void reloadPlans();
      void reloadActiveUserPlan();
    }, [reloadActiveUserPlan, reloadPlans]),
  );

  const activePlanId = profile?.profile.active_plan_id;
  const activePlan = activePlanId
    ? plans.find((p) => p.id === activePlanId)
    : null;
  const activeProgress = activePlan?.userProgress ?? null;
  const activeScheduled = activeUserPlan?.scheduled_workouts ?? [];
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayWorkout =
    activeScheduled.find(
      (item) => item.scheduled_date === todayIso && item.status === "scheduled",
    ) ?? activeScheduled.find((item) => item.status === "scheduled");
  const upcomingWorkouts = activeScheduled
    .filter((item) => item.status === "scheduled")
    .slice(0, 3);
  const missedCount =
    activeUserPlan?.missed_sessions ??
    activeScheduled.filter((item) => item.status === "missed").length;
  const currentWeek =
    todayWorkout?.week_number ?? activeProgress?.currentWeekNumber ?? 1;
  const isPremiumUser = Boolean(
    (profile?.profile.personal_bests as any)?.is_premium ||
    (profile?.profile.personal_bests as any)?.premium ||
    (profile?.profile.personal_bests as any)?.subscription === "premium",
  );
  const recalibratePlan = () => {
    if (!activeUserPlan) return;
    if (!isPremiumUser) {
      Alert.alert(
        "Premium required",
        "Recalibration is available with Premium.",
      );
      return;
    }
    Alert.alert(
      "Recalibrate plan?",
      "This will move your missed workouts forward and extend your plan end date. Completed workouts will stay unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Recalibrate",
          onPress: async () => {
            if (!accessToken) return;
            const response = await fetch(
              `${API_BASE_URL}/user-plans/${activeUserPlan.id}/recalibrate`,
              {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
              },
            );
            if (response.status === 402) {
              Alert.alert(
                "Premium required",
                "Recalibration is available with Premium.",
              );
              return;
            }
            if (!response.ok) {
              Alert.alert(
                "Could not recalibrate",
                `Server returned ${response.status}.`,
              );
              return;
            }
            Alert.alert(
              "Plan recalibrated",
              "Your plan has been recalibrated. Missed workouts have been moved to your upcoming training days.",
            );
            void reloadActiveUserPlan();
          },
        },
      ],
    );
  };

  const openTodayWorkoutInRecord = () => {
    if (!activeUserPlan || !todayWorkout) return;
    const planDay = todayWorkout.plan_day;
    const exercises = (planDay.exercises ?? []).map((exercise) => ({
      name: exercise.label,
      volume: exercise.primary,
      muscles: [
        ...(exercise.exercise?.primary_muscles ?? []),
        ...(exercise.exercise?.secondary_muscles ?? []),
      ],
    }));
    navigation.getParent<any>()?.navigate("Record", {
      planContext: {
        scheduledWorkoutId: todayWorkout.id,
        userPlanId: activeUserPlan.id,
        planId: activeUserPlan.plan.id,
        planName: activeUserPlan.plan.name,
        planDayId: planDay.id,
        title: planDay.title,
        dayType: planDay.day_type,
        intensity: planDay.intensity,
        durationMinutes: planDay.duration_minutes,
        focusLabel: planDay.primary_focus,
        weekNumber: todayWorkout.week_number,
        dayIndex: todayWorkout.day_index,
        exercises,
      },
    });
  };

  if (plansLoading) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Your plans"
          userName={plansUserName}
          onThemeToggle={toggle}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  if (plansError) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Your plans"
          userName={plansUserName}
          onThemeToggle={toggle}
        />
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
        <AppHeader
          isLight={isLight}
          title="Your plans"
          userName={plansUserName}
          onThemeToggle={toggle}
        />
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
      <View
        style={[styles.plansTopHeader, isLight && styles.plansTopHeaderLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Your plans"
          userName={plansUserName}
          onThemeToggle={toggle}
        />
      </View>

      <View
        style={[
          styles.plansHeaderContainer,
          isLight && styles.plansHeaderContainerLight,
        ]}
      >
        <View
          style={[
            styles.plansActiveCard,
            isLight && styles.plansActiveCardLight,
            !activeUserPlan && !activePlan && styles.plansActiveCardEmpty,
            !activeUserPlan &&
              !activePlan &&
              isLight &&
              styles.plansActiveCardEmptyLight,
          ]}
        >
          <View style={styles.plansActiveKickerRow}>
            <View
              style={[
                styles.plansActiveKickerPill,
                isLight && styles.plansActiveKickerPillLight,
              ]}
            >
              <Ionicons
                name={
                  activeUserPlan || activePlan
                    ? "radio-button-on"
                    : "ellipse-outline"
                }
                size={15}
                color={
                  isLight
                      ? "#64748B"
                      : "#A7B0C3"
                }
              />
              <Text
                style={[
                  styles.plansActiveKickerText,
                  isLight
                    ? styles.plansActiveKickerTextLight
                    : styles.plansActiveKickerTextDark,
                ]}
              >
                Current plan
              </Text>
            </View>
          </View>
          <View style={styles.plansActiveTitleRow}>
            <View style={styles.plansActiveTitlePillRow}>
              <Text
                style={[
                  styles.plansActiveTitle,
                  isLight
                    ? styles.plansActiveTitleLight
                    : styles.plansActiveTitleDark,
                ]}
                numberOfLines={2}
              >
                {activeUserPlan?.plan.name ??
                  activePlan?.name ??
                  "Choose your training identity"}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.plansActiveSubtitle,
              !isLight && styles.plansActiveSubtitleDark,
            ]}
            numberOfLines={3}
          >
            {activeUserPlan
              ? `${activeUserPlan.plan_version?.sessions_per_week ?? activeUserPlan.sessions_per_week} sessions/week • Week ${currentWeek}`
              : activePlan
                ? humanizeGoal(activePlan.goal) || activePlan.summary
                : "Start by choosing a direction. The plan list appears once you know what kind of athlete you want to become next."}
          </Text>

          {activeUserPlan ? (
            <View style={styles.plansActiveProgressBlock}>
              <View style={styles.plansActiveProgressHeader}>
                <Text
                  style={[
                    styles.plansActiveProgressText,
                    isLight
                      ? styles.plansActiveProgressTextLight
                      : styles.plansActiveProgressTextDark,
                  ]}
                >
                  {activeUserPlan.start_date} to {activeUserPlan.end_date}
                </Text>
                <Text
                  style={[
                    styles.plansActiveProgressText,
                    isLight
                      ? styles.plansActiveProgressTextLight
                      : styles.plansActiveProgressTextDark,
                  ]}
                >
                  {Number(activeUserPlan.completion_percent).toFixed(0)}%
                  completed
                </Text>
              </View>
              <ProgressDots
                total={activeUserPlan.total_sessions}
                completed={activeUserPlan.completed_sessions}
                isLight={isLight}
              />
              <Text
                style={[
                  styles.plansActiveDateText,
                  isLight
                    ? styles.plansActiveDateTextLight
                    : styles.plansActiveDateTextDark,
                  { marginTop: 10 },
                ]}
              >
                Next:{" "}
                {todayWorkout
                  ? `${todayWorkout.scheduled_date} • ${todayWorkout.plan_day.title}`
                  : activeUserPlanLoading
                    ? "Loading schedule..."
                    : "No scheduled workout"}
              </Text>
              {upcomingWorkouts.slice(1).map((item) => (
                <Text
                  key={item.id}
                  style={[
                    styles.plansActiveDateText,
                    isLight
                      ? styles.plansActiveDateTextLight
                      : styles.plansActiveDateTextDark,
                    { marginTop: 4 },
                  ]}
                >
                  {item.scheduled_date} • {item.plan_day.title}
                </Text>
              ))}
              {missedCount > 0 && (
                <View
                  style={[
                    styles.plansNextRow,
                    isLight
                      ? styles.plansNextRowLight
                      : styles.plansNextRowDark,
                    { marginTop: 12 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.plansNextValue,
                        isLight
                          ? styles.plansNextValueLight
                          : styles.plansNextValueDark,
                      ]}
                    >
                      You missed {missedCount} workouts.
                    </Text>
                    <Text
                      style={[
                        styles.plansNextLabel,
                        isLight
                          ? styles.plansNextLabelLight
                          : styles.plansNextLabelDark,
                      ]}
                    >
                      Recalibrate your plan and continue without losing
                      progress.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.plansNextButton}
                    activeOpacity={0.9}
                    onPress={recalibratePlan}
                  >
                    <Text style={styles.plansNextButtonLabel}>
                      Recalibrate Plan
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : activeProgress ? (
            <View style={styles.plansActiveProgressBlock}>
              <View style={styles.plansActiveProgressHeader}>
                <Text
                  style={[
                    styles.plansActiveProgressText,
                    isLight
                      ? styles.plansActiveProgressTextLight
                      : styles.plansActiveProgressTextDark,
                  ]}
                >
                  {activeProgress.currentWeekNumber
                    ? `Week ${activeProgress.currentWeekNumber} of ${activePlan?.durationWeeks}`
                    : `${activePlan?.durationWeeks} weeks`}
                </Text>
                <Text
                  style={[
                    styles.plansActiveProgressText,
                    isLight
                      ? styles.plansActiveProgressTextLight
                      : styles.plansActiveProgressTextDark,
                  ]}
                >
                  {activeProgress.completionPercent}% completed
                </Text>
              </View>
              <ProgressDots
                total={activeProgress.totalSessions}
                completed={activeProgress.completedSessions}
                isLight={isLight}
              />
              <View style={styles.plansActiveDateRow}>
                <Text
                  style={[
                    styles.plansActiveDateText,
                    isLight
                      ? styles.plansActiveDateTextLight
                      : styles.plansActiveDateTextDark,
                  ]}
                >
                  Started {formatPlanDate(activeProgress.startedAt)}
                </Text>
                <Text
                  style={[
                    styles.plansActiveDateText,
                    isLight
                      ? styles.plansActiveDateTextLight
                      : styles.plansActiveDateTextDark,
                  ]}
                >
                  Ends {formatPlanDate(activeProgress.expectedEndAt)}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.plansActiveButtonsRow}>
            {activeUserPlan && todayWorkout ? (
              <TouchableOpacity
                style={[
                  styles.plansPrimaryButton,
                  isLight && styles.plansPrimaryButtonLight,
                  { marginRight: 10 },
                ]}
                activeOpacity={0.9}
                onPress={openTodayWorkoutInRecord}
              >
                <Text style={styles.plansPrimaryButtonLabel}>
                  Record today
                </Text>
              </TouchableOpacity>
            ) : null}
            {activeUserPlan || activePlan ? (
              <TouchableOpacity
                style={[
                  styles.plansPrimaryButton,
                  isLight && styles.plansPrimaryButtonLight,
                  activeUserPlan && todayWorkout && { flex: 1 },
                ]}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("PlanDetail", {
                    planId: activeUserPlan?.plan.id ?? activePlan!.id,
                  })
                }
              >
                <Text style={styles.plansPrimaryButtonLabel}>Continue</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.plansPrimaryButton,
                  isLight && styles.plansPrimaryButtonLight,
                ]}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("PlansCategory", { category: "forYou" })
                }
              >
                <Text style={styles.plansPrimaryButtonLabel}>Find my plan</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View
        style={[
          styles.plansDiscoverySection,
          isLight && styles.plansDiscoverySectionLight,
        ]}
      >
        <View style={styles.plansDiscoveryHeader}>
          <Text
            style={[
              styles.plansDiscoveryEyebrow,
              isLight && styles.plansDiscoveryEyebrowLight,
            ]}
          >
            Discovery
          </Text>
          <Text
            style={[
              styles.plansDiscoveryTitle,
              isLight && styles.plansDiscoveryTitleLight,
            ]}
          >
            Choose your direction
          </Text>
        </View>
        <View style={styles.plansDiscoveryGrid}>
          {PLAN_DISCOVERY_CARDS.map((card) => {
            return (
              <TouchableOpacity
                key={card.key}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("PlansCategory", { category: card.key })
                }
                style={[styles.plansDiscoveryCard]}
              >
                <View style={styles.plansDiscoveryContent}>
                  <View style={styles.plansDiscoveryIcon}>
                    <FitnessIcon3D name={card.icon} size={32} active />
                  </View>
                  <View>
                    <Text style={styles.plansDiscoveryCardTitle}>
                      {card.title}
                    </Text>
                    <Text style={styles.plansDiscoveryCardSubtitle}>
                      {card.subtitle}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

    </ScrollView>
  );
};

export const PlansCategoryScreen: React.FC<PlansCategoryProps> = ({
  navigation,
  route,
}) => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const { category } = route.params;
  const { profile } = useUserProfileBasic();
  const plansUserName =
    profile?.profile.display_name || profile?.username || null;
  const {
    plans,
    loading: plansLoading,
    error: plansError,
    reload: reloadPlans,
  } = usePlans();
  const activePlanId = profile?.profile.active_plan_id;
  const activePlan = activePlanId
    ? plans.find((p) => p.id === activePlanId)
    : null;
  const discoveryPlans = useMemo(
    () => getDiscoveryPlans(plans, category, activePlanId, activePlan),
    [activePlan, activePlanId, category, plans],
  );
  const leadPlan = discoveryPlans[0] ?? null;
  const filterIconColor = isLight ? "#0F172A" : "#F8FAFC";

  useFocusEffect(
    useCallback(() => {
      void reloadPlans();
    }, [reloadPlans]),
  );

  if (plansLoading) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title={discoveryLabel(category)}
          userName={plansUserName}
          onThemeToggle={toggle}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  if (plansError) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title={discoveryLabel(category)}
          userName={plansUserName}
          onThemeToggle={toggle}
        />
        <Text style={styles.errorText}>{plansError}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.screenContainer,
        styles.planCategoryScreen,
        isLight && styles.screenContainerLight,
      ]}
      contentContainerStyle={styles.planCategoryScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.planCategoryTopNav}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.goBack()}
          style={[
            styles.planCategoryBackButton,
            isLight && styles.planCategoryBackButtonLight,
          ]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isLight ? "#0F172A" : "#FFFFFF"}
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.planCategoryNavTitle,
            isLight
              ? styles.planCategoryNavTitleLight
              : styles.planCategoryNavTitleDark,
          ]}
        >
          Plans
        </Text>
        <View style={styles.planCategoryNavSpacer} />
      </View>

      <View style={styles.planCategoryHero}>
        <Text
          style={[
            styles.planCategoryEyebrow,
            isLight && styles.planCategoryEyebrowLight,
          ]}
        >
          PLAN SELECTION
        </Text>
        <Text
          style={[
            styles.planCategoryTitle,
            isLight
              ? styles.planCategoryTitleLight
              : styles.planCategoryTitleDark,
          ]}
        >
          {discoveryLabel(category)}
        </Text>
        <Text
          style={[
            styles.planCategorySubcopy,
            isLight && styles.planCategorySubcopyLight,
          ]}
        >
          {DISCOVERY_SECTION_COPY[category]}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.planCategoryFilterRow}
        style={styles.planCategoryFilterScroll}
      >
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.planCategoryFilterPill,
            isLight && styles.planCategoryFilterPillLight,
          ]}
        >
          <Ionicons name="flame-outline" size={18} color={filterIconColor} />
          <Text
            style={[
              styles.planCategoryFilterLabel,
              !isLight && styles.planCategoryFilterLabelDark,
            ]}
          >
            {leadPlan
              ? leadPlan.level.charAt(0).toUpperCase() + leadPlan.level.slice(1)
              : "Advanced"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.planCategoryFilterPill,
            styles.planCategoryFilterPillWide,
            isLight && styles.planCategoryFilterPillLight,
          ]}
        >
          <Ionicons name="calendar-outline" size={18} color={filterIconColor} />
          <Text
            style={[
              styles.planCategoryFilterLabel,
              !isLight && styles.planCategoryFilterLabelDark,
            ]}
          >
            {leadPlan ? compactPlanDuration(leadPlan) : "8 Weeks · 4x / Week"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.planCategoryFilterPill,
            isLight && styles.planCategoryFilterPillLight,
          ]}
        >
          <Ionicons name="options-outline" size={18} color={filterIconColor} />
          <Text
            style={[
              styles.planCategoryFilterLabel,
              !isLight && styles.planCategoryFilterLabelDark,
            ]}
          >
            Filter
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View>
        {discoveryPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            title={plan.name}
            level={plan.level.charAt(0).toUpperCase() + plan.level.slice(1)}
            goal={getDisplayGoal(plan)}
            focus={getDisplayFocus(plan)}
            result={getDisplayResult(plan)}
            progress={plan.userProgress}
            status={activePlanId === plan.id ? "enrolled" : "preview"}
            onPress={() =>
              navigation.navigate("PlanDetail", {
                planId: plan.id,
              })
            }
          />
        ))}
      </View>
    </ScrollView>
  );
};

export default PlansScreen;
