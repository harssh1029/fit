import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE_URL, GLASS_ACCENT_GREEN, styles } from "../App";
import type { Exercise, ExerciseListResponse } from "../App";
import { getBestExerciseMatch } from "../utils/exerciseLookup";

const FALLBACK_IMAGE_UP = require("../assets/chest/0.jpg");
const FALLBACK_IMAGE_DOWN = require("../assets/chest/1.jpg");

const shortenExerciseText = (value: string, maxWords = 14) => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length <= maxWords) {
    return cleaned;
  }
  return `${words.slice(0, maxWords).join(" ")}.`;
};

type ExerciseDetailSheetProps = {
  visible: boolean;
  isLight: boolean;
  initialExercise?: Exercise | null;
  exerciseId?: string | null;
  exerciseName?: string | null;
  onClose: () => void;
};

export const ExerciseDetailSheet: React.FC<ExerciseDetailSheetProps> = ({
  visible,
  isLight,
  initialExercise = null,
  exerciseId = null,
  exerciseName = null,
  onClose,
}) => {
  const [exercise, setExercise] = useState<Exercise | null>(initialExercise);
  const [loading, setLoading] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setExercise(null);
      setLoading(false);
      setMediaLoading(false);
      return;
    }

    let isMounted = true;

    const loadExercise = async () => {
      try {
        setLoading(true);
        if (initialExercise) {
          setExercise(initialExercise);
        }

        let idToFetch = exerciseId || initialExercise?.id || null;

        if (!idToFetch && exerciseName) {
          const searchUrl = `${API_BASE_URL}/exercises/?limit=8&search=${encodeURIComponent(
            exerciseName,
          )}`;
          const searchResponse = await fetch(searchUrl);
          if (searchResponse.ok) {
            const searchJson =
              (await searchResponse.json()) as ExerciseListResponse;
            const match = getBestExerciseMatch(
              exerciseName,
              searchJson.results,
            );
            idToFetch = match?.id ?? null;
            if (match && isMounted) {
              setExercise(match);
            }
          }
        }

        if (!idToFetch) {
          if (isMounted) {
            onClose();
          }
          return;
        }

        const detailResponse = await fetch(
          `${API_BASE_URL}/exercises/${idToFetch}/`,
        );
        if (!detailResponse.ok) {
          if (isMounted) {
            onClose();
          }
          return;
        }
        const detail = (await detailResponse.json()) as Exercise;
        if (isMounted) {
          setExercise(detail);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadExercise();

    return () => {
      isMounted = false;
    };
  }, [visible, exerciseId, exerciseName, initialExercise]);

  const detail = useMemo(() => {
    if (!exercise) return null;

    const primaryMusclesLabel =
      exercise.primary_muscles.length > 0
        ? exercise.primary_muscles.join(", ")
        : exercise.target || null;

    const levelLabel = exercise.level
      ? exercise.level.charAt(0).toUpperCase() + exercise.level.slice(1)
      : "";

    const equipmentLabel =
      exercise.equipment && exercise.equipment.length > 0
        ? exercise.equipment.join(", ")
        : null;

    const steps =
      exercise.instructions && exercise.instructions.length > 0
        ? exercise.instructions
        : [
            "Set up with stable posture and a controlled starting position.",
            "Move smoothly through the main range without rushing.",
            "Reset your position before starting the next rep.",
          ];

    const mistakes =
      exercise.common_mistakes && exercise.common_mistakes.length > 0
        ? exercise.common_mistakes
        : [
            "Using momentum instead of control.",
            "Letting posture or joint alignment drift.",
            "Adding load before the movement feels stable.",
          ];

    return {
      primaryMusclesLabel,
      levelLabel,
      equipmentLabel,
      steps: steps.slice(0, 4).map((step) => shortenExerciseText(step, 13)),
      mistakes: mistakes
        .slice(0, 3)
        .map((mistake) => shortenExerciseText(mistake, 11)),
      guideline: shortenExerciseText(
        exercise.guideline ||
          "Keep each rep controlled and stop the set when your form starts to break.",
        16,
      ),
    };
  }, [exercise]);

  const heroImages = useMemo(() => {
    const remote = exercise?.gif_url || exercise?.image_url || exercise?.thumbnail_url;
    return remote ? [{ uri: remote }] : [FALLBACK_IMAGE_UP, FALLBACK_IMAGE_DOWN];
  }, [exercise]);

  useEffect(() => {
    if (visible) {
      setMediaLoading(true);
    }
  }, [visible, heroImages]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.exerciseDetailModalRoot}>
        <TouchableOpacity
          style={styles.exerciseDetailModalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.exerciseDetailModalCard,
            isLight && styles.exerciseDetailModalCardLight,
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <View style={styles.exerciseDetailHero}>
              <View style={styles.exerciseDetailHeroImageWrapper}>
                <Image
                  source={heroImages[0]}
                  style={styles.exerciseDetailHeroImage}
                  resizeMode="contain"
                  onLoadStart={() => setMediaLoading(true)}
                  onLoadEnd={() => setMediaLoading(false)}
                  onError={() => setMediaLoading(false)}
                />
              </View>

              {(loading || mediaLoading) && (
                <View style={styles.exerciseDetailLoadingOverlay}>
                  <View style={styles.exerciseDetailLoadingPill}>
                    <ActivityIndicator color={GLASS_ACCENT_GREEN} />
                    <Text style={styles.exerciseDetailLoadingText}>
                      Loading demo
                    </Text>
                  </View>
                </View>
              )}

              {detail?.primaryMusclesLabel && (
                <View style={styles.exerciseDetailHeroTagRow}>
                  <View style={styles.exerciseTagPill}>
                    <Text style={styles.exerciseTagLabel} numberOfLines={1}>
                      {detail.primaryMusclesLabel.toUpperCase()}
                    </Text>
                  </View>
                  {detail.levelLabel ? (
                    <View style={styles.exerciseMetaPill}>
                      <Ionicons
                        name="flame-outline"
                        size={14}
                        color={isLight ? "#0F172A" : "#E5E7EB"}
                      />
                      <Text
                        style={[
                          styles.exerciseMetaPillLabel,
                          isLight
                            ? styles.exerciseMetaPillLabelLight
                            : styles.exerciseMetaPillLabelDark,
                        ]}
                      >
                        {detail.levelLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            <View style={styles.exerciseDetailBody}>
              <Text
                style={[
                  styles.exerciseCardTitle,
                  isLight
                    ? styles.exerciseCardTitleLight
                    : styles.exerciseCardTitleDark,
                ]}
                numberOfLines={2}
              >
                {exercise?.name || exerciseName || "Exercise"}
              </Text>

              <View style={styles.exerciseDetailMetaRow}>
                {detail?.equipmentLabel && (
                  <View style={styles.exerciseDetailMetaItem}>
                    <Text style={styles.exerciseDetailMetaLabel}>Equipment</Text>
                    <Text
                      style={[
                        styles.exerciseDetailMetaValue,
                        isLight
                          ? styles.exerciseDetailMetaValueLight
                          : styles.exerciseDetailMetaValueDark,
                      ]}
                      numberOfLines={2}
                    >
                      {detail.equipmentLabel}
                    </Text>
                  </View>
                )}

                {detail?.primaryMusclesLabel && (
                  <View style={styles.exerciseDetailMetaItem}>
                    <Text style={styles.exerciseDetailMetaLabel}>Target</Text>
                    <Text
                      style={[
                        styles.exerciseDetailMetaValue,
                        isLight
                          ? styles.exerciseDetailMetaValueLight
                          : styles.exerciseDetailMetaValueDark,
                      ]}
                      numberOfLines={2}
                    >
                      {detail.primaryMusclesLabel}
                    </Text>
                  </View>
                )}
              </View>

              {detail?.guideline && (
                <View
                  style={[
                    styles.exerciseDetailGuidelineBox,
                    isLight && styles.exerciseDetailGuidelineBoxLight,
                  ]}
                >
                  <View style={styles.exerciseDetailGuidelineIcon}>
                    <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                  </View>
                  <Text
                    style={[
                      styles.exerciseDetailGuidelineText,
                      isLight && styles.exerciseDetailGuidelineTextLight,
                    ]}
                  >
                    {detail.guideline}
                  </Text>
                </View>
              )}

              {detail?.steps && (
                <View style={styles.exerciseDetailSection}>
                  <Text
                    style={[
                      styles.exerciseDetailSectionTitle,
                      isLight && styles.exerciseDetailSectionTitleLight,
                    ]}
                  >
                    How to perform
                  </Text>
                  {detail.steps.map((step, index) => (
                    <View key={index} style={styles.exerciseDetailPointRow}>
                      <View style={styles.exerciseDetailPointBadge}>
                        <Text style={styles.exerciseDetailPointBadgeText}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.exerciseDetailPointText,
                          isLight && styles.exerciseDetailPointTextLight,
                        ]}
                      >
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {detail?.mistakes && (
                <View style={styles.exerciseDetailSection}>
                  <Text
                    style={[
                      styles.exerciseDetailSectionTitle,
                      isLight && styles.exerciseDetailSectionTitleLight,
                    ]}
                  >
                    Common mistakes
                  </Text>
                  {detail.mistakes.map((mistake, index) => (
                    <View key={index} style={styles.exerciseDetailPointRow}>
                      <View style={styles.exerciseDetailMistakeIcon}>
                        <Ionicons name="close" size={12} color="#DC2626" />
                      </View>
                      <Text
                        style={[
                          styles.exerciseDetailPointText,
                          isLight && styles.exerciseDetailPointTextLight,
                        ]}
                      >
                        {mistake}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.exerciseDetailCloseButton,
              isLight && styles.exerciseDetailCloseButtonLight,
            ]}
            onPress={onClose}
          >
            <Ionicons
              name="close"
              size={22}
              color={isLight ? "#0F172A" : "#E5E7EB"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ExerciseDetailSheet;
