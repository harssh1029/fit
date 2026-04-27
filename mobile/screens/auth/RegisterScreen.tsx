import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutAnimation,
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
type FitnessLevel = "beginner" | "consistent" | "advanced";
type FitnessGoal =
  | "cardio"
  | "weight_loss"
  | "strength"
  | "stress"
  | "stay_fit"
  | "mobility";
type WizardStep = 1 | 2 | 3 | 4 | 5;

type RegisterFormState = {
  username: string;
  email: string;
  password: string;
  gender: Gender | null;
  age: number;
  heightCm: number;
  weightKg: number;
  pushups: number;
  workoutsPerWeek: number;
  fitnessLevel: FitnessLevel | null;
  goals: FitnessGoal[];
};

const STEP_COUNT = 5;
const SCROLL_CHIP_WIDTH = 56;

const STEP_TRANSITION_ANIMATION = {
  duration: 220,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    springDamping: 0.86,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
} as const;

const GOAL_OPTIONS: { key: FitnessGoal; label: string; icon: string }[] = [
  { key: "cardio", label: "Cardio", icon: "pulse-outline" },
  { key: "weight_loss", label: "Lose weight", icon: "trending-down-outline" },
  { key: "strength", label: "Strength", icon: "barbell-outline" },
  { key: "stress", label: "Reduce stress", icon: "leaf-outline" },
  { key: "stay_fit", label: "Stay fit", icon: "shield-checkmark-outline" },
  { key: "mobility", label: "Mobility", icon: "body-outline" },
];

const FITNESS_LEVELS: {
  key: FitnessLevel;
  title: string;
  subtitle: string;
  icon: string;
}[] = [
  {
    key: "beginner",
    title: "Beginner",
    subtitle: "Getting consistent",
    icon: "walk-outline",
  },
  {
    key: "consistent",
    title: "Intermediate",
    subtitle: "Training weekly",
    icon: "fitness-outline",
  },
  {
    key: "advanced",
    title: "Advanced",
    subtitle: "Pushing performance",
    icon: "flash-outline",
  },
];

const buildNumberRange = (min: number, max: number, step = 1) =>
  Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) =>
    min + index * step,
  );

