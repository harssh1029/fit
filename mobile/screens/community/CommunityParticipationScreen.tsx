import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from "@react-navigation/native";

import { AppHeader } from "../../components/AppHeader";
import { useChallenges } from "../../hooks/useChallenges";
import { useCommunity } from "../../hooks/useCommunity";
import { useThemeMode } from "../../App";
import { FeedCard, type FeedItem } from "../home/HomeFeedScreen";
import type { ApiChallenge } from "../../types/challenges";
import { fontFamily } from "../../styles/typography";
import {
  DARK_BG,
  DARK_CARD,
  DARK_TEXT_MUTED,
  LIGHT_BG,
  LIGHT_CARD,
  LIGHT_TEXT_MUTED,
  PS_BLUE,
  WORKOUT_ACCENT_BLUE,
  WORKOUT_SUCCESS,
} from "../../styles/theme";
import type {
  CommunityActivity,
  CommunityActivityComment,
  CommunityGroupDetail,
  CommunityGroupMember,
  CommunityLeaderboardResponse,
  CommunityPublicProfile,
  PremiumChallengeCard,
  PremiumChallengeSections,
  TodayActivityUpdate,
  TrainingChallengeParticipant,
} from "../../types/community";

type CommunityTab = "groups" | "challenges";
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];
type ChallengeTab =
  | "active"
  | "trending"
  | "created"
  | "all"
  | "completed";
type LeaderboardScope = "global" | "following" | "group" | "location";
type ChallengeDetailTab = "about" | "rules" | "participants" | "completed";
type BodyChallengeDetailTab = "about" | "schedule" | "unlock";
type CommunityRoute = RouteProp<
  { Community: { groupId?: string; invite?: string; challengeId?: string } | undefined },
  "Community"
>;

type GroupCard = {
  id: string;
  name: string;
  category: string;
  members: number;
  leaderboard: string;
  activity: string;
  activeChallenge?: string;
  rank?: number | null;
  weeklyActivity?: number;
  joined: boolean;
  myRole?: "owner" | "admin" | "member" | null;
};

const CHALLENGE_WORKOUT_TYPES = [
  "strength",
  "cardio",
  "conditioning",
  "mobility",
  "sport",
];
const CHALLENGE_BODY_PARTS = [
  "chest",
  "shoulders",
  "arms",
  "back",
  "core",
  "glutes",
  "legs",
];
const CHALLENGE_INTENSITIES = ["light", "moderate", "hard", "max_effort"];

const titleCase = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "";

const buildUnlockText = (challenge: ApiChallenge) => {
  if (challenge.card.status !== "locked") return null;
  const progress = challenge.unlockProgress;
  if (progress?.unlockMessage) return progress.unlockMessage;
  return challenge.unlock.unlock_message || "Complete more training to unlock.";
};

