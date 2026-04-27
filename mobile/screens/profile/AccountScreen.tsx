import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE_URL } from "../../api/client";
import { ThemeToggle } from "../../components/ThemeToggle";
import { GLASS_ACCENT_GREEN } from "../../styles/theme";
import {
  useAuth,
  useExercisePrs,
  useThemeMode,
  HeaderAvatar,
  styles,
} from "../../App";
import { useAllWorkoutHistory } from "../../hooks/useAllWorkoutHistory";
import type { UserProfile } from "../../App";

const AccountScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const { prs: exercisePrs } = useExercisePrs();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPrSheetVisible, setIsPrSheetVisible] = useState(false);
  const [isWorkoutHistorySheetVisible, setIsWorkoutHistorySheetVisible] =
    useState(false);
  const {
    items: allWorkoutHistoryItems,
    loading: allWorkoutHistoryLoading,
    error: allWorkoutHistoryError,
    reload: reloadAllWorkoutHistory,
  } = useAllWorkoutHistory();
  const accountUserName =
    profile?.profile.display_name || profile?.username || null;

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!accessToken) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        let tokenToUse = accessToken;
        let response = await fetch(`${API_BASE_URL}/me/`, {
          headers: {
            Authorization: `Bearer ${tokenToUse}`,
          },
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
        if (isMounted) setProfile(json);
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Error loading profile",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [accessToken, refreshAccessToken, signOut]);

  if (loading) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {accountUserName ? `Hi ${accountUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your profile
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={accountUserName} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  if (!profile || error) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {accountUserName ? `Hi ${accountUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your profile
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={accountUserName} />
          </View>
        </View>
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          My Profile
        </Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  const name = profile.profile.display_name || profile.username;

  return (
    <>
      <ScrollView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
        contentContainerStyle={styles.plansScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.homeHeaderRow}>
          <View>
            <Text
              style={[
                styles.homeGreetingLabel,
                isLight && styles.homeGreetingLabelLight,
              ]}
            >
              {accountUserName ? `Hi ${accountUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Your profile
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={accountUserName} />
          </View>
        </View>

        {/* Header */}
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          My Profile
        </Text>

        {/* Profile card */}
        <View style={[styles.profileCard, isLight && styles.profileCardLight]}>
          <View
            style={[styles.avatarCircle, isLight && styles.avatarCircleLight]}
          >
            <Text
              style={[
                styles.avatarInitials,
                isLight && styles.avatarInitialsLight,
              ]}
            >
              {name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileTextBlock}>
            <Text
              style={[styles.profileName, isLight && styles.profileNameLight]}
            >
              {name}
            </Text>
            <Text
              style={[styles.profileGoal, isLight && styles.profileGoalLight]}
            >
              Goal: Hypertrophy & Longevity
            </Text>
          </View>
          <View
            style={[styles.premiumPill, isLight && styles.premiumPillLight]}
          >
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>
        </View>

        {/* Stats row – placeholder values for now */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, isLight && styles.statCardLight]}>
            <Text style={[styles.statLabel, isLight && styles.statLabelLight]}>
              WEIGHT
            </Text>
            <Text style={[styles.statValue, isLight && styles.statValueLight]}>
              {profile.profile.weight_kg ?? "–"} kg
            </Text>
            <Text style={[styles.statDelta, isLight && styles.statDeltaLight]}>
              0.0 kg
            </Text>
          </View>
          <View style={[styles.statCard, isLight && styles.statCardLight]}>
            <Text style={[styles.statLabel, isLight && styles.statLabelLight]}>
              SLEEP
            </Text>
            <Text style={[styles.statValue, isLight && styles.statValueLight]}>
              7h 45m
            </Text>
            <Text style={[styles.statDelta, isLight && styles.statDeltaLight]}>
              +12%
            </Text>
          </View>
          <View style={[styles.statCard, isLight && styles.statCardLight]}>
            <Text style={[styles.statLabel, isLight && styles.statLabelLight]}>
              HEART
            </Text>
            <Text style={[styles.statValue, isLight && styles.statValueLight]}>
              62 bpm
            </Text>
            <Text style={[styles.statDelta, isLight && styles.statDeltaLight]}>
              Stable
            </Text>
          </View>
        </View>

        <Text
          style={[styles.sectionHeader, isLight && styles.sectionHeaderLight]}
        >
          PERSONAL RECORDS
        </Text>
        <TouchableOpacity
          style={[
            styles.profilePrTriggerCard,
            isLight && styles.profilePrTriggerCardLight,
          ]}
          activeOpacity={0.9}
          onPress={() => setIsPrSheetVisible(true)}
        >
          <View style={styles.profilePrTriggerTextCol}>
            <Text
              style={[
                styles.profilePrTriggerTitle,
                isLight && styles.profilePrTriggerTitleLight,
              ]}
            >
              View all PRs
            </Text>
            <Text
              style={[
                styles.profilePrTriggerSubtitle,
                isLight && styles.profilePrTriggerSubtitleLight,
              ]}
            >
              {exercisePrs.length === 0
                ? "No exercise records saved yet"
                : exercisePrs.length === 1
                  ? "1 exercise record saved"
                  : `${exercisePrs.length} exercise records saved`}
            </Text>
          </View>
          <Text style={styles.profilePrTriggerChevron}>⌃</Text>
        </TouchableOpacity>

        {/* Settings sections – simplified */}
        <Text
          style={[styles.sectionHeader, isLight && styles.sectionHeaderLight]}
        >
          TRAINING & PROGRESS
        </Text>
        <TouchableOpacity
          style={[styles.settingsCard, isLight && styles.settingsCardLight]}
          activeOpacity={0.9}
          onPress={() => {
            void reloadAllWorkoutHistory();
            setIsWorkoutHistorySheetVisible(true);
          }}
        >
          <Text
            style={[
              styles.settingsItemPrimary,
              isLight && styles.settingsItemPrimaryLight,
            ]}
          >
            Workout History
          </Text>
          <Text
            style={[
              styles.settingsItemSecondary,
              isLight && styles.settingsItemSecondaryLight,
            ]}
          >
            {allWorkoutHistoryLoading
              ? "Loading…"
              : allWorkoutHistoryError
                ? allWorkoutHistoryError
                : allWorkoutHistoryItems.length === 0
                  ? "No workouts logged yet"
                  : allWorkoutHistoryItems.length === 1
                    ? "1 workout logged"
                    : `${allWorkoutHistoryItems.length} workouts logged`}
          </Text>
        </TouchableOpacity>

        <Text
          style={[styles.sectionHeader, isLight && styles.sectionHeaderLight]}
        >
          SETTINGS & APP
        </Text>
        <View
          style={[styles.settingsCard, isLight && styles.settingsCardLight]}
        >
          <Text
            style={[
              styles.settingsItemPrimary,
              isLight && styles.settingsItemPrimaryLight,
            ]}
          >
            Notifications
          </Text>
          <Text
            style={[
              styles.settingsItemSecondary,
              isLight && styles.settingsItemSecondaryLight,
            ]}
          >
            Daily reminders & alerts
          </Text>
        </View>
        <View
          style={[styles.settingsCard, isLight && styles.settingsCardLight]}
        >
          <Text
            style={[
              styles.settingsItemPrimary,
              isLight && styles.settingsItemPrimaryLight,
            ]}
          >
            Privacy & Security
          </Text>
          <Text
            style={[
              styles.settingsItemSecondary,
              isLight && styles.settingsItemSecondaryLight,
            ]}
          >
            Data sharing & permissions
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, isLight && styles.logoutButtonLight]}
          onPress={signOut}
        >
          <Text style={[styles.logoutText, isLight && styles.logoutTextLight]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
      {/* All workouts history bottom sheet (cross-plan log) */}
      <Modal
        visible={isWorkoutHistorySheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsWorkoutHistorySheetVisible(false)}
      >
        <View style={styles.filterSheetRoot}>
          <TouchableOpacity
            style={styles.filterSheetBackdrop}
            activeOpacity={1}
            onPress={() => setIsWorkoutHistorySheetVisible(false)}
          />
          <View
            style={[
              styles.filterSheetContainer,
              styles.homeAllActiveSheetContainer,
              isLight && styles.filterSheetContainerLight,
            ]}
          >
            <View style={styles.filterSheetHandle} />
            <View style={styles.homeAllActiveHeaderRow}>
              <View style={styles.homeAllActiveHeaderTextCol}>
                <Text
                  style={[
                    styles.filterSheetTitle,
                    isLight && styles.filterSheetTitleLight,
                  ]}
                >
                  All workouts
                </Text>
                <Text
                  style={[
                    styles.filterSheetSubtitle,
                    isLight && styles.filterSheetSubtitleLight,
                  ]}
                >
                  Every workout you have completed in the app.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.homeAllActiveCloseButton}
                activeOpacity={0.8}
                onPress={() => setIsWorkoutHistorySheetVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isLight ? "#4B5563" : "#9CA3AF"}
                />
              </TouchableOpacity>
            </View>

            {allWorkoutHistoryError ? (
              <Text
                style={[
                  styles.metricCaption,
                  isLight && styles.metricCaptionLight,
                ]}
              >
                {allWorkoutHistoryError}
              </Text>
            ) : null}

            {allWorkoutHistoryLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={GLASS_ACCENT_GREEN} />
              </View>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.homeAllActiveListScroll}
            >
              {!allWorkoutHistoryLoading &&
              allWorkoutHistoryItems.length === 0 &&
              !allWorkoutHistoryError ? (
                <Text
                  style={[
                    styles.workoutHistoryEmptyText,
                    isLight && styles.workoutHistoryEmptyTextLight,
                  ]}
                >
                  No workouts logged yet.
                </Text>
              ) : (
                allWorkoutHistoryItems.map((item, index) => {
                  const dateLabel = item.completed_at ?? item.date;
                  return (
                    <View
                      key={`${item.date}-${item.title}-${index}`}
                      style={[
                        styles.workoutHistoryRow,
                        isLight && styles.workoutHistoryRowLight,
                      ]}
                    >
                      <View style={styles.workoutHistoryTextCol}>
                        <Text
                          style={[
                            styles.workoutHistoryTitle,
                            isLight && styles.workoutHistoryTitleLight,
                          ]}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            styles.workoutHistoryDate,
                            isLight && styles.workoutHistoryDateLight,
                          ]}
                        >
                          {dateLabel}
                        </Text>
                      </View>
                      <View style={styles.workoutHistoryStatusWrap}>
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={GLASS_ACCENT_GREEN}
                        />
                        <Text
                          style={[
                            styles.workoutHistoryStatusLabel,
                            styles.workoutHistoryStatusCompleted,
                          ]}
                        >
                          Completed
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isPrSheetVisible && exercisePrs.length > 0}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPrSheetVisible(false)}
      >
        <View style={styles.filterSheetRoot}>
          <TouchableOpacity
            style={styles.filterSheetBackdrop}
            activeOpacity={1}
            onPress={() => setIsPrSheetVisible(false)}
          />
          <View
            style={[
              styles.filterSheetContainer,
              isLight && styles.filterSheetContainerLight,
            ]}
          >
            <View style={styles.filterSheetHandle} />
            <View style={styles.homeAllActiveHeaderRow}>
              <View style={styles.homeAllActiveHeaderTextCol}>
                <Text
                  style={[
                    styles.filterSheetTitle,
                    isLight && styles.filterSheetTitleLight,
                  ]}
                >
                  Personal records
                </Text>
                <Text
                  style={[
                    styles.filterSheetSubtitle,
                    isLight && styles.filterSheetSubtitleLight,
                  ]}
                >
                  Exercise name, weight and sets for your best lifts.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.homeAllActiveCloseButton}
                activeOpacity={0.8}
                onPress={() => setIsPrSheetVisible(false)}
              >
                <Text style={styles.filterSheetFooterButtonText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.homeAllActiveListScroll}
              showsVerticalScrollIndicator={false}
            >
              {exercisePrs.map((pr) => (
                <View
                  key={pr.segmentId}
                  style={[
                    styles.profilePrCard,
                    isLight && styles.profilePrCardLight,
                  ]}
                >
                  <View style={styles.profilePrRow}>
                    <View style={styles.profilePrTextCol}>
                      <Text
                        style={[
                          styles.profilePrExercise,
                          isLight && styles.profilePrExerciseLight,
                        ]}
                      >
                        {pr.exerciseLabel}
                      </Text>
                      {pr.workoutTitle ? (
                        <Text
                          style={[
                            styles.profilePrWorkoutTitle,
                            isLight && styles.profilePrWorkoutTitleLight,
                          ]}
                        >
                          {pr.workoutTitle}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.profilePrBadgeRow}>
                      <View style={styles.profilePrBadge}>
                        <Text style={styles.profilePrBadgeLabel}>Weight</Text>
                        <Text style={styles.profilePrBadgeValue}>
                          {pr.prWeight}
                        </Text>
                      </View>
                      <View style={styles.profilePrBadge}>
                        <Text style={styles.profilePrBadgeLabel}>Sets</Text>
                        <Text style={styles.profilePrBadgeValue}>
                          {pr.prSets}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default AccountScreen;
