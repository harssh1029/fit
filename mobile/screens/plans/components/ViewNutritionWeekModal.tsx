import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { styles, type ViewNutritionWeek } from "../../../App";

export type ViewNutritionWeekModalProps = {
  week: ViewNutritionWeek | null;
  isLight: boolean;
  onClose: () => void;
};

export const ViewNutritionWeekModal: React.FC<ViewNutritionWeekModalProps> = ({
  week,
  isLight,
  onClose,
}) => {
  if (!week) return null;

  return (
    <Modal
      visible={!!week}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.viewWorkoutModalRoot}>
        <TouchableOpacity
          style={styles.viewWorkoutModalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.viewWorkoutModalCard,
            isLight && styles.viewWorkoutModalCardLight,
          ]}
        >
          <TouchableOpacity
            style={[
              styles.viewWorkoutCloseButton,
              isLight && styles.viewWorkoutCloseButtonLight,
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close nutrition details"
          >
            <Ionicons
              name="close"
              size={22}
              color={isLight ? "#0F172A" : "#E5E7EB"}
            />
          </TouchableOpacity>
          <View style={styles.viewWorkoutHandle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.viewWorkoutScrollContent}
          >
            <Text
              style={[
                styles.viewWorkoutWeekLabel,
                isLight
                  ? styles.viewWorkoutWeekLabelLight
                  : styles.viewWorkoutWeekLabelDark,
              ]}
            >
              {week.label}
            </Text>

            {week.days.map((day, index) => (
              <View key={day.id}>
                <View style={styles.viewWorkoutDayRow}>
                  <View style={styles.viewWorkoutCardWrapper}>
                    <View
                      style={[
                        styles.viewWorkoutCard,
                        isLight
                          ? styles.viewWorkoutCardLight
                          : styles.viewWorkoutCardDark,
                      ]}
                    >
                      <View style={styles.viewWorkoutCardHeaderRow}>
                        <View
                          style={[
                            styles.viewWorkoutIconCircleRun,
                            styles.viewWorkoutIconCircleRest,
                          ]}
                        >
                          <Ionicons
                            name="restaurant-outline"
                            size={18}
                            color="#10B981"
                          />
                        </View>
                        <View style={styles.viewWorkoutHeaderTextBlock}>
                          <Text
                            style={[
                              styles.viewWorkoutDayName,
                              isLight && styles.viewWorkoutDayNameLight,
                            ]}
                          >
                            {day.weekdayLabel} <Text>{day.dateLabel}</Text>
                          </Text>
                          {day.title ? (
                            <Text
                              style={[
                                styles.viewWorkoutHeaderTitle,
                                isLight && styles.viewWorkoutHeaderTitleLight,
                              ]}
                            >
                              {day.title}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {day.description ? (
                        <Text
                          style={[
                            styles.viewWorkoutNotes,
                            isLight && styles.viewWorkoutNotesLight,
                          ]}
                        >
                          {day.description}
                        </Text>
                      ) : null}

                      {day.bullets && day.bullets.length > 0 && (
                        <View style={{ marginTop: 8 }}>
                          {day.bullets.map((bullet, i) => (
                            <Text
                              key={i}
                              style={[
                                styles.viewWorkoutNotes,
                                isLight && styles.viewWorkoutNotesLight,
                              ]}
                            >
                              • {bullet}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {index < week.days.length - 1 && (
                  <View style={styles.viewWorkoutDayDivider} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
