import { useEffect, useState } from "react";

import { API_BASE_URL } from "../api/client";
import type { ApiPlan, Plan } from "../App";
import { mapApiPlan } from "../App";

export function usePlans() {
	const [plans, setPlans] = useState<Plan[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		const loadPlans = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await fetch(`${API_BASE_URL}/plans/`);
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

				if (isMounted) {
					setPlans(apiPlans.map(mapApiPlan));
				}
			} catch (err) {
				if (isMounted) {
					setError(
						(err instanceof Error ? err.message : "Error loading plans"),
					);
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		void loadPlans();

		return () => {
			isMounted = false;
		};
	}, []);

	return { plans, loading, error };
}
