import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL } from "../api/client";
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
  TodayActivityUpdate,
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
      if (!accessToken) {
        throw new Error("Authentication required");
      }
      let tokenToUse = accessToken;
      const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> | undefined),
        Authorization: `Bearer ${tokenToUse}`,
      };
      let response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          await signOut();
          throw new Error("Session expired");
        }
        tokenToUse = refreshed;
        response = await fetch(`${API_BASE_URL}${path}`, {
          ...options,
          headers: {
            ...(options.headers as Record<string, string> | undefined),
            Authorization: `Bearer ${tokenToUse}`,
          },
        });
      }

      if (!response.ok) {
        throw new Error(`Community request failed (${response.status})`);
      }
      return response;
    },
    [accessToken, refreshAccessToken, signOut],
  );

  const reload = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await authorizedFetch("/community/summary/");
      const json = (await response.json()) as CommunitySummary;
      setMe(json.public_card ? normalizeFriend(json.public_card) : null);
      setFriends((json.friends ?? []).map(normalizeFriend));
      setActivity(json.recent_activity ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load community");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authorizedFetch]);

  useEffect(() => {
    void reload();
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
      const response = await authorizedFetch(
        `/community/leaderboard/?${params.toString()}`,
      );
      const json = (await response.json()) as CommunityLeaderboardResponse;
      return {
        ...json,
        user_card: json.user_card ? normalizeFriend(json.user_card) : undefined,
        results: (json.results ?? []).map(normalizeFriend),
      };
    },
    [authorizedFetch],
  );

  const loadActivity = useCallback(
    async (filter: string) => {
      const response = await authorizedFetch(
        `/community/activity/?filter=${encodeURIComponent(filter)}&limit=50`,
      );
      const json = (await response.json()) as CommunityActivity[];
      setActivity(json);
      return json;
    },
    [authorizedFetch],
  );

  const loadTodayActivity = useCallback(async (): Promise<TodayActivityUpdate[]> => {
    const response = await authorizedFetch("/community/today-activity/");
    return (await response.json()) as TodayActivityUpdate[];
  }, [authorizedFetch]);

  const loadOverview = useCallback(async (): Promise<CommunityOverview> => {
    const response = await authorizedFetch("/community/overview/");
    return (await response.json()) as CommunityOverview;
  }, [authorizedFetch]);

  const loadTrainingChallenges = useCallback(async (): Promise<PremiumChallengeSections> => {
    const response = await authorizedFetch("/training-challenges/");
    return (await response.json()) as PremiumChallengeSections;
  }, [authorizedFetch]);

  const joinTrainingChallenge = useCallback(
    async (challengeId: number) => {
      await authorizedFetch(`/training-challenges/${challengeId}/join/`, {
        method: "POST",
      });
    },
    [authorizedFetch],
  );

  const likeActivity = useCallback(
    async (activityId: number, liked: boolean) => {
      await authorizedFetch(`/community/activity/${activityId}/like/`, {
        method: liked ? "DELETE" : "POST",
      });
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
      await loadActivity("recent");
    },
    [authorizedFetch, loadActivity],
  );

  const loadActivityComments = useCallback(
    async (activityId: number): Promise<CommunityActivityComment[]> => {
      const response = await authorizedFetch(
        `/community/activity/${activityId}/comments/`,
      );
      return (await response.json()) as CommunityActivityComment[];
    },
    [authorizedFetch],
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
      await loadActivity("recent");
    },
    [authorizedFetch, loadActivity],
  );

  const loadGroups = useCallback(async () => {
    const response = await authorizedFetch("/community/groups/");
    return (await response.json()) as CommunityGroupCard[];
  }, [authorizedFetch]);

  const loadGroupDetail = useCallback(
    async (groupId: number) => {
      const response = await authorizedFetch(`/community/groups/${groupId}/`);
      return (await response.json()) as CommunityGroupDetail;
    },
    [authorizedFetch],
  );

  const loadGroupMembers = useCallback(
    async (groupId: number) => {
      const response = await authorizedFetch(`/community/groups/${groupId}/members/`);
      return (await response.json()) as CommunityGroupMember[];
    },
    [authorizedFetch],
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
    },
    [authorizedFetch],
  );

  const loadGroupInviteLink = useCallback(
    async (groupId: number): Promise<{ token: string; url: string; appUrl: string }> => {
      const response = await authorizedFetch(`/community/groups/${groupId}/invite/`);
      return (await response.json()) as { token: string; url: string; appUrl: string };
    },
    [authorizedFetch],
  );

  const removeGroupMember = useCallback(
    async (groupId: number, userId: number) => {
      await authorizedFetch(`/community/groups/${groupId}/remove-member/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
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
      const response = await authorizedFetch(`/community/groups/${groupId}/activity/`);
      return (await response.json()) as CommunityGroupFeed;
    },
    [authorizedFetch],
  );

  const loadPublicProfile = useCallback(
    async (userId: number): Promise<CommunityPublicProfile> => {
      const response = await authorizedFetch(`/profiles/${userId}/public/`);
      return (await response.json()) as CommunityPublicProfile;
    },
    [authorizedFetch],
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
    likeActivity,
    commentActivity,
    shareActivity,
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
