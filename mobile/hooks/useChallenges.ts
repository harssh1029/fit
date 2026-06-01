import { useCallback, useEffect, useState } from "react";

import { fetchCachedJson, fetchRequiredAuth, invalidateApiCache } from "../api/client";
import { useAuth } from "../App";
import type { ApiChallenge } from "../types/challenges";

export function useChallenges() {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [challenges, setChallenges] = useState<ApiChallenge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadChallenges = useCallback(async (force = true) => {
    try {
      setLoading(true);
      setError(null);

      const json = await fetchCachedJson<ApiChallenge[] | { results: ApiChallenge[] }>(
        "/challenges/",
        { accessToken, refreshAccessToken, signOut },
        { force, tags: ["challenges"], ttlMs: 30_000 },
      );
      setChallenges(Array.isArray(json) ? json : json.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading challenges");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken, signOut]);

  useEffect(() => {
    void loadChallenges(false);
  }, [loadChallenges]);

  const setChallengeCompleted = async (
    challengeId: string,
    completed: boolean,
  ): Promise<void> => {
    // Only authenticated users can persist completion state.
    if (!accessToken) return;

    try {
      const method = completed ? "POST" : "DELETE";
      const response = await fetchRequiredAuth(
        `/challenges/${challengeId}/complete/`,
        { accessToken, refreshAccessToken, signOut },
        { method },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail =
          payload && typeof payload.detail === "string"
            ? payload.detail
            : `Failed to update challenge completion (${response.status})`;
        throw new Error(detail);
      }

      // Reload from the backend so dependent challenges unlock immediately
      // when a completion requirement has just been met.
      invalidateApiCache("challenges", "achievements", "profile-summary");
      await loadChallenges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating challenge");
      console.error("Error updating challenge completion:", err);
    }
  };

  return { challenges, loading, error, reload: loadChallenges, setChallengeCompleted };
}
