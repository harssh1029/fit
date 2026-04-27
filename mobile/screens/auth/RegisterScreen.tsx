import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutAnimation,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AuthStackParamList } from "../../App";
import { useAuth, useThemeMode } from "../../App";
import { ThemeToggle } from "../../components/ThemeToggle";
import { authStyles } from "./authStyles";

if (
  Platform.OS === "android" &&
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  (UIManager as any).setLayoutAnimationEnabledExperimental
) {
  (UIManager as any).setLayoutAnimationEnabledExperimental(true);
}

type RegisterScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  "Register"
>;

type Gender = "male" | "female" | "other";
type FitnessGoal =
  | "weight_loss"
  | "muscle_gain"
  | "endurance"
  | "longevity"
  | "strength_gain"
  | "flexibility_mobility"
  | "maintain_shape"
  | "recovery";
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

type RegisterFormState = {
  username: string;
  email: string;
  password: string;
  gender: Gender | null;
  age: number;
  heightCm: number;
  weightKg: number;
  goals: FitnessGoal[];
};

const NUMBER_PICKER_ITEM_HEIGHT = 64;
const NUMBER_PICKER_FRAME_HEIGHT = 280; // keep in sync with authStyles.numberPickerFrame.height

const STEP_TRANSITION_ANIMATION = {
  duration: 240,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    springDamping: 0.85,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
} as const;

type NumberPickerProps = {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  isLight: boolean;
  unit?: string;
  showUnitToggle?: boolean;
  unitOptions?: [string, string];
  selectedUnit?: string;
  onUnitChange?: (unit: string) => void;
};

