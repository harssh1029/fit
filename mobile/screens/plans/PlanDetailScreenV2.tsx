import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  useThemeMode,
  useAuth,
  styles,
  type PlanDetailProps,
  type ViewWorkoutWeek,
  type ViewNutritionWeek,
  ViewWorkoutWeekModal,
  ViewNutritionWeekModal,
  mapPlanWeekToViewWorkoutWeek,
  mapPlanWeekToViewNutritionWeek,
} from "../../App";

const formatPlanDate = (value: string | null | undefined) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  const isLight = mode === "light";
  const { accessToken, refreshAccessToken, signOut } = useAuth();

  const { profile, reload: reloadProfile } = useUserProfileBasic();
  const plansUserName =
    profile?.profile.display_name || profile?.username || null;

  const { plan, loading, error } = usePlanDetail(planId);
  const { reload: reloadDashboardSummary } = useDashboardSummary();

  const [activeViewWorkoutWeek, setActiveViewWorkoutWeek] =
    useState<ViewWorkoutWeek | null>(null);
  const [activeNutritionWeek, setActiveNutritionWeek] =
    useState<ViewNutritionWeek | null>(null);
  const [isOptingOut, setIsOptingOut] = useState(false);

  const canMarkComplete =
    !!profile?.profile.active_plan_id &&
    profile.profile.active_plan_id === plan?.id;

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

  const backToPlansLink = (
    <TouchableOpacity onPress={() => navigation.goBack()}>
      <Text style={[styles.linkText, isLight && styles.linkTextLight]}>
        {"\u2039 Back to plans"}
      </Text>
    </TouchableOpacity>
  );

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
          <Text style={styles.loadingText}>Loading plan…</Text>
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
  const progress = plan.userProgress ?? null;
  const completedSessions = progress?.completedSessions ?? 0;
  const totalSessions =
    progress?.totalSessions ??
    plan.weeks.reduce((total, week) => total + week.days.length, 0);
  const completionPercent = progress?.completionPercent ?? 0;
  const currentWeekNumber = progress?.currentWeekNumber;

  const openPlanOptions = () => {
    if (canMarkComplete) {
      Alert.alert("Plan options", plan.name, [
        { text: "Cancel", style: "cancel" },
        { text: "Opt out", style: "destructive", onPress: handleOptOut },
      ]);
      return;
    }
    Alert.alert("Plan options", "Enroll by completing your first workout day.");
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

          <Text
            style={[
              styles.planDetailSummary,
              isLight
                ? styles.planDetailSummaryLight
                : styles.planDetailSummaryDark,
            ]}
            numberOfLines={3}
          >
            {plan.summary || plan.goal}
          </Text>

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

        <View style={styles.planDetailMetricsGrid}>
          <View
            style={[
              styles.planDetailMetricCard,
              isLight && styles.planDetailMetricCardLight,
            ]}
          >
            <Text
              style={[
                styles.planDetailMetricLabel,
                isLight
                  ? styles.planDetailMetricLabelLight
                  : styles.planDetailMetricLabelDark,
              ]}
            >
              Focus
            </Text>
            <Text
              style={[
                styles.planDetailMetricValue,
                isLight
                  ? styles.planDetailMetricValueLight
                  : styles.planDetailMetricValueDark,
              ]}
              numberOfLines={2}
            >
              {plan.goal}
            </Text>
          </View>
          <View
            style={[
              styles.planDetailMetricCard,
              isLight && styles.planDetailMetricCardLight,
              { marginRight: 0 },
            ]}
          >
            <Text
              style={[
                styles.planDetailMetricLabel,
                isLight
                  ? styles.planDetailMetricLabelLight
                  : styles.planDetailMetricLabelDark,
              ]}
            >
              Sessions/week
            </Text>
            <Text
              style={[
                styles.planDetailMetricValue,
                isLight
                  ? styles.planDetailMetricValueLight
                  : styles.planDetailMetricValueDark,
              ]}
            >
              {plan.sessionsPerWeek}
            </Text>
          </View>

          <View
            style={[
              styles.planDetailMetricCard,
              isLight && styles.planDetailMetricCardLight,
            ]}
          >
            <Text
              style={[
                styles.planDetailMetricLabel,
                isLight
                  ? styles.planDetailMetricLabelLight
                  : styles.planDetailMetricLabelDark,
              ]}
            >
              Level
            </Text>
            <Text
              style={[
                styles.planDetailMetricValue,
                isLight
                  ? styles.planDetailMetricValueLight
                  : styles.planDetailMetricValueDark,
              ]}
            >
              {levelLabel}
            </Text>
          </View>
          <View
            style={[
              styles.planDetailMetricCard,
              isLight && styles.planDetailMetricCardLight,
              { marginRight: 0 },
            ]}
          >
            <Text
              style={[
                styles.planDetailMetricLabel,
                isLight
                  ? styles.planDetailMetricLabelLight
                  : styles.planDetailMetricLabelDark,
              ]}
            >
              Completed
            </Text>
            <Text
              style={[
                styles.planDetailMetricValue,
                isLight
                  ? styles.planDetailMetricValueLight
                  : styles.planDetailMetricValueDark,
              ]}
            >
              {completedSessions}/{totalSessions || "0"}
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
            Plan guidelines
          </Text>
          <View style={styles.planDetailGuidelinesRow}>
            <View style={styles.planDetailGuidelineItem}>
              <Text
                style={[
                  styles.planDetailGuidelineValue,
                  isLight
                    ? styles.planDetailGuidelineValueLight
                    : styles.planDetailGuidelineValueDark,
                ]}
              >
                {levelLabel}
              </Text>
              <Text
                style={[
                  styles.planDetailGuidelineLabel,
                  isLight
                    ? styles.planDetailGuidelineLabelLight
                    : styles.planDetailGuidelineLabelDark,
                ]}
              >
                Intensity
              </Text>
            </View>
            <View style={styles.planDetailGuidelineItem}>
              <Text
                style={[
                  styles.planDetailGuidelineValue,
                  isLight
                    ? styles.planDetailGuidelineValueLight
                    : styles.planDetailGuidelineValueDark,
                ]}
              >
                {plan.durationWeeks}w
              </Text>
              <Text
                style={[
                  styles.planDetailGuidelineLabel,
                  isLight
                    ? styles.planDetailGuidelineLabelLight
                    : styles.planDetailGuidelineLabelDark,
                ]}
              >
                Duration
              </Text>
            </View>
            <View style={styles.planDetailGuidelineItem}>
              <Text
                style={[
                  styles.planDetailGuidelineValue,
                  isLight
                    ? styles.planDetailGuidelineValueLight
                    : styles.planDetailGuidelineValueDark,
                ]}
              >
                {plan.sessionsPerWeek}
              </Text>
              <Text
                style={[
                  styles.planDetailGuidelineLabel,
                  isLight
                    ? styles.planDetailGuidelineLabelLight
                    : styles.planDetailGuidelineLabelDark,
                ]}
              >
                Sessions
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.planDetailGuidelinesBody,
              isLight
                ? styles.planDetailGuidelinesBodyLight
                : styles.planDetailGuidelinesBodyDark,
            ]}
            numberOfLines={3}
          >
            {plan.result || plan.audience}
          </Text>
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
            Weekly plan
          </Text>

          <View style={styles.planDetailWeekList}>
            {plan.weeks.map((week) => {
              const nutritionWeek = mapPlanWeekToViewNutritionWeek(week);

              return (
                <View key={week.id} style={styles.planDetailWeekCardOuter}>
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
                        numberOfLines={1}
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

                    <View style={styles.planDetailWeekActions}>
                      <TouchableOpacity
                        style={[
                          styles.planWeekViewFullButton,
                          isLight && styles.planWeekViewFullButtonLight,
                          { marginRight: nutritionWeek ? 8 : 0 },
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
