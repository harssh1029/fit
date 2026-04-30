import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  GLASS_ACCENT_GREEN,
  DARK_TEXT_PRIMARY,
  DARK_TEXT_MUTED,
  LIGHT_TEXT_MUTED,
} from "../../styles/theme";
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
  type PlanDayDetail,
  type ViewWorkoutWeek,
  type ViewNutritionWeek,
  ViewWorkoutWeekModal,
  ViewNutritionWeekModal,
  mapPlanWeekToViewWorkoutWeek,
} from "../../App";

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

const getPrimaryOutcome = (result: string) => {
  const [first] = result.split(".");
  return first || result;
};

const getGuidelineNote = (description: string, fallback: string) => {
  if (!description) return fallback;
  const [firstSentence] = description.split(".");
  return firstSentence ? `${firstSentence}.` : fallback;
};

const getTimelineTag = (day: PlanDayDetail) => {
  const title = day.title.toLowerCase();
  const type = day.type;
  if (title.includes("interval") || title.includes("speed")) {
    return { label: "Speed", icon: "flash", tone: "amber" };
  }
  if (title.includes("compromised") || title.includes("simulation")) {
    return { label: "Pressure", icon: "pulse", tone: "purple" };
  }
  if (title.includes("sled") || title.includes("strength")) {
    return { label: "Strength", icon: "barbell", tone: "orange" };
  }
  if (type === "recovery") {
    return { label: "Reset", icon: "leaf", tone: "green" };
  }
  return { label: "Engine", icon: "flash", tone: "green" };
};

const getTimelineIntensity = (day: PlanDayDetail) => {
  const title = day.title.toLowerCase();
  if (title.includes("light") || title.includes("easy")) return 2;
  if (
    title.includes("simulation") ||
    title.includes("compromised") ||
    title.includes("interval")
  ) {
    return 4;
  }
  return 3;
};

