import { useEffect, useState } from "react";

import { API_BASE_URL } from "../api/client";
import { useAuth } from "../App";
import type { UserProfile } from "../App";

export function useUserProfileBasic() {
	const { accessToken, refreshAccessToken, signOut } = useAuth();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		const loadProfile = async () => {
			if (!accessToken) {
				if (isMounted) {
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
				if (isMounted) {
					setProfile(json);
				}
			} catch (err) {
				if (isMounted) {
					setError(
						err instanceof Error ? err.message : "Error loading profile",
					);
				}
			} finally {
				if (isMounted) {
					setLoading(false);
				}
			}
		};

		void loadProfile();

		return () => {
			isMounted = false;
		};
	}, [accessToken, refreshAccessToken, signOut]);

	return { profile, loading, error };
}
