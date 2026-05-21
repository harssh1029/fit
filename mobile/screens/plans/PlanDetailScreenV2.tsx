import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GLASS_ACCENT_GREEN } from "../../styles/theme";
import { AppHeader } from "../../components/AppHeader";
import { API_BASE_URL } from "../../api/client";
import { usePlanDetail } from "../../hooks/usePlanDetail";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import { useActiveUserPlan } from "../../hooks/useActiveUserPlan";
import {
  useAuth,
  useThemeMode,
  styles,
  type PlanDetailProps,
  type ViewWorkoutWeek,
  type ViewNutritionWeek,
  ViewWorkoutWeekModal,
  ViewNutritionWeekModal,
  mapPlanWeekToViewWorkoutWeek,
  mapPlanWeekToViewNutritionWeek,
} from "../../App";

const humanizeGoal = (value: string) =>
  value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getShortPhrase = (value: string | null | undefined, fallback: string) => {
  const cleaned = (value || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  const [sentence] = cleaned.split(".");
  const words = (sentence || cleaned).split(" ").filter(Boolean);
  return words.slice(0, 4).join(" ");
};

const buildPlanDetailCopy = (
  planName: string,
  audience: string,
  summary: string,
  result: string,
  goalLabel: string,
) => {
  const isHyroxPlan = /hyrox/i.test(planName);
  const isHalfMarathonPlan = /half\s*marathon/i.test(planName);
  const isMarathonPlan = /marathon/i.test(planName);
  const isLeanMusclePlan = /lean\s*muscle|muscle\s*builder/i.test(planName);
  const isBusyProfessionalPlan = /busy\s*professional/i.test(planName);
  const isHybridAthletePlan = /hybrid\s*athlete/i.test(planName);
  const isFatLossShredPlan = /fat\s*loss|shred/i.test(planName);

  if (isFatLossShredPlan) {
    return {
      goalTitle: "Athletic Fat Loss",
      goalSubtitle: "Burn fat, preserve muscle, and build conditioning.",
      forText: "Adaptive beginner-to-advanced",
      focusText: "Metabolic strength and intervals",
      resultText: "Leaner, fitter, more energetic",
      expectItems: [
        "Muscle-retaining strength",
        "Premium conditioning blocks",
        "Recovery-aware fat loss",
      ],
    };
  }

  if (isHybridAthletePlan) {
    return {
      goalTitle: "Hybrid Athlete Capacity",
      goalSubtitle: "Build strength, endurance, and durability under fatigue.",
      forText: "Intermediate & advanced athletes",
      focusText: "Strength, running, conditioning",
      resultText: "Stronger, faster, more fatigue resistant",
      expectItems: [
        "Hybrid race-style sessions",
        "Strength and engine balance",
        "Fatigue-resistant performance",
      ],
    };
  }

  if (isBusyProfessionalPlan) {
    return {
      goalTitle: "Efficient Athletic Fitness",
      goalSubtitle:
        "Build strength, energy, and consistency around a busy life.",
      forText: "Busy professionals & founders",
      focusText: "Strength, conditioning, mobility",
      resultText: "More energy, lean muscle, less burnout",
      expectItems: [
        "45-60 min efficient sessions",
        "Recovery-aware progression",
        "Posture and work-capacity focus",
      ],
    };
  }

  if (isLeanMusclePlan) {
    return {
      goalTitle: "Lean Athletic Muscle",
      goalSubtitle: "Build dense muscle, athletic output, and clean movement.",
      forText: "Intermediate & advanced lifters",
      focusText: "Strength, hypertrophy, conditioning",
      resultText: "Leaner, stronger, more athletic physique",
      expectItems: [
        "Progressive overload",
        "Athletic conditioning",
        "Recovery-managed volume",
      ],
    };
  }

  if (isHalfMarathonPlan) {
    return {
      goalTitle: "Half Marathon Performance",
      goalSubtitle: "Build speed, HM pace control, and finishing power.",
      forText: "Intermediate & advanced runners",
      focusText: "Threshold, VO2, HM pace, fast finishes",
      resultText: "Sharper speed, stronger race finish",
      expectItems: [
        "Race-pace progression",
        "Fast long-run finishes",
        "Economy and tendon durability",
      ],
    };
  }

  if (isMarathonPlan) {
    return {
      goalTitle: "Marathon Elite Build",
      goalSubtitle: "Build race pace, durability, and late-race confidence.",
      forText: "Intermediate & advanced runners",
      focusText: "Threshold, marathon pace, long-run progression",
      resultText: "Faster, stronger, more fatigue resistant",
      expectItems: [
        "Race-specific long runs",
        "Fueling and pacing practice",
        "Strength built for durability",
      ],
    };
  }

  return {
    goalTitle: isHyroxPlan ? "Hyrox Race Prep" : goalLabel,
    goalSubtitle: isHyroxPlan
      ? "Build race-day fitness and confidence."
      : getShortPhrase(summary, "Build fitness and confidence."),
    forText: isHyroxPlan
      ? "Intermediate & advanced hybrid"
      : getShortPhrase(audience, "Motivated athletes"),
    focusText: isHyroxPlan
      ? "Race-specific running, sled work, functional strength"
      : getShortPhrase(summary, "Structured training"),
    resultText: isHyroxPlan
      ? "Stronger station output, better race performance"
      : getShortPhrase(result, "Better performance"),
    expectItems: isHyroxPlan
      ? [
          "High-intensity workouts",
          "Performance-based progression",
          "Built for real race conditions",
        ]
      : [
          "Structured weekly training",
          "Progressive workout flow",
          "Clear race-ready outcomes",
        ],
  };
};

const WEEKDAY_CODES = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
] as const;
const WEEKDAY_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

