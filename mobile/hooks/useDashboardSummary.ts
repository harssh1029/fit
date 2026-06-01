import { useCallback, useEffect, useRef, useState } from "react";

import { fetchCachedJson, invalidateApiCache } from "../api/client";
import { useAuth } from "../App";
import type { DashboardSummary } from "../types/dashboard";

export const invalidateDashboardSummaryCache = () => {
  invalidateApiCache("dashboard");
};

export function useDashboardSummary() {
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async (force = true) => {
    if (!accessToken) {
      if (!isMountedRef.current) return;
      setSummary(null);
      setLoading(false);
      return;
    }

    if (!isMountedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const json = await fetchCachedJson<DashboardSummary>("/dashboard/summary/", {
        accessToken,
        refreshAccessToken,
        signOut,
      }, {
        force,
        requiredAuth: true,
        tags: ["dashboard"],
      });
      if (!isMountedRef.current) return;
      setSummary(json);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(
        err instanceof Error ? err.message : "Error loading dashboard metrics",
      );
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken, signOut]);

  useEffect(() => {
    void reload(false);
  }, [reload]);

  return { summary, loading, error, reload };
}
