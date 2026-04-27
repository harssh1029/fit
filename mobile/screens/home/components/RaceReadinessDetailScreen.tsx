import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useThemeMode, styles, type HomeStackParamList } from "../../../App";

type RaceReadinessDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "RaceReadinessDetail"
>;

const RaceReadinessDetailScreen: React.FC<RaceReadinessDetailScreenProps> = ({
  navigation,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";

  return (
    <ScrollView
      style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={[styles.homeHeaderRow, isLight && styles.homeHeaderRowLight]}>
        <View>
          <Text
            style={[
              styles.homeGreetingLabel,
              isLight && styles.homeGreetingLabelLight,
            ]}
          >
            Race readiness
          </Text>
          <Text
            style={[
              styles.homeGreetingTitle,
              isLight && styles.homeGreetingTitleLight,
            ]}
          >
            Race readiness detail
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
        Your race readiness score combines plan progress, training consistency,
        and benchmark performance to show how prepared you are for race day.
      </Text>
    </ScrollView>
  );
};

export default RaceReadinessDetailScreen;
