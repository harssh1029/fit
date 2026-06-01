import { useEffect, useState } from "react";

import { fetchCachedJson } from "../api/client";
import { useAuth } from "../App";
import type { ApiPlan, PlanDetail } from "../App";
import { mapApiPlanDetail } from "../App";

export function usePlanDetail(
	planId: string | null,
	selectedSessionsPerWeek?: number | null,
) {
	const { accessToken, refreshAccessToken, signOut } = useAuth();
	const [plan, setPlan] = useState<PlanDetail | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!planId) {
			setPlan(null);
			setLoading(false);
			setError(null);
			return;
		}

		let isMounted = true;

		const loadPlan = async () => {
			try {
				setLoading(true);
				setError(null);

				const suffix = selectedSessionsPerWeek
					? `?sessions_per_week=${selectedSessionsPerWeek}`
					: "";
				const json = await fetchCachedJson<ApiPlan>(
					`/plans/${planId}/${suffix}`,
					{ accessToken, refreshAccessToken, signOut },
					{ tags: ["plan-details"], ttlMs: 60_000 },
				);
				if (isMounted) {
					setPlan(mapApiPlanDetail(json));
				}
			} catch (err) {
				if (isMounted) {
					setError(
						(err instanceof Error ? err.message : "Error loading plan"),
					);
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		void loadPlan();

		return () => {
			isMounted = false;
		};
	}, [planId, selectedSessionsPerWeek, accessToken, refreshAccessToken, signOut]);

	return { plan, loading, error };
}
