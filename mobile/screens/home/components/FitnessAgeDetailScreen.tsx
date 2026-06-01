import React from "react";
import { ScrollView, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useThemeMode, styles, type HomeStackParamList } from "../../../App";
import { AppHeader } from "../../../components/AppHeader";
import { useUserProfileBasic } from "../../../hooks/useUserProfileBasic";

type FitnessAgeDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "FitnessAgeDetail"
>;

const FitnessAgeDetailScreen: React.FC<FitnessAgeDetailScreenProps> = ({
  navigation,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const { profile } = useUserProfileBasic();
  const userName = profile?.profile.display_name || profile?.username || null;

  return (
    <ScrollView
      style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <AppHeader
        isLight={isLight}
        title="Fitness age"
        subtitle="How your training baseline is tracking"
        userName={userName}
        avatarUrl={profile?.profile.avatar_url}
        onBack={() => navigation.goBack()}
      />
      <Text
        style={[styles.sectionHeader, isLight && styles.sectionHeaderLight]}
      >
        Details
      </Text>
      <Text
        style={[
          styles.filterSheetSubtitle,
          isLight && styles.filterSheetSubtitleLight,
        ]}
      >
        Your fitness age starts from your profile or assessment baseline, then
        adjusts with recent logged activity. A submitted assessment gives this
        metric higher confidence than the registration estimate.
      </Text>
    </ScrollView>
  );
};

export default FitnessAgeDetailScreen;