const getTrainingDayLabel = (dayIndex: number, sessionsPerWeek: number) => {
  const patterns: Record<number, string[]> = {
    3: ["Mon", "Wed", "Fri"],
    4: ["Mon", "Tue", "Thu", "Sat"],
    5: ["Mon", "Tue", "Wed", "Fri", "Sat"],
    6: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  };
  const pattern = patterns[sessionsPerWeek] ?? ["Mon", "Tue", "Thu", "Sat"];
  return pattern[(dayIndex - 1) % pattern.length];
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

  const { plan, loading, error } = usePlanDetail(planId);
  const { activeUserPlan, reload: reloadActiveUserPlan } = useActiveUserPlan();
  const { reload: reloadDashboardSummary } = useDashboardSummary();

  const [activeViewWorkoutWeek, setActiveViewWorkoutWeek] =
    useState<ViewWorkoutWeek | null>(null);
  const [activeNutritionWeek, setActiveNutritionWeek] =
    useState<ViewNutritionWeek | null>(null);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number | null>(
    null,
  );
  const [isOptingOut, setIsOptingOut] = useState(false);
  const [showScheduleOptions, setShowScheduleOptions] = useState(false);
  const scheduleReveal = React.useRef(new Animated.Value(0)).current;

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
      Alert.alert("Could not start plan", `Server returned ${response.status}.`);
      return;
    }

    await reloadProfile();
    await reloadActiveUserPlan();
    reloadDashboardSummary();
    Alert.alert("Plan started", "Your workouts have been added to your plan.");
  };

  const toggleScheduleOptions = () => {
    const nextValue = showScheduleOptions ? 0 : 1;
    setShowScheduleOptions(!showScheduleOptions);
    Animated.timing(scheduleReveal, {
      toValue: nextValue,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
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

  if (loading) {
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
  const progress = plan.userProgress ?? null;
  const completedSessions = progress?.completedSessions ?? 0;
  const totalSessions =
    progress?.totalSessions ??
    plan.weeks.reduce((total, week) => total + week.days.length, 0);
  const completionPercent = progress?.completionPercent ?? 0;
  const currentWeekNumber = progress?.currentWeekNumber;
  const defaultSchedule = plan.defaultSessionsPerWeek ?? plan.sessionsPerWeek;
  const resultSummary = getPrimaryOutcome(plan.result || plan.summary);
  const selectedWeek =
    plan.weeks.find(
      (week) =>
        week.number ===
        (selectedWeekNumber ?? currentWeekNumber ?? plan.weeks[0]?.number),
    ) ?? plan.weeks[0];
  const selectedWorkoutWeek = selectedWeek
    ? mapPlanWeekToViewWorkoutWeek(selectedWeek)
    : null;
  const isThisActivePlan = activeUserPlan?.plan.id === plan.id;
  const currentSchedule = isThisActivePlan
    ? activeUserPlan?.plan_version?.sessions_per_week ??
      activeUserPlan?.sessions_per_week ??
      defaultSchedule
    : defaultSchedule;
  const currentVersion = plan.versions?.find(
    (item) => item.sessionsPerWeek === currentSchedule,
  );
  const currentScheduleLabel =
    currentVersion?.weeklyStructure?.join(" · ") ||
    `${currentSchedule} focused sessions each week`;
  const guidelineNote = getGuidelineNote(
    plan.longDescription || "",
    "A serious HYROX preparation block combining running, strength, sled work, carrying, and race simulation.",
  );
  const missedCount = isThisActivePlan ? activeUserPlan?.missed_sessions ?? 0 : 0;
  const scheduleRevealStyle = {
    opacity: scheduleReveal,
    transform: [
      {
        translateY: scheduleReveal.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 0],
        }),
      },
    ],
  };

  const openPlanOptions = () => {
    if (canMarkComplete) {
      Alert.alert("Plan options", plan.name, [
        { text: "Cancel", style: "cancel" },
        { text: "Opt out", style: "destructive", onPress: handleOptOut },
      ]);
      return;
    }
    Alert.alert("Plan options", "Start a schedule option below to activate this plan.");
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
        contentContainerStyle={styles.plansScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.planDetailTopNav}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
            style={[
              styles.planDetailNavButton,
              isLight && styles.planDetailNavButtonLight,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={isLight ? "#0F172A" : DARK_TEXT_PRIMARY}
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
              isLight && styles.planDetailNavButtonLight,
            ]}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={isLight ? "#0F172A" : DARK_TEXT_PRIMARY}
            />
          </TouchableOpacity>
        </View>

        <View
          style={[styles.planDetailHero, isLight && styles.planDetailHeroLight]}
        >
          <View style={styles.planDetailHeroHeader}>
            <Text
              style={[
                styles.planDetailTitle,
                isLight ? styles.planDetailTitleLight : styles.planDetailTitleDark,
              ]}
              numberOfLines={2}
            >
              {plan.name}
            </Text>
            {canMarkComplete && (
              <View
                style={[
                  styles.planDetailActivePill,
                  isLight && styles.planDetailActivePillLight,
                ]}
              >
                <Ionicons
                  name="radio-button-on"
                  size={13}
                  color={isLight ? "#475569" : "#CBD5E1"}
                />
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

          {!!plan.subtitle && (
            <Text
              style={[
                styles.planDetailSummary,
                isLight
                  ? styles.planDetailSummaryLight
                  : styles.planDetailSummaryDark,
              ]}
            >
              {plan.subtitle}
            </Text>
          )}

          <Text
            style={[
              styles.planDetailSummary,
              isLight
                ? styles.planDetailSummaryLight
                : styles.planDetailSummaryDark,
            ]}
            numberOfLines={4}
          >
            {plan.summary || plan.goal}
          </Text>

          <View style={styles.planDetailFactRow}>
            <View
              style={[
                styles.planDetailFactChip,
                isLight && styles.planDetailFactChipLight,
              ]}
            >
              <Ionicons
                name="flash-outline"
                size={14}
                color={isLight ? "#475569" : "#CBD5E1"}
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
                isLight && styles.planDetailFactChipLight,
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={isLight ? "#475569" : "#CBD5E1"}
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
                isLight && styles.planDetailFactChipLight,
              ]}
            >
              <Ionicons
                name="barbell-outline"
                size={14}
                color={isLight ? "#475569" : "#CBD5E1"}
              />
              <Text
                style={[
                  styles.planDetailFactText,
                  isLight
                    ? styles.planDetailFactTextLight
                    : styles.planDetailFactTextDark,
                ]}
              >
                {defaultSchedule} days/week
              </Text>
            </View>
          </View>

          <View style={styles.planDetailProgressBlock}>
            <View style={styles.planDetailProgressHeader}>
              <Text
                style={[
                  styles.planDetailProgressText,
                  isLight
                    ? styles.planDetailProgressTextLight
                    : styles.planDetailProgressTextDark,
                ]}
              >
                {currentWeekNumber
                  ? `Week ${currentWeekNumber} of ${plan.durationWeeks}`
                  : `${plan.durationWeeks} week plan`}
              </Text>
              <Text
                style={[
                  styles.planDetailProgressText,
                  isLight
                    ? styles.planDetailProgressTextLight
                    : styles.planDetailProgressTextDark,
                ]}
              >
                {completionPercent}% completed
              </Text>
            </View>
            <ProgressDots
              total={totalSessions}
              completed={completedSessions}
              isLight={isLight}
            />
            <View style={styles.planDetailProgressDates}>
              <View style={styles.planDetailDateItem}>
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={isLight ? LIGHT_TEXT_MUTED : DARK_TEXT_MUTED}
                />
                <Text
                  style={[
                    styles.planDetailDateText,
                    isLight
                      ? styles.planDetailDateTextLight
                      : styles.planDetailDateTextDark,
                  ]}
                >
                  Started {formatPlanDate(progress?.startedAt)}
                </Text>
              </View>
              <View style={styles.planDetailDateItem}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={13}
                  color={isLight ? LIGHT_TEXT_MUTED : DARK_TEXT_MUTED}
                />
                <Text
                  style={[
                    styles.planDetailDateText,
                    isLight
                      ? styles.planDetailDateTextLight
                      : styles.planDetailDateTextDark,
                  ]}
                >
                  Ends {formatPlanDate(progress?.expectedEndAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.planDetailInsightRow}>
          <View
            style={[
              styles.planDetailInsightCard,
              isLight && styles.planDetailInsightCardLight,
            ]}
          >
            <View
              style={[
                styles.planDetailInsightIcon,
                styles.planDetailInsightIconBlue,
              ]}
            >
              <Ionicons name="locate-outline" size={26} color="#FFFFFF" />
            </View>
            <Text
              style={[
                styles.planDetailInsightLabel,
                isLight
                  ? styles.planDetailInsightLabelLight
                  : styles.planDetailInsightLabelDark,
              ]}
            >
              Race focus
            </Text>
            <Text
              style={[
                styles.planDetailInsightText,
                isLight
                  ? styles.planDetailInsightTextLight
                  : styles.planDetailInsightTextDark,
              ]}
              numberOfLines={2}
            >
              {goalLabel}
            </Text>
            <Text
              style={[
                styles.planDetailInsightSubtext,
                isLight
                  ? styles.planDetailInsightSubtextLight
                  : styles.planDetailInsightSubtextDark,
              ]}
              numberOfLines={3}
            >
              Prepare for race day with clear station-to-run transfer.
            </Text>
          </View>
          <View
            style={[
              styles.planDetailInsightCard,
              isLight && styles.planDetailInsightCardLight,
              { marginRight: 0 },
            ]}
          >
            <View
              style={[
                styles.planDetailInsightIcon,
                styles.planDetailInsightIconGreen,
              ]}
            >
              <Ionicons name="trending-up-outline" size={26} color="#FFFFFF" />
            </View>
            <Text
              style={[
                styles.planDetailInsightLabel,
                isLight
                  ? styles.planDetailInsightLabelLight
                  : styles.planDetailInsightLabelDark,
              ]}
            >
              Expected result
            </Text>
            <Text
              style={[
                styles.planDetailInsightText,
                isLight
                  ? styles.planDetailInsightTextLight
                  : styles.planDetailInsightTextDark,
              ]}
              numberOfLines={3}
            >
              {resultSummary}
            </Text>
            <Text
              style={[
                styles.planDetailInsightSubtext,
                isLight
                  ? styles.planDetailInsightSubtextLight
                  : styles.planDetailInsightSubtextDark,
              ]}
              numberOfLines={2}
            >
              Improved running, station efficiency and confidence.
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.planDetailGuidelinesCard,
            isLight && styles.planDetailGuidelinesCardLight,
          ]}
        >
          <Text
            style={[
              styles.planDetailGuidelinesTitle,
              isLight
                ? styles.planDetailGuidelinesTitleLight
                : styles.planDetailGuidelinesTitleDark,
            ]}
          >
            PLAN GUIDELINES
          </Text>
          {[
            {
              label: "Level",
              value: levelLabel,
              icon: "flash",
              tone: styles.planDetailGuidelineIconBlue,
            },
            {
              label: "Sessions",
              value: `${completedSessions} / ${totalSessions || 0} Completed`,
              icon: "checkmark",
              tone: styles.planDetailGuidelineIconGreen,
            },
            {
              label: "Schedule",
              value: `${currentSchedule} days per week`,
              icon: "calendar-clear",
              tone: styles.planDetailGuidelineIconPurple,
            },
          ].map((item) => (
            <View
              key={item.label}
              style={[
                styles.planDetailGuidelineRowItem,
                isLight && styles.planDetailGuidelineRowItemLight,
              ]}
            >
              <View style={[styles.planDetailGuidelineIcon, item.tone]}>
                <Ionicons name={item.icon as any} size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    styles.planDetailGuidelineLabel,
                    isLight
                      ? styles.planDetailGuidelineLabelLight
                      : styles.planDetailGuidelineLabelDark,
                  ]}
                >
                  {item.label}
                </Text>
                <Text
                  style={[
                    styles.planDetailGuidelineValue,
                    isLight
                      ? styles.planDetailGuidelineValueLight
                      : styles.planDetailGuidelineValueDark,
                  ]}
                  numberOfLines={2}
                >
                  {item.value}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={isLight ? "#64748B" : DARK_TEXT_MUTED}
              />
            </View>
          ))}
          <View
            style={[
              styles.planDetailGuidelineNoteBox,
              isLight && styles.planDetailGuidelineNoteBoxLight,
            ]}
          >
            <Ionicons
              name="sparkles"
              size={18}
              color={isLight ? "#2B7CD3" : "#7DD3FC"}
              style={{ marginTop: 2, marginRight: 12 }}
            />
            <Text
              style={[
                styles.planDetailGuidelinesBody,
                isLight
                  ? styles.planDetailGuidelinesBodyLight
                  : styles.planDetailGuidelinesBodyDark,
              ]}
            >
              {guidelineNote}
            </Text>
          </View>
        </View>

        <View style={styles.planDetailContainer}>
          <View
            style={[
              styles.planCurrentScheduleCard,
              isLight && styles.planCurrentScheduleCardLight,
            ]}
          >
            <View style={styles.planCurrentScheduleHeader}>
              <View
                style={[
                  styles.planCurrentScheduleIcon,
                  isLight && styles.planCurrentScheduleIconLight,
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={19}
                  color={isLight ? "#0F172A" : "#E5E7EB"}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    styles.planCurrentScheduleEyebrow,
                    isLight
                      ? styles.planCurrentScheduleEyebrowLight
                      : styles.planCurrentScheduleEyebrowDark,
                  ]}
                >
                  Current rhythm
                </Text>
                <Text
                  style={[
                    styles.planCurrentScheduleTitle,
                    isLight
                      ? styles.planCurrentScheduleTitleLight
                      : styles.planCurrentScheduleTitleDark,
                  ]}
                >
                  {currentSchedule} days/week
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.88}
                style={[
                  styles.planCurrentScheduleButton,
                  isLight && styles.planCurrentScheduleButtonLight,
                ]}
                onPress={toggleScheduleOptions}
              >
                <Ionicons
                  name={showScheduleOptions ? "chevron-up" : "options-outline"}
                  size={16}
                  color={isLight ? "#0F172A" : "#E5E7EB"}
                />
                <Text
                  style={[
                    styles.planCurrentScheduleButtonText,
                    isLight
                      ? styles.planCurrentScheduleButtonTextLight
                      : styles.planCurrentScheduleButtonTextDark,
                  ]}
                >
                  {showScheduleOptions ? "Done" : "Change"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.planCurrentScheduleDescription,
                isLight
                  ? styles.planCurrentScheduleDescriptionLight
                  : styles.planCurrentScheduleDescriptionDark,
              ]}
              numberOfLines={2}
            >
              {currentScheduleLabel}
            </Text>
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

          {showScheduleOptions && (
            <Animated.View style={scheduleRevealStyle}>
              <View style={styles.planScheduleOptionsHeader}>
                <Text
                  style={[
                    styles.planScheduleOptionsTitle,
                    isLight
                      ? styles.planScheduleOptionsTitleLight
                      : styles.planScheduleOptionsTitleDark,
                  ]}
                >
                  Other weekly options
                </Text>
                <Text
                  style={[
                    styles.planScheduleOptionsHint,
                    isLight
                      ? styles.planScheduleOptionsHintLight
                      : styles.planScheduleOptionsHintDark,
                  ]}
                >
                  Choose only if recovery supports it.
                </Text>
              </View>
              {[3, 4, 5, 6]
                .filter((days) => days !== currentSchedule)
                .map((days) => {
                  const version = plan.versions?.find(
                    (item) => item.sessionsPerWeek === days,
                  );
                  const isDefault = days === (plan.defaultSessionsPerWeek ?? 4);
                  const isPremium = version?.isPremium ?? !isDefault;
                  const statusLabel = isDefault
                    ? "Recommended"
                    : isPremium
                      ? "Premium"
                      : "Included";
                  return (
                    <TouchableOpacity
                      key={days}
                      activeOpacity={0.9}
                      style={[
                        styles.planScheduleOption,
                        isLight && styles.planScheduleOptionLight,
                      ]}
                      onPress={() => void startPlan(days, isPremium)}
                    >
                      <View
                        style={[
                          styles.planScheduleOptionIcon,
                          isLight && styles.planScheduleOptionIconLight,
                        ]}
                      >
                        <Text
                          style={[
                            styles.planScheduleOptionIconText,
                            isLight
                              ? styles.planScheduleOptionIconTextLight
                              : styles.planScheduleOptionIconTextDark,
                          ]}
                        >
                          {days}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={[
                            styles.planScheduleOptionTitle,
                            isLight
                              ? styles.planScheduleOptionTitleLight
                              : styles.planScheduleOptionTitleDark,
                          ]}
                        >
                          {days} days/week
                        </Text>
                        <Text
                          style={[
                            styles.planScheduleOptionDescription,
                            isLight
                              ? styles.planScheduleOptionDescriptionLight
                              : styles.planScheduleOptionDescriptionDark,
                          ]}
                          numberOfLines={2}
                        >
                          {version?.weeklyStructure?.join(" · ") ||
                            "Planned expansion"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.planScheduleBadge,
                          isLight && styles.planScheduleBadgeLight,
                          isPremium && styles.planScheduleBadgePremium,
                        ]}
                      >
                        <Text
                          style={[
                            styles.planScheduleBadgeText,
                            isLight
                              ? styles.planScheduleBadgeTextLight
                              : styles.planScheduleBadgeTextDark,
                          ]}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </Animated.View>
          )}
        </View>

        <View style={styles.planDetailContainer}>
          <View
            style={[
              styles.planWeekTabs,
              isLight && styles.planWeekTabsLight,
            ]}
          >
            {plan.weeks.map((week) => {
              const isSelected = selectedWeek?.id === week.id;
              return (
                <TouchableOpacity
                  key={week.id}
                  activeOpacity={0.88}
                  onPress={() => setSelectedWeekNumber(week.number)}
                  style={[
                    styles.planWeekTab,
                    isLight && styles.planWeekTabLight,
                    isSelected && styles.planWeekTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.planWeekTabText,
                      isLight
                        ? styles.planWeekTabTextLight
                        : styles.planWeekTabTextDark,
                      isSelected && styles.planWeekTabTextActive,
                    ]}
                  >
                    Week {week.number}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!!selectedWeek && (
            <>
              <Text
                style={[
                  styles.planWeekTimelineMeta,
                  isLight
                    ? styles.planWeekTimelineMetaLight
                    : styles.planWeekTimelineMetaDark,
                ]}
              >
                {selectedWeek.number} OF {plan.weeks.length} WEEKS
              </Text>
              <View
                style={[
                  styles.planWeekTimelineCard,
                  isLight && styles.planWeekTimelineCardLight,
                ]}
              >
                <View style={styles.planWeekTimelineRail} />
                {selectedWeek.days.map((day, index) => {
                  const tag = getTimelineTag(day);
                  const bars = getTimelineIntensity(day);
                  const isLast = index === selectedWeek.days.length - 1;
                  return (
                    <TouchableOpacity
                      key={day.id}
                      activeOpacity={0.88}
                      style={[
                        styles.planWeekTimelineItem,
                        isLast && styles.planWeekTimelineItemLast,
                      ]}
                      onPress={() =>
                        selectedWorkoutWeek &&
                        setActiveViewWorkoutWeek(selectedWorkoutWeek)
                      }
                    >
                      <View style={styles.planWeekTimelineNumber}>
                        <Text style={styles.planWeekTimelineNumberText}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={styles.planWeekTimelineContent}>
                        <Text
                          style={[
                            styles.planWeekTimelineDayMeta,
                            isLight
                              ? styles.planWeekTimelineDayMetaLight
                              : styles.planWeekTimelineDayMetaDark,
                          ]}
                        >
                          {getTrainingDayLabel(index + 1, currentSchedule)} · Day{" "}
                          {day.day}
                        </Text>
                        <Text
                          style={[
                            styles.planWeekTimelineTitle,
                            isLight
                              ? styles.planWeekTimelineTitleLight
                              : styles.planWeekTimelineTitleDark,
                          ]}
                          numberOfLines={2}
                        >
                          {day.title}
                        </Text>
                        <View style={styles.planWeekTimelineDetailRow}>
                          <View
                            style={[
                              styles.planWeekTimelineTag,
                              tag.tone === "green" &&
                                styles.planWeekTimelineTagGreen,
                              tag.tone === "amber" &&
                                styles.planWeekTimelineTagAmber,
                              tag.tone === "purple" &&
                                styles.planWeekTimelineTagPurple,
                              tag.tone === "orange" &&
                                styles.planWeekTimelineTagOrange,
                            ]}
                          >
                            <Ionicons
                              name={tag.icon as any}
                              size={12}
                              color={
                                tag.tone === "amber"
                                  ? "#B7791F"
                                  : tag.tone === "purple"
                                    ? "#7C3AED"
                                    : tag.tone === "orange"
                                      ? "#EA580C"
                                      : "#16A34A"
                              }
                            />
                            <Text
                              style={[
                                styles.planWeekTimelineTagText,
                                tag.tone === "amber" &&
                                  styles.planWeekTimelineTagTextAmber,
                                tag.tone === "purple" &&
                                  styles.planWeekTimelineTagTextPurple,
                                tag.tone === "orange" &&
                                  styles.planWeekTimelineTagTextOrange,
                              ]}
                            >
                              {tag.label}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.planWeekTimelineFooter}>
                          <View style={styles.planWeekTimelineDuration}>
                            <Ionicons
                              name="time-outline"
                              size={15}
                              color={isLight ? "#64748B" : DARK_TEXT_MUTED}
                            />
                            <Text
                              style={[
                                styles.planWeekTimelineDurationText,
                                isLight
                                  ? styles.planWeekTimelineDurationTextLight
                                  : styles.planWeekTimelineDurationTextDark,
                              ]}
                            >
                              {day.duration}
                            </Text>
                          </View>
                          <View style={styles.planWeekIntensityBars}>
                            {Array.from({ length: 5 }).map((_, barIndex) => (
                              <View
                                key={barIndex}
                                style={[
                                  styles.planWeekIntensityBar,
                                  barIndex < bars &&
                                    styles.planWeekIntensityBarActive,
                                  { height: 7 + barIndex * 3 },
                                ]}
                              />
                            ))}
                          </View>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.planWeekTimelineCheck,
                          isLight && styles.planWeekTimelineCheckLight,
                        ]}
                      >
                        <Ionicons name="checkmark" size={18} color="#2B7CD3" />
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.planWeekTimelineButton,
                    isLight && styles.planWeekTimelineButtonLight,
                  ]}
                  onPress={() =>
                    selectedWorkoutWeek &&
                    setActiveViewWorkoutWeek(selectedWorkoutWeek)
                  }
                >
                  <Text
                    style={[
                      styles.planWeekTimelineButtonText,
                      isLight
                        ? styles.planWeekTimelineButtonTextLight
                        : styles.planWeekTimelineButtonTextDark,
                    ]}
                  >
                    View full week
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={isLight ? "#0F172A" : DARK_TEXT_PRIMARY}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
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
