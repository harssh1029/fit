import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  useAuth,
  styles,
  type ViewWorkoutWeek,
  type ViewWorkoutDay,
  FancyWorkoutTypeIcon,
  GLASS_ACCENT_GREEN,
  API_BASE_URL,
} from "../../../App";
import { useWorkoutHistory } from "../../../hooks/useWorkoutHistory";

export type ViewWorkoutWeekModalProps = {
  week: ViewWorkoutWeek | null;
  isLight: boolean;
  // Optional plan ID so we can send a fully-qualified identity to
  // /plans/complete-day/ and ensure workout history is logged.
  planId?: number | string | null;
  canMarkComplete?: boolean;
  onClose: () => void;
  onDayMarkedComplete?: () => void;
};

export const ViewWorkoutWeekModal: React.FC<ViewWorkoutWeekModalProps> = ({
  week,
  isLight,
  planId,
  canMarkComplete = false,
  onClose,
  onDayMarkedComplete,
}) => {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const { items: workoutHistoryItems, reload: reloadWorkoutHistoryModal } =
    useWorkoutHistory();
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [completingDayId, setCompletingDayId] = useState<string | null>(null);
  const [completedDayIds, setCompletedDayIds] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!week || !workoutHistoryItems.length) return;

    const seeded: Record<string, boolean> = {};
    for (const day of week.days) {
      const weekNumber = day.planWeekNumber ?? null;
      const dayIndex = day.planDayIndex ?? null;
      if (!weekNumber || !dayIndex) continue;

      const matchingEntry = workoutHistoryItems.find(
        (entry) =>
          entry.status === "completed" &&
          entry.week_number === weekNumber &&
          entry.scheduled_day_index === dayIndex,
      );

      if (matchingEntry) {
        seeded[day.id] = true;
      }
    }

    if (Object.keys(seeded).length > 0) {
      setCompletedDayIds((prev) => ({ ...prev, ...seeded }));
    }
  }, [week, workoutHistoryItems]);

  const handleMarkComplete = async (day: ViewWorkoutDay) => {
    if (!canMarkComplete || !accessToken) return;

    const weekNumber = day.planWeekNumber;
    const dayIndex = day.planDayIndex;

    // Prefer the canonical PlanDay primary key when available. This is
    // always present for real plan-backed weeks and is the most direct way
    // to identify the day for /plans/complete-day/.
    const planDayIdNumeric = Number(day.id);
    const hasValidPlanDayId = !Number.isNaN(planDayIdNumeric);

    if (!hasValidPlanDayId && (!weekNumber || !dayIndex)) {
      console.error(
        "Cannot complete plan day: missing both plan_day_id and week/day index",
        {
          dayId: day.id,
          planWeekNumber: weekNumber,
          planDayIndex: dayIndex,
        },
      );
      return;
    }

    setCompletingDayId(day.id);

    try {
      const payload: {
        plan_day_id?: number;
        plan_week_number?: number;
        plan_day_index?: number;
        plan_id?: number;
      } = {};

      if (hasValidPlanDayId) {
        payload.plan_day_id = planDayIdNumeric;
      }

      if (weekNumber && dayIndex) {
        payload.plan_week_number = weekNumber;
        payload.plan_day_index = dayIndex;
      }

      if (planId != null) {
        const numericPlanId = Number(planId);
        if (!Number.isNaN(numericPlanId)) {
          payload.plan_id = numericPlanId;
        }
      }

      console.log("POST /plans/complete-day/ payload", payload);

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
          setCompletingDayId(null);
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
        let errorBody: unknown = null;
        try {
          errorBody = await response.json();
        } catch {
          // ignore JSON parse errors – we just want *some* context in dev
        }
        console.error(
          "Failed to complete plan day:",
          response.status,
          JSON.stringify(errorBody),
        );
        setCompletingDayId(null);
        return;
      }

      setCompletedDayIds((prev) => ({
        ...prev,
        [day.id]: true,
      }));

      reloadWorkoutHistoryModal();
      onDayMarkedComplete?.();
    } catch (err) {
      console.error("Error calling /plans/complete-day/:", err);
    } finally {
      setCompletingDayId(null);
    }
  };

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
                        <View style={styles.viewWorkoutCardHeaderRow}>
                          <View
                            style={[
                              styles.viewWorkoutIconCircleRun,
                              circleStyle,
                            ]}
                          >
                            <FancyWorkoutTypeIcon
                              type={day.type as any}
                              size={22}
                            />
                          </View>
                          <View style={styles.viewWorkoutHeaderTextBlock}>
                            <Text
                              style={[
                                styles.viewWorkoutDayName,
                                isLight
                                  ? styles.viewWorkoutDayNameLight
                                  : styles.viewWorkoutDayNameDark,
                              ]}
                            >
                              {day.weekdayLabel} <Text>{day.dateLabel}</Text>
                            </Text>
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
                            {day.headerTags && day.headerTags.length > 0 && (
                              <View style={styles.viewWorkoutTags}>
                                {day.headerTags.map((tag, i) => (
                                  <View
                                    key={i}
                                    style={[
                                      styles.viewWorkoutTag,
                                      isLight && styles.viewWorkoutTagLight,
                                    ]}
                                  >
                                    <Text style={styles.viewWorkoutTagText}>
                                      {tag}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={20}
                            color={isLight ? "#6B7280" : "#9CA3AF"}
                          />
                        </View>

                        {isExpanded && (
                          <>
                            {day.segments && day.segments.length > 0 && (
                              <View style={styles.viewWorkoutSegmentsGroup}>
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

                      {canMarkComplete && (
                        <TouchableOpacity
                          style={styles.viewWorkoutMarkButton}
                          activeOpacity={0.8}
                          onPress={() => handleMarkComplete(day)}
                          disabled={isCompleted || isCompleting}
                        >
                          {isCompleting ? (
                            <ActivityIndicator
                              size="small"
                              color={GLASS_ACCENT_GREEN}
                            />
                          ) : (
                            <Ionicons
                              name={
                                isCompleted
                                  ? "checkmark-circle"
                                  : "checkmark-circle-outline"
                              }
                              size={24}
                              color={
                                isCompleted ? GLASS_ACCENT_GREEN : "#6B7280"
                              }
                            />
                          )}
                        </TouchableOpacity>
                      )}
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
