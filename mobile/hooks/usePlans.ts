import { useCallback, useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "../api/client";
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

	const loadPlans = useCallback(async () => {
		try {
			if (isMountedRef.current) {
				setLoading(true);
				setError(null);
			}

			let tokenToUse = accessToken;
			const headers: HeadersInit = {};
			if (tokenToUse) {
				headers.Authorization = `Bearer ${tokenToUse}`;
			}

			let response = await fetch(`${API_BASE_URL}/plans/`, { headers });
			if (response.status === 401 && tokenToUse) {
				const refreshed = await refreshAccessToken();
				if (!refreshed) {
					await signOut();
					return;
				}
				tokenToUse = refreshed;
				response = await fetch(`${API_BASE_URL}/plans/`, {
					headers: { Authorization: `Bearer ${tokenToUse}` },
				});
			}
			if (!response.ok) {
				throw new Error(`Failed to load plans (${response.status})`);
			}

			const json = (await response.json()) as ApiPlan[] | { results: ApiPlan[] };
			let apiPlans: ApiPlan[] = [];
			if (Array.isArray(json)) {
				apiPlans = json as ApiPlan[];
			} else if (json && Array.isArray((json as any).results)) {
				apiPlans = (json as any).results as ApiPlan[];
			}

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
		void loadPlans();
	}, [loadPlans]);

	return { plans, loading, error, reload: loadPlans };
}
