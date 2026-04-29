import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { API_BASE_URL } from "../api/client";
import { useAuth } from "../App";
import type { UserProfile } from "../App";

export function useUserProfileBasic() {
	const { accessToken, refreshAccessToken, signOut } = useAuth();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const isMountedRef = useRef(true);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const loadProfile = useCallback(async () => {
		if (!accessToken) {
			if (isMountedRef.current) {
				setProfile(null);
				setLoading(false);
			}
			return;
		}
		try {
			setLoading(true);
			setError(null);
			let tokenToUse = accessToken;
			let response = await fetch(`${API_BASE_URL}/me/`, {
				headers: { Authorization: `Bearer ${tokenToUse}` },
			});
			if (response.status === 401) {
				const refreshed = await refreshAccessToken();
				if (!refreshed) {
					await signOut();
					return;
				}
				response = await fetch(`${API_BASE_URL}/me/`, {
					headers: { Authorization: `Bearer ${refreshed}` },
				});
			}
			if (!response.ok) {
				throw new Error("Failed to load profile");
			}
			const json = (await response.json()) as UserProfile;
			if (isMountedRef.current) {
				setProfile(json);
			}
		} catch (err) {
			if (isMountedRef.current) {
				setError(err instanceof Error ? err.message : "Error loading profile");
			}
		} finally {
			if (isMountedRef.current) {
				setLoading(false);
			}
		}
	}, [accessToken, refreshAccessToken, signOut]);

	useEffect(() => {
		void loadProfile();
	}, [loadProfile]);

	useFocusEffect(
		useCallback(() => {
			void loadProfile();
		}, [loadProfile]),
	);

	return { profile, loading, error, reload: loadProfile };
}
