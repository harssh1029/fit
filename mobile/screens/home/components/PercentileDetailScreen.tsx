import React from "react";
import { ScrollView, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useThemeMode, styles, type HomeStackParamList } from "../../../App";
import { useUserProfileBasic } from "../../../hooks/useUserProfileBasic";
import { useDashboardSummary } from "../../../hooks/useDashboardSummary";
import { PercentileCurve } from "../../../App";
import { AppHeader } from "../../../components/AppHeader";

type PercentileDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "PercentileDetail"
>;

const PercentileDetailScreen: React.FC<PercentileDetailScreenProps> = ({
  navigation,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";
  const { profile } = useUserProfileBasic();
  const userName = profile?.profile.display_name || profile?.username || null;
  const {
    summary,
    loading: metricsLoading,
    error: metricsError,
  } = useDashboardSummary();

  const percentile = summary?.metrics?.percentile_rank;
  const percentileValue =
    typeof percentile?.percentile === "number"
      ? `${Math.round(percentile.percentile)}th`
      : "—";

  let percentileLabel: string | null = null;
  if (metricsError) {
    percentileLabel = "Unable to load";
  } else if (typeof percentile?.percentile === "number") {
    const p = percentile.percentile;
    if (p >= 80) {
      const topShare = 100 - Math.round(p);
      percentileLabel = `Top ${Math.max(topShare, 1)}% of peers`;
    } else if (p >= 50) {
      percentileLabel = "Above average";
    } else if (p >= 30) {
      percentileLabel = "Around average";
    } else {
      percentileLabel = "Below average";
    }
  }

  const percentilePercent =
    typeof percentile?.percentile === "number"
      ? Math.round(percentile.percentile)
      : null;

  return (
    <ScrollView
      style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <AppHeader
        isLight={isLight}
        title="Fitter than"
        subtitle="Your percentile rank"
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
        Your percentile rank compares your profile or assessment baseline with
        recent logged activity. It is an estimate until you submit a full
        assessment, then it continues to move with your training.
      </Text>
    </ScrollView>
  );
};

export default PercentileDetailScreen;
