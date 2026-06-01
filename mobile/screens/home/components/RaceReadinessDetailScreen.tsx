import React from "react";
import { ScrollView, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useThemeMode, styles, type HomeStackParamList } from "../../../App";
import { AppHeader } from "../../../components/AppHeader";
import { useUserProfileBasic } from "../../../hooks/useUserProfileBasic";

type RaceReadinessDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "RaceReadinessDetail"
>;

const RaceReadinessDetailScreen: React.FC<RaceReadinessDetailScreenProps> = ({
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
        title="Race readiness"
        subtitle="Your plan progress and consistency"
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
        Your race readiness score combines plan progress, training consistency,
        and benchmark performance to show how prepared you are for race day.
      </Text>
    </ScrollView>
  );
};

export default RaceReadinessDetailScreen;