const formatLiveDuration = (seconds?: number | null) => {
  const minutes = Math.max(1, Math.floor((seconds ?? 0) / 60));
  if (minutes < 60) return `${minutes}m active`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m active`;
};

const getTodayAction = (update: TodayActivityUpdate) => {
  if (update.is_live) return "training now";
  if (update.type === "challenge_joined") return `joined ${update.title}`;
  if (update.type === "challenge_completed") return `completed ${update.title}`;
  if (update.type === "streak_reached") return `reached ${update.title}`;
  if (update.type === "rank_moved") return update.title;
  if (update.type === "group_joined") return `joined ${update.title}`;
  if (update.type === "badge_earned") return `earned ${update.title}`;
  return `completed ${update.title}`;
};

const CommunityParticipationScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const navigation = useNavigation<any>();
  const route = useRoute<CommunityRoute>();
  const routeGroupId = route.params?.groupId;
  const routeInviteToken = route.params?.invite;
  const routeChallengeId = route.params?.challengeId;
  const isLight = mode === "light";
  const { challenges, loading, error, setChallengeCompleted } = useChallenges();
  const {
    me,
    loadGroups,
    loadOverview,
    loadTrainingChallenges,
    loadTodayActivity,
    loadLeaderboard,
    loadGroupDetail,
    loadGroupMembers,
    searchUsers,
    createGroup: createGroupApi,
    joinGroup,
    joinTrainingChallenge,
    createTrainingChallenge,
    loadTrainingChallengeParticipants,
    inviteGroupMember,
    loadGroupInviteLink,
    removeGroupMember,
    createGroupAnnouncement,
    postGroupActivity,
    uploadCommunityImage,
    loadActivityComments,
    addActivityComment,
    setActivityLiked,
    setActivitySaved,
    loadGroupFeed,
    shareActivity,
    loadPublicProfile,
    actOnGroupJoinRequest,
  } = useCommunity();

  const [activeTab, setActiveTab] = useState<CommunityTab>("groups");
  const [challengeTab, setChallengeTab] = useState<ChallengeTab>("active");
  const [groups, setGroups] = useState<GroupCard[]>([]);
  const [selectedChallenge, setSelectedChallenge] =
    useState<ApiChallenge | null>(null);
  const [selectedPremiumChallenge, setSelectedPremiumChallenge] =
    useState<PremiumChallengeCard | null>(null);
  const [challengeDetailTab, setChallengeDetailTab] =
    useState<ChallengeDetailTab>("about");
  const [bodyChallengeDetailTab, setBodyChallengeDetailTab] =
    useState<BodyChallengeDetailTab>("about");
  const [challengeParticipants, setChallengeParticipants] = useState<
    TrainingChallengeParticipant[]
  >([]);
  const [challengeParticipantsLoading, setChallengeParticipantsLoading] =
    useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupDetailVisible, setGroupDetailVisible] = useState(false);
  const [groupPickerVisible, setGroupPickerVisible] = useState(false);
  const [challengeModalVisible, setChallengeModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupType, setNewGroupType] = useState("hybrid");
  const [newGroupPrivacy, setNewGroupPrivacy] = useState<
    "public" | "private" | "invite_only"
  >("public");
  const [newGroupGoal, setNewGroupGoal] = useState("accountability");
  const [newChallengeTitle, setNewChallengeTitle] = useState("");
  const [newChallengeAbout, setNewChallengeAbout] = useState("");
  const [newChallengeRequirement, setNewChallengeRequirement] = useState("");
  const [newChallengeResult, setNewChallengeResult] = useState("");
  const [newChallengeDuration, setNewChallengeDuration] = useState("14");
  const [newChallengeRequiredSessions, setNewChallengeRequiredSessions] =
    useState("5");
  const [newChallengeMinDuration, setNewChallengeMinDuration] = useState("20");
  const [newChallengeWorkoutTypes, setNewChallengeWorkoutTypes] = useState<
    string[]
  >(["strength", "cardio", "conditioning"]);
  const [newChallengeBodyParts, setNewChallengeBodyParts] = useState<string[]>(
    [],
  );
  const [newChallengeIntensities, setNewChallengeIntensities] = useState<
    string[]
  >([]);
  const [todayExpanded, setTodayExpanded] = useState(false);
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayUpdates, setTodayUpdates] = useState<TodayActivityUpdate[]>([]);
  const [premiumChallenges, setPremiumChallenges] =
    useState<PremiumChallengeSections>({
      active: [],
      trending: [],
      official: [],
      community: [],
      completed: [],
    });
  const [leaderboardData, setLeaderboardData] =
    useState<CommunityLeaderboardResponse | null>(null);
  const [leaderboardScope, setLeaderboardScope] =
    useState<LeaderboardScope>("global");
  const [leaderboardMetric, setLeaderboardMetric] = useState("overall");
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardGroupId, setLeaderboardGroupId] = useState<number | null>(
    null,
  );
  const [selectedGroup, setSelectedGroup] = useState<GroupCard | null>(null);
  const [groupDetail, setGroupDetail] = useState<CommunityGroupDetail | null>(
    null,
  );
  const [groupMembers, setGroupMembers] = useState<CommunityGroupMember[]>([]);
  const [groupDetailLoading, setGroupDetailLoading] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSuggestions, setMemberSuggestions] = useState<
    { id: number; name: string; username: string; avatarInitials?: string }[]
  >([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [groupNoteTitle, setGroupNoteTitle] = useState("");
  const [groupNoteBody, setGroupNoteBody] = useState("");
  const [groupActivityTitle, setGroupActivityTitle] = useState("");
  const [groupActivityBody, setGroupActivityBody] = useState("");
  const [groupFeedTab, setGroupFeedTab] = useState<
    "posts" | "activity" | "stats" | "events" | "announcements"
  >("posts");
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadImages, setNewThreadImages] = useState<string[]>([]);
  const [groupMenuSection, setGroupMenuSection] = useState<
    "members" | "admin" | "challenges" | "stats" | "requests" | null
  >(null);
  const [selectedThread, setSelectedThread] = useState<CommunityActivity | null>(
    null,
  );
  const [threadComments, setThreadComments] = useState<
    CommunityActivityComment[]
  >([]);
  const [threadCommentBody, setThreadCommentBody] = useState("");
  const [threadLoading, setThreadLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] =
    useState<CommunityPublicProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [adminToolsOpen, setAdminToolsOpen] = useState(false);
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [groupActionMessage, setGroupActionMessage] = useState<string | null>(
    null,
  );
  const hasOpenPremiumAccess = true;

  const reloadGroups = async () => {
    try {
      const apiGroups = await loadGroups();
      if (!apiGroups.length) {
        setGroups([]);
        return;
      }
      setGroups(
        apiGroups.map((group) => ({
          id: String(group.id),
          name: group.name,
          category:
            group.groupType ||
            group.category ||
            (group.privacy === "private" ? "Private" : "Open"),
          members: group.memberCount,
          leaderboard: group.groupRank
            ? `Group rank #${group.groupRank}`
            : "Weekly board live",
          activity: `${group.weeklyActivityCount ?? 0} workouts this week`,
          activeChallenge: group.activeChallenge,
          rank: group.groupRank,
          weeklyActivity: group.weeklyActivityCount,
          joined: group.joined,
          myRole: group.myRole,
        })),
      );
    } catch {
      setGroups([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const overview = await loadOverview();
        if (!mounted) return;
        setTodayUpdates(overview.todayActivity);
        setPremiumChallenges(overview.challenges);
        setGroups(
          overview.groups.length
            ? overview.groups.map((group) => ({
                id: String(group.id),
                name: group.name,
                category: group.groupType || group.category || "Open",
                members: group.memberCount,
                leaderboard: group.groupRank
                  ? `Group rank #${group.groupRank}`
                  : "Weekly board live",
                activity: `${group.weeklyActivityCount ?? 0} workouts this week`,
                activeChallenge: group.activeChallenge,
                rank: group.groupRank,
                weeklyActivity: group.weeklyActivityCount,
                joined: group.joined,
                myRole: group.myRole,
              }))
            : [],
        );
      } catch {
        void reloadGroups();
        try {
          const sections = await loadTrainingChallenges();
          if (mounted) setPremiumChallenges(sections);
        } catch {
          if (mounted)
            setPremiumChallenges({
              active: [],
              trending: [],
              official: [],
              community: [],
              completed: [],
            });
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [loadOverview, loadTrainingChallenges]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setTodayLoading(true);
        const updates = await loadTodayActivity();
        if (mounted)
          setTodayUpdates(updates);
      } catch {
        if (mounted) setTodayUpdates([]);
      } finally {
        if (mounted) setTodayLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [loadTodayActivity]);

  const bodyBattleChallenges = useMemo(
    () => [...challenges].sort((a, b) => a.order - b.order),
    [challenges],
  );

  const toggleJoin = (groupId: string, inviteToken?: string | null) => {
    const current =
      groups.find((group) => group.id === groupId) ??
      (selectedGroup?.id === groupId ? selectedGroup : null);
    if (/^\d+$/.test(groupId) && current) {
      void joinGroup(Number(groupId), current.joined, inviteToken ?? null)
        .then(async (response: any) => {
          if (response?.requested) {
            setGroupActionMessage("Request sent to group admins.");
          }
          await reloadGroups();
          if (groupDetailVisible && selectedGroup?.id === groupId) {
            await refreshGroupDetail();
          }
        })
        .catch(() => undefined);
      return;
    }
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              joined: !group.joined,
              members: group.joined ? group.members - 1 : group.members + 1,
            }
          : group,
      ),
    );
  };

  const createGroup = () => {
    const cleanName = newGroupName.trim();
    if (!cleanName) return;
    void createGroupApi(
      cleanName,
      newGroupPrivacy,
      newGroupType,
      newGroupGoal,
      newGroupDescription.trim(),
    )
      .then(reloadGroups)
      .catch(() => {
        setGroups((prev) => [
          {
            id: `group-${Date.now()}`,
            name: cleanName,
            category: "Private",
            members: 1,
            leaderboard: "You are first on the board",
            activity: "New group",
            joined: true,
            myRole: "admin",
          },
          ...prev,
        ]);
      });
    setNewGroupName("");
    setNewGroupDescription("");
    setNewGroupType("hybrid");
    setNewGroupPrivacy("public");
    setNewGroupGoal("accountability");
    setGroupModalVisible(false);
  };

  const toggleChallengeOption = (
    value: string,
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value],
    );
  };

  const resetChallengeForm = () => {
    setNewChallengeTitle("");
    setNewChallengeAbout("");
    setNewChallengeRequirement("");
    setNewChallengeResult("");
    setNewChallengeDuration("14");
    setNewChallengeRequiredSessions("5");
    setNewChallengeMinDuration("20");
    setNewChallengeWorkoutTypes(["strength", "cardio", "conditioning"]);
    setNewChallengeBodyParts([]);
    setNewChallengeIntensities([]);
  };

  const createChallenge = () => {
    const cleanTitle = newChallengeTitle.trim();
    if (!cleanTitle) return;
    const durationDays = Number.parseInt(newChallengeDuration, 10) || 14;
    const requiredSessions =
      Number.parseInt(newChallengeRequiredSessions, 10) || 3;
    const minimumDuration =
      Number.parseInt(newChallengeMinDuration, 10) || 20;
    const requirement =
      newChallengeRequirement.trim() ||
      `${requiredSessions} qualifying sessions in ${durationDays} days`;
    void createTrainingChallenge({
      name: cleanTitle,
      description: [newChallengeAbout.trim(), newChallengeResult.trim()]
        .filter(Boolean)
        .join("\n\nResult: "),
      requirement,
      duration_days: durationDays,
      required_sessions: requiredSessions,
      minimum_duration: minimumDuration,
      eligible_workout_types: newChallengeWorkoutTypes,
      eligible_body_parts: newChallengeBodyParts,
      allowed_intensity: newChallengeIntensities,
      visibility: "community",
    })
      .then(async () => {
        await reloadPremiumChallenges();
        resetChallengeForm();
        setChallengeTab("created");
        setChallengeModalVisible(false);
      })
      .catch(() => undefined);
  };

  const reloadPremiumChallenges = async () => {
    try {
      setPremiumChallenges(await loadTrainingChallenges());
    } catch {
      // Keep current UI state.
    }
  };

  const openTrainingChallenge = (challenge: PremiumChallengeCard) => {
    setChallengeDetailTab("about");
    setSelectedPremiumChallenge(challenge);
  };

  const shareTrainingChallenge = async () => {
    if (!selectedPremiumChallenge) return;
    const challenge = selectedPremiumChallenge;
    await Share.share({
      title: challenge.name,
      message: [
        `Join "${challenge.name}" on Fit.`,
        challenge.requirement,
        `${challenge.durationDays ?? 0} days${challenge.xpReward ? ` / ${challenge.xpReward} XP reward` : ""}`,
        `fit://groups?challengeId=${challenge.id}`,
      ].join("\n"),
    });
  };

  useEffect(() => {
    const challengeId = Number(routeChallengeId);
    if (!Number.isInteger(challengeId) || challengeId <= 0) return;
    const challenge = [
      ...premiumChallenges.active,
      ...premiumChallenges.trending,
      ...premiumChallenges.official,
      ...premiumChallenges.community,
      ...premiumChallenges.completed,
    ].find((item) => item.id === challengeId);
    if (!challenge || selectedPremiumChallenge?.id === challengeId) return;
    setActiveTab("challenges");
    openTrainingChallenge(challenge);
  }, [premiumChallenges, routeChallengeId, selectedPremiumChallenge?.id]);

  const openChallengesScreen = () => {
    navigation.navigate("Challenges", { fromPremium: true });
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedPremiumChallenge) {
        setChallengeParticipants([]);
        setChallengeDetailTab("about");
        return;
      }
      try {
        setChallengeParticipantsLoading(true);
        const response = await loadTrainingChallengeParticipants(
          selectedPremiumChallenge.id,
        );
        if (mounted) setChallengeParticipants(response.participants ?? []);
      } catch {
        if (mounted) setChallengeParticipants([]);
      } finally {
        if (mounted) setChallengeParticipantsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [loadTrainingChallengeParticipants, selectedPremiumChallenge]);

  const reloadLeaderboard = async (
    nextScope: LeaderboardScope = leaderboardScope,
    nextGroupId: number | null = leaderboardGroupId,
    nextMetric: string = leaderboardMetric,
  ) => {
    try {
      setLeaderboardLoading(true);
      const response = await loadLeaderboard(
        nextMetric,
        nextScope,
        nextGroupId,
      );
      setLeaderboardData(response);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const openGroup = async (group: GroupCard) => {
    setSelectedGroup(group);
    setGroupDetailVisible(true);
    setGroupDetail(null);
    setGroupMembers([]);
    setMemberSearchQuery("");
    setMemberSuggestions([]);
    setGroupActionMessage(null);
    setGroupFeedTab("posts");
    setAdminToolsOpen(false);
    setGroupMenuOpen(false);
    setGroupMenuSection(null);
    if (!/^\d+$/.test(group.id)) return;
    try {
      setGroupDetailLoading(true);
      const detail = await loadGroupDetail(Number(group.id));
      setGroupDetail(detail);
      if (detail.joined) {
        setGroupMembers(await loadGroupMembers(Number(group.id)));
      }
    } finally {
      setGroupDetailLoading(false);
    }
  };

  const refreshGroupDetail = async () => {
    if (!selectedGroup || !/^\d+$/.test(selectedGroup.id)) return;
    const groupId = Number(selectedGroup.id);
    const detail = await loadGroupDetail(groupId);
    const members = detail.joined ? await loadGroupMembers(groupId) : [];
    setGroupDetail(detail);
    setGroupMembers(members);
    setGroups((prev) =>
      prev.map((group) =>
        group.id === selectedGroup.id
          ? {
              ...group,
              members: detail.memberCount,
              activity: `${detail.weeklyActivityCount ?? 0} workouts this week`,
              weeklyActivity: detail.weeklyActivityCount,
              activeChallenge: detail.activeChallenge,
              joined: detail.joined,
              myRole: detail.myRole,
            }
          : group,
      ),
    );
  };

  useFocusEffect(
    useCallback(() => {
      void reloadGroups();
      if (groupDetailVisible && selectedGroup?.id) {
        void refreshGroupDetail();
      }
    }, [groupDetailVisible, selectedGroup?.id]),
  );

  useEffect(() => {
    const cleanGroupId = String(routeGroupId ?? "").trim();
    if (!/^\d+$/.test(cleanGroupId)) return;
    if (groupDetailVisible && selectedGroup?.id === cleanGroupId) return;

    const existing = groups.find((group) => group.id === cleanGroupId);
    if (existing) {
      void openGroup(existing);
      return;
    }

    const loadLinkedGroup = async () => {
      const fallback: GroupCard = {
        id: cleanGroupId,
        name: "Group",
        category: "Open",
        members: 0,
        leaderboard: "Weekly board live",
        activity: "",
        joined: false,
      };
      setSelectedGroup(fallback);
      setGroupDetailVisible(true);
      setGroupDetail(null);
      setGroupMembers([]);
      setGroupFeedTab("posts");
      setGroupActionMessage(null);
      try {
        setGroupDetailLoading(true);
        const detail = await loadGroupDetail(Number(cleanGroupId));
        setSelectedGroup({
          id: String(detail.id),
          name: detail.name,
          category: detail.groupType || detail.category || titleCase(detail.privacy),
          members: detail.memberCount,
          leaderboard: detail.groupRank
            ? `Group rank #${detail.groupRank}`
            : "Weekly board live",
          activity: `${detail.weeklyActivityCount ?? 0} workouts this week`,
          activeChallenge: detail.activeChallenge,
          rank: detail.groupRank,
          weeklyActivity: detail.weeklyActivityCount,
          joined: detail.joined,
          myRole: detail.myRole,
        });
        setGroupDetail(detail);
        if (detail.joined) {
          setGroupMembers(await loadGroupMembers(Number(cleanGroupId)));
        }
      } finally {
        setGroupDetailLoading(false);
      }
    };

    void loadLinkedGroup();
  }, [
    groups,
    groupDetailVisible,
    loadGroupDetail,
    loadGroupMembers,
    routeGroupId,
    selectedGroup?.id,
  ]);

  const canManageSelectedGroup =
    groupDetail?.myRole === "owner" || groupDetail?.myRole === "admin";

  const searchGroupMembers = async () => {
    const query = memberSearchQuery.trim();
    if (query.length < 2) {
      setMemberSuggestions([]);
      return;
    }
    try {
      setMemberSearchLoading(true);
      const results = await searchUsers(query);
      const existingUserIds = new Set(groupMembers.map((member) => member.userId));
      setMemberSuggestions(
        results
          .filter((user) => !existingUserIds.has(user.id))
          .slice(0, 6)
          .map((user) => ({
            id: user.id,
            name: user.name,
            username: user.username,
            avatarInitials: user.avatarInitials,
          })),
      );
    } finally {
      setMemberSearchLoading(false);
    }
  };

  const inviteMember = async (userId: number) => {
    if (!selectedGroup || !/^\d+$/.test(selectedGroup.id)) return;
    try {
      setGroupActionLoading(true);
      await inviteGroupMember(Number(selectedGroup.id), userId);
      setGroupActionMessage("Invite sent.");
      setMemberSearchQuery("");
      setMemberSuggestions([]);
      await refreshGroupDetail();
    } catch {
      setGroupActionMessage("Unable to invite this user.");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const removeMember = async (userId: number) => {
    if (!selectedGroup || !/^\d+$/.test(selectedGroup.id)) return;
    try {
      setGroupActionLoading(true);
      await removeGroupMember(Number(selectedGroup.id), userId);
      setGroupActionMessage("Member removed.");
      await refreshGroupDetail();
    } catch {
      setGroupActionMessage("Unable to remove this member.");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const saveGroupNote = async () => {
    if (!selectedGroup || !/^\d+$/.test(selectedGroup.id)) return;
    const title = groupNoteTitle.trim();
    if (!title) return;
    try {
      setGroupActionLoading(true);
      await createGroupAnnouncement(
        Number(selectedGroup.id),
        title,
        groupNoteBody.trim(),
      );
      setGroupNoteTitle("");
      setGroupNoteBody("");
      setGroupActionMessage("Note pinned.");
      await refreshGroupDetail();
    } catch {
      setGroupActionMessage("Unable to save note.");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const saveGroupActivity = async (
    kind: "event" | "notification" | "admin_post" = "admin_post",
  ) => {
    if (!selectedGroup || !/^\d+$/.test(selectedGroup.id)) return;
    const title = groupActivityTitle.trim();
    if (!title) return;
    try {
      setGroupActionLoading(true);
      await postGroupActivity(
        Number(selectedGroup.id),
        title,
        groupActivityBody.trim(),
        kind,
      );
      setGroupActivityTitle("");
      setGroupActivityBody("");
      setGroupActionMessage(
        kind === "event"
          ? "Event posted."
          : kind === "notification"
            ? "Notification sent."
            : "Activity posted.",
      );
      await refreshGroupDetail();
    } catch {
      setGroupActionMessage("Unable to post activity.");
    } finally {
      setGroupActionLoading(false);
    }
  };

  const refreshGroupFeed = async () => {
    if (!selectedGroup || !/^\d+$/.test(selectedGroup.id)) return;
    const feed = await loadGroupFeed(Number(selectedGroup.id));
    setGroupDetail((prev) =>
      prev
        ? {
            ...prev,
            memberActivity: feed.memberActivity,
            threads: feed.threads,
            events: feed.events,
            notifications: feed.notifications,
          }
        : prev,
    );
  };

  const createThread = async () => {
    if (!selectedGroup || !/^\d+$/.test(selectedGroup.id)) return;
    if (!groupDetail?.joined) return;
    const rawPost = newThreadTitle.trim();
    if (!rawPost) return;
    const [firstLine, ...restLines] = rawPost.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const title = (firstLine || rawPost).slice(0, 120);
    const body = restLines.join("\n").trim();
    try {
      setThreadLoading(true);
      const uploadedImages = [];
      for (const image of newThreadImages) {
        if (/^https?:\/\//.test(image)) {
          uploadedImages.push(image);
        } else {
          uploadedImages.push(await uploadCommunityImage(image));
        }
      }
      await postGroupActivity(
        Number(selectedGroup.id),
        title,
        body,
        "thread",
        uploadedImages,
      );
      setNewThreadTitle("");
      setNewThreadImages([]);
      await refreshGroupFeed();
      setGroupFeedTab("posts");
    } finally {
      setThreadLoading(false);
    }
  };

  const replaceGroupActivity = (activity: CommunityActivity) => {
    setGroupDetail((prev) => {
      if (!prev) return prev;
      const updateList = (items?: CommunityActivity[]) =>
        (items ?? []).map((item) => (item.id === activity.id ? activity : item));
      return {
        ...prev,
        memberActivity: updateList(prev.memberActivity),
        threads: updateList(prev.threads),
        events: updateList(prev.events),
        notifications: updateList(prev.notifications),
      };
    });
  };

  const openThread = async (activity: CommunityActivity) => {
    setSelectedThread(activity);
    setThreadComments([]);
    setThreadCommentBody("");
    try {
      setThreadLoading(true);
      setThreadComments(await loadActivityComments(activity.id));
    } finally {
      setThreadLoading(false);
    }
  };

  const toggleActivityLike = async (activity: CommunityActivity) => {
    const result = await setActivityLiked(activity.id, !!activity.likedByMe);
    const next = {
      ...activity,
      likedByMe: result.liked,
      likesCount: result.likesCount,
    };
    replaceGroupActivity(next);
    if (selectedThread?.id === activity.id) setSelectedThread(next);
  };

  const toggleActivitySaved = async (activity: CommunityActivity) => {
    const result = await setActivitySaved(activity.id, !!activity.savedByMe);
    const next = {
      ...activity,
      savedByMe: result.saved,
    };
    replaceGroupActivity(next);
    setSelectedProfile((prev) =>
      prev
        ? {
            ...prev,
            posts: (prev.posts ?? []).map((item) =>
              item.id === activity.id ? next : item,
            ),
          }
        : prev,
    );
    if (selectedThread?.id === activity.id) setSelectedThread(next);
  };

  const submitThreadComment = async () => {
    if (!selectedThread || !threadCommentBody.trim()) return;
    try {
      setThreadLoading(true);
      const comment = await addActivityComment(
        selectedThread.id,
        threadCommentBody.trim(),
      );
      setThreadComments((prev) => [...prev, comment]);
      const next = {
        ...selectedThread,
        commentsCount: (selectedThread.commentsCount ?? 0) + 1,
      };
      setSelectedThread(next);
      replaceGroupActivity(next);
      setThreadCommentBody("");
    } finally {
      setThreadLoading(false);
    }
  };

  const addThreadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 6,
    });
    if (result.canceled) return;
    const uris = result.assets.map((asset) => asset.uri).filter(Boolean);
    setNewThreadImages((prev) => [...prev, ...uris].slice(0, 6));
  };

  const shareGroup = async (mode: "share" | "invite" = "share") => {
    if (!selectedGroup || !/^\d+$/.test(selectedGroup.id)) return;
    try {
      const link = await loadGroupInviteLink(Number(selectedGroup.id));
      setGroupActionMessage(mode === "invite" ? `Invite link: ${link.appUrl}` : null);
      await Share.share({
        message: `Join ${groupDetail?.name ?? selectedGroup.name}: ${link.appUrl}\n${link.url}`,
        url: link.url,
      });
    } catch {
      const url = `https://fit.local/groups/${selectedGroup.id}`;
      await Share.share({
        message: `Join ${groupDetail?.name ?? selectedGroup.name}: ${url}`,
        url,
      });
    }
  };

  const approveJoinRequest = async (
    requestId: number,
    action: "approve" | "reject",
  ) => {
    if (!selectedGroup || !/^\d+$/.test(selectedGroup.id)) return;
    try {
      setGroupActionLoading(true);
      await actOnGroupJoinRequest(Number(selectedGroup.id), requestId, action);
      setGroupActionMessage(action === "approve" ? "Request approved." : "Request rejected.");
      await refreshGroupDetail();
    } finally {
      setGroupActionLoading(false);
    }
  };

  const openUserProfile = async (userId: number) => {
    setProfileVisible(true);
    setSelectedProfile(null);
    try {
      setProfileLoading(true);
      setSelectedProfile(await loadPublicProfile(userId));
    } finally {
      setProfileLoading(false);
    }
  };

  const renderFeedActivity = (
    item: CommunityActivity,
    options: { compact?: boolean } = {},
  ) => {
    const metadata = item.metadata ?? {};
    const groupName =
      typeof metadata.group_name === "string" ? metadata.group_name : null;
    const imageUrls =
      Array.isArray(item.frontendSummary?.image_urls)
        ? item.frontendSummary?.image_urls
        : Array.isArray((metadata as any).image_urls)
          ? ((metadata as any).image_urls as string[])
          : [];
    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.88}
        onPress={() =>
          item.type === "group"
            ? void openThread(item)
            : void openUserProfile(item.userId)
        }
        style={[
          communityStyles.feedItem,
          isLight && communityStyles.feedItemLight,
          options.compact && { paddingVertical: 10 },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() => void openUserProfile(item.userId)}
          style={[
            communityStyles.todayAvatar,
            isLight && communityStyles.groupBadgeLight,
          ]}
        >
          <Text
            style={[
              communityStyles.todayAvatarText,
              isLight && communityStyles.groupBadgeTextLight,
            ]}
          >
            {item.avatarInitials ?? item.userName.slice(0, 2).toUpperCase()}
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
          <Text
            style={[
              communityStyles.highlightText,
              isLight && communityStyles.highlightTextLight,
              { marginLeft: 0 },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[
              communityStyles.metaText,
              isLight && communityStyles.metaTextLight,
            ]}
            numberOfLines={1}
          >
            {item.userName}
            {groupName ? ` / ${groupName}` : ""}
          </Text>
          {item.description ? (
            <Text
              style={[
                communityStyles.cardBody,
                isLight && communityStyles.cardBodyLight,
                { marginTop: 6 },
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          {imageUrls.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 10 }}
            >
              {imageUrls.slice(0, 4).map((uri, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={communityStyles.postImage}
                />
              ))}
            </ScrollView>
          ) : null}
          <View style={communityStyles.threadActionRow}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => void toggleActivityLike(item)}
              style={communityStyles.threadAction}
            >
              <Ionicons
                name={item.likedByMe ? "heart" : "heart-outline"}
                size={15}
                color={item.likedByMe ? "#EF4444" : isLight ? "#64748B" : "#A1A7B8"}
              />
              <Text
                style={[
                  communityStyles.threadActionText,
                  isLight && communityStyles.threadActionTextLight,
                ]}
              >
                {item.likesCount ?? 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => void openThread(item)}
              style={communityStyles.threadAction}
            >
              <Ionicons
                name="chatbubble-outline"
                size={15}
                color={isLight ? "#64748B" : "#A1A7B8"}
              />
              <Text
                style={[
                  communityStyles.threadActionText,
                  isLight && communityStyles.threadActionTextLight,
                ]}
              >
                {item.commentsCount ?? 0}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => void toggleActivitySaved(item)}
              style={communityStyles.threadAction}
            >
              <Ionicons
                name={item.savedByMe ? "bookmark" : "bookmark-outline"}
                size={15}
                color={item.savedByMe ? "#60A5FA" : isLight ? "#64748B" : "#A1A7B8"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroupFeed = () => {
    const posts = groupDetail?.threads ?? [];
    const activity = groupDetail?.memberActivity ?? groupDetail?.pulse ?? [];
    const events = groupDetail?.events ?? [];
    const announcements = groupDetail?.notifications ?? [];
    const statsRows = groupDetail?.leaderboard?.top ?? [];
    const visible =
      groupFeedTab === "posts"
        ? posts
        : groupFeedTab === "activity"
          ? activity
          : groupFeedTab === "events"
            ? events
            : groupFeedTab === "announcements"
              ? announcements
              : [];
    return (
      <View style={{ marginTop: 22 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={communityStyles.feedTabs}
          contentContainerStyle={communityStyles.feedTabsContent}
        >
          {(["posts", "activity", "stats", "events", "announcements"] as const).map((tab) => {
            const selected = groupFeedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.86}
                onPress={() => setGroupFeedTab(tab)}
                style={[
                  communityStyles.feedTab,
                  isLight && communityStyles.feedTabLight,
                  selected && communityStyles.feedTabSelected,
                ]}
              >
                <Text
                  style={[
                    communityStyles.feedTabText,
                    isLight && communityStyles.feedTabTextLight,
                    selected && communityStyles.feedTabTextSelected,
                  ]}
                >
                  {titleCase(tab)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {groupFeedTab === "stats" ? (
          <View style={communityStyles.statsPanel}>
            <View style={communityStyles.statsSummaryRow}>
              <StatTile
                label="Members"
                value={String(groupDetail?.memberCount ?? selectedGroup?.members ?? 0)}
                isLight={isLight}
              />
              <StatTile
                label="This week"
                value={String(groupDetail?.weeklyActivityCount ?? selectedGroup?.weeklyActivity ?? 0)}
                isLight={isLight}
              />
              <StatTile
                label="Goal"
                value={`${groupDetail?.weeklyGoal?.percent ?? 0}%`}
                isLight={isLight}
              />
            </View>
            <View
              style={[
                communityStyles.progressTrack,
                isLight && communityStyles.progressTrackLight,
                { marginTop: 4, marginBottom: 14 },
              ]}
            >
              <View
                style={[
                  communityStyles.progressFill,
                  { width: `${Math.max(4, groupDetail?.weeklyGoal?.percent ?? 4)}%` as any },
                ]}
              />
            </View>
            <Text
              style={[
                communityStyles.sectionTitle,
                isLight && communityStyles.sectionTitleLight,
                { marginTop: 4, marginBottom: 8 },
              ]}
            >
              Member ranks
            </Text>
            {statsRows.length ? (
              statsRows.slice(0, 10).map((row) => (
                <TouchableOpacity
                  key={`${row.rank}-${row.userId}`}
                  activeOpacity={0.86}
                  onPress={() => void openUserProfile(row.userId)}
                  style={communityStyles.highlightRow}
                >
                  <Text
                    style={[
                      communityStyles.highlightRank,
                      isLight && communityStyles.highlightRankLight,
                    ]}
                  >
                    #{row.rank}
                  </Text>
                  <Text
                    style={[
                      communityStyles.highlightText,
                      isLight && communityStyles.highlightTextLight,
                    ]}
                    numberOfLines={1}
                  >
                    {row.name}
                    {row.isYou ? " / You" : ""}
                  </Text>
                  <Text
                    style={[
                      communityStyles.highlightMeta,
                      isLight && communityStyles.highlightMetaLight,
                    ]}
                  >
                    {row.score} workouts
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text
                style={[
                  communityStyles.cardBody,
                  isLight && communityStyles.cardBodyLight,
                ]}
              >
                Member ranks will appear after workouts are logged this week.
              </Text>
            )}
          </View>
        ) : visible.length ? (
          groupFeedTab === "activity" ? (
            visible.map((item) => (
              <FeedCard
                key={`${item.id}-${item.type}`}
                item={{ ...item, synthetic: false } as FeedItem}
                isLight={isLight}
                onOpen={(activityItem) => void openThread(activityItem as CommunityActivity)}
                onLike={(activityItem) => void toggleActivityLike(activityItem as CommunityActivity)}
                onComment={(activityItem) => void openThread(activityItem as CommunityActivity)}
                onShare={(activityItem) =>
                  void shareActivity(activityItem.id).then(refreshGroupFeed)
                }
                onSave={(activityItem) =>
                  toggleActivitySaved(activityItem as CommunityActivity)
                }
              />
            ))
          ) : (
            visible.map((item) => renderFeedActivity(item))
          )
        ) : (
          <Text
            style={[
              communityStyles.cardBody,
              isLight && communityStyles.cardBodyLight,
            ]}
          >
            {groupFeedTab === "posts"
              ? "No posts yet. Share the first group update."
              : groupFeedTab === "activity"
                ? "Workout history from group members will appear here."
              : groupFeedTab === "events"
                ? "Events will appear here."
                : groupFeedTab === "announcements"
                  ? "Announcements will appear here."
                  : "Member stats will appear here."}
          </Text>
        )}
      </View>
    );
  };

  const renderGroupMenuPanel = () => {
    if (!groupMenuOpen) return null;
    return (
      <View
        style={[
          communityStyles.groupMenuPanel,
          isLight && communityStyles.groupMenuPanelLight,
        ]}
      >
        <Text
          style={[
            communityStyles.sectionTitle,
            isLight && communityStyles.sectionTitleLight,
            { marginBottom: 8 },
          ]}
        >
          Group options
        </Text>
        <View style={communityStyles.groupMenuGrid}>
          <TouchableOpacity
            activeOpacity={0.86}
            style={communityStyles.groupMenuItem}
            onPress={() => setGroupFeedTab("announcements")}
          >
            <Ionicons name="megaphone-outline" size={18} color={PS_BLUE} />
            <Text
              style={[
                communityStyles.groupMenuText,
                isLight && communityStyles.groupMenuTextLight,
              ]}
            >
              Announcements
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            style={communityStyles.groupMenuItem}
            onPress={() => setGroupFeedTab("events")}
          >
            <Ionicons name="calendar-outline" size={18} color={PS_BLUE} />
            <Text
              style={[
                communityStyles.groupMenuText,
                isLight && communityStyles.groupMenuTextLight,
              ]}
            >
              Events
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            style={communityStyles.groupMenuItem}
            onPress={() => setGroupMenuSection("members")}
          >
            <Ionicons name="people-outline" size={18} color={PS_BLUE} />
            <Text
              style={[
                communityStyles.groupMenuText,
                isLight && communityStyles.groupMenuTextLight,
              ]}
            >
              Members
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.86}
            style={communityStyles.groupMenuItem}
            onPress={() => setGroupMenuSection("challenges")}
          >
            <Ionicons name="trophy-outline" size={18} color={PS_BLUE} />
            <Text
              style={[
                communityStyles.groupMenuText,
                isLight && communityStyles.groupMenuTextLight,
              ]}
            >
              Challenges
            </Text>
          </TouchableOpacity>
          {canManageSelectedGroup ? (
            <TouchableOpacity
              activeOpacity={0.86}
              style={communityStyles.groupMenuItem}
              onPress={() => setGroupMenuSection("admin")}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={PS_BLUE} />
              <Text
                style={[
                  communityStyles.groupMenuText,
                  isLight && communityStyles.groupMenuTextLight,
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.86}
            style={communityStyles.groupMenuItem}
            onPress={() => setGroupMenuSection("stats")}
          >
            <Ionicons name="podium-outline" size={18} color={PS_BLUE} />
            <Text
              style={[
                communityStyles.groupMenuText,
                isLight && communityStyles.groupMenuTextLight,
              ]}
            >
              Stats
            </Text>
          </TouchableOpacity>
          {canManageSelectedGroup ? (
            <TouchableOpacity
              activeOpacity={0.86}
              style={communityStyles.groupMenuItem}
              onPress={() => setGroupMenuSection("requests")}
            >
              <Ionicons name="mail-unread-outline" size={18} color={PS_BLUE} />
              <Text
                style={[
                  communityStyles.groupMenuText,
                  isLight && communityStyles.groupMenuTextLight,
                ]}
              >
                Requests
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {groupMenuSection === "members" && groupMembers.length ? (
          <View style={{ marginTop: 10 }}>
            {groupMembers.map((member) => (
              <TouchableOpacity
                key={member.id}
                activeOpacity={0.86}
                onPress={() => void openUserProfile(member.userId)}
                style={communityStyles.memberRow}
              >
                <View
                  style={[
                    communityStyles.todayAvatar,
                    isLight && communityStyles.groupBadgeLight,
                  ]}
                >
                  <Text
                    style={[
                      communityStyles.todayAvatarText,
                      isLight && communityStyles.groupBadgeTextLight,
                    ]}
                  >
                    {member.avatarInitials ??
                      member.userName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={[
                      communityStyles.highlightText,
                      isLight && communityStyles.highlightTextLight,
                    ]}
                    numberOfLines={1}
                  >
                    {member.userName}
                  </Text>
                  <Text
                    style={[
                      communityStyles.metaText,
                      isLight && communityStyles.metaTextLight,
                    ]}
                  >
                    {titleCase(member.role)}
                  </Text>
                </View>
                {canManageSelectedGroup && member.role !== "owner" ? (
                  <TouchableOpacity
                    activeOpacity={0.86}
                    disabled={groupActionLoading}
                    onPress={() => void removeMember(member.userId)}
                    style={[
                      communityStyles.iconAction,
                      isLight && communityStyles.iconActionLight,
                    ]}
                  >
                    <Ionicons
                      name="person-remove-outline"
                      size={16}
                      color={isLight ? "#B91C1C" : "#FCA5A5"}
                    />
                  </TouchableOpacity>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {groupMenuSection === "challenges" && (groupDetail?.activeChallenges ?? []).length ? (
          <View style={communityStyles.detailPanel}>
            <Text
              style={[
                communityStyles.modalLabel,
                isLight && communityStyles.modalLabelLight,
                { marginTop: 0 },
              ]}
            >
              Challenges
            </Text>
            {(groupDetail?.activeChallenges ?? []).map((challenge) => (
              <View key={challenge.id} style={communityStyles.highlightRow}>
                <Text
                  style={[
                    communityStyles.highlightText,
                    isLight && communityStyles.highlightTextLight,
                  ]}
                  numberOfLines={1}
                >
                  {challenge.title}
                </Text>
                <Text
                  style={[
                    communityStyles.highlightMeta,
                    isLight && communityStyles.highlightMetaLight,
                  ]}
                >
                  {challenge.reward_xp} XP
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {groupMenuSection === "stats" && (groupDetail?.leaderboard?.top ?? []).length ? (
          <View style={communityStyles.detailPanel}>
            <Text
              style={[
                communityStyles.modalLabel,
                isLight && communityStyles.modalLabelLight,
                { marginTop: 0 },
              ]}
            >
              Leaderboard
            </Text>
            {(groupDetail?.leaderboard?.top ?? []).slice(0, 3).map((row) => (
              <View key={`${row.rank}-${row.userId}`} style={communityStyles.highlightRow}>
                <Text
                  style={[
                    communityStyles.highlightRank,
                    isLight && communityStyles.highlightRankLight,
                  ]}
                >
                  #{row.rank}
                </Text>
                <Text
                  style={[
                    communityStyles.highlightText,
                    isLight && communityStyles.highlightTextLight,
                  ]}
                  numberOfLines={1}
                >
                  {row.name}
                </Text>
                <Text
                  style={[
                    communityStyles.highlightMeta,
                    isLight && communityStyles.highlightMetaLight,
                  ]}
                >
                  {row.score}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {groupMenuSection === "requests" && canManageSelectedGroup ? (
          <View style={communityStyles.detailPanel}>
            <Text
              style={[
                communityStyles.modalLabel,
                isLight && communityStyles.modalLabelLight,
                { marginTop: 0 },
              ]}
            >
              Join requests
            </Text>
            {(groupDetail?.joinRequests ?? []).length ? (
              (groupDetail?.joinRequests ?? []).map((request) => (
                <View key={request.id} style={communityStyles.memberRow}>
                  <View
                    style={[
                      communityStyles.todayAvatar,
                      isLight && communityStyles.groupBadgeLight,
                    ]}
                  >
                    <Text
                      style={[
                        communityStyles.todayAvatarText,
                        isLight && communityStyles.groupBadgeTextLight,
                      ]}
                    >
                      {request.avatarInitials ?? request.userName.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      communityStyles.highlightText,
                      isLight && communityStyles.highlightTextLight,
                    ]}
                    numberOfLines={1}
                  >
                    {request.userName}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => void approveJoinRequest(request.id, "approve")}
                    style={communityStyles.smallPrimaryButton}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => void approveJoinRequest(request.id, "reject")}
                    style={[
                      communityStyles.iconAction,
                      isLight && communityStyles.iconActionLight,
                      { marginLeft: 8 },
                    ]}
                  >
                    <Ionicons name="close" size={17} color={isLight ? "#B91C1C" : "#FCA5A5"} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text
                style={[
                  communityStyles.cardBody,
                  isLight && communityStyles.cardBodyLight,
                ]}
              >
                No pending requests.
              </Text>
            )}
          </View>
        ) : null}
        {canManageSelectedGroup && groupMenuSection === "admin" ? renderAdminTools() : null}
      </View>
    );
  };

  const renderAdminTools = () => (
    <View
      style={[
        communityStyles.adminPanel,
        isLight && communityStyles.adminPanelLight,
        { marginTop: 12 },
      ]}
    >
      {groupActionMessage ? (
        <Text
          style={[
            communityStyles.metaText,
            isLight && communityStyles.metaTextLight,
            { marginTop: 0 },
          ]}
        >
          {groupActionMessage}
        </Text>
      ) : null}
      <Text
        style={[
          communityStyles.modalLabel,
          isLight && communityStyles.modalLabelLight,
        ]}
      >
        Add member
      </Text>
      <View style={communityStyles.inlineInputRow}>
        <TextInput
          style={[
            communityStyles.inlineInput,
            isLight && communityStyles.inlineInputLight,
          ]}
          value={memberSearchQuery}
          onChangeText={setMemberSearchQuery}
          placeholder="Name or username"
          placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
          returnKeyType="search"
          onSubmitEditing={() => void searchGroupMembers()}
        />
        <TouchableOpacity
          activeOpacity={0.86}
          disabled={memberSearchLoading}
          onPress={() => void searchGroupMembers()}
          style={communityStyles.smallPrimaryButton}
        >
          {memberSearchLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="search" size={17} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
      {memberSuggestions.map((user) => (
        <TouchableOpacity
          key={user.id}
          activeOpacity={0.86}
          style={communityStyles.memberRow}
          onPress={() => void inviteMember(user.id)}
        >
          <View
            style={[
              communityStyles.todayAvatar,
              isLight && communityStyles.groupBadgeLight,
            ]}
          >
            <Text
              style={[
                communityStyles.todayAvatarText,
                isLight && communityStyles.groupBadgeTextLight,
              ]}
            >
              {user.avatarInitials ?? user.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text
              style={[
                communityStyles.highlightText,
                isLight && communityStyles.highlightTextLight,
              ]}
              numberOfLines={1}
            >
              {user.name}
            </Text>
            <Text
              style={[
                communityStyles.metaText,
                isLight && communityStyles.metaTextLight,
              ]}
            >
              @{user.username}
            </Text>
          </View>
          <Ionicons
            name="person-add-outline"
            size={18}
            color={isLight ? PS_BLUE : WORKOUT_ACCENT_BLUE}
          />
        </TouchableOpacity>
      ))}
      <Text
        style={[
          communityStyles.modalLabel,
          isLight && communityStyles.modalLabelLight,
        ]}
      >
        Announcement
      </Text>
      <TextInput
        style={[
          communityStyles.modalInput,
          isLight && communityStyles.modalInputLight,
        ]}
        value={groupNoteTitle}
        onChangeText={setGroupNoteTitle}
        placeholder="Pinned note title"
        placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
      />
      <TextInput
        style={[
          communityStyles.modalInput,
          isLight && communityStyles.modalInputLight,
          { minHeight: 78, textAlignVertical: "top", paddingTop: 13 },
        ]}
        multiline
        value={groupNoteBody}
        onChangeText={setGroupNoteBody}
        placeholder="Note details"
        placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
      />
      <TouchableOpacity
        style={communityStyles.cardButton}
        activeOpacity={0.86}
        disabled={groupActionLoading || !groupNoteTitle.trim()}
        onPress={() => void saveGroupNote()}
      >
        <Text style={communityStyles.cardButtonText}>Pin note</Text>
      </TouchableOpacity>
      <Text
        style={[
          communityStyles.modalLabel,
          isLight && communityStyles.modalLabelLight,
        ]}
      >
        Event
      </Text>
      <TextInput
        style={[
          communityStyles.modalInput,
          isLight && communityStyles.modalInputLight,
        ]}
        value={groupActivityTitle}
        onChangeText={setGroupActivityTitle}
        placeholder="Event or notification title"
        placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
      />
      <TextInput
        style={[
          communityStyles.modalInput,
          isLight && communityStyles.modalInputLight,
          { minHeight: 78, textAlignVertical: "top", paddingTop: 13 },
        ]}
        multiline
        value={groupActivityBody}
        onChangeText={setGroupActivityBody}
        placeholder="Details for members"
        placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
      />
      <View style={communityStyles.actionRow}>
        <TouchableOpacity
          style={[
            communityStyles.secondaryButton,
            isLight && communityStyles.secondaryButtonLight,
          ]}
          activeOpacity={0.86}
          disabled={groupActionLoading || !groupActivityTitle.trim()}
          onPress={() => void saveGroupActivity("event")}
        >
          <Text
            style={[
              communityStyles.secondaryButtonText,
              isLight && communityStyles.secondaryButtonTextLight,
            ]}
          >
            Post event
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[communityStyles.cardButton, communityStyles.actionPrimary]}
          activeOpacity={0.86}
          disabled={groupActionLoading || !groupActivityTitle.trim()}
          onPress={() => void saveGroupActivity("notification")}
        >
          <Text style={communityStyles.cardButtonText}>Notify</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabButton = (
    key: CommunityTab,
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
  ) => {
    const selected = activeTab === key;
    return (
      <TouchableOpacity
        style={[
          communityStyles.topTab,
          isLight && communityStyles.topTabLight,
          selected && communityStyles.topTabSelected,
        ]}
        activeOpacity={0.86}
        onPress={() => setActiveTab(key)}
      >
        <Ionicons
          name={icon}
          size={18}
          color={selected ? PS_BLUE : isLight ? "#0F172A" : "#E5E7EB"}
        />
        <Text
          style={[
            communityStyles.topTabText,
            isLight && communityStyles.topTabTextLight,
            selected && communityStyles.topTabTextSelected,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCommunityHeader = () => (
    <AppHeader
      isLight={isLight}
      title="Community"
      subtitle="Train together. Compete together."
      userName={me?.name ?? me?.avatarInitials ?? null}
      avatarUrl={me?.avatarUrl}
      onThemeToggle={toggle}
    />
  );

  const renderTodayRail = () => {
    const visibleUpdates = todayExpanded
      ? todayUpdates
      : todayUpdates.slice(0, 1);
    const extraCount = Math.max(0, todayUpdates.length - 1);

    return (
      <View
        style={[
          communityStyles.todayRail,
          isLight && communityStyles.todayRailLight,
        ]}
      >
        <TouchableOpacity
          style={communityStyles.todayHeader}
          activeOpacity={0.86}
          onPress={() => setTodayExpanded((value) => !value)}
        >
          <View>
            <Text
              style={[
                communityStyles.eyebrow,
                isLight && communityStyles.eyebrowLight,
              ]}
            >
              Following
            </Text>
            <Text
              style={[
                communityStyles.todayTitle,
                isLight && communityStyles.todayTitleLight,
              ]}
            >
              Today
            </Text>
          </View>
          <Ionicons
            name={todayExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={isLight ? "#475569" : "#A1A7B8"}
          />
          {todayLoading ? (
            <ActivityIndicator color={PS_BLUE} />
          ) : todayUpdates.length ? (
            <Text
              style={[
                communityStyles.todayCount,
                isLight && communityStyles.todayCountLight,
              ]}
            >
              {todayUpdates.length} update{todayUpdates.length === 1 ? "" : "s"}
            </Text>
          ) : null}
        </TouchableOpacity>

        {!todayLoading && todayUpdates.length === 0 ? (
          <View
            style={[
              communityStyles.todayEmpty,
              isLight && communityStyles.todayEmptyLight,
            ]}
          >
            <Text
              style={[
                communityStyles.todayEmptyText,
                isLight && communityStyles.todayEmptyTextLight,
              ]}
            >
              No updates yet. Follow friends to see their training today.
            </Text>
          </View>
        ) : null}

        {visibleUpdates.map((update) => (
          <View key={update.id} style={communityStyles.todayRow}>
            <View
              style={[
                communityStyles.todayAvatar,
                update.is_live && communityStyles.todayAvatarLive,
              ]}
            >
              <Text style={communityStyles.todayAvatarText}>
                {update.user.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase() || "U"}
              </Text>
            </View>
            <View style={communityStyles.todayCopy}>
              <Text
                style={[
                  communityStyles.todayAction,
                  isLight && communityStyles.todayActionLight,
                ]}
                numberOfLines={1}
              >
                <Text style={communityStyles.todayName}>
                  {update.user.name}
                </Text>{" "}
                {getTodayAction(update)}
              </Text>
              <Text
                style={[
                  communityStyles.todayMeta,
                  isLight && communityStyles.todayMetaLight,
                ]}
                numberOfLines={1}
              >
                {update.is_live
                  ? formatLiveDuration(update.live_duration_seconds)
                  : update.subtitle || update.time_ago}
                {" | "}
                {update.time_ago}
              </Text>
            </View>
            {update.is_live ? (
              <View style={communityStyles.livePill}>
                <View style={communityStyles.liveDot} />
                <Text style={communityStyles.liveText}>Live</Text>
              </View>
            ) : (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={isLight ? "#94A3B8" : "#6F778A"}
              />
            )}
          </View>
        ))}

        {!todayExpanded && extraCount > 0 ? (
          <TouchableOpacity
            activeOpacity={0.86}
            onPress={() => setTodayExpanded(true)}
          >
            <Text
              style={[
                communityStyles.todayMore,
                isLight && communityStyles.todayMoreLight,
              ]}
            >
              +{extraCount} update{extraCount === 1 ? "" : "s"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderGroups = () => (
    <>
      <View
        style={[communityStyles.hero, isLight && communityStyles.heroLight]}
      >
        <View style={communityStyles.heroGlowLarge} />
        <View style={communityStyles.heroGlowSmall} />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              communityStyles.eyebrow,
              isLight && communityStyles.eyebrowLight,
            ]}
          >
            Accountability
          </Text>
          <Text
            style={[
              communityStyles.heroTitle,
              isLight && communityStyles.heroTitleLight,
            ]}
          >
            Groups built for{"\n"}training culture.
          </Text>
          <Text
            style={[
              communityStyles.heroBody,
              isLight && communityStyles.heroBodyLight,
            ]}
          >
            Join or create a group and stay consistent together.
          </Text>
        </View>
        <TouchableOpacity
          style={communityStyles.heroButton}
          activeOpacity={0.86}
          onPress={() => setGroupModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {!groups.length ? (
        <View style={[communityStyles.card, isLight && communityStyles.cardLight]}>
          <Text
            style={[
              communityStyles.cardTitle,
              isLight && communityStyles.cardTitleLight,
            ]}
          >
            No groups yet
          </Text>
          <Text
            style={[
              communityStyles.cardBody,
              isLight && communityStyles.cardBodyLight,
            ]}
          >
            Create the first group to start a shared leaderboard and activity
            feed.
          </Text>
        </View>
      ) : null}

      {groups.map((group) => (
        <View
          key={group.id}
          style={[communityStyles.card, isLight && communityStyles.cardLight]}
        >
          <View style={communityStyles.cardHeader}>
            <View
              style={[
                communityStyles.groupBadge,
                isLight && communityStyles.groupBadgeLight,
              ]}
            >
              <Text
                style={[
                  communityStyles.groupBadgeText,
                  isLight && communityStyles.groupBadgeTextLight,
                ]}
              >
                {group.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={[
                  communityStyles.cardTitle,
                  isLight && communityStyles.cardTitleLight,
                ]}
              >
                {group.name}
              </Text>
              <Text
                style={[
                  communityStyles.metaText,
                  isLight && communityStyles.metaTextLight,
                ]}
              >
                {group.members} members / {group.activity}
                {group.activeChallenge
                  ? ` / ${group.activeChallenge} active`
                  : ""}
                {group.myRole === "owner"
                  ? " / Owner"
                  : group.myRole === "admin"
                    ? " / Admin"
                    : ""}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={() => void openGroup(group)}
              style={communityStyles.cardMenuButton}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={20}
                color={isLight ? "#64748B" : "#A1A7B8"}
              />
            </TouchableOpacity>
          </View>
          <View
            style={[
              communityStyles.leaderboardStrip,
              isLight && communityStyles.leaderboardStripLight,
            ]}
          >
            <Ionicons
              name="podium-outline"
              size={18}
              color={isLight ? "#475569" : "#CBD5E1"}
            />
            <Text
              style={[
                communityStyles.leaderboardText,
                isLight && communityStyles.leaderboardTextLight,
              ]}
            >
              {group.leaderboard}
            </Text>
          </View>
          <View style={communityStyles.actionRow}>
            <TouchableOpacity
              style={[
                communityStyles.secondaryButton,
                isLight && communityStyles.secondaryButtonLight,
              ]}
              activeOpacity={0.86}
              onPress={() => void openGroup(group)}
            >
              <Text
                style={[
                  communityStyles.secondaryButtonText,
                  isLight && communityStyles.secondaryButtonTextLight,
                ]}
              >
                Open club
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                communityStyles.cardButton,
                communityStyles.actionPrimary,
                group.joined && communityStyles.cardButtonJoined,
                group.joined && isLight && communityStyles.cardButtonJoinedLight,
              ]}
              activeOpacity={0.86}
              onPress={() => toggleJoin(group.id)}
            >
              <Text
                style={[
                  communityStyles.cardButtonText,
                  group.joined && isLight && communityStyles.cardButtonTextJoinedLight,
                ]}
              >
                {group.joined ? "Joined" : "Join"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </>
  );

  const renderPremiumChallengeCard = (challenge: PremiumChallengeCard) => (
    <TouchableOpacity
      key={challenge.id}
      activeOpacity={0.9}
      onPress={() => openTrainingChallenge(challenge)}
      style={[communityStyles.card, isLight && communityStyles.cardLight]}
    >
      <View style={communityStyles.cardHeader}>
        <View
          style={[
            communityStyles.challengeIcon,
            isLight && communityStyles.challengeIconLight,
          ]}
        >
          <Ionicons
            name={
              challenge.completed
                ? "checkmark-circle"
                : challenge.joined
                  ? "pulse-outline"
                  : "trophy-outline"
            }
            size={21}
            color={
              challenge.completed
                ? "#16A34A"
                : challenge.joined
                  ? WORKOUT_SUCCESS
                  : PS_BLUE
            }
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={[
              communityStyles.cardTitle,
              isLight && communityStyles.cardTitleLight,
            ]}
            numberOfLines={2}
          >
            {challenge.name}
          </Text>
          <Text
            style={[
              communityStyles.metaText,
              isLight && communityStyles.metaTextLight,
            ]}
          >
            {challenge.participants} participants / {challenge.daysLeft} days
            left
          </Text>
        </View>
      </View>
      <Text
        style={[
          communityStyles.cardBody,
          isLight && communityStyles.cardBodyLight,
        ]}
        numberOfLines={2}
      >
        {challenge.requirement ||
          `${challenge.progress.sessionsCompleted}/${challenge.progress.requiredSessions} sessions complete`}
      </Text>
      <View
        style={[
          communityStyles.progressTrack,
          isLight && communityStyles.progressTrackLight,
        ]}
      >
        <View
          style={[
            communityStyles.progressFill,
            { width: `${Math.max(4, challenge.progress.percent)}%` as any },
          ]}
        />
      </View>
      <View
        style={[
          communityStyles.leaderboardStrip,
          isLight && communityStyles.leaderboardStripLight,
        ]}
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={18}
          color={isLight ? "#475569" : "#CBD5E1"}
        />
        <Text
          style={[
            communityStyles.leaderboardText,
            isLight && communityStyles.leaderboardTextLight,
          ]}
        >
          {challenge.xpReward > 0
            ? `Reward: ${challenge.badgeRewardPreview || "Badge"} +${challenge.xpReward} XP`
            : "Community challenge / qualifying workouts add points"}
        </Text>
      </View>
      <View style={communityStyles.actionRow}>
        <TouchableOpacity
          style={[
            communityStyles.secondaryButton,
            isLight && communityStyles.secondaryButtonLight,
          ]}
          activeOpacity={0.86}
          onPress={() => openTrainingChallenge(challenge)}
        >
          <Text
            style={[
              communityStyles.secondaryButtonText,
              isLight && communityStyles.secondaryButtonTextLight,
            ]}
          >
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            communityStyles.cardButton,
            communityStyles.actionPrimary,
            challenge.joined && communityStyles.cardButtonJoined,
            challenge.completed && communityStyles.cardButtonMuted,
          ]}
          activeOpacity={0.86}
          disabled={challenge.joined || challenge.completed}
          onPress={() =>
            void joinTrainingChallenge(challenge.id).then(reloadPremiumChallenges)
          }
        >
          <Text style={communityStyles.cardButtonText}>
            {challenge.completed
              ? "Completed"
              : challenge.joined
                ? "Joined"
                : "Join"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderPremiumAccessCard = (challenge?: PremiumChallengeCard) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={openChallengesScreen}
      style={[
        communityStyles.premiumChallengeCard,
        isLight && communityStyles.premiumChallengeCardLight,
      ]}
    >
      <View style={communityStyles.premiumChallengeContent}>
        <View style={communityStyles.premiumBadgeRow}>
          <View style={communityStyles.premiumBadge}>
            <Ionicons name="sparkles-outline" size={14} color="#FFFFFF" />
          </View>
          <Text style={communityStyles.premiumEyebrow}>
            Premium challenges
          </Text>
        </View>
        <Text
          style={[
            communityStyles.premiumTitle,
            isLight && communityStyles.premiumTitleLight,
          ]}
        >
          {challenge?.name ?? "Stronger together. Better every day."}
        </Text>
        <Text
          style={[
            communityStyles.premiumBody,
            isLight && communityStyles.premiumBodyLight,
          ]}
          numberOfLines={2}
        >
          {challenge?.description ||
            challenge?.requirement ||
            "Premium members get curated challenges, tighter rules, and reward tracks."}
        </Text>
        <View style={communityStyles.premiumStatsRow}>
          <Text style={communityStyles.premiumStatText}>
            {challenge ? `${challenge.participants} joined` : "Curated"}
          </Text>
          <Text style={communityStyles.premiumStatText}>
            {challenge ? `${challenge.daysLeft} days left` : "Rewarded"}
          </Text>
          <Text style={communityStyles.premiumStatText}>
            {challenge
              ? challenge.xpReward > 0
                ? `${challenge.xpReward} XP`
                : "Points"
              : "Premium"}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={openChallengesScreen}
          style={[
            communityStyles.premiumButton,
            !hasOpenPremiumAccess && communityStyles.premiumButtonLocked,
          ]}
        >
          <Ionicons
            name={hasOpenPremiumAccess ? "arrow-forward" : "lock-closed-outline"}
            size={15}
            color="#FFFFFF"
          />
          <Text style={communityStyles.premiumButtonText}>
            {hasOpenPremiumAccess ? "Open challenges" : "Premium only"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={communityStyles.premiumMark}>
        <Text style={communityStyles.premiumMarkText}>5K</Text>
      </View>
    </TouchableOpacity>
  );

  const renderChallengeListHeader = (
    title: string,
    subtitle: string,
    count?: number,
  ) => (
    <View style={communityStyles.challengeSectionHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[
            communityStyles.challengeSectionTitle,
            isLight && communityStyles.challengeSectionTitleLight,
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            communityStyles.challengeSectionSubtitle,
            isLight && communityStyles.challengeSectionSubtitleLight,
          ]}
        >
          {subtitle}
        </Text>
      </View>
      {typeof count === "number" ? (
        <Text style={communityStyles.challengeSectionCount}>{count}</Text>
      ) : null}
    </View>
  );

  const renderBodyBattleChallengeCard = (challenge: ApiChallenge) => {
    const locked = challenge.card.status === "locked";
    const done = challenge.card.status === "done";
    const progressPercent = done ? 100 : locked ? 0 : 18;
    const levelLabel = titleCase(challenge.card.level);
    const tagText = challenge.card.body_map_tags?.length
      ? challenge.card.body_map_tags.join(" / ")
      : "Body Battle";

    return (
      <TouchableOpacity
        key={challenge.id}
        activeOpacity={0.9}
        onPress={() => {
          setBodyChallengeDetailTab(locked ? "unlock" : "about");
          setSelectedChallenge(challenge);
        }}
        style={[communityStyles.card, isLight && communityStyles.cardLight]}
      >
        <View style={communityStyles.cardHeader}>
          <View
            style={[
              communityStyles.challengeIcon,
              isLight && communityStyles.challengeIconLight,
            ]}
          >
            <Ionicons
              name={
                done
                  ? "checkmark-circle"
                  : locked
                    ? "lock-closed-outline"
                    : "body-outline"
              }
              size={21}
              color={done ? "#16A34A" : locked ? "#94A3B8" : PS_BLUE}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
            <Text
              style={[
                communityStyles.cardTitle,
                isLight && communityStyles.cardTitleLight,
              ]}
              numberOfLines={2}
            >
              {challenge.card.name}
            </Text>
            <Text
              style={[
                communityStyles.metaText,
                isLight && communityStyles.metaTextLight,
              ]}
              numberOfLines={1}
            >
              {levelLabel} / {tagText}
            </Text>
          </View>
        </View>
        <Text
          style={[
            communityStyles.cardBody,
            isLight && communityStyles.cardBodyLight,
          ]}
          numberOfLines={2}
        >
          {challenge.card.short_description}
        </Text>
        <View
          style={[
            communityStyles.progressTrack,
            isLight && communityStyles.progressTrackLight,
          ]}
        >
          <View
            style={[
              communityStyles.progressFill,
              { width: `${Math.max(4, progressPercent)}%` as any },
            ]}
          />
        </View>
        <View
          style={[
            communityStyles.leaderboardStrip,
            isLight && communityStyles.leaderboardStripLight,
          ]}
        >
          <Ionicons
            name="medal-outline"
            size={18}
            color={isLight ? "#475569" : "#CBD5E1"}
          />
          <Text
            style={[
              communityStyles.leaderboardText,
              isLight && communityStyles.leaderboardTextLight,
            ]}
            numberOfLines={1}
          >
            {locked
              ? buildUnlockText(challenge)
              : `${challenge.detail.badge_name || "Badge"} / ${challenge.detail.duration_days || 1} days`}
          </Text>
        </View>
        <View style={communityStyles.actionRow}>
          <TouchableOpacity
            style={[
              communityStyles.secondaryButton,
              isLight && communityStyles.secondaryButtonLight,
            ]}
            activeOpacity={0.86}
            onPress={() => {
              setBodyChallengeDetailTab(locked ? "unlock" : "about");
              setSelectedChallenge(challenge);
            }}
          >
            <Text
              style={[
                communityStyles.secondaryButtonText,
                isLight && communityStyles.secondaryButtonTextLight,
              ]}
            >
              Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              communityStyles.cardButton,
              communityStyles.actionPrimary,
              (locked || done) && communityStyles.cardButtonMuted,
            ]}
            activeOpacity={0.86}
            disabled={locked}
            onPress={() => void setChallengeCompleted(challenge.id, !done)}
          >
            <Text style={communityStyles.cardButtonText}>
              {locked ? "Locked" : done ? "Completed" : "Mark done"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBodyBattleChallenges = (items: ApiChallenge[] = bodyBattleChallenges) => {
    if (loading) {
      return (
        <View style={communityStyles.loadingWrap}>
          <ActivityIndicator color={PS_BLUE} />
        </View>
      );
    }

    if (error) {
      return (
        <Text
          style={[
            communityStyles.errorText,
            isLight && communityStyles.errorTextLight,
          ]}
        >
          {error}
        </Text>
      );
    }

    if (!items.length) return null;
    return items.map(renderBodyBattleChallengeCard);
  };

  const renderCreatedChallenges = () => (
    <>
      {renderChallengeListHeader(
        "Group and community",
        "Challenges created by members and clubs.",
        premiumChallenges.community.length,
      )}
      <TouchableOpacity
        style={[
          communityStyles.createPanel,
          isLight && communityStyles.createPanelLight,
        ]}
        activeOpacity={0.86}
        onPress={() => setChallengeModalVisible(true)}
      >
        <Ionicons
          name="add-circle-outline"
          size={22}
          color={isLight ? "#0F172A" : "#F8FAFC"}
        />
        <Text
          style={[
            communityStyles.createText,
            isLight && communityStyles.createTextLight,
          ]}
        >
          Create a challenge with rules, eligibility, duration, and rewards
        </Text>
      </TouchableOpacity>
      {!premiumChallenges.community.length ? (
        <View
          style={[communityStyles.card, isLight && communityStyles.cardLight]}
        >
          <Text
            style={[
              communityStyles.cardTitle,
              isLight && communityStyles.cardTitleLight,
            ]}
          >
            No community challenges yet
          </Text>
          <Text
            style={[
              communityStyles.cardBody,
              isLight && communityStyles.cardBodyLight,
            ]}
          >
            Build the first one from real workout rules and it will show here
            after the API confirms it.
          </Text>
        </View>
      ) : null}
      {premiumChallenges.community.map(renderPremiumChallengeCard)}
    </>
  );

  const renderBodyBattleByDifficulty = (items: ApiChallenge[]) => {
    const groups = [
      {
        key: "beginner",
        title: "Beginner",
        subtitle: "Start with clean volume and simple body-map wins.",
      },
      {
        key: "intermediate",
        title: "Intermediate",
        subtitle: "Higher commitment challenges for stronger consistency.",
      },
      {
        key: "advanced",
        title: "Advanced",
        subtitle: "Demanding cards for athletes with proven body-part ranks.",
      },
    ] as const;

    return (
      <>
        {groups.map((group) => {
          const groupItems = items.filter((item) => item.card.level === group.key);
          if (!groupItems.length) return null;
          return (
            <View key={group.key} style={communityStyles.challengeSubsection}>
              {renderChallengeListHeader(
                group.title,
                group.subtitle,
                groupItems.length,
              )}
              {renderBodyBattleChallenges(groupItems)}
            </View>
          );
        })}
      </>
    );
  };

  const renderChallengeSection = () => {
    const premiumSpotlight =
      premiumChallenges.official[0] ??
      premiumChallenges.trending[0] ??
      premiumChallenges.community[0] ??
      premiumChallenges.active[0];
    const map: Record<ChallengeTab, PremiumChallengeCard[]> = {
      active: premiumChallenges.active,
      trending: premiumChallenges.trending,
      created: premiumChallenges.community,
      all: [
        ...premiumChallenges.active,
        ...premiumChallenges.trending,
        ...premiumChallenges.official,
        ...premiumChallenges.community,
      ].filter(
        (challenge, index, all) =>
          all.findIndex((item) => item.id === challenge.id) === index,
      ),
      completed: premiumChallenges.completed,
    };
    const copy: Record<ChallengeTab, { title: string; subtitle: string }> = {
      active: {
        title: "For you",
        subtitle: "Challenges you have joined or can continue now.",
      },
      trending: {
        title: "Trending now",
        subtitle: "Popular challenges with active participation.",
      },
      created: {
        title: "Group and community",
        subtitle: "Challenges created by members and clubs.",
      },
      all: {
        title: "All challenges",
        subtitle: "Premium, group, and Body Battle challenges in one place.",
      },
      completed: {
        title: "Completed",
        subtitle: "Your finished challenge history.",
      },
    };
    const categoryTabs: Array<{
      key: ChallengeTab;
      label: string;
      icon: IoniconName;
    }> = [
      { key: "active", label: "For you", icon: "person-outline" },
      { key: "trending", label: "Trending", icon: "flame-outline" },
      { key: "created", label: "Group", icon: "people-outline" },
      { key: "all", label: "All", icon: "grid-outline" },
      { key: "completed", label: "Done", icon: "checkmark-circle-outline" },
    ];

    const renderContent = () => {
      if (challengeTab === "created") return renderCreatedChallenges();
      const list = map[challengeTab];
      const bodyList =
        challengeTab === "active"
          ? bodyBattleChallenges.filter((item) => item.card.status === "unlocked")
          : challengeTab === "all"
            ? bodyBattleChallenges
            : challengeTab === "completed"
              ? bodyBattleChallenges.filter((item) => item.card.status === "done")
              : [];
      if (!list.length) {
        if (bodyList.length) {
          return (
            <>
              {renderChallengeListHeader(
                copy[challengeTab].title,
                copy[challengeTab].subtitle,
                bodyList.length,
              )}
              {challengeTab === "all"
                ? renderBodyBattleByDifficulty(bodyList)
                : renderBodyBattleChallenges(bodyList)}
            </>
          );
        }
        return (
          <>
            {renderChallengeListHeader(copy[challengeTab].title, copy[challengeTab].subtitle, 0)}
            <View
              style={[communityStyles.card, isLight && communityStyles.cardLight]}
            >
              <Text
                style={[
                  communityStyles.cardTitle,
                  isLight && communityStyles.cardTitleLight,
                ]}
              >
                Nothing here yet
              </Text>
              <Text
                style={[
                  communityStyles.cardBody,
                  isLight && communityStyles.cardBodyLight,
                ]}
              >
                Join a challenge or finish a workout to populate this section.
              </Text>
            </View>
          </>
        );
      }
      return (
        <>
          {renderChallengeListHeader(
            copy[challengeTab].title,
            copy[challengeTab].subtitle,
            list.length + bodyList.length,
          )}
          {list.map(renderPremiumChallengeCard)}
          {bodyList.length ? (
            challengeTab === "all" ? (
              renderBodyBattleByDifficulty(bodyList)
            ) : (
              <>
                <View style={{ marginTop: 12 }}>
                  {renderChallengeListHeader(
                    "Body Battle",
                    "Rank-based beginner, intermediate, and advanced challenges.",
                    bodyList.length,
                  )}
                </View>
                {renderBodyBattleChallenges(bodyList)}
              </>
            )
          ) : null}
        </>
      );
    };

    return (
      <>
        {renderPremiumAccessCard(premiumSpotlight)}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={communityStyles.challengeCategoryScroll}
          contentContainerStyle={communityStyles.challengeCategoryContent}
        >
          {categoryTabs.map((tab) => {
            const selected = challengeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.86}
                style={[
                  communityStyles.challengeCategoryPill,
                  isLight && communityStyles.challengeCategoryPillLight,
                  selected && communityStyles.challengeCategoryPillActive,
                ]}
                onPress={() => setChallengeTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={selected ? "#FFFFFF" : isLight ? "#475569" : "#A7ADBC"}
                />
                <Text
                  style={[
                    communityStyles.challengeCategoryText,
                    isLight && communityStyles.challengeCategoryTextLight,
                    selected && communityStyles.challengeCategoryTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {renderContent()}
      </>
    );
  };

  const renderLeaderboard = () => {
    const rows = leaderboardData?.results ?? [];
    const currentGroup = groups.find(
      (group) => Number(group.id) === leaderboardGroupId,
    );
    return (
      <>
        <View
          style={[communityStyles.hero, isLight && communityStyles.heroLight]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[
                communityStyles.eyebrow,
                isLight && communityStyles.eyebrowLight,
              ]}
            >
              Status
            </Text>
            <Text
              style={[
                communityStyles.heroTitle,
                isLight && communityStyles.heroTitleLight,
              ]}
            >
              Leaderboards for every circle.
            </Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={communityStyles.filterScroll}
        >
          {(
            ["global", "following", "group", "location"] as LeaderboardScope[]
          ).map((scope) => {
            const selected = leaderboardScope === scope;
            return (
              <TouchableOpacity
                key={scope}
                activeOpacity={0.86}
                style={[
                  communityStyles.filterPill,
                  isLight && communityStyles.filterPillLight,
                  selected && communityStyles.filterPillSelected,
                ]}
                onPress={() => {
                  if (scope === "group") {
                    setGroupPickerVisible(true);
                    setLeaderboardScope("group");
                  } else {
                    setLeaderboardScope(scope);
                    setLeaderboardGroupId(null);
                  }
                }}
              >
                <Ionicons
                  name={
                    scope === "following"
                      ? "people-outline"
                      : scope === "group"
                        ? "albums-outline"
                        : scope === "location"
                          ? "location-outline"
                          : "podium-outline"
                  }
                  size={15}
                  color={selected ? "#FFFFFF" : isLight ? "#334155" : "#CBD5E1"}
                />
                <Text
                  style={[
                    communityStyles.filterPillText,
                    isLight && communityStyles.filterPillTextLight,
                    selected && communityStyles.filterPillTextSelected,
                  ]}
                >
                  {scope === "group" && currentGroup
                    ? currentGroup.name
                    : titleCase(scope)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={communityStyles.filterScroll}
        >
          {[
            ["overall", "Overall"],
            ["consistent", "Consistency"],
            ["active", "Active"],
            ["challenges", "Challenges"],
          ].map(([metric, label]) => {
            const selected = leaderboardMetric === metric;
            return (
              <TouchableOpacity
                key={metric}
                activeOpacity={0.86}
                style={[
                  communityStyles.metricPill,
                  isLight && communityStyles.metricPillLight,
                  selected && communityStyles.metricPillSelected,
                ]}
                onPress={() => setLeaderboardMetric(metric)}
              >
                <Text
                  style={[
                    communityStyles.metricPillText,
                    isLight && communityStyles.metricPillTextLight,
                    selected && communityStyles.metricPillTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {leaderboardLoading ? (
          <View style={communityStyles.loadingWrap}>
            <ActivityIndicator color={PS_BLUE} />
          </View>
        ) : rows.length ? (
          rows.slice(0, 30).map((row, index) => (
            <View
              key={`${row.id}-${index}`}
              style={[
                communityStyles.card,
                isLight && communityStyles.cardLight,
              ]}
            >
              <View style={communityStyles.cardHeader}>
                <Text
                  style={[
                    communityStyles.rankNumber,
                    isLight && communityStyles.rankNumberLight,
                  ]}
                >
                  #{index + 1}
                </Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      communityStyles.cardTitle,
                      isLight && communityStyles.cardTitleLight,
                    ]}
                    numberOfLines={1}
                  >
                    {row.name}
                  </Text>
                  <Text
                    style={[
                      communityStyles.metaText,
                      isLight && communityStyles.metaTextLight,
                    ]}
                  >
                    {row.tier ?? "Rookie"} / {row.weeklyXp ?? 0} XP this week
                  </Text>
                </View>
                <Text
                  style={[
                    communityStyles.rankScore,
                    isLight && communityStyles.rankScoreLight,
                  ]}
                >
                  {Math.round(row.performanceScore ?? row.overallScore ?? 0)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View
            style={[communityStyles.card, isLight && communityStyles.cardLight]}
          >
            <Text
              style={[
                communityStyles.cardTitle,
                isLight && communityStyles.cardTitleLight,
              ]}
            >
              No athletes yet
            </Text>
            <Text
              style={[
                communityStyles.cardBody,
                isLight && communityStyles.cardBodyLight,
              ]}
            >
              This leaderboard will fill once athletes log workouts in this
              scope.
            </Text>
          </View>
        )}
      </>
    );
  };

  const completedChallengeParticipants = challengeParticipants.filter(
    (participant) => participant.status === "completed",
  );
  const visibleChallengeParticipants =
    challengeDetailTab === "completed"
      ? completedChallengeParticipants
      : challengeParticipants;

  return (
    <>
      <ScrollView
        style={[communityStyles.screen, isLight && communityStyles.screenLight]}
        contentContainerStyle={communityStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderCommunityHeader()}

        <View
          style={[
            communityStyles.topTabs,
            isLight && communityStyles.topTabsLight,
          ]}
        >
          {renderTabButton("groups", "Groups", "people-outline")}
          {renderTabButton("challenges", "Challenges", "trophy-outline")}
        </View>

        {activeTab === "groups" ? (
          renderGroups()
        ) : (
          renderChallengeSection()
        )}
      </ScrollView>

      <Modal
        visible={!!selectedChallenge}
        animationType="slide"
        onRequestClose={() => setSelectedChallenge(null)}
      >
        <View
          style={[
            communityStyles.challengeDetailScreen,
            isLight && communityStyles.challengeDetailScreenLight,
          ]}
        >
          <View
            style={[
              communityStyles.challengeDetailContent,
              isLight && communityStyles.challengeDetailContentLight,
            ]}
          >
            <View style={communityStyles.challengeDetailTopBar}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedChallenge(null)}
                style={[
                  communityStyles.iconButton,
                  isLight && communityStyles.iconButtonLight,
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={isLight ? "#0F172A" : "#F8FAFC"}
                />
              </TouchableOpacity>
              <Text
                style={[
                  communityStyles.challengeDetailTopTitle,
                  isLight && communityStyles.challengeDetailTopTitleLight,
                ]}
              >
                Body Battle
              </Text>
              <View style={communityStyles.topBarSpacer} />
            </View>

            <View
              style={[
                communityStyles.challengeDetailHero,
                isLight && communityStyles.challengeDetailHeroLight,
              ]}
            >
              <View
                style={[
                  communityStyles.challengeIcon,
                  isLight && communityStyles.challengeIconLight,
                ]}
              >
                <Ionicons
                  name={
                    selectedChallenge?.card.status === "locked"
                      ? "lock-closed-outline"
                      : selectedChallenge?.card.status === "done"
                        ? "checkmark-circle"
                        : "body-outline"
                  }
                  size={21}
                  color={
                    selectedChallenge?.card.status === "done"
                      ? WORKOUT_SUCCESS
                      : selectedChallenge?.card.status === "locked"
                        ? "#94A3B8"
                        : PS_BLUE
                  }
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                <Text
                  style={[
                    communityStyles.modalTitle,
                    isLight && communityStyles.modalTitleLight,
                    { marginBottom: 2 },
                  ]}
                  numberOfLines={2}
                >
                  {selectedChallenge?.card.name}
                </Text>
                <Text
                  style={[
                    communityStyles.metaText,
                    isLight && communityStyles.metaTextLight,
                  ]}
                  numberOfLines={1}
                >
                  {titleCase(selectedChallenge?.card.level ?? "")} /{" "}
                  {selectedChallenge?.card.body_map_tags?.join(" / ") ||
                    "Body-map challenge"}
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={communityStyles.challengeDetailScroll}
              contentContainerStyle={communityStyles.challengeDetailScrollContent}
            >
              <View style={communityStyles.statsGrid}>
                <StatTile
                  label="Days"
                  value={String(selectedChallenge?.detail.duration_days ?? 1)}
                  isLight={isLight}
                />
                <StatTile
                  label="Difficulty"
                  value={String(selectedChallenge?.detail.difficulty ?? selectedChallenge?.card.level_index ?? 1)}
                  isLight={isLight}
                />
                <StatTile
                  label="Status"
                  value={
                    selectedChallenge?.card.status === "done"
                      ? "Done"
                      : selectedChallenge?.card.status === "locked"
                        ? "Locked"
                        : "Open"
                  }
                  isLight={isLight}
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={communityStyles.detailTabs}
                contentContainerStyle={communityStyles.detailTabsContent}
              >
                {(
                  [
                    ["about", "About", "information-circle-outline"],
                    ["schedule", "Schedule", "calendar-outline"],
                    [
                      "unlock",
                      selectedChallenge?.card.status === "locked" ? "Unlock" : "Rules",
                      selectedChallenge?.card.status === "locked"
                        ? "lock-closed-outline"
                        : "shield-checkmark-outline",
                    ],
                  ] as Array<[BodyChallengeDetailTab, string, IoniconName]>
                ).map(([tab, label, icon]) => {
                  const selected = bodyChallengeDetailTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      activeOpacity={0.84}
                      style={[
                        communityStyles.detailTab,
                        selected && communityStyles.detailTabSelected,
                      ]}
                      onPress={() => setBodyChallengeDetailTab(tab)}
                    >
                      <Ionicons
                        name={icon}
                        size={14}
                        color={selected ? "#FFFFFF" : isLight ? "#64748B" : "#A1A7B8"}
                      />
                      <Text
                        style={[
                          communityStyles.detailTabText,
                          isLight && communityStyles.detailTabTextLight,
                          selected && communityStyles.detailTabTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {bodyChallengeDetailTab === "about" ? (
                <>
                  <Text
                    style={[
                      communityStyles.cardBody,
                      isLight && communityStyles.cardBodyLight,
                      { marginTop: 0 },
                    ]}
                  >
                    {selectedChallenge?.card.short_description}
                  </Text>
                  <View
                    style={[
                      communityStyles.detailPanel,
                      isLight && communityStyles.detailPanelLight,
                      { marginTop: 12 },
                    ]}
                  >
                    <Text
                      style={[
                        communityStyles.modalLabel,
                        isLight && communityStyles.modalLabelLight,
                        { marginTop: 0 },
                      ]}
                    >
                      Challenge focus
                    </Text>
                    <Text
                      style={[
                        communityStyles.highlightText,
                        isLight && communityStyles.highlightTextLight,
                        { marginLeft: 0 },
                      ]}
                    >
                      {selectedChallenge?.detail.format || "Structured body-map progression"}
                    </Text>
                    {selectedChallenge?.detail.quote ? (
                      <Text
                        style={[
                          communityStyles.cardBody,
                          isLight && communityStyles.cardBodyLight,
                        ]}
                      >
                        {selectedChallenge.detail.quote}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : null}

              {bodyChallengeDetailTab === "schedule" ? (
                <View>
                  {(selectedChallenge?.detail.days ?? []).map((day) => (
                    <View
                      key={`${selectedChallenge?.id}-${day.day_number}`}
                      style={[
                        communityStyles.detailPanel,
                        isLight && communityStyles.detailPanelLight,
                        { marginTop: 0, marginBottom: 10 },
                      ]}
                    >
                      <View style={communityStyles.cardHeader}>
                        <View
                          style={[
                            communityStyles.challengeIcon,
                            isLight && communityStyles.challengeIconLight,
                            { width: 34, height: 34, borderRadius: 12 },
                          ]}
                        >
                          <Ionicons
                            name={
                              day.day_type === "rest"
                                ? "moon-outline"
                                : day.day_type === "test"
                                  ? "pulse-outline"
                                  : "barbell-outline"
                            }
                            size={17}
                            color={PS_BLUE}
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
                          <Text
                            style={[
                              communityStyles.cardTitle,
                              isLight && communityStyles.cardTitleLight,
                              { fontSize: 14, lineHeight: 19 },
                            ]}
                            numberOfLines={1}
                          >
                            Day {day.day_number} / {day.day_title}
                          </Text>
                          <Text
                            style={[
                              communityStyles.metaText,
                              isLight && communityStyles.metaTextLight,
                            ]}
                            numberOfLines={1}
                          >
                            {titleCase(day.day_type)}
                            {day.track_metric ? ` / ${day.track_metric}` : ""}
                          </Text>
                        </View>
                      </View>
                      {day.exercises.length ? (
                        <View style={communityStyles.optionGrid}>
                          {day.exercises.map((exercise, index) => (
                            <View
                              key={`${exercise.name}-${index}`}
                              style={[
                                communityStyles.optionPill,
                                isLight && communityStyles.optionPillLight,
                              ]}
                            >
                              <Text
                                style={[
                                  communityStyles.optionPillText,
                                  isLight && communityStyles.optionPillTextLight,
                                ]}
                              >
                                {exercise.name} {exercise.reps_or_time}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                      {day.day_note || day.goal ? (
                        <Text
                          style={[
                            communityStyles.cardBody,
                            isLight && communityStyles.cardBodyLight,
                          ]}
                        >
                          {[day.day_note, day.goal].filter(Boolean).join("\n\n")}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}

              {bodyChallengeDetailTab === "unlock" ? (
                <View
                  style={[
                    communityStyles.detailPanel,
                    isLight && communityStyles.detailPanelLight,
                    { marginTop: 0 },
                  ]}
                >
                  <Text
                    style={[
                      communityStyles.modalLabel,
                      isLight && communityStyles.modalLabelLight,
                      { marginTop: 0 },
                    ]}
                  >
                    {selectedChallenge?.card.status === "locked"
                      ? "How to unlock"
                      : "Completion rule"}
                  </Text>
                  <Text
                    style={[
                      communityStyles.highlightText,
                      isLight && communityStyles.highlightTextLight,
                      { marginLeft: 0 },
                    ]}
                  >
                    {selectedChallenge?.card.status === "locked"
                      ? selectedChallenge
                        ? buildUnlockText(selectedChallenge)
                        : ""
                      : selectedChallenge?.detail.complete_condition ||
                        "Complete every scheduled day."}
                  </Text>
                  {selectedChallenge?.detail.badge_name ? (
                    <Text
                      style={[
                        communityStyles.cardBody,
                        isLight && communityStyles.cardBodyLight,
                      ]}
                    >
                      Badge reward: {selectedChallenge.detail.badge_name}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  communityStyles.cardButton,
                  selectedChallenge?.card.status === "done" &&
                    communityStyles.cardButtonMuted,
                  selectedChallenge?.card.status === "locked" &&
                    communityStyles.cardButtonMuted,
                ]}
                activeOpacity={0.86}
                disabled={selectedChallenge?.card.status === "locked"}
                onPress={() => {
                  if (!selectedChallenge) return;
                  void setChallengeCompleted(
                    selectedChallenge.id,
                    selectedChallenge.card.status !== "done",
                  ).then(() => setSelectedChallenge(null));
                }}
              >
                <Text style={communityStyles.cardButtonText}>
                  {selectedChallenge?.card.status === "done"
                    ? "Completed"
                    : selectedChallenge?.card.status === "locked"
                      ? "Locked"
                      : "Mark complete"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!selectedPremiumChallenge}
        animationType="slide"
        onRequestClose={() => setSelectedPremiumChallenge(null)}
      >
        <View
          style={[
            communityStyles.challengeDetailScreen,
            isLight && communityStyles.challengeDetailScreenLight,
          ]}
        >
          <View
            style={[
              communityStyles.challengeDetailContent,
              isLight && communityStyles.challengeDetailContentLight,
            ]}
          >
            <View style={communityStyles.challengeDetailTopBar}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedPremiumChallenge(null)}
                style={[
                  communityStyles.iconButton,
                  isLight && communityStyles.iconButtonLight,
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={isLight ? "#0F172A" : "#F8FAFC"}
                />
              </TouchableOpacity>
              <Text
                style={[
                  communityStyles.challengeDetailTopTitle,
                  isLight && communityStyles.challengeDetailTopTitleLight,
                ]}
              >
                Challenge
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void shareTrainingChallenge()}
                style={[
                  communityStyles.iconButton,
                  isLight && communityStyles.iconButtonLight,
                ]}
              >
                <Ionicons
                  name="share-outline"
                  size={19}
                  color={isLight ? "#0F172A" : "#F8FAFC"}
                />
              </TouchableOpacity>
            </View>
            <View
              style={[
                communityStyles.challengeDetailHero,
                isLight && communityStyles.challengeDetailHeroLight,
              ]}
            >
              <View
                style={[
                  communityStyles.challengeIcon,
                  isLight && communityStyles.challengeIconLight,
                ]}
              >
                <Ionicons
                  name="trophy-outline"
                  size={21}
                  color={isLight ? PS_BLUE : WORKOUT_ACCENT_BLUE}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[
                    communityStyles.modalTitle,
                    isLight && communityStyles.modalTitleLight,
                    { marginBottom: 2 },
                  ]}
                  numberOfLines={2}
                >
                  {selectedPremiumChallenge?.name}
                </Text>
                <Text
                  style={[
                    communityStyles.metaText,
                    isLight && communityStyles.metaTextLight,
                  ]}
                >
                  {selectedPremiumChallenge?.visibility === "group"
                    ? selectedPremiumChallenge?.groupName ?? "Group challenge"
                    : selectedPremiumChallenge?.isOfficial
                      ? "Premium challenge"
                      : "Community challenge"}
                </Text>
              </View>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={communityStyles.challengeDetailScroll}
              contentContainerStyle={communityStyles.challengeDetailScrollContent}
            >
              <View style={communityStyles.statsGrid}>
                <StatTile
                  label="Participants"
                  value={String(selectedPremiumChallenge?.participants ?? 0)}
                  isLight={isLight}
                />
                <StatTile
                  label="Days left"
                  value={String(selectedPremiumChallenge?.daysLeft ?? 0)}
                  isLight={isLight}
                />
                <StatTile
                  label="Reward"
                  value={
                    selectedPremiumChallenge?.xpReward
                      ? `${selectedPremiumChallenge.xpReward} XP`
                      : "Points"
                  }
                  isLight={isLight}
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={communityStyles.detailTabs}
                contentContainerStyle={communityStyles.detailTabsContent}
              >
                {(
                  [
                    ["about", "About", "information-circle-outline"],
                    ["rules", "Rules", "shield-checkmark-outline"],
                    ["participants", "Athletes", "people-outline"],
                    ["completed", "Completed", "checkmark-circle-outline"],
                  ] as Array<[ChallengeDetailTab, string, IoniconName]>
                ).map(
                  ([tab, label, icon]) => {
                    const selected = challengeDetailTab === tab;
                    return (
                      <TouchableOpacity
                        key={tab}
                        activeOpacity={0.84}
                        style={[
                          communityStyles.detailTab,
                          selected && communityStyles.detailTabSelected,
                        ]}
                        onPress={() => setChallengeDetailTab(tab)}
                      >
                        <Ionicons
                          name={icon}
                          size={14}
                          color={selected ? "#FFFFFF" : isLight ? "#64748B" : "#A1A7B8"}
                        />
                        <Text
                          style={[
                            communityStyles.detailTabText,
                            isLight && communityStyles.detailTabTextLight,
                            selected && communityStyles.detailTabTextSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </ScrollView>

              {challengeDetailTab === "about" ? (
                <>
                  <Text
                    style={[
                      communityStyles.cardBody,
                      isLight && communityStyles.cardBodyLight,
                      { marginTop: 0 },
                    ]}
                  >
                    {selectedPremiumChallenge?.description ||
                      selectedPremiumChallenge?.requirement}
                  </Text>
                  <View
                    style={[
                      communityStyles.detailPanel,
                      isLight && communityStyles.detailPanelLight,
                      { marginTop: 12 },
                    ]}
                  >
                    <Text
                      style={[
                        communityStyles.modalLabel,
                        isLight && communityStyles.modalLabelLight,
                        { marginTop: 0 },
                      ]}
                    >
                      Progress
                    </Text>
                    <View
                      style={[
                        communityStyles.progressTrack,
                        isLight && communityStyles.progressTrackLight,
                      ]}
                    >
                      <View
                        style={[
                          communityStyles.progressFill,
                          {
                            width:
                              `${Math.max(4, selectedPremiumChallenge?.progress.percent ?? 4)}%` as any,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        communityStyles.metaText,
                        isLight && communityStyles.metaTextLight,
                      ]}
                    >
                      {selectedPremiumChallenge?.progress.sessionsCompleted ?? 0}/
                      {selectedPremiumChallenge?.progress.requiredSessions ?? 0}{" "}
                      sessions complete
                    </Text>
                  </View>
                </>
              ) : null}

              {challengeDetailTab === "rules" ? (
                <View
                  style={[
                    communityStyles.detailPanel,
                    isLight && communityStyles.detailPanelLight,
                    { marginTop: 0 },
                  ]}
                >
                  <Text
                    style={[
                      communityStyles.modalLabel,
                      isLight && communityStyles.modalLabelLight,
                      { marginTop: 0 },
                    ]}
                  >
                    What counts
                  </Text>
                  <Text
                    style={[
                      communityStyles.highlightText,
                      isLight && communityStyles.highlightTextLight,
                      { marginLeft: 0 },
                    ]}
                  >
                    {selectedPremiumChallenge?.requirement}
                  </Text>
                  <Text
                    style={[
                      communityStyles.cardBody,
                      isLight && communityStyles.cardBodyLight,
                    ]}
                  >
                    Minimum {selectedPremiumChallenge?.minimumDuration ?? 20}{" "}
                    min workout /{" "}
                    {selectedPremiumChallenge?.requiredSessions ??
                      selectedPremiumChallenge?.progress.requiredSessions ??
                      0}{" "}
                    sessions / {selectedPremiumChallenge?.durationDays ?? 0}{" "}
                    days.
                  </Text>
                  <View style={communityStyles.optionGrid}>
                    {(selectedPremiumChallenge?.eligibleWorkoutTypes ?? []).map(
                      (item) => (
                        <View
                          key={item}
                          style={[
                            communityStyles.optionPill,
                            isLight && communityStyles.optionPillLight,
                          ]}
                        >
                          <Text
                            style={[
                              communityStyles.optionPillText,
                              isLight && communityStyles.optionPillTextLight,
                            ]}
                          >
                            {titleCase(item.replace("_", " "))}
                          </Text>
                        </View>
                      ),
                    )}
                    {(selectedPremiumChallenge?.eligibleBodyParts ?? []).map(
                      (item) => (
                        <View
                          key={item}
                          style={[
                            communityStyles.optionPill,
                            isLight && communityStyles.optionPillLight,
                          ]}
                        >
                          <Text
                            style={[
                              communityStyles.optionPillText,
                              isLight && communityStyles.optionPillTextLight,
                            ]}
                          >
                            {titleCase(item.replace("_", " "))}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                </View>
              ) : null}

              {challengeDetailTab === "participants" ||
              challengeDetailTab === "completed" ? (
                <View style={{ marginTop: 2 }}>
                  {challengeParticipantsLoading ? (
                    <ActivityIndicator color={PS_BLUE} />
                  ) : visibleChallengeParticipants.length ? (
                    visibleChallengeParticipants.map((participant) => (
                      <View
                        key={participant.id}
                        style={[
                          communityStyles.participantRow,
                          isLight && communityStyles.participantRowLight,
                        ]}
                      >
                        <View style={communityStyles.participantAvatar}>
                          <Text style={communityStyles.participantAvatarText}>
                            {participant.avatarInitials || "U"}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text
                            style={[
                              communityStyles.cardTitle,
                              isLight && communityStyles.cardTitleLight,
                              { fontSize: 14, lineHeight: 19 },
                            ]}
                          >
                            {participant.userName}
                          </Text>
                          <Text
                            style={[
                              communityStyles.metaText,
                              isLight && communityStyles.metaTextLight,
                            ]}
                          >
                            {participant.progress.sessionsCompleted}/
                            {participant.progress.requiredSessions} sessions /{" "}
                            {participant.progress.points} pts
                          </Text>
                        </View>
                        <Text
                          style={[
                            communityStyles.metaText,
                            participant.status === "completed" && {
                              color: WORKOUT_SUCCESS,
                            },
                          ]}
                        >
                          {titleCase(participant.status)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text
                      style={[
                        communityStyles.cardBody,
                        isLight && communityStyles.cardBodyLight,
                        { marginTop: 0 },
                      ]}
                    >
                      {challengeDetailTab === "completed"
                        ? "No completed athletes yet."
                        : "Participants will appear after athletes join."}
                    </Text>
                  )}
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  communityStyles.cardButton,
                  selectedPremiumChallenge?.joined &&
                    communityStyles.cardButtonJoined,
                  selectedPremiumChallenge?.completed &&
                    communityStyles.cardButtonMuted,
                ]}
                activeOpacity={0.86}
                disabled={
                  !!selectedPremiumChallenge?.joined ||
                  !!selectedPremiumChallenge?.completed
                }
                onPress={() => {
                  if (!selectedPremiumChallenge) return;
                  void joinTrainingChallenge(selectedPremiumChallenge.id).then(
                    async () => {
                      await reloadPremiumChallenges();
                      setSelectedPremiumChallenge(null);
                    },
                  );
                }}
              >
                <Text style={communityStyles.cardButtonText}>
                  {selectedPremiumChallenge?.completed
                    ? "Completed"
                    : selectedPremiumChallenge?.joined
                      ? "Joined"
                      : "Join challenge"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={groupDetailVisible}
        animationType="slide"
        onRequestClose={() => setGroupDetailVisible(false)}
      >
        <View
          style={[
            communityStyles.groupFullScreen,
            isLight && communityStyles.groupFullScreenLight,
          ]}
        >
            {groupDetailLoading ? (
              <View style={communityStyles.loadingWrap}>
                <ActivityIndicator color={PS_BLUE} />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={communityStyles.groupFullContent}
              >
                <View style={communityStyles.groupTopBar}>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => setGroupDetailVisible(false)}
                    style={[
                      communityStyles.groupCircleButton,
                      isLight && communityStyles.groupCircleButtonLight,
                    ]}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={25}
                      color={isLight ? "#0F172A" : "#F8FAFC"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => setGroupMenuOpen((value) => !value)}
                    style={[
                      communityStyles.groupCircleButton,
                      isLight && communityStyles.groupCircleButtonLight,
                    ]}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={22}
                      color={isLight ? "#0F172A" : "#F8FAFC"}
                    />
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    communityStyles.groupHeroLogo,
                    isLight && communityStyles.groupHeroLogoLight,
                  ]}
                >
                  <Ionicons
                    name={
                      (groupDetail?.groupType ?? selectedGroup?.category ?? "")
                        .toLowerCase()
                        .includes("run")
                        ? "walk-outline"
                        : "flag"
                    }
                    size={54}
                    color={PS_BLUE}
                  />
                </View>
                <Text
                  style={[
                    communityStyles.groupHeroTitle,
                    isLight && communityStyles.groupHeroTitleLight,
                  ]}
                >
                  {groupDetail?.name ?? selectedGroup?.name ?? "Group"}
                </Text>
                <View style={communityStyles.groupMetaRow}>
                  <Ionicons
                    name="fitness-outline"
                    size={20}
                    color={isLight ? "#64748B" : "#C8CDD7"}
                  />
                  <Text
                    style={[
                      communityStyles.groupMetaText,
                      isLight && communityStyles.groupMetaTextLight,
                    ]}
                  >
                    {titleCase(groupDetail?.groupType ?? selectedGroup?.category ?? "Open")}
                  </Text>
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={isLight ? "#64748B" : "#C8CDD7"}
                  />
                  <Text
                    style={[
                      communityStyles.groupMetaText,
                      isLight && communityStyles.groupMetaTextLight,
                    ]}
                  >
                    {groupDetail?.memberCount ?? selectedGroup?.members ?? 0} Members
                  </Text>
                  <Ionicons
                    name="globe-outline"
                    size={20}
                    color={isLight ? "#64748B" : "#C8CDD7"}
                  />
                  <Text
                    style={[
                      communityStyles.groupMetaText,
                      isLight && communityStyles.groupMetaTextLight,
                    ]}
                  >
                    {titleCase(groupDetail?.privacy ?? "Public")}
                  </Text>
                </View>
                <Text
                  style={[
                    communityStyles.groupSubtitle,
                    isLight && communityStyles.groupSubtitleLight,
                  ]}
                >
                  {groupDetail?.description ||
                    titleCase(groupDetail?.goal ?? "Just for fun")}
                </Text>
                <View
                  style={[
                    communityStyles.groupActionRail,
                    isLight && communityStyles.groupActionRailLight,
                  ]}
                >
                  {[
                    ["person-add-outline", "Invite"],
                    ["share-outline", "Share"],
                    ["create-outline", "Post"],
                    ["calendar-outline", "Events"],
                    ["podium-outline", "Stats"],
                  ].map(([icon, label]) => (
                    <TouchableOpacity
                      key={label}
                      activeOpacity={0.86}
                      style={communityStyles.groupActionRailItem}
                      onPress={() => {
                        if (label === "Invite") {
                          void shareGroup("invite");
                        } else if (label === "Share") {
                          void shareGroup();
                        } else if (label === "Post") {
                          setGroupFeedTab("posts");
                        } else if (label === "Events") {
                          setGroupFeedTab("events");
                        } else if (label === "Stats") {
                          setGroupFeedTab("stats");
                          setGroupMenuOpen(true);
                          setGroupMenuSection("stats");
                        }
                      }}
                    >
                      <View
                        style={[
                          communityStyles.groupActionIcon,
                          isLight && communityStyles.groupActionIconLight,
                        ]}
                      >
                        <Ionicons
                          name={icon as keyof typeof Ionicons.glyphMap}
                          size={25}
                          color={PS_BLUE}
                        />
                      </View>
                      <Text
                        style={[
                          communityStyles.groupActionText,
                          isLight && communityStyles.groupActionTextLight,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {renderGroupMenuPanel()}
                {!groupDetail?.joined ? (
                  <TouchableOpacity
                    activeOpacity={0.86}
                    style={communityStyles.groupJoinButton}
                      onPress={() => selectedGroup && toggleJoin(selectedGroup.id, routeInviteToken)}
                  >
                    <Text style={communityStyles.cardButtonText}>
                      {groupDetail?.pendingRequest
                        ? "Request sent"
                        : groupDetail?.privacy === "public"
                          ? "Join club"
                          : "Request to join"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {groupDetail?.joined ? (
                  <>
                    <View
                      style={[
                        communityStyles.groupComposer,
                        isLight && communityStyles.groupComposerLight,
                      ]}
                    >
                      <View style={communityStyles.groupComposerMain}>
                        <View
                          style={[
                            communityStyles.todayAvatar,
                            isLight && communityStyles.groupBadgeLight,
                          ]}
                        >
                          <Text
                            style={[
                              communityStyles.todayAvatarText,
                              isLight && communityStyles.groupBadgeTextLight,
                            ]}
                          >
                            {(selectedGroup?.name ?? "GR").slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <TextInput
                          style={[
                            communityStyles.groupComposerInput,
                            isLight && communityStyles.groupComposerInputLight,
                          ]}
                          multiline
                          value={newThreadTitle}
                          onChangeText={setNewThreadTitle}
                          placeholder="What is happening in the group?"
                          placeholderTextColor={isLight ? "#94A3B8" : "#8A8F99"}
                        />
                      </View>
                      <View style={communityStyles.groupComposerActions}>
                        <TouchableOpacity
                          activeOpacity={0.86}
                          onPress={() => void addThreadImage()}
                          style={[
                            communityStyles.groupComposerIconButton,
                            isLight && communityStyles.groupComposerIconButtonLight,
                          ]}
                        >
                          <Ionicons
                            name="image-outline"
                            size={21}
                            color={isLight ? "#0F172A" : "#F8FAFC"}
                          />
                          <Text
                            style={[
                              communityStyles.groupComposerActionText,
                              isLight && communityStyles.groupComposerActionTextLight,
                            ]}
                          >
                            Image
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.86}
                          disabled={threadLoading || !newThreadTitle.trim()}
                          onPress={() => void createThread()}
                          style={[
                            communityStyles.groupComposerButton,
                            (!newThreadTitle.trim() || threadLoading) && { opacity: 0.55 },
                          ]}
                        >
                          <Text style={communityStyles.groupComposerButtonText}>
                            Post
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {newThreadImages.length ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 18 }}
                      >
                        {newThreadImages.map((uri, index) => (
                          <TouchableOpacity
                            key={`${uri}-${index}`}
                            activeOpacity={0.86}
                            onPress={() =>
                              setNewThreadImages((prev) =>
                                prev.filter((_, itemIndex) => itemIndex !== index),
                              )
                            }
                          >
                            <Image
                              source={{ uri }}
                              style={communityStyles.postImage}
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : null}
                  </>
                ) : null}
                {groupDetail?.pinnedAnnouncement ? (
                  <View
                    style={[
                      communityStyles.leaderboardStrip,
                      isLight && communityStyles.leaderboardStripLight,
                    ]}
                  >
                    <Ionicons
                      name="megaphone-outline"
                      size={18}
                      color={isLight ? "#475569" : "#CBD5E1"}
                    />
                    <Text
                      style={[
                        communityStyles.leaderboardText,
                        isLight && communityStyles.leaderboardTextLight,
                      ]}
                    >
                      {groupDetail.pinnedAnnouncement.title}
                    </Text>
                  </View>
                ) : null}
                {renderGroupFeed()}
                <View style={{ display: "none" }}>
                <View style={communityStyles.goalRow}>
                  <Text
                    style={[
                      communityStyles.cardTitle,
                      isLight && communityStyles.cardTitleLight,
                    ]}
                  >
                    Weekly goal
                  </Text>
                  <Text
                    style={[
                      communityStyles.rankScore,
                      isLight && communityStyles.rankScoreLight,
                    ]}
                  >
                    {groupDetail?.weeklyGoal?.current ??
                      selectedGroup?.weeklyActivity ??
                      0}
                    /{groupDetail?.weeklyGoal?.target ?? 300}
                  </Text>
                </View>
                <View
                  style={[
                    communityStyles.progressTrack,
                    isLight && communityStyles.progressTrackLight,
                  ]}
                >
                  <View
                    style={[
                      communityStyles.progressFill,
                      {
                        width:
                          `${Math.max(4, groupDetail?.weeklyGoal?.percent ?? 4)}%` as any,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    communityStyles.sectionTitle,
                    isLight && communityStyles.sectionTitleLight,
                    { marginTop: 20 },
                  ]}
                >
                  Active challenges
                </Text>
                {(groupDetail?.activeChallenges ?? []).length ? (
                  (groupDetail?.activeChallenges ?? []).map((challenge) => (
                    <View
                      key={challenge.id}
                      style={[
                        communityStyles.detailPanel,
                        isLight && communityStyles.detailPanelLight,
                      ]}
                    >
                      <View style={communityStyles.cardHeader}>
                        <Ionicons
                          name="trophy-outline"
                          size={18}
                          color={isLight ? PS_BLUE : WORKOUT_ACCENT_BLUE}
                        />
                        <Text
                          style={[
                            communityStyles.highlightText,
                            isLight && communityStyles.highlightTextLight,
                          ]}
                          numberOfLines={1}
                        >
                          {challenge.title}
                        </Text>
                        <Text
                          style={[
                            communityStyles.highlightMeta,
                            isLight && communityStyles.highlightMetaLight,
                          ]}
                        >
                          {challenge.reward_xp} XP
                        </Text>
                      </View>
                      <Text
                        style={[
                          communityStyles.metaText,
                          isLight && communityStyles.metaTextLight,
                          { marginTop: 8 },
                        ]}
                      >
                        {challenge.required_sessions} sessions /{" "}
                        {challenge.min_duration}+ min / ends{" "}
                        {challenge.end_date}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text
                    style={[
                      communityStyles.cardBody,
                      isLight && communityStyles.cardBodyLight,
                    ]}
                  >
                    No active group challenge right now.
                  </Text>
                )}
                <Text
                  style={[
                    communityStyles.sectionTitle,
                    isLight && communityStyles.sectionTitleLight,
                    { marginTop: 20 },
                  ]}
                >
                  Members
                </Text>
                {groupMembers.length ? (
                  groupMembers.slice(0, 40).map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      activeOpacity={0.86}
                      onPress={() => void openUserProfile(member.userId)}
                      style={communityStyles.memberRow}
                    >
                      <View
                        style={[
                          communityStyles.todayAvatar,
                          isLight && communityStyles.groupBadgeLight,
                        ]}
                      >
                        <Text
                          style={[
                            communityStyles.todayAvatarText,
                            isLight && communityStyles.groupBadgeTextLight,
                          ]}
                        >
                          {member.avatarInitials ??
                            member.userName.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text
                          style={[
                            communityStyles.highlightText,
                            isLight && communityStyles.highlightTextLight,
                          ]}
                          numberOfLines={1}
                        >
                          {member.userName}
                        </Text>
                        <Text
                          style={[
                            communityStyles.metaText,
                            isLight && communityStyles.metaTextLight,
                          ]}
                        >
                          {titleCase(member.role)}
                        </Text>
                      </View>
                      {canManageSelectedGroup && member.role !== "owner" ? (
                        <TouchableOpacity
                          activeOpacity={0.86}
                          disabled={groupActionLoading}
                          onPress={() => void removeMember(member.userId)}
                          style={[
                            communityStyles.iconAction,
                            isLight && communityStyles.iconActionLight,
                          ]}
                        >
                          <Ionicons
                            name="person-remove-outline"
                            size={16}
                            color={isLight ? "#B91C1C" : "#FCA5A5"}
                          />
                        </TouchableOpacity>
                      ) : null}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text
                    style={[
                      communityStyles.cardBody,
                      isLight && communityStyles.cardBodyLight,
                    ]}
                  >
                    Members will appear here after the group syncs.
                  </Text>
                )}
                {canManageSelectedGroup ? (
                  <View
                    style={[
                      communityStyles.adminPanel,
                      isLight && communityStyles.adminPanelLight,
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.86}
                      onPress={() => setAdminToolsOpen((value) => !value)}
                      style={communityStyles.cardHeader}
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={isLight ? PS_BLUE : WORKOUT_ACCENT_BLUE}
                      />
                      <Text
                        style={[
                          communityStyles.sectionTitle,
                          isLight && communityStyles.sectionTitleLight,
                          { marginBottom: 0, marginLeft: 8 },
                        ]}
                      >
                        Admin tools
                      </Text>
                      {groupActionLoading ? (
                        <ActivityIndicator
                          color={PS_BLUE}
                          style={{ marginLeft: "auto" }}
                        />
                      ) : (
                        <Ionicons
                          name={adminToolsOpen ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={isLight ? "#64748B" : "#A1A7B8"}
                          style={{ marginLeft: "auto" }}
                        />
                      )}
                    </TouchableOpacity>
                    {adminToolsOpen ? (
                      <>
                        {groupActionMessage ? (
                          <Text
                            style={[
                              communityStyles.metaText,
                              isLight && communityStyles.metaTextLight,
                              { marginTop: 8 },
                            ]}
                          >
                            {groupActionMessage}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            communityStyles.modalLabel,
                            isLight && communityStyles.modalLabelLight,
                          ]}
                        >
                          Add member
                        </Text>
                        <View style={communityStyles.inlineInputRow}>
                          <TextInput
                            style={[
                              communityStyles.inlineInput,
                              isLight && communityStyles.inlineInputLight,
                            ]}
                            value={memberSearchQuery}
                            onChangeText={setMemberSearchQuery}
                            placeholder="Name or username"
                            placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
                            returnKeyType="search"
                            onSubmitEditing={() => void searchGroupMembers()}
                          />
                          <TouchableOpacity
                            activeOpacity={0.86}
                            disabled={memberSearchLoading}
                            onPress={() => void searchGroupMembers()}
                            style={communityStyles.smallPrimaryButton}
                          >
                            {memberSearchLoading ? (
                              <ActivityIndicator color="#FFFFFF" />
                            ) : (
                              <Ionicons name="search" size={17} color="#FFFFFF" />
                            )}
                          </TouchableOpacity>
                        </View>
                        {memberSuggestions.map((user) => (
                          <TouchableOpacity
                            key={user.id}
                            activeOpacity={0.86}
                            style={communityStyles.memberRow}
                            onPress={() => void inviteMember(user.id)}
                          >
                            <View
                              style={[
                                communityStyles.todayAvatar,
                                isLight && communityStyles.groupBadgeLight,
                              ]}
                            >
                              <Text
                                style={[
                                  communityStyles.todayAvatarText,
                                  isLight && communityStyles.groupBadgeTextLight,
                                ]}
                              >
                                {user.avatarInitials ??
                                  user.name.slice(0, 2).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text
                                style={[
                                  communityStyles.highlightText,
                                  isLight && communityStyles.highlightTextLight,
                                ]}
                                numberOfLines={1}
                              >
                                {user.name}
                              </Text>
                              <Text
                                style={[
                                  communityStyles.metaText,
                                  isLight && communityStyles.metaTextLight,
                                ]}
                              >
                                @{user.username}
                              </Text>
                            </View>
                            <Ionicons
                              name="person-add-outline"
                              size={18}
                              color={isLight ? PS_BLUE : WORKOUT_ACCENT_BLUE}
                            />
                          </TouchableOpacity>
                        ))}
                        <Text
                          style={[
                            communityStyles.modalLabel,
                            isLight && communityStyles.modalLabelLight,
                          ]}
                        >
                          Add note
                        </Text>
                        <TextInput
                          style={[
                            communityStyles.modalInput,
                            isLight && communityStyles.modalInputLight,
                          ]}
                          value={groupNoteTitle}
                          onChangeText={setGroupNoteTitle}
                          placeholder="Pinned note title"
                          placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
                        />
                        <TextInput
                          style={[
                            communityStyles.modalInput,
                            isLight && communityStyles.modalInputLight,
                            { minHeight: 78, textAlignVertical: "top", paddingTop: 13 },
                          ]}
                          multiline
                          value={groupNoteBody}
                          onChangeText={setGroupNoteBody}
                          placeholder="Note details"
                          placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
                        />
                        <TouchableOpacity
                          style={communityStyles.cardButton}
                          activeOpacity={0.86}
                          disabled={groupActionLoading || !groupNoteTitle.trim()}
                          onPress={() => void saveGroupNote()}
                        >
                          <Text style={communityStyles.cardButtonText}>
                            Pin note
                          </Text>
                        </TouchableOpacity>
                        <Text
                          style={[
                            communityStyles.modalLabel,
                            isLight && communityStyles.modalLabelLight,
                          ]}
                        >
                          Events and notifications
                        </Text>
                        <TextInput
                          style={[
                            communityStyles.modalInput,
                            isLight && communityStyles.modalInputLight,
                          ]}
                          value={groupActivityTitle}
                          onChangeText={setGroupActivityTitle}
                          placeholder="Title"
                          placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
                        />
                        <TextInput
                          style={[
                            communityStyles.modalInput,
                            isLight && communityStyles.modalInputLight,
                            { minHeight: 78, textAlignVertical: "top", paddingTop: 13 },
                          ]}
                          multiline
                          value={groupActivityBody}
                          onChangeText={setGroupActivityBody}
                          placeholder="Details for members"
                          placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
                        />
                        <View style={communityStyles.actionRow}>
                          <TouchableOpacity
                            style={[
                              communityStyles.secondaryButton,
                              isLight && communityStyles.secondaryButtonLight,
                            ]}
                            activeOpacity={0.86}
                            disabled={groupActionLoading || !groupActivityTitle.trim()}
                            onPress={() => void saveGroupActivity("event")}
                          >
                            <Text
                              style={[
                                communityStyles.secondaryButtonText,
                                isLight && communityStyles.secondaryButtonTextLight,
                              ]}
                            >
                              Post event
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              communityStyles.cardButton,
                              communityStyles.actionPrimary,
                            ]}
                            activeOpacity={0.86}
                            disabled={groupActionLoading || !groupActivityTitle.trim()}
                            onPress={() => void saveGroupActivity("notification")}
                          >
                            <Text style={communityStyles.cardButtonText}>
                              Notify
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <Text
                        style={[
                          communityStyles.metaText,
                          isLight && communityStyles.metaTextLight,
                          { marginTop: 8 },
                        ]}
                      >
                        Expand to manage members, notes, events, and notifications.
                      </Text>
                    )}
                  </View>
                ) : null}
                <Text
                  style={[
                    communityStyles.sectionTitle,
                    isLight && communityStyles.sectionTitleLight,
                    { marginTop: 20 },
                  ]}
                >
                  This week
                </Text>
                {(groupDetail?.leaderboard?.top ?? [])
                  .slice(0, 5)
                  .map((row) => (
                    <View
                      key={`${row.rank}-${row.userId}`}
                      style={communityStyles.highlightRow}
                    >
                      <Text
                        style={[
                          communityStyles.highlightRank,
                          isLight && communityStyles.highlightRankLight,
                        ]}
                      >
                        #{row.rank}
                      </Text>
                      <Text
                        style={[
                          communityStyles.highlightText,
                          isLight && communityStyles.highlightTextLight,
                        ]}
                        numberOfLines={1}
                      >
                        {row.name}
                        {row.isYou ? " / You" : ""}
                      </Text>
                      <Text
                        style={[
                          communityStyles.highlightMeta,
                          isLight && communityStyles.highlightMetaLight,
                        ]}
                      >
                        {row.score}
	                      </Text>
	                    </View>
	                  ))}
                </View>
	              </ScrollView>
	            )}
	        </View>
	      </Modal>

      <Modal
        visible={!!selectedThread}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedThread(null)}
      >
        <View style={communityStyles.sheetRoot}>
          <TouchableOpacity
            style={communityStyles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedThread(null)}
          />
          <View
            style={[
              communityStyles.sheetCard,
              isLight && communityStyles.modalCardLight,
            ]}
          >
            <View style={communityStyles.sheetHandle} />
            <View style={communityStyles.cardHeader}>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => setSelectedThread(null)}
                style={[
                  communityStyles.iconButton,
                  isLight && communityStyles.iconButtonLight,
                ]}
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color={isLight ? "#0F172A" : "#F8FAFC"}
                />
              </TouchableOpacity>
              <Text
                style={[
                  communityStyles.modalTitle,
                  isLight && communityStyles.modalTitleLight,
                  { flex: 1, marginBottom: 0, marginLeft: 10 },
                ]}
                numberOfLines={1}
              >
                Thread
              </Text>
            </View>
            {selectedThread ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ marginTop: 16 }}
              >
                {renderFeedActivity(selectedThread, { compact: true })}
                <Text
                  style={[
                    communityStyles.sectionTitle,
                    isLight && communityStyles.sectionTitleLight,
                    { marginTop: 18 },
                  ]}
                >
                  Replies
                </Text>
                {threadLoading && !threadComments.length ? (
                  <ActivityIndicator color={PS_BLUE} />
                ) : threadComments.length ? (
                  threadComments.map((comment) => (
                    <TouchableOpacity
                      key={comment.id}
                      activeOpacity={0.86}
                      onPress={() => void openUserProfile(comment.userId)}
                      style={[
                        communityStyles.feedItem,
                        isLight && communityStyles.feedItemLight,
                      ]}
                    >
                      <View
                        style={[
                          communityStyles.todayAvatar,
                          isLight && communityStyles.groupBadgeLight,
                        ]}
                      >
                        <Text
                          style={[
                            communityStyles.todayAvatarText,
                            isLight && communityStyles.groupBadgeTextLight,
                          ]}
                        >
                          {comment.avatarInitials ??
                            comment.userName.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text
                          style={[
                            communityStyles.highlightText,
                            isLight && communityStyles.highlightTextLight,
                            { marginLeft: 0 },
                          ]}
                          numberOfLines={1}
                        >
                          {comment.userName}
                        </Text>
                        <Text
                          style={[
                            communityStyles.cardBody,
                            isLight && communityStyles.cardBodyLight,
                            { marginTop: 4 },
                          ]}
                        >
                          {comment.body}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text
                    style={[
                      communityStyles.cardBody,
                      isLight && communityStyles.cardBodyLight,
                    ]}
                  >
                    No replies yet.
                  </Text>
                )}
                <View
                  style={[
                    communityStyles.threadComposer,
                    isLight && communityStyles.threadComposerLight,
                    { marginTop: 14 },
                  ]}
                >
                  <TextInput
                    style={[
                      communityStyles.inlineInput,
                      isLight && communityStyles.inlineInputLight,
                      { minHeight: 74, textAlignVertical: "top", paddingTop: 12 },
                    ]}
                    multiline
                    value={threadCommentBody}
                    onChangeText={setThreadCommentBody}
                    placeholder="Reply to this thread"
                    placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
                  />
                  <TouchableOpacity
                    activeOpacity={0.86}
                    disabled={threadLoading || !threadCommentBody.trim()}
                    onPress={() => void submitThreadComment()}
                    style={communityStyles.cardButton}
                  >
                    <Text style={communityStyles.cardButtonText}>Reply</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={profileVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileVisible(false)}
      >
        <View style={communityStyles.sheetRoot}>
          <TouchableOpacity
            style={communityStyles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setProfileVisible(false)}
          />
          <View
            style={[
              communityStyles.sheetCard,
              isLight && communityStyles.modalCardLight,
            ]}
          >
            <View style={communityStyles.sheetHandle} />
            <View style={communityStyles.cardHeader}>
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={() => setProfileVisible(false)}
                style={[
                  communityStyles.iconButton,
                  isLight && communityStyles.iconButtonLight,
                ]}
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color={isLight ? "#0F172A" : "#F8FAFC"}
                />
              </TouchableOpacity>
              <Text
                style={[
                  communityStyles.modalTitle,
                  isLight && communityStyles.modalTitleLight,
                  { flex: 1, marginBottom: 0, marginLeft: 10 },
                ]}
              >
                Profile
              </Text>
            </View>
            {profileLoading ? (
              <View style={communityStyles.loadingWrap}>
                <ActivityIndicator color={PS_BLUE} />
              </View>
            ) : selectedProfile ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ marginTop: 16 }}
              >
                <View style={communityStyles.profileHeader}>
                  <View
                    style={[
                      communityStyles.profileAvatar,
                      isLight && communityStyles.groupBadgeLight,
                    ]}
                  >
                    <Text
                      style={[
                        communityStyles.profileAvatarText,
                        isLight && communityStyles.groupBadgeTextLight,
                      ]}
                    >
                      {selectedProfile.public_card.avatarInitials ??
                        selectedProfile.public_card.name
                          .slice(0, 2)
                          .toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={[
                        communityStyles.modalTitle,
                        isLight && communityStyles.modalTitleLight,
                        { marginBottom: 2 },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedProfile.public_card.name}
                    </Text>
                    <Text
                      style={[
                        communityStyles.metaText,
                        isLight && communityStyles.metaTextLight,
                      ]}
                    >
                      @{selectedProfile.public_card.username ?? "user"} /{" "}
                      {selectedProfile.public_card.tier ?? "Rookie"}
                    </Text>
                  </View>
                </View>
                <View style={communityStyles.statsGrid}>
                  <StatTile
                    label="Overall"
                    value={String(
                      Math.round(selectedProfile.public_card.overallScore ?? 0),
                    )}
                    isLight={isLight}
                  />
                  <StatTile
                    label="Streak"
                    value={`${selectedProfile.public_card.streakDays ?? 0}d`}
                    isLight={isLight}
                  />
                  <StatTile
                    label="Groups"
                    value={String(selectedProfile.groups?.length ?? 0)}
                    isLight={isLight}
                  />
                </View>
                <Text
                  style={[
                    communityStyles.sectionTitle,
                    isLight && communityStyles.sectionTitleLight,
                    { marginTop: 20 },
                  ]}
                >
                  Groups
                </Text>
                {(selectedProfile.groups ?? []).slice(0, 5).map((group) => (
                  <View key={group.id} style={communityStyles.highlightRow}>
                    <Text
                      style={[
                        communityStyles.highlightText,
                        isLight && communityStyles.highlightTextLight,
                      ]}
                      numberOfLines={1}
                    >
                      {group.name}
                    </Text>
                    <Text
                      style={[
                        communityStyles.highlightMeta,
                        isLight && communityStyles.highlightMetaLight,
                      ]}
                    >
                      {group.memberCount} members
                    </Text>
                  </View>
                ))}
                <Text
                  style={[
                    communityStyles.sectionTitle,
                    isLight && communityStyles.sectionTitleLight,
                    { marginTop: 20 },
                  ]}
                >
                  Recent activity
                </Text>
                {(selectedProfile.posts ?? []).slice(0, 6).length ? (
                  (selectedProfile.posts ?? [])
                    .slice(0, 6)
                    .map((item) => renderFeedActivity(item, { compact: true }))
                ) : (
                  <Text
                    style={[
                      communityStyles.cardBody,
                      isLight && communityStyles.cardBodyLight,
                    ]}
                  >
                    No public workout history yet.
                  </Text>
                )}
              </ScrollView>
            ) : (
              <Text
                style={[
                  communityStyles.cardBody,
                  isLight && communityStyles.cardBodyLight,
                  { marginTop: 16 },
                ]}
              >
                Profile could not be loaded.
              </Text>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={groupModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGroupModalVisible(false)}
      >
        <View style={communityStyles.sheetRoot}>
          <TouchableOpacity
            style={communityStyles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setGroupModalVisible(false)}
          />
          <View
            style={[
              communityStyles.modalCard,
              isLight && communityStyles.modalCardLight,
            ]}
          >
            <Text
              style={[
                communityStyles.modalTitle,
                isLight && communityStyles.modalTitleLight,
              ]}
            >
              Create group
            </Text>
            <TextInput
              style={[
                communityStyles.modalInput,
                isLight && communityStyles.modalInputLight,
              ]}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Group name"
              placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
            />
            <TextInput
              style={[
                communityStyles.modalInput,
                isLight && communityStyles.modalInputLight,
                { minHeight: 82, textAlignVertical: "top", paddingTop: 13 },
              ]}
              multiline
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              placeholder="About this group"
              placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
            />
            <Text
              style={[
                communityStyles.modalLabel,
                isLight && communityStyles.modalLabelLight,
              ]}
            >
              Type
            </Text>
            <View style={communityStyles.optionGrid}>
              {[
                "strength",
                "running",
                "hybrid",
                "office",
                "college",
                "sports",
                "recovery",
                "open",
              ].map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.86}
                  style={[
                    communityStyles.optionPill,
                    isLight && communityStyles.optionPillLight,
                    newGroupType === item && communityStyles.optionPillSelected,
                  ]}
                  onPress={() => setNewGroupType(item)}
                >
                  <Text
                    style={[
                      communityStyles.optionPillText,
                      isLight && communityStyles.optionPillTextLight,
                      newGroupType === item &&
                        communityStyles.optionPillTextSelected,
                    ]}
                  >
                    {titleCase(item.replace("_", " "))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text
              style={[
                communityStyles.modalLabel,
                isLight && communityStyles.modalLabelLight,
              ]}
            >
              Privacy
            </Text>
            <View style={communityStyles.optionGrid}>
              {(["public", "private", "invite_only"] as const).map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.86}
                  style={[
                    communityStyles.optionPill,
                    isLight && communityStyles.optionPillLight,
                    newGroupPrivacy === item &&
                      communityStyles.optionPillSelected,
                  ]}
                  onPress={() => setNewGroupPrivacy(item)}
                >
                  <Text
                    style={[
                      communityStyles.optionPillText,
                      isLight && communityStyles.optionPillTextLight,
                      newGroupPrivacy === item &&
                        communityStyles.optionPillTextSelected,
                    ]}
                  >
                    {item === "invite_only" ? "Invite only" : titleCase(item)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text
              style={[
                communityStyles.modalLabel,
                isLight && communityStyles.modalLabelLight,
              ]}
            >
              Goal
            </Text>
            <View style={communityStyles.optionGrid}>
              {[
                "competitive",
                "accountability",
                "casual",
                "event_prep",
                "transformation",
              ].map((item) => (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.86}
                  style={[
                    communityStyles.optionPill,
                    isLight && communityStyles.optionPillLight,
                    newGroupGoal === item && communityStyles.optionPillSelected,
                  ]}
                  onPress={() => setNewGroupGoal(item)}
                >
                  <Text
                    style={[
                      communityStyles.optionPillText,
                      isLight && communityStyles.optionPillTextLight,
                      newGroupGoal === item &&
                        communityStyles.optionPillTextSelected,
                    ]}
                  >
                    {titleCase(item.replace("_", " "))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={communityStyles.cardButton}
              activeOpacity={0.86}
              onPress={createGroup}
            >
              <Text style={communityStyles.cardButtonText}>Create group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={challengeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChallengeModalVisible(false)}
      >
        <View style={communityStyles.sheetRoot}>
          <TouchableOpacity
            style={communityStyles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setChallengeModalVisible(false)}
          />
          <View
            style={[
              communityStyles.sheetCard,
              isLight && communityStyles.modalCardLight,
            ]}
          >
            <View style={communityStyles.sheetHandle} />
            <View style={communityStyles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    communityStyles.modalTitle,
                    isLight && communityStyles.modalTitleLight,
                    { marginBottom: 2 },
                  ]}
                >
                  Create challenge
                </Text>
                <Text
                  style={[
                    communityStyles.metaText,
                    isLight && communityStyles.metaTextLight,
                  ]}
                >
                  Rules, eligibility, result, and reward.
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setChallengeModalVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={isLight ? "#0F172A" : "#F8FAFC"}
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ marginTop: 14 }}
            >
              <TextInput
                style={[
                  communityStyles.modalInput,
                  isLight && communityStyles.modalInputLight,
                ]}
                value={newChallengeTitle}
                onChangeText={setNewChallengeTitle}
                placeholder="Challenge title"
                placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                style={[
                  communityStyles.modalInput,
                  isLight && communityStyles.modalInputLight,
                  communityStyles.modalTextArea,
                ]}
                multiline
                value={newChallengeAbout}
                onChangeText={setNewChallengeAbout}
                placeholder="About this challenge"
                placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                style={[
                  communityStyles.modalInput,
                  isLight && communityStyles.modalInputLight,
                  communityStyles.modalTextArea,
                ]}
                multiline
                value={newChallengeRequirement}
                onChangeText={setNewChallengeRequirement}
                placeholder="Rule: what counts?"
                placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                style={[
                  communityStyles.modalInput,
                  isLight && communityStyles.modalInputLight,
                  communityStyles.modalTextArea,
                ]}
                multiline
                value={newChallengeResult}
                onChangeText={setNewChallengeResult}
                placeholder="Result or winning condition"
                placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
              />
              <View style={communityStyles.formGrid}>
                <TextInput
                  style={[
                    communityStyles.modalInput,
                    communityStyles.formGridInput,
                    isLight && communityStyles.modalInputLight,
                  ]}
                  value={newChallengeDuration}
                  onChangeText={setNewChallengeDuration}
                  placeholder="Days"
                  keyboardType="number-pad"
                  placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
                />
                <TextInput
                  style={[
                    communityStyles.modalInput,
                    communityStyles.formGridInput,
                    isLight && communityStyles.modalInputLight,
                  ]}
                  value={newChallengeRequiredSessions}
                  onChangeText={setNewChallengeRequiredSessions}
                  placeholder="Sessions"
                  keyboardType="number-pad"
                  placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
                />
              </View>
              <TextInput
                style={[
                  communityStyles.modalInput,
                  isLight && communityStyles.modalInputLight,
                ]}
                value={newChallengeMinDuration}
                onChangeText={setNewChallengeMinDuration}
                placeholder="Minimum workout minutes"
                keyboardType="number-pad"
                placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
              />
              <Text
                style={[
                  communityStyles.modalLabel,
                  isLight && communityStyles.modalLabelLight,
                ]}
              >
                Workout eligibility
              </Text>
              <View style={communityStyles.optionGrid}>
                {CHALLENGE_WORKOUT_TYPES.map((item) => {
                  const selected = newChallengeWorkoutTypes.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.86}
                      style={[
                        communityStyles.optionPill,
                        isLight && communityStyles.optionPillLight,
                        selected && communityStyles.optionPillSelected,
                      ]}
                      onPress={() =>
                        toggleChallengeOption(
                          item,
                          setNewChallengeWorkoutTypes,
                        )
                      }
                    >
                      <Text
                        style={[
                          communityStyles.optionPillText,
                          isLight && communityStyles.optionPillTextLight,
                          selected && communityStyles.optionPillTextSelected,
                        ]}
                      >
                        {titleCase(item)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text
                style={[
                  communityStyles.modalLabel,
                  isLight && communityStyles.modalLabelLight,
                ]}
              >
                Body parts
              </Text>
              <View style={communityStyles.optionGrid}>
                {CHALLENGE_BODY_PARTS.map((item) => {
                  const selected = newChallengeBodyParts.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.86}
                      style={[
                        communityStyles.optionPill,
                        isLight && communityStyles.optionPillLight,
                        selected && communityStyles.optionPillSelected,
                      ]}
                      onPress={() =>
                        toggleChallengeOption(
                          item,
                          setNewChallengeBodyParts,
                        )
                      }
                    >
                      <Text
                        style={[
                          communityStyles.optionPillText,
                          isLight && communityStyles.optionPillTextLight,
                          selected && communityStyles.optionPillTextSelected,
                        ]}
                      >
                        {titleCase(item)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text
                style={[
                  communityStyles.modalLabel,
                  isLight && communityStyles.modalLabelLight,
                ]}
              >
                Intensity
              </Text>
              <View style={communityStyles.optionGrid}>
                {CHALLENGE_INTENSITIES.map((item) => {
                  const selected = newChallengeIntensities.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      activeOpacity={0.86}
                      style={[
                        communityStyles.optionPill,
                        isLight && communityStyles.optionPillLight,
                        selected && communityStyles.optionPillSelected,
                      ]}
                      onPress={() =>
                        toggleChallengeOption(
                          item,
                          setNewChallengeIntensities,
                        )
                      }
                    >
                      <Text
                        style={[
                          communityStyles.optionPillText,
                          isLight && communityStyles.optionPillTextLight,
                          selected && communityStyles.optionPillTextSelected,
                        ]}
                      >
                        {titleCase(item.replace("_", " "))}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={communityStyles.cardButton}
                activeOpacity={0.86}
                onPress={createChallenge}
              >
                <Text style={communityStyles.cardButtonText}>
                  Create challenge
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={groupPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setGroupPickerVisible(false)}
      >
        <View style={communityStyles.sheetRoot}>
          <TouchableOpacity
            style={communityStyles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setGroupPickerVisible(false)}
          />
          <View
            style={[
              communityStyles.sheetCard,
              isLight && communityStyles.modalCardLight,
            ]}
          >
            <View style={communityStyles.sheetHandle} />
            <Text
              style={[
                communityStyles.modalTitle,
                isLight && communityStyles.modalTitleLight,
              ]}
            >
              Choose group leaderboard
            </Text>
            {groups.filter((group) => group.joined && /^\d+$/.test(group.id))
              .length ? (
              groups
                .filter((group) => group.joined && /^\d+$/.test(group.id))
                .map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    activeOpacity={0.86}
                    style={[communityStyles.memberRow, { minHeight: 58 }]}
                    onPress={() => {
                      setLeaderboardScope("group");
                      setLeaderboardGroupId(Number(group.id));
                      setGroupPickerVisible(false);
                    }}
                  >
                    <View
                      style={[
                        communityStyles.groupBadge,
                        isLight && communityStyles.groupBadgeLight,
                      ]}
                    >
                      <Text
                        style={[
                          communityStyles.groupBadgeText,
                          isLight && communityStyles.groupBadgeTextLight,
                        ]}
                      >
                        {group.category.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={[
                          communityStyles.cardTitle,
                          isLight && communityStyles.cardTitleLight,
                        ]}
                        numberOfLines={1}
                      >
                        {group.name}
                      </Text>
                      <Text
                        style={[
                          communityStyles.metaText,
                          isLight && communityStyles.metaTextLight,
                        ]}
                      >
                        {group.members} members / {group.activity}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={isLight ? "#64748B" : "#A1A7B8"}
                    />
                  </TouchableOpacity>
                ))
            ) : (
              <Text
                style={[
                  communityStyles.cardBody,
                  isLight && communityStyles.cardBodyLight,
                ]}
              >
                Join a group first to compare inside that club.
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const StatTile: React.FC<{
  label: string;
  value: string;
  isLight: boolean;
}> = ({ label, value, isLight }) => (
  <View style={[communityStyles.statTile, isLight && communityStyles.statTileLight]}>
    <Text
      style={[
        communityStyles.metaText,
        isLight && communityStyles.metaTextLight,
        { marginTop: 0 },
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
    <Text
      style={[
        communityStyles.rankScore,
        isLight && communityStyles.rankScoreLight,
        { marginTop: 4 },
      ]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const communityStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "rgba(9,17,31,0.9)",
  },
  screenLight: {
    backgroundColor: LIGHT_BG,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 108,
  },
  pageHeader: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
  },
  headerMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  headerMenuButtonLight: {
    backgroundColor: "transparent",
  },
  headerTitleBlock: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  pageTitle: {
    color: "#FFFFFF",
    fontFamily: fontFamily.uiBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0,
  },
  pageTitleLight: {
    color: "#0F172A",
  },
  pageSubtitle: {
    marginTop: 4,
    color: "#A7ADBC",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  pageSubtitleLight: {
    color: "#64748B",
  },
  profileRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "rgba(148,163,184,0.36)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    position: "relative",
  },
  profileRingLight: {
    borderColor: "#CBD5E1",
  },
  profileRingText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  profileRingTextLight: {
    color: "#0F172A",
  },
  profileOnlineDot: {
    position: "absolute",
    right: 5,
    bottom: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ADE80",
    borderWidth: 2,
    borderColor: DARK_BG,
  },
  profileOnlineDotLight: {
    borderColor: LIGHT_BG,
  },
  groupFullScreen: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  groupFullScreenLight: {
    backgroundColor: LIGHT_BG,
  },
  groupFullContent: {
    paddingHorizontal: 22,
    paddingTop: 46,
    paddingBottom: 42,
  },
  groupTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 46,
  },
  groupCircleButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  groupCircleButtonLight: {
    backgroundColor: "rgba(255,255,255,0.66)",
    borderColor: "rgba(148,163,184,0.18)",
  },
  groupHeroLogo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    marginBottom: 26,
  },
  groupHeroLogoLight: {
    backgroundColor: "rgba(255,255,255,0.52)",
    borderColor: "rgba(148,163,184,0.16)",
  },
  groupHeroTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 34,
    lineHeight: 40,
    marginBottom: 22,
  },
  groupHeroTitleLight: {
    color: "#0F172A",
  },
  groupMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 18,
  },
  groupMetaText: {
    color: "#C8CDD7",
    fontFamily: fontFamily.uiMedium,
    fontSize: 15,
    marginLeft: 7,
    marginRight: 18,
  },
  groupMetaTextLight: {
    color: "#475569",
  },
  groupSubtitle: {
    color: "#C8CDD7",
    fontFamily: fontFamily.ui,
    fontSize: 17,
    lineHeight: 24,
    marginBottom: 28,
  },
  groupSubtitleLight: {
    color: "#475569",
  },
  groupActionRail: {
    minHeight: 118,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  groupActionRailLight: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: "rgba(148,163,184,0.16)",
  },
  groupActionRailItem: {
    flex: 1,
    alignItems: "center",
  },
  groupActionIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 9,
  },
  groupActionIconLight: {
    backgroundColor: "rgba(255,255,255,0.54)",
  },
  groupActionText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  groupActionTextLight: {
    color: "#0F172A",
  },
  groupComposer: {
    minHeight: 134,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
    marginBottom: 22,
  },
  groupComposerLight: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: "rgba(148,163,184,0.16)",
  },
  groupComposerMain: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  groupComposerInput: {
    flex: 1,
    minHeight: 72,
    marginLeft: 12,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiMedium,
    fontSize: 18,
    lineHeight: 24,
    paddingTop: 5,
    paddingBottom: 6,
  },
  groupComposerInputLight: {
    color: "#0F172A",
  },
  groupComposerActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupComposerButton: {
    minWidth: 84,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PS_BLUE,
    paddingHorizontal: 18,
  },
  groupComposerButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  groupComposerIconButton: {
    minWidth: 96,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  groupComposerIconButtonLight: {
    backgroundColor: "#F1F5F9",
  },
  groupComposerActionText: {
    marginLeft: 7,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  groupComposerActionTextLight: {
    color: "#0F172A",
  },
  groupJoinButton: {
    minHeight: 50,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PS_BLUE,
    marginBottom: 18,
  },
  groupMenuPanel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
    backgroundColor: "rgba(15,23,42,0.86)",
    padding: 14,
    marginBottom: 18,
  },
  groupMenuPanelLight: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: "rgba(148,163,184,0.16)",
  },
  groupMenuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  groupMenuItem: {
    width: "50%",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
  },
  groupMenuText: {
    marginLeft: 8,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  groupMenuTextLight: {
    color: "#0F172A",
  },
  statsPanel: {
    paddingTop: 2,
  },
  statsSummaryRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  topTabs: {
    flexDirection: "row",
    marginTop: 10,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  topTabsLight: {
    borderColor: "rgba(148,163,184,0.14)",
  },
  todayRail: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(124,107,255,0.18)",
  },
  todayRailLight: {
    backgroundColor: "transparent",
    borderColor: "rgba(148,163,184,0.14)",
  },
  todayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  todayTitle: {
    color: "#F7F8FA",
    fontFamily: fontFamily.uiBold,
    fontSize: 19,
    lineHeight: 24,
  },
  todayTitleLight: {
    color: "#0F172A",
  },
  todayCount: {
    color: "#A1A7B8",
    fontFamily: fontFamily.uiSemi,
    fontSize: 12,
    marginLeft: 10,
  },
  todayCountLight: {
    color: "#64748B",
  },
  todayEmpty: {
    marginTop: 12,
    borderRadius: 15,
    padding: 13,
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  todayEmptyLight: {
    backgroundColor: "rgba(255,255,255,0.44)",
  },
  todayEmptyText: {
    color: "#A1A7B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  todayEmptyTextLight: {
    color: "#64748B",
  },
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 13,
  },
  todayAvatar: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: "rgba(124,107,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(124,107,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  todayAvatarLive: {
    borderColor: "rgba(45,186,122,0.55)",
    backgroundColor: "rgba(45,186,122,0.14)",
  },
  todayAvatarText: {
    color: "#F7F8FA",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  todayCopy: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  todayAction: {
    color: "#F7F8FA",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
  },
  todayActionLight: {
    color: "#0F172A",
  },
  todayName: {
    fontFamily: fontFamily.uiBold,
  },
  todayMeta: {
    marginTop: 3,
    color: "#A1A7B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
  },
  todayMetaLight: {
    color: "#64748B",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(45,186,122,0.14)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WORKOUT_SUCCESS,
    marginRight: 5,
  },
  liveText: {
    color: WORKOUT_SUCCESS,
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
  },
  todayMore: {
    marginTop: 10,
    color: WORKOUT_ACCENT_BLUE,
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  todayMoreLight: {
    color: PS_BLUE,
  },
  topTab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderBottomWidth: 3,
    borderColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  topTabLight: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  topTabSelected: {
    backgroundColor: "transparent",
    borderColor: PS_BLUE,
  },
  topTabText: {
    marginLeft: 8,
    color: "#8F96A8",
    fontFamily: fontFamily.uiBold,
    fontSize: 14,
  },
  topTabTextLight: {
    color: "#0F172A",
  },
  topTabTextSelected: {
    color: PS_BLUE,
  },
  hero: {
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.62)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 136,
    overflow: "hidden",
  },
  heroLight: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: "rgba(148,163,184,0.16)",
  },
  heroGlowLarge: {
    position: "absolute",
    right: -56,
    top: -34,
    width: 214,
    height: 214,
    borderRadius: 107,
    borderWidth: 1,
    borderColor: "rgba(124,107,255,0.12)",
    backgroundColor: "rgba(124,107,255,0.08)",
  },
  heroGlowSmall: {
    position: "absolute",
    right: 36,
    top: 46,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: "rgba(124,107,255,0.10)",
  },
  eyebrow: {
    color: PS_BLUE,
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 7,
  },
  eyebrowLight: {
    color: PS_BLUE,
  },
  heroTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 21,
    lineHeight: 27,
    flexShrink: 1,
  },
  heroTitleLight: {
    color: "#0F172A",
  },
  heroBody: {
    marginTop: 8,
    color: DARK_TEXT_MUTED,
    fontFamily: fontFamily.ui,
    fontSize: 13,
    lineHeight: 19,
  },
  heroBodyLight: {
    color: LIGHT_TEXT_MUTED,
  },
  heroButton: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: PS_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 14,
    shadowColor: PS_BLUE,
    shadowOpacity: 0.36,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.62)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    marginBottom: 14,
    overflow: "hidden",
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PS_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  groupBadgeLight: {
    backgroundColor: PS_BLUE,
  },
  groupBadgeText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 15,
  },
  groupBadgeTextLight: {
    color: "#FFFFFF",
  },
  cardTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 16,
    lineHeight: 21,
  },
  cardTitleLight: {
    color: "#0F172A",
  },
  metaText: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  metaTextLight: {
    color: "#64748B",
  },
  cardBody: {
    marginTop: 10,
    color: "#CBD5E1",
    fontFamily: fontFamily.ui,
    fontSize: 13,
    lineHeight: 19,
  },
  cardBodyLight: {
    color: "#475569",
  },
  progressTrack: {
    marginTop: 12,
    height: 7,
    backgroundColor: "rgba(148,163,184,0.16)",
    overflow: "hidden",
  },
  progressTrackLight: {
    backgroundColor: "#E5E7EB",
  },
  progressFill: {
    height: 7,
    backgroundColor: PS_BLUE,
  },
  sectionBlock: {
    paddingTop: 20,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 18,
    marginBottom: 10,
  },
  sectionTitleLight: {
    color: "#0F172A",
  },
  highlightRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
  },
  highlightRank: {
    width: 42,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  highlightRankLight: {
    color: "#475569",
  },
  highlightText: {
    flex: 1,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiSemi,
    fontSize: 14,
    marginLeft: 8,
  },
  highlightTextLight: {
    color: "#0F172A",
  },
  highlightMeta: {
    color: "#A1A7B8",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    textTransform: "capitalize",
  },
  highlightMetaLight: {
    color: "#64748B",
  },
  filterScroll: {
    marginBottom: 10,
  },
  filterPill: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 14,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(148,163,184,0.10)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  filterPillLight: {
    backgroundColor: "rgba(255,255,255,0.54)",
    borderColor: "rgba(148,163,184,0.16)",
  },
  filterPillSelected: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  filterPillText: {
    marginLeft: 7,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  filterPillTextLight: {
    color: "#334155",
  },
  filterPillTextSelected: {
    color: "#FFFFFF",
  },
  metricPill: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 8,
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  metricPillLight: {
    borderColor: "#E5E7EB",
  },
  metricPillSelected: {
    backgroundColor: "rgba(124,107,255,0.16)",
    borderColor: "rgba(124,107,255,0.38)",
  },
  metricPillText: {
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  metricPillTextLight: {
    color: "#475569",
  },
  metricPillTextSelected: {
    color: "#FFFFFF",
  },
  rankNumber: {
    width: 48,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 20,
  },
  rankNumberLight: {
    color: "#0F172A",
  },
  rankScore: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 18,
  },
  rankScoreLight: {
    color: "#0F172A",
  },
  leaderboardStrip: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 0,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  leaderboardStripLight: {
    backgroundColor: "transparent",
  },
  leaderboardText: {
    flex: 1,
    marginLeft: 9,
    color: "#CBD5E1",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
  },
  leaderboardTextLight: {
    color: "#475569",
  },
  feedTabs: {
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    marginBottom: 12,
  },
  feedTabsContent: {
    paddingRight: 12,
  },
  feedTab: {
    minWidth: 96,
    paddingHorizontal: 12,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  feedTabLight: {
    borderColor: "transparent",
  },
  feedTabSelected: {
    borderColor: PS_BLUE,
  },
  feedTabText: {
    color: "#A1A7B8",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  feedTabTextLight: {
    color: "#64748B",
  },
  feedTabTextSelected: {
    color: PS_BLUE,
  },
  feedItem: {
    flexDirection: "row",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  feedItemLight: {
    borderColor: "#E5E7EB",
  },
  threadComposer: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(148,163,184,0.08)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    marginBottom: 12,
  },
  threadComposerLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  threadActionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  threadAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
  },
  threadActionText: {
    marginLeft: 5,
    color: "#A1A7B8",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  threadActionTextLight: {
    color: "#64748B",
  },
  postImage: {
    width: 92,
    height: 92,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: "rgba(148,163,184,0.16)",
  },
  detailPanel: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(148,163,184,0.08)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    marginBottom: 10,
  },
  detailPanelLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  statsGrid: {
    flexDirection: "row",
    marginTop: 12,
  },
  statTile: {
    flex: 1,
    minHeight: 62,
    borderRadius: 14,
    padding: 10,
    marginRight: 8,
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.08)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  statTileLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  cardButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: PS_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  cardButtonJoined: {
    backgroundColor: "rgba(148,163,184,0.14)",
  },
  cardButtonJoinedLight: {
    backgroundColor: "#EEF2F7",
  },
  cardButtonMuted: {
    backgroundColor: "#64748B",
  },
  cardButtonText: {
    color: "#FFFFFF",
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  cardButtonTextJoinedLight: {
    color: "#334155",
  },
  challengeTabs: {
    marginBottom: 12,
    padding: 4,
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.8)",
  },
  challengeTabsContent: {
    paddingRight: 4,
  },
  challengeTab: {
    minHeight: 34,
    paddingHorizontal: 12,
    marginRight: 6,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeTabLight: {
    backgroundColor: "transparent",
  },
  challengeTabSelected: {
    backgroundColor: PS_BLUE,
  },
  challengeTabText: {
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  challengeTabTextLight: {
    color: "#475569",
  },
  challengeTabTextSelected: {
    color: "#FFFFFF",
  },
  challengeIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#0B1220",
    alignItems: "center",
    justifyContent: "center",
  },
  challengeIconLight: {
    backgroundColor: "#F1F5F9",
  },
  premiumChallengeCard: {
    minHeight: 188,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    backgroundColor: "rgba(18,18,42,0.88)",
    borderWidth: 1,
    borderColor: "rgba(139,108,246,0.32)",
  },
  premiumChallengeCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(124,107,255,0.22)",
  },
  premiumChallengeContent: {
    width: "72%",
    zIndex: 2,
  },
  premiumBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  premiumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PS_BLUE,
    marginRight: 8,
  },
  premiumEyebrow: {
    color: "#A78BFA",
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  premiumTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
  },
  premiumTitleLight: {
    color: "#0F172A",
  },
  premiumBody: {
    marginTop: 8,
    color: "#C7CBD6",
    fontFamily: fontFamily.uiMedium,
    fontSize: 13,
    lineHeight: 19,
  },
  premiumBodyLight: {
    color: "#64748B",
  },
  premiumStatsRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  premiumStatText: {
    color: "#D8B4FE",
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
  },
  premiumButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PS_BLUE,
  },
  premiumButtonLocked: {
    backgroundColor: "rgba(148,163,184,0.32)",
  },
  premiumButtonText: {
    marginLeft: 7,
    color: "#FFFFFF",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  premiumMark: {
    position: "absolute",
    right: 28,
    top: 52,
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,13,28,0.62)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.48)",
  },
  premiumMarkText: {
    color: "#A78BFA",
    fontFamily: fontFamily.uiBold,
    fontSize: 24,
  },
  challengeCategoryScroll: {
    marginBottom: 16,
  },
  challengeCategoryContent: {
    paddingRight: 8,
  },
  challengeCategoryPill: {
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 18,
    marginRight: 9,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  challengeCategoryPillLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  challengeCategoryPillActive: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  challengeCategoryText: {
    marginLeft: 7,
    color: "#A7ADBC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  challengeCategoryTextLight: {
    color: "#475569",
  },
  challengeCategoryTextActive: {
    color: "#FFFFFF",
  },
  challengeSectionHeader: {
    marginTop: 2,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  challengeSectionTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 19,
    lineHeight: 24,
  },
  challengeSectionTitleLight: {
    color: "#0F172A",
  },
  challengeSectionSubtitle: {
    marginTop: 2,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  challengeSectionSubtitleLight: {
    color: "#64748B",
  },
  challengeSectionCount: {
    color: PS_BLUE,
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
    marginLeft: 12,
  },
  challengeSubsection: {
    marginTop: 14,
  },
  challengeDetailScreen: {
    flex: 1,
    backgroundColor: DARK_BG,
  },
  challengeDetailScreenLight: {
    backgroundColor: LIGHT_BG,
  },
  challengeDetailContent: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },
  challengeDetailContentLight: {
    backgroundColor: LIGHT_BG,
  },
  challengeDetailTopBar: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  challengeDetailTopTitle: {
    flex: 1,
    textAlign: "center",
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 16,
  },
  challengeDetailTopTitleLight: {
    color: "#0F172A",
  },
  topBarSpacer: {
    width: 38,
    height: 38,
  },
  challengeDetailHero: {
    marginTop: 12,
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.68)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  challengeDetailHeroLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  challengeDetailScroll: {
    flex: 1,
  },
  challengeDetailScrollContent: {
    paddingTop: 14,
    paddingBottom: 28,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },
  actionPrimary: {
    flex: 1,
    marginLeft: 10,
    marginTop: 0,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: PS_BLUE,
  },
  secondaryButtonLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  secondaryButtonText: {
    color: PS_BLUE,
    fontFamily: fontFamily.uiBold,
    fontSize: 13,
  },
  secondaryButtonTextLight: {
    color: "#0F172A",
  },
  createPanel: {
    minHeight: 56,
    borderRadius: 0,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
    marginBottom: 14,
  },
  cardMenuButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  createPanelLight: {
    backgroundColor: "transparent",
    borderColor: "#E5E7EB",
  },
  createText: {
    flex: 1,
    marginLeft: 10,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiSemi,
    fontSize: 13,
    lineHeight: 18,
  },
  createTextLight: {
    color: "#0F172A",
  },
  loadingWrap: {
    paddingVertical: 34,
  },
  errorText: {
    color: "#FCA5A5",
    fontFamily: fontFamily.uiMedium,
  },
  errorTextLight: {
    color: "#B91C1C",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: DARK_CARD,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  modalCardLight: {
    backgroundColor: LIGHT_CARD,
    borderColor: "#E5E7EB",
  },
  sheetCard: {
    maxHeight: "88%",
    padding: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: DARK_CARD,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
    backgroundColor: "rgba(148,163,184,0.35)",
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  memberRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.10)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  iconButtonLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.10)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.20)",
  },
  iconActionLight: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  adminPanel: {
    marginTop: 20,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.36)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  adminPanelLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  inlineInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inlineInput: {
    flex: 1,
    minHeight: 46,
    borderRadius: 15,
    paddingHorizontal: 13,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiSemi,
    fontSize: 14,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  inlineInputLight: {
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  smallPrimaryButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PS_BLUE,
    marginLeft: 8,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.14)",
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "rgba(124,107,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(124,107,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 18,
  },
  modalTitle: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 12,
  },
  modalTitleLight: {
    color: "#0F172A",
  },
  modalInput: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 12,
    color: "#F8FAFC",
    fontFamily: fontFamily.uiSemi,
    fontSize: 14,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    marginBottom: 10,
  },
  modalInputLight: {
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  modalLabel: {
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  modalLabelLight: {
    color: "#475569",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTextArea: {
    minHeight: 78,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  formGrid: {
    flexDirection: "row",
    marginHorizontal: -4,
  },
  formGridInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  detailTabs: {
    marginTop: 14,
    marginBottom: 12,
    padding: 3,
    borderRadius: 13,
    backgroundColor: "rgba(148,163,184,0.10)",
  },
  detailTabsContent: {
    flexGrow: 1,
    paddingRight: 3,
  },
  detailTab: {
    minWidth: 104,
    minHeight: 34,
    paddingHorizontal: 10,
    marginRight: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 10,
  },
  detailTabSelected: {
    backgroundColor: PS_BLUE,
  },
  detailTabText: {
    color: "#A1A7B8",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  detailTabTextLight: {
    color: "#64748B",
  },
  detailTabTextSelected: {
    color: "#FFFFFF",
  },
  participantRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  participantRowLight: {
    borderColor: "#E5E7EB",
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,107,255,0.22)",
  },
  participantAvatarText: {
    color: "#F8FAFC",
    fontFamily: fontFamily.uiBold,
    fontSize: 12,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  optionPill: {
    minHeight: 31,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 7,
    marginBottom: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.10)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  optionPillLight: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
  },
  optionPillSelected: {
    backgroundColor: PS_BLUE,
    borderColor: PS_BLUE,
  },
  optionPillText: {
    color: "#CBD5E1",
    fontFamily: fontFamily.uiBold,
    fontSize: 11,
  },
  optionPillTextLight: {
    color: "#475569",
  },
  optionPillTextSelected: {
    color: "#FFFFFF",
  },
});

export default CommunityParticipationScreen;
