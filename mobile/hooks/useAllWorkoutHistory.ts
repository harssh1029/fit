import { useCallback, useEffect, useRef, useState } from "react";

import { fetchCachedJson } from "../api/client";
import { useAuth } from "../App";
import type { WorkoutHistoryEntry } from "../App";

// Fetch the user's full workout log across all plans. This is used by the
// Profile screen, while the dashboard history is scoped to the active plan
// only via useWorkoutHistory.
export function useAllWorkoutHistory(limit: number = 200) {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [items, setItems] = useState<WorkoutHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(async (force = true) => {
    if (!isMountedRef.current) return;
    if (!accessToken) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const json = await fetchCachedJson<{
        results?: WorkoutHistoryEntry[];
        has_more?: boolean;
      }>(
        `/workouts/all-history/?limit=${limit}`,
        { accessToken, refreshAccessToken, signOut },
        { force, requiredAuth: true, tags: ["all-workout-history"], ttlMs: 10_000 },
      );
      if (!isMountedRef.current) return;
      setItems(json.results ?? []);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "Error loading full workout history",
      );
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
    }
  }, [accessToken, limit, refreshAccessToken, signOut]);

  useEffect(() => {
    void load(false);
  }, [load]);

  return { items, loading, error, reload: load };
}
