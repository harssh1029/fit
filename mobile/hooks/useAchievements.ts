import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL } from "../api/client";
import { useAuth } from "../App";
import type { AchievementBadge } from "../types/community";

export type AchievementSummary = {
  level: {
    careerXp: number;
    currentLevel: number;
    currentTitle: string;
    currentLevelXp: number;
    nextLevelXp: number;
  };
  categoryLevels: Array<{
    category: string;
    xp: number;
    tier: string;
    nextTierXp: number;
  }>;
  featuredBadges: AchievementBadge[];
  recentBadges: AchievementBadge[];
  completedChallenges: Array<{ id: string; name: string; completedAt: string }>;
  completedPlans: Array<{ id: number; planId: string; name: string; completedAt?: string | null }>;
};

export function useAchievements() {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [summary, setSummary] = useState<AchievementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authorizedFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      if (!accessToken) throw new Error("Authentication required");
      let tokenToUse = accessToken;
      let response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          ...(options.headers as Record<string, string> | undefined),
          Authorization: `Bearer ${tokenToUse}`,
        },
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
      if (!response.ok) throw new Error(`Achievements request failed (${response.status})`);
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
      const response = await authorizedFetch("/achievements/me/");
      setSummary((await response.json()) as AchievementSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load achievements");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authorizedFetch]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const pinBadges = useCallback(
    async (userBadgeIds: number[]) => {
      const response = await authorizedFetch("/achievements/badges/pins/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_badge_ids: userBadgeIds.slice(0, 3) }),
      });
      const featured = (await response.json()) as AchievementBadge[];
      setSummary((current) => (current ? { ...current, featuredBadges: featured } : current));
      return featured;
    },
    [authorizedFetch],
  );

  return { summary, loading, error, reload, pinBadges };
}
