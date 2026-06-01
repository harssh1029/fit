import { useCallback, useEffect, useState } from "react";

import { apiCacheKey, cachedApiQuery, fetchRequiredAuth } from "../api/client";
import type { ApiAuthSession } from "../api/client";
import { useAuth } from "../App";

export type ActiveScheduledWorkout = {
	id: number;
	week_number: number;
	day_index: number;
	scheduled_date: string;
	original_scheduled_date: string;
	status: "scheduled" | "completed" | "missed" | "skipped";
	completed_at?: string | null;
	missed_at?: string | null;
	order_index: number;
	plan_day: {
		id: number | string;
		title: string;
		duration: string;
		duration_minutes?: number;
		day_type: string;
		intensity?: string;
		rpe_target?: string;
		primary_focus?: string;
		coach_note?: string;
		exercises?: Array<{
			label: string;
			primary?: string;
			exercise?: {
				primary_muscles?: string[];
				secondary_muscles?: string[];
			} | null;
		}>;
	};
};

export type ActiveUserPlan = {
	id: number;
	status: string;
	sessions_per_week: number;
	training_days_pattern: string[];
	start_date: string | null;
	end_date: string | null;
	original_end_date: string | null;
	is_recalibrated: boolean;
	recalibration_count: number;
	completed_sessions: number;
	missed_sessions: number;
	total_sessions: number;
	completion_percent: string;
	plan: {
		id: string;
		name: string;
		subtitle?: string | null;
	};
	plan_version?: {
		id: string;
		title: string;
		sessions_per_week: number;
	} | null;
	scheduled_workouts: ActiveScheduledWorkout[];
};

const fetchActiveUserPlan = async (
	auth: ApiAuthSession,
	force: boolean,
): Promise<ActiveUserPlan | null> => {
	if (!auth.accessToken) return null;
	return cachedApiQuery(
		apiCacheKey("/user-plans/active/", auth),
		async () => {
			const response = await fetchRequiredAuth("/user-plans/active/", auth);
			if (response.status === 404) return null;
			if (!response.ok) {
				throw new Error(`Failed to load active plan (${response.status})`);
			}
			return (await response.json()) as ActiveUserPlan;
		},
		{ force, tags: ["active-plan"], ttlMs: 15_000 },
	);
};

export function useActiveUserPlan() {
	const { accessToken, refreshAccessToken, signOut } = useAuth();
	const [activeUserPlan, setActiveUserPlan] = useState<ActiveUserPlan | null>(
		null,
	);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const reload = useCallback(async (force = true) => {
		if (!accessToken) {
			setActiveUserPlan(null);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const auth = { accessToken, refreshAccessToken, signOut };
			setActiveUserPlan(await fetchActiveUserPlan(auth, force));
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error loading active plan");
		} finally {
			setLoading(false);
		}
	}, [accessToken, refreshAccessToken, signOut]);

	useEffect(() => {
		void reload(false);
	}, [reload]);

	return { activeUserPlan, loading, error, reload };
}
