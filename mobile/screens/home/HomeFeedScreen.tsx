import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import BodyMuscleBack from "../../BodyMuscleBack";
import BodyMuscleFront, { MuscleName } from "../../BodyMuscleFront";
import { AppHeader } from "../../components/AppHeader";
import {
  FitnessIcon3D,
  type FitnessIcon3DName,
} from "../../components/FitnessIcon3D";
import { useCommunity } from "../../hooks/useCommunity";
import type {
  CommunityActivity,
  CommunityActivityComment,
} from "../../types/community";
import { API_BASE_URL, useAuth, useThemeMode } from "../../App";
import { fontFamily } from "../../styles/typography";
import {
  PS_BLUE,
  WORKOUT_ACCENT,
  WORKOUT_ACCENT_BLUE,
  WORKOUT_SUCCESS,
  WORKOUT_TEXT_SECONDARY,
} from "../../styles/theme";

const MANUAL_BODY_GROUPS = [
  { key: "chest", label: "Chest" },
  { key: "back", label: "Back" },
  { key: "legs", label: "Legs" },
  { key: "shoulders", label: "Shoulders" },
  { key: "arms", label: "Arms" },
  { key: "core", label: "Core" },
  { key: "glutes", label: "Glutes" },
] as const;

const MANUAL_TYPES = [
  { key: "strength", label: "Strength" },
  { key: "cardio", label: "Cardio" },
  { key: "conditioning", label: "Conditioning" },
  { key: "mobility", label: "Mobility" },
  { key: "sport", label: "Sport" },
] as const;

const GROUP_TO_MUSCLES: Record<string, MuscleName[]> = {
  chest: ["Chest"],
  shoulders: ["Deltoids"],
  arms: ["Biceps", "Triceps", "Forearms"],
  back: ["Trapezius", "Lats", "Lower Back"],
  core: ["Abs", "Obliques"],
  glutes: ["Glutes"],
  legs: ["Quadriceps", "Hamstrings", "Calves", "Tibialis"],
};

const BACK_MUSCLES = new Set<MuscleName>([
  "Trapezius",
  "Triceps",
  "Forearms",
  "Lats",
  "Lower Back",
  "Glutes",
  "Hamstrings",
  "Calves",
]);

const FRONT_MUSCLES = new Set<MuscleName>([
  "Neck",
  "Trapezius",
  "Chest",
  "Deltoids",
  "Biceps",
  "Forearms",
  "Abs",
  "Obliques",
  "Hip Flexors",
  "Quadriceps",
  "Calves",
  "Tibialis",
]);

type FeedNavigation = BottomTabNavigationProp<{
  Home: undefined;
  Record: undefined;
  Plans: undefined;
  Community: undefined;
  Insights: undefined;
}>;

export type FeedItem =
  | (CommunityActivity & { synthetic?: false })
  | {
      id: number;
      userId: number;
      userName: string;
      avatarInitials?: string;
      type: CommunityActivity["type"] | "streak" | "rank" | "transformation";
      title: string;
      description?: string;
      score?: number | null;
      metadata?: Record<string, unknown>;
      occurredAt: string;
      likedByMe?: boolean;
      likesCount?: number;
      commentsCount?: number;
      shareCount?: number;
      synthetic: true;
    };

const formatTimeAgo = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatDuration = (minutes: number) => {
  const safeMinutes = Math.max(1, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  if (!hours) return `${safeMinutes}:00`;
  return `${hours}:${String(mins).padStart(2, "0")}:00`;
};

const titleCase = (value: string) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const asMuscleArray = (value: unknown): MuscleName[] =>
  asStringArray(value).filter((item): item is MuscleName =>
    [
      "Neck",
      "Trapezius",
      "Chest",
      "Deltoids",
      "Biceps",
      "Triceps",
      "Forearms",
      "Abs",
      "Obliques",
      "Hip Flexors",
      "Quadriceps",
      "Calves",
      "Tibialis",
      "Lats",
      "Lower Back",
      "Glutes",
      "Hamstrings",
    ].includes(item),
  );

const getActivityMuscles = (
  metadata?: Record<string, unknown>,
): MuscleName[] => {
  const savedMuscles = asMuscleArray(metadata?.muscles);
  if (savedMuscles.length) return Array.from(new Set(savedMuscles));

  const groups = asStringArray(metadata?.body_groups);
  const derived = groups.flatMap((group) => GROUP_TO_MUSCLES[group] ?? []);
  return Array.from(new Set(derived));
};

const getActivityChips = (item: FeedItem) => {
  const muscles = getActivityMuscles(item.metadata);
  const mode =
    typeof item.metadata?.mode === "string"
      ? titleCase(item.metadata.mode)
      : "Strength";
  const chips: Array<{
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
  }> = [
    {
      key: "mode",
      label: mode,
      icon: "barbell-outline" as const,
      accent: WORKOUT_ACCENT_BLUE,
    },
    ...muscles.slice(0, 2).map((muscle) => ({
      key: muscle,
      label: muscle,
      icon: "ellipse" as const,
      accent: WORKOUT_ACCENT,
    })),
  ];
  if (muscles.length > 2) {
    chips.push({
      key: "more",
      label: `+${muscles.length - 2}`,
      icon: "add" as const,
      accent: "#94A3B8",
    });
  }
  return chips;
};

const getPrExercises = (metadata?: Record<string, unknown>) => {
  const exercises = Array.isArray(metadata?.exercises)
    ? metadata.exercises
    : [];
  const prNames = exercises
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const exercise = item as Record<string, unknown>;
      if (exercise.pr !== true) return null;
      return typeof exercise.name === "string" && exercise.name.trim()
        ? exercise.name.trim()
        : "Exercise PR";
    })
    .filter((item): item is string => Boolean(item));

  if (prNames.length) return prNames;
  if (typeof metadata?.pr === "string" && metadata.pr.trim()) {
    return metadata.pr
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const getPrSummary = (metadata?: Record<string, unknown>) => {
  const prs = getPrExercises(metadata);
  if (!prs.length) return "";
  if (prs.length === 1) return `Achieved PR: ${prs[0]}`;
  return `Achieved ${prs.length} PRs`;
};

const getCaption = (metadata?: Record<string, unknown>) =>
  typeof metadata?.caption === "string" ? metadata.caption.trim() : "";

const getImageUrl = (metadata?: Record<string, unknown>) =>
  typeof metadata?.image_url === "string" ? metadata.image_url.trim() : "";

const getActivityImageUrls = (
  metadata?: Record<string, unknown>,
  frontendSummary?: CommunityActivity["frontendSummary"],
) => {
  const urls = Array.isArray(metadata?.image_urls)
    ? metadata.image_urls.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const summaryUrls = Array.isArray(frontendSummary?.image_urls)
    ? frontendSummary.image_urls.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const primary = getImageUrl(metadata);
  return Array.from(new Set([primary, ...urls, ...summaryUrls].filter(Boolean))).slice(0, 6);
};

const getWorkoutImageUrls = (metadata?: Record<string, unknown>) =>
  getActivityImageUrls(metadata);

type EarnedBadgeSummary = {
  id: string;
  name: string;
  rarity?: string;
  reason?: string;
};

const getEarnedWorkoutBadges = (
  metadata?: Record<string, unknown>,
): EarnedBadgeSummary[] => {
  if (!Array.isArray(metadata?.earned_badges)) return [];
  const badges: EarnedBadgeSummary[] = [];
  metadata.earned_badges.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const badge = item as Record<string, unknown>;
    const id = typeof badge.id === "string" ? badge.id : "";
    const name = typeof badge.name === "string" ? badge.name.trim() : "";
    if (!id || !name) return;
    badges.push({
      id,
      name,
      rarity: typeof badge.rarity === "string" ? badge.rarity : undefined,
      reason: typeof badge.reason === "string" ? badge.reason : undefined,
    });
  });
  return badges.slice(0, 2);
};

const getWorkoutExerciseRows = (metadata?: Record<string, unknown>) => {
  if (!Array.isArray(metadata?.exercises)) return [];
  return metadata.exercises
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const exercise = item as Record<string, unknown>;
      const name =
        typeof exercise.name === "string" ? exercise.name.trim() : "";
      if (!name) return null;
      return {
        name,
        volume:
          typeof exercise.volume === "string" ? exercise.volume.trim() : "",
        pr: exercise.pr === true,
      };
    })
    .filter(
      (item): item is { name: string; volume: string; pr: boolean } =>
        Boolean(item),
    );
};

