import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  GLASS_ACCENT_GREEN,
  DARK_TEXT_PRIMARY,
  LIGHT_TEXT_MUTED,
  DARK_TEXT_MUTED,
} from "../../styles/theme";
import { AppHeader } from "../../components/AppHeader";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { usePlans } from "../../hooks/usePlans";
import { useThemeMode, styles } from "../../App";
import type { PlansHomeProps, PlanUserProgress } from "../../App";

type PlanCardStatus = "preview" | "enrolled" | "completed";

type PlanCardProps = {
  title: string;
  duration: string;
  level: string;
  goal: string;
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
  duration,
  level,
  goal,
  progress,
  status,
  onPress,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const metaIconColor = isLight ? LIGHT_TEXT_MUTED : DARK_TEXT_MUTED;
  const pressProgress = useRef(new Animated.Value(0)).current;
  const buttonLabel =
    status === "completed"
      ? "Completed"
      : status === "enrolled"
        ? "Current"
        : "View";

  const iconColor =
    status === "completed"
      ? "#0F172A"
      : status === "enrolled" && !isLight
        ? "#0F172A"
        : "#FFFFFF";

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
      {(status === "completed" || status === "enrolled") && (
        <View style={styles.planCardCompletedBadge}>
          <Ionicons
            name={
              status === "enrolled"
                ? "radio-button-on"
                : "checkmark-circle-outline"
            }
            size={24}
            color={metaIconColor}
          />
        </View>
      )}

      <View
        style={[
          styles.planCardAccent,
          status === "enrolled" && styles.planCardAccentEnrolled,
        ]}
      />

      <View style={styles.planCardTitleBlock}>
        <Text
          style={[
            styles.planCardTitle,
            isLight ? styles.planCardTitleLight : styles.planCardTitleDark,
          ]}
        >
          {title}
        </Text>
      </View>

      <View style={styles.planCardMetaStrip}>
        <View
          style={[
            styles.planCardMetaChip,
            isLight && styles.planCardMetaChipLight,
          ]}
        >
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
        <View
          style={[
            styles.planCardMetaChip,
            isLight && styles.planCardMetaChipLight,
          ]}
        >
          <Ionicons name="calendar-outline" size={14} color={metaIconColor} />
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
      </View>

      <Text
        style={[
          styles.planCardGoalText,
          isLight
            ? styles.planCardGoalTextLight
            : styles.planCardGoalTextDark,
        ]}
        numberOfLines={2}
      >
        {goal}
      </Text>

      {progress && (
        <View style={styles.planCardProgressBlock}>
          <View style={styles.planCardProgressHeader}>
            <Text
              style={[
                styles.planCardProgressText,
                isLight
                  ? styles.planCardProgressTextLight
                  : styles.planCardProgressTextDark,
              ]}
            >
              {progress.currentWeekNumber
                ? `Week ${progress.currentWeekNumber}`
                : "Not started"}
            </Text>
            <Text
              style={[
                styles.planCardProgressText,
                isLight
                  ? styles.planCardProgressTextLight
                  : styles.planCardProgressTextDark,
              ]}
            >
              {progress.completionPercent}% complete
            </Text>
          </View>
          <ProgressDots
            total={progress.totalSessions}
            completed={progress.completedSessions}
            isLight={isLight}
          />
        </View>
      )}

      <View
        style={[
          styles.planCardButton,
          status === "completed"
            ? styles.planCardButtonCompleted
            : status === "enrolled"
              ? isLight
                ? styles.planCardButtonEnrolledLight
                : styles.planCardButtonEnrolledDark
              : styles.planCardButtonPreview,
        ]}
      >
        <Text
          style={[
            styles.planCardButtonLabel,
            status === "completed" && styles.planCardButtonLabelCompleted,
            status === "enrolled" &&
              (isLight
                ? styles.planCardButtonLabelEnrolledLight
                : styles.planCardButtonLabelEnrolledDark),
            status === "preview" && styles.planCardButtonLabelPreview,
          ]}
        >
          {buttonLabel}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={iconColor} />
      </View>
    </AnimatedTouchableOpacity>
  );
};