const ScrollValuePicker: React.FC<{
  label: string;
  value: number;
  values: number[];
  unit?: string;
  isLight: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onChange: (value: number) => void;
}> = ({ label, value, values, unit, isLight, icon, onChange }) => {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const selectedIndex = Math.max(values.indexOf(value), 0);
    const offset = Math.max(0, selectedIndex * (SCROLL_CHIP_WIDTH + 8) - 84);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: offset, animated: true });
    });
  }, [value, values]);

  const handleChange = (nextValue: number) => {
    onChange(nextValue);
    Haptics.selectionAsync().catch(() => {
      // Haptics are best-effort and may be unavailable on some platforms.
    });
  };

  return (
    <View
      style={[
        authStyles.scrollPickerBlock,
        isLight && authStyles.scrollPickerBlockLight,
      ]}
    >
      <View style={authStyles.scrollPickerHeader}>
        <View style={authStyles.scrollPickerLabelRow}>
          <Ionicons
            name={icon}
            size={17}
            color={isLight ? "#0070cc" : "#7DD3FC"}
          />
          <Text
            style={[
              authStyles.scrollPickerLabel,
              isLight && authStyles.scrollPickerLabelLight,
            ]}
          >
            {label}
          </Text>
        </View>
        <Text
          style={[
            authStyles.scrollPickerValue,
            isLight && authStyles.scrollPickerValueLight,
          ]}
        >
          {value}
          {!!unit && (
            <Text
              style={[
                authStyles.scrollPickerUnit,
                isLight && authStyles.scrollPickerUnitLight,
              ]}
            >
              {" "}
              {unit}
            </Text>
          )}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={authStyles.scrollPickerTrack}
      >
        {values.map((item) => {
          const selected = item === value;
          return (
            <TouchableOpacity
              key={item}
              style={[
                authStyles.scrollPickerChip,
                isLight && authStyles.scrollPickerChipLight,
                selected && authStyles.scrollPickerChipSelected,
              ]}
              activeOpacity={0.85}
              onPress={() => handleChange(item)}
            >
              <Text
                style={[
                  authStyles.scrollPickerChipText,
                  isLight && authStyles.scrollPickerChipTextLight,
                  selected && authStyles.scrollPickerChipTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    heightCm: 172,
    weightKg: 70,
    pushups: 15,
    workoutsPerWeek: 3,
    fitnessLevel: null,
    goals: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ageValues = useMemo(() => buildNumberRange(16, 80), []);
  const heightValues = useMemo(() => buildNumberRange(120, 220), []);
  const weightValues = useMemo(() => buildNumberRange(40, 160), []);
  const pushupValues = useMemo(() => buildNumberRange(0, 100, 5), []);
  const workoutValues = useMemo(() => buildNumberRange(0, 7), []);

  const stepMeta = useMemo(() => {
    switch (step) {
      case 1:
        return {
          title: "Create your account",
          subtitle: "A clean start. This takes less than a minute.",
        };
      case 2:
        return {
          title: "Tell us about you",
          subtitle: "Pick gender and age so training starts in the right lane.",
        };
      case 3:
        return {
          title: "Body metrics",
          subtitle: "Scroll to your height and weight. No repeated tapping.",
        };
      case 4:
        return {
          title: "Fitness baseline",
          subtitle: "A quick snapshot helps match your first plan.",
        };
      case 5:
      default:
        return {
          title: "What's your goal?",
          subtitle: "Choose up to three goals. You can change this later.",
        };
    }
  }, [step]);

  const updateField = <K extends keyof RegisterFormState>(
    key: K,
    value: RegisterFormState[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const setNextStep = (nextStep: WizardStep) => {
    LayoutAnimation.configureNext(STEP_TRANSITION_ANIMATION as any);
    Haptics.selectionAsync().catch(() => {
      // best-effort haptics
    });
    setStep(nextStep);
  };

  const validateStep = (currentStep: WizardStep) => {
    if (currentStep === 1) {
      if (!form.username.trim() || !form.email.trim() || !form.password) {
        setError("Add username, email and password to continue.");
        return false;
      }
    }
    if (currentStep === 2 && !form.gender) {
      setError("Select gender to continue.");
      return false;
    }
    if (currentStep === 4 && !form.fitnessLevel) {
      setError("Choose your current fitness level.");
      return false;
    }
    if (currentStep === 5 && form.goals.length === 0) {
      setError("Choose at least one goal.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < STEP_COUNT) {
      setNextStep((step + 1) as WizardStep);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.replace("Login");
      return;
    }
    setError(null);
    setNextStep((step - 1) as WizardStep);
  };

  const onSubmit = async () => {
    if (!validateStep(5)) return;
    setLoading(true);
    setError(null);

    try {
      await signUp(form.username.trim(), form.email.trim(), form.password);
      // The collected onboarding profile is kept locally until the backend
      // exposes a profile-onboarding endpoint.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleGoal = (goal: FitnessGoal) => {
    const hasGoal = form.goals.includes(goal);
    if (!hasGoal && form.goals.length >= 3) {
      setError("Pick up to three goals for now.");
      return;
    }
    setError(null);
    updateField(
      "goals",
      hasGoal ? form.goals.filter((item) => item !== goal) : [...form.goals, goal],
    );
  };

  const renderTextInput = (
    icon: keyof typeof Ionicons.glyphMap,
    placeholder: string,
    value: string,
    onChangeText: (value: string) => void,
    options?: Partial<React.ComponentProps<typeof TextInput>>,
  ) => (
    <View style={[authStyles.inputRow, isLight && authStyles.inputRowLight]}>
      <Ionicons
        name={icon}
        size={18}
        color={isLight ? "#0070cc" : "#7DD3FC"}
        style={authStyles.inputIcon}
      />
      <TextInput
        style={[authStyles.inputField, !isLight && authStyles.inputFieldDark]}
        placeholder={placeholder}
        placeholderTextColor={isLight ? "#9CA3AF" : "#6B7280"}
        value={value}
        onChangeText={onChangeText}
        {...options}
      />
    </View>
  );

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <View>
          {renderTextInput("person-outline", "Username", form.username, (text) =>
            updateField("username", text),
          )}
          {renderTextInput(
            "mail-outline",
            "Email",
            form.email,
            (text) => updateField("email", text),
            {
              autoCapitalize: "none",
              keyboardType: "email-address",
            },
          )}
          {renderTextInput(
            "lock-closed-outline",
            "Password",
            form.password,
            (text) => updateField("password", text),
            {
              secureTextEntry: true,
            },
          )}
        </View>
      );
    }

    if (step === 2) {
      return (
        <View>
          <View style={authStyles.compactOptionRow}>
            {(["male", "female", "other"] as Gender[]).map((gender) => {
              const selected = form.gender === gender;
              const icon =
                gender === "male"
                  ? "male-outline"
                  : gender === "female"
                    ? "female-outline"
                    : "person-outline";
              return (
                <TouchableOpacity
                  key={gender}
                  style={[
                    authStyles.compactOptionCard,
                    isLight && authStyles.compactOptionCardLight,
                    selected && authStyles.compactOptionCardSelected,
                  ]}
                  activeOpacity={0.9}
                  onPress={() => updateField("gender", gender)}
                >
                  <Ionicons
                    name={icon}
                    size={21}
                    color={
                      selected ? "#FFFFFF" : isLight ? "#111827" : "#D9E4F2"
                    }
                  />
                  <Text
                    style={[
                      authStyles.compactOptionText,
                      isLight && authStyles.compactOptionTextLight,
                      selected && authStyles.compactOptionTextSelected,
                    ]}
                  >
                    {gender === "male"
                      ? "Male"
                      : gender === "female"
                        ? "Female"
                        : "Other"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollValuePicker
            label="Age"
            value={form.age}
            values={ageValues}
            isLight={isLight}
            icon="calendar-outline"
            onChange={(value) => updateField("age", value)}
          />
        </View>
      );
    }

    if (step === 3) {
      return (
        <View>
          <ScrollValuePicker
            label="Height"
            value={form.heightCm}
            values={heightValues}
            unit="cm"
            isLight={isLight}
            icon="resize-outline"
            onChange={(value) => updateField("heightCm", value)}
          />
          <ScrollValuePicker
            label="Weight"
            value={form.weightKg}
            values={weightValues}
            unit="kg"
            isLight={isLight}
            icon="scale-outline"
            onChange={(value) => updateField("weightKg", value)}
          />
        </View>
      );
    }

    if (step === 4) {
      return (
        <View>
          <ScrollValuePicker
            label="Pushups in one go"
            value={form.pushups}
            values={pushupValues}
            isLight={isLight}
            icon="body-outline"
            onChange={(value) => updateField("pushups", value)}
          />
          <ScrollValuePicker
            label="Workouts per week"
            value={form.workoutsPerWeek}
            values={workoutValues}
            unit="/ wk"
            isLight={isLight}
            icon="barbell-outline"
            onChange={(value) => updateField("workoutsPerWeek", value)}
          />

          <Text
            style={[
              authStyles.authSectionLabel,
              isLight && authStyles.authSectionLabelLight,
            ]}
          >
            Current level
          </Text>
          {FITNESS_LEVELS.map((level) => {
            const selected = form.fitnessLevel === level.key;
            return (
              <TouchableOpacity
                key={level.key}
                style={[
                  authStyles.levelCard,
                  isLight && authStyles.levelCardLight,
                  selected && authStyles.levelCardSelected,
                ]}
                activeOpacity={0.9}
                onPress={() => updateField("fitnessLevel", level.key)}
              >
                <View
                  style={[
                    authStyles.levelIconCircle,
                    selected && authStyles.levelIconCircleSelected,
                  ]}
                >
                  <Ionicons
                    name={level.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={selected ? "#FFFFFF" : isLight ? "#0070cc" : "#7DD3FC"}
                  />
                </View>
                <View style={authStyles.levelTextBlock}>
                  <Text
                    style={[
                      authStyles.levelTitle,
                      isLight && authStyles.levelTitleLight,
                      selected && authStyles.levelTitleSelected,
                    ]}
                  >
                    {level.title}
                  </Text>
                  <Text
                    style={[
                      authStyles.levelSubtitle,
                      isLight && authStyles.levelSubtitleLight,
                      selected && authStyles.levelSubtitleSelected,
                    ]}
                  >
                    {level.subtitle}
                  </Text>
                </View>
                {selected && (
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    return (
      <ScrollView
        style={authStyles.goalListFrame}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {GOAL_OPTIONS.map((goal) => {
          const selected = form.goals.includes(goal.key);
          return (
            <TouchableOpacity
              key={goal.key}
              style={[
                authStyles.goalListItem,
                isLight && authStyles.goalListItemLight,
                selected && authStyles.goalListItemSelected,
              ]}
              activeOpacity={0.88}
              onPress={() => toggleGoal(goal.key)}
            >
              <View
                style={[
                  authStyles.goalListIcon,
                  selected && authStyles.goalListIconSelected,
                ]}
              >
                <Ionicons
                  name={goal.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={selected ? "#FFFFFF" : isLight ? "#0070cc" : "#7DD3FC"}
                />
              </View>
              <Text
                style={[
                  authStyles.goalListText,
                  isLight && authStyles.goalListTextLight,
                  selected && authStyles.goalListTextSelected,
                ]}
              >
                {goal.label}
              </Text>
              <View
                style={[
                  authStyles.goalListCheck,
                  selected && authStyles.goalListCheckSelected,
                ]}
              >
                {selected && (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={[authStyles.onboardingRoot, isLight && authStyles.containerLight]}>
      <View style={authStyles.onboardingTopBar}>
        <TouchableOpacity
          style={[
            authStyles.onboardingIconButton,
            isLight && authStyles.onboardingIconButtonLight,
          ]}
          activeOpacity={0.85}
          onPress={handleBack}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={isLight ? "#111827" : "#FFFFFF"}
          />
        </TouchableOpacity>
        <ThemeToggle isLight={isLight} onToggle={toggle} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={authStyles.onboardingContent}
      >
        <View style={authStyles.onboardingHeader}>
          <Text
            style={[authStyles.onboardingTitle, isLight && authStyles.titleLight]}
          >
            {stepMeta.title}
          </Text>
          <Text
            style={[
              authStyles.onboardingSubtitle,
              isLight && authStyles.subtitleLight,
            ]}
          >
            {stepMeta.subtitle}
          </Text>
        </View>

        <View
          style={[
            authStyles.authCard,
            authStyles.authCardShadow,
            authStyles.registerCard,
            isLight && authStyles.authCardLight,
          ]}
        >
          <View style={authStyles.segmentContainer}>
            <TouchableOpacity
              style={authStyles.segmentButton}
              onPress={() => navigation.replace("Login")}
            >
              <Text style={authStyles.segmentButtonText}>Login</Text>
            </TouchableOpacity>
            <View
              style={[authStyles.segmentButton, authStyles.segmentButtonActive]}
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

          {renderStepContent()}
          {error && <Text style={authStyles.errorText}>{error}</Text>}

          <View style={authStyles.registerFooter}>
            <View style={authStyles.wizardDotsRow}>
              {Array.from({ length: STEP_COUNT }, (_, index) => {
                const dotStep = index + 1;
                return (
                  <View
                    key={dotStep}
                    style={[
                      authStyles.wizardDot,
                      dotStep <= step && authStyles.wizardDotActive,
                    ]}
                  />
                );
              })}
            </View>
            <TouchableOpacity
              style={[
                authStyles.primaryButton,
                authStyles.wizardPrimaryButton,
                loading && authStyles.primaryButtonDisabled,
              ]}
              activeOpacity={0.9}
              onPress={step === STEP_COUNT ? onSubmit : handleNext}
              disabled={loading}
            >
              <Text
                style={[
                  authStyles.primaryButtonText,
                  authStyles.wizardPrimaryButtonText,
                ]}
              >
                {step === STEP_COUNT
                  ? loading
                    ? "Creating..."
                    : "Create account"
                  : "Next"}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
                style={authStyles.buttonEndIcon}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.replace("Login")}>
              <Text
                style={[authStyles.linkText, isLight && authStyles.linkTextLight]}
              >
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default RegisterScreen;
