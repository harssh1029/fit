import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  GLASS_ACCENT_GREEN,
  GLASS_BORDER_DARK,
  DARK_CARD,
  DARK_TEXT_PRIMARY,
  DARK_TEXT_MUTED,
  LIGHT_TEXT_PRIMARY,
  LIGHT_TEXT_MUTED,
  PS_BLUE,
} from "../../styles/theme";
import { AppHeader } from "../../components/AppHeader";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { useChallenges } from "../../hooks/useChallenges";
import type { ApiChallenge, ChallengeStatus } from "../../types/challenges";
import {
  useThemeMode,
  styles,
  type ViewWorkoutWeek,
  type ViewWorkoutDay,
} from "../../App";
import ChallengeDetailModal from "./ChallengeDetailModal";

type ChallengeDifficulty = "Beginner" | "Intermediate" | "Advanced";

type Challenge = ApiChallenge;

const CHALLENGE_GLASS_CARD_DARK = {
  shadowColor: "#000000",
  shadowOpacity: 0.2,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 12 },
  elevation: 4,
} as any;

const CHALLENGE_GLASS_CARD_LIGHT = {
  shadowColor: "#64748B",
  shadowOpacity: 0.11,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 9 },
  elevation: 4,
} as any;

const mapChallengeToViewWorkoutWeek = (
  challenge: Challenge,
): ViewWorkoutWeek => {
  const { detail, card } = challenge;

  const labelParts: string[] = [card.name];
  if (detail.duration_days) {
    labelParts.push(`${detail.duration_days} days`);
  }
  if (detail.format) {
    labelParts.push(detail.format);
  }
  const label = labelParts.join(" \u2022 ");

  return {
    id: challenge.id,
    label,
    weekNumber: null,
    days: detail.days.map((day) => {
      const type: ViewWorkoutDay["type"] =
        day.day_type === "rest" ? "rest" : "strength";

      const subtitleParts: string[] = [];
      if (day.exercises && day.exercises.length) {
        const exSummary = day.exercises
          .map((ex) => `${ex.name} ${ex.reps_or_time}`)
          .join(" \u00b7 ");
        subtitleParts.push(exSummary);
      }
      if (day.track_metric) subtitleParts.push(day.track_metric);
      if (!subtitleParts.length && day.day_note) {
        subtitleParts.push(day.day_note);
      }

      const segments = (day.exercises || []).map((ex, idx) => ({
        id: `${challenge.id}-d${day.day_number}-ex${idx}`,
        label: ex.name,
        primary: ex.reps_or_time,
      }));

      const noteLines: string[] = [];
      if (day.day_note) noteLines.push(day.day_note);
      if (day.goal) noteLines.push(day.goal);
      const notes = noteLines.length ? noteLines.join("\n\n") : undefined;

      return {
        id: `${challenge.id}-day-${day.day_number}`,
        weekdayLabel: `Day ${day.day_number}`,
        dateLabel:
          day.day_type === "rest"
            ? "Rest"
            : day.day_type === "test"
              ? "Test"
              : "Workout",
        type,
        title: day.day_title,
        subtitle: subtitleParts.join(" \u2022 "),
        planWeekNumber: null,
        planDayIndex: null,
        headerTags: undefined,
        segments,
        notes,
        exercises: undefined,
      };
    }),
  };
};

const buildChallengeBodyText = (challenge: Challenge): string => {
  const { detail } = challenge;
  const lines: string[] = [];

  // Prefer a descriptive note from the first day.
  const firstDay = detail.days && detail.days.length ? detail.days[0] : null;
  if (firstDay?.day_note) {
    lines.push(firstDay.day_note);
  }

  if (detail.complete_condition) {
    lines.push(`Complete when: ${detail.complete_condition}`);
  }
  if (detail.badge_name) {
    lines.push(`Badge: ${detail.badge_name}`);
  }

  if (!lines.length && detail.quote) {
    lines.push(detail.quote);
  }
  return lines.join("\n\n");
};