const PlanDetailScreenV2: React.FC<PlanDetailProps> = ({
  route,
  navigation,
}) => {
  const { planId } = route.params;
  const { mode, toggle } = useThemeMode();
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const isLight = mode === "light";

  const { profile, reload: reloadProfile } = useUserProfileBasic();
  const plansUserName =
    profile?.profile.display_name || profile?.username || null;

  const { activeUserPlan, reload: reloadActiveUserPlan } = useActiveUserPlan();
  const [pendingSessionsPerWeek, setPendingSessionsPerWeek] = useState<
    number | null
  >(null);
  const [submittedSessionsPerWeek, setSubmittedSessionsPerWeek] = useState<
    number | null
  >(null);
  const [selectedTrainingDays, setSelectedTrainingDays] = useState<string[]>(
    [],
  );
  const { plan, loading, error } = usePlanDetail(
    planId,
    submittedSessionsPerWeek,
  );
  const { reload: reloadDashboardSummary } = useDashboardSummary();

  const [activeViewWorkoutWeek, setActiveViewWorkoutWeek] =
    useState<ViewWorkoutWeek | null>(null);
  const [activeNutritionWeek, setActiveNutritionWeek] =
    useState<ViewNutritionWeek | null>(null);
  const [isOptingOut, setIsOptingOut] = useState(false);
  const [isCalculatingSchedule, setIsCalculatingSchedule] = useState(false);
  const calculateTimer = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(
    () => () => {
      if (calculateTimer.current) {
        clearTimeout(calculateTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!plan) return;

    const activeSchedule =
      activeUserPlan?.plan.id === plan.id
        ? (activeUserPlan?.plan_version?.sessions_per_week ??
          activeUserPlan?.sessions_per_week)
        : null;

    if (activeSchedule) {
      if (pendingSessionsPerWeek !== activeSchedule) {
        setPendingSessionsPerWeek(activeSchedule);
      }
      if (submittedSessionsPerWeek !== activeSchedule) {
        setSubmittedSessionsPerWeek(activeSchedule);
      }
      return;
    }

    if (pendingSessionsPerWeek) return;

    const initialSchedule =
      activeSchedule ?? plan.defaultSessionsPerWeek ?? plan.sessionsPerWeek;

    setPendingSessionsPerWeek(initialSchedule);
  }, [activeUserPlan, pendingSessionsPerWeek, plan, submittedSessionsPerWeek]);

  // Seed training-day pattern from the selected plan version whenever the
  // plan or target weekly rhythm changes. If the user adjusts the pattern
  // manually, we only reset it when the underlying version changes.
  useEffect(() => {
    if (!plan || !pendingSessionsPerWeek) return;
    const version = plan.versions?.find(
      (item) => item.sessionsPerWeek === pendingSessionsPerWeek,
    );
    if (version?.trainingDaysPattern?.length) {
      setSelectedTrainingDays(version.trainingDaysPattern);
    } else {
      setSelectedTrainingDays([]);
    }
  }, [plan, pendingSessionsPerWeek]);

  const selectWeeklyRhythm = (days: number) => {
    setPendingSessionsPerWeek(days);
  };

  const submitWeeklyRhythm = () => {
    if (!pendingSessionsPerWeek) return;
    if (calculateTimer.current) {
      clearTimeout(calculateTimer.current);
    }
    setIsCalculatingSchedule(true);
    setSubmittedSessionsPerWeek(pendingSessionsPerWeek);
    calculateTimer.current = setTimeout(() => {
      setIsCalculatingSchedule(false);
      calculateTimer.current = null;
    }, 950);
  };

  const canMarkComplete =
    !!profile?.profile.active_plan_id &&
    profile.profile.active_plan_id === plan?.id;

  const isPremiumUser = Boolean(
    (profile?.profile.personal_bests as any)?.is_premium ||
    (profile?.profile.personal_bests as any)?.premium ||
    (profile?.profile.personal_bests as any)?.subscription === "premium",
  );

  const backToPlansLink = (
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Text style={[styles.linkText, isLight && styles.linkTextLight]}>
        {"\u2039 Back to plans"}
      </Text>
    </TouchableOpacity>
  );

  const handleOptOut = () => {
    if (!plan || !accessToken || isOptingOut) return;

    Alert.alert(
      "Opt out of plan?",
      "This will remove the plan from your active dashboard. Your completed workout history will stay saved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Opt out",
          style: "destructive",
          onPress: async () => {
            setIsOptingOut(true);
            try {
              let tokenToUse = accessToken;
              let response = await fetch(`${API_BASE_URL}/plans/opt-out/`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${tokenToUse}`,
                },
                body: JSON.stringify({ plan_id: plan.id }),
              });

              if (response.status === 401) {
                const refreshed = await refreshAccessToken();
                if (!refreshed) {
                  await signOut();
                  return;
                }
                tokenToUse = refreshed;
                response = await fetch(`${API_BASE_URL}/plans/opt-out/`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${tokenToUse}`,
                  },
                  body: JSON.stringify({ plan_id: plan.id }),
                });
              }

              if (!response.ok) {
                const data = await response.json().catch(() => null);
                Alert.alert(
                  "Could not opt out",
                  data?.detail || "Please try again.",
                );
                return;
              }

              reloadDashboardSummary();
              await reloadProfile();
              Alert.alert("Plan removed", "This plan is no longer active.");
              navigation.goBack();
            } catch {
              Alert.alert("Could not opt out", "Please try again.");
            } finally {
              setIsOptingOut(false);
            }
          },
        },
      ],
    );
  };

  const startPlan = async (sessionsPerWeek: number, isPremium: boolean) => {
    const version = plan?.versions?.find(
      (item) => item.sessionsPerWeek === sessionsPerWeek,
    );
    if (!version) {
      Alert.alert(
        "Coming soon",
        "This schedule option is part of the plan system, but it is not available yet.",
      );
      return;
    }
    if (isPremium && !isPremiumUser) {
      Alert.alert(
        "Premium required",
        "This schedule is available with Premium.",
      );
      return;
    }
    if (!accessToken) {
      Alert.alert("Sign in required", "Please sign in to start this plan.");
      return;
    }

    // Require a concrete set of training days when the user has selected any,
    // and make sure the count matches the chosen weekly frequency.
    if (
      selectedTrainingDays.length > 0 &&
      selectedTrainingDays.length !== sessionsPerWeek
    ) {
      Alert.alert(
        "Select training days",
        `Choose ${sessionsPerWeek} training days to match your schedule.`,
      );
      return;
    }

    const effectiveTrainingDays =
      selectedTrainingDays.length === sessionsPerWeek
        ? selectedTrainingDays
        : (version?.trainingDaysPattern ?? []);

    const today = new Date().toISOString().slice(0, 10);
    const response = await fetch(`${API_BASE_URL}/user-plans/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        planId,
        sessionsPerWeek,
        startDate: today,
        trainingDaysPattern: effectiveTrainingDays,
      }),
    });

    if (response.status === 402) {
      Alert.alert(
        "Premium required",
        "This schedule is available with Premium.",
      );
      return;
    }
    if (!response.ok) {
      Alert.alert(
        "Could not start plan",
        `Server returned ${response.status}.`,
      );
      return;
    }

    await reloadProfile();
    await reloadActiveUserPlan();
    reloadDashboardSummary();
    setPendingSessionsPerWeek(sessionsPerWeek);
    setSubmittedSessionsPerWeek(sessionsPerWeek);
    Alert.alert("Plan started", "Your workouts have been added to your plan.");
  };

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
            await reloadActiveUserPlan();
            reloadDashboardSummary();
            Alert.alert(
              "Plan recalibrated",
              "Your plan has been recalibrated. Missed workouts have been moved to your upcoming training days.",
            );
          },
        },
      ],
    );
  };

  if (loading && !plan) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Your plan"
          userName={plansUserName}
          onThemeToggle={toggle}
          topContent={backToPlansLink}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading plan...</Text>
        </View>
      </View>
    );
  }

  if (error || !plan) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Your plan"
          userName={plansUserName}
          onThemeToggle={toggle}
          topContent={backToPlansLink}
        />
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          Plan Details
        </Text>
        <Text style={styles.errorText}>{error || "Plan not found"}</Text>
      </View>
    );
  }

  const levelLabel = plan.level.charAt(0).toUpperCase() + plan.level.slice(1);
  const goalLabel = humanizeGoal(plan.goal);
  const isThisActivePlan = activeUserPlan?.plan.id === plan.id;
  const activePlanSchedule = isThisActivePlan
    ? (activeUserPlan?.plan_version?.sessions_per_week ??
      activeUserPlan?.sessions_per_week)
    : null;
  const currentSchedule = activePlanSchedule ?? submittedSessionsPerWeek;
  const supportedSchedules = plan.supportedSessionsPerWeek?.length
    ? plan.supportedSessionsPerWeek
    : [3, 4, 5, 6];
  const rhythmOptions = Array.from(new Set(supportedSchedules))
    .filter((item) => item >= 3 && item <= 6)
    .sort((a, b) => a - b);
  const shouldShowScheduleOptions = !isThisActivePlan;
  const isPreviewCurrent =
    !!submittedSessionsPerWeek &&
    pendingSessionsPerWeek === submittedSessionsPerWeek;
  const isBuildingSchedule =
    !!currentSchedule && (isCalculatingSchedule || loading);
  const canSubmitRhythm =
    !isThisActivePlan &&
    !!pendingSessionsPerWeek &&
    (!submittedSessionsPerWeek ||
      pendingSessionsPerWeek !== submittedSessionsPerWeek);
  const detailCopy = buildPlanDetailCopy(
    plan.name,
    plan.audience,
    plan.summary,
    plan.result,
    goalLabel || getShortPhrase(plan.goal, "Training"),
  );
  const missedCount = isThisActivePlan
    ? (activeUserPlan?.missed_sessions ?? 0)
    : 0;
  const selectedDayLabels = WEEKDAY_CODES.map((code, index) =>
    selectedTrainingDays.includes(code) ? WEEKDAY_LABELS[index] : null,
  ).filter(Boolean) as string[];

  const openPlanOptions = () => {
    if (canMarkComplete) {
      Alert.alert("Plan options", plan.name, [
        { text: "Cancel", style: "cancel" },
        { text: "Opt out", style: "destructive", onPress: handleOptOut },
      ]);
      return;
    }
    Alert.alert(
      "Plan options",
      "Start a schedule option below to activate this plan.",
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[
          styles.planDetailScreen,
          !isLight && styles.planDetailScreenDark,
        ]}
        contentContainerStyle={styles.planDetailScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.planDetailTopNav}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            style={[
              styles.planDetailNavButton,
              isLight
                ? styles.planDetailNavButtonLight
                : styles.planDetailNavButtonDark,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={25}
              color={isLight ? "#111827" : "#F8FAFC"}
            />
          </TouchableOpacity>
          <Text
            style={[
              styles.planDetailNavTitle,
              isLight
                ? styles.planDetailNavTitleLight
                : styles.planDetailNavTitleDark,
            ]}
          >
            Training Plan
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openPlanOptions}
            style={[
              styles.planDetailNavButton,
              isLight
                ? styles.planDetailNavButtonLight
                : styles.planDetailNavButtonDark,
            ]}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={22}
              color={isLight ? "#111827" : "#F8FAFC"}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.planDetailHero}>
          <View style={styles.planDetailHeroHeader}>
            <Text
              style={[
                styles.planDetailTitle,
                isLight
                  ? styles.planDetailTitleLight
                  : styles.planDetailTitleDark,
              ]}
              numberOfLines={2}
            >
              {plan.name}
            </Text>
            {canMarkComplete && (
              <View
                style={[
                  styles.planDetailActivePill,
                  isLight
                    ? styles.planDetailActivePillLight
                    : styles.planDetailActivePillDark,
                ]}
              >
                <Ionicons name="radio-button-on" size={16} color="#34A853" />
                <Text
                  style={[
                    styles.planDetailActivePillText,
                    isLight
                      ? styles.planDetailActivePillTextLight
                      : styles.planDetailActivePillTextDark,
                  ]}
                >
                  Active
                </Text>
              </View>
            )}
          </View>

          <View style={styles.planDetailFactRow}>
            <View
              style={[
                styles.planDetailFactChip,
                isLight
                  ? styles.planDetailFactChipLight
                  : styles.planDetailFactChipDark,
              ]}
            >
              <Ionicons
                name="flash-outline"
                size={16}
                color={isLight ? "#667085" : "#A7B0C3"}
              />
              <Text
                style={[
                  styles.planDetailFactText,
                  isLight
                    ? styles.planDetailFactTextLight
                    : styles.planDetailFactTextDark,
                ]}
              >
                {levelLabel}
              </Text>
            </View>
            <View
              style={[
                styles.planDetailFactChip,
                isLight
                  ? styles.planDetailFactChipLight
                  : styles.planDetailFactChipDark,
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={isLight ? "#667085" : "#A7B0C3"}
              />
              <Text
                style={[
                  styles.planDetailFactText,
                  isLight
                    ? styles.planDetailFactTextLight
                    : styles.planDetailFactTextDark,
                ]}
              >
                {plan.durationWeeks} weeks
              </Text>
            </View>
            <View
              style={[
                styles.planDetailFactChip,
                isLight
                  ? styles.planDetailFactChipLight
                  : styles.planDetailFactChipDark,
              ]}
            >
              <Ionicons
                name="barbell-outline"
                size={16}
                color={isLight ? "#667085" : "#A7B0C3"}
              />
              <Text
                style={[
                  styles.planDetailFactText,
                  isLight
                    ? styles.planDetailFactTextLight
                    : styles.planDetailFactTextDark,
                ]}
              >
                Up to {plan.maxSessionsPerWeek ?? plan.sessionsPerWeek}{" "}
                days/week
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.planDetailGoalCard,
            isLight && styles.planDetailGoalCardLight,
          ]}
        >
          <View style={styles.planDetailGoalContent}>
            <Text
              style={[
                styles.planDetailGoalEyebrow,
                isLight && styles.planDetailGoalEyebrowLight,
              ]}
            >
              Goal
            </Text>
            <Text
              style={[
                styles.planDetailGoalTitle,
                isLight && styles.planDetailGoalTitleLight,
              ]}
            >
              {detailCopy.goalTitle}
            </Text>
            <Text
              style={[
                styles.planDetailGoalText,
                isLight && styles.planDetailGoalTextLight,
              ]}
              numberOfLines={3}
            >
              {detailCopy.goalSubtitle}
            </Text>
          </View>
          <View
            style={[
              styles.planDetailGoalFlag,
              isLight && styles.planDetailGoalFlagLight,
            ]}
          >
            <Ionicons
              name="flag-outline"
              size={28}
              color={isLight ? "#475569" : "#FFFFFF"}
            />
          </View>
        </View>

        <View style={styles.planDetailInfoGrid}>
          <View
            style={[
              styles.planDetailInfoCard,
              !isLight && styles.planDetailInfoCardDark,
            ]}
          >
            <View
              style={[
                styles.planDetailInfoIcon,
                styles.planDetailInfoIconGreen,
              ]}
            >
              <Ionicons name="radio-outline" size={24} color="#0D7A34" />
            </View>
            <View style={styles.planDetailInfoCopy}>
              <Text
                style={[
                  styles.planDetailInfoLabel,
                  !isLight && styles.planDetailInfoLabelDark,
                ]}
              >
                For
              </Text>
              <Text
                style={[
                  styles.planDetailInfoValue,
                  !isLight && styles.planDetailInfoValueDark,
                ]}
                numberOfLines={3}
              >
                {detailCopy.forText}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.planDetailInfoCard,
              !isLight && styles.planDetailInfoCardDark,
            ]}
          >
            <View
              style={[styles.planDetailInfoIcon, styles.planDetailInfoIconBlue]}
            >
              <Ionicons name="walk-outline" size={24} color="#1677D2" />
            </View>
            <View style={styles.planDetailInfoCopy}>
              <Text
                style={[
                  styles.planDetailInfoLabel,
                  !isLight && styles.planDetailInfoLabelDark,
                ]}
              >
                Focus
              </Text>
              <Text
                style={[
                  styles.planDetailInfoValue,
                  !isLight && styles.planDetailInfoValueDark,
                ]}
                numberOfLines={3}
              >
                {detailCopy.focusText}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.planDetailInfoCard,
              !isLight && styles.planDetailInfoCardDark,
            ]}
          >
            <View
              style={[styles.planDetailInfoIcon, styles.planDetailInfoIconGold]}
            >
              <Ionicons name="analytics-outline" size={24} color="#101828" />
            </View>
            <View style={styles.planDetailInfoCopy}>
              <Text
                style={[
                  styles.planDetailInfoLabel,
                  !isLight && styles.planDetailInfoLabelDark,
                ]}
              >
                Result
              </Text>
              <Text
                style={[
                  styles.planDetailInfoValue,
                  !isLight && styles.planDetailInfoValueDark,
                ]}
                numberOfLines={3}
              >
                {detailCopy.resultText}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.planDetailInfoCard,
              styles.planDetailExpectCard,
              !isLight && styles.planDetailExpectCardDark,
            ]}
          >
            <Text
              style={[
                styles.planDetailInfoLabel,
                !isLight && styles.planDetailInfoLabelDark,
              ]}
            >
              What to expect
            </Text>
            <View style={styles.planDetailExpectList}>
              {detailCopy.expectItems.map((item) => (
                <View key={item} style={styles.planDetailExpectRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color={isLight ? "#344054" : "#CBD5E1"}
                  />
                  <Text
                    style={[
                      styles.planDetailExpectText,
                      !isLight && styles.planDetailExpectTextDark,
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.planDetailContainer}>
          <View
            style={[
              styles.planCurrentScheduleCard,
              !isLight && styles.planCurrentScheduleCardDark,
            ]}
          >
            <View style={styles.planCurrentScheduleHeader}>
              <View
                style={[
                  styles.planCurrentScheduleIcon,
                  isLight && styles.planCurrentScheduleIconLight,
                  !isLight && styles.planCurrentScheduleIconDark,
                ]}
              >
                <Ionicons name="calendar-outline" size={22} color="#0B73D9" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.planScheduleStepBadge}>
                  <Text style={styles.planScheduleStepBadgeText}>
                    STEP 2 OF 4
                  </Text>
                </View>
                <Text
                  style={[
                    styles.planCurrentScheduleEyebrow,
                    isLight
                      ? styles.planCurrentScheduleEyebrowLight
                      : styles.planCurrentScheduleEyebrowDark,
                  ]}
                >
                  Training rhythm
                </Text>
                <Text
                  style={[
                    styles.planCurrentScheduleTitle,
                    isLight
                      ? styles.planCurrentScheduleTitleLight
                      : styles.planCurrentScheduleTitleDark,
                  ]}
                >
                  {isThisActivePlan
                    ? "Your weekly schedule"
                    : "Choose your weekly schedule"}
                </Text>
                <Text
                  style={[
                    styles.planScheduleOptionsHint,
                    isLight
                      ? styles.planScheduleOptionsHintLight
                      : styles.planScheduleOptionsHintDark,
                  ]}
                >
                  {isThisActivePlan
                    ? "This is the workout rhythm saved for your active plan."
                    : "Pick how many days you want to train and select your preferred workout days."}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.planScheduleDivider,
                !isLight && styles.planScheduleDividerDark,
              ]}
            />
            {shouldShowScheduleOptions && (
              <View>
                <View style={styles.planScheduleSectionHeader}>
                  <Ionicons name="bar-chart-outline" size={21} color="#2E7BE6" />
                  <View style={styles.planScheduleSectionCopy}>
                    <Text
                      style={[
                        styles.planScheduleOptionsTitle,
                        isLight
                          ? styles.planScheduleOptionsTitleLight
                          : styles.planScheduleOptionsTitleDark,
                      ]}
                    >
                      Workouts per week
                    </Text>
                  </View>
                </View>
                <View style={styles.planScheduleChoiceRow}>
                  {rhythmOptions.map((days) => {
                    const isSelected = days === pendingSessionsPerWeek;
                    const isSupported = supportedSchedules.includes(days);
                    return (
                      <TouchableOpacity
                        key={days}
                        activeOpacity={0.88}
                        style={[
                          styles.planScheduleChoice,
                          !isLight && styles.planScheduleChoiceDark,
                          isSelected && styles.planScheduleChoiceSelected,
                          isSelected &&
                            !isLight &&
                            styles.planScheduleChoiceSelectedDark,
                          !isSupported && styles.planScheduleChoiceDisabled,
                        ]}
                        onPress={() => {
                          if (!isSupported) {
                            Alert.alert(
                              "Coming soon",
                              `${days} workouts per week is not available for this plan yet.`,
                            );
                            return;
                          }
                          selectWeeklyRhythm(days);
                        }}
                      >
                        <Text
                          style={[
                            styles.planScheduleChoiceText,
                            !isLight && styles.planScheduleChoiceTextDark,
                            isSelected && styles.planScheduleChoiceTextSelected,
                          ]}
                        >
                          {days}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {!!pendingSessionsPerWeek && (
                  <View style={styles.planScheduleTrainingSection}>
                    <View style={styles.planScheduleSectionHeader}>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#2E7BE6"
                      />
                      <View style={styles.planScheduleSectionCopy}>
                        <Text
                          style={[
                            styles.planScheduleOptionsTitle,
                            isLight
                              ? styles.planScheduleOptionsTitleLight
                              : styles.planScheduleOptionsTitleDark,
                          ]}
                        >
                          Training days
                        </Text>
                        <Text
                          style={[
                            styles.planScheduleOptionsHint,
                            isLight
                              ? styles.planScheduleOptionsHintLight
                              : styles.planScheduleOptionsHintDark,
                          ]}
                        >
                          Choose {pendingSessionsPerWeek} days that fit your
                          week.
                        </Text>
                      </View>
                    </View>
                    <View style={styles.planScheduleDaysRow}>
                      {WEEKDAY_CODES.map((code, index) => {
                        const label = WEEKDAY_LABELS[index];
                        const isSelected = selectedTrainingDays.includes(code);
                        return (
                          <TouchableOpacity
                            key={code}
                            activeOpacity={0.88}
                            style={[
                              styles.planScheduleDayButton,
                              !isLight && styles.planScheduleDayButtonDark,
                              isSelected && styles.planScheduleDayButtonSelected,
                              isSelected &&
                                !isLight &&
                                styles.planScheduleDayButtonSelectedDark,
                            ]}
                            onPress={() => {
                              setSelectedTrainingDays((prev) => {
                                const exists = prev.includes(code);
                                if (exists) {
                                  return prev.filter((d) => d !== code);
                                }
                                if (prev.length >= pendingSessionsPerWeek) {
                                  return prev;
                                }
                                return [...prev, code];
                              });
                            }}
                          >
                            {isSelected && (
                              <View style={styles.planScheduleDayCheck}>
                                <Ionicons
                                  name="checkmark"
                                  size={12}
                                  color="#07111F"
                                />
                              </View>
                            )}
                            <Text
                              style={[
                                styles.planScheduleDayButtonText,
                                !isLight &&
                                  styles.planScheduleDayButtonTextDark,
                                isSelected &&
                                  styles.planScheduleDayButtonTextSelected,
                              ]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View
                      style={[
                        styles.planScheduleSelectedSummary,
                        !isLight && styles.planScheduleSelectedSummaryDark,
                      ]}
                    >
                      <View style={styles.planScheduleSelectedIcon}>
                        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                      </View>
                      <Text
                        style={[
                          styles.planCurrentScheduleDescription,
                          isLight
                            ? styles.planCurrentScheduleDescriptionLight
                            : styles.planCurrentScheduleDescriptionDark,
                        ]}
                      >
                        {selectedDayLabels.length
                          ? `Selected: ${selectedDayLabels.join(", ")}`
                          : "Tap the days that fit your week."}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}
            {isThisActivePlan && currentSchedule ? (
              <View style={styles.planScheduleTrainingSection}>
                <View style={styles.planScheduleSectionHeader}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#2E7BE6"
                  />
                  <View style={styles.planScheduleSectionCopy}>
                    <Text
                      style={[
                        styles.planScheduleOptionsTitle,
                        isLight
                          ? styles.planScheduleOptionsTitleLight
                          : styles.planScheduleOptionsTitleDark,
                      ]}
                    >
                      {currentSchedule} workouts per week
                    </Text>
                    <Text
                      style={[
                        styles.planScheduleOptionsHint,
                        isLight
                          ? styles.planScheduleOptionsHintLight
                          : styles.planScheduleOptionsHintDark,
                      ]}
                    >
                      {selectedDayLabels.length
                        ? selectedDayLabels.join(", ")
                        : "Your selected plan schedule"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
            {canSubmitRhythm && (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.planDetailPrimaryButton,
                  isLight && styles.planDetailPrimaryButtonLight,
                ]}
                onPress={submitWeeklyRhythm}
              >
                <Text
                  style={[
                    styles.planDetailPrimaryButtonText,
                    isLight && styles.planDetailPrimaryButtonTextLight,
                  ]}
                >
                  {pendingSessionsPerWeek
                    ? `Build my ${pendingSessionsPerWeek}-day plan`
                    : "Build my plan"}
                </Text>
                <Ionicons name="arrow-forward" size={21} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {missedCount > 0 && (
            <View
              style={[
                styles.planRecalibrateCard,
                isLight && styles.planRecalibrateCardLight,
              ]}
            >
              <View
                style={[
                  styles.planRecalibrateIcon,
                  isLight && styles.planRecalibrateIconLight,
                ]}
              >
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={isLight ? "#0F172A" : "#E5E7EB"}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    styles.planRecalibrateTitle,
                    isLight
                      ? styles.planRecalibrateTitleLight
                      : styles.planRecalibrateTitleDark,
                  ]}
                >
                  You missed {missedCount} workouts.
                </Text>
                <Text
                  style={[
                    styles.planRecalibrateText,
                    isLight
                      ? styles.planRecalibrateTextLight
                      : styles.planRecalibrateTextDark,
                  ]}
                >
                  Recalibrate your plan and continue without losing progress.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.planRecalibrateButton,
                  isLight && styles.planRecalibrateButtonLight,
                ]}
                onPress={recalibratePlan}
              >
                <Text
                  style={[
                    styles.planRecalibrateButtonText,
                    isLight
                      ? styles.planRecalibrateButtonTextLight
                      : styles.planRecalibrateButtonTextDark,
                  ]}
                >
                  Recalibrate
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isThisActivePlan && isPreviewCurrent && !isBuildingSchedule && (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.planDetailPrimaryButton,
                isLight && styles.planDetailPrimaryButtonLight,
              ]}
              onPress={() => {
                if (!currentSchedule) return;
                const version = plan.versions?.find(
                  (item) => item.sessionsPerWeek === currentSchedule,
                );
                void startPlan(currentSchedule, version?.isPremium ?? false);
              }}
            >
              <Text
                style={[
                  styles.planDetailPrimaryButtonText,
                  isLight && styles.planDetailPrimaryButtonTextLight,
                ]}
              >
                Start {currentSchedule} days/week
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isBuildingSchedule && (
          <View style={styles.planDetailContainer}>
            <View
              style={[
                styles.planCalculatingCard,
                isLight && styles.planCalculatingCardLight,
              ]}
            >
              <ActivityIndicator color={isLight ? "#0EA5E9" : "#38BDF8"} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    styles.planCalculatingTitle,
                    isLight
                      ? styles.planCalculatingTitleLight
                      : styles.planCalculatingTitleDark,
                  ]}
                >
                  BUILDING YOUR {currentSchedule}-DAY WEEK
                </Text>
                <Text
                  style={[
                    styles.planCalculatingText,
                    isLight
                      ? styles.planCalculatingTextLight
                      : styles.planCalculatingTextDark,
                  ]}
                >
                  Filtering the master plan into the right training rhythm.
                </Text>
              </View>
            </View>
          </View>
        )}

        {isPreviewCurrent && !isBuildingSchedule && (
          <View style={styles.planDetailContainer}>
            <View style={styles.planDetailSectionHeaderRow}>
              <Text
                style={[
                  styles.planDetailHeading,
                  isLight
                    ? styles.planDetailHeadingLight
                    : styles.planDetailHeadingDark,
                ]}
              >
                WEEK DETAILS
              </Text>
              <Text
                style={[
                  styles.planDetailSectionSubtext,
                  isLight
                    ? styles.planDetailSectionSubtextLight
                    : styles.planDetailSectionSubtextDark,
                ]}
              >
                Open a week for the full workout split.
              </Text>
            </View>
            <View style={styles.planDetailWeekList}>
              {plan.weeks.map((week) => {
                const workoutWeek = mapPlanWeekToViewWorkoutWeek(week);
                const nutritionWeek = mapPlanWeekToViewNutritionWeek(week);
                return (
                  <TouchableOpacity
                    key={week.id}
                    activeOpacity={0.9}
                    style={styles.planDetailWeekCardOuter}
                    onPress={() => setActiveViewWorkoutWeek(workoutWeek)}
                  >
                    <View
                      style={[
                        styles.planDetailWeekCard,
                        isLight && styles.planDetailWeekCardLight,
                      ]}
                    >
                      <View style={styles.planDetailWeekHeader}>
                        <View
                          style={[
                            styles.planDetailWeekNumber,
                            isLight && styles.planDetailWeekNumberLight,
                          ]}
                        >
                          <Text
                            style={[
                              styles.planDetailWeekNumberText,
                              isLight
                                ? styles.planDetailWeekNumberTextLight
                                : styles.planDetailWeekNumberTextDark,
                            ]}
                          >
                            {week.number}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.planDetailWeekTitle,
                            isLight
                              ? styles.planDetailWeekTitleLight
                              : styles.planDetailWeekTitleDark,
                          ]}
                          numberOfLines={2}
                        >
                          {week.title}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.planDetailWeekDescription,
                          isLight
                            ? styles.planDetailWeekDescriptionLight
                            : styles.planDetailWeekDescriptionDark,
                        ]}
                        numberOfLines={2}
                      >
                        {week.description}
                      </Text>
                      <View style={styles.planWeekMetaRow}>
                        <View
                          style={[
                            styles.planWeekMetaPill,
                            isLight && styles.planWeekMetaPillLight,
                          ]}
                        >
                          <Text
                            style={[
                              styles.planWeekMetaText,
                              isLight
                                ? styles.planWeekMetaTextLight
                                : styles.planWeekMetaTextDark,
                            ]}
                          >
                            {week.days.length} workouts
                          </Text>
                        </View>
                        {!!week.recoveryPriority && (
                          <View
                            style={[
                              styles.planWeekMetaPill,
                              isLight && styles.planWeekMetaPillLight,
                            ]}
                          >
                            <Text
                              style={[
                                styles.planWeekMetaText,
                                isLight
                                  ? styles.planWeekMetaTextLight
                                  : styles.planWeekMetaTextDark,
                              ]}
                              numberOfLines={1}
                            >
                              {week.recoveryPriority}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.planDetailWeekActions}>
                        <TouchableOpacity
                          activeOpacity={0.88}
                          style={[
                            styles.planWeekViewFullButton,
                            isLight && styles.planWeekViewFullButtonLight,
                          ]}
                          onPress={() => setActiveViewWorkoutWeek(workoutWeek)}
                        >
                          <Text
                            style={[
                              styles.planWeekViewFullButtonLabel,
                              isLight
                                ? styles.planWeekViewFullButtonLabelLight
                                : styles.planWeekViewFullButtonLabelDark,
                            ]}
                          >
                            Workouts
                          </Text>
                        </TouchableOpacity>
                        {nutritionWeek && (
                          <TouchableOpacity
                            activeOpacity={0.88}
                            style={[
                              styles.planWeekViewFullButton,
                              isLight && styles.planWeekViewFullButtonLight,
                              { marginLeft: 8 },
                            ]}
                            onPress={() =>
                              setActiveNutritionWeek(nutritionWeek)
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
                              Nutrition
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
      <ViewWorkoutWeekModal
        week={activeViewWorkoutWeek}
        isLight={isLight}
        planId={plan.id}
        canMarkComplete={canMarkComplete}
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

export default PlanDetailScreenV2;
