import { useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "../api/client";
import { useAuth } from "../App";
import type { DashboardSummary } from "../types/dashboard";

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

  const reload = async () => {
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
      let tokenToUse = accessToken;
      let response = await fetch(`${API_BASE_URL}/dashboard/summary/`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          await signOut();
          return;
        }
        tokenToUse = refreshed;
        response = await fetch(`${API_BASE_URL}/dashboard/summary/`, {
          headers: { Authorization: `Bearer ${tokenToUse}` },
        });
      }
      if (!response.ok) {
        throw new Error("Failed to load dashboard metrics");
      }
      const json = (await response.json()) as DashboardSummary;
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
  };

  useEffect(() => {
    void reload();
  }, [accessToken, refreshAccessToken, signOut]);

  return { summary, loading, error, reload };
}
