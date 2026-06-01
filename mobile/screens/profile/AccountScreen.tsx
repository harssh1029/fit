import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  API_BASE_URL,
  fetchCachedJson,
  fetchRequiredAuth,
  invalidateApiCache,
} from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import ExerciseDetailSheet from "../../components/ExerciseDetailSheet";
import {
  GLASS_ACCENT_GREEN,
  PS_BLUE,
  WORKOUT_ACCENT_BLUE,
  WORKOUT_SUCCESS,
  WORKOUT_WARNING,
} from "../../styles/theme";
import {
  useAuth,
  useExercisePrs,
  useThemeMode,
  styles,
} from "../../App";
import { useAllWorkoutHistory } from "../../hooks/useAllWorkoutHistory";
import { useAchievements } from "../../hooks/useAchievements";
import { fontFamily } from "../../styles/typography";
import { loadExerciseDemoIds } from "../../utils/exerciseLookup";
import type { ProfileStackParamList, UserProfile } from "../../App";

type ProfileSummary = {
  public_card?: {
    avatarInitials?: string;
    avatarUrl?: string;
    followersCount?: number;
    followingCount?: number;
    postCount?: number;
    performanceScore?: number;
    weeklyXp?: number;
    bodyBalancePercent?: number;
    fitnessAgeYears?: number | null;
    activePlanName?: string | null;
    tier?: string;
  };
  prs?: any[];
  challenges?: any[];
  joined_challenges?: any[];
  groups?: any[];
  posts?: any[];
  achievements?: any;
  insights?: {
    workout_count?: number;
    score_summary?: {
      total_xp?: number;
      weekly_xp?: number;
      performance_score?: number;
      training_balance_score?: number;
    };
  };
};

const BADGE_CATEGORY_EXAMPLES = [
  { key: "all", label: "All", icon: "flame-outline" as const },
  { key: "consistency", label: "Consistency", icon: "calendar-outline" as const },
  { key: "pr", label: "PRs", icon: "flash-outline" as const },
  { key: "challenge", label: "Challenges", icon: "trophy-outline" as const },
  { key: "leaderboard", label: "Leaderboards", icon: "podium-outline" as const },
  { key: "plan", label: "Plans", icon: "clipboard-outline" as const },
  { key: "group", label: "Groups", icon: "people-outline" as const },
  { key: "special", label: "Special", icon: "star-outline" as const },
];

const BADGE_EXAMPLE_COLUMNS = [
  ["Consistency", "Three Day Rhythm", "Five Day Discipline", "Unbroken Month", "Elite Discipline"],
  ["PRs", "New Personal Best", "Best Week", "Longest Session", "Most Consistent Week"],
  ["Challenges", "Challenge Finisher", "Challenge Winner", "Top 10 Challenger", "3 Challenges in a Month"],
  ["Leaderboards", "Top 10 Weekly", "Top 10 Monthly", "Group Champion", "Challenge Champion"],
  ["Plans", "Plan Starter", "Plan Finisher", "Strength Plan Finisher", "Perfect Plan Completion"],
  ["Groups", "Group Regular", "Group Contributor", "Group Leader", "Team Player"],
  ["Special", "Comeback Session", "Back in Rhythm", "90-Day Discipline", "Monthly Champion"],
];

const MOCK_RECENT_BADGES = [
  {
    id: -1,
    badge: {
      name: "Consistency Builder",
      description: "3 active weeks in a row",
      rarity: "rare",
      category: "consistency",
    },
  },
  {
    id: -2,
    badge: {
      name: "Push Week Finisher",
      description: "Completed Push Week challenge",
      rarity: "rare",
      category: "challenge",
    },
  },
  {
    id: -3,
    badge: {
      name: "Top 10 Weekly",
      description: "Ranked in top 10 this week",
      rarity: "elite",
      category: "leaderboard",
    },
  },
  {
    id: -4,
    badge: {
      name: "Plan Finisher",
      description: "Completed Strength Plan",
      rarity: "rare",
      category: "plan",
    },
  },
];

const MOCK_CATEGORY_LEVELS = [
  { category: "strength", tier: "gold", xp: 3680, nextTierXp: 3500 },
  { category: "cardio", tier: "silver", xp: 2150, nextTierXp: 3500 },
  { category: "consistency", tier: "platinum", xp: 7220, nextTierXp: 7500 },
  { category: "mobility", tier: "silver", xp: 1900, nextTierXp: 3500 },
  { category: "conditioning", tier: "gold", xp: 3900, nextTierXp: 3500 },
  { category: "sport", tier: "bronze", xp: 850, nextTierXp: 1500 },
];

const LEVEL_LADDER = [
  ["Rookie", "Level 1", "0 - 999 XP"],
  ["Builder", "Level 2", "1,000 - 3,999 XP"],
  ["Athlete", "Level 3", "4,000 - 9,999 XP"],
  ["Performer", "Level 4", "10,000 - 24,999 XP"],
  ["Elite", "Level 5", "25,000 - 59,999 XP"],
  ["Legend", "Level 6", "60,000+ XP"],
];

const PIPELINE_STEPS = [
  "Workout saved",
  "XP scored",
  "Progress synced",
  "Rules checked",
  "Badge earned",
  "User notified",
];

const titleize = (value: string) =>
  value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const categoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  switch (category) {
    case "strength":
      return "barbell-outline";
    case "cardio":
      return "heart-outline";
    case "conditioning":
      return "flash-outline";
    case "mobility":
      return "body-outline";
    case "sport":
      return "tennisball-outline";
    case "consistency":
      return "checkmark-circle-outline";
    case "challenge":
      return "trophy-outline";
    case "leaderboard":
      return "podium-outline";
    case "plan":
      return "clipboard-outline";
    case "group":
      return "people-outline";
    case "pr":
      return "flash-outline";
    case "special":
      return "star-outline";
    default:
      return "shield-checkmark-outline";
  }
};

const rarityColor = (rarity?: string) => {
  switch (rarity) {
    case "legendary":
      return "#F59E0B";
    case "elite":
      return "#A78BFA";
    case "rare":
      return "#60A5FA";
    default:
      return "#94A3B8";
  }
};

const resolveMediaUrl = (url?: string | null) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
};

const AccountScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { prs: exercisePrs } = useExercisePrs();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrSheetVisible, setIsPrSheetVisible] = useState(false);
  const [activeExerciseName, setActiveExerciseName] = useState<string | null>(
    null,
  );
  const [demoExerciseIds, setDemoExerciseIds] = useState<
    Record<string, string>
  >({});
  const [isWorkoutHistorySheetVisible, setIsWorkoutHistorySheetVisible] =
    useState(false);
  const [badgeCategory, setBadgeCategory] = useState("all");
  const [areProfileBadgesExpanded, setAreProfileBadgesExpanded] =
    useState(false);
  const [expandedBadgeId, setExpandedBadgeId] = useState<number | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const {
    items: allWorkoutHistoryItems,
    loading: allWorkoutHistoryLoading,
    error: allWorkoutHistoryError,
    reload: reloadAllWorkoutHistory,
  } = useAllWorkoutHistory();
  const { summary: achievementSummary, pinBadges } = useAchievements();
  const accountUserName =
    profile?.profile.display_name || profile?.username || null;
  const auth = { accessToken, refreshAccessToken, signOut };

  const chooseProfilePicture = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Photo access needed", "Allow photo access to choose a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.86,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const extension = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
    const formData = new FormData();
    formData.append(
      "image",
      {
        uri: asset.uri,
        name: `profile-picture.${extension}`,
        type: asset.mimeType || "image/jpeg",
      } as any,
    );
    setAvatarUploading(true);
    try {
      const response = await fetchRequiredAuth("/profiles/me/avatar/", auth, {
        method: "POST",
        body: formData,
      });
      const json = (await response.json().catch(() => ({}))) as {
        avatar_url?: string;
        detail?: string;
      };
      if (!response.ok || !json.avatar_url) {
        throw new Error(json.detail || "Unable to upload profile picture.");
      }
      invalidateApiCache("profile", "profile-summary", "community-summary", "community-activity");
      setProfile((current) =>
        current
          ? { ...current, profile: { ...current.profile, avatar_url: json.avatar_url } }
          : current,
      );
      setProfileSummary((current) =>
        current
          ? {
              ...current,
              public_card: {
                ...current.public_card,
                avatarUrl: json.avatar_url,
              },
            }
          : current,
      );
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "Unable to upload profile picture.",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const names = exercisePrs.map((pr) => pr.exerciseLabel);

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
  }, [exercisePrs]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const auth = { accessToken, refreshAccessToken, signOut };
        const [json, summaryJson] = await Promise.all([
          fetchCachedJson<UserProfile>("/me/", auth, {
            requiredAuth: true,
            tags: ["profile"],
          }),
          fetchCachedJson<ProfileSummary>("/profiles/me/summary/", auth, {
            requiredAuth: true,
            tags: ["profile-summary"],
          }),
        ]);
        if (isMounted) setProfile(json);
        if (isMounted) setProfileSummary(summaryJson);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Error loading profile",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshAccessToken, signOut]);

  if (loading) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Your profile"
          userName={accountUserName}
          avatarUrl={profile?.profile.avatar_url}
          onThemeToggle={toggle}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  if (!profile || error) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Your profile"
          userName={accountUserName}
          avatarUrl={profile?.profile.avatar_url}
          onThemeToggle={toggle}
        />
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          My Profile
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  const name = profile.profile.display_name || profile.username;
  const achievements = achievementSummary ?? profileSummary?.achievements ?? null;
  const level = achievements?.level;
  const displayLevel =
    level ?? {
      careerXp: 0,
      currentLevel: 1,
      currentTitle: "Rookie",
      currentLevelXp: 0,
      nextLevelXp: 1000,
    };
  const levelPercent =
    displayLevel.nextLevelXp > displayLevel.currentLevelXp
      ? Math.min(
          100,
          Math.round(
            ((displayLevel.careerXp - displayLevel.currentLevelXp) /
              (displayLevel.nextLevelXp - displayLevel.currentLevelXp)) *
              100,
          ),
        )
      : 100;
  const featuredBadges = achievements?.featuredBadges ?? [];
  const recentBadges = achievements?.recentBadges ?? [];
  const categoryLevels = achievements?.categoryLevels ?? [];
  const ecosystemBadges =
    badgeCategory === "all"
      ? recentBadges
      : recentBadges.filter((item: any) => item.badge.category === badgeCategory);
  const publicCard = profileSummary?.public_card;
  const profileBadges = [...featuredBadges, ...recentBadges].filter(
    (item: any, index: number, items: any[]) =>
      items.findIndex((candidate: any) => candidate.id === item.id) === index,
  );
  const visibleProfileBadges = areProfileBadgesExpanded
    ? profileBadges
    : profileBadges.slice(0, 3);
  const profilePrs = profileSummary?.prs?.length ? profileSummary.prs : exercisePrs;
  const topCategories = [...categoryLevels]
    .sort((a: any, b: any) => (Number(b.xp) || 0) - (Number(a.xp) || 0))
    .slice(0, 3);
  const completedPlans = achievements?.completedPlans ?? [];
  const completedChallenges = achievements?.completedChallenges ?? profileSummary?.challenges ?? [];
  const joinedChallenges = profileSummary?.joined_challenges ?? [];
  const avatarUrl = profile.profile.avatar_url || publicCard?.avatarUrl || "";
  const initials =
    publicCard?.avatarInitials ||
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const athleteType =
    topCategories[0]?.category
      ? `${titleize(topCategories[0].category)} focused`
      : publicCard?.activePlanName
        ? publicCard.activePlanName
        : "Building training history";

  const pinRecentBadge = (userBadgeId: number) => {
    const currentIds = featuredBadges.map((item: any) => item.id);
    const nextIds = [userBadgeId, ...currentIds.filter((id: number) => id !== userBadgeId)].slice(0, 3);
    void pinBadges(nextIds);
  };

  const renderBadgeEcosystem = () => (
    <View
      style={[
        ecosystemStyles.panel,
        isLight && ecosystemStyles.panelLight,
      ]}
    >
      <View style={ecosystemStyles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[
              ecosystemStyles.title,
              isLight && ecosystemStyles.titleLight,
            ]}
          >
            Badges & levels ecosystem
          </Text>
          <Text
            style={[
              ecosystemStyles.subtitle,
              isLight && ecosystemStyles.subtitleLight,
            ]}
          >
            Earn. Progress. Stand out.
          </Text>
        </View>
        <View
          style={[
            ecosystemStyles.levelSeal,
            isLight && ecosystemStyles.levelSealLight,
          ]}
        >
          <Text style={ecosystemStyles.levelSealNumber}>
            {displayLevel.currentLevel}
          </Text>
          <Text style={ecosystemStyles.levelSealLabel}>
            {displayLevel.currentTitle}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ecosystemStyles.categoryTabs}
      >
        {BADGE_CATEGORY_EXAMPLES.map((category) => {
          const selected = badgeCategory === category.key;
          return (
            <TouchableOpacity
              key={category.key}
              activeOpacity={0.86}
              onPress={() => setBadgeCategory(category.key)}
              style={[
                ecosystemStyles.categoryTab,
                isLight && ecosystemStyles.categoryTabLight,
                selected && ecosystemStyles.categoryTabSelected,
              ]}
            >
              <Ionicons
                name={category.icon}
                size={15}
                color={selected ? "#FFFFFF" : isLight ? "#475569" : "#B8C0D4"}
              />
              <Text
                style={[
                  ecosystemStyles.categoryTabText,
                  isLight && ecosystemStyles.categoryTabTextLight,
                  selected && ecosystemStyles.categoryTabTextSelected,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={ecosystemStyles.grid}>
        <View
          style={[
            ecosystemStyles.card,
            ecosystemStyles.levelCard,
            isLight && ecosystemStyles.cardLight,
          ]}
        >
          <Text
            style={[
              ecosystemStyles.cardTitle,
              isLight && ecosystemStyles.cardTitleLight,
            ]}
          >
            Level overview
          </Text>
          <Text
            style={[
              ecosystemStyles.levelTitle,
              isLight && ecosystemStyles.levelTitleLight,
            ]}
          >
            {displayLevel.currentTitle} · Level {displayLevel.currentLevel}
          </Text>
          <Text
            style={[
              ecosystemStyles.levelXp,
              isLight && ecosystemStyles.levelXpLight,
            ]}
          >
            {displayLevel.careerXp.toLocaleString()} /{" "}
            {displayLevel.nextLevelXp.toLocaleString()} XP
          </Text>
          <View
            style={[
              ecosystemStyles.progressTrack,
              isLight && ecosystemStyles.progressTrackLight,
            ]}
          >
            <View
              style={[
                ecosystemStyles.progressFill,
                { width: `${Math.max(5, levelPercent)}%` as any },
              ]}
            />
          </View>
          <View style={ecosystemStyles.ladder}>
            {LEVEL_LADDER.map(([title, levelLabel, xp]) => {
              const active = title === displayLevel.currentTitle;
              return (
                <View
                  key={title}
                  style={[
                    ecosystemStyles.ladderRow,
                    active && ecosystemStyles.ladderRowActive,
                  ]}
                >
                  <Text
                    style={[
                      ecosystemStyles.ladderText,
                      isLight && ecosystemStyles.ladderTextLight,
                      active && ecosystemStyles.ladderTextActive,
                    ]}
                  >
                    {title}
                  </Text>
                  <Text
                    style={[
                      ecosystemStyles.ladderMeta,
                      isLight && ecosystemStyles.ladderMetaLight,
                      active && ecosystemStyles.ladderTextActive,
                    ]}
                  >
                    {levelLabel}
                  </Text>
                  <Text
                    style={[
                      ecosystemStyles.ladderMeta,
                      isLight && ecosystemStyles.ladderMetaLight,
                      active && ecosystemStyles.ladderTextActive,
                    ]}
                  >
                    {xp}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            ecosystemStyles.card,
            isLight && ecosystemStyles.cardLight,
          ]}
        >
          <Text
            style={[
              ecosystemStyles.cardTitle,
              isLight && ecosystemStyles.cardTitleLight,
            ]}
          >
            Category levels
          </Text>
          {categoryLevels.map((item: any) => {
            const percent = item.nextTierXp
              ? Math.min(100, Math.round((item.xp / item.nextTierXp) * 100))
              : 100;
            return (
              <View key={item.category} style={ecosystemStyles.categoryLevelRow}>
                <Ionicons
                  name={categoryIcon(item.category)}
                  size={18}
                  color={
                    String(item.tier).toLowerCase() === "gold"
                      ? WORKOUT_WARNING
                      : String(item.tier).toLowerCase() === "platinum"
                        ? WORKOUT_ACCENT_BLUE
                        : isLight
                          ? "#475569"
                          : "#CBD5E1"
                  }
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={ecosystemStyles.categoryLevelTop}>
                    <Text
                      style={[
                        ecosystemStyles.categoryName,
                        isLight && ecosystemStyles.categoryNameLight,
                      ]}
                    >
                      {titleize(item.category)}
                    </Text>
                    <Text
                      style={[
                        ecosystemStyles.categoryXp,
                        isLight && ecosystemStyles.categoryXpLight,
                      ]}
                    >
                      {item.xp.toLocaleString()} / {item.nextTierXp.toLocaleString()} XP
                    </Text>
                  </View>
                  <Text style={ecosystemStyles.categoryTier}>
                    {titleize(item.tier)}
                  </Text>
                  <View
                    style={[
                      ecosystemStyles.progressTrack,
                      isLight && ecosystemStyles.progressTrackLight,
                      { marginTop: 6 },
                    ]}
                  >
                    <View
                      style={[
                        ecosystemStyles.progressFill,
                        { width: `${Math.max(5, percent)}%` as any },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <View
          style={[
            ecosystemStyles.card,
            isLight && ecosystemStyles.cardLight,
          ]}
        >
          <View style={ecosystemStyles.cardHeader}>
            <Text
              style={[
                ecosystemStyles.cardTitle,
                isLight && ecosystemStyles.cardTitleLight,
              ]}
            >
              Recent badges
            </Text>
            <Text style={ecosystemStyles.seeAllText}>See all</Text>
          </View>
          {ecosystemBadges.slice(0, 4).map((item: any) => (
            <TouchableOpacity
              key={`ecosystem-${item.id}`}
              activeOpacity={0.86}
              onPress={() => pinRecentBadge(item.id)}
              style={ecosystemStyles.badgeRow}
            >
              <View
                style={[
                  ecosystemStyles.badgeMedal,
                  { borderColor: rarityColor(item.badge.rarity) },
                ]}
              >
                <Ionicons
                  name={categoryIcon(item.badge.category)}
                  size={20}
                  color={rarityColor(item.badge.rarity)}
                />
              </View>
              <View style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
                <Text
                  style={[
                    ecosystemStyles.badgeName,
                    isLight && ecosystemStyles.badgeNameLight,
                  ]}
                  numberOfLines={1}
                >
                  {item.badge.name}
                </Text>
                <Text
                  style={[
                    ecosystemStyles.badgeReason,
                    isLight && ecosystemStyles.badgeReasonLight,
                  ]}
                  numberOfLines={1}
                >
                  {item.badge.description}
                </Text>
                <Text style={ecosystemStyles.badgeMeta}>
                  {titleize(item.badge.rarity)} badge
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={[
            ecosystemStyles.card,
            isLight && ecosystemStyles.cardLight,
          ]}
        >
          <Text
            style={[
              ecosystemStyles.cardTitle,
              isLight && ecosystemStyles.cardTitleLight,
            ]}
          >
            Featured badges
          </Text>
          <Text
            style={[
              ecosystemStyles.subtitle,
              isLight && ecosystemStyles.subtitleLight,
              { marginTop: 3 },
            ]}
          >
            Pin up to 3 on your profile.
          </Text>
          <View style={ecosystemStyles.featuredRow}>
            {(featuredBadges.length ? featuredBadges : recentBadges.slice(0, 3)).map((item: any) => (
              <TouchableOpacity
                key={`featured-${item.id}`}
                activeOpacity={0.86}
                onPress={() => pinRecentBadge(item.id)}
                style={[
                  ecosystemStyles.featuredBadge,
                  isLight && ecosystemStyles.featuredBadgeLight,
                ]}
              >
                <View
                  style={[
                    ecosystemStyles.featuredIcon,
                    { borderColor: rarityColor(item.badge.rarity) },
                  ]}
                >
                  <Ionicons
                    name={categoryIcon(item.badge.category)}
                    size={22}
                    color={rarityColor(item.badge.rarity)}
                  />
                </View>
                <Text
                  style={[
                    ecosystemStyles.featuredName,
                    isLight && ecosystemStyles.featuredNameLight,
                  ]}
                  numberOfLines={2}
                >
                  {item.badge.name}
                </Text>
                <Text style={ecosystemStyles.badgeMeta}>
                  {titleize(item.badge.rarity)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View
        style={[
          ecosystemStyles.card,
          ecosystemStyles.fullCard,
          isLight && ecosystemStyles.cardLight,
        ]}
      >
        <Text
          style={[
            ecosystemStyles.cardTitle,
            isLight && ecosystemStyles.cardTitleLight,
          ]}
        >
          Badge categories & examples
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={ecosystemStyles.exampleColumns}
        >
          {BADGE_EXAMPLE_COLUMNS.map(([title, ...examples]) => (
            <View key={title} style={ecosystemStyles.exampleColumn}>
              <View style={ecosystemStyles.exampleTitleRow}>
                <Ionicons
                  name={categoryIcon(title.toLowerCase())}
                  size={15}
                  color={WORKOUT_WARNING}
                />
                <Text
                  style={[
                    ecosystemStyles.exampleTitle,
                    isLight && ecosystemStyles.exampleTitleLight,
                  ]}
                >
                  {title}
                </Text>
              </View>
              {examples.map((example) => (
                <Text
                  key={example}
                  style={[
                    ecosystemStyles.exampleText,
                    isLight && ecosystemStyles.exampleTextLight,
                  ]}
                  numberOfLines={1}
                >
                  {example}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>

      <View
        style={[
          ecosystemStyles.card,
          ecosystemStyles.fullCard,
          isLight && ecosystemStyles.cardLight,
        ]}
      >
        <Text
          style={[
            ecosystemStyles.cardTitle,
            isLight && ecosystemStyles.cardTitleLight,
          ]}
        >
          Automation pipeline
        </Text>
        <View style={ecosystemStyles.pipelineRow}>
          {PIPELINE_STEPS.map((step, index) => (
            <View key={step} style={ecosystemStyles.pipelineStep}>
              <View
                style={[
                  ecosystemStyles.pipelineDot,
                  isLight && ecosystemStyles.pipelineDotLight,
                ]}
              >
                <Text style={ecosystemStyles.pipelineNumber}>{index + 1}</Text>
              </View>
              <Text
                style={[
                  ecosystemStyles.pipelineText,
                  isLight && ecosystemStyles.pipelineTextLight,
                ]}
                numberOfLines={2}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View
        style={[
          ecosystemStyles.card,
          ecosystemStyles.fullCard,
          isLight && ecosystemStyles.cardLight,
        ]}
      >
        <Text
          style={[
            ecosystemStyles.cardTitle,
            isLight && ecosystemStyles.cardTitleLight,
          ]}
        >
          Completed training
        </Text>
        <View style={ecosystemStyles.completedGrid}>
          <View style={ecosystemStyles.completedStat}>
            <Text
              style={[
                ecosystemStyles.completedValue,
                isLight && ecosystemStyles.completedValueLight,
              ]}
            >
              {achievements?.completedPlans?.length ?? 0}
            </Text>
            <Text
              style={[
                ecosystemStyles.completedLabel,
                isLight && ecosystemStyles.completedLabelLight,
              ]}
            >
              Plans
            </Text>
          </View>
          <View style={ecosystemStyles.completedStat}>
            <Text
              style={[
                ecosystemStyles.completedValue,
                isLight && ecosystemStyles.completedValueLight,
              ]}
            >
              {achievements?.completedChallenges?.length ?? 0}
            </Text>
            <Text
              style={[
                ecosystemStyles.completedLabel,
                isLight && ecosystemStyles.completedLabelLight,
              ]}
            >
              Challenges
            </Text>
          </View>
        </View>
        {(achievements?.completedPlans ?? []).slice(0, 3).map((plan: any) => (
          <View key={`completed-plan-${plan.id}`} style={ecosystemStyles.trainingRow}>
            <Ionicons name="checkmark-circle-outline" size={17} color={WORKOUT_SUCCESS} />
            <Text
              style={[
                ecosystemStyles.trainingText,
                isLight && ecosystemStyles.trainingTextLight,
              ]}
              numberOfLines={1}
            >
              {plan.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <>
      <ScrollView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
        contentContainerStyle={styles.plansScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          isLight={isLight}
          title="Your profile"
          userName={accountUserName}
          avatarUrl={avatarUrl}
          onThemeToggle={toggle}
        />

        <View style={[publicProfileStyles.hero, isLight && publicProfileStyles.heroLight]}>
          <View style={publicProfileStyles.heroTop}>
            <TouchableOpacity
              style={[publicProfileStyles.avatar, isLight && publicProfileStyles.avatarLight]}
              activeOpacity={0.86}
              onPress={() => void chooseProfilePicture()}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: resolveMediaUrl(avatarUrl) }}
                  style={publicProfileStyles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={[publicProfileStyles.avatarText, isLight && publicProfileStyles.avatarTextLight]}>
                  {initials}
                </Text>
              )}
              <View style={publicProfileStyles.avatarEditBadge}>
                {avatarUploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera-outline" size={13} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
            <View style={publicProfileStyles.heroCopy}>
              <Text style={[publicProfileStyles.name, isLight && publicProfileStyles.nameLight]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[publicProfileStyles.handle, isLight && publicProfileStyles.handleLight]} numberOfLines={1}>
                @{profile.username} · {athleteType}
              </Text>
            </View>
            <View style={publicProfileStyles.levelPill}>
              <Text style={publicProfileStyles.levelText}>
                L{displayLevel.currentLevel}
              </Text>
            </View>
          </View>

          <View style={publicProfileStyles.levelRow}>
            <Text style={[publicProfileStyles.levelTitle, isLight && publicProfileStyles.levelTitleLight]}>
              {displayLevel.currentTitle}
            </Text>
            <Text style={publicProfileStyles.levelXp}>
              {Math.round(displayLevel.careerXp || 0).toLocaleString()} XP
            </Text>
          </View>
          <View style={publicProfileStyles.levelTrack}>
            <View style={[publicProfileStyles.levelFill, { width: `${Math.max(4, levelPercent)}%` as any }]} />
          </View>

          <View style={publicProfileStyles.statRow}>
            {[
              ["Followers", publicCard?.followersCount ?? 0],
              ["Following", publicCard?.followingCount ?? 0],
              ["Posts", publicCard?.postCount ?? 0],
              ["Workouts", profileSummary?.insights?.workout_count ?? allWorkoutHistoryItems.length],
            ].map(([label, value]) => (
              <TouchableOpacity
                key={String(label)}
                style={publicProfileStyles.statItem}
                activeOpacity={label === "Posts" ? 0.78 : 1}
                disabled={label !== "Posts"}
                onPress={() => navigation.navigate("ProfileActivity", { mode: "posts" })}
                accessibilityRole={label === "Posts" ? "button" : undefined}
                accessibilityLabel={label === "Posts" ? "Open your posts" : undefined}
              >
                <Text style={[publicProfileStyles.statValue, isLight && publicProfileStyles.statValueLight]}>
                  {Number(value || 0).toLocaleString()}
                </Text>
                <Text style={[publicProfileStyles.statLabel, isLight && publicProfileStyles.statLabelLight]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[publicProfileStyles.metricCard, isLight && publicProfileStyles.metricCardLight]}>
          <View style={[publicProfileStyles.metricIcon, isLight && publicProfileStyles.metricIconLight]}>
            <Ionicons name="pulse-outline" size={20} color={isLight ? "#0068BD" : "#7DD3FC"} />
          </View>
          <View style={publicProfileStyles.activityCopy}>
            <Text style={[publicProfileStyles.metricLabel, isLight && publicProfileStyles.metricLabelLight]}>
              Fitness age
            </Text>
            <Text style={[publicProfileStyles.metricMeta, isLight && publicProfileStyles.metricMetaLight]}>
              Your current training baseline
            </Text>
          </View>
          <Text style={[publicProfileStyles.metricValue, isLight && publicProfileStyles.metricValueLight]}>
            {publicCard?.fitnessAgeYears ?? "—"}
          </Text>
        </View>

        <View style={publicProfileStyles.section}>
          <View style={publicProfileStyles.sectionHeaderRow}>
            <Text style={[publicProfileStyles.sectionTitle, isLight && publicProfileStyles.sectionTitleLight]}>
              Badges
            </Text>
            {profileBadges.length > 3 ? (
              <TouchableOpacity
                activeOpacity={0.76}
                onPress={() => {
                  setAreProfileBadgesExpanded((current) => !current);
                  if (areProfileBadgesExpanded) setExpandedBadgeId(null);
                }}
              >
                <Text style={publicProfileStyles.badgeToggleText}>
                  {areProfileBadgesExpanded ? "Show less" : `Show all (${profileBadges.length})`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {profileBadges.length ? (
            <View style={publicProfileStyles.badgeList}>
              {visibleProfileBadges.map((item: any) => {
                const isExpanded = expandedBadgeId === item.id;
                const isPinned = featuredBadges.some((badge: any) => badge.id === item.id);
                return (
                  <View
                    key={item.id}
                    style={[publicProfileStyles.badgeListItem, isLight && publicProfileStyles.badgeListItemLight]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.86}
                      onPress={() => setExpandedBadgeId((current) => current === item.id ? null : item.id)}
                      style={publicProfileStyles.badgeListRow}
                    >
                      <View style={[publicProfileStyles.badgeIcon, { borderColor: rarityColor(item.badge.rarity) }]}>
                        <Ionicons name={categoryIcon(item.badge.category)} size={18} color={rarityColor(item.badge.rarity)} />
                      </View>
                      <View style={publicProfileStyles.badgeListCopy}>
                        <Text style={[publicProfileStyles.badgeListName, isLight && publicProfileStyles.badgeListNameLight]} numberOfLines={1}>
                          {item.badge.name}
                        </Text>
                        <Text style={publicProfileStyles.badgeMeta} numberOfLines={1}>
                          {titleize(item.badge.rarity)} badge
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"}
                        size={17}
                        color={isLight ? "#64748B" : "#94A3B8"}
                      />
                    </TouchableOpacity>
                    {isExpanded ? (
                      <View style={[publicProfileStyles.badgeExpandedPanel, isLight && publicProfileStyles.badgeExpandedPanelLight]}>
                        <Text style={[publicProfileStyles.badgeExpandedText, isLight && publicProfileStyles.badgeExpandedTextLight]}>
                          {item.badge.description}
                        </Text>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          disabled={isPinned}
                          onPress={() => pinRecentBadge(item.id)}
                          style={[publicProfileStyles.badgePinButton, isPinned && publicProfileStyles.badgePinButtonPinned]}
                        >
                          <Ionicons
                            name={isPinned ? "checkmark-circle-outline" : "pin-outline"}
                            size={15}
                            color={isPinned ? "#94A3B8" : "#7DD3FC"}
                          />
                          <Text style={[publicProfileStyles.badgePinButtonText, isPinned && publicProfileStyles.badgePinButtonTextPinned]}>
                            {isPinned ? "Pinned to profile" : "Pin to profile"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[publicProfileStyles.emptyText, isLight && publicProfileStyles.emptyTextLight]}>
              No public badges yet.
            </Text>
          )}
        </View>

        <View style={publicProfileStyles.section}>
          <Text style={[publicProfileStyles.sectionTitle, isLight && publicProfileStyles.sectionTitleLight]}>
            Clubs
          </Text>
          {profileSummary?.groups?.length ? (
            profileSummary.groups.slice(0, 3).map((group: any) => (
              <View key={group.id ?? group.name} style={[publicProfileStyles.clubRow, isLight && publicProfileStyles.identityCellLight]}>
                <View style={publicProfileStyles.clubIcon}>
                  <Ionicons name="people-outline" size={17} color="#7DD3FC" />
                </View>
                <View style={publicProfileStyles.activityCopy}>
                  <Text style={[publicProfileStyles.activityTitle, isLight && publicProfileStyles.activityTitleLight]} numberOfLines={1}>
                    {group.name}
                  </Text>
                  <Text style={[publicProfileStyles.activityMeta, isLight && publicProfileStyles.activityMetaLight]} numberOfLines={1}>
                    {titleize(group.groupType ?? group.type ?? "training")} club
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[publicProfileStyles.emptyText, isLight && publicProfileStyles.emptyTextLight]}>
              No clubs joined yet.
            </Text>
          )}
        </View>

        <View style={publicProfileStyles.section}>
          <Text style={[publicProfileStyles.sectionTitle, isLight && publicProfileStyles.sectionTitleLight]}>
            Challenges joined
          </Text>
          {joinedChallenges.length ? (
            joinedChallenges.slice(0, 3).map((challenge: any) => (
              <View key={challenge.id} style={[publicProfileStyles.clubRow, isLight && publicProfileStyles.identityCellLight]}>
                <View style={publicProfileStyles.challengeIcon}>
                  <Ionicons name="trophy-outline" size={17} color="#FBBF24" />
                </View>
                <View style={publicProfileStyles.activityCopy}>
                  <Text style={[publicProfileStyles.activityTitle, isLight && publicProfileStyles.activityTitleLight]} numberOfLines={1}>
                    {challenge.name}
                  </Text>
                  <Text style={[publicProfileStyles.activityMeta, isLight && publicProfileStyles.activityMetaLight]} numberOfLines={1}>
                    {challenge.progressPercent ?? 0}% complete · {titleize(challenge.status ?? "active")}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[publicProfileStyles.emptyText, isLight && publicProfileStyles.emptyTextLight]}>
              No challenges joined yet.
            </Text>
          )}
        </View>

        <View style={publicProfileStyles.section}>
          <View style={publicProfileStyles.sectionHeaderRow}>
            <Text style={[publicProfileStyles.sectionTitle, isLight && publicProfileStyles.sectionTitleLight]}>
              PRs
            </Text>
            <TouchableOpacity activeOpacity={0.84} onPress={() => setIsPrSheetVisible(true)}>
              <Text style={publicProfileStyles.linkText}>View all</Text>
            </TouchableOpacity>
          </View>
          {profilePrs.length ? (
            profilePrs.slice(0, 3).map((pr: any, index: number) => (
              <View key={pr.id ?? pr.segmentId ?? index} style={publicProfileStyles.prRow}>
                <Text style={[publicProfileStyles.prName, isLight && publicProfileStyles.prNameLight]} numberOfLines={1}>
                  {pr.exerciseLabel ?? pr.exercise ?? pr.name ?? pr.id ?? "Personal record"}
                </Text>
                <Text style={publicProfileStyles.prValue} numberOfLines={1}>
                  {pr.prWeight ?? pr.weight ?? pr.value ?? "Synced"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[publicProfileStyles.emptyText, isLight && publicProfileStyles.emptyTextLight]}>
              No public PRs yet.
            </Text>
          )}
        </View>

        <View style={publicProfileStyles.section}>
          <Text style={[publicProfileStyles.sectionTitle, isLight && publicProfileStyles.sectionTitleLight]}>
            Completed
          </Text>
          <View style={publicProfileStyles.completedRow}>
            <View style={[publicProfileStyles.completedCell, isLight && publicProfileStyles.identityCellLight]}>
              <Text style={[publicProfileStyles.identityValue, isLight && publicProfileStyles.identityValueLight]}>
                {completedPlans.length}
              </Text>
              <Text style={[publicProfileStyles.identityLabel, isLight && publicProfileStyles.identityLabelLight]}>
                Plans
              </Text>
            </View>
            <View style={[publicProfileStyles.completedCell, isLight && publicProfileStyles.identityCellLight]}>
              <Text style={[publicProfileStyles.identityValue, isLight && publicProfileStyles.identityValueLight]}>
                {completedChallenges.length}
              </Text>
              <Text style={[publicProfileStyles.identityLabel, isLight && publicProfileStyles.identityLabelLight]}>
                Challenges
              </Text>
            </View>
            <View style={[publicProfileStyles.completedCell, isLight && publicProfileStyles.identityCellLight]}>
              <Text style={[publicProfileStyles.identityValue, isLight && publicProfileStyles.identityValueLight]}>
                {profileSummary?.groups?.length ?? 0}
              </Text>
              <Text style={[publicProfileStyles.identityLabel, isLight && publicProfileStyles.identityLabelLight]}>
                Groups
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[publicProfileStyles.historyButton, isLight && publicProfileStyles.historyButtonLight]}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("ProfileActivity", { mode: "saved" })}
        >
          <View style={publicProfileStyles.historyButtonLabel}>
            <Ionicons name="bookmark-outline" size={18} color={isLight ? "#334155" : "#CBD5E1"} />
            <Text style={[publicProfileStyles.historyButtonText, isLight && publicProfileStyles.historyButtonTextLight]}>
              Saved posts
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isLight ? "#334155" : "#CBD5E1"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[publicProfileStyles.historyButton, isLight && publicProfileStyles.historyButtonLight]}
          activeOpacity={0.9}
          onPress={() => {
            void reloadAllWorkoutHistory();
            setIsWorkoutHistorySheetVisible(true);
          }}
        >
          <Text style={[publicProfileStyles.historyButtonText, isLight && publicProfileStyles.historyButtonTextLight]}>
            Workout history
          </Text>
          <Ionicons name="chevron-forward" size={18} color={isLight ? "#334155" : "#CBD5E1"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, isLight && styles.logoutButtonLight]}
          onPress={signOut}
        >
          <Text style={[styles.logoutText, isLight && styles.logoutTextLight]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
      {/* All workouts history bottom sheet (cross-plan log) */}
      <Modal
        visible={isWorkoutHistorySheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsWorkoutHistorySheetVisible(false)}
      >
        <View style={styles.filterSheetRoot}>
          <TouchableOpacity
            style={styles.filterSheetBackdrop}
            activeOpacity={1}
            onPress={() => setIsWorkoutHistorySheetVisible(false)}
          />
          <View
            style={[
              styles.filterSheetContainer,
              styles.homeAllActiveSheetContainer,
              isLight && styles.filterSheetContainerLight,
            ]}
          >
            <View style={styles.filterSheetHandle} />
            <View style={styles.homeAllActiveHeaderRow}>
              <View style={styles.homeAllActiveHeaderTextCol}>
                <Text
                  style={[
                    styles.filterSheetTitle,
                    isLight && styles.filterSheetTitleLight,
                  ]}
                >
                  All workouts
                </Text>
                <Text
                  style={[
                    styles.filterSheetSubtitle,
                    isLight && styles.filterSheetSubtitleLight,
                  ]}
                >
                  Every workout you have completed in the app.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.homeAllActiveCloseButton}
                activeOpacity={0.8}
                onPress={() => setIsWorkoutHistorySheetVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isLight ? "#4B5563" : "#9CA3AF"}
                />
              </TouchableOpacity>
            </View>

            {allWorkoutHistoryError ? (
              <Text
                style={[
                  styles.metricCaption,
                  isLight && styles.metricCaptionLight,
                ]}
              >
                {allWorkoutHistoryError}
              </Text>
            ) : null}

            {allWorkoutHistoryLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={GLASS_ACCENT_GREEN} />
              </View>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.homeAllActiveListScroll}
            >
              {!allWorkoutHistoryLoading &&
              allWorkoutHistoryItems.length === 0 &&
              !allWorkoutHistoryError ? (
                <Text
                  style={[
                    styles.workoutHistoryEmptyText,
                    isLight && styles.workoutHistoryEmptyTextLight,
                  ]}
                >
                  No workouts logged yet.
                </Text>
              ) : (
                allWorkoutHistoryItems.map((item, index) => {
                  const dateLabel = item.completed_at ?? item.date;
                  return (
                    <View
                      key={`${item.date}-${item.title}-${index}`}
                      style={[
                        styles.workoutHistoryRow,
                        isLight && styles.workoutHistoryRowLight,
                      ]}
                    >
                      <View style={styles.workoutHistoryTextCol}>
                        <Text
                          style={[
                            styles.workoutHistoryTitle,
                            isLight && styles.workoutHistoryTitleLight,
                          ]}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            styles.workoutHistoryDate,
                            isLight && styles.workoutHistoryDateLight,
                          ]}
                        >
                          {dateLabel}
                        </Text>
                      </View>
                      <View style={styles.workoutHistoryStatusWrap}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={GLASS_ACCENT_GREEN}
                        />
                        <Text
                          style={[
                            styles.workoutHistoryStatusLabel,
                            styles.workoutHistoryStatusCompleted,
                          ]}
                        >
                          Completed
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isPrSheetVisible && profilePrs.length > 0}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPrSheetVisible(false)}
      >
        <View style={styles.filterSheetRoot}>
          <TouchableOpacity
            style={styles.filterSheetBackdrop}
            activeOpacity={1}
            onPress={() => setIsPrSheetVisible(false)}
          />
          <View
            style={[
              styles.filterSheetContainer,
              isLight && styles.filterSheetContainerLight,
            ]}
          >
            <View style={styles.filterSheetHandle} />
            <View style={styles.homeAllActiveHeaderRow}>
              <View style={styles.homeAllActiveHeaderTextCol}>
                <Text
                  style={[
                    styles.filterSheetTitle,
                    isLight && styles.filterSheetTitleLight,
                  ]}
                >
                  Personal records
                </Text>
                <Text
                  style={[
                    styles.filterSheetSubtitle,
                    isLight && styles.filterSheetSubtitleLight,
                  ]}
                >
                  Exercise name, weight and sets for your best lifts.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.homeAllActiveCloseButton}
                activeOpacity={0.8}
                onPress={() => setIsPrSheetVisible(false)}
              >
                <Text style={styles.filterSheetFooterButtonText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.homeAllActiveListScroll}
              showsVerticalScrollIndicator={false}
            >
              {profilePrs.map((pr: any, index: number) => {
                const exerciseLabel = pr.exerciseLabel ?? pr.exercise ?? pr.name ?? pr.id ?? "Personal record";
                const demoExerciseId = demoExerciseIds[exerciseLabel];
                return (
                  <View
                    key={pr.segmentId ?? pr.id ?? `${exerciseLabel}-${index}`}
                    style={[
                      styles.profilePrCard,
                      isLight && styles.profilePrCardLight,
                    ]}
                  >
                    <View style={styles.profilePrRow}>
                    <TouchableOpacity
                      style={styles.profilePrTextCol}
                      activeOpacity={demoExerciseId ? 0.82 : 1}
                      disabled={!demoExerciseId}
                      onPress={() => {
                        if (demoExerciseId) {
                          setActiveExerciseName(exerciseLabel);
                        }
                      }}
                    >
                      <View style={styles.viewWorkoutExerciseTapRow}>
                        <Text
                          style={[
                            styles.profilePrExercise,
                            isLight && styles.profilePrExerciseLight,
                            { flex: 1 },
                          ]}
                          numberOfLines={2}
                        >
                          {exerciseLabel}
                        </Text>
                        {demoExerciseId ? (
                          <Ionicons
                            name="play-circle-outline"
                            size={17}
                            color={isLight ? "#2563EB" : "#93C5FD"}
                          />
                        ) : null}
                      </View>
                      {pr.workoutTitle || pr.workout ? (
                        <Text
                          style={[
                            styles.profilePrWorkoutTitle,
                            isLight && styles.profilePrWorkoutTitleLight,
                          ]}
                        >
                          {pr.workoutTitle ?? pr.workout}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                    <View style={styles.profilePrBadgeRow}>
                      <View style={styles.profilePrBadge}>
                        <Text style={styles.profilePrBadgeLabel}>Weight</Text>
                        <Text style={styles.profilePrBadgeValue}>
                          {pr.prWeight ?? pr.weight ?? pr.value ?? "—"}
                        </Text>
                      </View>
                      <View style={styles.profilePrBadge}>
                        <Text style={styles.profilePrBadgeLabel}>Sets</Text>
                        <Text style={styles.profilePrBadgeValue}>
                          {pr.prSets ?? pr.sets ?? "—"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ExerciseDetailSheet
        visible={!!activeExerciseName}
        isLight={isLight}
        exerciseId={
          activeExerciseName ? demoExerciseIds[activeExerciseName] : null
        }
        exerciseName={activeExerciseName}
        onClose={() => setActiveExerciseName(null)}
      />
    </>
  );
};

const publicProfileStyles = StyleSheet.create({
  hero: {
    marginTop: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "rgba(10,16,30,0.72)",
  },
  heroLight: {
    backgroundColor: "#FFFFFF",
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(36,84,244,0.28)",
  },
  avatarLight: {
    backgroundColor: "#EAF1FF",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0068BD",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 19,
  },
  avatarTextLight: {
    color: "#1D4ED8",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
  },
  name: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 23,
    lineHeight: 28,
  },
  nameLight: {
    color: "#0F172A",
  },
  handle: {
    marginTop: 4,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  handleLight: {
    color: "#64748B",
  },
  levelPill: {
    minWidth: 42,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(36,84,244,0.22)",
  },
  levelText: {
    color: "#EAF0FF",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  levelRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  levelTitleLight: {
    color: "#0F172A",
  },
  levelXp: {
    color: "#7DD3FC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  levelTrack: {
    marginTop: 10,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.18)",
    overflow: "hidden",
  },
  levelFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2454F4",
  },
  statRow: {
    marginTop: 18,
    flexDirection: "row",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 17,
  },
  statValueLight: {
    color: "#0F172A",
  },
  statLabel: {
    marginTop: 4,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 10,
  },
  statLabelLight: {
    color: "#64748B",
  },
  metricCard: {
    marginTop: 14,
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.58)",
  },
  metricCardLight: {
    backgroundColor: "#FFFFFF",
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,104,189,0.16)",
  },
  metricIconLight: {
    backgroundColor: "#EEF6FF",
  },
  metricLabel: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  metricLabelLight: {
    color: "#0F172A",
  },
  metricMeta: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 11,
  },
  metricMetaLight: {
    color: "#64748B",
  },
  metricValue: {
    color: "#7DD3FC",
    fontFamily: fontFamily.uiBold,
    fontSize: 28,
  },
  metricValueLight: {
    color: "#0068BD",
  },
  section: {
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
    lineHeight: 18,
  },
  sectionTitleLight: {
    color: "#0F172A",
  },
  identityGrid: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  identityCell: {
    flex: 1,
    minHeight: 86,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(15,23,42,0.58)",
  },
  identityCellLight: {
    backgroundColor: "#F8FAFC",
  },
  identityValue: {
    marginTop: 10,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 17,
  },
  identityValueLight: {
    color: "#0F172A",
  },
  identityLabel: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 10,
  },
  identityLabelLight: {
    color: "#64748B",
  },
  badgeRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  badgeTile: {
    flex: 1,
    minHeight: 118,
    borderRadius: 18,
    padding: 12,
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.58)",
  },
  badgeTileLight: {
    backgroundColor: "#F8FAFC",
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  badgeName: {
    marginTop: 9,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
    lineHeight: 14,
    textAlign: "center",
  },
  badgeNameLight: {
    color: "#0F172A",
  },
  badgeMeta: {
    marginTop: 5,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 10,
  },
  badgeToggleText: {
    color: "#7DD3FC",
    fontFamily: fontFamily.uiSemi,
    fontSize: 12,
  },
  badgeList: {
    marginTop: 10,
    gap: 8,
  },
  badgeListItem: {
    borderRadius: 18,
    paddingHorizontal: 12,
    backgroundColor: "rgba(15,23,42,0.58)",
  },
  badgeListItemLight: {
    backgroundColor: "#F8FAFC",
  },
  badgeListRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeListCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 11,
  },
  badgeListName: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
    lineHeight: 17,
  },
  badgeListNameLight: {
    color: "#0F172A",
  },
  badgeExpandedPanel: {
    paddingTop: 11,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.14)",
  },
  badgeExpandedPanelLight: {
    borderTopColor: "#E2E8F0",
  },
  badgeExpandedText: {
    color: "#CBD5E1",
    fontFamily: fontFamily.ui,
    fontSize: 12,
    lineHeight: 18,
  },
  badgeExpandedTextLight: {
    color: "#64748B",
  },
  badgePinButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(36,84,244,0.16)",
  },
  badgePinButtonPinned: {
    backgroundColor: "rgba(148,163,184,0.12)",
  },
  badgePinButtonText: {
    color: "#7DD3FC",
    fontFamily: fontFamily.uiSemi,
    fontSize: 11,
  },
  badgePinButtonTextPinned: {
    color: "#94A3B8",
  },
  clubRow: {
    marginTop: 10,
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.58)",
  },
  clubIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(36,84,244,0.18)",
  },
  challengeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,0.14)",
  },
  emptyText: {
    marginTop: 10,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  emptyTextLight: {
    color: "#64748B",
  },
  categoryRow: {
    marginTop: 12,
  },
  categoryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryName: {
    color: "#E2E8F0",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  categoryNameLight: {
    color: "#1E293B",
  },
  categoryTier: {
    color: "#7DD3FC",
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
  },
  categoryTrack: {
    marginTop: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.16)",
    overflow: "hidden",
  },
  categoryFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#20DDBB",
  },
  postGrid: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  postTile: {
    width: "48.5%",
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(15,23,42,0.72)",
  },
  postTileLight: {
    backgroundColor: "#F8FAFC",
  },
  postMedia: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "rgba(7,16,29,0.92)",
  },
  postImage: {
    width: "100%",
    height: "100%",
  },
  postFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(36,84,244,0.14)",
  },
  postStackBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.62)",
  },
  postCopy: {
    minHeight: 88,
    padding: 10,
  },
  postTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  postTitleLight: {
    color: "#0F172A",
  },
  postMeta: {
    marginTop: 5,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 10,
  },
  postMetaLight: {
    color: "#64748B",
  },
  postEngagementRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  postEngagement: {
    color: "#7DD3FC",
    fontFamily: fontFamily.uiBold,
    fontSize: 10,
  },
  linkText: {
    color: "#7DD3FC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  prRow: {
    marginTop: 10,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.12)",
  },
  prName: {
    flex: 1,
    color: "#E2E8F0",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  prNameLight: {
    color: "#1E293B",
  },
  prValue: {
    marginLeft: 12,
    color: "#7DD3FC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  completedRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
  },
  completedCell: {
    flex: 1,
    minHeight: 66,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(15,23,42,0.58)",
  },
  activityRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  activityCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },
  activityTitle: {
    color: "#E2E8F0",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  activityTitleLight: {
    color: "#1E293B",
  },
  activityMeta: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 11,
  },
  activityMetaLight: {
    color: "#64748B",
  },
  historyButton: {
    marginTop: 22,
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(148,163,184,0.10)",
  },
  historyButtonLight: {
    backgroundColor: "#F1F5F9",
  },
  historyButtonLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  historyButtonText: {
    color: "#E2E8F0",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  historyButtonTextLight: {
    color: "#0F172A",
  },
});

const ecosystemStyles = StyleSheet.create({
  panel: {
    marginTop: 18,
    marginBottom: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(124,107,255,0.22)",
    backgroundColor: "rgba(10,16,30,0.72)",
  },
  panelLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 21,
    lineHeight: 27,
    textTransform: "uppercase",
  },
  titleLight: {
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 4,
    color: "#A1A7B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  subtitleLight: {
    color: "#64748B",
  },
  levelSeal: {
    width: 72,
    height: 82,
    marginLeft: 14,
    borderWidth: 2,
    borderColor: "rgba(245,158,11,0.72)",
    backgroundColor: "rgba(245,158,11,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  levelSealLight: {
    backgroundColor: "#FFFBEB",
  },
  levelSealNumber: {
    color: "#F8D48B",
    fontFamily: fontFamily.uiBold,
    fontSize: 27,
    lineHeight: 31,
  },
  levelSealLabel: {
    marginTop: 2,
    color: "#F59E0B",
    fontFamily: fontFamily.uiBold,
    fontSize: 10,
    textTransform: "uppercase",
  },
  categoryTabs: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  categoryTab: {
    minHeight: 42,
    paddingHorizontal: 13,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "rgba(15,23,42,0.48)",
    flexDirection: "row",
    alignItems: "center",
  },
  categoryTabLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  categoryTabSelected: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  categoryTabText: {
    marginLeft: 7,
    color: "#B8C0D4",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  categoryTabTextLight: {
    color: "#475569",
  },
  categoryTabTextSelected: {
    color: "#FFFFFF",
  },
  grid: {
    marginTop: 10,
  },
  card: {
    padding: 15,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    backgroundColor: "rgba(15,23,42,0.52)",
  },
  cardLight: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(148,163,184,0.22)",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  levelCard: {
    borderColor: "rgba(124,107,255,0.34)",
  },
  fullCard: {
    marginTop: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
    lineHeight: 20,
    textTransform: "uppercase",
  },
  cardTitleLight: {
    color: "#0F172A",
  },
  levelTitle: {
    marginTop: 14,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 18,
  },
  levelTitleLight: {
    color: "#0F172A",
  },
  levelXp: {
    marginTop: 5,
    color: "#A78BFA",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  levelXpLight: {
    color: PS_BLUE,
  },
  progressTrack: {
    height: 7,
    marginTop: 11,
    overflow: "hidden",
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  progressTrackLight: {
    backgroundColor: "#E5E7EB",
  },
  progressFill: {
    height: 7,
    backgroundColor: PS_BLUE,
  },
  ladder: {
    marginTop: 14,
  },
  ladderRow: {
    minHeight: 34,
    borderTopWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    flexDirection: "row",
    alignItems: "center",
  },
  ladderRowActive: {
    backgroundColor: "rgba(124,107,255,0.13)",
  },
  ladderText: {
    flex: 1,
    color: "#DDE3F0",
    fontFamily: fontFamily.uiSemi,
    fontSize: 12,
  },
  ladderTextLight: {
    color: "#334155",
  },
  ladderMeta: {
    width: 96,
    color: "#A1A7B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 11,
    textAlign: "right",
  },
  ladderMetaLight: {
    color: "#64748B",
  },
  ladderTextActive: {
    color: "#F59E0B",
  },
  categoryLevelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },
  categoryLevelTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryName: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  categoryNameLight: {
    color: "#0F172A",
  },
  categoryXp: {
    color: "#A1A7B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 11,
  },
  categoryXpLight: {
    color: "#64748B",
  },
  categoryTier: {
    marginTop: 2,
    color: WORKOUT_WARNING,
    fontFamily: fontFamily.uiSemi,
    fontSize: 12,
  },
  seeAllText: {
    color: "#A78BFA",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
  },
  badgeMedal: {
    width: 46,
    height: 52,
    borderWidth: 2,
    backgroundColor: "rgba(15,23,42,0.48)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  badgeNameLight: {
    color: "#0F172A",
  },
  badgeReason: {
    marginTop: 3,
    color: "#A1A7B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  badgeReasonLight: {
    color: "#64748B",
  },
  badgeMeta: {
    marginTop: 3,
    color: "#8B95AA",
    fontFamily: fontFamily.uiSemi,
    fontSize: 11,
    textTransform: "capitalize",
  },
  featuredRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  featuredBadge: {
    flex: 1,
    minHeight: 126,
    marginRight: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    backgroundColor: "rgba(15,23,42,0.44)",
    alignItems: "center",
  },
  featuredBadgeLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  featuredIcon: {
    width: 44,
    height: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredName: {
    marginTop: 10,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  featuredNameLight: {
    color: "#0F172A",
  },
  exampleColumns: {
    paddingTop: 12,
    paddingBottom: 2,
  },
  exampleColumn: {
    width: 154,
    paddingRight: 16,
    marginRight: 12,
    borderRightWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  exampleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  exampleTitle: {
    marginLeft: 7,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  exampleTitleLight: {
    color: "#0F172A",
  },
  exampleText: {
    marginTop: 6,
    color: "#A1A7B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  exampleTextLight: {
    color: "#64748B",
  },
  pipelineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  pipelineStep: {
    width: "33.33%",
    paddingRight: 8,
    marginTop: 10,
  },
  pipelineDot: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.44)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245,158,11,0.10)",
  },
  pipelineDotLight: {
    backgroundColor: "#FFFBEB",
  },
  pipelineNumber: {
    color: WORKOUT_WARNING,
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  pipelineText: {
    marginTop: 6,
    color: "#DDE3F0",
    fontFamily: fontFamily.uiSemi,
    fontSize: 11,
    lineHeight: 15,
  },
  pipelineTextLight: {
    color: "#334155",
  },
  completedGrid: {
    flexDirection: "row",
    marginTop: 12,
  },
  completedStat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    backgroundColor: "rgba(15,23,42,0.36)",
  },
  completedValue: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 22,
  },
  completedValueLight: {
    color: "#0F172A",
  },
  completedLabel: {
    marginTop: 2,
    color: "#A1A7B8",
    fontFamily: fontFamily.uiSemi,
    fontSize: 11,
    textTransform: "uppercase",
  },
  completedLabelLight: {
    color: "#64748B",
  },
  trainingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  trainingText: {
    flex: 1,
    marginLeft: 8,
    color: "#DDE3F0",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  trainingTextLight: {
    color: "#334155",
  },
});

export default AccountScreen;
