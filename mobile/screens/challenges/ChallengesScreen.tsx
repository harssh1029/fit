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
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Stop,
  Circle,
} from "react-native-svg";

import {
  GLASS_ACCENT_GREEN,
  GLASS_BORDER_DARK,
  GLASS_CARD_DARK,
  DARK_CARD,
  LIGHT_CARD,
  DARK_TEXT_PRIMARY,
  DARK_TEXT_MUTED,
  LIGHT_TEXT_PRIMARY,
  LIGHT_TEXT_MUTED,
  PS_BLUE,
  PS_CYAN,
} from "../../styles/theme";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { useChallenges } from "../../hooks/useChallenges";
import type { ApiChallenge, ChallengeStatus } from "../../types/challenges";
import {
  useThemeMode,
  HeaderAvatar,
  styles,
  type ViewWorkoutWeek,
  type ViewWorkoutDay,
} from "../../App";
import ChallengeDetailModal from "./ChallengeDetailModal";

type ChallengeDifficulty = "Beginner" | "Intermediate" | "Advanced";

type Challenge = ApiChallenge;

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
  const { unlock } = challenge;
  if (!unlock) return null;

  const lines: string[] = [];

  const conditions = (unlock.conditions || []) as Array<{
    body_part?: string;
    min_workouts?: number;
    level_required?: string;
  }>;

  if (conditions.length) {
    conditions.forEach((cond) => {
      const bodyPart = cond.body_part || "Body";
      const pieces: string[] = [];
      if (cond.min_workouts != null) {
        pieces.push(`${cond.min_workouts} workouts`);
      }
      if (cond.level_required) {
        const label =
          cond.level_required.charAt(0).toUpperCase() +
          cond.level_required.slice(1);
        pieces.push(`level ${label}`);
      }
      const detail = pieces.length ? ` \\u2014 ${pieces.join(", ")}` : "";
      lines.push(`• ${bodyPart}${detail}`);
    });
  }

  if (
    unlock.challenges_completed_required &&
    unlock.challenges_completed_required > 0
  ) {
    lines.push(
      `• Complete ${unlock.challenges_completed_required} challenge` +
        (unlock.challenges_completed_required > 1 ? "s" : ""),
    );
  }

  if (unlock.unlock_message) {
    if (lines.length) {
      lines.push("\n" + unlock.unlock_message);
    } else {
      lines.push(unlock.unlock_message);
    }
  }

  if (!lines.length) return null;
  return lines.join("\n");
};

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

type ChallengeCircularGaugeProps = {
  progress: number;
  isLight: boolean;
};

