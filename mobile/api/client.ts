import Constants from "expo-constants";
import { Platform } from "react-native";

const normalizeApiBaseUrl = (value: string): string => value.replace(/\/+$/, "");

// API base URL helper that works across web, simulator, and Expo Go on device.
// Deployed builds should configure EXPO_PUBLIC_API_BASE_URL or extra.apiBaseUrl
// with an HTTPS API root such as https://api.example.com/api/v1.
// - On web / simulators, we can safely use localhost.
// - On a physical device running Expo Go, we derive the dev machine's IP from
//   Expo's host URI (the same one Metro dev tools use), so you don't have to
//   keep hard-coding your LAN IP.
const getApiBaseUrl = (): string => {
	const expoConfig: any =
		(Constants as any).expoConfig ?? (Constants as any).manifest2;
	const configuredUrl =
		process.env.EXPO_PUBLIC_API_BASE_URL ||
		(expoConfig && expoConfig.extra && expoConfig.extra.apiBaseUrl);
	if (configuredUrl) {
		return normalizeApiBaseUrl(configuredUrl);
	}
	if (!__DEV__) {
		throw new Error("EXPO_PUBLIC_API_BASE_URL must be configured for production builds.");
	}
	if (Platform.OS === "web") {
		return "http://localhost:8000/api/v1";
	}
	// Native (iOS / Android) via Expo Go or simulator
	// Try to infer the host (e.g. "192.168.1.10") from Expo's config.
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

export type ApiAuthSession = {
	accessToken: string | null;
	refreshAccessToken: () => Promise<string | null>;
	signOut: () => Promise<void> | void;
};

export type ApiQueryOptions = {
	force?: boolean;
	tags?: string[];
	ttlMs?: number;
};

export type ApiFetchPolicy = {
	retries?: number;
	retryDelayMs?: number;
	timeoutMs?: number;
};

type ApiCacheEntry = {
	loadedAt: number;
	tags: Set<string>;
	value: unknown;
};

const DEFAULT_QUERY_TTL_MS = 15_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 12_000;
const DEFAULT_RETRY_DELAY_MS = 350;
const DEFAULT_READ_RETRIES = 2;
const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const apiQueryCache = new Map<string, ApiCacheEntry>();
const apiQueryRequests = new Map<string, Promise<unknown>>();
let apiCacheEpoch = 0;
let accessTokenRefreshRequest: Promise<string | null> | null = null;

export const apiCacheKey = (path: string, auth: ApiAuthSession): string =>
	`${auth.accessToken ?? "anonymous"}:${path}`;

export const cachedApiQuery = async <T>(
	key: string,
	load: () => Promise<T>,
	options: ApiQueryOptions = {},
): Promise<T> => {
	const ttlMs = options.ttlMs ?? DEFAULT_QUERY_TTL_MS;
	const cached = apiQueryCache.get(key);
	if (
		!options.force &&
		cached &&
		Date.now() - cached.loadedAt < ttlMs
	) {
		return cached.value as T;
	}

	const activeRequest = apiQueryRequests.get(key);
	if (activeRequest) {
		return activeRequest as Promise<T>;
	}

	const requestEpoch = apiCacheEpoch;
	const request = load();
	apiQueryRequests.set(key, request);
	try {
		const value = await request;
		if (requestEpoch === apiCacheEpoch) {
			apiQueryCache.set(key, {
				loadedAt: Date.now(),
				tags: new Set(options.tags ?? []),
				value,
			});
		}
		return value;
	} finally {
		if (apiQueryRequests.get(key) === request) {
			apiQueryRequests.delete(key);
		}
	}
};

export const invalidateApiCache = (...tags: string[]) => {
	apiCacheEpoch += 1;
	if (!tags.length) {
		apiQueryCache.clear();
		return;
	}
	for (const [key, entry] of apiQueryCache) {
		if (tags.some((tag) => entry.tags.has(tag))) {
			apiQueryCache.delete(key);
		}
	}
};

export const invalidateWorkoutData = () =>
	invalidateApiCache(
		"dashboard",
		"profile-summary",
		"achievements",
		"community-summary",
		"community-activity",
		"community-overview",
		"active-plan",
		"workout-history",
		"all-workout-history",
	);

export const invalidatePlanData = () =>
	invalidateApiCache(
		"plans",
		"plan-details",
		"active-plan",
		"dashboard",
		"profile",
		"profile-summary",
		"achievements",
		"workout-history",
		"all-workout-history",
	);

export const invalidateCommunityData = () =>
	invalidateApiCache(
		"community-summary",
		"community-activity",
		"community-overview",
		"community-groups",
		"community-group-detail",
		"community-group-members",
		"community-leaderboard",
		"profile-summary",
	);

export const buildApiUrl = (path: string): string => {
	if (/^https?:\/\//i.test(path)) {
		return path;
	}
	return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const wait = (delayMs: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, delayMs);
	});

