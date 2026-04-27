import { useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "../api/client";
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

	const load = async () => {
		if (!isMountedRef.current) return;
		if (!accessToken) {
			setItems([]);
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			setError(null);
			let tokenToUse = accessToken;
			let response = await fetch(
				`${API_BASE_URL}/workouts/history/?limit=${limit}`,
				{
					headers: { Authorization: `Bearer ${tokenToUse}` },
				},
			);
			if (response.status === 401) {
				const refreshed = await refreshAccessToken();
				if (!refreshed) {
					await signOut();
					return;
				}
				tokenToUse = refreshed;
				response = await fetch(
					`${API_BASE_URL}/workouts/history/?limit=${limit}`,
					{
						headers: { Authorization: `Bearer ${tokenToUse}` },
					},
				);
			}
			if (!response.ok) {
				throw new Error("Failed to load workout history");
			}
			const json = (await response.json()) as {
				results?: WorkoutHistoryEntry[];
				has_more?: boolean;
			};
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
	};

	useEffect(() => {
		void load();
	}, [accessToken, refreshAccessToken, signOut, limit]);

	return { items, loading, error, reload: load };
}
