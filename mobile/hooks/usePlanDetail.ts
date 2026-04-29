import { useEffect, useState } from "react";

import { API_BASE_URL } from "../api/client";
import { useAuth } from "../App";
import type { ApiPlan, PlanDetail } from "../App";
import { mapApiPlanDetail } from "../App";

export function usePlanDetail(planId: string | null) {
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

				let tokenToUse = accessToken;
				const headers: HeadersInit = {};
				if (tokenToUse) {
					headers.Authorization = `Bearer ${tokenToUse}`;
				}

				let response = await fetch(`${API_BASE_URL}/plans/${planId}/`, {
					headers,
				});
				if (response.status === 401 && tokenToUse) {
					const refreshed = await refreshAccessToken();
					if (!refreshed) {
						await signOut();
						return;
					}
					tokenToUse = refreshed;
					response = await fetch(`${API_BASE_URL}/plans/${planId}/`, {
						headers: { Authorization: `Bearer ${tokenToUse}` },
					});
				}
				if (!response.ok) {
					throw new Error(`Failed to load plan (${response.status})`);
				}

				const json = (await response.json()) as ApiPlan;
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
	}, [planId, accessToken, refreshAccessToken, signOut]);

	return { plan, loading, error };
}