const NumberPicker: React.FC<NumberPickerProps> = ({
  label,
  min,
  max,
  value,
  onChange,
  isLight,
  unit,
  showUnitToggle = false,
  unitOptions,
  selectedUnit,
  onUnitChange,
}) => {
  const items = useMemo(
    () => Array.from({ length: max - min + 1 }, (_, index) => min + index),
    [min, max],
  );

  const initialIndex = useMemo(() => {
    const idx = items.indexOf(value);
    return idx === -1 ? 0 : idx;
  }, [items, value]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const scrollRef = useRef<ScrollView | null>(null);
  const lastScrollHapticIndexRef = useRef<number | null>(null);
  const lastCommittedValueRef = useRef<number | null>(null);

  const applyCanonicalValue = (newValue: number) => {
    if (newValue !== value) {
      onChange(newValue);
    }
  };

  // Keep active index and scroll position in sync if the parent changes
  // the value externally (e.g., when re-entering the screen or going back).
  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx !== -1 && idx !== activeIndex) {
      setActiveIndex(idx);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          y: idx * NUMBER_PICKER_ITEM_HEIGHT,
          animated: false,
        });
      }
    }
  }, [items, value, activeIndex]);
  // Lightweight visual update on scroll for smooth scaling/opacity.
  const updateVisualIndexFromOffset = (yOffset: number) => {
    const index = Math.round(yOffset / NUMBER_PICKER_ITEM_HEIGHT);
    const clampedIndex = Math.min(items.length - 1, Math.max(0, index));

    if (clampedIndex === activeIndex) return;

    setActiveIndex(clampedIndex);

    // Haptic feedback once per integer change while scrolling
    if (lastScrollHapticIndexRef.current !== clampedIndex) {
      lastScrollHapticIndexRef.current = clampedIndex;
      Haptics.selectionAsync().catch(() => {
        // ignore haptic errors (e.g., unsupported platform)
      });
    }
  };

  // Commit the final snapped value once scrolling has settled.
  const commitSelectionFromOffset = (yOffset: number) => {
    const index = Math.round(yOffset / NUMBER_PICKER_ITEM_HEIGHT);
    const clampedIndex = Math.min(items.length - 1, Math.max(0, index));

    const selectedValue = items[clampedIndex];

    // If the snapped value is already selected, just ensure the
    // visual index matches and exit without triggering another update.
    if (selectedValue === value) {
      if (activeIndex !== clampedIndex) {
        setActiveIndex(clampedIndex);
      }
      return;
    }

    setActiveIndex(clampedIndex);
    applyCanonicalValue(selectedValue);

    // Distinct haptic for final snapped selection.
    if (lastCommittedValueRef.current !== selectedValue) {
      lastCommittedValueRef.current = selectedValue;
      Haptics.selectionAsync().catch(() => {
        // best-effort haptics; ignore errors
      });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    updateVisualIndexFromOffset(yOffset);
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    commitSelectionFromOffset(yOffset);
  };
  // Default single-column layout
  return (
    <View style={authStyles.numberPickerContainer}>
      <Text
        style={[
          authStyles.numberPickerLabel,
          isLight && authStyles.numberPickerLabelLight,
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          authStyles.numberPickerFrame,
          !isLight && authStyles.numberPickerFrameDark,
        ]}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={NUMBER_PICKER_ITEM_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumEnd}
          contentContainerStyle={{
            // Center the active item vertically between the two selection lines
            paddingVertical:
              (NUMBER_PICKER_FRAME_HEIGHT - NUMBER_PICKER_ITEM_HEIGHT) / 2,
          }}
          scrollEventThrottle={16}
          nestedScrollEnabled
        >
          {items.map((item, index) => {
            const distance =
              activeIndex === -1
                ? Number.POSITIVE_INFINITY
                : Math.abs(index - activeIndex);
            const isActive = distance === 0;
            const isNear = distance === 1;
            const isFar = distance >= 2;

            return (
              <View
                key={item}
                style={{
                  height: NUMBER_PICKER_ITEM_HEIGHT,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {isActive ? (
                  <View style={authStyles.numberPickerActiveContainer}>
                    <Text
                      style={[
                        authStyles.numberPickerItemActive,
                        isLight
                          ? authStyles.numberPickerItemActiveLight
                          : authStyles.numberPickerItemActiveDark,
                      ]}
                    >
                      {item}
                    </Text>
                    {unit && !showUnitToggle && (
                      <Text
                        style={[
                          authStyles.numberPickerUnit,
                          isLight
                            ? authStyles.numberPickerUnitLight
                            : authStyles.numberPickerUnitDark,
                        ]}
                      >
                        {unit}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text
                    style={[
                      authStyles.numberPickerItem,
                      isLight
                        ? authStyles.numberPickerItemLight
                        : authStyles.numberPickerItemDark,
                      isNear && authStyles.numberPickerItemNear,
                      isFar && authStyles.numberPickerItemFar,
                    ]}
                  >
                    {item}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
        <View
          style={[
            authStyles.numberPickerSelectionLine,
            authStyles.numberPickerSelectionLineTop,
            !isLight && authStyles.numberPickerSelectionLineDark,
          ]}
          pointerEvents="none"
        />
        <View
          style={[
            authStyles.numberPickerSelectionLine,
            authStyles.numberPickerSelectionLineBottom,
            !isLight && authStyles.numberPickerSelectionLineDark,
          ]}
          pointerEvents="none"
        />
      </View>
      {showUnitToggle && unitOptions && selectedUnit && onUnitChange && (
        <View
          style={[
            authStyles.unitToggleContainer,
            isLight && authStyles.unitToggleContainerLight,
          ]}
        >
          {unitOptions.map((unitOption) => (
            <TouchableOpacity
              key={unitOption}
              style={[
                authStyles.unitToggleButton,
                selectedUnit === unitOption &&
                  (isLight
                    ? authStyles.unitToggleButtonActiveLight
                    : authStyles.unitToggleButtonActive),
              ]}
              onPress={() => onUnitChange(unitOption)}
            >
              <Text
                style={[
                  authStyles.unitToggleText,
                  selectedUnit === unitOption &&
                    (isLight
                      ? authStyles.unitToggleTextActiveLight
                      : authStyles.unitToggleTextActive),
                ]}
              >
                {unitOption}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const { signUp } = useAuth();
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<RegisterFormState>({
    username: "",
    email: "",
    password: "",
    gender: null,
    age: 25,
    heightCm: 170,
    weightKg: 70,
    goals: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirstStep = step === 1;

  const updateField = <K extends keyof RegisterFormState>(
    key: K,
    value: RegisterFormState[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const validateStep = (currentStep: WizardStep): boolean => {
    switch (currentStep) {
      case 1: {
        if (!form.username || !form.email || !form.password) {
          setError("Please fill in username, email and password to continue.");
          return false;
        }
        break;
      }
      case 2: {
        if (!form.gender) {
          setError("Please select your gender to continue.");
          return false;
        }
        break;
      }
      case 6: {
        if (!form.goals || form.goals.length === 0) {
          setError("Please choose at least one fitness goal.");
          return false;
        }
        break;
      }
      default:
        break;
    }
    setError(null);
    return true;
  };

  const onSubmit = async () => {
    if (!validateStep(6)) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(form.username.trim(), form.email.trim(), form.password);
      // Additional onboarding data (gender, age, metrics, goal) is kept in
      // local state here. It can be wired into the backend request when the
      // API supports these extra attributes.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!validateStep(step)) {
      return;
    }
    if (step < 6) {
      LayoutAnimation.configureNext(STEP_TRANSITION_ANIMATION as any);
      Haptics.selectionAsync().catch(() => {
        // best-effort haptics; ignore errors
      });
      setStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.replace("Login");
      return;
    }
    LayoutAnimation.configureNext(STEP_TRANSITION_ANIMATION as any);
    Haptics.selectionAsync().catch(() => {
      // best-effort haptics; ignore errors
    });
    setStep((prev) => (prev - 1) as WizardStep);
  };

  const renderGenderOption = (value: Gender, label: string) => {
    const isSelected = form.gender === value;
    const iconName =
      value === "male"
        ? "male-outline"
        : value === "female"
          ? "female-outline"
          : "person-outline";
    return (
      <TouchableOpacity
        key={value}
        style={[
          authStyles.genderCard,
          !isLight && authStyles.genderCardDark,
          isSelected && authStyles.genderCardSelected,
          !isLight && isSelected && authStyles.genderCardSelectedDark,
        ]}
        onPress={() => updateField("gender", value)}
        activeOpacity={0.9}
      >
        <Ionicons
          name={iconName}
          size={32}
          color={isSelected ? "#FFFFFF" : "#6B7280"}
          style={authStyles.genderIcon}
        />
        <Text
          style={[
            authStyles.genderLabel,
            isSelected && authStyles.genderLabelSelected,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGoalOption = (value: FitnessGoal, label: string) => {
    const isSelected = form.goals.includes(value);

    const handleToggle = () => {
      const nextGoals = isSelected
        ? form.goals.filter((g) => g !== value)
        : [...form.goals, value];

      updateField("goals", nextGoals as RegisterFormState["goals"]);
    };

    return (
      <TouchableOpacity
        key={value}
        style={[
          authStyles.goalItem,
          isLight ? authStyles.goalItemLight : authStyles.goalItemDark,
          isSelected && authStyles.goalItemSelected,
        ]}
        onPress={handleToggle}
        activeOpacity={0.9}
      >
        <Ionicons
          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
          size={20}
          color={isSelected ? "#2563EB" : "#9CA3AF"}
        />
        <Text
          style={[
            authStyles.goalItemLabel,
            !isLight && authStyles.goalItemLabelDark,
            isSelected && authStyles.goalItemLabelSelected,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const getStepTitle = (): string => {
    switch (step) {
      case 2:
        return "Tell us about yourself";
      case 3:
        return "How old are you?";
      case 4:
        return "What is your height?";
      case 5:
        return "What is your weight?";
      case 6:
        return "What's your goal?";
      default:
        return "";
    }
  };

  const getStepSubtitle = (): string => {
    switch (step) {
      case 2:
        return "Share a few personal details to personalize your plan.";
      case 3:
        return "This helps us to create your personalized exercise plan.";
      case 4:
        return "We use this to tailor recommendations to you.";
      case 5:
        return "This helps us tune your plan to your body.";
      case 6:
        return "We will use this to build a plan that fits you best.";
      default:
        return "";
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View>
            <Text style={authStyles.stepTitle}>Account setup</Text>
            <Text style={authStyles.stepSubtitle}>
              Choose your login details to secure your account.
            </Text>

            <View style={authStyles.inputRow}>
              <Ionicons
                name="person-outline"
                size={18}
                color="#2563EB"
                style={authStyles.inputIcon}
              />
              <TextInput
                style={authStyles.inputField}
                placeholder="Username"
                placeholderTextColor="#9CA3AF"
                value={form.username}
                onChangeText={(text) => updateField("username", text)}
                autoCapitalize="none"
              />
            </View>

            <View style={authStyles.inputRow}>
              <Ionicons
                name="mail-outline"
                size={18}
                color="#2563EB"
                style={authStyles.inputIcon}
              />
              <TextInput
                style={authStyles.inputField}
                placeholder="E-mail ID"
                placeholderTextColor="#9CA3AF"
                value={form.email}
                onChangeText={(text) => updateField("email", text)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={authStyles.inputRow}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#2563EB"
                style={authStyles.inputIcon}
              />
              <TextInput
                style={authStyles.inputField}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                value={form.password}
                onChangeText={(text) => updateField("password", text)}
              />
            </View>
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={[authStyles.label, isLight && authStyles.labelLight]}>
              Gender
            </Text>
            <View style={authStyles.genderCardsContainer}>
              {renderGenderOption("male", "Male")}
              {renderGenderOption("female", "Female")}
              {renderGenderOption("other", "Other")}
            </View>
          </View>
        );
      case 3:
        return (
          <NumberPicker
            label="Age"
            min={16}
            max={80}
            value={form.age}
            onChange={(value) => updateField("age", value)}
            isLight={isLight}
          />
        );
      case 4:
        return (
          <NumberPicker
            label="Height"
            min={120}
            max={220}
            value={form.heightCm}
            onChange={(value) => updateField("heightCm", value)}
            isLight={isLight}
          />
        );
      case 5:
        return (
          <NumberPicker
            label="Weight"
            min={40}
            max={160}
            value={form.weightKg}
            onChange={(value) => updateField("weightKg", value)}
            isLight={isLight}
          />
        );
      case 6:
        return (
          <View style={authStyles.goalList}>
            {renderGoalOption("weight_loss", "Weight Loss")}
            {renderGoalOption("muscle_gain", "Muscle Gain")}
            {renderGoalOption("endurance", "Endurance")}
            {renderGoalOption("strength_gain", "Gain Strength")}
            {renderGoalOption("flexibility_mobility", "Flexibility & Mobility")}
            {renderGoalOption("maintain_shape", "Maintain Shape")}
            {renderGoalOption("longevity", "General Health / Longevity")}
            {renderGoalOption("recovery", "Rehab / Recovery")}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        authStyles.container,
        !isFirstStep && authStyles.containerWizard,
        isLight && authStyles.containerLight,
      ]}
    >
      {isFirstStep && <ThemeToggle isLight={isLight} onToggle={toggle} />}

      {isFirstStep ? (
        <>
          <View style={[authStyles.authCard, authStyles.authCardShadow]}>
            <View style={authStyles.segmentContainer}>
              <TouchableOpacity
                style={authStyles.segmentButton}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={authStyles.segmentButtonText}>Login</Text>
              </TouchableOpacity>
              <View
                style={[
                  authStyles.segmentButton,
                  authStyles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    authStyles.segmentButtonText,
                    authStyles.segmentButtonTextActive,
                  ]}
                >
                  Register
                </Text>
              </View>
            </View>

            <View style={authStyles.wizardDotsRow}>
              {[1, 2, 3, 4, 5, 6].map((dotStep) => (
                <View
                  key={dotStep}
                  style={[
                    authStyles.wizardDot,
                    step === dotStep && authStyles.wizardDotActive,
                  ]}
                />
              ))}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 4 }}
              nestedScrollEnabled
            >
              {renderStepContent()}
            </ScrollView>

            {error && <Text style={authStyles.errorText}>{error}</Text>}

            <View style={authStyles.wizardButtonRow}>
              <TouchableOpacity
                style={authStyles.secondaryButton}
                onPress={handleBack}
                disabled={loading}
              >
                <Text style={authStyles.secondaryButtonText}>
                  {step === 1 ? "Back to Login" : "Back"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  authStyles.primaryButton,
                  authStyles.wizardPrimaryButton,
                  isLight && authStyles.primaryButtonLight,
                  loading && authStyles.primaryButtonDisabled,
                ]}
                onPress={handleNext}
                disabled={loading}
              >
                <Text style={authStyles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={() => navigation.replace("Login")}>
            <Text
              style={[authStyles.linkText, isLight && authStyles.linkTextLight]}
            >
              Back to login
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={authStyles.fullscreenWizard}>
          <View style={authStyles.progressBarContainer}>
            <View
              style={[
                authStyles.progressBarTrack,
                !isLight && authStyles.progressBarTrackDark,
              ]}
            >
              <View
                style={[
                  authStyles.progressBarFill,
                  { width: `${(step / 6) * 100}%` },
                ]}
              />
            </View>
          </View>

          <ScrollView
            style={authStyles.fullscreenScroll}
            contentContainerStyle={authStyles.fullscreenScrollContent}
            showsVerticalScrollIndicator={false}
            // On iOS, disable outer scrolling on NumberPicker steps so that
            // vertical gestures are fully handled by the inner picker.
            scrollEnabled={!(step === 3 || step === 4 || step === 5)}
            nestedScrollEnabled
            scrollEventThrottle={16}
          >
            <View style={authStyles.fullscreenHeader}>
              {!!getStepTitle() && (
                <Text
                  style={[
                    authStyles.stepTitle,
                    !isLight && authStyles.stepTitleDark,
                  ]}
                >
                  {getStepTitle()}
                </Text>
              )}
              {!!getStepSubtitle() && (
                <Text
                  style={[
                    authStyles.stepSubtitle,
                    !isLight && authStyles.stepSubtitleDark,
                  ]}
                >
                  {getStepSubtitle()}
                </Text>
              )}
            </View>

            <View style={authStyles.fullscreenBody}>{renderStepContent()}</View>
          </ScrollView>

          {error && <Text style={authStyles.errorText}>{error}</Text>}

          <View style={authStyles.wizardButtonRow}>
            <TouchableOpacity
              style={[
                authStyles.secondaryButton,
                isLight && authStyles.secondaryButtonLight,
              ]}
              onPress={handleBack}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                authStyles.primaryButton,
                authStyles.wizardPrimaryButton,
                isLight && authStyles.wizardPrimaryButtonLight,
                loading && authStyles.primaryButtonDisabled,
              ]}
              onPress={step === 6 ? onSubmit : handleNext}
              disabled={loading}
            >
              <Text
                style={[
                  authStyles.primaryButtonText,
                  authStyles.wizardPrimaryButtonText,
                ]}
              >
                {step === 6 ? (loading ? "Creating…" : "Next") : "Next"}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color="#1F2937"
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default RegisterScreen;
