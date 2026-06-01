import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import {
  fetchCachedJson,
  fetchRequiredAuth,
  invalidateApiCache,
} from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { useAuth, useThemeMode, styles, type ProfileStackParamList } from "../../App";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import type {
  CommunityActivity,
  SavedCommunityActivityPage,
} from "../../types/community";
import { PS_BLUE } from "../../styles/theme";
import { fontFamily } from "../../styles/typography";
import { FeedCard, type FeedItem } from "../home/HomeFeedScreen";

type ProfileActivityScreenProps = NativeStackScreenProps<
  ProfileStackParamList,
  "ProfileActivity"
>;

const ProfileActivityScreen: React.FC<ProfileActivityScreenProps> = ({
  navigation,
  route,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const { profile } = useUserProfileBasic();
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = useMemo(
    () => ({ accessToken, refreshAccessToken, signOut }),
    [accessToken, refreshAccessToken, signOut],
  );
  const isSaved = route.params.mode === "saved";
  const title = isSaved ? "Saved posts" : "Your posts";
  const subtitle = isSaved
    ? "Training posts saved for later"
    : "Your complete training activity";

  const loadActivities = useCallback(
    async (force = true) => {
      if (!accessToken) return;
      setLoading(true);
      setError(null);
      try {
        const page = await fetchCachedJson<SavedCommunityActivityPage>(
          isSaved ? "/community/saved/?limit=30" : "/profiles/me/posts/?limit=30",
          auth,
          {
            force,
            requiredAuth: true,
            tags: [isSaved ? "saved-activities" : "profile-posts"],
            ttlMs: 10_000,
          },
        );
        setActivities(page.results ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load posts.");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, auth, isSaved],
  );

  useFocusEffect(
    useCallback(() => {
      void loadActivities(false);
    }, [loadActivities]),
  );

  const toggleSaved = async (item: FeedItem, saved: boolean) => {
    const response = await fetchRequiredAuth(
      `/community/activity/${item.id}/save/`,
      auth,
      { method: saved ? "DELETE" : "POST" },
    );
    if (!response.ok) throw new Error("Unable to update saved post.");
    invalidateApiCache("saved-activities", "community-activity", "profile-posts");
    setActivities((items) =>
      isSaved && saved
        ? items.filter((activity) => activity.id !== item.id)
        : items.map((activity) =>
            activity.id === item.id
              ? { ...activity, savedByMe: !saved }
              : activity,
          ),
    );
  };

  const toggleLike = async (item: FeedItem) => {
    const response = await fetchRequiredAuth(
      `/community/activity/${item.id}/like/`,
      auth,
      { method: item.likedByMe ? "DELETE" : "POST" },
    );
    if (!response.ok) return;
    invalidateApiCache("saved-activities", "community-activity", "profile-posts");
    await loadActivities();
  };

  const share = async (item: FeedItem) => {
    const response = await fetchRequiredAuth(
      `/community/activity/${item.id}/share/`,
      auth,
      { method: "POST" },
    );
    if (!response.ok) return;
    invalidateApiCache("saved-activities", "community-activity", "profile-posts");
    await loadActivities();
  };

  return (
    <ScrollView
      style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <AppHeader
        isLight={isLight}
        title={title}
        subtitle={subtitle}
        userName={profile?.profile.display_name || profile?.username || null}
        avatarUrl={profile?.profile.avatar_url}
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <View style={profileActivityStyles.state}>
          <ActivityIndicator color={PS_BLUE} />
        </View>
      ) : error ? (
        <Text style={[profileActivityStyles.message, isLight && profileActivityStyles.messageLight]}>
          {error}
        </Text>
      ) : activities.length ? (
        activities.map((post) => (
          <FeedCard
            key={`${route.params.mode}-${post.id}`}
            item={{ ...post, synthetic: false } as FeedItem}
            isLight={isLight}
            openOnPress={false}
            onOpen={() => undefined}
            onLike={(item) => void toggleLike(item)}
            onComment={() => undefined}
            onShare={(item) => void share(item)}
            onSave={toggleSaved}
          />
        ))
      ) : (
        <Text style={[profileActivityStyles.message, isLight && profileActivityStyles.messageLight]}>
          {isSaved ? "Saved posts will appear here." : "Your training posts will appear here."}
        </Text>
      )}
    </ScrollView>
  );
};

const profileActivityStyles = StyleSheet.create({
  state: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    paddingVertical: 34,
    color: "#94A3B8",
    fontFamily: fontFamily.uiMedium,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  messageLight: {
    color: "#64748B",
  },
});

export default ProfileActivityScreen;
