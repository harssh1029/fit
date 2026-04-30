import { useCallback, useEffect, useState } from "react";

import { API_BASE_URL } from "../api/client";
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
		day_type: string;
		intensity?: string;
		rpe_target?: string;
		coach_note?: string;
	};
};

export type ActiveUserPlan = {
	id: number;
	status: string;
	sessions_per_week: number;
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

export function useActiveUserPlan() {
	const { accessToken } = useAuth();
	const [activeUserPlan, setActiveUserPlan] = useState<ActiveUserPlan | null>(
		null,
	);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const reload = useCallback(async () => {
		if (!accessToken) {
			setActiveUserPlan(null);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const response = await fetch(`${API_BASE_URL}/user-plans/active`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});
			if (response.status === 404) {
				setActiveUserPlan(null);
				return;
			}
			if (!response.ok) {
				throw new Error(`Failed to load active plan (${response.status})`);
			}
			let json = (await response.json()) as ActiveUserPlan;
			const missedResponse = await fetch(
				`${API_BASE_URL}/user-plans/${json.id}/check-missed`,
				{
					method: "POST",
					headers: { Authorization: `Bearer ${accessToken}` },
				},
			);
			if (missedResponse.ok) {
				json = (await missedResponse.json()) as ActiveUserPlan;
			}
			setActiveUserPlan(json);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error loading active plan");
		} finally {
			setLoading(false);
		}
	}, [accessToken]);

	useEffect(() => {
		void reload();
	}, [reload]);

	return { activeUserPlan, loading, error, reload };
}
