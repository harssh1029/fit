import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

import { fetchCachedJson } from "../api/client";
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

	const loadProfile = useCallback(async (force = true) => {
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
			const json = await fetchCachedJson<UserProfile>("/me/", {
				accessToken,
				refreshAccessToken,
				signOut,
			}, {
				force,
				requiredAuth: true,
				tags: ["profile"],
			});
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
		void loadProfile(false);
	}, [loadProfile]);

	useFocusEffect(
		useCallback(() => {
			void loadProfile(false);
		}, [loadProfile]),
	);

	return { profile, loading, error, reload: loadProfile };
}