const ChallengeCircularGauge: React.FC<ChallengeCircularGaugeProps> = ({
  progress,
  isLight,
}) => {
  const clamped = Math.max(
    0,
    Math.min(1, Number.isFinite(progress) ? progress : 0),
  );
  const size = 160;
  const center = size / 2;
  const outerRadius = 60;
  const innerRadius = 48;
  const outerStrokeWidth = 10;
  const innerStrokeWidth = 4;
  const startAngle = 135; // leave a gap at the bottom for a gauge feel
  const endAngleFull = 405; // 135 + 270 degrees
  const arcRange = endAngleFull - startAngle;
  const endAngleProgress = startAngle + arcRange * clamped;

  const trackPath = describeArc(
    center,
    center,
    outerRadius,
    startAngle,
    endAngleFull,
  );
  const progressPath = describeArc(
    center,
    center,
    outerRadius,
    startAngle,
    endAngleProgress,
  );
  const innerPath = describeArc(
    center,
    center,
    innerRadius,
    startAngle,
    endAngleFull,
  );

  const trackColor = isLight ? "#E5E7EB" : "#111827";
  const dottedColor = isLight
    ? "rgba(148,163,184,0.7)"
    : "rgba(148,163,184,0.85)";

  const progressEndPoint = polarToCartesian(
    center,
    center,
    outerRadius,
    endAngleProgress,
  );

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient
          id="challengeGaugeGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <Stop offset="0%" stopColor={GLASS_ACCENT_GREEN} />
          <Stop offset="100%" stopColor="#EAB308" />
        </LinearGradient>
      </Defs>

      {/* Outer track */}
      <Path
        d={trackPath}
        stroke={trackColor}
        strokeWidth={outerStrokeWidth}
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner dotted track */}
      <Path
        d={innerPath}
        stroke={dottedColor}
        strokeWidth={innerStrokeWidth}
        strokeDasharray="2 6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Progress arc */}
      {clamped > 0 && (
        <Path
          d={progressPath}
          stroke="url(#challengeGaugeGradient)"
          strokeWidth={outerStrokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Knob at end of arc */}
      {clamped > 0 && (
        <Circle
          cx={progressEndPoint.x}
          cy={progressEndPoint.y}
          r={4.5}
          fill="#EAB308"
        />
      )}
    </Svg>
  );
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

  const sectionIconColor = isLight ? DARK_TEXT_PRIMARY : DARK_TEXT_PRIMARY;

  const openChallenge = (challenge: Challenge) => {
    setSelected(challenge);
  };

  const closeModal = () => {
    setSelected(null);
  };

  const iconForDifficulty = (
    difficulty: ChallengeDifficulty,
  ): React.ComponentProps<typeof Ionicons>["name"] => {
    switch (difficulty) {
      case "Beginner":
        return "ribbon-outline";
      case "Intermediate":
        return "barbell-outline";
      case "Advanced":
      default:
        return "flame-outline";
    }
  };

  const renderSection = (
    difficulty: ChallengeDifficulty,
    title: string,
    iconName: React.ComponentProps<typeof Ionicons>["name"],
  ) => {
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

  const getDifficultyStats = (difficulty: ChallengeDifficulty) => {
    const levelKey =
      difficulty === "Beginner"
        ? "beginner"
        : difficulty === "Intermediate"
          ? "intermediate"
          : "advanced";
    const items = challenges.filter((c) => c.card.level === levelKey);
    const total = items.length;
    const completedCount = items.filter(
      (c) => (c.card.status as ChallengeStatus | undefined) === "done",
    ).length;
    const lockedCount = items.filter(
      (c) => (c.card.status as ChallengeStatus | undefined) === "locked",
    ).length;
    const completionPercent = total === 0 ? 0 : completedCount / total;
    return { total, completedCount, lockedCount, completionPercent };
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

  const {
    total: totalActiveDifficulty,
    completedCount: completedActiveDifficulty,
    lockedCount: lockedActiveDifficulty,
    completionPercent: completionPercentActiveDifficulty,
  } = getDifficultyStats(activeDifficulty);

  // Aggregate challenge stats across all levels for the top metric card.
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
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {challengesUserName ? `Hi ${challengesUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Body Battle challenges
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={challengesUserName} />
          </View>
        </View>
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
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {challengesUserName ? `Hi ${challengesUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Body Battle challenges
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={challengesUserName} />
          </View>
        </View>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!loading && !challenges.length) {
    return (
      <SafeAreaView
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
              {challengesUserName ? `Hi ${challengesUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Body Battle challenges
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={challengesUserName} />
          </View>
        </View>
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
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {challengesUserName ? `Hi ${challengesUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your challenges
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={challengesUserName} />
          </View>
        </View>

        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          Challenges
        </Text>
        <Text
          style={[styles.screenSubtitle, isLight && styles.screenSubtitleLight]}
        >
          Pick a challenge, follow the steps, then mark it complete for this
          session.
        </Text>

        {/* Circular progress gauge card above difficulty filters */}
        <View
          style={[
            challengeStyles.progressCard,
            isLight && challengeStyles.progressCardLight,
          ]}
        >
          <View style={challengeStyles.progressCardInner}>
            <View style={challengeStyles.progressGaugeRow}>
              <View style={challengeStyles.progressGaugeSideBlock}>
                <Text
                  style={[
                    challengeStyles.progressGaugeSideLabel,
                    isLight
                      ? challengeStyles.headerSubtitleLight
                      : challengeStyles.headerSubtitleDark,
                  ]}
                >
                  Done
                </Text>
                <Text
                  style={[
                    challengeStyles.progressGaugeSideValue,
                    isLight
                      ? challengeStyles.headerTitleLight
                      : challengeStyles.headerTitleDark,
                  ]}
                >
                  {displayCompleted}
                </Text>
                <Text
                  style={[
                    challengeStyles.progressGaugeSideSubLabel,
                    isLight
                      ? challengeStyles.headerSubtitleLight
                      : challengeStyles.headerSubtitleDark,
                  ]}
                >
                  cards
                </Text>
              </View>

              <View style={challengeStyles.progressGaugeCenterWrapper}>
                <View style={challengeStyles.progressGaugeSvgWrapper}>
                  <ChallengeCircularGauge
                    progress={displayCompletionPercent}
                    isLight={isLight}
                  />
                  <View style={challengeStyles.progressGaugeCenterLabel}>
                    <Text
                      style={[
                        challengeStyles.progressGaugeCenterPrimary,
                        isLight
                          ? challengeStyles.headerTitleLight
                          : challengeStyles.headerTitleDark,
                      ]}
                    >
                      {displayCompleted}
                    </Text>
                    <Text
                      style={[
                        challengeStyles.progressGaugeCenterSecondary,
                        isLight
                          ? challengeStyles.headerSubtitleLight
                          : challengeStyles.headerSubtitleDark,
                      ]}
                      numberOfLines={1}
                    >
                      of {displayTotal} done
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  challengeStyles.progressGaugeSideBlock,
                  challengeStyles.progressGaugeSideBlockRight,
                ]}
              >
                <Text
                  style={[
                    challengeStyles.progressGaugeSideLabel,
                    isLight
                      ? challengeStyles.headerSubtitleLight
                      : challengeStyles.headerSubtitleDark,
                  ]}
                >
                  Locked
                </Text>
                <Text
                  style={[
                    challengeStyles.progressGaugeSideValue,
                    isLight
                      ? challengeStyles.headerTitleLight
                      : challengeStyles.headerTitleDark,
                  ]}
                >
                  {displayLocked}
                </Text>
                <Text
                  style={[
                    challengeStyles.progressGaugeSideSubLabel,
                    isLight
                      ? challengeStyles.headerSubtitleLight
                      : challengeStyles.headerSubtitleDark,
                  ]}
                >
                  cards
                </Text>
              </View>
            </View>

            {/* Overall level progress label + horizontal bar */}
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

            <View style={challengeStyles.progressGaugeTipBlock}>
              <Text
                style={[
                  challengeStyles.progressGaugeTipTitle,
                  isLight
                    ? challengeStyles.headerSubtitleLight
                    : challengeStyles.headerSubtitleDark,
                ]}
              >
                Tip
              </Text>
              <Text
                style={[
                  challengeStyles.progressGaugeTipBody,
                  isLight
                    ? challengeStyles.headerSubtitleLight
                    : challengeStyles.headerSubtitleDark,
                ]}
                numberOfLines={2}
              >
                {getUnlockHint(activeDifficulty)}
              </Text>
            </View>
          </View>
        </View>

        {/* Dotted divider between gauge and challenge filters */}
        <View style={challengeStyles.progressSectionDivider} />

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

        {renderSection(
          activeDifficulty,
          activeDifficulty,
          iconForDifficulty(activeDifficulty),
        )}
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
    paddingHorizontal: 20,
  },
  progressCard: {
    marginTop: 24,
    borderRadius: 24,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.35)",
    overflow: "hidden",
  },
  progressCardLight: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#E5E7EB",
  },
  progressCardInner: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    position: "relative",
  },
  progressCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressCardLabel: {
    fontSize: 12,
  },
  progressCardTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "300", // Mid Display weight per DESIGN.md
  },
  progressCardRightColumn: {
    alignItems: "flex-end",
  },
  progressCardLockedLabel: {
    fontSize: 12,
  },
  progressCardLockedCount: {
    fontSize: 20,
    fontWeight: "700",
  },
  progressCardHint: {
    marginTop: 6,
    fontSize: 12,
  },
  difficultySection: {
    marginTop: 24,
  },
  progressGaugeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressGaugeSideBlock: {
    width: 72,
  },
  progressGaugeSideBlockRight: {
    alignItems: "flex-end",
  },
  progressGaugeSideLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  progressGaugeSideValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  progressGaugeSideSubLabel: {
    marginTop: 2,
    fontSize: 11,
  },
  progressGaugeCenterWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  progressGaugeSvgWrapper: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  progressGaugeCenterLabel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  progressGaugeCenterPrimary: {
    fontSize: 28,
    fontWeight: "300", // light, numeric focus
  },
  progressGaugeCenterSecondary: {
    marginTop: 2,
    fontSize: 12,
  },
  progressGaugeTipBlock: {
    marginTop: 16,
  },
  progressGaugeTipTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  progressGaugeTipBody: {
    fontSize: 12,
  },
  progressSectionDivider: {
    marginTop: 24,
    marginBottom: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    borderColor: "rgba(148,163,184,0.55)",
  },
  filterRow: {
    flexDirection: "row",
    marginTop: 0,
    marginBottom: 24,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.9)",
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.5)",
  },
  filterRowLight: {
    backgroundColor: LIGHT_CARD,
  },
  filterPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterPillActiveDark: {
    backgroundColor: PS_BLUE,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  filterPillActiveLight: {
    backgroundColor: "#0F172A",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  filterPillLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  filterPillLabelLight: {
    color: LIGHT_TEXT_MUTED,
  },
  filterPillLabelDark: {
    color: DARK_TEXT_MUTED,
  },
  filterPillLabelActive: {
    color: "#F9FAFB",
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
    borderColor: GLASS_BORDER_DARK,
    backgroundColor: DARK_CARD,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  modalCardLight: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
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
    color: DARK_TEXT_PRIMARY,
  },
  headerSubtitleLight: {
    color: LIGHT_TEXT_MUTED,
  },
  headerSubtitleDark: {
    color: DARK_TEXT_MUTED,
  },
  cardsGrid: {
    flexDirection: "column",
    marginTop: 16,
  },
  cardGridItem: {
    width: "100%",
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardRoleLabel: {
    marginTop: 4,
    fontSize: 13,
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
    marginTop: 4,
  },
  cardTagPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginTop: 4,
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
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  challengeCardBase: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15,23,42,0.35)",
    backgroundColor: "rgba(15,23,42,0.9)",
    overflow: "hidden",
  },
  challengeCardBaseLight: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "#E5E7EB",
  },
  challengeCardLockedLight: {
    backgroundColor: "#E5E7EB",
    opacity: 0.8,
  },
  challengeCardLockedDark: {
    backgroundColor: "rgba(15,23,42,0.95)",
    opacity: 0.6,
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
    backgroundColor: "rgba(15,23,42,0.9)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(148,163,184,0.8)",
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
    borderColor: "rgba(148,163,184,0.85)",
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
    color: DARK_TEXT_MUTED,
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
    marginTop: 10,
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
    marginTop: 8,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardArrowCircleLight: {
    backgroundColor: "#EEF2FF",
  },
  cardArrowCircleDark: {
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  progressCardMeterSection: {
    marginTop: 14,
  },
  progressCardMeterLabel: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  progressCardMeterBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.85)",
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
