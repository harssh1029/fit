import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { ThemeToggle } from "../../components/ThemeToggle";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { usePlans } from "../../hooks/usePlans";
import { useThemeMode, HeaderAvatar, styles } from "../../App";
import type { PlansHomeProps } from "../../App";

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

const PlansScreen: React.FC<PlansHomeProps> = ({ navigation }) => {
  const { mode, toggle } = useThemeMode();
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

  const activePlanId = profile?.profile.active_plan_id;
  const activePlan = activePlanId
    ? plans.find((p) => p.id === activePlanId)
    : null;

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
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
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
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
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
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
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
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
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

export default PlansScreen;
