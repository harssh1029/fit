import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL } from "../api/client";
import { useAuth } from "../App";
import type {
  CommunityActivity,
  CommunityFriendSummary,
  CommunityLeaderboardResponse,
  CommunitySummary,
  CommunityUserSuggestion,
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
    async (metric: string): Promise<CommunityLeaderboardResponse> => {
      const response = await authorizedFetch(
        `/community/leaderboard/?metric=${encodeURIComponent(metric)}&limit=100`,
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
  };
}
