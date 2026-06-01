import { useCallback, useEffect, useRef, useState } from "react";

import { fetchCachedJson } from "../api/client";
import { useAuth } from "../App";
import type { ApiPlan, Plan } from "../App";
import { mapApiPlan } from "../App";

export function usePlans() {
	const { accessToken, refreshAccessToken, signOut } = useAuth();
	const [plans, setPlans] = useState<Plan[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const isMountedRef = useRef(true);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const loadPlans = useCallback(async (force = true) => {
		try {
			if (isMountedRef.current) {
				setLoading(true);
				setError(null);
			}

			const json = await fetchCachedJson<ApiPlan[] | { results: ApiPlan[] }>(
				"/plans/",
				{
				accessToken,
				refreshAccessToken,
				signOut,
				},
				{ force, tags: ["plans"], ttlMs: 30_000 },
			);
			const apiPlans = Array.isArray(json) ? json : json.results ?? [];

			if (isMountedRef.current) {
				setPlans(apiPlans.map(mapApiPlan));
			}
		} catch (err) {
			if (isMountedRef.current) {
				setError(
					(err instanceof Error ? err.message : "Error loading plans"),
				);
			}
		} finally {
			if (isMountedRef.current) {
				setLoading(false);
			}
		}
	}, [accessToken, refreshAccessToken, signOut]);

	useEffect(() => {
		void loadPlans(false);
	}, [loadPlans]);

	return { plans, loading, error, reload: loadPlans };
}
