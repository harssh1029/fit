import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Share,
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
import { useThemeMode, styles } from "../../App";
import { useCommunity } from "../../hooks/useCommunity";
import type {
  CommunityActivity,
  CommunityFriendSummary,
  CommunityUserSuggestion,
} from "../../types/community";
import {
  PS_BLUE,
  GLASS_CARD_DARK,
  GLASS_BORDER_DARK,
  GLASS_TEXT_PRIMARY,
  GLASS_TEXT_MUTED,
} from "../../styles/theme";

type LeaderboardFilterKey =
  | "overall"
  | "consistent"
  | "balanced"
  | "challenges"
  | "active";
type ActivityFilterKey = "recent" | "friends" | "workout" | "challenge" | "consistency";

const LEADERBOARD_FILTERS: {
  key: LeaderboardFilterKey;
  label: string;
}[] = [
  { key: "overall", label: "Overall" },
  { key: "consistent", label: "Most consistent" },
  { key: "balanced", label: "Most balanced" },
  { key: "challenges", label: "Challenge champions" },
  { key: "active", label: "Most active" },
];

const ACTIVITY_FILTERS: { key: ActivityFilterKey; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "friends", label: "Friends" },
  { key: "workout", label: "Workouts" },
  { key: "challenge", label: "Challenges" },
  { key: "consistency", label: "Consistency" },
];

const getFriendInitials = (friend: CommunityFriendSummary) =>
  friend.avatarInitials ?? friend.name.slice(0, 2).toUpperCase();

const getFriendOverallScore = (friend: CommunityFriendSummary) =>
  friend.overallScore ?? friend.bodyBalancePercent ?? friend.consistencyScore;

const getFriendScoreLabel = (friend: CommunityFriendSummary) =>
  Math.round(getFriendOverallScore(friend)).toString();

const CommunityScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const {
    me,
    friends,
    activity,
    loading,
    error,
    searchUsers,
    addFriend,
    syncContacts,
    loadLeaderboard,
    loadActivity,
  } = useCommunity();
  const [activeTab, setActiveTab] = useState<"friends" | "leaderboard">(
    "friends",
  );
  const [selectedFriend, setSelectedFriend] =
    useState<CommunityFriendSummary | null>(null);
  const [isAddFriendVisible, setIsAddFriendVisible] = useState(false);

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
          userName={me?.name ?? null}
          onThemeToggle={toggle}
        />

        <View
          style={[
            styles.homeActiveTabsRow,
            {
              marginTop: 8,
              marginBottom: 10,
              backgroundColor: isLight ? "#F8FAFC" : "rgba(17,24,39,0.82)",
              borderColor: isLight ? "#E2E8F0" : "rgba(148,163,184,0.16)",
              borderBottomWidth: 1,
              borderBottomColor: isLight ? "#E2E8F0" : "rgba(148,163,184,0.16)",
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

        {loading ? (
          <View style={{ paddingVertical: 36 }}>
            <ActivityIndicator color={PS_BLUE} />
          </View>
        ) : error ? (
          <Text style={[styles.metricCaption, isLight && styles.metricCaptionLight]}>
            {error}
          </Text>
        ) : activeTab === "friends" ? (
          <FriendsTab
            isLight={isLight}
            friends={friends}
            activity={activity}
            onSelectFriend={setSelectedFriend}
            loadActivity={loadActivity}
            onAddFriend={() => setIsAddFriendVisible(true)}
          />
        ) : (
          <LeaderboardTab
            isLight={isLight}
            me={me}
            loadLeaderboard={loadLeaderboard}
            onSelectFriend={setSelectedFriend}
          />
        )}
      </ScrollView>

      <AddFriendModal
        visible={isAddFriendVisible}
        isLight={isLight}
        onClose={() => setIsAddFriendVisible(false)}
        searchUsers={searchUsers}
        addFriend={addFriend}
        syncContacts={syncContacts}
      />
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
      ? isLight
        ? "#0F172A"
        : "#F8FAFC"
      : isLight
        ? "#E5E7EB"
        : "rgba(148,163,184,0.22)";
  const pillTextColor =
    badgeVariant === "primary"
      ? isLight
        ? "#F8FAFC"
        : "#0F172A"
      : isLight
        ? "#1F2937"
        : "#E5E7EB";

  return (
    <TouchableOpacity
      style={[styles.homeActiveTabButton, { paddingHorizontal: 6 }]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "100%",
        }}
      >
        <Text
          style={[
            styles.homeActiveTabLabel,
            isLight && styles.homeActiveTabLabelLight,
            isActive && styles.homeActiveTabLabelActive,
            isActive && isLight && styles.homeActiveTabLabelActiveLight,
            { fontSize: 14, flexShrink: 1 },
            isActive && { fontWeight: "700" },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {badgeLabel && (
          <View
            style={{
              marginLeft: 6,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor: pillBackground,
              flexShrink: 0,
            }}
          >
            <Text
              style={{
                color: pillTextColor,
                fontSize: 11,
                fontWeight: "700",
              }}
              numberOfLines={1}
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
            { alignSelf: "center", width: badgeLabel ? 70 : 56 },
          ]}
        />
      )}
    </TouchableOpacity>
  );
};

const FriendsTab: React.FC<{
  isLight: boolean;
  friends: CommunityFriendSummary[];
  activity: CommunityActivity[];
  onSelectFriend: (friend: CommunityFriendSummary) => void;
  loadActivity: (filter: string) => Promise<CommunityActivity[]>;
  onAddFriend: () => void;
}> = ({ isLight, friends, activity, onSelectFriend, loadActivity, onAddFriend }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] =
    useState<ActivityFilterKey>("recent");
  const [activityLoading, setActivityLoading] = useState(false);

  const filteredFriends = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(q) ||
        (friend.username ?? "").toLowerCase().includes(q),
    );
  }, [friends, searchQuery]);

  const updateActivityFilter = async (nextFilter: ActivityFilterKey) => {
    setActivityFilter(nextFilter);
    setActivityLoading(true);
    try {
      await loadActivity(nextFilter);
    } finally {
      setActivityLoading(false);
    }
  };

  return (
    <View style={{ marginTop: 8, paddingBottom: 16 }}>
      {!friends.length ? (
        <EmptyState
          isLight={isLight}
          icon="people-outline"
          title="Start your crew"
          body="Add friends to compare public cards, activity, and leaderboard ranks."
          actionLabel="Add friend"
          onAction={onAddFriend}
        />
      ) : (
        <>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 4,
              marginBottom: 8,
            }}
          >
            <SearchBox
              isLight={isLight}
              placeholder="Search friends..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onAddFriend}
              style={{
                marginLeft: 8,
                paddingHorizontal: 14,
                height: 42,
                borderRadius: 21,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                backgroundColor: PS_BLUE,
              }}
            >
              <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
              <Text
                style={[
                  styles.primaryButtonText,
                  { marginLeft: 6, fontSize: 13 },
                ]}
              >
                Add
              </Text>
            </TouchableOpacity>
          </View>

          {filteredFriends.length === 0 ? (
            <EmptyState
              isLight={isLight}
              icon="search-outline"
              title="No friends found"
              body="Try a name or username from your friends list."
            />
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

          <View style={{ marginTop: 18 }}>
            <View style={styles.homeSectionHeaderRow}>
              <Text
                style={[
                  styles.homeSectionTitle,
                  isLight && styles.homeSectionTitleLight,
                  { fontSize: 20 },
                ]}
              >
                All activity
              </Text>
              {activityLoading && <ActivityIndicator color={PS_BLUE} />}
            </View>
            <FilterChipRow
              items={ACTIVITY_FILTERS}
              isLight={isLight}
              isActive={(chip) => activityFilter === chip.key}
              onPress={(chip) => void updateActivityFilter(chip.key)}
            />
            <View style={{ marginTop: 8 }}>
              {activity.length === 0 ? (
                <Text
                  style={[
                    styles.metricCaption,
                    isLight && styles.metricCaptionLight,
                  ]}
                >
                  Friend activity will appear here after workouts and challenges.
                </Text>
              ) : (
                activity.map((item) => (
                  <ActivityCard key={item.id} item={item} isLight={isLight} />
                ))
              )}
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const SearchBox: React.FC<{
  isLight: boolean;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
}> = ({ isLight, placeholder, value, onChangeText }) => (
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
      placeholder={placeholder}
      placeholderTextColor={isLight ? "#9CA3AF" : GLASS_TEXT_MUTED}
      value={value}
      onChangeText={onChangeText}
      returnKeyType="search"
    />
  </View>
);

const EmptyState: React.FC<{
  isLight: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ isLight, icon, title, body, actionLabel, onAction }) => (
  <View
    style={[
      styles.metricCardLarge,
      isLight && styles.metricCardLargeLight,
      {
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
        minHeight: 220,
      },
    ]}
  >
    <Ionicons name={icon} size={26} color={isLight ? PS_BLUE : "#7DD3FC"} />
    <Text
      style={[
        styles.metricCardTitle,
        isLight && styles.metricCardTitleLight,
        { marginTop: 8 },
      ]}
    >
      {title}
    </Text>
    <Text
      style={[
        styles.metricCaption,
        isLight && styles.metricCaptionLight,
        { textAlign: "center", marginTop: 4 },
      ]}
    >
      {body}
    </Text>
    {actionLabel && onAction && (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onAction}
        style={[
          styles.primaryButton,
          {
            marginTop: 16,
            paddingHorizontal: 22,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
          },
        ]}
      >
        <Ionicons
          name="person-add-outline"
          size={16}
          color="#FFFFFF"
          style={{ marginRight: 7 }}
        />
        <Text style={styles.primaryButtonText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const FriendSummaryCard: React.FC<{
  friend: CommunityFriendSummary;
  isLight: boolean;
  onPress: () => void;
}> = ({ friend, isLight, onPress }) => {
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
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={[
              styles.homeAvatar,
              isLight && styles.homeAvatarLight,
              { width: 42, height: 42 },
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
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
                { fontSize: 14 },
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
              numberOfLines={1}
            >
              @{friend.username ?? "user"}
            </Text>
          </View>
        </View>
        <View
          style={{
            alignItems: "flex-end",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: isLight ? "#DBEAFE" : "rgba(125,211,252,0.26)",
            backgroundColor: isLight ? "#EFF6FF" : "rgba(37,99,235,0.14)",
          }}
        >
          <Text
            style={[
              styles.metricCaption,
              isLight && styles.metricCaptionLight,
              { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
            ]}
          >
            Overall
          </Text>
          <Text
            style={[
              styles.homeSectionTitle,
              isLight && styles.homeSectionTitleLight,
              { fontSize: 20, marginTop: 1 },
            ]}
          >
            {scoreLabel}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: 12,
        }}
      >
        <MiniStat label="Consistency" value={Math.round(friend.consistencyScore)} isLight={isLight} />
        <MiniStat label="Streak" value={`${friend.streakDays ?? 0}d`} isLight={isLight} />
        <MiniStat label="Challenges" value={friend.challengesCompleted} isLight={isLight} />
      </View>
    </TouchableOpacity>
  );
};

const MiniStat: React.FC<{
  label: string;
  value: string | number;
  isLight: boolean;
}> = ({ label, value, isLight }) => (
  <View>
    <Text style={[styles.metricCaption, isLight && styles.metricCaptionLight]}>
      {label}
    </Text>
    <Text
      style={[
        styles.homeSectionTitle,
        isLight && styles.homeSectionTitleLight,
        { fontSize: 18 },
      ]}
    >
      {value}
    </Text>
  </View>
);

const LeaderboardTab: React.FC<{
  isLight: boolean;
  me: CommunityFriendSummary | null;
  loadLeaderboard: (metric: string) => Promise<{
    user_rank: number | null;
    results: CommunityFriendSummary[];
  }>;
  onSelectFriend: (friend: CommunityFriendSummary) => void;
}> = ({ isLight, me, loadLeaderboard, onSelectFriend }) => {
  const [activeFilter, setActiveFilter] =
    useState<LeaderboardFilterKey>("overall");
  const [list, setList] = useState<CommunityFriendSummary[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      try {
        const response = await loadLeaderboard(activeFilter);
        if (isMounted) {
          setList(response.results);
          setUserRank(response.user_rank);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [activeFilter, loadLeaderboard]);

  return (
    <View style={{ marginTop: 8, paddingBottom: 16 }}>
      <FilterChipRow
        items={LEADERBOARD_FILTERS}
        isLight={isLight}
        isActive={(chip) => activeFilter === chip.key}
        onPress={(chip) => setActiveFilter(chip.key)}
      />
      {userRank && me && (
        <View
          style={[
            styles.metricCardLarge,
            isLight && styles.metricCardLargeLight,
            { borderRadius: 22, marginTop: 12, paddingVertical: 12 },
          ]}
        >
          <Text style={[styles.metricCaption, isLight && styles.metricCaptionLight]}>
            Your rank is always visible
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <Text
              style={[
                styles.homeSectionTitle,
                isLight && styles.homeSectionTitleLight,
                { fontSize: 24, marginRight: 10 },
              ]}
            >
              #{userRank}
            </Text>
            <Text
              style={[
                styles.metricCardTitle,
                isLight && styles.metricCardTitleLight,
                { flex: 1 },
              ]}
            >
              {me.name}
            </Text>
          </View>
        </View>
      )}
      {loading ? (
        <View style={{ paddingVertical: 24 }}>
          <ActivityIndicator color={PS_BLUE} />
        </View>
      ) : list.length === 0 ? (
        <EmptyState
          isLight={isLight}
          icon="podium-outline"
          title="Leaderboard is warming up"
          body="Top 100 users will appear after public cards are generated."
        />
      ) : (
        <View style={{ marginTop: 8 }}>
          {list.slice(0, 100).map((friend, index) => (
            <View key={`${friend.id}-${index}`}>
              <Text
                style={[
                  styles.metricCaption,
                  isLight && styles.metricCaptionLight,
                  { marginTop: 8, marginBottom: -2 },
                ]}
              >
                #{index + 1}
              </Text>
              <FriendSummaryCard
                friend={friend}
                isLight={isLight}
                onPress={() => onSelectFriend(friend)}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const ActivityCard: React.FC<{ item: CommunityActivity; isLight: boolean }> = ({
  item,
  isLight,
}) => {
  const icon =
    item.type === "challenge"
      ? "trophy-outline"
      : item.type === "workout"
        ? "barbell-outline"
        : item.type === "test"
          ? "pulse-outline"
          : "flag-outline";

  return (
    <View
      style={[
        styles.metricCardLarge,
        isLight && styles.metricCardLargeLight,
        { borderRadius: 18, padding: 13, marginTop: 9 },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isLight ? "#EEF6FF" : "rgba(125,211,252,0.12)",
            marginRight: 10,
          }}
        >
          <Ionicons name={icon} size={17} color={isLight ? PS_BLUE : "#7DD3FC"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.metricCardTitle, isLight && styles.metricCardTitleLight]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.metricCaption, isLight && styles.metricCaptionLight]}
            numberOfLines={1}
          >
            {item.userName} · {item.description || "Community activity"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const AddFriendModal: React.FC<{
  visible: boolean;
  isLight: boolean;
  onClose: () => void;
  searchUsers: (query: string) => Promise<CommunityUserSuggestion[]>;
  addFriend: (userId: number) => Promise<void>;
  syncContacts: (contacts: string[]) => Promise<{
    suggestions: CommunityUserSuggestion[];
    invites: string[];
    invite_link: string;
  }>;
}> = ({ visible, isLight, onClose, searchUsers, addFriend, syncContacts }) => {
  const [query, setQuery] = useState("");
  const [contactText, setContactText] = useState("");
  const [suggestions, setSuggestions] = useState<CommunityUserSuggestion[]>([]);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const users = await searchUsers(query);
        if (isMounted) setSuggestions(users);
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 220);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [query, searchUsers, visible]);

  const handleSyncContacts = async () => {
    const contacts = contactText
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    setLoading(true);
    try {
      const result = await syncContacts(contacts);
      setSuggestions(result.suggestions);
      setInviteLink(result.invite_link);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    const link = inviteLink ?? "https://fit-app.local/invite";
    await Share.share({ message: `Join me on Fit: ${link}` });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.communityFriendModalRoot}>
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
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.filterSheetTitle, isLight && styles.filterSheetTitleLight]}>
                Add friend
              </Text>
              <Text style={[styles.metricCaption, isLight && styles.metricCaptionLight]}>
                Search by name or username, or sync contacts.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.viewWorkoutCloseButton}>
              <Ionicons name="close" size={20} color={isLight ? "#0F172A" : "#E5E7EB"} />
            </TouchableOpacity>
          </View>

          <SearchBox
            isLight={isLight}
            placeholder="Name or username"
            value={query}
            onChangeText={setQuery}
          />

          <View
            style={{
              marginTop: 12,
              minHeight: 76,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: isLight ? "#E5E7EB" : GLASS_BORDER_DARK,
              backgroundColor: isLight ? "#FFFFFF" : GLASS_CARD_DARK,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <TextInput
              style={{
                flex: 1,
                color: isLight ? "#111827" : GLASS_TEXT_PRIMARY,
                fontSize: 14,
                minHeight: 54,
              }}
              placeholder="Paste emails/usernames from contacts"
              placeholderTextColor={isLight ? "#9CA3AF" : GLASS_TEXT_MUTED}
              value={contactText}
              onChangeText={setContactText}
              multiline
            />
          </View>
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1, marginTop: 0 }]}
              onPress={handleSyncContacts}
              activeOpacity={0.9}
            >
              <Text style={styles.primaryButtonText}>Sync contacts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                marginLeft: 8,
                borderRadius: 999,
                paddingHorizontal: 16,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: isLight ? "#E5E7EB" : GLASS_BORDER_DARK,
                backgroundColor: isLight ? "#FFFFFF" : GLASS_CARD_DARK,
              }}
              onPress={handleInvite}
              activeOpacity={0.9}
            >
              <Text
                style={{
                  color: isLight ? "#111827" : GLASS_TEXT_PRIMARY,
                  fontSize: 13,
                  fontWeight: "700",
                }}
              >
                Invite
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 320, marginTop: 14 }}>
            {loading ? (
              <ActivityIndicator color={PS_BLUE} />
            ) : suggestions.length === 0 ? (
              <Text style={[styles.metricCaption, isLight && styles.metricCaptionLight]}>
                Suggestions will appear as you search or sync contacts.
              </Text>
            ) : (
              suggestions.map((user) => (
                <View
                  key={user.id}
                  style={[
                    styles.metricCardLarge,
                    isLight && styles.metricCardLargeLight,
                    { borderRadius: 18, padding: 12, marginTop: 8 },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={[
                        styles.homeAvatar,
                        isLight && styles.homeAvatarLight,
                        { width: 38, height: 38 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.homeAvatarInitials,
                          isLight && styles.homeAvatarInitialsLight,
                        ]}
                      >
                        {user.avatarInitials ?? user.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.metricCardTitle,
                          isLight && styles.metricCardTitleLight,
                        ]}
                      >
                        {user.name}
                      </Text>
                      <Text
                        style={[
                          styles.metricCaption,
                          isLight && styles.metricCaptionLight,
                        ]}
                      >
                        @{user.username}
                      </Text>
                    </View>
                    <TouchableOpacity
                      disabled={user.friendshipStatus === "accepted"}
                      style={[
                        styles.primaryButton,
                        {
                          marginTop: 0,
                          paddingHorizontal: 13,
                          paddingVertical: 9,
                          opacity: user.friendshipStatus === "accepted" ? 0.5 : 1,
                        },
                      ]}
                      onPress={() => addFriend(user.id)}
                    >
                      <Text style={styles.primaryButtonText}>
                        {user.friendshipStatus === "accepted" ? "Friends" : "Add"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
                    @{friend.username ?? "user"} · Public card
                  </Text>
                </View>
              </View>
              <View
                style={{
                  alignItems: "flex-end",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: isLight ? "#DBEAFE" : "rgba(125,211,252,0.26)",
                  backgroundColor: isLight ? "#EFF6FF" : "rgba(37,99,235,0.14)",
                }}
              >
                <Text
                  style={[
                    styles.metricCaption,
                    isLight && styles.metricCaptionLight,
                    { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
                  ]}
                >
                  Overall
                </Text>
                <Text
                  style={[
                    styles.homeSectionTitle,
                    isLight && styles.homeSectionTitleLight,
                    { fontSize: 20, marginTop: 1 },
                  ]}
                >
                  {scoreLabel}
                </Text>
              </View>
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
                caption="Public score"
                captionColor="#16A34A"
                isLight={isLight}
                containerStyle={{ marginTop: 0 }}
              />
            </View>

            <View style={[styles.metricsRow, { marginTop: 10 }]}>
              <FriendMetricCard
                label="Streak"
                value={friend.streakDays != null ? `${friend.streakDays}d` : "--"}
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
    <View style={{ flexDirection: "row", alignItems: "center" }}>
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
