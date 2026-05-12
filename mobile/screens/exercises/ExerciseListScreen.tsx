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
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { API_BASE_URL } from "../../api/client";
import BodyMuscleFront, { MuscleName } from "../../BodyMuscleFront";
import BodyMuscleBack from "../../BodyMuscleBack";
import { AppHeader } from "../../components/AppHeader";
import { ExerciseDetailSheet } from "../../components/ExerciseDetailSheet";
import { FilterChipRow } from "../../components/FilterChipRow";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { GLASS_ACCENT_GREEN, PS_BLUE } from "../../styles/theme";
import {
  EXERCISES_PAGE_SIZE,
  MUSCLE_FILTER_SECTIONS,
  buildExercisesUrl,
  getMuscleIdsForSelection,
  useThemeMode,
  styles,
} from "../../App";
import type {
  Exercise,
  ExerciseListResponse,
  FilterSheetKey,
  LevelFilter,
  MechanicFilter,
  ForceFilter,
  EquipmentFilter,
  MuscleGroupApi,
} from "../../App";

const EXERCISE_FILTER_CHIPS: {
  key: Exclude<FilterSheetKey, null>;
  label: string;
}[] = [
  { key: "muscles", label: "Muscles" },
  { key: "equipment", label: "Equipment" },
  { key: "level", label: "Level" },
  { key: "mechanic", label: "Mechanic" },
  { key: "force", label: "Force" },
];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const ExerciseListScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null,
  );
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupApi[]>([]);
  const [nextExercisesPageUrl, setNextExercisesPageUrl] = useState<
    string | null
  >(null);
  const [exerciseCount, setExerciseCount] = useState<number | null>(null);
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
  const [draftFilterMuscleNames, setDraftFilterMuscleNames] = useState<
    MuscleName[]
  >([]);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [mechanicFilter, setMechanicFilter] = useState<MechanicFilter>("all");
  const [forceFilter, setForceFilter] = useState<ForceFilter>("all");
  const [equipmentFilter, setEquipmentFilter] =
    useState<EquipmentFilter>("all");
  const [draftLevelFilter, setDraftLevelFilter] =
    useState<LevelFilter>("all");
  const [draftMechanicFilter, setDraftMechanicFilter] =
    useState<MechanicFilter>("all");
  const [draftForceFilter, setDraftForceFilter] = useState<ForceFilter>("all");
  const [draftEquipmentFilter, setDraftEquipmentFilter] =
    useState<EquipmentFilter>("all");
  const [activeAlphabetLetter, setActiveAlphabetLetter] = useState<
    string | null
  >(null);

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

  // Initial load only fetches muscle metadata for the body-map filters.
  // Exercise rows are fetched lazily when the list view opens.
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const musclesResponse = await fetch(`${API_BASE_URL}/muscles/`);

        if (!musclesResponse.ok) {
          throw new Error(`Failed to load muscles (${musclesResponse.status})`);
        }

        const musclesJson = await musclesResponse.json();

        // The muscles endpoint may be paginated ({ results: [...] }) or a raw list.
        let muscleList: MuscleGroupApi[] = [];
        if (Array.isArray(musclesJson)) {
          muscleList = musclesJson as MuscleGroupApi[];
        } else if (musclesJson && Array.isArray(musclesJson.results)) {
          muscleList = musclesJson.results as MuscleGroupApi[];
        }

        if (isMounted) {
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

    // Avoid firing a new network request on every tap while the Muscles
    // sheet is open. Let the user finish selecting, then refresh once when
    // the sheet closes.
    if (activeFilterSheet === "muscles") {
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
          level: levelFilter,
          mechanic: mechanicFilter,
          force: forceFilter,
          equipment: equipmentFilter,
          startsWith: activeAlphabetLetter,
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
        setExerciseCount(json.count ?? null);
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
    activeFilterSheet,
    levelFilter,
    mechanicFilter,
    forceFilter,
    equipmentFilter,
    activeAlphabetLetter,
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
    setEquipmentFilter("all");
    setActiveFilterSheet(null);
    setActiveFilterMuscleNames(selectedMuscles);
    setActiveAlphabetLetter(null);
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
    setEquipmentFilter("all");
    setActiveAlphabetLetter(null);
    setActiveFilterSheet(null);
  };

  const handleFilterChipPress = (
    chipKey: Exclude<FilterSheetKey, null>,
    _isActiveChip: boolean,
  ) => {
    if (chipKey === "muscles") {
      setDraftFilterMuscleNames(activeFilterMuscleNames ?? []);
      setActiveFilterSheet("muscles");
      return;
    }

    if (chipKey === "level") {
      setDraftLevelFilter(levelFilter);
    } else if (chipKey === "mechanic") {
      setDraftMechanicFilter(mechanicFilter);
    } else if (chipKey === "force") {
      setDraftForceFilter(forceFilter);
    } else if (chipKey === "equipment") {
      setDraftEquipmentFilter(equipmentFilter);
    }
    setActiveFilterSheet(chipKey);
  };

  const handleCloseFilterSheet = () => {
    setActiveFilterSheet(null);
  };

  const handleApplySingleFilter = () => {
    setLevelFilter(draftLevelFilter);
    setMechanicFilter(draftMechanicFilter);
    setForceFilter(draftForceFilter);
    setEquipmentFilter(draftEquipmentFilter);
    setActiveAlphabetLetter(null);
    setActiveFilterSheet(null);
  };

  const handleApplyMuscleFilter = () => {
    setActiveFilterMuscleNames(
      draftFilterMuscleNames.length > 0 ? draftFilterMuscleNames : null,
    );
    setActiveAlphabetLetter(null);
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
      setExerciseCount(json.count ?? null);
    } finally {
      setIsLoadingMoreExercises(false);
    }
  };

  const handleExercisePress = (exercise: Exercise) => {
    setSelectedExercise(exercise);
  };

  const handleCloseExerciseDetail = () => {
    setSelectedExercise(null);
  };

  const renderSingleSelectFilterSheet = <T extends string,>({
    title,
    subtitle,
    options,
    value,
    onSelect,
  }: {
    title: string;
    subtitle: string;
    options: { key: T; label: string }[];
    value: T;
    onSelect: (value: T) => void;
  }) => (
    <>
      <Text
        style={[
          styles.filterSheetTitle,
          isLight && styles.filterSheetTitleLight,
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.filterSheetSubtitle,
          isLight && styles.filterSheetSubtitleLight,
        ]}
      >
        {subtitle}
      </Text>
      {options.map((option) => {
        const isActive = value === option.key;
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
              onSelect(option.key);
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
      <View style={styles.filterSheetFooterRow}>
        <TouchableOpacity
          style={styles.filterSheetFooterButton}
          onPress={() => onSelect("all" as T)}
        >
          <Text style={styles.filterSheetFooterButtonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterSheetFooterButton,
            styles.filterSheetFooterButtonPrimary,
          ]}
          onPress={handleApplySingleFilter}
        >
          <Text style={styles.filterSheetFooterButtonTextPrimary}>Apply</Text>
        </TouchableOpacity>
      </View>
    </>
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

      return renderSingleSelectFilterSheet({
        title: "Select level",
        subtitle: "Filter by beginner, intermediate, or advanced difficulty.",
        options,
        value: draftLevelFilter,
        onSelect: setDraftLevelFilter,
      });
    }

    if (activeFilterSheet === "mechanic") {
      const options: { key: MechanicFilter; label: string }[] = [
        { key: "all", label: "All mechanics" },
        { key: "compound", label: "Compound" },
        { key: "isolation", label: "Isolation" },
      ];

      return renderSingleSelectFilterSheet({
        title: "Select mechanic",
        subtitle: "Filter by compound vs isolation exercises.",
        options,
        value: draftMechanicFilter,
        onSelect: setDraftMechanicFilter,
      });
    }

    if (activeFilterSheet === "force") {
      const options: { key: ForceFilter; label: string }[] = [
        { key: "all", label: "All" },
        { key: "push", label: "Push" },
        { key: "pull", label: "Pull" },
        { key: "hold", label: "Hold" },
      ];

      return renderSingleSelectFilterSheet({
        title: "Select force",
        subtitle: "Filter by push, pull, or hold.",
        options,
        value: draftForceFilter,
        onSelect: setDraftForceFilter,
      });
    }

    if (activeFilterSheet === "equipment") {
      const options: { key: EquipmentFilter; label: string }[] = [
        { key: "all", label: "All equipment" },
        { key: "bodyweight", label: "Bodyweight" },
        { key: "barbell", label: "Barbell" },
        { key: "dumbbell", label: "Dumbbell" },
        { key: "cable", label: "Cable" },
        { key: "machine", label: "Machine" },
        { key: "resistance band", label: "Band" },
        { key: "kettlebell", label: "Kettlebell" },
      ];

      return renderSingleSelectFilterSheet({
        title: "Select equipment",
        subtitle: "Filter by the main equipment used for the movement.",
        options,
        value: draftEquipmentFilter,
        onSelect: setDraftEquipmentFilter,
      });
    }

    if (activeFilterSheet === "muscles") {
      const selectedSet = new Set(draftFilterMuscleNames);

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
                        setDraftFilterMuscleNames((prev) => {
                          const current = new Set(prev);
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
                setDraftFilterMuscleNames([]);
              }}
            >
              <Text style={styles.filterSheetFooterButtonText}>
                Clear selection
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterSheetFooterButton,
                styles.filterSheetFooterButtonPrimary,
              ]}
              onPress={handleApplyMuscleFilter}
            >
              <Text style={styles.filterSheetFooterButtonTextPrimary}>
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    return null;
  };

  if (loading && exercises.length === 0) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Exercise library"
          userName={exercisesUserName}
          onThemeToggle={toggle}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={GLASS_ACCENT_GREEN} />
          <Text style={styles.loadingText}>Loading exercises…</Text>
        </View>
      </View>
    );
  }

  if (error && exercises.length === 0) {
    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Exercise library"
          userName={exercisesUserName}
          onThemeToggle={toggle}
        />
        <Text style={[styles.screenTitle, isLight && styles.screenTitleLight]}>
          Exercises
        </Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (showAllExercises) {
    const finalExercises = exercises;

    return (
      <View
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
      >
        <AppHeader
          isLight={isLight}
          title="Exercise library"
          userName={exercisesUserName}
          onThemeToggle={toggle}
        />
        <View style={styles.exerciseListTitleRow}>
          <Text
            style={[styles.screenTitle, isLight && styles.screenTitleLight]}
          >
            All exercises
          </Text>
          <TouchableOpacity
            style={[
              styles.exerciseBodyMapButton,
              isLight && styles.exerciseBodyMapButtonLight,
            ]}
            activeOpacity={0.9}
            onPress={handleBackToBodyMap}
          >
            <Ionicons
              name="body-outline"
              size={14}
              color={isLight ? "#0070cc" : "#7DD3FC"}
            />
            <Text
              style={[
                styles.exerciseBodyMapButtonLabel,
                isLight && styles.exerciseBodyMapButtonLabelLight,
              ]}
            >
              Body map
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.exerciseSearchContainer}>
          <TextInput
            style={[
              styles.exerciseSearchInput,
              isLight && styles.exerciseSearchInputLight,
            ]}
            placeholder="Search exercises"
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={(value) => {
              setSearchQuery(value);
              setActiveAlphabetLetter(null);
            }}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>
        <FilterChipRow
          items={EXERCISE_FILTER_CHIPS}
          isLight={isLight}
          isActive={(chip) => {
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

            if (chip.key === "equipment") {
              return (
                equipmentFilter !== "all" || activeFilterSheet === "equipment"
              );
            }

            return false;
          }}
          onPress={(chip, isActiveChip) =>
            handleFilterChipPress(chip.key, isActiveChip)
          }
          getSuffix={(_, isActiveChip) => (isActiveChip ? "✓" : "▾")}
        />
        <Modal
          visible={activeFilterSheet !== null}
          transparent
          animationType="slide"
          onRequestClose={handleCloseFilterSheet}
        >
          <View style={styles.filterSheetRoot}>
            <TouchableOpacity
              style={styles.filterSheetBackdrop}
              activeOpacity={1}
              onPress={handleCloseFilterSheet}
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
        <View style={exerciseStyles.resultMetaRow}>
          <Text
            style={[
              exerciseStyles.resultMetaText,
              isLight && exerciseStyles.resultMetaTextLight,
            ]}
          >
            {exerciseCount == null
              ? `${finalExercises.length} exercises`
              : loading
                ? "Refreshing..."
                : `${finalExercises.length} of ${exerciseCount} loaded`}
          </Text>
          <Text
            style={[
              exerciseStyles.resultMetaText,
              isLight && exerciseStyles.resultMetaTextLight,
            ]}
          >
            {activeAlphabetLetter ? `Letter ${activeAlphabetLetter}` : "A-Z"}
          </Text>
        </View>
        <View style={exerciseStyles.listShell}>
          <FlatList
            data={finalExercises}
            keyExtractor={(item) => item.id}
            style={{ alignSelf: "stretch" }}
            contentContainerStyle={{
              paddingBottom: 24,
              paddingTop: 4,
              paddingRight: 34,
            }}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={80}
            windowSize={4}
            removeClippedSubviews
            onEndReached={handleLoadMoreExercises}
            onEndReachedThreshold={0.35}
            ListFooterComponent={
              isLoadingMoreExercises ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator color={GLASS_ACCENT_GREEN} />
                </View>
              ) : null
            }
            renderItem={({ item, index }) => (
              <ExerciseListRow
                item={item}
                previousItem={index > 0 ? finalExercises[index - 1] : null}
                isLight={isLight}
                onPress={() => handleExercisePress(item)}
              />
            )}
          />
          <View style={exerciseStyles.alphabetRail}>
            {ALPHABET.map((letter) => {
              const isActive = activeAlphabetLetter === letter;
              return (
                <TouchableOpacity
                  key={letter}
                  activeOpacity={0.8}
                  onPress={() => {
                    setActiveAlphabetLetter((current) =>
                      current === letter ? null : letter,
                    );
                  }}
                  style={[
                    exerciseStyles.alphabetButton,
                    isActive && exerciseStyles.alphabetButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      exerciseStyles.alphabetText,
                      isLight && exerciseStyles.alphabetTextLight,
                      isActive && exerciseStyles.alphabetTextActive,
                    ]}
                  >
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <ExerciseDetailSheet
          visible={!!selectedExercise}
          isLight={isLight}
          initialExercise={selectedExercise}
          onClose={handleCloseExerciseDetail}
        />

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
      <AppHeader
        isLight={isLight}
        title="Exercise library"
        userName={exercisesUserName}
        onThemeToggle={toggle}
      />
      <TouchableOpacity
        style={[styles.primaryButton, isLight && styles.primaryButtonLight]}
        onPress={() => {
          setActiveFilterMuscleNames(null);
          setSearchQuery("");
          setLevelFilter("all");
          setMechanicFilter("all");
          setForceFilter("all");
          setEquipmentFilter("all");
          setActiveAlphabetLetter(null);
          setActiveFilterSheet(null);
          setShowAllExercises(true);
        }}
      >
        <Text style={styles.primaryButtonText}>All exercises</Text>
      </TouchableOpacity>
      {hasSelection && (
        <TouchableOpacity
          style={[
            styles.bodyMapSelectionFilter,
            isLight && styles.bodyMapSelectionFilterLight,
          ]}
          activeOpacity={0.9}
          onPress={handleViewExercisesPress}
        >
          <View style={styles.bodyMapSelectionFilterTextCol}>
            <Text
              style={[
                styles.bodyMapSelectionFilterLabel,
                isLight && styles.bodyMapSelectionFilterLabelLight,
              ]}
            >
              Body map filter
            </Text>
            <Text
              style={[
                styles.bodyMapSelectionFilterValue,
                isLight && styles.bodyMapSelectionFilterValueLight,
              ]}
              numberOfLines={1}
            >
              {selectedMuscles.join(", ")}
            </Text>
          </View>
          <View style={styles.bodyMapSelectionFilterButton}>
            <Text style={styles.bodyMapSelectionFilterButtonText}>Apply</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}
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
              isLight && styles.premiumSideLabelLight,
              bodySide === "front" && styles.premiumSideLabelActive,
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
              isLight && styles.premiumSideLabelLight,
              bodySide === "back" && styles.premiumSideLabelActive,
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

const firstLetterForExercise = (exercise: Exercise) => {
  const first = exercise.name.trim().charAt(0).toUpperCase();
  return first && /[A-Z]/.test(first) ? first : "#";
};

const formatExerciseMeta = (exercise: Exercise) => {
  const muscles = exercise.primary_muscles.length
    ? exercise.primary_muscles.join(", ")
    : exercise.target || exercise.body_part || "";
  const equipment =
    exercise.equipment && exercise.equipment.length > 0
      ? exercise.equipment[0]
      : null;
  return [muscles, equipment].filter(Boolean).join(" · ");
};

const ExerciseListRow: React.FC<{
  item: Exercise;
  previousItem: Exercise | null;
  isLight: boolean;
  onPress: () => void;
}> = ({ item, previousItem, isLight, onPress }) => {
  const letter = firstLetterForExercise(item);
  const previousLetter = previousItem ? firstLetterForExercise(previousItem) : null;
  const showHeader = letter !== previousLetter;
  const thumbnailUrl = item.thumbnail_url || item.image_url || "";
  const [thumbLoading, setThumbLoading] = useState(!!thumbnailUrl);

  useEffect(() => {
    setThumbLoading(!!thumbnailUrl);
  }, [thumbnailUrl]);

  return (
    <View>
      {showHeader && (
        <Text
          style={[
            exerciseStyles.letterHeader,
            isLight && exerciseStyles.letterHeaderLight,
          ]}
        >
          {letter}
        </Text>
      )}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[
          exerciseStyles.compactCard,
          isLight && exerciseStyles.compactCardLight,
        ]}
      >
        <View
          style={[
            exerciseStyles.thumbWrap,
            isLight && exerciseStyles.thumbWrapLight,
          ]}
        >
          {thumbnailUrl ? (
            <>
              <Image
                key={thumbnailUrl}
                source={{ uri: thumbnailUrl }}
                style={exerciseStyles.thumbImage}
                resizeMode="contain"
                onLoadStart={() => setThumbLoading(true)}
                onLoadEnd={() => setThumbLoading(false)}
                onError={() => setThumbLoading(false)}
              />
              <View pointerEvents="none" style={exerciseStyles.thumbGloss} />
              {thumbLoading ? (
                <View style={exerciseStyles.thumbLoadingOverlay}>
                  <ActivityIndicator size="small" color={GLASS_ACCENT_GREEN} />
                </View>
              ) : null}
            </>
          ) : (
            <Ionicons
              name="fitness-outline"
              size={28}
              color={isLight ? "#64748B" : "#94A3B8"}
            />
          )}
          {item.has_demo ? (
            <View style={exerciseStyles.demoBadge}>
              <Ionicons name="play" size={10} color="#FFFFFF" />
            </View>
          ) : null}
        </View>
        <View style={exerciseStyles.compactTextBlock}>
          <Text
            style={[
              exerciseStyles.compactTitle,
              isLight && exerciseStyles.compactTitleLight,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text
            style={[
              exerciseStyles.compactMeta,
              isLight && exerciseStyles.compactMetaLight,
            ]}
            numberOfLines={1}
          >
            {formatExerciseMeta(item) || "Exercise guide"}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isLight ? "#64748B" : "#94A3B8"}
        />
      </TouchableOpacity>
    </View>
  );
};

const exerciseStyles = StyleSheet.create({
  resultMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 4,
    paddingRight: 34,
  },
  resultMetaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
  },
  resultMetaTextLight: {
    color: "#64748B",
  },
  listShell: {
    flex: 1,
    alignSelf: "stretch",
    position: "relative",
  },
  letterHeader: {
    marginTop: 8,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  letterHeaderLight: {
    color: "#0F172A",
  },
  compactCard: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#111827",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  compactCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    shadowColor: "#111827",
    shadowOpacity: 0.06,
  },
  thumbWrap: {
    width: 82,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRightWidth: 1,
    borderRightColor: "rgba(148,163,184,0.14)",
  },
  thumbWrapLight: {
    backgroundColor: "#FFFFFF",
    borderRightColor: "#E2E8F0",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "42%",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  thumbLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.18)",
  },
  demoBadge: {
    position: "absolute",
    right: 7,
    bottom: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
  },
  compactTextBlock: {
    flex: 1,
    paddingHorizontal: 14,
    minWidth: 0,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#F8FAFC",
  },
  compactTitleLight: {
    color: "#0F172A",
  },
  compactMeta: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  compactMetaLight: {
    color: "#64748B",
  },
  alphabetRail: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 20,
    width: 24,
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  alphabetButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  alphabetButtonActive: {
    backgroundColor: PS_BLUE,
  },
  alphabetText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748B",
  },
  alphabetTextLight: {
    color: "#64748B",
  },
  alphabetTextActive: {
    color: "#FFFFFF",
  },
  detailLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.32)",
  },
});

export default ExerciseListScreen;
