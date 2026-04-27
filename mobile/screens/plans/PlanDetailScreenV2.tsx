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
  DARK_CARD,
  LIGHT_CARD,
  DARK_TEXT_PRIMARY,
  LIGHT_TEXT_PRIMARY,
  DARK_TEXT_MUTED,
} from "../../styles/theme";
import { ThemeToggle } from "../../components/ThemeToggle";
import { usePlanDetail } from "../../hooks/usePlanDetail";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import {
  useThemeMode,
  HeaderAvatar,
  styles,
  type PlanDetailProps,
  type ViewWorkoutWeek,
  type ViewNutritionWeek,
  ViewWorkoutWeekModal,
  ViewNutritionWeekModal,
  mapPlanWeekToViewWorkoutWeek,
  mapPlanWeekToViewNutritionWeek,
} from "../../App";

const PlanDetailScreenV2: React.FC<PlanDetailProps> = ({
  route,
  navigation,
}) => {
  const { planId } = route.params;
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";

  const { profile } = useUserProfileBasic();
  const plansUserName =
    profile?.profile.display_name || profile?.username || null;

  const { plan, loading, error } = usePlanDetail(planId);
  const { reload: reloadDashboardSummary } = useDashboardSummary();

  const [activeViewWorkoutWeek, setActiveViewWorkoutWeek] =
    useState<ViewWorkoutWeek | null>(null);
  const [activeNutritionWeek, setActiveNutritionWeek] =
    useState<ViewNutritionWeek | null>(null);

  const canMarkComplete =
    !!profile?.profile.active_plan_id &&
    profile.profile.active_plan_id === plan?.id;

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
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
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
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
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
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
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

          <View style={{ marginTop: 16 }}>
            {plan.weeks.map((week) => {
              const nutritionWeek = mapPlanWeekToViewNutritionWeek(week);

              return (
                <View key={week.id} style={{ marginBottom: 24 }}>
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

                    <View style={{ flexDirection: "row" }}>
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
