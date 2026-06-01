import { useCallback, useEffect, useRef, useState } from "react";

import { fetchCachedJson } from "../api/client";
import { useAuth } from "../App";
import type { WorkoutHistoryEntry } from "../App";

export function useWorkoutHistory(limit: number = 60) {
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
				`/workouts/history/?limit=${limit}`,
				{ accessToken, refreshAccessToken, signOut },
				{ force, requiredAuth: true, tags: ["workout-history"], ttlMs: 10_000 },
			);
			if (!isMountedRef.current) return;
			setItems(json.results ?? []);
		} catch (err) {
			if (!isMountedRef.current) return;
			setError(
				err instanceof Error
					? err.message
					: "Error loading workout history",
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
