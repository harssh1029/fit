import { useEffect, useState } from "react";

import { API_BASE_URL } from "../api/client";
import { useAuth } from "../App";
import type { ApiChallenge } from "../types/challenges";

export function useChallenges() {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [challenges, setChallenges] = useState<ApiChallenge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadChallenges = async () => {
      if (!isMounted) return;

      try {
        setLoading(true);
        setError(null);

        let tokenToUse = accessToken;
        const headers: Record<string, string> = {};
        if (tokenToUse) {
          headers["Authorization"] = `Bearer ${tokenToUse}`;
        }

        let response = await fetch(`${API_BASE_URL}/challenges/`, {
          headers,
        });

        // If the token expired, try a single refresh like other hooks.
        if (response.status === 401 && accessToken) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            await signOut();
            if (isMounted) {
              setChallenges([]);
            }
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

        let apiChallenges: ApiChallenge[] = [];
        if (Array.isArray(json)) {
          apiChallenges = json as ApiChallenge[];
        } else if (json && Array.isArray((json as any).results)) {
          apiChallenges = (json as any).results as ApiChallenge[];
        }

        if (isMounted) {
          setChallenges(apiChallenges);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Error loading challenges",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadChallenges();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshAccessToken, signOut]);

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
        throw new Error(
          `Failed to update challenge completion (${response.status})`,
        );
      }

      // Optimistically update local challenge status so the UI and top
      // progress card react immediately.
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === challengeId
            ? {
                ...c,
                card: {
                  ...c.card,
                  status: completed ? "done" : "unlocked",
                },
              }
            : c,
        ),
      );
    } catch (err) {
      console.error("Error updating challenge completion:", err);
    }
  };

  return { challenges, loading, error, setChallengeCompleted };
}
