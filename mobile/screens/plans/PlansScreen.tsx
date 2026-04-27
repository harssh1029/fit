import React, { useRef, useState } from "react";
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
import type { PlansHomeProps } from "../../App";

type PlanCardStatus = "preview" | "enrolled" | "completed";

type PlanCardProps = {
  title: string;
  duration: string;
  level: string;
  enrolledCount: string;
  status: PlanCardStatus;
  onPress?: () => void;
};

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

const PlanCard: React.FC<PlanCardProps> = ({
  title,
  duration,
  level,
  enrolledCount,
  status,
  onPress,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const metaIconColor = isLight ? LIGHT_TEXT_MUTED : DARK_TEXT_MUTED;
  const pressProgress = useRef(new Animated.Value(0)).current;
  const buttonLabel =
    status === "completed"
      ? "View completion details"
      : status === "enrolled"
        ? "Current plan"
        : "Preview plan";

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
      {status === "completed" && (
        <View style={styles.planCardCompletedBadge}>
          <Ionicons
            name="checkmark-circle-outline"
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
        <View style={styles.planCardDurationRow}>
          <Ionicons name="calendar-outline" size={15} color={metaIconColor} />
          <Text
            style={[
              styles.planCardDurationText,
              isLight
                ? styles.planCardDurationTextLight
                : styles.planCardDurationTextDark,
            ]}
          >
            {duration}
          </Text>
        </View>
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

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const planFilters = ["All", "Popular", "New", "Cardio", "Strength"];

  const activePlanId = profile?.profile.active_plan_id;
  const activePlan = activePlanId
    ? plans.find((p) => p.id === activePlanId)
    : null;

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
                  name="navigate-circle-outline"
                  size={15}
                  color={isLight ? "#0070cc" : "#7DD3FC"}
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
            >
              {activePlan.durationWeeks} weeks
              {" " + "•" + " "}
              {activePlan.sessionsPerWeek} sessions/week
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
                  numberOfLines={1}
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
                style={[
                  styles.plansPrimaryButton,
                  isLight && styles.plansPrimaryButtonLight,
                ]}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate("PlanDetail", { planId: activePlan.id })
                }
              >
                <Text style={styles.plansPrimaryButtonLabel}>View plan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.plansSecondaryButton,
                  isLight
                    ? styles.plansSecondaryButtonLight
                    : styles.plansSecondaryButtonDark,
                ]}
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
                isLight
                  ? styles.planFilterPillLight
                  : styles.planFilterPillDark,
                isActive && styles.planFilterPillActive,
              ]}
              activeOpacity={0.9}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.planFilterLabel,
                  isLight
                    ? styles.planFilterLabelLight
                    : styles.planFilterLabelDark,
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
                duration={`${plan.durationWeeks} weeks · ${plan.sessionsPerWeek} days/wk`}
                level={plan.level.charAt(0).toUpperCase() + plan.level.slice(1)}
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

export default PlansScreen;
