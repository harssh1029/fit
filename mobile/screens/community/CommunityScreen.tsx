import React, { useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
  StyleProp,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppHeader } from "../../components/AppHeader";
import { FilterChipRow } from "../../components/FilterChipRow";
import { useThemeMode, styles, MetricGauge } from "../../App";
import {
  PS_BLUE,
  GLASS_CARD_DARK,
  GLASS_BORDER_DARK,
  GLASS_TEXT_PRIMARY,
  GLASS_TEXT_MUTED,
} from "../../styles/theme";

export type CommunityFriendSummary = {
  id: string;
  name: string;
  avatarInitials?: string;
  consistencyScore: number; // 0-100
  challengesCompleted: number;
  bodyBalancePercent?: number;
  activePlanName?: string | null;
  streakDays?: number;
  recentSessionsThisWeek?: number;
  fitnessAgeYears?: number | null;
};

type CommunityLeaderboards = {
  mostConsistent: CommunityFriendSummary[];
  mostBalanced: CommunityFriendSummary[];
  challengeChampions: CommunityFriendSummary[];
  mostActive: CommunityFriendSummary[];
};

type LeaderboardFilterKey = "consistent" | "balanced" | "challenges" | "active";

const MOCK_FRIENDS: CommunityFriendSummary[] = [
  {
    id: "1",
    name: "Alex Carter",
    avatarInitials: "AC",
    consistencyScore: 92,
    challengesCompleted: 14,
    bodyBalancePercent: 82,
    activePlanName: "Hyrox Base 1",
    streakDays: 12,
    recentSessionsThisWeek: 5,
    fitnessAgeYears: 26,
  },
  {
    id: "2",
    name: "Jordan Lee",
    avatarInitials: "JL",
    consistencyScore: 78,
    challengesCompleted: 9,
    bodyBalancePercent: 74,
    activePlanName: "Balanced Strength",
    streakDays: 7,
    recentSessionsThisWeek: 3,
    fitnessAgeYears: 29,
  },
];

const LEADERBOARD_FILTERS: {
  key: LeaderboardFilterKey;
  label: string;
}[] = [
  { key: "consistent", label: "Most consistent" },
  { key: "balanced", label: "Most balanced" },
  { key: "challenges", label: "Challenge champions" },
  { key: "active", label: "Most active" },
];

const getFriendInitials = (friend: CommunityFriendSummary) =>
  friend.avatarInitials ?? friend.name.slice(0, 2).toUpperCase();

const getFriendOverallScore = (friend: CommunityFriendSummary) =>
  friend.bodyBalancePercent ?? friend.consistencyScore;

const getFriendScoreLabel = (friend: CommunityFriendSummary) =>
  Math.round(getFriendOverallScore(friend)).toString();

const getFriendScoreProgress = (friend: CommunityFriendSummary) =>
  getFriendOverallScore(friend) / 100;

const buildLeaderboards = (
  friends: CommunityFriendSummary[],
): CommunityLeaderboards => {
  return {
    mostConsistent: [...friends].sort(
      (a, b) => (b.streakDays || 0) - (a.streakDays || 0),
    ),
    mostBalanced: [...friends].sort(
      (a, b) => (b.bodyBalancePercent || 0) - (a.bodyBalancePercent || 0),
    ),
    challengeChampions: [...friends].sort(
      (a, b) => b.challengesCompleted - a.challengesCompleted,
    ),
    mostActive: [...friends].sort(
      (a, b) =>
        (b.recentSessionsThisWeek || 0) - (a.recentSessionsThisWeek || 0),
    ),
  };
};