const getWorkoutDisplayTitle = (item: FeedItem) => {
  if (item.type !== "workout") return item.title;
  if (typeof item.metadata?.title === "string" && item.metadata.title.trim()) {
    return item.metadata.title.trim();
  }
  const groups = asStringArray(item.metadata?.body_groups);
  const hasUpper = groups.some((group) =>
    ["chest", "back", "shoulders", "arms"].includes(group),
  );
  const hasLower = groups.some((group) => ["legs", "glutes"].includes(group));
  const mode =
    typeof item.metadata?.mode === "string" ? item.metadata.mode : "";
  const hasCardio = item.metadata?.cardio === true;

  if (mode === "conditioning") return "Conditioning Session";
  if (mode === "cardio" || hasCardio) return "Cardio Session";
  if (mode === "mobility") return "Mobility Reset";
  if (mode === "sport") return "Sport Session";
  if (hasUpper && hasLower) return "Upper & Lower Strength";
  if (hasUpper) return "Upper Body Strength";
  if (hasLower) return "Lower Body Strength";
  if (mode) return `${titleCase(mode)} Workout`;
  return item.title;
};

const getWorkoutSubtitle = (item: FeedItem) => {
  const streak =
    typeof item.metadata?.streak_days === "number" &&
    item.metadata.streak_days > 0
      ? `${item.metadata.streak_days} day streak`
      : "";
  const intensity =
    typeof item.metadata?.intensity === "string" &&
    item.metadata.intensity.trim()
      ? titleCase(item.metadata.intensity)
      : "";
  if (
    typeof item.metadata?.focus_label === "string" &&
    item.metadata.focus_label.trim()
  ) {
    return [item.metadata.focus_label.trim(), intensity, streak]
      .filter(Boolean)
      .join(" | ");
  }
  const groups = asStringArray(item.metadata?.body_groups).map(titleCase);
  if (item.metadata?.cardio === true) groups.push("Cardio");
  const focus = groups.length
    ? groups.slice(0, 2).join(" + ")
    : item.description || "Workout completed";
  return [focus, intensity, streak].filter(Boolean).join(" | ");
};

const getWorkoutTakeaway = (item: FeedItem) => {
  const groups = asStringArray(item.metadata?.body_groups);
  const muscles = getActivityMuscles(item.metadata);
  const points = Math.max(1, Math.min(8, muscles.length || groups.length || 1));
  const xp =
    typeof item.metadata?.activity_xp === "number"
      ? item.metadata.activity_xp
      : points;
  const hasStrength = groups.some((group) =>
    ["chest", "back", "shoulders", "arms", "legs", "glutes"].includes(group),
  );
  const hasCardio = item.metadata?.cardio === true;
  if (hasStrength && hasCardio) {
    return {
      title: "Balanced training week",
      body: "You trained both strength and endurance.",
      score: `+${xp}`,
      label: "XP",
    };
  }
  return {
    title: muscles.length ? "Strong focused session" : "Consistency improving",
    body: muscles.length
      ? `You trained ${Math.min(muscles.length, 6)} focused muscle groups.`
      : "Consistency session added to your week.",
    score: `+${xp}`,
    label: "XP",
  };
};

const getFeedIcon3D = (type: FeedItem["type"]): FitnessIcon3DName => {
  if (type === "challenge") return "trophy";
  if (type === "plan") return "plans";
  if (type === "test") return "progress";
  if (type === "badge") return "target";
  if (type === "group") return "community";
  if (type === "streak") return "flame";
  if (type === "rank") return "challenges";
  if (type === "transformation") return "sparkles";
  return "workout";
};

const metricIcon3D = (key: string): FitnessIcon3DName => {
  if (key === "streak") return "flame";
  if (key === "goal") return "target";
  if (key === "challenge") return "trophy";
  if (key === "points") return "progress";
  return "workout";
};

const getActivityLabel = (item: FeedItem) => {
  if (item.type === "challenge") return "Challenge completed";
  if (item.type === "plan") return "Plan update";
  if (item.type === "test") return "Fitness test";
  if (item.type === "badge") return "Badge earned";
  if (item.type === "group") return "Group update";
  if (item.type === "streak") return "Streak";
  if (item.type === "rank") return "Rank update";
  if (item.type === "transformation") return "Transformation";
  if (item.type === "workout" && item.metadata?.plan_id) return "Plan workout";
  return "Workout";
};

const buildStats = (item: FeedItem) => {
  const duration =
    typeof item.metadata?.duration_minutes === "number"
      ? item.metadata.duration_minutes
      : typeof item.score === "number" && item.score > 0
        ? Math.round(item.score)
        : 48;
  const groups = asStringArray(item.metadata?.body_groups);
  const focus =
    typeof item.metadata?.focus_label === "string" &&
    item.metadata.focus_label.trim()
      ? item.metadata.focus_label.trim()
      : groups.length
        ? groups.slice(0, 2).map(titleCase).join(" + ")
        : item.metadata?.cardio === true
          ? "Cardio"
          : "Training";
  const intensity =
    typeof item.metadata?.intensity === "string" &&
    item.metadata.intensity.trim()
      ? item.metadata.intensity.trim()
      : "Logged";
  const streak =
    typeof item.metadata?.streak_days === "number"
      ? item.metadata.streak_days
      : 3;
  if (item.type === "challenge") {
    return [
      {
        key: "time",
        icon: "calendar-outline" as const,
        value: "12 Apr",
        label: "Time",
      },
      {
        key: "type",
        icon: "trophy-outline" as const,
        value: "Challenge",
        label: "Type",
      },
      {
        key: "points",
        icon: "shield-outline" as const,
        value: "200",
        label: "Points",
      },
    ];
  }
  return [
    {
      key: "duration",
      icon: "time-outline" as const,
      value: `${Math.max(1, Math.round(duration))}m`,
      label: "Duration",
    },
    {
      key: "intensity",
      icon: "radio-button-on-outline" as const,
      value: titleCase(intensity),
      label: "Intensity",
    },
    {
      key: "focus",
      icon: "scan-outline" as const,
      value: focus,
      label: "Focus",
    },
    {
      key: "streak",
      icon: "flame-outline" as const,
      value: String(streak),
      label: "Streak",
    },
  ];
};

