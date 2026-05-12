import React, { useEffect, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  styles,
  type ViewWorkoutWeek,
  type ViewWorkoutDay,
  FancyWorkoutTypeIcon,
} from "../../App";
import ExerciseDetailSheet from "../../components/ExerciseDetailSheet";
import { loadExerciseDemoIds } from "../../utils/exerciseLookup";

export type ChallengeDetailModalProps = {
  week: ViewWorkoutWeek | null;
  isLight: boolean;
  isLocked?: boolean;
  unlockBody?: string | null;
  onClose: () => void;
};

const ChallengeDetailModal: React.FC<ChallengeDetailModalProps> = ({
  week,
  isLight,
  isLocked = false,
  unlockBody,
  onClose,
}) => {
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [unlockExpanded, setUnlockExpanded] = useState(false);
  const [activeExerciseName, setActiveExerciseName] = useState<string | null>(
    null,
  );
  const [demoExerciseIds, setDemoExerciseIds] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    let isMounted = true;
    const names =
      week?.days.flatMap((day) =>
        (day.segments ?? []).map((segment) => segment.label),
      ) ?? [];

    if (!names.length) {
      setDemoExerciseIds({});
      return;
    }

    void loadExerciseDemoIds(names).then((ids) => {
      if (isMounted) {
        setDemoExerciseIds(ids);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [week?.id, week?.days]);

  if (!week) return null;

  const renderDay = (day: ViewWorkoutDay, index: number) => {
    const isExpanded = expandedDayId === day.id;
    const circleStyle =
      day.type === "strength"
        ? styles.viewWorkoutIconCircleStrength
        : day.type === "rest"
          ? styles.viewWorkoutIconCircleRest
          : styles.viewWorkoutIconCircleRun;

    return (
      <View key={day.id}>
        <View style={styles.viewWorkoutDayRow}>
          <View style={styles.viewWorkoutCardWrapper}>
            <View
              style={[
                styles.viewWorkoutCard,
                isLight
                  ? styles.viewWorkoutCardLight
                  : styles.viewWorkoutCardDark,
              ]}
            >
              <View style={styles.viewWorkoutCardHeaderRow}>
                <View style={[styles.viewWorkoutIconCircleRun, circleStyle]}>
                  <FancyWorkoutTypeIcon type={day.type as any} size={22} />
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
                          <Text style={styles.viewWorkoutTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => setExpandedDayId(isExpanded ? null : day.id)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isExpanded ? "Collapse workout day" : "Expand workout day"
                  }
                >
                  <Ionicons
                    name={
                      isExpanded
                        ? "chevron-up-outline"
                        : "chevron-down-outline"
                    }
                    size={18}
                    color={isLight ? "#4B5563" : "#E5E7EB"}
                  />
                </TouchableOpacity>
              </View>

              {isExpanded && (
                <>
                  {day.segments && day.segments.length > 0 && (
                    <View style={styles.viewWorkoutSegmentsGroup}>
                      {day.segments.map((segment) => {
                        const demoExerciseId = demoExerciseIds[segment.label];
                        return (
                        <TouchableOpacity
                          key={segment.id}
                          activeOpacity={demoExerciseId ? 0.82 : 1}
                          style={styles.viewWorkoutSegmentRow}
                          disabled={!demoExerciseId}
                          onPress={() => {
                            if (demoExerciseId) {
                              setActiveExerciseName(segment.label);
                            }
                          }}
                        >
                          <View style={styles.viewWorkoutSegmentColLabel}>
                            <Text
                              style={[
                                styles.viewWorkoutSegmentLabel,
                                isLight && styles.viewWorkoutSegmentLabelLight,
                              ]}
                            >
                              {segment.label}
                            </Text>
                          </View>
                          <View style={styles.viewWorkoutSegmentColPrimary}>
                            <View style={styles.viewWorkoutExerciseTapRow}>
                              <Text
                                style={[
                                  styles.viewWorkoutSegmentPrimary,
                                  isLight &&
                                    styles.viewWorkoutSegmentPrimaryLight,
                                ]}
                              >
                                {segment.primary}
                              </Text>
                              {demoExerciseId ? (
                                <Ionicons
                                  name="play-circle-outline"
                                  size={16}
                                  color={isLight ? "#2563EB" : "#93C5FD"}
                                />
                              ) : null}
                            </View>
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
                        </TouchableOpacity>
                        );
                      })}
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
            </View>
          </View>
        </View>
        {index < week.days.length - 1 && (
          <View style={styles.viewWorkoutDayDivider} />
        )}
      </View>
    );
  };

  const unlockLines = (unlockBody || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const summary = unlockLines[0] ?? "";

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

            {isLocked && unlockLines.length > 0 ? (
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
                    onPress={() => setUnlockExpanded((prev) => !prev)}
                  >
                    <View style={styles.viewWorkoutCardHeaderRow}>
                      <View
                        style={[
                          styles.viewWorkoutIconCircleRun,
                          styles.viewWorkoutIconCircleStrength,
                        ]}
                      >
                        <Ionicons
                          name="lock-closed"
                          size={20}
                          color={isLight ? "#111827" : "#F9FAFB"}
                        />
                      </View>
                      <View style={styles.viewWorkoutHeaderTextBlock}>
                        <Text
                          style={[
                            styles.viewWorkoutHeaderTitle,
                            isLight
                              ? styles.viewWorkoutHeaderTitleLight
                              : styles.viewWorkoutHeaderTitleDark,
                          ]}
                          numberOfLines={1}
                        >
                          How to unlock
                        </Text>
                        {!!summary && (
                          <Text
                            style={[
                              styles.viewWorkoutHeaderSubtitle,
                              isLight
                                ? styles.viewWorkoutHeaderSubtitleLight
                                : styles.viewWorkoutHeaderSubtitleDark,
                            ]}
                            numberOfLines={unlockExpanded ? 3 : 1}
                          >
                            {summary}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name={
                          unlockExpanded
                            ? "chevron-up-outline"
                            : "chevron-down-outline"
                        }
                        size={18}
                        color={isLight ? "#4B5563" : "#E5E7EB"}
                      />
                    </View>
                    {unlockExpanded && (
                      <View style={{ marginTop: 8 }}>
                        {unlockLines.map((line, idx) => (
                          <Text
                            key={idx}
                            style={[
                              styles.viewWorkoutExercises,
                              isLight && styles.viewWorkoutExercisesLight,
                            ]}
                          >
                            {line}
                          </Text>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              week.days.map(renderDay)
            )}
          </ScrollView>
        </View>
      </View>
      <ExerciseDetailSheet
        visible={!!activeExerciseName}
        isLight={isLight}
        exerciseId={
          activeExerciseName ? demoExerciseIds[activeExerciseName] : null
        }
        exerciseName={activeExerciseName}
        onClose={() => setActiveExerciseName(null)}
      />
    </Modal>
  );
};

export default ChallengeDetailModal;