const CommunityScreen: React.FC = () => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const [activeTab, setActiveTab] = useState<"friends" | "leaderboard">(
    "friends",
  );
  const [selectedFriend, setSelectedFriend] =
    useState<CommunityFriendSummary | null>(null);

  // In a later pass, replace this with a hook that fetches from the backend.
  const friends = useMemo(() => MOCK_FRIENDS, []);

  const leaderboards = useMemo(() => buildLeaderboards(friends), [friends]);

  return (
    <>
      <ScrollView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
        contentContainerStyle={styles.homeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          isLight={isLight}
          title="Community"
          subtitle="Friends and leaderboards"
          rightContent={
            <>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                // TODO: open Add Friend flow (search + requests)
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: PS_BLUE,
                marginRight: 8,
              }}
            >
              <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
              <Text
                style={{
                  marginLeft: 6,
                  color: "#F9FAFB",
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Add friend
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                // TODO: open community filters
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: isLight ? "#E5E7EB" : "rgba(148,163,184,0.65)",
                backgroundColor: isLight ? "#FFFFFF" : "rgba(15,23,42,0.9)",
              }}
            >
              <Ionicons
                name="funnel-outline"
                size={18}
                color={isLight ? "#4B5563" : "#E5E7EB"}
              />
            </TouchableOpacity>
            </>
          }
        />

        {/* Tabs row */}
        <View
          style={[
            styles.homeActiveTabsRow,
            {
              marginTop: 8,
              marginBottom: 8,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: isLight ? "#111827" : "rgba(31,41,55,0.9)",
            },
          ]}
        >
          <TabButton
            label="Friends"
            isLight={isLight}
            isActive={activeTab === "friends"}
            onPress={() => setActiveTab("friends")}
            badgeLabel={String(friends.length)}
            badgeVariant="primary"
          />
          <TabButton
            label="Leaderboard"
            isLight={isLight}
            isActive={activeTab === "leaderboard"}
            onPress={() => setActiveTab("leaderboard")}
            badgeLabel="Top 100"
            badgeVariant="secondary"
          />
        </View>

        {activeTab === "friends" ? (
          <FriendsTab
            isLight={isLight}
            friends={friends}
            onSelectFriend={setSelectedFriend}
          />
        ) : (
          <LeaderboardTab
            isLight={isLight}
            leaderboards={leaderboards}
            onSelectFriend={setSelectedFriend}
          />
        )}
      </ScrollView>

      <FriendDetailModal
        friend={selectedFriend}
        isLight={isLight}
        onClose={() => setSelectedFriend(null)}
      />
    </>
  );
};

