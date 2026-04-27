import { useEffect, useState } from "react";

import { API_BASE_URL } from "../api/client";
import type { ApiPlan, PlanDetail } from "../App";
import { mapApiPlanDetail } from "../App";

export function usePlanDetail(planId: string | null) {
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

				const response = await fetch(`${API_BASE_URL}/plans/${planId}/`);
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
	}, [planId]);

	return { plan, loading, error };
}
