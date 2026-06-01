import { useCallback, useEffect, useState } from "react";

import {
  fetchCachedJson,
  fetchRequiredAuth,
  invalidateApiCache,
} from "../api/client";
import { useAuth } from "../App";
import type {
  CommunityActivity,
  CommunityActivityComment,
  CommunityFriendSummary,
  CommunityGroupCard,
  CommunityGroupDetail,
  CommunityGroupFeed,
  CommunityGroupMember,
  CommunityLeaderboardResponse,
  CommunityOverview,
  CommunityPublicProfile,
  CommunitySummary,
  CommunityUserSuggestion,
  PremiumChallengeSections,
  SavedCommunityActivityPage,
  TodayActivityUpdate,
  TrainingChallengeCreatePayload,
  TrainingChallengeParticipant,
} from "../types/community";

const normalizeFriend = (friend: CommunityFriendSummary): CommunityFriendSummary => ({
  ...friend,
  id: String(friend.id),
  overallScore: friend.overallScore ?? 0,
  consistencyScore: friend.consistencyScore ?? 0,
  challengesCompleted: friend.challengesCompleted ?? 0,
});

export function useCommunity() {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [me, setMe] = useState<CommunityFriendSummary | null>(null);
  const [friends, setFriends] = useState<CommunityFriendSummary[]>([]);
  const [activity, setActivity] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authorizedFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const response = await fetchRequiredAuth(path, {
        accessToken,
        refreshAccessToken,
        signOut,
      }, options);

      if (!response.ok) {
        throw new Error(`Community request failed (${response.status})`);
      }
      return response;
    },
    [accessToken, refreshAccessToken, signOut],
  );

  const cachedAuthorizedJson = useCallback(
    <T,>(path: string, tags: string[], ttlMs: number = 15_000, force = false) =>
      fetchCachedJson<T>(
        path,
        { accessToken, refreshAccessToken, signOut },
        { force, requiredAuth: true, tags, ttlMs },
      ),
    [accessToken, refreshAccessToken, signOut],
  );

  const reload = useCallback(async (force = true) => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const json = await cachedAuthorizedJson<CommunitySummary>(
        "/community/summary/",
        ["community-summary"],
        15_000,
        force,
      );
      setMe(json.public_card ? normalizeFriend(json.public_card) : null);
      setFriends((json.friends ?? []).map(normalizeFriend));
      setActivity(json.recent_activity ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load community");
    } finally {
      setLoading(false);
    }
  }, [accessToken, cachedAuthorizedJson]);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  const searchUsers = useCallback(
    async (query: string): Promise<CommunityUserSuggestion[]> => {
      const response = await authorizedFetch(
        `/community/search/?q=${encodeURIComponent(query)}&limit=30`,
      );
      return (await response.json()) as CommunityUserSuggestion[];
    },
    [authorizedFetch],
  );

  const addFriend = useCallback(
    async (userId: number) => {
      await authorizedFetch("/community/friends/add/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      invalidateApiCache("community-summary", "community-leaderboard", "profile-summary");
      await reload();
    },
    [authorizedFetch, reload],
  );

  const syncContacts = useCallback(
    async (contacts: string[]) => {
      const response = await authorizedFetch("/community/contacts/sync/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });
      return (await response.json()) as {
        suggestions: CommunityUserSuggestion[];
        invites: string[];
        invite_link: string;
      };
    },
    [authorizedFetch],
  );

  const loadLeaderboard = useCallback(
    async (
      metric: string,
      scope: "global" | "following" | "group" | "location" = "global",
      groupId?: number | null,
    ): Promise<CommunityLeaderboardResponse> => {
      const params = new URLSearchParams({
        metric,
        limit: "100",
        scope,
      });
      if (scope === "group" && groupId) params.set("group_id", String(groupId));
      const json = await cachedAuthorizedJson<CommunityLeaderboardResponse>(
        `/community/leaderboard/?${params.toString()}`,
        ["community-leaderboard"],
        15_000,
      );
      return {
        ...json,
        user_card: json.user_card ? normalizeFriend(json.user_card) : undefined,
        results: (json.results ?? []).map(normalizeFriend),
      };
    },
    [cachedAuthorizedJson],
  );

  const loadActivity = useCallback(
    async (filter: string) => {
      const json = await cachedAuthorizedJson<CommunityActivity[]>(
        `/community/activity/?filter=${encodeURIComponent(filter)}&limit=50`,
        ["community-activity"],
        10_000,
      );
      setActivity(json);
      return json;
    },
    [cachedAuthorizedJson],
  );

  const loadTodayActivity = useCallback(async (): Promise<TodayActivityUpdate[]> => {
    return cachedAuthorizedJson<TodayActivityUpdate[]>(
      "/community/today-activity/",
      ["community-activity"],
      10_000,
    );
  }, [cachedAuthorizedJson]);

  const loadOverview = useCallback(async (): Promise<CommunityOverview> => {
    return cachedAuthorizedJson<CommunityOverview>(
      "/community/overview/",
      ["community-overview", "community-groups", "training-challenges"],
      15_000,
    );
  }, [cachedAuthorizedJson]);

  const loadTrainingChallenges = useCallback(async (): Promise<PremiumChallengeSections> => {
    return cachedAuthorizedJson<PremiumChallengeSections>(
      "/training-challenges/",
      ["training-challenges"],
      15_000,
    );
  }, [cachedAuthorizedJson]);

  const joinTrainingChallenge = useCallback(
    async (challengeId: number) => {
      await authorizedFetch(`/training-challenges/${challengeId}/join/`, {
        method: "POST",
      });
      invalidateApiCache("training-challenges", "community-overview");
    },
    [authorizedFetch],
  );

  const createTrainingChallenge = useCallback(
    async (payload: TrainingChallengeCreatePayload) => {
      const response = await authorizedFetch("/training-challenges/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      invalidateApiCache("training-challenges", "community-overview");
      return await response.json();
    },
    [authorizedFetch],
  );

  const loadTrainingChallengeParticipants = useCallback(
    async (challengeId: number) => {
      return cachedAuthorizedJson<{
        participants: TrainingChallengeParticipant[];
        completed: TrainingChallengeParticipant[];
      }>(
        `/training-challenges/${challengeId}/participants/`,
        ["training-challenge-participants"],
        10_000,
      );
    },
    [cachedAuthorizedJson],
  );

  const likeActivity = useCallback(
    async (activityId: number, liked: boolean) => {
      await authorizedFetch(`/community/activity/${activityId}/like/`, {
        method: liked ? "DELETE" : "POST",
      });
      invalidateApiCache("community-activity", "community-summary", "profile-summary");
      await loadActivity("recent");
    },
    [authorizedFetch, loadActivity],
  );

  const commentActivity = useCallback(
    async (activityId: number, body: string) => {
      await authorizedFetch(`/community/activity/${activityId}/comments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      invalidateApiCache("community-activity", "community-summary", "profile-summary");
      await loadActivity("recent");
    },
    [authorizedFetch, loadActivity],
  );

  const loadActivityComments = useCallback(
    async (activityId: number): Promise<CommunityActivityComment[]> => {
      return cachedAuthorizedJson<CommunityActivityComment[]>(
        `/community/activity/${activityId}/comments/`,
        ["community-comments"],
        10_000,
      );
    },
    [cachedAuthorizedJson],
  );

  const addActivityComment = useCallback(
    async (
      activityId: number,
      body: string,
    ): Promise<CommunityActivityComment> => {
      const response = await authorizedFetch(
        `/community/activity/${activityId}/comments/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      invalidateApiCache("community-comments", "community-activity", "community-summary");
      return (await response.json()) as CommunityActivityComment;
    },
    [authorizedFetch],
  );

  const setActivityLiked = useCallback(
    async (activityId: number, liked: boolean) => {
      const response = await authorizedFetch(
        `/community/activity/${activityId}/like/`,
        {
          method: liked ? "DELETE" : "POST",
        },
      );
      invalidateApiCache("community-activity", "community-summary", "profile-summary");
      return (await response.json()) as {
        liked: boolean;
        likesCount: number;
      };
    },
    [authorizedFetch],
  );

  const shareActivity = useCallback(
    async (activityId: number) => {
      await authorizedFetch(`/community/activity/${activityId}/share/`, {
        method: "POST",
      });
      invalidateApiCache("community-activity", "community-summary", "profile-summary");
      await loadActivity("recent");
    },
    [authorizedFetch, loadActivity],
  );

  const setActivitySaved = useCallback(
    async (activityId: number, saved: boolean) => {
      const response = await authorizedFetch(
        `/community/activity/${activityId}/save/`,
        { method: saved ? "DELETE" : "POST" },
      );
      const result = (await response.json()) as { saved: boolean };
      setActivity((items) =>
        items.map((item) =>
          item.id === activityId ? { ...item, savedByMe: result.saved } : item,
        ),
      );
      invalidateApiCache(
        "saved-activities",
        "community-activity",
        "community-summary",
        "community-group-detail",
        "community-group-feed",
      );
      return result;
    },
    [authorizedFetch],
  );

  const loadSavedActivities = useCallback(
    async (before?: number | null): Promise<SavedCommunityActivityPage> => {
      const suffix = before ? `&before=${before}` : "";
      return cachedAuthorizedJson<SavedCommunityActivityPage>(
        `/community/saved/?limit=30${suffix}`,
        ["saved-activities"],
        10_000,
      );
    },
    [cachedAuthorizedJson],
  );

  const loadGroups = useCallback(async () => {
    return cachedAuthorizedJson<CommunityGroupCard[]>(
      "/community/groups/",
      ["community-groups"],
      15_000,
    );
  }, [cachedAuthorizedJson]);

  const loadGroupDetail = useCallback(
    async (groupId: number) => {
      return cachedAuthorizedJson<CommunityGroupDetail>(
        `/community/groups/${groupId}/`,
        ["community-group-detail", `community-group-${groupId}`],
        10_000,
      );
    },
    [cachedAuthorizedJson],
  );

  const loadGroupMembers = useCallback(
    async (groupId: number) => {
      return cachedAuthorizedJson<CommunityGroupMember[]>(
        `/community/groups/${groupId}/members/`,
        ["community-group-members", `community-group-${groupId}`],
        10_000,
      );
    },
    [cachedAuthorizedJson],
  );

  const createGroup = useCallback(
    async (
      name: string,
      privacy: "public" | "private" | "invite_only" = "public",
      groupType: string = "open",
      goal: string = "accountability",
      description: string = "",
    ) => {
      await authorizedFetch("/community/groups/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, privacy, group_type: groupType, goal, description }),
      });
      invalidateApiCache("community-groups", "community-overview", "profile-summary");
    },
    [authorizedFetch],
  );

  const joinGroup = useCallback(
    async (groupId: number, joined: boolean, inviteToken?: string | null) => {
      const response = await authorizedFetch(`/community/groups/${groupId}/${joined ? "leave" : "join"}/`, {
        method: "POST",
        headers: inviteToken ? { "Content-Type": "application/json" } : undefined,
        body: inviteToken ? JSON.stringify({ invite_token: inviteToken }) : undefined,
      });
      invalidateApiCache(
        "community-groups",
        "community-overview",
        "profile-summary",
        `community-group-${groupId}`,
      );
      if (response.status === 204) return null;
      return await response.json().catch(() => null);
    },
    [authorizedFetch],
  );

  const createGroupChallenge = useCallback(
    async (groupId: number, title: string, durationDays: number = 14) => {
      const start = new Date();
      const end = new Date(start);
      end.setDate(start.getDate() + Math.max(1, durationDays));
      await authorizedFetch(`/community/groups/${groupId}/challenges/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          challenge_type: "friend_competition",
          start_date: start.toISOString().slice(0, 10),
          end_date: end.toISOString().slice(0, 10),
          eligible_workout_types: ["strength", "cardio", "conditioning", "mobility", "sport"],
          min_duration: 20,
        }),
      });
      invalidateApiCache("community-groups", "community-overview", `community-group-${groupId}`);
    },
    [authorizedFetch],
  );

  const inviteGroupMember = useCallback(
    async (groupId: number, userId: number) => {
      await authorizedFetch(`/community/groups/${groupId}/invite/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      invalidateApiCache(`community-group-${groupId}`);
    },
    [authorizedFetch],
  );

  const loadGroupInviteLink = useCallback(
    async (groupId: number): Promise<{ token: string; url: string; appUrl: string }> => {
      return cachedAuthorizedJson<{ token: string; url: string; appUrl: string }>(
        `/community/groups/${groupId}/invite/`,
        [`community-group-${groupId}`],
        60_000,
      );
    },
    [cachedAuthorizedJson],
  );

  const removeGroupMember = useCallback(
    async (groupId: number, userId: number) => {
      await authorizedFetch(`/community/groups/${groupId}/remove-member/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      invalidateApiCache("community-groups", "community-overview", `community-group-${groupId}`);
    },
    [authorizedFetch],
  );

  const createGroupAnnouncement = useCallback(
    async (groupId: number, title: string, body: string) => {
      await authorizedFetch(`/community/groups/${groupId}/announcements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, announcement_type: "admin_note" }),
      });
      invalidateApiCache(`community-group-${groupId}`);
    },
    [authorizedFetch],
  );

  const postGroupActivity = useCallback(
    async (
      groupId: number,
      title: string,
      description: string,
      kind: "thread" | "event" | "notification" | "admin_post" = "thread",
      imageUrls: string[] = [],
    ) => {
      const response = await authorizedFetch(`/community/groups/${groupId}/activity/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, kind, image_urls: imageUrls }),
      });
      invalidateApiCache("community-activity", "community-summary", `community-group-${groupId}`);
      return (await response.json()) as CommunityActivity;
    },
    [authorizedFetch],
  );

  const uploadCommunityImage = useCallback(
    async (uri: string): Promise<string> => {
      const name = uri.split("/").pop() || `group-${Date.now()}.jpg`;
      const extension = name.split(".").pop()?.toLowerCase();
      const type =
        extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : extension === "heic"
              ? "image/heic"
              : "image/jpeg";
      const formData = new FormData();
      formData.append("image", { uri, name, type } as any);
      const response = await authorizedFetch("/workouts/images/", {
        method: "POST",
        body: formData,
      });
      const json = (await response.json()) as { image_url?: string };
      return json.image_url || uri;
    },
    [authorizedFetch],
  );

  const loadGroupFeed = useCallback(
    async (groupId: number): Promise<CommunityGroupFeed> => {
      return cachedAuthorizedJson<CommunityGroupFeed>(
        `/community/groups/${groupId}/activity/`,
        ["community-group-feed", `community-group-${groupId}`],
        10_000,
      );
    },
    [cachedAuthorizedJson],
  );

  const loadPublicProfile = useCallback(
    async (userId: number): Promise<CommunityPublicProfile> => {
      return cachedAuthorizedJson<CommunityPublicProfile>(
        `/profiles/${userId}/public/`,
        ["profile-summary"],
        15_000,
      );
    },
    [cachedAuthorizedJson],
  );

  const actOnGroupJoinRequest = useCallback(
    async (
      groupId: number,
      requestId: number,
      action: "approve" | "reject",
    ) => {
      const response = await authorizedFetch(
        `/community/groups/${groupId}/requests/${requestId}/${action}/`,
        { method: "POST" },
      );
      invalidateApiCache("community-groups", "community-overview", `community-group-${groupId}`);
      return await response.json().catch(() => null);
    },
    [authorizedFetch],
  );

  return {
    me,
    friends,
    activity,
    loading,
    error,
    reload,
    searchUsers,
    addFriend,
    syncContacts,
    loadLeaderboard,
    loadActivity,
    loadTodayActivity,
    loadOverview,
    loadTrainingChallenges,
    joinTrainingChallenge,
    createTrainingChallenge,
    loadTrainingChallengeParticipants,
    likeActivity,
    commentActivity,
    shareActivity,
    setActivitySaved,
    loadSavedActivities,
    loadActivityComments,
    addActivityComment,
    setActivityLiked,
    loadGroups,
    loadGroupDetail,
    loadGroupMembers,
    createGroup,
    joinGroup,
    createGroupChallenge,
    inviteGroupMember,
    loadGroupInviteLink,
    removeGroupMember,
    createGroupAnnouncement,
    postGroupActivity,
    uploadCommunityImage,
    loadGroupFeed,
    loadPublicProfile,
    actOnGroupJoinRequest,
  };
}