const TabButton: React.FC<{
  label: string;
  isLight: boolean;
  isActive: boolean;
  onPress: () => void;
  badgeLabel?: string;
  badgeVariant?: "primary" | "secondary";
}> = ({
  label,
  isLight,
  isActive,
  onPress,
  badgeLabel,
  badgeVariant = "primary",
}) => {
  const pillBackground =
    badgeVariant === "primary"
      ? PS_BLUE
      : isLight
        ? "#E5E7EB"
        : "rgba(148,163,184,0.22)";
  const pillBorderColor =
    badgeVariant === "secondary"
      ? isLight
        ? "#CBD5F5"
        : "rgba(148,163,184,0.75)"
      : "transparent";
  const pillTextColor =
    badgeVariant === "primary" ? "#F9FAFB" : isLight ? "#1F2937" : "#E5E7EB";

  const indicatorWidth = badgeLabel ? 80 : 60;

  return (
    <TouchableOpacity
      style={styles.homeActiveTabButton}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text
          style={[
            styles.homeActiveTabLabel,
            isLight && styles.homeActiveTabLabelLight,
            isActive && styles.homeActiveTabLabelActive,
            isActive && isLight && styles.homeActiveTabLabelActiveLight,
            isActive && { fontWeight: "700" },
          ]}
        >
          {label}
        </Text>
        {badgeLabel && (
          <View
            style={{
              marginLeft: 6,
              paddingHorizontal: badgeVariant === "primary" ? 8 : 10,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: pillBackground,
              borderWidth: badgeVariant === "secondary" ? 1 : 0,
              borderColor: pillBorderColor,
            }}
          >
            <Text
              style={{
                color: pillTextColor,
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              {badgeLabel}
            </Text>
          </View>
        )}
      </View>
      {isActive && (
        <View
          style={[
            styles.homeActiveTabIndicator,
            isLight && styles.homeActiveTabIndicatorLight,
            {
              alignSelf: "center",
              width: indicatorWidth,
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
};

const FriendsTab: React.FC<{
  isLight: boolean;
  friends: CommunityFriendSummary[];
  onSelectFriend: (friend: CommunityFriendSummary) => void;
}> = ({ isLight, friends, onSelectFriend }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((friend) => friend.name.toLowerCase().includes(q));
  }, [friends, searchQuery]);

  if (!friends.length) {
    return (
      <View style={{ marginTop: 24 }}>
        <Text
          style={[styles.metricCaption, isLight && styles.metricCaptionLight]}
        >
          Add some friends to start comparing your progress.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 8, paddingBottom: 16 }}>
      {/* Search + activity filter row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 4,
          marginBottom: 8,
        }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: isLight ? "#E5E7EB" : GLASS_BORDER_DARK,
            backgroundColor: isLight ? "#FFFFFF" : GLASS_CARD_DARK,
          }}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={isLight ? "#9CA3AF" : GLASS_TEXT_MUTED}
          />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              paddingVertical: 0,
              fontSize: 14,
              color: isLight ? "#111827" : GLASS_TEXT_PRIMARY,
            }}
            placeholder="Search friends..."
            placeholderTextColor={isLight ? "#9CA3AF" : GLASS_TEXT_MUTED}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          style={{
            marginLeft: 8,
            paddingHorizontal: 12,
            paddingVertical: 9,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: isLight ? "#E5E7EB" : "rgba(148,163,184,0.65)",
            backgroundColor: isLight ? "#FFFFFF" : "rgba(15,23,42,0.9)",
          }}
          onPress={() => {
            // TODO: open activity filter selector
          }}
        >
          <Text
            style={{
              color: isLight ? "#111827" : GLASS_TEXT_PRIMARY,
              fontSize: 13,
              fontWeight: "500",
              marginRight: 4,
            }}
          >
            All activity
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={isLight ? "#6B7280" : GLASS_TEXT_MUTED}
          />
        </TouchableOpacity>
      </View>

      {filteredFriends.length === 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text
            style={[styles.metricCaption, isLight && styles.metricCaptionLight]}
          >
            No friends match your search yet.
          </Text>
        </View>
      ) : (
        filteredFriends.map((friend) => (
          <FriendSummaryCard
            key={friend.id}
            friend={friend}
            isLight={isLight}
            onPress={() => onSelectFriend(friend)}
          />
        ))
      )}
    </View>
  );
};

const FriendSummaryCard: React.FC<{
  friend: CommunityFriendSummary;
  isLight: boolean;
  onPress: () => void;
}> = ({ friend, isLight, onPress }) => {
  const progress = getFriendScoreProgress(friend);
  const scoreLabel = getFriendScoreLabel(friend);
  const avatarInitials = getFriendInitials(friend);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.metricCardLarge,
        isLight && styles.metricCardLargeLight,
        { borderRadius: 24, paddingVertical: 14, marginTop: 10 },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
          }}
        >
          <View
            style={[
              styles.homeAvatar,
              isLight && styles.homeAvatarLight,
              { width: 40, height: 40 },
            ]}
          >
            <Text
              style={[
                styles.homeAvatarInitials,
                isLight && styles.homeAvatarInitialsLight,
              ]}
            >
              {avatarInitials}
            </Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {friend.name}
            </Text>
            <Text
              style={[
                styles.metricCaption,
                isLight && styles.metricCaptionLight,
                { marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              Overall score
            </Text>
          </View>
        </View>
        <MetricGauge
          progress={progress}
          isLight={isLight}
          size="small"
          centerText={scoreLabel}
          centerSubText="Score"
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 12,
        }}
      >
        <View>
          <Text
            style={[styles.metricCaption, isLight && styles.metricCaptionLight]}
          >
            Consistency
          </Text>
          <Text
            style={[
              styles.homeSectionTitle,
              isLight && styles.homeSectionTitleLight,
              { fontSize: 18 },
            ]}
          >
            {Math.round(friend.consistencyScore)}
          </Text>
        </View>
        <View>
          <Text
            style={[styles.metricCaption, isLight && styles.metricCaptionLight]}
          >
            Challenges
          </Text>
          <Text
            style={[
              styles.homeSectionTitle,
              isLight && styles.homeSectionTitleLight,
              { fontSize: 18 },
            ]}
          >
            {friend.challengesCompleted}
          </Text>
        </View>
        <Text
          style={[
            styles.metricCaption,
            isLight && styles.metricCaptionLight,
            { color: "#2563EB", fontWeight: "600" },
          ]}
        >
          View stats
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const LeaderboardTab: React.FC<{
  isLight: boolean;
  leaderboards: CommunityLeaderboards;
  onSelectFriend: (friend: CommunityFriendSummary) => void;
}> = ({ isLight, leaderboards, onSelectFriend }) => {
  const [activeFilter, setActiveFilter] =
    useState<LeaderboardFilterKey>("consistent");

  // Choose which sorted list to show based on the active filter.
  const listForFilter: CommunityFriendSummary[] = useMemo(() => {
    switch (activeFilter) {
      case "balanced":
        return leaderboards.mostBalanced;
      case "challenges":
        return leaderboards.challengeChampions;
      case "active":
        return leaderboards.mostActive;
      case "consistent":
      default:
        return leaderboards.mostConsistent;
    }
  }, [activeFilter, leaderboards]);

  return (
    <View style={{ marginTop: 8, paddingBottom: 16 }}>
      <FilterChipRow
        items={LEADERBOARD_FILTERS}
        isLight={isLight}
        isActive={(chip) => activeFilter === chip.key}
        onPress={(chip) => setActiveFilter(chip.key)}
      />

      {/* List of friend cards for the selected leaderboard filter */}
      {listForFilter.length === 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text
            style={[styles.metricCaption, isLight && styles.metricCaptionLight]}
          >
            Leaderboard data will appear once you and your friends start logging
            more sessions.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          {listForFilter.map((friend) => (
            <FriendSummaryCard
              key={friend.id}
              friend={friend}
              isLight={isLight}
              onPress={() => onSelectFriend(friend)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

type FriendDetailModalProps = {
  friend: CommunityFriendSummary | null;
  isLight: boolean;
  onClose: () => void;
};

const FriendDetailModal: React.FC<FriendDetailModalProps> = ({
  friend,
  isLight,
  onClose,
}) => {
  if (!friend) return null;

  const progress = getFriendScoreProgress(friend);
  const scoreLabel = getFriendScoreLabel(friend);
  const avatarInitials = getFriendInitials(friend);

  return (
    <Modal
      visible={!!friend}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.communityFriendModalRoot,
          isLight && styles.communityFriendModalRootLight,
        ]}
      >
        <TouchableOpacity
          style={styles.communityFriendModalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.communityFriendModalCard,
            isLight && styles.communityFriendModalCardLight,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.viewWorkoutCloseButton,
              isLight && styles.viewWorkoutCloseButtonLight,
              { top: 16, right: 16 },
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons
              name="close"
              size={20}
              color={isLight ? "#0F172A" : "#E5E7EB"}
            />
          </TouchableOpacity>

          <View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingRight: 44,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                  marginRight: 12,
                }}
              >
                <View
                  style={[
                    styles.homeAvatar,
                    isLight && styles.homeAvatarLight,
                    { width: 52, height: 52 },
                  ]}
                >
                  <Text
                    style={[
                      styles.homeAvatarInitials,
                      isLight && styles.homeAvatarInitialsLight,
                    ]}
                  >
                    {avatarInitials}
                  </Text>
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text
                    style={[
                      styles.filterSheetTitle,
                      isLight && styles.filterSheetTitleLight,
                    ]}
                    numberOfLines={1}
                  >
                    {friend.name}
                  </Text>
                  <Text
                    style={[
                      styles.metricCaption,
                      isLight && styles.metricCaptionLight,
                      { marginTop: 2 },
                    ]}
                  >
                    Overall score
                  </Text>
                </View>
              </View>
              <MetricGauge
                progress={progress}
                isLight={isLight}
                size="small"
                centerText={scoreLabel}
                centerSubText="Score"
              />
            </View>

            {friend.activePlanName && (
              <View
                style={[
                  styles.communityFriendPlanPill,
                  isLight && styles.communityFriendPlanPillLight,
                  { alignSelf: "flex-start", marginBottom: 4 },
                ]}
              >
                <Ionicons
                  name="fitness-outline"
                  size={13}
                  color={isLight ? PS_BLUE : "#7DD3FC"}
                />
                <Text
                  style={[
                    styles.communityFriendPlanText,
                    isLight && styles.communityFriendPlanTextLight,
                  ]}
                  numberOfLines={1}
                >
                  {friend.activePlanName}
                </Text>
              </View>
            )}

            <View style={[styles.metricsRow, { marginTop: 12 }]}>
              <FriendMetricCard
                label="Consistency"
                value={`${Math.round(friend.consistencyScore)}`}
                iconName="analytics-outline"
                iconColor={PS_BLUE}
                caption="Excellent"
                captionColor="#16A34A"
                isLight={isLight}
                containerStyle={{ marginTop: 0 }}
              />
            </View>

            <View style={[styles.metricsRow, { marginTop: 10 }]}>
              <FriendMetricCard
                label="Streak"
                value={
                  friend.streakDays != null ? `${friend.streakDays}d` : "--"
                }
                iconName="flame-outline"
                iconColor="#FB923C"
                isLight={isLight}
                containerStyle={{ marginRight: 8, marginTop: 0 }}
              />
              <FriendMetricCard
                label="Challenges"
                value={`${friend.challengesCompleted}`}
                iconName="trophy-outline"
                iconColor="#A855F7"
                isLight={isLight}
                containerStyle={{ marginTop: 0 }}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const FriendMetricCard: React.FC<{
  label: string;
  value: string;
  isLight: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  caption?: string;
  captionColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
}> = ({
  label,
  value,
  isLight,
  iconName,
  iconColor = PS_BLUE,
  caption,
  captionColor = "#16A34A",
  containerStyle,
}) => (
  <View
    style={[
      styles.metricCardSmall,
      isLight && styles.metricCardSmallLight,
      !isLight && { borderColor: "rgba(148,163,184,0.9)" },
      containerStyle,
    ]}
  >
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {iconName && (
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            backgroundColor: isLight ? "#EEF2FF" : "rgba(37, 99, 235, 0.16)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 8,
          }}
        >
          <Ionicons name={iconName} size={16} color={iconColor} />
        </View>
      )}
      <Text
        style={[
          styles.metricCardTitle,
          isLight && styles.metricCardTitleLight,
          { flexShrink: 1 },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
    <Text
      style={[
        styles.homeSectionTitle,
        isLight && styles.homeSectionTitleLight,
        { fontSize: 18, marginTop: 6, flexShrink: 1 },
      ]}
      numberOfLines={2}
    >
      {value}
    </Text>
    {caption && (
      <Text
        style={[
          styles.metricCaption,
          isLight && styles.metricCaptionLight,
          {
            marginTop: 2,
            color: captionColor,
            fontWeight: "600",
            flexShrink: 1,
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {caption}
      </Text>
    )}
  </View>
);

export default CommunityScreen;