const PlansScreen: React.FC<PlansHomeProps> = ({ navigation }) => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const sectionIconColor = isLight ? "#0F172A" : DARK_TEXT_PRIMARY;

  const { profile } = useUserProfileBasic();
  const plansUserName =
    profile?.profile.display_name || profile?.username || null;

  const { plans, loading: plansLoading, error: plansError } = usePlans();

  const activePlanId = profile?.profile.active_plan_id;
  const activePlan = activePlanId
    ? plans.find((p) => p.id === activePlanId)
    : null;
  const activeProgress = activePlan?.userProgress ?? null;

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
          <Text style={styles.loadingText}>Loading plans…</Text>
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
        style={[
          styles.plansTopHeader,
          isLight && styles.plansTopHeaderLight,
        ]}
      >
        <AppHeader
          isLight={isLight}
          title="Your plans"
          userName={plansUserName}
          onThemeToggle={toggle}
        />
      </View>

      {activePlan && (
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
                  name="radio-button-on"
                  size={15}
                  color={isLight ? "#64748B" : "#A7B0C3"}
                />
                <Text
                  style={[
                    styles.plansActiveKickerText,
                    isLight
                      ? styles.plansActiveKickerTextLight
                      : styles.plansActiveKickerTextDark,
                  ]}
                >
                  Current guide
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
                  {activePlan.name}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.plansActiveSubtitle,
                !isLight && styles.plansActiveSubtitleDark,
              ]}
              numberOfLines={2}
            >
              {activePlan.goal || activePlan.summary}
            </Text>

            {activeProgress ? (
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
                      ? `Week ${activeProgress.currentWeekNumber} of ${activePlan.durationWeeks}`
                      : `${activePlan.durationWeeks} weeks`}
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
            ) : (
              <View style={styles.planCardMetaStrip}>
                <View
                  style={[
                    styles.planCardMetaChip,
                    isLight && styles.planCardMetaChipLight,
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={isLight ? LIGHT_TEXT_MUTED : DARK_TEXT_MUTED}
                  />
                  <Text
                    style={[
                      styles.planCardMetaText,
                      isLight
                        ? styles.planCardMetaTextLight
                        : styles.planCardMetaTextDark,
                    ]}
                  >
                    {activePlan.durationWeeks} weeks
                  </Text>
                </View>
                <View
                  style={[
                    styles.planCardMetaChip,
                    isLight && styles.planCardMetaChipLight,
                  ]}
                >
                  <Ionicons
                    name="barbell-outline"
                    size={14}
                    color={isLight ? LIGHT_TEXT_MUTED : DARK_TEXT_MUTED}
                  />
                  <Text
                    style={[
                      styles.planCardMetaText,
                      isLight
                        ? styles.planCardMetaTextLight
                        : styles.planCardMetaTextDark,
                    ]}
                  >
                    {activePlan.sessionsPerWeek}/week
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.plansActiveButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.plansPrimaryButton,
                  isLight && styles.plansPrimaryButtonLight,
                ]}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("PlanDetail", { planId: activePlan.id })
                }
              >
                <Text style={styles.plansPrimaryButtonLabel}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.plansBodyContainer}>
        <View style={styles.planSection}>
          <View style={styles.planSectionHeader}>
            <Ionicons
              name="compass-outline"
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
              Workout guides
            </Text>
          </View>

          <View>
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                title={plan.name}
                duration={`${plan.durationWeeks}w · ${plan.sessionsPerWeek}/wk`}
                level={plan.level.charAt(0).toUpperCase() + plan.level.slice(1)}
                goal={plan.goal || plan.summary}
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
        </View>
      </View>
    </ScrollView>
  );
};

export default PlansScreen;
