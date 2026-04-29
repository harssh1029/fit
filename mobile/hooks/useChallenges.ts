import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL } from "../api/client";
import { useAuth } from "../App";
import type { ApiChallenge } from "../types/challenges";

export function useChallenges() {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [challenges, setChallenges] = useState<ApiChallenge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadChallenges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let tokenToUse = accessToken;
      const headers: Record<string, string> = {};
      if (tokenToUse) {
        headers.Authorization = `Bearer ${tokenToUse}`;
      }

      let response = await fetch(`${API_BASE_URL}/challenges/`, { headers });

      // If the token expired, try a single refresh like other hooks.
      if (response.status === 401 && accessToken) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          await signOut();
          setChallenges([]);
          return;
        }
        tokenToUse = refreshed;
        response = await fetch(`${API_BASE_URL}/challenges/`, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to load challenges (${response.status})`);
      }

      const json = (await response.json()) as
        | ApiChallenge[]
        | {
            results: ApiChallenge[];
          };

      const apiChallenges = Array.isArray(json)
        ? json
        : Array.isArray((json as any)?.results)
          ? ((json as any).results as ApiChallenge[])
          : [];
      setChallenges(apiChallenges);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading challenges");
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken, signOut]);

  useEffect(() => {
    void loadChallenges();
  }, [loadChallenges]);

  const setChallengeCompleted = async (
    challengeId: string,
    completed: boolean,
  ): Promise<void> => {
    // Only authenticated users can persist completion state.
    if (!accessToken) return;

    try {
      let tokenToUse = accessToken;
      const method = completed ? "POST" : "DELETE";
      const buildHeaders = (token: string | null) => {
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
      };

      let response = await fetch(
        `${API_BASE_URL}/challenges/${challengeId}/complete/`,
        {
          method,
          headers: buildHeaders(tokenToUse),
        },
      );

      if (response.status === 401 && accessToken) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          await signOut();
          return;
        }
        tokenToUse = refreshed;
        response = await fetch(
          `${API_BASE_URL}/challenges/${challengeId}/complete/`,
          {
            method,
            headers: buildHeaders(tokenToUse),
          },
        );
      }

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
      await loadChallenges();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating challenge");
      console.error("Error updating challenge completion:", err);
    }
  };

  return { challenges, loading, error, reload: loadChallenges, setChallengeCompleted };
}