const buildChallengeUnlockBodyText = (challenge: Challenge): string | null => {
  const progress = challenge.unlockProgress;
  if (!progress && !challenge.unlock) return null;

  const lines: string[] = [];

  if (progress) {
    progress.conditions.forEach((condition) => {
      const rankLabel = titleCase(condition.levelRequired);
      const groupStatus = condition.groups
        .map(
          (group) =>
            `${group.label}: ${group.sessions}/${condition.minWorkouts}, ${group.rank}`,
        )
        .join(" or ");
      const state = condition.isMet ? "Done" : "Need";
      lines.push(
        `${state}: ${condition.bodyPart || "Body"} needs ${condition.minWorkouts}+ workouts and ${rankLabel}+ rank (${groupStatus})`,
      );
    });

    if (progress.challengesCompletedRequired > 0) {
      const remaining = Math.max(
        0,
        progress.challengesCompletedRequired - progress.challengesCompletedCount,
      );
      lines.push(
        `${remaining === 0 ? "Done" : "Need"}: ${progress.challengesCompletedCount}/${progress.challengesCompletedRequired} challenges completed`,
      );
    }

    if (progress.unlockMessage) lines.push(progress.unlockMessage);
  } else if (challenge.unlock) {
    challenge.unlock.conditions.forEach((condition) => {
      lines.push(
        `Need: ${condition.body_part} requires ${condition.min_workouts}+ workouts and ${titleCase(condition.level_required)}+ rank`,
      );
    });
    if (challenge.unlock.challenges_completed_required > 0) {
      lines.push(
        `Need: Complete ${challenge.unlock.challenges_completed_required} challenge` +
          (challenge.unlock.challenges_completed_required > 1 ? "s" : ""),
      );
    }
    if (challenge.unlock.unlock_message) lines.push(challenge.unlock.unlock_message);
  }

  if (!lines.length) return null;
  return lines.join("\n");
};

const titleCase = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const getLockedSummary = (challenge: Challenge): string | null => {
  const progress = challenge.unlockProgress;
  if (!progress) return challenge.unlock?.unlock_message || null;

  if (progress.challengesCompletedRequired > progress.challengesCompletedCount) {
    return `${progress.challengesCompletedCount}/${progress.challengesCompletedRequired} challenges completed`;
  }

  const missing = progress.conditions.find((condition) => !condition.isMet);
  if (!missing) return progress.unlockMessage || null;
  const bestGroup = [...missing.groups].sort(
    (a, b) => b.rankIndex - a.rankIndex || b.sessions - a.sessions,
  )[0];
  if (!bestGroup) return progress.unlockMessage || null;
  return `${bestGroup.label}: ${bestGroup.sessions}/${missing.minWorkouts} workouts, ${bestGroup.rank}`;
};

const ChallengesScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const { profile } = useUserProfileBasic();
  const { challenges, loading, error, setChallengeCompleted } = useChallenges();
  const challengesUserName =
    profile?.profile.display_name || profile?.username || null;

  const [selected, setSelected] = useState<Challenge | null>(null);
  const [activeDifficulty, setActiveDifficulty] =
    useState<ChallengeDifficulty>("Beginner");

  const openChallenge = (challenge: Challenge) => {
    setSelected(challenge);
  };

  const closeModal = () => {
    setSelected(null);
  };

  const renderSection = (difficulty: ChallengeDifficulty) => {
    const levelKey =
      difficulty === "Beginner"
        ? "beginner"
        : difficulty === "Intermediate"
          ? "intermediate"
          : "advanced";
    const items = challenges.filter((c) => c.card.level === levelKey);

    const iconCircleStyleForDifficulty = () => {
      switch (difficulty) {
        case "Beginner":
          return styles.viewWorkoutIconCircleRest;
        case "Intermediate":
          return styles.viewWorkoutIconCircleRun;
        case "Advanced":
        default:
          return styles.viewWorkoutIconCircleStrength;
      }
    };

    const iconNameForDifficulty: React.ComponentProps<typeof Ionicons>["name"] =
      difficulty === "Beginner"
        ? "walk-outline"
        : difficulty === "Intermediate"
          ? "barbell-outline"
          : "flame-outline";

    const defaultTagForDifficulty: Record<ChallengeDifficulty, string> = {
      Beginner: "Beginner",
      Intermediate: "Intermediate",
      Advanced: "Advanced",
    };

    return (
      <View
        key={difficulty}
        style={[styles.planSection, challengeStyles.difficultySection]}
      >
        <View style={challengeStyles.cardsGrid}>
          {items.map((challenge, index) => {
            const status = (challenge.card.status ||
              "locked") as ChallengeStatus;
            const isDone = status === "done";
            const isLocked = status === "locked";
            const lockedSummary = isLocked ? getLockedSummary(challenge) : null;
            const iconCircleBase = iconCircleStyleForDifficulty();
            const tagLabel =
              challenge.card.body_map_tags &&
              challenge.card.body_map_tags.length > 0
                ? challenge.card.body_map_tags.join(" \\u00b7 ")
                : defaultTagForDifficulty[difficulty];

            let tagColorStyle = challengeStyles.tagBeginner;
            if (difficulty === "Intermediate") {
              tagColorStyle = challengeStyles.tagIntermediate;
            } else if (difficulty === "Advanced") {
              tagColorStyle = challengeStyles.tagAdvanced;
            }

            return (
              <View key={challenge.id} style={challengeStyles.cardGridItem}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[
                    styles.viewWorkoutCard,
                    isLight
                      ? styles.viewWorkoutCardLight
                      : styles.viewWorkoutCardDark,
                    challengeStyles.challengeCardBase,
                    isLight && challengeStyles.challengeCardBaseLight,
                    isLocked &&
                      (isLight
                        ? challengeStyles.challengeCardLockedLight
                        : challengeStyles.challengeCardLockedDark),
                  ]}
                  onPress={() => openChallenge(challenge)}
                >
                  {isLocked ? (
                    <View
                      style={[
                        challengeStyles.cardLockBadge,
                        isLight
                          ? challengeStyles.cardLockBadgeLight
                          : challengeStyles.cardLockBadgeDark,
                      ]}
                    >
                      <Ionicons
                        name="lock-closed"
                        size={16}
                        color={isLight ? "#111827" : "#E5E7EB"}
                      />
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[
                        challengeStyles.cardLockBadge,
                        isLight
                          ? challengeStyles.cardLockBadgeLight
                          : challengeStyles.cardLockBadgeDark,
                      ]}
                      onPress={(e) => {
                        // Prevent the card tap from also firing when toggling.
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (e as any)?.stopPropagation?.();
                        void setChallengeCompleted(challenge.id, !isDone);
                      }}
                    >
                      <Ionicons
                        name={isDone ? "checkmark-done" : "checkmark-outline"}
                        size={16}
                        color={
                          isDone
                            ? isLight
                              ? "#16A34A"
                              : "#BBF7D0"
                            : isLight
                              ? "#111827"
                              : "#E5E7EB"
                        }
                      />
                    </TouchableOpacity>
                  )}
                  {/* Top row: icon + title + body tags */}
                  <View style={challengeStyles.cardTopRow}>
                    <View style={iconCircleBase}>
                      <Text
                        style={[
                          styles.viewWorkoutHeaderTitle,
                          { color: "#FFFFFF", fontSize: 18 },
                        ]}
                        numberOfLines={1}
                      >
                        {challenge.card.icon || "⭐"}
                      </Text>
                    </View>
                    <View style={challengeStyles.cardTitleBlock}>
                      <Text
                        style={[
                          styles.viewWorkoutHeaderTitle,
                          isLight
                            ? challengeStyles.headerTitleLight
                            : challengeStyles.headerTitleDark,
                        ]}
                        numberOfLines={2}
                      >
                        {challenge.card.name}
                      </Text>
                      {challenge.card.body_map_tags &&
                      challenge.card.body_map_tags.length ? (
                        <View style={challengeStyles.cardTagPillRow}>
                          {challenge.card.body_map_tags.map((tag) => {
                            const pillStyle =
                              tag === "Chest"
                                ? challengeStyles.cardTagPillChest
                                : tag === "Arms"
                                  ? challengeStyles.cardTagPillArms
                                  : tag === "Core"
                                    ? challengeStyles.cardTagPillCore
                                    : challengeStyles.cardTagPillDefault;
                            return (
                              <View
                                key={tag}
                                style={[challengeStyles.cardTagPill, pillStyle]}
                              >
                                <Text
                                  style={challengeStyles.cardTagPillText}
                                  numberOfLines={1}
                                >
                                  {tag}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        !!tagLabel && (
                          <Text
                            style={[
                              challengeStyles.cardRoleLabel,
                              tagColorStyle,
                            ]}
                            numberOfLines={1}
                          >
                            {tagLabel}
                          </Text>
                        )
                      )}
                    </View>
                  </View>

                  {/* Middle: summary/description */}
                  <Text
                    style={[
                      styles.viewWorkoutHeaderSubtitle,
                      isLight
                        ? challengeStyles.cardSubtitleLight
                        : challengeStyles.cardSubtitleDark,
                    ]}
                    numberOfLines={2}
                  >
                    {challenge.card.short_description}
                  </Text>
                  {lockedSummary ? (
                    <View
                      style={[
                        challengeStyles.lockedSummaryPill,
                        isLight && challengeStyles.lockedSummaryPillLight,
                      ]}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={13}
                        color={isLight ? "#2563EB" : "#7DD3FC"}
                        style={{ marginRight: 5 }}
                      />
                      <Text
                        style={[
                          challengeStyles.lockedSummaryText,
                          isLight && challengeStyles.lockedSummaryTextLight,
                        ]}
                        numberOfLines={1}
                      >
                        {lockedSummary}
                      </Text>
                    </View>
                  ) : null}

                  {/* Bottom row: meta + arrow circle */}
                  <View style={challengeStyles.cardBottomRow}>
                    <View style={{ flex: 1 }}>
                      <View style={challengeStyles.cardMetaPrimaryRow}>
                        <Ionicons
                          name="star"
                          size={14}
                          color="#FACC15"
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            challengeStyles.cardMetaPrimaryText,
                            isLight
                              ? challengeStyles.headerTitleLight
                              : challengeStyles.headerTitleDark,
                          ]}
                          numberOfLines={1}
                        >
                          {difficulty}
                        </Text>
                        {typeof challenge.detail?.duration_days ===
                          "number" && (
                          <>
                            <Text style={challengeStyles.cardMetaDot}>•</Text>
                            <Text
                              style={[
                                challengeStyles.cardMetaDurationText,
                                isLight
                                  ? challengeStyles.headerSubtitleLight
                                  : challengeStyles.headerSubtitleDark,
                              ]}
                              numberOfLines={1}
                            >
                              {`${challenge.detail.duration_days}d`}
                            </Text>
                          </>
                        )}
                      </View>
                      <View style={challengeStyles.cardLevelRow}>
                        <View style={challengeStyles.cardLevelSegmentsRow}>
                          {Array.from({ length: 5 }).map((_, idx) => {
                            const filledSegments = Math.max(
                              1,
                              Math.min(
                                5,
                                Math.ceil(challenge.card.level_index / 2),
                              ),
                            );
                            const isFilled = idx < filledSegments;
                            return (
                              <View
                                key={idx}
                                style={[
                                  challengeStyles.cardLevelSegment,
                                  isFilled
                                    ? challengeStyles.cardLevelSegmentActive
                                    : challengeStyles.cardLevelSegmentInactive,
                                ]}
                              />
                            );
                          })}
                        </View>
                        <Text
                          style={[
                            challengeStyles.cardLevelLabel,
                            isLight
                              ? challengeStyles.headerSubtitleLight
                              : challengeStyles.headerSubtitleDark,
                          ]}
                          numberOfLines={1}
                        >
                          {difficulty === "Beginner"
                            ? "Easy"
                            : difficulty === "Intermediate"
                              ? "Challenging"
                              : "Brutal"}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        challengeStyles.cardArrowCircle,
                        isLight
                          ? challengeStyles.cardArrowCircleLight
                          : challengeStyles.cardArrowCircleDark,
                      ]}
                    >
                      <Ionicons
                        name="arrow-forward-outline"
                        size={18}
                        color={isLight ? "#111827" : "#E5E7EB"}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const getUnlockHint = (difficulty: ChallengeDifficulty) => {
    switch (difficulty) {
      case "Beginner":
        return "Start here. Complete beginner cards to build your base.";
      case "Intermediate":
        return "Finish most beginner cards to make intermediate feel easy.";
      case "Advanced":
      default:
        return "Crush your intermediate cards to unlock advanced challenges.";
    }
  };

  const effectiveStatusFor = (c: Challenge): ChallengeStatus | undefined => {
    return c.card.status as ChallengeStatus | undefined;
  };

  const totalChallenges = challenges.length;
  const completedChallenges = challenges.filter(
    (c) => effectiveStatusFor(c) === "done",
  ).length;
  const lockedChallenges = challenges.filter(
    (c) => effectiveStatusFor(c) === "locked",
  ).length;
  const displayTotal = totalChallenges;
  const displayCompleted = completedChallenges;
  const displayLocked = lockedChallenges;
  const displayCompletionPercent =
    displayTotal === 0 ? 0 : displayCompleted / displayTotal;
  const selectedStatus: ChallengeStatus | null = selected
    ? (selected.card.status as ChallengeStatus | undefined) || "locked"
    : null;
  const selectedIsLocked = selectedStatus === "locked";
  const selectedUnlockBody =
    selected && selectedIsLocked
      ? buildChallengeUnlockBodyText(selected)
      : null;

  if (loading && !challenges.length) {
    return (
      <SafeAreaView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Body Battle challenges"
          userName={challengesUserName}
          onThemeToggle={toggle}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading challenges…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !challenges.length) {
    return (
      <SafeAreaView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Body Battle challenges"
          userName={challengesUserName}
          onThemeToggle={toggle}
        />
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!loading && !challenges.length) {
    return (
      <SafeAreaView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Body Battle challenges"
          userName={challengesUserName}
          onThemeToggle={toggle}
        />
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          Challenges
        </Text>
        <Text style={styles.errorText}>No challenges available yet.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.screenContainer, isLight && styles.screenContainerLight]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.homeScrollContent,
          challengeStyles.scrollContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          isLight={isLight}
          title="Your challenges"
          userName={challengesUserName}
          onThemeToggle={toggle}
        />

        <View
          style={[
            challengeStyles.progressCard,
            isLight && challengeStyles.progressCardLight,
          ]}
        >
          <View style={challengeStyles.progressCardInner}>
            <View style={challengeStyles.progressCardHeaderRow}>
              <View style={{ flex: 1, paddingRight: 14 }}>
                <Text
                  style={[
                    challengeStyles.progressCardLabel,
                    isLight
                      ? challengeStyles.headerSubtitleLight
                      : challengeStyles.headerSubtitleDark,
                  ]}
                >
                  Body Battle
                </Text>
                <Text
                  style={[
                    challengeStyles.progressCardTitle,
                    isLight
                      ? challengeStyles.headerTitleLight
                      : challengeStyles.headerTitleDark,
                  ]}
                >
                  Pick your next win
                </Text>
                <Text
                  style={[
                    challengeStyles.progressCardHint,
                    isLight
                      ? challengeStyles.headerSubtitleLight
                      : challengeStyles.headerSubtitleDark,
                  ]}
                  numberOfLines={2}
                >
                  {getUnlockHint(activeDifficulty)}
                </Text>
              </View>
              <View
                style={[
                  challengeStyles.progressScorePill,
                  isLight && challengeStyles.progressScorePillLight,
                ]}
              >
                <Text
                  style={[
                    challengeStyles.progressScoreValue,
                    isLight
                      ? challengeStyles.headerTitleLight
                      : challengeStyles.headerTitleDark,
                  ]}
                >
                  {Math.round(displayCompletionPercent * 100)}%
                </Text>
                <Text
                  style={[
                    challengeStyles.progressScoreLabel,
                    isLight
                      ? challengeStyles.headerSubtitleLight
                      : challengeStyles.headerSubtitleDark,
                  ]}
                >
                  complete
                </Text>
              </View>
            </View>

            <View style={challengeStyles.progressCardMeterSection}>
              <Text
                style={[
                  challengeStyles.progressCardMeterLabel,
                  isLight
                    ? challengeStyles.headerSubtitleLight
                    : challengeStyles.headerSubtitleDark,
                ]}
                numberOfLines={1}
              >
                {displayCompleted} / {displayTotal} completed
              </Text>
              <View
                style={[
                  challengeStyles.progressCardMeterBarTrack,
                  isLight && challengeStyles.progressCardMeterBarTrackLight,
                ]}
              >
                <View
                  style={[
                    challengeStyles.progressCardMeterBarFill,
                    {
                      width: `${Math.round(
                        displayCompletionPercent * 100,
                      )}%` as any,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={challengeStyles.progressStatsRow}>
              <ChallengeStatPill
                isLight={isLight}
                icon="checkmark-done-outline"
                label="Done"
                value={displayCompleted}
              />
              <ChallengeStatPill
                isLight={isLight}
                icon="lock-closed-outline"
                label="Locked"
                value={displayLocked}
              />
              <ChallengeStatPill
                isLight={isLight}
                icon="flash-outline"
                label="Open"
                value={Math.max(0, displayTotal - displayCompleted - displayLocked)}
                isLast
              />
            </View>
          </View>
        </View>

        <View
          style={[
            challengeStyles.filterRow,
            isLight && challengeStyles.filterRowLight,
          ]}
        >
          {(
            ["Beginner", "Intermediate", "Advanced"] as ChallengeDifficulty[]
          ).map((difficulty) => {
            const isActive = activeDifficulty === difficulty;
            return (
              <TouchableOpacity
                key={difficulty}
                style={[
                  challengeStyles.filterPill,
                  isActive &&
                    (isLight
                      ? challengeStyles.filterPillActiveLight
                      : challengeStyles.filterPillActiveDark),
                ]}
                activeOpacity={0.9}
                onPress={() => setActiveDifficulty(difficulty)}
              >
                <Text
                  style={[
                    challengeStyles.filterPillLabel,
                    isLight
                      ? challengeStyles.filterPillLabelLight
                      : challengeStyles.filterPillLabelDark,
                    isActive && challengeStyles.filterPillLabelActive,
                  ]}
                >
                  {difficulty}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {renderSection(activeDifficulty)}
      </ScrollView>

      <ChallengeDetailModal
        week={selected ? mapChallengeToViewWorkoutWeek(selected) : null}
        isLight={isLight}
        onClose={closeModal}
        isLocked={selectedIsLocked}
        unlockBody={selectedUnlockBody || undefined}
      />
    </SafeAreaView>
  );
};

const ChallengeStatPill: React.FC<{
  isLight: boolean;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: number;
  isLast?: boolean;
}> = ({ isLight, icon, label, value, isLast }) => (
  <View
    style={[
      challengeStyles.progressStatPill,
      isLight && challengeStyles.progressStatPillLight,
      isLast && { marginRight: 0 },
    ]}
  >
    <Ionicons
      name={icon}
      size={15}
      color={isLight ? PS_BLUE : "#7DD3FC"}
      style={{ marginRight: 6 }}
    />
    <View>
      <Text
        style={[
          challengeStyles.progressStatValue,
          isLight
            ? challengeStyles.headerTitleLight
            : challengeStyles.headerTitleDark,
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          challengeStyles.progressStatLabel,
          isLight
            ? challengeStyles.headerSubtitleLight
            : challengeStyles.headerSubtitleDark,
        ]}
      >
        {label}
      </Text>
    </View>
  </View>
);

const challengeStyles = StyleSheet.create({
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  progressCard: {
    marginTop: 4,
    borderRadius: 24,
    backgroundColor: "rgba(15,23,42,0.86)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
    ...CHALLENGE_GLASS_CARD_DARK,
  },
  progressCardLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    shadowOpacity: 0.12,
    ...CHALLENGE_GLASS_CARD_LIGHT,
  },
  progressCardInner: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    position: "relative",
  },
  progressCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  progressCardTitle: {
    marginTop: 5,
    fontSize: 22,
    fontWeight: "800",
  },
  progressCardHint: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 18,
  },
  progressScorePill: {
    width: 86,
    minHeight: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.72)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
  },
  progressScorePillLight: {
    backgroundColor: "rgba(239,246,255,0.92)",
    borderColor: "#DBEAFE",
  },
  progressScoreValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  progressScoreLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  difficultySection: {
    marginTop: 14,
  },
  progressStatsRow: {
    flexDirection: "row",
    marginTop: 13,
  },
  progressStatPill: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 17,
    paddingHorizontal: 10,
    marginRight: 8,
    backgroundColor: "rgba(8,17,32,0.66)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.14)",
    ...CHALLENGE_GLASS_CARD_DARK,
  },
  progressStatPillLight: {
    backgroundColor: "rgba(248,250,252,0.92)",
    borderColor: "#CFE3F7",
    ...CHALLENGE_GLASS_CARD_LIGHT,
  },
  progressStatValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  progressStatLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    marginTop: 14,
    marginBottom: 12,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.72)",
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.16)",
  },
  filterRowLight: {
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: "#DCE6F2",
  },
  filterPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 7,
    borderRadius: 999,
  },
  filterPillActiveDark: {
    backgroundColor: PS_BLUE,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  filterPillActiveLight: {
    backgroundColor: PS_BLUE,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  filterPillLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  filterPillLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  filterPillLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  filterPillLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    width: "100%",
    maxHeight: "90%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.22)",
    backgroundColor: "rgba(8,17,32,0.96)",
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    ...CHALLENGE_GLASS_CARD_DARK,
  },
  modalCardLight: {
    backgroundColor: "rgba(246,250,255,0.96)",
    borderColor: "#CFE3F7",
    ...CHALLENGE_GLASS_CARD_LIGHT,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 0,
    flexShrink: 1,
    paddingRight: 12,
  },
  modalTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  modalTitleDark: {
    color: DARK_TEXT_PRIMARY,
  },
  modalSummary: {
    fontSize: 13,
    marginBottom: 8,
  },
  modalSummaryLight: {
    color: LIGHT_TEXT_MUTED,
  },
  modalSummaryDark: {
    color: DARK_TEXT_MUTED,
  },
  modalBody: {
    fontSize: 14,
    marginBottom: 16,
  },
  modalBodyLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  modalBodyDark: {
    color: DARK_TEXT_PRIMARY,
  },
  modalCompleteIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.8)",
    marginRight: 8,
  },
  modalCloseIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modalCloseIconButtonDark: {
    backgroundColor: "rgba(15,23,42,0.9)",
    borderColor: "rgba(148,163,184,0.8)",
  },
  modalCloseIconButtonLight: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#E2E8F0",
  },
  headerTitleLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  headerTitleDark: {
    color: "#F5F7FA",
  },
  headerSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  headerSubtitleDark: {
    color: "#B8C0D4",
  },
  cardsGrid: {
    flexDirection: "column",
    marginTop: 8,
  },
  cardGridItem: {
    width: "100%",
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardRoleLabel: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "600",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  cardTag: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  tagBeginner: {
    color: "#22C55E",
  },
  tagIntermediate: {
    color: "#38BDF8",
  },
  tagAdvanced: {
    color: "#A855F7",
  },
  cardTagPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 3,
  },
  cardTagPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
    marginTop: 3,
  },
  cardTagPillChest: {
    backgroundColor: "#FEE2E2",
  },
  cardTagPillArms: {
    backgroundColor: "#DBEAFE",
  },
  cardTagPillCore: {
    backgroundColor: "#FEF3C7",
  },
  cardTagPillDefault: {
    backgroundColor: "#E5E7EB",
  },
  cardTagPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111827",
  },
  challengeCardBase: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.2)",
    backgroundColor: "rgba(15,23,42,0.84)",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
    ...CHALLENGE_GLASS_CARD_DARK,
  },
  challengeCardBaseLight: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "#CFE3F7",
    shadowOpacity: 0.1,
    ...CHALLENGE_GLASS_CARD_LIGHT,
  },
  challengeCardLockedLight: {
    backgroundColor: "#E5E7EB",
    opacity: 0.8,
  },
  challengeCardLockedDark: {
    backgroundColor: "#0B1020",
    borderColor: "rgba(148,163,184,0.2)",
    opacity: 0.72,
  },
  cardLockBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLockBadgeLight: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  cardLockBadgeDark: {
    backgroundColor: "rgba(24,34,56,0.95)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(125,211,252,0.22)",
  },
  cardRightColumn: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  cardIndex: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  cardIndexLight: {
    color: LIGHT_TEXT_PRIMARY,
  },
  cardIndexDark: {
    color: DARK_TEXT_PRIMARY,
  },
  cardCompletionCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  cardCompletionCircleLight: {
    borderColor: "#E5E7EB",
  },
  cardCompletionCircleDark: {
    borderColor: "rgba(125,211,252,0.35)",
  },
  cardCompletionCircleCompleted: {
    borderColor: GLASS_ACCENT_GREEN,
  },
  cardCompletionCircleInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: GLASS_ACCENT_GREEN,
  },
  cardSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  cardSubtitleDark: {
    color: "#B8C0D4",
  },
  lockedSummaryPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(14,165,233,0.12)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)",
    maxWidth: "100%",
  },
  lockedSummaryPillLight: {
    backgroundColor: "#EFF6FF",
    borderColor: "#DBEAFE",
  },
  lockedSummaryText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#BAE6FD",
  },
  lockedSummaryTextLight: {
    color: "#2563EB",
  },
  cardProgressSection: {
    marginTop: 10,
  },
  cardProgressLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  cardProgressBarTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.8)",
    overflow: "hidden",
  },
  cardProgressBarTrackLight: {
    backgroundColor: "rgba(209,213,219,0.85)",
  },
  cardProgressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: GLASS_ACCENT_GREEN,
  },
  cardBottomRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardMetaPrimaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardMetaPrimaryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardMetaSecondaryText: {
    marginTop: 2,
    fontSize: 12,
  },
  cardMetaDot: {
    marginHorizontal: 6,
    fontSize: 14,
    color: "#9CA3AF",
  },
  cardMetaDurationText: {
    fontSize: 13,
    fontWeight: "500",
  },
  cardLevelRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  cardLevelSegmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
  },
  cardLevelSegment: {
    width: 16,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  cardLevelSegmentActive: {
    backgroundColor: PS_BLUE,
  },
  cardLevelSegmentInactive: {
    backgroundColor: "#E5E7EB",
  },
  cardLevelLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  cardArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardArrowCircleLight: {
    backgroundColor: "#EEF2FF",
  },
  cardArrowCircleDark: {
    backgroundColor: "rgba(125,211,252,0.1)",
  },
  progressCardMeterSection: {
    marginTop: 12,
  },
  progressCardMeterLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.2,
    marginBottom: 5,
  },
  progressCardMeterBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(5,8,20,0.95)",
    overflow: "hidden",
  },
  progressCardMeterBarTrackLight: {
    backgroundColor: "rgba(209,213,219,0.9)",
  },
  progressCardMeterBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: PS_BLUE,
  },
});

export default ChallengesScreen;
