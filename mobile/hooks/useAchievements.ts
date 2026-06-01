import { useCallback, useEffect, useState } from "react";

import { fetchCachedJson, fetchRequiredAuth, invalidateApiCache } from "../api/client";
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
      const response = await fetchRequiredAuth(path, {
        accessToken,
        refreshAccessToken,
        signOut,
      }, options);
      if (!response.ok) throw new Error(`Achievements request failed (${response.status})`);
      return response;
    },
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
      setSummary(await fetchCachedJson<AchievementSummary>(
        "/achievements/me/",
        { accessToken, refreshAccessToken, signOut },
        { force, requiredAuth: true, tags: ["achievements"], ttlMs: 15_000 },
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load achievements");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken, signOut]);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  const pinBadges = useCallback(
    async (userBadgeIds: number[]) => {
      const response = await authorizedFetch("/achievements/badges/pins/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_badge_ids: userBadgeIds.slice(0, 3) }),
      });
      const featured = (await response.json()) as AchievementBadge[];
      invalidateApiCache("achievements", "profile-summary");
      setSummary((current) => (current ? { ...current, featuredBadges: featured } : current));
      return featured;
    },
    [authorizedFetch],
  );

  return { summary, loading, error, reload, pinBadges };
}