const fetchOnce = async (
	path: string,
	options: RequestInit,
	timeoutMs: number,
): Promise<Response> => {
	const controller = new AbortController();
	const upstreamSignal = options.signal;
	const abortFromUpstream = () => controller.abort();
	if (upstreamSignal) {
		if (upstreamSignal.aborted) {
			controller.abort();
		} else {
			upstreamSignal.addEventListener("abort", abortFromUpstream);
		}
	}
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(buildApiUrl(path), {
			...options,
			signal: controller.signal,
		});
	} catch (error) {
		if (controller.signal.aborted && !upstreamSignal?.aborted) {
			throw new Error(`Request timed out after ${timeoutMs}ms`);
		}
		throw error;
	} finally {
		clearTimeout(timeout);
		upstreamSignal?.removeEventListener("abort", abortFromUpstream);
	}
};

export const fetchApi = async (
	path: string,
	options: RequestInit = {},
	policy: ApiFetchPolicy = {},
): Promise<Response> => {
	const method = (options.method ?? "GET").toUpperCase();
	const retries =
		policy.retries ?? (IDEMPOTENT_METHODS.has(method) ? DEFAULT_READ_RETRIES : 0);
	const retryDelayMs = policy.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
	const timeoutMs = policy.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
	let lastError: unknown = null;

	for (let attempt = 0; attempt <= retries; attempt += 1) {
		try {
			const response = await fetchOnce(path, options, timeoutMs);
			if (!RETRYABLE_STATUSES.has(response.status) || attempt === retries) {
				return response;
			}
		} catch (error) {
			lastError = error;
			if (attempt === retries || options.signal?.aborted) {
				throw error;
			}
		}
		await wait(retryDelayMs * 2 ** attempt);
	}
	throw lastError instanceof Error ? lastError : new Error("Request failed");
};

const mergeAuthHeader = (
	headers: HeadersInit | undefined,
	token: string | null,
): HeadersInit => {
	const mergedHeaders: Record<string, string> = {};
	if (typeof Headers !== "undefined" && headers instanceof Headers) {
		headers.forEach((value, key) => {
			mergedHeaders[key] = value;
		});
	} else if (Array.isArray(headers)) {
		headers.forEach(([key, value]) => {
			mergedHeaders[key] = value;
		});
	} else if (headers) {
		Object.assign(mergedHeaders, headers);
	}

	if (!token) {
		return mergedHeaders;
	}
	return {
		...mergedHeaders,
		Authorization: `Bearer ${token}`,
	};
};

export const fetchWithAuth = async (
	path: string,
	auth: ApiAuthSession,
	options: RequestInit = {},
): Promise<Response> => {
	let tokenToUse = auth.accessToken;
	let response = await fetchApi(path, {
		...options,
		headers: mergeAuthHeader(options.headers, tokenToUse),
	});

	if (response.status !== 401 || !tokenToUse) {
		return response;
	}

	if (!accessTokenRefreshRequest) {
		accessTokenRefreshRequest = auth.refreshAccessToken().finally(() => {
			accessTokenRefreshRequest = null;
		});
	}
	const refreshed = await accessTokenRefreshRequest;
	if (!refreshed) {
		await auth.signOut();
		throw new Error("Session expired");
	}

	tokenToUse = refreshed;
	return fetchApi(path, {
		...options,
		headers: mergeAuthHeader(options.headers, tokenToUse),
	});
};

export const fetchRequiredAuth = async (
	path: string,
	auth: ApiAuthSession,
	options: RequestInit = {},
): Promise<Response> => {
	if (!auth.accessToken) {
		throw new Error("Authentication required");
	}
	return fetchWithAuth(path, auth, options);
};

export const fetchCachedJson = async <T>(
	path: string,
	auth: ApiAuthSession,
	options: ApiQueryOptions & { requiredAuth?: boolean } = {},
): Promise<T> =>
	cachedApiQuery(
		apiCacheKey(path, auth),
		async () => {
			const response = options.requiredAuth
				? await fetchRequiredAuth(path, auth)
				: await fetchWithAuth(path, auth);
			if (!response.ok) {
				throw new Error(`Request failed (${response.status})`);
			}
			return (await response.json()) as T;
		},
		options,
	);