const MetricRail: React.FC<{
  streakDays?: number | null;
  thisWeekPoints?: number;
  loggedWeekDays?: number[];
  onRecord: () => void;
  cardWidth: number;
}> = ({
  streakDays,
  thisWeekPoints = 842,
  loggedWeekDays = [],
  onRecord,
  cardWidth,
}) => {
  const currentStreak = Math.max(1, streakDays ?? 12);
  const weekLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const loggedDaySet = new Set(loggedWeekDays.length ? loggedWeekDays : [0, 1, 2, 3]);
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);
  const items = [
    {
      key: "streak",
      icon: "flame-outline" as const,
      label: "Streak",
      value: String(currentStreak),
      unit: "days",
      caption: "Best: 28 days",
      accent: "#6D7DFF",
    },
    {
      key: "goal",
      icon: "radio-button-on" as const,
      label: "Weekly goal",
      value: "4",
      unit: "/ 6",
      subLabel: "Workouts",
      caption: "67% completed",
      accent: "#4CE4D0",
    },
    {
      key: "challenge",
      icon: "trophy-outline" as const,
      label: "Next challenge",
      value: "HYROX Pro",
      unit: "",
      caption: "Starts in",
      subLabel: "3 days",
      accent: "#C084FC",
    },
    {
      key: "points",
      icon: "trending-up-outline" as const,
      label: "This week",
      value: String(thisWeekPoints),
      unit: "",
      subLabel: "Hybrid Points",
      caption: "+18% vs last week",
      accent: "#34D399",
    },
  ];

  return (
    <View style={feedStyles.metricRailWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 12}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={feedStyles.metricRailContent}
        scrollEventThrottle={16}
        onScroll={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          const nextIndex = Math.max(
            0,
            Math.min(items.length - 1, Math.round(offsetX / (cardWidth + 12))),
          );
          setActiveMetricIndex(nextIndex);
        }}
      >
        {items.map((item) => (
          <View
            key={item.key}
            style={[feedStyles.metricCard, { width: cardWidth }]}
          >
            <View style={feedStyles.metricTopRow}>
              <View
                style={feedStyles.metricIcon}
              >
                <FitnessIcon3D name={metricIcon3D(item.key)} size={28} active />
              </View>
              <Text style={feedStyles.metricLabel}>{item.label}</Text>
            </View>
            <View style={feedStyles.metricValueRow}>
              <Text style={feedStyles.metricValue}>{item.value}</Text>
              {!!item.unit && (
                <Text style={feedStyles.metricUnit}>{item.unit}</Text>
              )}
            </View>
            {item.subLabel && item.key !== "challenge" ? (
              <Text style={feedStyles.metricSubLabel}>{item.subLabel}</Text>
            ) : null}
            {item.key === "goal" ? (
              <View style={feedStyles.metricProgressTrack}>
                <View style={feedStyles.metricProgressFill} />
              </View>
            ) : null}
            {item.key === "challenge" ? (
              <View style={feedStyles.metricChallengeBlock}>
                <Text style={feedStyles.metricChallengePrefix}>{item.caption}</Text>
                <View style={feedStyles.metricChallengeRow}>
                  <Text style={feedStyles.metricChallengeValue}>{item.subLabel}</Text>
                  <Ionicons name="arrow-forward" size={22} color="#6F778A" />
                </View>
              </View>
            ) : null}
            {item.key === "streak" ? (
              <View style={feedStyles.streakWeek}>
                {weekLabels.map((label, index) => {
                  const logged = loggedDaySet.has(index);
                  return (
                    <View
                      key={`${label}-${index}`}
                      style={feedStyles.streakDay}
                    >
                      <Text style={feedStyles.streakDayLabel}>{label}</Text>
                      <View
                        style={[
                          feedStyles.streakCheck,
                          logged && feedStyles.streakCheckActive,
                        ]}
                      >
                        {logged ? (
                          <Ionicons
                            name="checkmark"
                            size={10}
                            color="#07111F"
                          />
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
            {item.key !== "challenge" ? (
              <Text
                style={[
                  feedStyles.metricCaption,
                  item.key === "points" && { color: "#34D399" },
                ]}
              >
                {item.caption}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
      <View style={feedStyles.metricDotsRow}>
        {items.map((item, index) => (
          <View
            key={`${item.key}-dot`}
            style={[
              feedStyles.metricDot,
              index === activeMetricIndex && feedStyles.metricDotActive,
            ]}
          />
        ))}
      </View>
      <TouchableOpacity
        style={feedStyles.composer}
        activeOpacity={0.86}
        onPress={onRecord}
      >
        <View style={feedStyles.composerPlus}>
          <Ionicons name="add" size={30} color="#F8FAFC" />
        </View>
        <Text style={feedStyles.composerText}>What did you train today?</Text>
        <Ionicons name="image-outline" size={24} color="#E5E7EB" />
      </TouchableOpacity>
    </View>
  );
};

const ManualWorkoutModal: React.FC<{
  visible: boolean;
  saving: boolean;
  error: string | null;
  duration: string;
  exerciseCount: string;
  selectedType: string;
  selectedGroups: string[];
  includeCardio: boolean;
  onClose: () => void;
  onDurationChange: (value: string) => void;
  onExerciseCountChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onToggleGroup: (value: string) => void;
  onToggleCardio: () => void;
  onSubmit: () => void;
}> = ({
  visible,
  saving,
  error,
  duration,
  exerciseCount,
  selectedType,
  selectedGroups,
  includeCardio,
  onClose,
  onDurationChange,
  onExerciseCountChange,
  onTypeChange,
  onToggleGroup,
  onToggleCardio,
  onSubmit,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <View style={feedStyles.manualModalRoot}>
      <TouchableOpacity
        style={feedStyles.manualModalBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={feedStyles.manualModalCard}>
        <View style={feedStyles.manualModalHeader}>
          <Text style={feedStyles.manualModalTitle}>Log workout</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={22} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <Text style={feedStyles.manualLabel}>Type</Text>
        <View style={feedStyles.manualChipRow}>
          {MANUAL_TYPES.map((item) => {
            const selected = selectedType === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  feedStyles.manualChip,
                  selected && feedStyles.manualChipActive,
                ]}
                activeOpacity={0.85}
                onPress={() => onTypeChange(item.key)}
              >
                <Text
                  style={[
                    feedStyles.manualChipText,
                    selected && feedStyles.manualChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={feedStyles.manualLabel}>Focus</Text>
        <View style={feedStyles.manualChipRow}>
          {MANUAL_BODY_GROUPS.map((item) => {
            const selected = selectedGroups.includes(item.key);
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  feedStyles.manualChip,
                  selected && feedStyles.manualChipActive,
                ]}
                activeOpacity={0.85}
                onPress={() => onToggleGroup(item.key)}
              >
                <Text
                  style={[
                    feedStyles.manualChipText,
                    selected && feedStyles.manualChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[
              feedStyles.manualChip,
              includeCardio && feedStyles.manualChipActive,
            ]}
            activeOpacity={0.85}
            onPress={onToggleCardio}
          >
            <Text
              style={[
                feedStyles.manualChipText,
                includeCardio && feedStyles.manualChipTextActive,
              ]}
            >
              Cardio
            </Text>
          </TouchableOpacity>
        </View>

        <View style={feedStyles.manualInputRow}>
          <View style={feedStyles.manualInputBlock}>
            <Text style={feedStyles.manualLabel}>Time</Text>
            <TextInput
              value={duration}
              onChangeText={onDurationChange}
              keyboardType="numeric"
              placeholder="45"
              placeholderTextColor="#64748B"
              style={feedStyles.manualInput}
            />
          </View>
          <View style={feedStyles.manualInputBlock}>
            <Text style={feedStyles.manualLabel}>Exercises</Text>
            <TextInput
              value={exerciseCount}
              onChangeText={onExerciseCountChange}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor="#64748B"
              style={feedStyles.manualInput}
            />
          </View>
        </View>

        {error ? <Text style={feedStyles.manualError}>{error}</Text> : null}

        <TouchableOpacity
          style={[feedStyles.manualSubmit, saving && { opacity: 0.65 }]}
          activeOpacity={0.88}
          disabled={saving}
          onPress={onSubmit}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={feedStyles.manualSubmitText}>Save workout</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const ActivityBodyMap: React.FC<{
  metadata?: Record<string, unknown>;
  compact?: boolean;
}> = ({ metadata, compact }) => {
  const muscles = getActivityMuscles(metadata);
  if (!muscles.length) return null;

  const frontMuscles = muscles.filter((muscle) => FRONT_MUSCLES.has(muscle));
  const backMuscles = muscles.filter((muscle) => BACK_MUSCLES.has(muscle));
  const showFront = frontMuscles.length > 0 || !backMuscles.length;
  const showBack = backMuscles.length > 0;

  return (
    <View style={feedStyles.bodyMapPreview}>
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        {[25, 50, 75].map((top) => (
          <View
            key={`h-${top}`}
            style={[
              feedStyles.mapGridLine,
              feedStyles.mapGridLineHorizontal,
              { top: `${top}%` },
            ]}
          />
        ))}
        {[25, 50, 75].map((left) => (
          <View
            key={`v-${left}`}
            style={[
              feedStyles.mapGridLine,
              feedStyles.mapGridLineVertical,
              { left: `${left}%` },
            ]}
          />
        ))}
      </View>
      <View style={feedStyles.bodyMapPreviewFigures}>
        {showFront ? (
          <View
            style={[
              feedStyles.bodyMapMiniFigure,
              compact && feedStyles.bodyMapMiniFigureCompact,
            ]}
          >
            <BodyMuscleFront
              isLight={false}
              activeMuscles={muscles}
              readOnly
              highlightColor={WORKOUT_ACCENT}
            />
          </View>
        ) : null}
        {showBack ? (
          <View
            style={[
              feedStyles.bodyMapMiniFigure,
              compact && feedStyles.bodyMapMiniFigureCompact,
            ]}
          >
            <BodyMuscleBack
              isLight={false}
              activeMuscles={muscles}
              readOnly
              highlightColor={WORKOUT_ACCENT_BLUE}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
};

const ActivityDetailModal: React.FC<{
  item: FeedItem | null;
  isLight: boolean;
  visible: boolean;
  onClose: () => void;
  onLike: (item: FeedItem) => void;
  onComment: (item: FeedItem) => void;
  onShare: (item: FeedItem) => void;
}> = ({ item, isLight, visible, onClose, onLike, onComment, onShare }) => {
  if (!item) return null;

  const isWorkout = item.type === "workout";
  const stats = buildStats(item);
  const caption = isWorkout ? getCaption(item.metadata) : "";
  const notes =
    typeof item.metadata?.notes === "string" ? item.metadata.notes.trim() : "";
  const imageUrls = getActivityImageUrls(
    item.metadata,
    "frontendSummary" in item ? item.frontendSummary : null,
  );
  const exercises = isWorkout ? getWorkoutExerciseRows(item.metadata) : [];
  const badges = isWorkout ? getEarnedWorkoutBadges(item.metadata) : [];
  const chips = isWorkout ? getActivityChips(item) : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={feedStyles.detailModalRoot}>
        <TouchableOpacity
          style={feedStyles.detailBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={feedStyles.detailSheet}>
          <View style={feedStyles.detailHandle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={feedStyles.detailContent}
          >
            <View style={feedStyles.detailHeader}>
              <View style={[feedStyles.avatar, isLight && feedStyles.avatarLight]}>
                <Text style={feedStyles.avatarText}>
                  {(item.avatarInitials || item.userName.slice(0, 2)).toUpperCase()}
                </Text>
              </View>
              <View style={feedStyles.detailHeaderCopy}>
                <Text style={feedStyles.detailUserName}>{item.userName}</Text>
                <Text style={feedStyles.detailMeta}>
                  {getActivityLabel(item)} | {formatTimeAgo(item.occurredAt)}
                </Text>
              </View>
              <TouchableOpacity
                style={feedStyles.detailCloseButton}
                activeOpacity={0.78}
                onPress={onClose}
              >
                <Ionicons name="close" size={22} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <Text style={feedStyles.detailTitle}>{getWorkoutDisplayTitle(item)}</Text>
            {caption || item.description ? (
              <Text style={feedStyles.detailBody}>
                {caption || item.description}
              </Text>
            ) : null}

            {imageUrls.length ? (
              <View style={feedStyles.detailImageRail}>
                {imageUrls.map((uri) => (
                  <Image
                    key={uri}
                    source={{ uri }}
                    style={feedStyles.detailImage}
                    resizeMode="cover"
                  />
                ))}
              </View>
            ) : null}

            {isWorkout ? (
              <View style={feedStyles.detailMapBlock}>
                <ActivityBodyMap metadata={item.metadata} />
              </View>
            ) : null}

            {isWorkout ? (
              <View style={feedStyles.detailStatsGrid}>
                {stats.map((stat) => (
                  <View key={stat.key} style={feedStyles.detailStatItem}>
                    <Ionicons name={stat.icon} size={18} color={WORKOUT_ACCENT_BLUE} />
                    <Text style={feedStyles.detailStatValue} numberOfLines={1}>
                      {stat.value}
                    </Text>
                    <Text style={feedStyles.detailStatLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {chips.length ? (
              <View style={feedStyles.detailChipRow}>
                {chips.map((chip) => (
                  <View key={chip.key} style={feedStyles.activityChip}>
                    <Ionicons name={chip.icon} size={13} color={chip.accent} />
                    <Text style={feedStyles.activityChipText}>{chip.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {exercises.length ? (
              <View style={feedStyles.detailSection}>
                <Text style={feedStyles.detailSectionTitle}>Exercises</Text>
                {exercises.map((exercise, index) => (
                  <View key={`${exercise.name}-${index}`} style={feedStyles.exerciseDetailRow}>
                    <View style={feedStyles.exerciseDetailIndex}>
                      <Text style={feedStyles.exerciseDetailIndexText}>{index + 1}</Text>
                    </View>
                    <View style={feedStyles.exerciseDetailCopy}>
                      <Text style={feedStyles.exerciseDetailName}>{exercise.name}</Text>
                      {exercise.volume ? (
                        <Text style={feedStyles.exerciseDetailVolume}>{exercise.volume}</Text>
                      ) : null}
                    </View>
                    {exercise.pr ? (
                      <View style={feedStyles.exercisePrPill}>
                        <Ionicons name="flash-outline" size={12} color="#111827" />
                        <Text style={feedStyles.exercisePrText}>PR</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {notes ? (
              <View style={feedStyles.detailSection}>
                <Text style={feedStyles.detailSectionTitle}>Notes</Text>
                <Text style={feedStyles.detailNotes}>{notes}</Text>
              </View>
            ) : null}

            {badges.length ? (
              <View style={feedStyles.detailSection}>
                <Text style={feedStyles.detailSectionTitle}>Badges</Text>
                {badges.map((badge) => (
                  <View key={badge.id} style={feedStyles.detailBadgeRow}>
                    <Ionicons name="shield-checkmark-outline" size={17} color="#D8B26E" />
                    <Text style={feedStyles.detailBadgeText}>{badge.name}</Text>
                    {badge.rarity ? (
                      <Text style={feedStyles.detailBadgeRarity}>{titleCase(badge.rarity)}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            <View style={feedStyles.detailActions}>
              <TouchableOpacity
                style={feedStyles.detailActionButton}
                activeOpacity={0.78}
                onPress={() => onLike(item)}
              >
                <Ionicons
                  name={item.likedByMe ? "heart" : "heart-outline"}
                  size={19}
                  color="#EF4444"
                />
                <Text style={feedStyles.detailActionText}>{item.likesCount ?? 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={feedStyles.detailActionButton}
                activeOpacity={0.78}
                onPress={() => onComment(item)}
              >
                <Ionicons name="chatbubble-outline" size={18} color="#CBD5E1" />
                <Text style={feedStyles.detailActionText}>{item.commentsCount ?? 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={feedStyles.detailActionButton}
                activeOpacity={0.78}
                onPress={() => onShare(item)}
              >
                <Ionicons name="share-social-outline" size={18} color="#CBD5E1" />
                <Text style={feedStyles.detailActionText}>{item.shareCount ?? 0}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export const FeedCard: React.FC<{
  item: FeedItem;
  isLight: boolean;
  onOpen: (item: FeedItem) => void;
  onLike: (item: FeedItem) => void;
  onComment: (item: FeedItem) => void;
  onShare: (item: FeedItem) => void;
}> = ({ item, isLight, onOpen, onLike, onComment, onShare }) => {
  const { width } = useWindowDimensions();
  const [mediaIndex, setMediaIndex] = useState(0);
  const icon3d = getFeedIcon3D(item.type);
  const stats = buildStats(item);
  const isChallenge = item.type === "challenge";
  const isWorkout = item.type === "workout";
  const takeaway = getWorkoutTakeaway(item);
  const prSummary = isWorkout ? getPrSummary(item.metadata) : "";
  const caption = isWorkout ? getCaption(item.metadata) : "";
  const imageUrls = getActivityImageUrls(item.metadata, "frontendSummary" in item ? item.frontendSummary : null);
  const mediaFrameWidth = Math.max(280, Math.min(560, width - 56));
  const mediaSlides = [
    ...imageUrls.map((uri) => ({ key: `image:${uri}`, type: "image" as const, uri })),
    ...(isWorkout ? [{ key: "body-map", type: "bodyMap" as const }] : []),
  ];
  const earnedBadges = isWorkout ? getEarnedWorkoutBadges(item.metadata) : [];
  const planName =
    isWorkout && typeof item.metadata?.plan_name === "string"
      ? item.metadata.plan_name.trim()
      : "";

  return (
    <TouchableOpacity
      style={[
        feedStyles.card,
        isWorkout && feedStyles.workoutCard,
        isLight && feedStyles.cardLight,
      ]}
      activeOpacity={0.92}
      onPress={() => onOpen(item)}
    >
      <View style={feedStyles.cardHeader}>
        <View style={[feedStyles.avatar, isLight && feedStyles.avatarLight]}>
          <Text
            style={[
              feedStyles.avatarText,
              isLight && feedStyles.avatarTextLight,
            ]}
          >
            {(item.avatarInitials || item.userName.slice(0, 2)).toUpperCase()}
          </Text>
        </View>
        <View style={feedStyles.cardHeaderText}>
          <Text
            style={[feedStyles.userName, isLight && feedStyles.userNameLight]}
          >
            {item.userName}
          </Text>
          <Text
            style={[feedStyles.metaText, isLight && feedStyles.metaTextLight]}
          >
            {getActivityLabel(item)} | {formatTimeAgo(item.occurredAt)}
          </Text>
        </View>
        <View
          style={[
            feedStyles.iconPill,
            isLight && feedStyles.iconPillLight,
          ]}
        >
          <FitnessIcon3D name={icon3d} size={28} active />
        </View>
        <TouchableOpacity style={feedStyles.moreButton} activeOpacity={0.75}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {!isWorkout ? (
        <View
          style={[
            feedStyles.statusBadge,
            isChallenge && feedStyles.statusBadgeChallenge,
          ]}
        >
          <Ionicons
            name={isChallenge ? "trophy-outline" : "checkmark-circle-outline"}
            size={14}
            color={isChallenge ? "#4338CA" : "#047857"}
          />
          <Text
            style={[
              feedStyles.statusBadgeText,
              isChallenge && feedStyles.statusBadgeTextChallenge,
            ]}
          >
            {isChallenge ? "Challenge completed" : getActivityLabel(item)}
          </Text>
        </View>
      ) : null}

      {prSummary ? (
        <View style={feedStyles.prBadge}>
          <Ionicons name="flash-outline" size={14} color="#E9A84A" />
          <Text style={feedStyles.prBadgeText}>{prSummary}</Text>
        </View>
      ) : null}

      {planName ? (
        <View style={feedStyles.prBadge}>
          <Ionicons name="calendar-outline" size={14} color="#60A5FA" />
          <Text style={feedStyles.prBadgeText} numberOfLines={1}>
            {planName}
          </Text>
        </View>
      ) : null}

      {earnedBadges.length ? (
        <View style={feedStyles.badgeUnlockRail}>
          {earnedBadges.map((badge) => (
            <View key={badge.id} style={feedStyles.badgeUnlockPill}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#D8B26E" />
              <Text style={feedStyles.badgeUnlockText} numberOfLines={1}>
                Unlocked {badge.name}
              </Text>
              {badge.rarity ? (
                <Text style={feedStyles.badgeUnlockRarity}>
                  {titleCase(badge.rarity)}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={feedStyles.activityBody}>
        <View style={feedStyles.activityCopy}>
          {isWorkout ? (
            <>
              <Text
                style={[
                  feedStyles.cardTitle,
                  isLight && feedStyles.cardTitleLight,
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {getWorkoutDisplayTitle(item)}
              </Text>
              <Text style={feedStyles.workoutSubtitle} numberOfLines={1}>
                {getWorkoutSubtitle(item)}
              </Text>
            </>
          ) : (
            <>
              <Text
                style={[
                  feedStyles.cardTitle,
                  isLight && feedStyles.cardTitleLight,
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {getWorkoutDisplayTitle(item)}
              </Text>
              {item.description ? (
                <Text
                  style={[
                    feedStyles.cardBody,
                    isLight && feedStyles.cardBodyLight,
                  ]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              ) : null}
            </>
          )}
          {caption ? (
            <Text style={feedStyles.activityCaption}>{caption}</Text>
          ) : null}
        </View>

        {mediaSlides.length > 1 ? (
          <View style={[feedStyles.mediaCarouselFrame, { width: mediaFrameWidth }]}>
            <View style={feedStyles.mediaCounter}>
              <Text style={feedStyles.mediaCounterText}>
                {Math.min(mediaIndex + 1, mediaSlides.length)}/{mediaSlides.length}
              </Text>
            </View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              onMomentumScrollEnd={(event) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                setMediaIndex(
                  Math.max(
                    0,
                    Math.min(mediaSlides.length - 1, Math.round(offsetX / mediaFrameWidth)),
                  ),
                );
              }}
            >
              {mediaSlides.map((slide) => (
                <View key={slide.key} style={[feedStyles.mediaSlide, { width: mediaFrameWidth }]}>
                  {slide.type === "image" ? (
                    <Image
                      source={{ uri: slide.uri }}
                      style={feedStyles.activityImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <ActivityBodyMap metadata={item.metadata} />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        ) : isWorkout ? (
          <View style={feedStyles.activityMapColumn}>
            <ActivityBodyMap metadata={item.metadata} />
          </View>
        ) : imageUrls.length === 1 ? (
          <View style={[feedStyles.mediaCarouselFrame, { width: mediaFrameWidth }]}>
            <Image
              source={{ uri: imageUrls[0] }}
              style={feedStyles.activityImage}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {isWorkout ? (
          <View
            style={[feedStyles.statsRow, isLight && feedStyles.statsRowLight]}
          >
            {stats.map((stat, index) => (
              <View
                key={stat.key}
                style={[
                  feedStyles.statItem,
                  index > 0 && feedStyles.statItemBorder,
                  isLight && index > 0 && feedStyles.statItemBorderLight,
                ]}
              >
                <Ionicons
                  name={stat.icon}
                  size={19}
                  color={
                    stat.key === "intensity"
                      ? WORKOUT_ACCENT
                      : WORKOUT_ACCENT_BLUE
                  }
                />
                <Text
                  style={[
                    feedStyles.statValue,
                    isLight && feedStyles.statValueLight,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {stat.value}
                </Text>
                <Text
                  style={[
                    feedStyles.statLabel,
                    isLight && feedStyles.statLabelLight,
                  ]}
                  numberOfLines={1}
                >
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {isWorkout ? (
          <>
            <View style={feedStyles.takeawayCard}>
              <View style={feedStyles.takeawayIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={22}
                  color={WORKOUT_SUCCESS}
                />
              </View>
              <View style={feedStyles.takeawayCopy}>
                <Text style={feedStyles.takeawayTitle}>{takeaway.title}</Text>
                <Text style={feedStyles.takeawayBody}>{takeaway.body}</Text>
              </View>
              <View style={feedStyles.takeawayScoreBlock}>
                <Text style={feedStyles.takeawayScore}>{takeaway.score}</Text>
                <Text style={feedStyles.takeawayLabel}>{takeaway.label}</Text>
              </View>
            </View>

            <View style={feedStyles.competitionRow}>
              <View style={feedStyles.competitionItem}>
                <Ionicons
                  name="trending-up-outline"
                  size={15}
                  color={WORKOUT_ACCENT_BLUE}
                />
                <Text style={feedStyles.competitionText}>
                  Rank +12 this week
                </Text>
              </View>
              <View style={feedStyles.competitionItem}>
                <Ionicons
                  name="people-outline"
                  size={15}
                  color={WORKOUT_TEXT_SECONDARY}
                />
                <Text style={feedStyles.competitionText}>
                  3 friends trained today
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </View>

      {isWorkout ? (
        <>
          <View style={feedStyles.socialProofRow}>
            <View style={feedStyles.socialMetric}>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => onLike(item)}
              >
                <Ionicons
                  name={item.likedByMe ? "heart" : "heart-outline"}
                  size={22}
                  color="#EF4444"
                />
              </TouchableOpacity>
              <Text style={feedStyles.socialMetricText}>
                {item.likesCount ?? 0}
              </Text>
            </View>
            <View style={feedStyles.socialMetric}>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => onComment(item)}
              >
                <Ionicons name="chatbubble-outline" size={21} color="#E5E7EB" />
              </TouchableOpacity>
              <Text style={feedStyles.socialMetricText}>
                {item.commentsCount ?? 0}
              </Text>
            </View>
            <View style={feedStyles.socialSpacer} />
            <TouchableOpacity
              style={feedStyles.socialIconButton}
              activeOpacity={0.78}
            >
              <Ionicons name="bookmark-outline" size={21} color="#E5E7EB" />
            </TouchableOpacity>
            <TouchableOpacity
              style={feedStyles.socialIconButton}
              activeOpacity={0.78}
              onPress={() => onShare(item)}
            >
              <Ionicons name="share-social-outline" size={21} color="#E5E7EB" />
            </TouchableOpacity>
          </View>
          <View style={feedStyles.likedByRow}>
            <View style={feedStyles.likedAvatarStack}>
              {["R", "A", "J"].map((initial, index) => (
                <View
                  key={initial}
                  style={[
                    feedStyles.likedAvatar,
                    index > 0 && { marginLeft: -7 },
                  ]}
                >
                  <Text style={feedStyles.likedAvatarText}>{initial}</Text>
                </View>
              ))}
            </View>
            <Text style={feedStyles.likedByText}>
              {(item.likesCount ?? 0) > 0
                ? `${item.likesCount} people liked this`
                : "Be first to support this workout"}
            </Text>
          </View>
        </>
      ) : null}

      {!isWorkout ? (
        <View
          style={[feedStyles.cardFooter, isLight && feedStyles.cardFooterLight]}
        >
          <TouchableOpacity
            style={feedStyles.footerAction}
            activeOpacity={0.78}
            onPress={() => onLike(item)}
          >
            <Ionicons
              name={item.likedByMe ? "heart" : "heart-outline"}
              size={17}
              color={item.likedByMe ? "#EF4444" : isLight ? "#475569" : "#CBD5E1"}
            />
            <Text
              style={[
                feedStyles.footerText,
                isLight && feedStyles.footerTextLight,
              ]}
            >
              {item.likesCount ?? 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={feedStyles.footerAction}
            activeOpacity={0.78}
            onPress={() => onComment(item)}
          >
            <Ionicons
              name="chatbubble-outline"
              size={16}
              color={isLight ? "#475569" : "#CBD5E1"}
            />
            <Text
              style={[
                feedStyles.footerText,
                isLight && feedStyles.footerTextLight,
              ]}
            >
              {item.commentsCount ?? 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={feedStyles.footerAction}
            activeOpacity={0.78}
            onPress={() => onShare(item)}
          >
            <Ionicons
              name="share-outline"
              size={17}
              color={isLight ? "#475569" : "#CBD5E1"}
            />
            <Text
              style={[
                feedStyles.footerText,
                isLight && feedStyles.footerTextLight,
              ]}
            >
              {item.shareCount ?? 0}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const ActivityCommentSheet: React.FC<{
  item: FeedItem | null;
  visible: boolean;
  isLight: boolean;
  comments: CommunityActivityComment[];
  body: string;
  loading: boolean;
  onBodyChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}> = ({
  item,
  visible,
  isLight,
  comments,
  body,
  loading,
  onBodyChange,
  onClose,
  onSubmit,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={feedStyles.detailModalRoot}>
      <TouchableOpacity
        style={feedStyles.detailBackdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[feedStyles.commentSheet, isLight && feedStyles.commentSheetLight]}>
        <View style={feedStyles.detailHandle} />
        <View style={feedStyles.commentHeader}>
          <Text style={[feedStyles.detailSectionTitle, isLight && { color: "#0F172A" }]}>
            Comments
          </Text>
          <TouchableOpacity activeOpacity={0.78} onPress={onClose}>
            <Ionicons name="close" size={22} color={isLight ? "#0F172A" : "#CBD5E1"} />
          </TouchableOpacity>
        </View>
        {item ? (
          <Text
            style={[feedStyles.commentContext, isLight && feedStyles.commentContextLight]}
            numberOfLines={1}
          >
            {item.userName} / {getWorkoutDisplayTitle(item)}
          </Text>
        ) : null}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={feedStyles.commentList}
        >
          {loading && !comments.length ? (
            <ActivityIndicator color={PS_BLUE} />
          ) : comments.length ? (
            comments.map((comment) => (
              <View key={comment.id} style={feedStyles.commentRow}>
                <View style={feedStyles.commentAvatar}>
                  <Text style={feedStyles.commentAvatarText}>
                    {(comment.avatarInitials || comment.userName.slice(0, 2)).toUpperCase()}
                  </Text>
                </View>
                <View style={[feedStyles.commentBubble, isLight && feedStyles.commentBubbleLight]}>
                  <Text style={[feedStyles.commentName, isLight && feedStyles.commentNameLight]}>{comment.userName}</Text>
                  <Text style={[feedStyles.commentBody, isLight && feedStyles.commentBodyLight]}>{comment.body}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[feedStyles.emptyFeedBody, isLight && { color: "#64748B" }]}>
              No comments yet.
            </Text>
          )}
        </ScrollView>
        <View style={feedStyles.commentComposer}>
          <TextInput
            style={[feedStyles.commentInput, isLight && feedStyles.commentInputLight]}
            value={body}
            onChangeText={onBodyChange}
            placeholder="Write a comment"
            placeholderTextColor="#64748B"
            multiline
          />
          <TouchableOpacity
            activeOpacity={0.84}
            disabled={loading || !body.trim()}
            onPress={onSubmit}
            style={[feedStyles.commentSendButton, (!body.trim() || loading) && { opacity: 0.55 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const HomeFeedScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const { width } = useWindowDimensions();
  const navigation = useNavigation<FeedNavigation>();
  const {
    me,
    activity,
    loading,
    error,
    reload,
    likeActivity,
    shareActivity,
    loadActivityComments,
    addActivityComment,
  } = useCommunity();
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [manualVisible, setManualVisible] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualDuration, setManualDuration] = useState("45");
  const [manualExerciseCount, setManualExerciseCount] = useState("5");
  const [manualType, setManualType] = useState("strength");
  const [manualGroups, setManualGroups] = useState<string[]>(["chest"]);
  const [manualCardio, setManualCardio] = useState(false);
  const [selectedPost, setSelectedPost] = useState<FeedItem | null>(null);
  const [commentPost, setCommentPost] = useState<FeedItem | null>(null);
  const [comments, setComments] = useState<CommunityActivityComment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  const feedItems = useMemo<FeedItem[]>(() => {
    const realItems = (activity ?? []).map((item) => ({
      ...item,
      synthetic: false as const,
    }));
    return realItems;
  }, [activity]);
  const loggedWeekDays = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const days = new Set<number>();
    feedItems.forEach((item) => {
      if (item.type !== "workout") return;
      const date = new Date(item.occurredAt);
      if (Number.isNaN(date.getTime()) || date < monday) return;
      const dayIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
      days.add(dayIndex);
    });
    return Array.from(days);
  }, [feedItems]);
  const metricCardWidth = Math.max(280, width - 32);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const toggleManualGroup = (group: string) => {
    setManualError(null);
    setManualGroups((prev) =>
      prev.includes(group)
        ? prev.filter((item) => item !== group)
        : [...prev, group],
    );
  };

  const submitManualWorkout = async () => {
    if (!accessToken) {
      setManualError("Sign in again to save this workout.");
      return;
    }
    if (!manualGroups.length && !manualCardio) {
      setManualError("Select a focus area or cardio.");
      return;
    }

    setManualSaving(true);
    setManualError(null);
    const manualFocus = manualGroups.length
      ? manualGroups.slice(0, 2).map(titleCase).join(" + ")
      : manualCardio
        ? "Cardio"
        : titleCase(manualType);
    const manualTitle =
      manualType === "cardio"
        ? "Cardio Session"
        : manualType === "conditioning"
          ? "Conditioning Session"
          : manualType === "mobility"
            ? "Mobility Reset"
            : manualType === "sport"
              ? "Sport Session"
              : `${manualFocus} Strength`;
    const payload = {
      body_groups: manualGroups,
      muscles: Array.from(
        new Set(manualGroups.flatMap((group) => GROUP_TO_MUSCLES[group] ?? [])),
      ),
      body_map_side: "front",
      exercise_count: Number(manualExerciseCount) || 1,
      duration_minutes: Number(manualDuration) || 30,
      cardio: manualCardio,
      mode: manualType,
      entry_source: "manual",
      title: manualTitle,
      focus_label: manualFocus,
      intensity: "Logged",
    };

    const request = (token: string) =>
      fetch(`${API_BASE_URL}/workouts/log/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

    try {
      let tokenToUse = accessToken;
      let response = await request(tokenToUse);
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          await signOut();
          setManualError("Session expired. Please sign in again.");
          return;
        }
        tokenToUse = refreshed;
        response = await request(tokenToUse);
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data && typeof data.detail === "string"
            ? data.detail
            : "Could not save workout.",
        );
      }

      setManualVisible(false);
      setManualDuration("45");
      setManualExerciseCount("5");
      setManualType("strength");
      setManualGroups(["chest"]);
      setManualCardio(false);
      await reload();
    } catch (err) {
      setManualError(
        err instanceof Error ? err.message : "Could not save workout.",
      );
    } finally {
      setManualSaving(false);
    }
  };

  const openComments = async (item: FeedItem) => {
    setCommentPost(item);
    setCommentBody("");
    setComments([]);
    try {
      setCommentsLoading(true);
      setComments(await loadActivityComments(item.id));
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async () => {
    if (!commentPost || !commentBody.trim()) return;
    try {
      setCommentsLoading(true);
      const comment = await addActivityComment(commentPost.id, commentBody.trim());
      setComments((prev) => [...prev, comment]);
      setCommentPost((prev) =>
        prev
          ? { ...prev, commentsCount: (prev.commentsCount ?? 0) + 1 }
          : prev,
      );
      setCommentBody("");
      await reload();
    } finally {
      setCommentsLoading(false);
    }
  };

  return (
    <>
      <ScrollView
        style={[feedStyles.screen, isLight && feedStyles.screenLight]}
        contentContainerStyle={feedStyles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={reload}
            tintColor={PS_BLUE}
            colors={[PS_BLUE]}
          />
        }
      >
        <AppHeader
          isLight={isLight}
          title="Home"
          subtitle="Your fitness community"
          userName={me?.name ?? null}
          onThemeToggle={toggle}
        />

        <MetricRail
          streakDays={me?.streakDays}
          thisWeekPoints={(me?.recentSessionsThisWeek ?? 0) * 120 || 842}
          loggedWeekDays={loggedWeekDays}
          cardWidth={metricCardWidth}
          onRecord={() => setManualVisible(true)}
        />

        {error ? (
          <Text
            style={[feedStyles.errorText, isLight && feedStyles.errorTextLight]}
          >
            {error}
          </Text>
        ) : null}

        {loading && !feedItems.length ? (
          <View style={feedStyles.loadingWrap}>
            <ActivityIndicator color={PS_BLUE} />
          </View>
        ) : !feedItems.length ? (
          <View style={feedStyles.emptyFeed}>
            <Ionicons name="barbell-outline" size={24} color="#64748B" />
            <Text style={feedStyles.emptyFeedTitle}>No activity this week</Text>
            <Text style={feedStyles.emptyFeedBody}>
              Record or manually log a workout to start your feed.
            </Text>
          </View>
        ) : (
          feedItems.map((item) => (
            <FeedCard
              key={`${item.id}-${item.type}`}
              item={item}
              isLight={isLight}
              onOpen={setSelectedPost}
              onLike={(activityItem) =>
                void likeActivity(
                  activityItem.id,
                  Boolean(activityItem.likedByMe),
                )
              }
              onComment={(activityItem) =>
                void openComments(activityItem)
              }
              onShare={(activityItem) => void shareActivity(activityItem.id)}
            />
          ))
        )}
      </ScrollView>

      <ManualWorkoutModal
        visible={manualVisible}
        saving={manualSaving}
        error={manualError}
        duration={manualDuration}
        exerciseCount={manualExerciseCount}
        selectedType={manualType}
        selectedGroups={manualGroups}
        includeCardio={manualCardio}
        onClose={() => setManualVisible(false)}
        onDurationChange={setManualDuration}
        onExerciseCountChange={setManualExerciseCount}
        onTypeChange={setManualType}
        onToggleGroup={toggleManualGroup}
        onToggleCardio={() => setManualCardio((prev) => !prev)}
        onSubmit={submitManualWorkout}
      />
      <ActivityDetailModal
        visible={!!selectedPost}
        item={selectedPost}
        isLight={isLight}
        onClose={() => setSelectedPost(null)}
        onLike={(activityItem) =>
          void likeActivity(activityItem.id, Boolean(activityItem.likedByMe))
        }
        onComment={(activityItem) =>
          void openComments(activityItem)
        }
        onShare={(activityItem) => void shareActivity(activityItem.id)}
      />
      <ActivityCommentSheet
        visible={!!commentPost}
        item={commentPost}
        isLight={isLight}
        comments={comments}
        body={commentBody}
        loading={commentsLoading}
        onBodyChange={setCommentBody}
        onClose={() => setCommentPost(null)}
        onSubmit={submitComment}
      />
    </>
  );
};

const feedStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0C1828",
  },
  screenLight: {
    backgroundColor: "#0C1828",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 118,
  },
  metricRailWrap: {
    marginHorizontal: -16,
    marginBottom: 20,
  },
  metricRailContent: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  metricCard: {
    width: 204,
    minHeight: 214,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 22,
    marginRight: 12,
    backgroundColor: "#080E18",
    borderWidth: 1,
    borderColor: "rgba(161,167,184,0.34)",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  metricTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  metricLabel: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    minHeight: 48,
  },
  metricValue: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 42,
    lineHeight: 48,
  },
  metricUnit: {
    marginLeft: 6,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiMedium,
    fontSize: 18,
  },
  metricSubLabel: {
    marginTop: 4,
    color: "#F7F8FA",
    fontFamily: fontFamily.uiMedium,
    fontSize: 15,
  },
  metricCaption: {
    marginTop: 12,
    color: "#8EA0B8",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  metricChallengeBlock: {
    marginTop: 18,
  },
  metricChallengePrefix: {
    color: "#F7F8FA",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
  },
  metricChallengeRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricChallengeValue: {
    color: "#C084FC",
    fontFamily: fontFamily.uiBold,
    fontSize: 28,
    lineHeight: 34,
  },
  streakWeek: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  streakDay: {
    alignItems: "center",
    marginRight: 7,
  },
  streakDayLabel: {
    color: "#8EA0B8",
    fontFamily: fontFamily.uiBold,
    fontSize: 10,
  },
  streakCheck: {
    marginTop: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.34)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,17,31,0.74)",
  },
  streakCheckActive: {
    backgroundColor: "#6D7DFF",
    borderColor: "#6D7DFF",
  },
  metricProgressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.26)",
    overflow: "hidden",
    marginTop: 18,
    maxWidth: 142,
  },
  metricProgressFill: {
    width: "67%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#4CE4D0",
  },
  metricDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  metricDot: {
    width: 18,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.22)",
    marginHorizontal: 5,
  },
  metricDotActive: {
    backgroundColor: "#6D7DFF",
  },
  composer: {
    marginHorizontal: 16,
    minHeight: 68,
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  composerPlus: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,232,240,0.34)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  composerText: {
    flex: 1,
    color: "#AAB4C3",
    fontFamily: fontFamily.uiMedium,
    fontSize: 16,
  },
  manualModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  manualModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  manualModalCard: {
    margin: 14,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#111F33",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  manualModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  manualModalTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 22,
    lineHeight: 28,
  },
  manualLabel: {
    color: "#94A3B8",
    fontFamily: fontFamily.uiSemi,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  manualChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 14,
  },
  manualChip: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "rgba(16,31,53,0.72)",
  },
  manualChipActive: {
    backgroundColor: "#E8FFF4",
    borderColor: "#E8FFF4",
  },
  manualChipText: {
    color: "#CBD5E1",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  manualChipTextActive: {
    color: "#07111F",
  },
  manualInputRow: {
    flexDirection: "row",
    marginHorizontal: -5,
  },
  manualInputBlock: {
    flex: 1,
    marginHorizontal: 5,
  },
  manualInput: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 13,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 16,
    backgroundColor: "#101F35",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  manualError: {
    marginTop: 12,
    color: "#FCA5A5",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
  },
  manualSubmit: {
    marginTop: 16,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  manualSubmitText: {
    color: "#FFFFFF",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  detailModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.64)",
  },
  detailSheet: {
    maxHeight: "92%",
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  detailHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    marginTop: 10,
    backgroundColor: "rgba(203,213,225,0.28)",
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  detailHeaderCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  detailUserName: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  detailMeta: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  detailCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.10)",
  },
  detailTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: 0,
  },
  detailBody: {
    marginTop: 9,
    color: "#E2E8F0",
    fontFamily: fontFamily.uiMedium,
    fontSize: 15,
    lineHeight: 22,
  },
  detailImageRail: {
    marginTop: 16,
    gap: 10,
  },
  detailImage: {
    width: "100%",
    height: 320,
    borderRadius: 18,
    backgroundColor: "#111F33",
  },
  detailMapBlock: {
    marginTop: 16,
  },
  detailStatsGrid: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  detailStatItem: {
    width: "50%",
    minHeight: 78,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detailStatValue: {
    marginTop: 6,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  detailStatLabel: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 11,
  },
  detailChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },
  detailSection: {
    marginTop: 20,
  },
  detailSectionTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
    marginBottom: 10,
  },
  exerciseDetailRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.12)",
  },
  exerciseDetailIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "rgba(96,165,250,0.14)",
  },
  exerciseDetailIndexText: {
    color: "#BFDBFE",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  exerciseDetailCopy: {
    flex: 1,
    minWidth: 0,
  },
  exerciseDetailName: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  exerciseDetailVolume: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  exercisePrPill: {
    minHeight: 26,
    borderRadius: 999,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2C16F",
  },
  exercisePrText: {
    marginLeft: 4,
    color: "#111827",
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
  },
  detailNotes: {
    color: "#CBD5E1",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 21,
  },
  detailBadgeRow: {
    minHeight: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(216,178,110,0.10)",
    borderWidth: 1,
    borderColor: "rgba(216,178,110,0.20)",
  },
  detailBadgeText: {
    flex: 1,
    marginLeft: 8,
    color: "#F5D38B",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  detailBadgeRarity: {
    color: "#94A3B8",
    fontFamily: fontFamily.uiSemi,
    fontSize: 11,
    textTransform: "uppercase",
  },
  detailActions: {
    marginTop: 22,
    flexDirection: "row",
    gap: 10,
  },
  detailActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.10)",
  },
  detailActionText: {
    marginLeft: 7,
    color: "#E5E7EB",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  commentSheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: "#0B1626",
  },
  commentSheetLight: {
    backgroundColor: "#FFFFFF",
  },
  commentHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commentContext: {
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    marginBottom: 12,
  },
  commentContextLight: {
    color: "#64748B",
  },
  commentList: {
    maxHeight: 360,
  },
  commentRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,107,255,0.22)",
  },
  commentAvatarText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
  },
  commentBubble: {
    flex: 1,
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "rgba(148,163,184,0.10)",
  },
  commentBubbleLight: {
    backgroundColor: "#F1F5F9",
  },
  commentName: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  commentNameLight: {
    color: "#0F172A",
  },
  commentBody: {
    marginTop: 4,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  commentBodyLight: {
    color: "#475569",
  },
  commentComposer: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 18,
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(148,163,184,0.10)",
  },
  commentInput: {
    flex: 1,
    maxHeight: 92,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    paddingVertical: 10,
  },
  commentInputLight: {
    color: "#0F172A",
  },
  commentSendButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PS_BLUE,
  },
  hero: {
    minHeight: 158,
    borderRadius: 0,
    overflow: "hidden",
    justifyContent: "flex-start",
    marginBottom: 10,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.16)",
  },
  heroCopy: {
    width: "100%",
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 18,
  },
  eyebrow: {
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#A7F3D0",
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: fontFamily.uiBold,
    fontSize: 29,
    lineHeight: 34,
    color: "#FFFFFF",
    letterSpacing: 0,
  },
  heroBody: {
    marginTop: 10,
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 21,
    color: "#F8FAFC",
  },
  recordButton: {
    marginTop: 18,
    minHeight: 46,
    alignSelf: "flex-start",
    paddingLeft: 14,
    paddingRight: 20,
    borderRadius: 16,
    backgroundColor: "#E8FFF4",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  recordIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#111827",
    marginRight: 10,
  },
  recordButtonText: {
    color: "#111827",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  quickRow: {
    flexDirection: "row",
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.16)",
    paddingBottom: 12,
  },
  quickAction: {
    flex: 1,
    minHeight: 58,
    borderRadius: 0,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginRight: 10,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  quickIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#101F35",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  quickCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  quickSubText: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.ui,
    fontSize: 12,
  },
  loadingWrap: {
    paddingVertical: 34,
  },
  emptyFeed: {
    paddingVertical: 34,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.14)",
  },
  emptyFeedTitle: {
    marginTop: 10,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 16,
  },
  emptyFeedBody: {
    marginTop: 5,
    color: "#8EA0B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    textAlign: "center",
  },
  errorText: {
    color: "#FCA5A5",
    fontFamily: fontFamily.uiMedium,
    marginBottom: 12,
  },
  errorTextLight: {
    color: "#B91C1C",
  },
  card: {
    paddingVertical: 18,
    paddingHorizontal: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.14)",
    marginBottom: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  workoutCard: {
    backgroundColor: "transparent",
    borderColor: "rgba(148,163,184,0.14)",
    shadowOpacity: 0,
    elevation: 0,
  },
  cardLight: {
    backgroundColor: "transparent",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,107,255,0.18)",
    borderWidth: 0,
  },
  avatarLight: {
    backgroundColor: "#101F35",
    borderColor: "rgba(148,163,184,0.12)",
  },
  avatarText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  avatarTextLight: {
    color: "#F8FAFC",
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 11,
  },
  userName: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  userNameLight: {
    color: "#F8FAFC",
  },
  metaText: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
  },
  metaTextLight: {
    color: "#94A3B8",
  },
  iconPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginRight: 8,
  },
  iconPillLight: {
    backgroundColor: "transparent",
  },
  moreButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: "rgba(16,185,129,0.14)",
    marginBottom: 12,
  },
  statusBadgeChallenge: {
    backgroundColor: "rgba(99,102,241,0.16)",
  },
  statusBadgeText: {
    marginLeft: 6,
    color: "#D1FAE5",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    textTransform: "uppercase",
  },
  statusBadgeTextChallenge: {
    color: "#C7D2FE",
  },
  prBadge: {
    alignSelf: "flex-start",
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(233,168,74,0.14)",
  },
  prBadgeText: {
    marginLeft: 6,
    color: "#F2C16F",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  badgeUnlockRail: {
    marginBottom: 12,
    gap: 8,
  },
  badgeUnlockPill: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(216,178,110,0.12)",
    borderWidth: 1,
    borderColor: "rgba(216,178,110,0.24)",
  },
  badgeUnlockText: {
    marginLeft: 6,
    color: "#F5D38B",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    flexShrink: 1,
  },
  badgeUnlockRarity: {
    marginLeft: 8,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 11,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 22,
    lineHeight: 27,
    flexShrink: 1,
  },
  cardTitleLight: {
    color: "#F8FAFC",
  },
  cardBody: {
    marginTop: 8,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  workoutSubtitle: {
    marginTop: 5,
    color: "#B8C2D4",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  activityCaption: {
    marginTop: 4,
    marginBottom: 12,
    color: "#E2E8F0",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  activityImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    backgroundColor: "rgba(17,31,51,0.72)",
  },
  mediaCarouselFrame: {
    marginTop: 14,
    marginBottom: 16,
    height: 292,
    alignSelf: "center",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(7,16,29,0.92)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.12)",
  },
  mediaSlide: {
    height: 292,
    justifyContent: "center",
    overflow: "hidden",
  },
  mediaCounter: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 3,
    minWidth: 42,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,16,29,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  mediaCounterText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  cardBodyLight: {
    color: "#CBD5E1",
  },
  activityBody: {
    marginTop: 2,
  },
  activityMapColumn: {
    marginTop: 16,
    marginBottom: 16,
  },
  activityCopy: {
    flex: 1,
    minWidth: 0,
  },
  bodyMapPreview: {
    minHeight: 274,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderTopWidth: 1,
    borderColor: "rgba(124,107,255,0.14)",
    overflow: "hidden",
    position: "relative",
  },
  mapCorner: {
    position: "absolute",
    width: 18,
    height: 18,
    borderColor: "rgba(96,165,250,0.38)",
    zIndex: 1,
  },
  mapGridLine: {
    position: "absolute",
    backgroundColor: "rgba(96,165,250,0.055)",
  },
  mapGridLineHorizontal: {
    left: 0,
    right: 0,
    height: 1,
  },
  mapGridLineVertical: {
    top: 0,
    bottom: 0,
    width: 1,
  },
  mapCornerTopLeft: {
    top: 10,
    left: 10,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  mapCornerTopRight: {
    top: 10,
    right: 10,
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  mapCornerBottomLeft: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
  },
  mapCornerBottomRight: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  bodyMapPreviewFigures: {
    height: 274,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  bodyMapMiniFigure: {
    width: 142,
    height: 238,
    marginHorizontal: 7,
  },
  bodyMapMiniFigureCompact: {
    width: 116,
    height: 168,
  },
  statsRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "stretch",
    minWidth: 0,
  },
  statsRowLight: {
    borderTopColor: "rgba(148,163,184,0.16)",
    borderBottomColor: "rgba(148,163,184,0.16)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 10,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    minWidth: 0,
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(148,163,184,0.16)",
  },
  statItemBorderLight: {
    borderLeftColor: "rgba(148,163,184,0.20)",
  },
  statValue: {
    marginTop: 6,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
    textAlign: "center",
  },
  statValueLight: {
    color: "#F8FAFC",
  },
  statLabel: {
    marginTop: 3,
    color: WORKOUT_TEXT_SECONDARY,
    fontFamily: fontFamily.ui,
    fontSize: 11,
    textAlign: "center",
  },
  statLabelLight: {
    color: "#94A3B8",
  },
  challengePanel: {
    marginTop: 14,
    borderRadius: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  challengeIconMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(99,102,241,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  challengePanelTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  challengePanelBody: {
    marginTop: 4,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
  },
  highlightChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(147,197,253,0.12)",
    marginRight: 8,
    marginBottom: 8,
  },
  highlightChipLight: {
    backgroundColor: "rgba(147,197,253,0.12)",
  },
  highlightText: {
    color: "#BFDBFE",
    fontFamily: fontFamily.uiSemi,
    fontSize: 12,
  },
  highlightTextLight: {
    color: "#BFDBFE",
  },
  activityChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
  },
  activityChip: {
    minHeight: 34,
    maxWidth: "46%",
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,31,53,0.78)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  activityChipText: {
    marginLeft: 7,
    color: "#E5E7EB",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    flexShrink: 1,
    minWidth: 0,
  },
  takeawayCard: {
    marginTop: 16,
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "rgba(91,140,255,0.16)",
  },
  takeawayIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(45,186,122,0.14)",
  },
  takeawayCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  takeawayTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
    flexShrink: 1,
  },
  takeawayBody: {
    marginTop: 3,
    color: "#B8C2D4",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  takeawayScoreBlock: {
    alignItems: "flex-end",
  },
  takeawayScore: {
    color: WORKOUT_SUCCESS,
    fontFamily: fontFamily.uiBold,
    fontSize: 24,
  },
  takeawayLabel: {
    marginTop: 2,
    color: "#B8C2D4",
    fontFamily: fontFamily.uiMedium,
    fontSize: 11,
  },
  competitionRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  competitionItem: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(148,163,184,0.08)",
  },
  competitionText: {
    marginLeft: 6,
    color: WORKOUT_TEXT_SECONDARY,
    fontFamily: fontFamily.uiSemi,
    fontSize: 12,
  },
  socialProofRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  socialMetric: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  socialMetricText: {
    marginLeft: 8,
    color: "#D9E2F1",
    fontFamily: fontFamily.uiSemi,
    fontSize: 15,
  },
  socialSpacer: {
    flex: 1,
  },
  socialIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  likedByRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  likedAvatarStack: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  likedAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#23324B",
    borderWidth: 1,
    borderColor: "#07111F",
  },
  likedAvatarText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 9,
  },
  likedByText: {
    flex: 1,
    color: "#8EA0B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
  },
  cardFooter: {
    marginTop: 14,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.16)",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardFooterLight: {
    borderTopColor: "rgba(148,163,184,0.16)",
  },
  footerAction: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 30,
  },
  footerText: {
    marginLeft: 9,
    color: "#E5E7EB",
    fontFamily: fontFamily.uiSemi,
    fontSize: 15,
  },
  footerTextLight: {
    color: "#E5E7EB",
  },
});

export default HomeFeedScreen;
