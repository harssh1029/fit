import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE_URL } from "../../api/client";
import BodyMuscleFront, { MuscleName } from "../../BodyMuscleFront";
import BodyMuscleBack from "../../BodyMuscleBack";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { GLASS_ACCENT_GREEN } from "../../styles/theme";
import {
  EXERCISES_PAGE_SIZE,
  MUSCLE_FILTER_SECTIONS,
  buildExercisesUrl,
  getMuscleIdsForSelection,
  useThemeMode,
  HeaderAvatar,
  styles,
} from "../../App";
import type {
  Exercise,
  ExerciseListResponse,
  FilterSheetKey,
  LevelFilter,
  MechanicFilter,
  ForceFilter,
  MuscleGroupApi,
} from "../../App";

const CHEST_PRESS_IMAGE_UP = require("../../assets/chest/0.jpg");
const CHEST_PRESS_IMAGE_DOWN = require("../../assets/chest/1.jpg");

const ExerciseListScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [heroImageIndex, setHeroImageIndex] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupApi[]>([]);
  const [nextExercisesPageUrl, setNextExercisesPageUrl] = useState<
    string | null
  >(null);
  const [isLoadingMoreExercises, setIsLoadingMoreExercises] =
    useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bodySide, setBodySide] = useState<"front" | "back">("front");
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [frontSelection, setFrontSelection] = useState<MuscleName[]>([]);
  const [backSelection, setBackSelection] = useState<MuscleName[]>([]);
  const [activeFilterMuscleNames, setActiveFilterMuscleNames] = useState<
    MuscleName[] | null
  >(null);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeFilterSheet, setActiveFilterSheet] =
    useState<FilterSheetKey>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [mechanicFilter, setMechanicFilter] = useState<MechanicFilter>("all");
  const [forceFilter, setForceFilter] = useState<ForceFilter>("all");

  const { profile } = useUserProfileBasic();
  const exercisesUserName =
    profile?.profile.display_name || profile?.username || null;

  const selectedMuscles = useMemo(
    () =>
      Array.from(new Set<MuscleName>([...frontSelection, ...backSelection])),
    [frontSelection, backSelection],
  );
  const hasSelection = selectedMuscles.length > 0;

  useEffect(() => {
    // Debounce the raw search input so we don't trigger a network request on
    // every keystroke. The server-side filter will use this debounced value.
    const handle = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(handle);
  }, [searchQuery]);

  const selectedExerciseDetail = useMemo(() => {
    if (!selectedExercise) {
      return null;
    }

    const primaryMusclesLabel =
      selectedExercise.primary_muscles.length > 0
        ? selectedExercise.primary_muscles.join(", ")
        : null;

    const levelLabel = selectedExercise.level
      ? selectedExercise.level.charAt(0).toUpperCase() +
        selectedExercise.level.slice(1)
      : "";

    const equipmentLabel =
      selectedExercise.equipment && selectedExercise.equipment.length > 0
        ? selectedExercise.equipment[0]
        : null;

    const aboutText =
      selectedExercise.description ||
      "Strengthen the primary target muscles with controlled repetitions and focus on good technique.";

    const howToPerformSteps = [
      "Start with a light warm-up set and focus on your setup and alignment.",
      "Lower the weight under control, keeping a stable brace throughout the movement.",
      "Drive back to the start position without bouncing or rushing the reps.",
    ];

    const commonMistakes = [
      "Using more weight than you can control with solid technique.",
      "Letting posture or joint alignment collapse at the bottom of the rep.",
      "Relying on momentum instead of controlled, smooth repetitions.",
    ];

    return {
      primaryMusclesLabel,
      levelLabel,
      equipmentLabel,
      aboutText,
      howToPerformSteps,
      commonMistakes,
    };
  }, [selectedExercise]);

  // Initial load: fetch the first page of exercises and the full list of
  // muscle groups. This gives us the metadata we need for later filter
  // requests, while keeping the initial payload small via pagination.
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [exercisesResponse, musclesResponse] = await Promise.all([
          fetch(
            buildExercisesUrl(API_BASE_URL, {
              limit: EXERCISES_PAGE_SIZE,
            }),
          ),
          fetch(`${API_BASE_URL}/muscles/`),
        ]);

        if (!exercisesResponse.ok) {
          throw new Error(
            `Failed to load exercises (${exercisesResponse.status})`,
          );
        }

        if (!musclesResponse.ok) {
          throw new Error(`Failed to load muscles (${musclesResponse.status})`);
        }

        const exercisesJson =
          (await exercisesResponse.json()) as ExerciseListResponse;
        const musclesJson = await musclesResponse.json();

        // The muscles endpoint may be paginated ({ results: [...] }) or a raw list.
        let muscleList: MuscleGroupApi[] = [];
        if (Array.isArray(musclesJson)) {
          muscleList = musclesJson as MuscleGroupApi[];
        } else if (musclesJson && Array.isArray(musclesJson.results)) {
          muscleList = musclesJson.results as MuscleGroupApi[];
        }

        if (isMounted) {
          setExercises(exercisesJson.results ?? []);
          setNextExercisesPageUrl(exercisesJson.next ?? null);
          setMuscleGroups(muscleList);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  // When the list view is visible and the user changes filters or search,
  // ask the backend for a fresh, filtered page instead of filtering on the
  // client. This keeps memory usage low and makes image loading more
  // reliable for large exercise libraries.
  useEffect(() => {
    if (!showAllExercises) {
      return;
    }

    const filterMuscleNames = activeFilterMuscleNames ?? [];
    const hasMuscleFilter = filterMuscleNames.length > 0;
    const hasSearchFilter = debouncedSearchQuery.length > 0;

    // If we have a muscle filter but the muscle metadata hasn't loaded yet,
    // wait until it has so we can map labels to IDs correctly.
    if (hasMuscleFilter && muscleGroups.length === 0) {
      return;
    }

    let isMounted = true;

    const loadFiltered = async () => {
      try {
        setLoading(true);
        setError(null);

        const muscleIds =
          hasMuscleFilter && muscleGroups.length
            ? getMuscleIdsForSelection(filterMuscleNames, muscleGroups)
            : [];

        const exercisesUrl = buildExercisesUrl(API_BASE_URL, {
          limit: EXERCISES_PAGE_SIZE,
          muscleIds,
          // Let the backend handle text search over name/description.
          search: hasSearchFilter ? debouncedSearchQuery : undefined,
        });

        const response = await fetch(exercisesUrl);
        if (!response.ok) {
          throw new Error(`Failed to load exercises (${response.status})`);
        }
        const json = (await response.json()) as ExerciseListResponse;

        if (!isMounted) {
          return;
        }

        setExercises(json.results ?? []);
        setNextExercisesPageUrl(json.next ?? null);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadFiltered();

    return () => {
      isMounted = false;
    };
  }, [
    showAllExercises,
    activeFilterMuscleNames,
    debouncedSearchQuery,
    muscleGroups,
  ]);

  const handleViewExercisesPress = () => {
    if (!hasSelection) {
      return;
    }

    // When entering the list view from the body map, reset search & other filters
    setSearchQuery("");
    setLevelFilter("all");
    setMechanicFilter("all");
    setForceFilter("all");
    setActiveFilterSheet(null);
    setActiveFilterMuscleNames(selectedMuscles);
    setShowAllExercises(true);
  };

  const handleBackToBodyMap = () => {
    setShowAllExercises(false);
    setActiveFilterMuscleNames(null);
    setFrontSelection([]);
    setBackSelection([]);
    setSelectionResetKey((key) => key + 1);
    setSearchQuery("");
    setLevelFilter("all");
    setMechanicFilter("all");
    setForceFilter("all");
    setActiveFilterSheet(null);
  };

  const handleLoadMoreExercises = async () => {
    // If there's no next page from the server or we're already fetching,
    // do nothing.
    if (!nextExercisesPageUrl || isLoadingMoreExercises || loading) {
      return;
    }

    setIsLoadingMoreExercises(true);
    try {
      const response = await fetch(nextExercisesPageUrl);
      if (!response.ok) {
        // Treat pagination failures as non-fatal: keep the items we already
        // have and simply stop trying to load more.
        return;
      }
      const json = (await response.json()) as ExerciseListResponse;
      setExercises((prev: Exercise[]) => [...prev, ...(json.results ?? [])]);
      setNextExercisesPageUrl(json.next ?? null);
    } finally {
      setIsLoadingMoreExercises(false);
    }
  };

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setHeroImageIndex(0);
  };

  const handleCloseExerciseDetail = () => {
    setSelectedExercise(null);
  };

  const heroImages = [CHEST_PRESS_IMAGE_UP, CHEST_PRESS_IMAGE_DOWN];

  const heroPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 10,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -40) {
            setHeroImageIndex((prev) =>
              prev < heroImages.length - 1 ? prev + 1 : prev,
            );
          } else if (gestureState.dx > 40) {
            setHeroImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
          }
        },
      }),
    [],
  );

  const renderFilterSheetContent = () => {
    if (!activeFilterSheet) {
      return null;
    }

    if (activeFilterSheet === "level") {
      const options: { key: LevelFilter; label: string }[] = [
        { key: "all", label: "All levels" },
        { key: "beginner", label: "Beginner" },
        { key: "intermediate", label: "Intermediate" },
        { key: "advanced", label: "Advanced" },
      ];

      return (
        <>
          <Text
            style={[
              styles.filterSheetTitle,
              isLight && styles.filterSheetTitleLight,
            ]}
          >
            Select level
          </Text>
          <Text
            style={[
              styles.filterSheetSubtitle,
              isLight && styles.filterSheetSubtitleLight,
            ]}
          >
            Filter by beginner, intermediate, or advanced difficulty.
          </Text>
          {options.map((option) => {
            const isActive = levelFilter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.exerciseFilterRow,
                  isLight && styles.exerciseFilterRowLight,
                  isActive && styles.exerciseFilterRowActive,
                  isLight && isActive && styles.exerciseFilterRowActiveLight,
                ]}
                onPress={() => {
                  setLevelFilter(option.key);
                  setActiveFilterSheet(null);
                }}
              >
                <Text
                  style={[
                    styles.exerciseFilterLabel,
                    isLight && styles.exerciseFilterLabelLight,
                    isActive && styles.exerciseFilterLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
                {isActive && <Text style={styles.exerciseFilterCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    if (activeFilterSheet === "mechanic") {
      const options: { key: MechanicFilter; label: string }[] = [
        { key: "all", label: "All mechanics" },
        { key: "compound", label: "Compound" },
        { key: "isolation", label: "Isolation" },
      ];

      return (
        <>
          <Text
            style={[
              styles.filterSheetTitle,
              isLight && styles.filterSheetTitleLight,
            ]}
          >
            Select mechanic
          </Text>
          <Text
            style={[
              styles.filterSheetSubtitle,
              isLight && styles.filterSheetSubtitleLight,
            ]}
          >
            Filter by compound vs isolation exercises.
          </Text>
          {options.map((option) => {
            const isActive = mechanicFilter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.exerciseFilterRow,
                  isLight && styles.exerciseFilterRowLight,
                  isActive && styles.exerciseFilterRowActive,
                  isLight && isActive && styles.exerciseFilterRowActiveLight,
                ]}
                onPress={() => {
                  setMechanicFilter(option.key);
                  setActiveFilterSheet(null);
                }}
              >
                <Text
                  style={[
                    styles.exerciseFilterLabel,
                    isLight && styles.exerciseFilterLabelLight,
                    isActive && styles.exerciseFilterLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
                {isActive && <Text style={styles.exerciseFilterCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    if (activeFilterSheet === "force") {
      const options: { key: ForceFilter; label: string }[] = [
        { key: "all", label: "All" },
        { key: "push", label: "Push" },
        { key: "pull", label: "Pull" },
        { key: "hold", label: "Hold" },
      ];

      return (
        <>
          <Text
            style={[
              styles.filterSheetTitle,
              isLight && styles.filterSheetTitleLight,
            ]}
          >
            Select force
          </Text>
          <Text
            style={[
              styles.filterSheetSubtitle,
              isLight && styles.filterSheetSubtitleLight,
            ]}
          >
            Filter by push, pull, or hold.
          </Text>
          {options.map((option) => {
            const isActive = forceFilter === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.exerciseFilterRow,
                  isLight && styles.exerciseFilterRowLight,
                  isActive && styles.exerciseFilterRowActive,
                  isLight && isActive && styles.exerciseFilterRowActiveLight,
                ]}
                onPress={() => {
                  setForceFilter(option.key);
                  setActiveFilterSheet(null);
                }}
              >
                <Text
                  style={[
                    styles.exerciseFilterLabel,
                    isLight && styles.exerciseFilterLabelLight,
                    isActive && styles.exerciseFilterLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
                {isActive && <Text style={styles.exerciseFilterCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </>
      );
    }

    if (activeFilterSheet === "muscles") {
      const selectedSet = new Set(activeFilterMuscleNames ?? []);

      return (
        <>
          <Text
            style={[
              styles.filterSheetTitle,
              isLight && styles.filterSheetTitleLight,
            ]}
          >
            Select muscles
          </Text>
          <Text
            style={[
              styles.filterSheetSubtitle,
              isLight && styles.filterSheetSubtitleLight,
            ]}
          >
            Group by front/back and upper/lower body. Combine with Force for
            push / pull / hold.
          </Text>
          <ScrollView style={styles.filterSheetMuscleList}>
            {MUSCLE_FILTER_SECTIONS.map((section) => (
              <View key={section.id} style={styles.filterSheetMuscleCategory}>
                <Text
                  style={[
                    styles.filterSheetMuscleCategoryTitle,
                    isLight && styles.filterSheetMuscleCategoryTitleLight,
                  ]}
                >
                  {section.title}
                </Text>
                {section.muscles.map((muscle) => {
                  const isActive = selectedSet.has(muscle);
                  return (
                    <TouchableOpacity
                      key={muscle}
                      style={[
                        styles.exerciseFilterRow,
                        isLight && styles.exerciseFilterRowLight,
                        isActive && styles.exerciseFilterRowActive,
                        isLight &&
                          isActive &&
                          styles.exerciseFilterRowActiveLight,
                      ]}
                      onPress={() => {
                        setActiveFilterMuscleNames((prev) => {
                          const current = new Set(prev ?? []);
                          if (current.has(muscle)) {
                            current.delete(muscle);
                          } else {
                            current.add(muscle);
                          }
                          return Array.from(current);
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.exerciseFilterLabel,
                          isLight && styles.exerciseFilterLabelLight,
                          isActive && styles.exerciseFilterLabelActive,
                        ]}
                      >
                        {muscle}
                      </Text>
                      {isActive && (
                        <Text style={styles.exerciseFilterCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <View style={styles.filterSheetFooterRow}>
            <TouchableOpacity
              style={styles.filterSheetFooterButton}
              onPress={() => {
                setActiveFilterMuscleNames(null);
                setActiveFilterSheet(null);
              }}
            >
              <Text style={styles.filterSheetFooterButtonText}>
                Clear selection
              </Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return null;
  };

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
              {exercisesUserName ? `Hi ${exercisesUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Exercise library
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={exercisesUserName} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading exercises…</Text>
        </View>
      </View>
    );
  }

  if (error) {
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
              {exercisesUserName ? `Hi ${exercisesUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Exercise library
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={exercisesUserName} />
          </View>
        </View>
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          Exercises
        </Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (showAllExercises) {
    const exercisesAfterMechanicFilter =
      mechanicFilter === "all"
        ? exercises
        : exercises.filter((exercise) =>
            mechanicFilter === "compound"
              ? exercise.is_compound
              : !exercise.is_compound,
          );

    const exercisesAfterForceFilter =
      forceFilter === "all"
        ? exercisesAfterMechanicFilter
        : exercisesAfterMechanicFilter.filter((exercise) => {
            const pattern = (exercise.movement_pattern ?? "").toLowerCase();
            if (forceFilter === "push") {
              return pattern.includes("push") || pattern.includes("press");
            }
            if (forceFilter === "pull") {
              return (
                pattern.includes("pull") ||
                pattern.includes("row") ||
                pattern.includes("curl")
              );
            }
            if (forceFilter === "hold") {
              return (
                pattern.includes("hold") ||
                pattern.includes("carry") ||
                pattern.includes("carry")
              );
            }
            return true;
          });

    const exercisesAfterLevelFilter =
      levelFilter === "all"
        ? exercisesAfterForceFilter
        : exercisesAfterForceFilter.filter(
            (exercise) => exercise.level === levelFilter,
          );

    const finalExercises = exercisesAfterLevelFilter;

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
              {exercisesUserName ? `Hi ${exercisesUserName},` : "Hi,"}
            </Text>
            <Text
              style={[
                styles.homeGreetingTitle,
                isLight && styles.homeGreetingTitleLight,
              ]}
            >
              Exercise library
            </Text>
          </View>
          <View style={styles.homeHeaderRightRow}>
            <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
            <HeaderAvatar isLight={isLight} name={exercisesUserName} />
          </View>
        </View>
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          All exercises
        </Text>
        <View style={styles.exerciseSearchContainer}>
          <TextInput
            style={[
              styles.exerciseSearchInput,
              isLight && styles.exerciseSearchInputLight,
            ]}
            placeholder="Search exercises"
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
        <View style={styles.exerciseFilterChipRow}>
          {(
            [
              { key: "muscles", label: "Muscles" },
              { key: "level", label: "Level" },
              { key: "mechanic", label: "Mechanic" },
              { key: "force", label: "Force" },
            ] as const
          ).map((chip) => {
            const isActiveChip = (() => {
              if (chip.key === "muscles") {
                return (
                  (activeFilterMuscleNames?.length ?? 0) > 0 ||
                  activeFilterSheet === "muscles"
                );
              }

              if (chip.key === "mechanic") {
                return (
                  mechanicFilter !== "all" || activeFilterSheet === "mechanic"
                );
              }

              if (chip.key === "level") {
                return levelFilter !== "all" || activeFilterSheet === "level";
              }

              if (chip.key === "force") {
                return forceFilter !== "all" || activeFilterSheet === "force";
              }

              return false;
            })();
            return (
              <TouchableOpacity
                key={chip.key}
                style={[
                  styles.exerciseFilterChip,
                  isLight && styles.exerciseFilterChipLight,
                  isActiveChip && styles.exerciseFilterChipActive,
                ]}
                onPress={() => setActiveFilterSheet(chip.key)}
              >
                <Text
                  style={[
                    styles.exerciseFilterChipLabel,
                    isLight && styles.exerciseFilterChipLabelLight,
                  ]}
                >
                  {chip.label}
                </Text>
                <Text
                  style={[
                    styles.exerciseFilterChipCaret,
                    isLight && styles.exerciseFilterChipCaretLight,
                  ]}
                >
                  ▾
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Modal
          visible={activeFilterSheet !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveFilterSheet(null)}
        >
          <View style={styles.filterSheetRoot}>
            <TouchableOpacity
              style={styles.filterSheetBackdrop}
              activeOpacity={1}
              onPress={() => setActiveFilterSheet(null)}
            />
            <View
              style={[
                styles.filterSheetContainer,
                isLight && styles.filterSheetContainerLight,
              ]}
            >
              <View style={styles.filterSheetHandle} />
              {renderFilterSheetContent()}
            </View>
          </View>
        </Modal>
        <FlatList
          data={finalExercises}
          keyExtractor={(item) => item.id}
          style={{ alignSelf: "stretch" }}
          contentContainerStyle={{ paddingBottom: 24, paddingTop: 8 }}
          onEndReached={handleLoadMoreExercises}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMoreExercises ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator color={GLASS_ACCENT_GREEN} />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            // NOTE: We'll use a single local chest image for now on all cards
            // so the hero area is guaranteed to show something while we
            // finalize API-driven images per exercise.

            const primaryMusclesLabel =
              item.primary_muscles.length > 0
                ? item.primary_muscles.join(", ")
                : null;

            const tagLabel = primaryMusclesLabel
              ? primaryMusclesLabel
              : item.is_compound
                ? "Compound"
                : "Isolation";

            const levelLabel = item.level
              ? item.level.charAt(0).toUpperCase() + item.level.slice(1)
              : "";

            const equipmentLabel =
              item.equipment && item.equipment.length > 0
                ? item.equipment[0]
                : null;

            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleExercisePress(item)}
              >
                <View
                  style={[
                    styles.exerciseCard,
                    isLight && styles.exerciseCardLight,
                  ]}
                >
                  <View style={styles.exerciseImageStack}>
                    <Image
                      source={CHEST_PRESS_IMAGE_UP}
                      style={styles.exerciseImage}
                      resizeMode="contain"
                    />

                    {tagLabel && (
                      <View style={styles.exerciseTagPill}>
                        <Text style={styles.exerciseTagLabel}>
                          {tagLabel.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.exerciseCardBody}>
                    <Text
                      style={[
                        styles.exerciseCardTitle,
                        isLight
                          ? styles.exerciseCardTitleLight
                          : styles.exerciseCardTitleDark,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>

                    {(item.description || primaryMusclesLabel) && (
                      <Text
                        style={[
                          styles.exerciseCardDescription,
                          isLight
                            ? styles.exerciseCardDescriptionLight
                            : styles.exerciseCardDescriptionDark,
                        ]}
                        numberOfLines={2}
                      >
                        {item.description || primaryMusclesLabel}
                      </Text>
                    )}
                  </View>

                  <View style={styles.exerciseCardFooter}>
                    <View style={styles.exerciseMetaRow}>
                      {equipmentLabel && (
                        <View style={styles.exerciseMetaPill}>
                          <Ionicons
                            name="barbell-outline"
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
                            {equipmentLabel}
                          </Text>
                        </View>
                      )}

                      {levelLabel ? (
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
                            {levelLabel}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[
                        styles.exercisePlayButton,
                        isLight && styles.exercisePlayButtonLight,
                      ]}
                    >
                      <Ionicons name="play" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {!!selectedExercise && (
          <Modal
            visible
            transparent
            animationType="slide"
            onRequestClose={handleCloseExerciseDetail}
          >
            <View style={styles.exerciseDetailModalRoot}>
              <TouchableOpacity
                style={styles.exerciseDetailModalBackdrop}
                activeOpacity={1}
                onPress={handleCloseExerciseDetail}
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
                  <View
                    style={styles.exerciseDetailHero}
                    {...heroPanResponder.panHandlers}
                  >
                    <View style={styles.exerciseDetailHeroImageWrapper}>
                      <Image
                        source={heroImages[heroImageIndex]}
                        style={styles.exerciseDetailHeroImage}
                        resizeMode="contain"
                      />
                    </View>

                    {heroImages.length > 1 && (
                      <>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.exerciseDetailHeroArrow,
                            styles.exerciseDetailHeroArrowLeft,
                            heroImageIndex === 0 && { opacity: 0.35 },
                          ]}
                          onPress={() => {
                            if (heroImageIndex > 0) {
                              setHeroImageIndex(heroImageIndex - 1);
                            }
                          }}
                        >
                          <Ionicons
                            name="chevron-back"
                            size={18}
                            color="#E5E7EB"
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[
                            styles.exerciseDetailHeroArrow,
                            styles.exerciseDetailHeroArrowRight,
                            heroImageIndex === heroImages.length - 1 && {
                              opacity: 0.35,
                            },
                          ]}
                          onPress={() => {
                            if (heroImageIndex < heroImages.length - 1) {
                              setHeroImageIndex(heroImageIndex + 1);
                            }
                          }}
                        >
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#E5E7EB"
                          />
                        </TouchableOpacity>
                      </>
                    )}

                    {selectedExerciseDetail?.primaryMusclesLabel && (
                      <View style={styles.exerciseDetailHeroTagRow}>
                        <View style={styles.exerciseTagPill}>
                          <Text style={styles.exerciseTagLabel}>
                            {selectedExerciseDetail.primaryMusclesLabel.toUpperCase()}
                          </Text>
                        </View>
                        {selectedExerciseDetail.levelLabel ? (
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
                              {selectedExerciseDetail.levelLabel}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>

                  <View style={styles.exerciseDetailBody}>
                    {selectedExercise && (
                      <>
                        <Text
                          style={[
                            styles.exerciseCardTitle,
                            isLight
                              ? styles.exerciseCardTitleLight
                              : styles.exerciseCardTitleDark,
                          ]}
                        >
                          {selectedExercise.name}
                        </Text>

                        <View style={styles.exerciseDetailMetaRow}>
                          {selectedExerciseDetail?.equipmentLabel && (
                            <View style={styles.exerciseDetailMetaItem}>
                              <Text style={styles.exerciseDetailMetaLabel}>
                                Equipment
                              </Text>
                              <Text
                                style={[
                                  styles.exerciseDetailMetaValue,
                                  isLight
                                    ? styles.exerciseDetailMetaValueLight
                                    : styles.exerciseDetailMetaValueDark,
                                ]}
                              >
                                {selectedExerciseDetail.equipmentLabel}
                              </Text>
                            </View>
                          )}

                          {selectedExerciseDetail?.primaryMusclesLabel && (
                            <View style={styles.exerciseDetailMetaItem}>
                              <Text style={styles.exerciseDetailMetaLabel}>
                                Target
                              </Text>
                              <Text
                                style={[
                                  styles.exerciseDetailMetaValue,
                                  isLight
                                    ? styles.exerciseDetailMetaValueLight
                                    : styles.exerciseDetailMetaValueDark,
                                ]}
                              >
                                {selectedExerciseDetail.primaryMusclesLabel}
                              </Text>
                            </View>
                          )}
                        </View>

                        {selectedExerciseDetail?.aboutText && (
                          <View style={styles.exerciseDetailSection}>
                            <Text
                              style={[
                                styles.exerciseDetailSectionTitle,
                                isLight &&
                                  styles.exerciseDetailSectionTitleLight,
                              ]}
                            >
                              About this exercise
                            </Text>
                            <Text
                              style={[
                                styles.exerciseDetailSectionText,
                                isLight &&
                                  styles.exerciseDetailSectionTextLight,
                              ]}
                            >
                              {selectedExerciseDetail.aboutText}
                            </Text>
                          </View>
                        )}

                        {selectedExerciseDetail?.howToPerformSteps && (
                          <View style={styles.exerciseDetailSection}>
                            <Text
                              style={[
                                styles.exerciseDetailSectionTitle,
                                isLight &&
                                  styles.exerciseDetailSectionTitleLight,
                              ]}
                            >
                              How to perform
                            </Text>
                            {selectedExerciseDetail.howToPerformSteps.map(
                              (step, index) => (
                                <View
                                  key={index}
                                  style={styles.exerciseDetailBulletRow}
                                >
                                  <Text style={styles.exerciseDetailBulletDot}>
                                    •
                                  </Text>
                                  <Text
                                    style={[
                                      styles.exerciseDetailSectionText,
                                      isLight &&
                                        styles.exerciseDetailSectionTextLight,
                                    ]}
                                  >
                                    {step}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        )}

                        {selectedExerciseDetail?.commonMistakes && (
                          <View style={styles.exerciseDetailSection}>
                            <Text
                              style={[
                                styles.exerciseDetailSectionTitle,
                                isLight &&
                                  styles.exerciseDetailSectionTitleLight,
                              ]}
                            >
                              Common mistakes
                            </Text>
                            {selectedExerciseDetail.commonMistakes.map(
                              (mistake, index) => (
                                <View
                                  key={index}
                                  style={styles.exerciseDetailBulletRow}
                                >
                                  <Text style={styles.exerciseDetailBulletDot}>
                                    •
                                  </Text>
                                  <Text
                                    style={[
                                      styles.exerciseDetailSectionText,
                                      isLight &&
                                        styles.exerciseDetailSectionTextLight,
                                    ]}
                                  >
                                    {mistake}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[
                    styles.exerciseDetailCloseButton,
                    isLight && styles.exerciseDetailCloseButtonLight,
                  ]}
                  onPress={handleCloseExerciseDetail}
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
        )}

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isLight && styles.primaryButtonLight,
            { marginTop: 8 },
          ]}
          onPress={handleBackToBodyMap}
        >
          <Text style={styles.primaryButtonText}>Back to body map</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
            {exercisesUserName ? `Hi ${exercisesUserName},` : "Hi,"}
          </Text>
          <Text
            style={[
              styles.homeGreetingTitle,
              isLight && styles.homeGreetingTitleLight,
            ]}
          >
            Exercise library
          </Text>
        </View>
        <View style={styles.homeHeaderRightRow}>
          <ThemeToggle inHeader isLight={isLight} onToggle={toggle} />
          <HeaderAvatar isLight={isLight} name={exercisesUserName} />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.primaryButton, isLight && styles.primaryButtonLight]}
        onPress={() => {
          setActiveFilterMuscleNames(null);
          setSearchQuery("");
          setLevelFilter("all");
          setMechanicFilter("all");
          setForceFilter("all");
          setActiveFilterSheet(null);
          setShowAllExercises(true);
        }}
      >
        <Text style={styles.primaryButtonText}>All exercises</Text>
      </TouchableOpacity>
      <View
        style={[
          styles.premiumSideToggle,
          isLight && styles.premiumSideToggleLight,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.premiumSideButton,
            bodySide === "front" && styles.premiumSideButtonActive,
            isLight && styles.premiumSideButtonLight,
            isLight &&
              bodySide === "front" &&
              styles.premiumSideButtonActiveLight,
          ]}
          onPress={() => setBodySide("front")}
        >
          <Text
            style={[
              styles.premiumSideLabel,
              bodySide === "front" && styles.premiumSideLabelActive,
              isLight && styles.premiumSideLabelLight,
            ]}
          >
            Front
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.premiumSideButton,
            bodySide === "back" && styles.premiumSideButtonActive,
            isLight && styles.premiumSideButtonLight,
            isLight &&
              bodySide === "back" &&
              styles.premiumSideButtonActiveLight,
          ]}
          onPress={() => setBodySide("back")}
        >
          <Text
            style={[
              styles.premiumSideLabel,
              bodySide === "back" && styles.premiumSideLabelActive,
              isLight && styles.premiumSideLabelLight,
            ]}
          >
            Back
          </Text>
        </TouchableOpacity>
      </View>
      <View
        style={[
          styles.premium3dPreview,
          isLight && styles.premium3dPreviewLight,
        ]}
      >
        {bodySide === "front" ? (
          <BodyMuscleFront
            isLight={isLight}
            resetKey={selectionResetKey}
            onSelectionChange={(selection) =>
              setFrontSelection(selection.allActive)
            }
          />
        ) : (
          <BodyMuscleBack
            isLight={isLight}
            resetKey={selectionResetKey}
            onSelectionChange={(selection) =>
              setBackSelection(selection.allActive)
            }
          />
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.primaryButton,
          isLight && styles.primaryButtonLight,
          !hasSelection && styles.primaryButtonDisabled,
        ]}
        onPress={handleViewExercisesPress}
        disabled={!hasSelection}
      >
        <Text style={styles.primaryButtonText}>
          {hasSelection
            ? `View Exercises (${selectedMuscles.length})`
            : "View Exercises"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ExerciseListScreen;
