import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useThemeMode, styles, type HomeStackParamList } from "../../../App";

type FitnessAgeDetailScreenProps = NativeStackScreenProps<
  HomeStackParamList,
  "FitnessAgeDetail"
>;

const FitnessAgeDetailScreen: React.FC<FitnessAgeDetailScreenProps> = ({
  navigation,
}) => {
  const { mode } = useThemeMode();
  const isLight = mode === "light";

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
            Fitness age
          </Text>
          <Text
            style={[
              styles.homeGreetingTitle,
              isLight && styles.homeGreetingTitleLight,
            ]}
          >
            Fitness age detail
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
        Your fitness age compares your recent training volume and intensity
        against your chronological age to estimate how "young" your body is
        moving.
      </Text>
    </ScrollView>
  );
};

export default FitnessAgeDetailScreen;
