import Constants from "expo-constants";
import { Platform } from "react-native";

// API base URL helper that works across web, simulator, and Expo Go on device.
// - On web / simulators, we can safely use localhost.
// - On a physical device running Expo Go, we derive the dev machine's IP from
//   Expo's host URI (the same one Metro dev tools use), so you don't have to
//   keep hard-coding your LAN IP.
const getApiBaseUrl = (): string => {
	if (Platform.OS === "web") {
		return "http://localhost:8000/api/v1";
	}
	// Native (iOS / Android) via Expo Go or simulator
	// Try to infer the host (e.g. "192.168.1.10") from Expo's config.
	const expoConfig: any =
		(Constants as any).expoConfig ?? (Constants as any).manifest2;
	const hostUri: string | undefined =
		(expoConfig && expoConfig.hostUri) ||
		(expoConfig &&
			expoConfig.extra &&
			expoConfig.extra.expoClient &&
			expoConfig.extra.expoClient.hostUri);

	if (hostUri) {
		// hostUri looks like "192.168.1.10:19000" or "192.168.1.10:19000/--/"
		const host = hostUri.split(":")[0];
		return `http://${host}:8000/api/v1`;
	}

	// Fallback: if we can't detect it, default to localhost (works on simulator).
	return "http://localhost:8000/api/v1";
};

export const API_BASE_URL = getApiBaseUrl();
export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
