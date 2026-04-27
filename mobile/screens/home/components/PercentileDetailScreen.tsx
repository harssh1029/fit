import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useThemeMode, styles, type HomeStackParamList } from "../../../App";
import { useUserProfileBasic } from "../../../hooks/useUserProfileBasic";
import { useDashboardSummary } from "../../../hooks/useDashboardSummary";
import { PercentileCurve } from "../../../App";

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
      <View style={styles.homeHeaderRow}>
        <View>
          <Text
            style={[
              styles.homeGreetingLabel,
              isLight && styles.homeGreetingLabelLight,
            ]}
          >
            Fitter than
          </Text>
          <Text
            style={[
              styles.homeGreetingTitle,
              isLight && styles.homeGreetingTitleLight,
            ]}
          >
            Percentile rank
          </Text>
        </View>
        <View style={styles.homeHeaderRightRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 8 }}
          >
            <Ionicons
              name="close"
              size={24}
              color={isLight ? "#0F172A" : "#E5E7EB"}
            />
          </TouchableOpacity>
        </View>
      </View>

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
        Your percentile rank compares your overall performance to other athletes
        of similar age and gender using our internal dataset.
      </Text>
    </ScrollView>
  );
};

export default PercentileDetailScreen;
