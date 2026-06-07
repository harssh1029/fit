import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

import type {
  AuthStackParamList,
  RegistrationOnboardingPayload,
} from "../../App";
import { fetchApi } from "../../api/client";
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

type Gender = "male" | "female" | "other" | "prefer_not_to_say";
type FitnessLevel = "beginner" | "consistent" | "advanced";
type FitnessGoal =
  | "cardio"
  | "weight_loss"
  | "strength"
  | "stress"
  | "stay_fit"
  | "mobility";
type Flexibility = "yes" | "almost" | "no";
type WizardStep = 1 | 2 | 3 | 4 | 5;

type RegisterFormState = {
  username: string;
  email: string;
  password: string;
  gender: Gender | null;
  age: number;
  heightCm: number;
  weightKg: number;
  waistCm: number;
  pushups: number;
  workoutsPerWeek: number;
  runMinutes: number;
  restingHeartRate: number;
  sleepHours: number;
  canTouchToes: Flexibility;
  fitnessLevel: FitnessLevel | null;
  goals: FitnessGoal[];
  equipment: string[];
  restrictions: string[];
  trainingDaysPerWeek: number;
  sessionLengthMinutes: number;
};

const QUESTION_STEP_COUNT = 4;
const RESULT_STEP = 5;
const SCROLL_CHIP_WIDTH = 58;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  { key: "strength", label: "Build strength", icon: "barbell-outline" },
  { key: "cardio", label: "Build engine", icon: "pulse-outline" },
  { key: "weight_loss", label: "Lean down", icon: "trending-down-outline" },
  { key: "stay_fit", label: "Stay ready", icon: "shield-checkmark-outline" },
  { key: "mobility", label: "Move better", icon: "body-outline" },
  { key: "stress", label: "Stress reset", icon: "leaf-outline" },
];

const FITNESS_LEVELS: {
  key: FitnessLevel;
  title: string;
  subtitle: string;
  icon: string;
}[] = [
  {
    key: "beginner",
    title: "Foundation",
    subtitle: "Building consistency",
    icon: "walk-outline",
  },
  {
    key: "consistent",
    title: "Regular",
    subtitle: "Training most weeks",
    icon: "fitness-outline",
  },
  {
    key: "advanced",
    title: "Performance",
    subtitle: "Pushing harder targets",
    icon: "flash-outline",
  },
];

const FLEXIBILITY_OPTIONS: { key: Flexibility; label: string }[] = [
  { key: "yes", label: "Yes" },
  { key: "almost", label: "Almost" },
  { key: "no", label: "Not yet" },
];

const EQUIPMENT_OPTIONS = [
  { key: "bodyweight", label: "Bodyweight" },
  { key: "dumbbells", label: "Dumbbells" },
  { key: "barbell", label: "Barbell" },
  { key: "machines", label: "Machines" },
  { key: "bands", label: "Bands" },
  { key: "cardio_machine", label: "Cardio kit" },
];

const RESTRICTION_OPTIONS = [
  { key: "knee_sensitive", label: "Knees" },
  { key: "back_sensitive", label: "Back" },
  { key: "shoulder_sensitive", label: "Shoulders" },
  { key: "low_impact", label: "Low impact" },
  { key: "no_jumping", label: "No jumping" },
];

const CALCULATION_STEPS = [
  "Locking your profile",
  "Scoring your baseline",
  "Mapping body ranks",
  "Preparing dashboard",
] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const formatNumber = (value: number) =>
  Number.isInteger(value) ? `${value}` : value.toFixed(1);

const buildNumberRange = (min: number, max: number, step = 1) => {
  const values: number[] = [];
  for (let value = min; value <= max + step / 2; value += step) {
    values.push(Number(value.toFixed(1)));
  }
  return values;
};

const firstError = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) return String(value[0]);
  return null;
};

const formatAccountValidationError = (body: any) => {
  const messages: string[] = [];
  const username = firstError(body?.username);
  const email = firstError(body?.email);
  const password = firstError(body?.password);
  const detail = firstError(body?.detail);
  const nonField = firstError(body?.non_field_errors);

  if (username) messages.push(`Username: ${username}`);
  if (email) messages.push(`Email: ${email}`);
  if (password) messages.push(`Password: ${password}`);
  if (detail) messages.push(detail);
  if (nonField) messages.push(nonField);

  return messages.join("\n") || "Check your account details to continue.";
};

const ScrollMetricPicker: React.FC<{
  label: string;
  value: number;
  values: number[];
  unit?: string;
  icon: keyof typeof Ionicons.glyphMap;
  isLight: boolean;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}> = ({
  label,
  value,
  values,
  unit,
  icon,
  isLight,
  formatValue,
  onChange,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const selectedIndex = Math.max(values.indexOf(value), 0);
    const offset = Math.max(0, selectedIndex * (SCROLL_CHIP_WIDTH + 8) - 88);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: offset, animated: true });
    });
  }, [value, values]);

  const selectValue = (nextValue: number) => {
    onChange(nextValue);
    Haptics.selectionAsync().catch(() => {
      // best-effort haptics
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
            color={isLight ? "#2563EB" : "#7DD3FC"}
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
          {formatValue ? formatValue(value) : formatNumber(value)}
          {!!unit && !(formatValue && value <= 0) && (
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
              key={`${label}-${item}`}
              style={[
                authStyles.scrollPickerChip,
                isLight && authStyles.scrollPickerChipLight,
                selected && authStyles.scrollPickerChipSelected,
              ]}
              activeOpacity={0.85}
              onPress={() => selectValue(item)}
            >
              <Text
                style={[
                  authStyles.scrollPickerChipText,
                  isLight && authStyles.scrollPickerChipTextLight,
                  selected && authStyles.scrollPickerChipTextSelected,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatValue ? formatValue(item) : formatNumber(item)}
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
  const pageScrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<RegisterFormState>({
    username: "",
    email: "",
    password: "",
    gender: null,
    age: 25,
    heightCm: 172,
    weightKg: 70,
    waistCm: 0,
    pushups: 15,
    workoutsPerWeek: 3,
    runMinutes: 20,
    restingHeartRate: 70,
    sleepHours: 7,
    canTouchToes: "almost",
    fitnessLevel: null,
    goals: [],
    equipment: ["bodyweight"],
    restrictions: [],
    trainingDaysPerWeek: 3,
    sessionLengthMinutes: 45,
  });
  const [loading, setLoading] = useState(false);
  const [accountChecking, setAccountChecking] = useState(false);
  const [calculationIndex, setCalculationIndex] = useState(0);
  const [calculationDone, setCalculationDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickerValues = useMemo(
    () => ({
      age: buildNumberRange(13, 80),
      height: buildNumberRange(120, 220),
      weight: buildNumberRange(40, 160),
      waist: [0, ...buildNumberRange(50, 140)],
      workouts: buildNumberRange(0, 7),
      pushups: buildNumberRange(0, 100, 5),
      run: buildNumberRange(0, 90, 5),
      heartRate: buildNumberRange(45, 100),
      sleep: buildNumberRange(4, 10, 0.5),
      trainingDays: buildNumberRange(1, 7),
      sessionLength: buildNumberRange(15, 90, 5),
    }),
    [],
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      pageScrollRef.current?.scrollTo({ y: 0, animated: false });
    });
  }, [step]);

  const stepMeta = useMemo(() => {
    switch (step) {
      case 1:
        return {
          eyebrow: "Performance Profile",
          title: "Build your starting profile",
          subtitle:
            "Create the private profile your first metrics will be built from.",
        };
      case 2:
        return {
          eyebrow: "Body Profile",
          title: "Tune the body profile",
          subtitle:
            "A few numbers help your estimate start closer to reality.",
        };
      case 3:
        return {
          eyebrow: "Training Baseline",
          title: "Set your training baseline",
          subtitle:
            "Give the system enough signal to score your first snapshot.",
        };
      case 4:
        return {
          eyebrow: "Goals & Limits",
          title: "What should your plan protect?",
          subtitle:
            "Pick your priorities and any limits. You can refine them later.",
        };
      case 5:
      default:
        return {
          eyebrow: calculationDone ? "Profile Ready" : "Calculating",
          title: calculationDone ? "Your starting rank is ready" : "Building your baseline",
          subtitle: calculationDone
            ? "Review your first estimate, then move into the dashboard."
            : "Scoring your answers and preparing your first dashboard.",
        };
    }
  }, [calculationDone, step]);

  useEffect(() => {
    if (step !== RESULT_STEP || calculationDone) return;

    setCalculationIndex(0);
    const timer = setInterval(() => {
      setCalculationIndex((current) => {
        if (current >= CALCULATION_STEPS.length - 1) {
          clearInterval(timer);
          setTimeout(() => {
            LayoutAnimation.configureNext(STEP_TRANSITION_ANIMATION as any);
            setCalculationDone(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
              // best-effort haptics
            });
          }, 420);
          return current;
        }
        return current + 1;
      });
    }, 620);

    return () => clearInterval(timer);
  }, [calculationDone, step]);

  const estimate = useMemo(() => {
    const heightM = form.heightCm / 100;
    const bmi = form.weightKg / Math.max(heightM * heightM, 1);
    const bmiPenalty = Math.min(15, Math.abs(bmi - 22.5) * 2.4);
    const levelBoost =
      form.fitnessLevel === "advanced"
        ? 17
        : form.fitnessLevel === "consistent"
          ? 9
          : 0;
    const flexBoost =
      form.canTouchToes === "yes" ? 6 : form.canTouchToes === "almost" ? 3 : 0;
    const percentile = Math.round(
      clamp(
        48 +
          levelBoost +
          (form.workoutsPerWeek - 3) * 4 +
          (form.pushups - 15) * 0.42 +
          (form.runMinutes - 20) * 0.45 +
          (70 - form.restingHeartRate) * 0.45 +
          (form.sleepHours - 7) * 2.5 +
          flexBoost -
          bmiPenalty,
        8,
        96,
      ),
    );
    const rank =
      percentile >= 82
        ? "Beast"
        : percentile >= 68
          ? "Warrior"
          : percentile >= 54
            ? "Soldier"
            : "Recruit";
    const fitnessAge = clamp(
      Math.round(form.age - (percentile - 50) / 2),
      16,
      form.age + 20,
    );
    const primaryGoal = form.goals[0];
    const strongest =
      primaryGoal === "strength"
        ? "Strength"
        : primaryGoal === "cardio"
          ? "Engine"
          : primaryGoal === "weight_loss"
            ? "Conditioning"
            : primaryGoal === "mobility"
              ? "Mobility"
              : primaryGoal === "stress"
                ? "Recovery"
                : "Balanced fitness";
    const target =
      form.workoutsPerWeek < 3
        ? "Reach 3 quality training days"
        : form.pushups < 20
          ? "Build upper-body capacity"
          : form.runMinutes < 25
            ? "Extend your aerobic base"
            : "Keep consistency while progressing load";
    return { percentile, rank, fitnessAge, strongest, target };
  }, [form]);

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

  const toggleListValue = <T extends string>(
    key: "goals" | "equipment" | "restrictions",
    value: T,
    max?: number,
  ) => {
    const current = form[key] as string[];
    const hasValue = current.includes(value);
    if (!hasValue && max && current.length >= max) {
      setError(`Pick up to ${max} for now.`);
      return;
    }
    setError(null);
    updateField(
      key,
      (hasValue
        ? current.filter((item) => item !== value)
        : [...current, value]) as RegisterFormState[typeof key],
    );
  };

  const validateStep = (currentStep: WizardStep) => {
    if (currentStep === 1) {
      if (!form.username.trim() || !form.email.trim() || !form.password) {
        setError("Add username, email and password to continue.");
        return false;
      }
      if (!EMAIL_PATTERN.test(form.email.trim())) {
        setError("Use a valid email address before continuing.");
        return false;
      }
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return false;
      }
    }
    if (currentStep === 2 && !form.gender) {
      setError("Select the body profile option that fits best.");
      return false;
    }
    if (currentStep === 3 && !form.fitnessLevel) {
      setError("Choose your current training lane.");
      return false;
    }
    if (currentStep === 4 && form.goals.length === 0) {
      setError("Choose at least one goal to build your starting profile.");
      return false;
    }

    setError(null);
    return true;
  };

  const validateAccountWithServer = async () => {
    setAccountChecking(true);
    setError(null);

    try {
      const response = await fetchApi("/auth/register/validate/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      }, { retries: 1 });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(formatAccountValidationError(body));
        return false;
      }

      return true;
    } catch {
      setError("Could not validate account details. Check your connection and try again.");
      return false;
    } finally {
      setAccountChecking(false);
    }
  };

  const buildOnboardingPayload = (): RegistrationOnboardingPayload => ({
    version: 1,
    ageYears: form.age,
    gender: form.gender ?? "prefer_not_to_say",
    heightCm: form.heightCm,
    weightKg: form.weightKg,
    waistCm: form.waistCm > 0 ? form.waistCm : null,
    fitnessLevel: form.fitnessLevel ?? "beginner",
    workoutsPerWeek: form.workoutsPerWeek,
    maxPushups: form.pushups,
    runMinutes: form.runMinutes,
    restingHeartRate: form.restingHeartRate,
    canTouchToes: form.canTouchToes,
    sleepHours: form.sleepHours,
    goals: form.goals,
    trainingPreferences: {
      preferredDaysPerWeek: form.trainingDaysPerWeek,
      sessionLengthMinutes: form.sessionLengthMinutes,
      equipment: form.equipment,
    },
    restrictions: {
      avoidMovements: form.restrictions,
    },
  });

  const handleNext = async () => {
    if (!validateStep(step)) return;
    if (step === 1) {
      const accountOk = await validateAccountWithServer();
      if (!accountOk) return;
    }
    if (step < QUESTION_STEP_COUNT) {
      setNextStep((step + 1) as WizardStep);
    }
  };

  const handleCalculateProfile = () => {
    if (!validateStep(4)) return;
    setError(null);
    setCalculationIndex(0);
    setCalculationDone(false);
    setNextStep(RESULT_STEP);
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.replace("Login");
      return;
    }
    setError(null);
    setNextStep((step === RESULT_STEP ? 4 : step - 1) as WizardStep);
  };

  const onSubmit = async () => {
    if (!validateStep(4)) return;
    setLoading(true);
    setError(null);

    try {
      await signUp(
        form.username.trim(),
        form.email.trim(),
        form.password,
        buildOnboardingPayload(),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
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
        color={isLight ? "#2563EB" : "#7DD3FC"}
        style={authStyles.inputIcon}
      />
      <TextInput
        style={[authStyles.inputField, !isLight && authStyles.inputFieldDark]}
        placeholder={placeholder}
        placeholderTextColor={isLight ? "#94A3B8" : "#6B7280"}
        value={value}
        onChangeText={onChangeText}
        {...options}
      />
    </View>
  );

  const renderChip = (
    label: string,
    selected: boolean,
    onPress: () => void,
    icon?: keyof typeof Ionicons.glyphMap,
  ) => (
    <TouchableOpacity
      key={label}
      style={[
        authStyles.profileChip,
        isLight && authStyles.profileChipLight,
        selected && authStyles.profileChipSelected,
      ]}
      activeOpacity={0.86}
      onPress={onPress}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={15}
          color={selected ? "#FFFFFF" : isLight ? "#2563EB" : "#7DD3FC"}
          style={authStyles.profileChipIcon}
        />
      )}
      <Text
        style={[
          authStyles.profileChipText,
          isLight && authStyles.profileChipTextLight,
          selected && authStyles.profileChipTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderScrollPickers = (
    metrics: React.ComponentProps<typeof ScrollMetricPicker>[],
  ) => (
    <View style={authStyles.scrollPickerStack}>
      {metrics.map((metric) => (
        <ScrollMetricPicker key={metric.label} {...metric} />
      ))}
    </View>
  );

  const renderStepContent = () => {
    if (step === RESULT_STEP) {
      return (
        <View>
          {!calculationDone ? (
            <View
              style={[
                authStyles.calculationPanel,
                isLight && authStyles.calculationPanelLight,
              ]}
            >
              <View style={authStyles.calculationPulse}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
              <Text
                style={[
                  authStyles.calculationTitle,
                  isLight && authStyles.calculationTitleLight,
                ]}
              >
                Calculating your starting profile
              </Text>
              <Text
                style={[
                  authStyles.calculationSubtitle,
                  isLight && authStyles.calculationSubtitleLight,
                ]}
              >
                We are turning your answers into a clean first estimate.
              </Text>
              <View style={authStyles.calculationSteps}>
                {CALCULATION_STEPS.map((label, index) => {
                  const completed = index < calculationIndex;
                  const active = index === calculationIndex;
                  return (
                    <View key={label} style={authStyles.calculationStepRow}>
                      <View
                        style={[
                          authStyles.calculationStepIcon,
                          isLight && authStyles.calculationStepIconLight,
                          (completed || active) &&
                            authStyles.calculationStepIconActive,
                        ]}
                      >
                        {completed ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : active ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={authStyles.calculationStepNumber}>
                            {index + 1}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          authStyles.calculationStepText,
                          isLight && authStyles.calculationStepTextLight,
                          (completed || active) &&
                            authStyles.calculationStepTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View
              style={[
                authStyles.revealCard,
                isLight && authStyles.revealCardLight,
              ]}
            >
              <View style={authStyles.revealHeaderRow}>
                <View style={authStyles.revealIcon}>
                  <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                </View>
                <View style={authStyles.revealHeaderText}>
                  <Text
                    style={[
                      authStyles.revealKicker,
                      isLight && authStyles.revealKickerLight,
                    ]}
                  >
                    Starting rank
                  </Text>
                  <Text
                    style={[
                      authStyles.revealTitle,
                      isLight && authStyles.revealTitleLight,
                    ]}
                  >
                    {estimate.rank}
                  </Text>
                </View>
              </View>
              <View style={authStyles.revealMetricRow}>
                <View style={authStyles.revealMetric}>
                  <Text style={authStyles.revealMetricValue}>
                    {estimate.fitnessAge}
                  </Text>
                  <Text
                    style={[
                      authStyles.revealMetricLabel,
                      isLight && authStyles.revealMetricLabelLight,
                    ]}
                  >
                    fitness age
                  </Text>
                </View>
                <View style={authStyles.revealMetric}>
                  <Text style={authStyles.revealMetricValue}>
                    {estimate.percentile}%
                  </Text>
                  <Text
                    style={[
                      authStyles.revealMetricLabel,
                      isLight && authStyles.revealMetricLabelLight,
                    ]}
                  >
                    peer score
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  authStyles.revealSummary,
                  isLight && authStyles.revealSummaryLight,
                ]}
              >
                Strongest signal: {estimate.strongest}. First target:{" "}
                {estimate.target}.
              </Text>
              <TouchableOpacity
                style={[
                  authStyles.primaryButton,
                  authStyles.wizardPrimaryButton,
                  authStyles.revealButton,
                  loading && authStyles.primaryButtonDisabled,
                ]}
                activeOpacity={0.9}
                onPress={onSubmit}
                disabled={loading}
              >
                <Text
                  style={[
                    authStyles.primaryButtonText,
                    authStyles.wizardPrimaryButtonText,
                  ]}
                >
                  {loading ? "Opening dashboard..." : "Move to dashboard"}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                  style={authStyles.buttonEndIcon}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    if (step === 1) {
      return (
        <View>
          <View style={authStyles.profileValueStrip}>
            <View style={authStyles.profileValueItem}>
              <Text style={authStyles.profileValueKicker}>Private</Text>
              <Text
                style={[
                  authStyles.profileValueText,
                  isLight && authStyles.profileValueTextLight,
                ]}
              >
                Your baseline stays tied to your account.
              </Text>
            </View>
          </View>
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
          <Text
            style={[
              authStyles.authSectionLabel,
              isLight && authStyles.authSectionLabelLight,
            ]}
          >
            Body profile
          </Text>
          <View style={authStyles.profileChipWrap}>
            {renderChip(
              "Male",
              form.gender === "male",
              () => updateField("gender", "male"),
              "male-outline",
            )}
            {renderChip(
              "Female",
              form.gender === "female",
              () => updateField("gender", "female"),
              "female-outline",
            )}
            {renderChip(
              "Other",
              form.gender === "other",
              () => updateField("gender", "other"),
              "person-outline",
            )}
            {renderChip(
              "Prefer not",
              form.gender === "prefer_not_to_say",
              () => updateField("gender", "prefer_not_to_say"),
              "shield-outline",
            )}
          </View>
          {renderScrollPickers([
            {
              label: "Age",
              value: form.age,
              values: pickerValues.age,
              icon: "calendar-outline",
              isLight,
              onChange: (value) => updateField("age", value),
            },
            {
              label: "Height",
              value: form.heightCm,
              values: pickerValues.height,
              unit: "cm",
              icon: "resize-outline",
              isLight,
              onChange: (value) => updateField("heightCm", value),
            },
            {
              label: "Weight",
              value: form.weightKg,
              values: pickerValues.weight,
              unit: "kg",
              icon: "scale-outline",
              isLight,
              onChange: (value) => updateField("weightKg", value),
            },
            {
              label: "Waist",
              value: form.waistCm,
              values: pickerValues.waist,
              unit: form.waistCm > 0 ? "cm" : undefined,
              icon: "analytics-outline",
              isLight,
              formatValue: (value) => (value > 0 ? `${value}` : "Skip"),
              onChange: (value) => updateField("waistCm", value),
            },
          ])}
        </View>
      );
    }

    if (step === 3) {
      return (
        <View>
          <Text
            style={[
              authStyles.authSectionLabel,
              isLight && authStyles.authSectionLabelLight,
            ]}
          >
            Training lane
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
                    color={selected ? "#FFFFFF" : isLight ? "#2563EB" : "#7DD3FC"}
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
          {renderScrollPickers([
            {
              label: "Weekly training",
              value: form.workoutsPerWeek,
              values: pickerValues.workouts,
              unit: "/ wk",
              icon: "barbell-outline",
              isLight,
              onChange: (value) => updateField("workoutsPerWeek", value),
            },
            {
              label: "Pushups",
              value: form.pushups,
              values: pickerValues.pushups,
              icon: "body-outline",
              isLight,
              onChange: (value) => updateField("pushups", value),
            },
            {
              label: "Run capacity",
              value: form.runMinutes,
              values: pickerValues.run,
              unit: "min",
              icon: "timer-outline",
              isLight,
              onChange: (value) => updateField("runMinutes", value),
            },
            {
              label: "Resting HR",
              value: form.restingHeartRate,
              values: pickerValues.heartRate,
              unit: "bpm",
              icon: "heart-outline",
              isLight,
              onChange: (value) => updateField("restingHeartRate", value),
            },
            {
              label: "Sleep",
              value: form.sleepHours,
              values: pickerValues.sleep,
              unit: "hrs",
              icon: "bed-outline",
              isLight,
              onChange: (value) => updateField("sleepHours", value),
            },
          ])}
          <Text
            style={[
              authStyles.authSectionLabel,
              isLight && authStyles.authSectionLabelLight,
            ]}
          >
            Toe-touch check
          </Text>
          <View style={authStyles.profileChipWrap}>
            {FLEXIBILITY_OPTIONS.map((option) =>
              renderChip(option.label, form.canTouchToes === option.key, () =>
                updateField("canTouchToes", option.key),
              ),
            )}
          </View>
        </View>
      );
    }

    return (
      <View>
        <Text
          style={[
            authStyles.authSectionLabel,
            isLight && authStyles.authSectionLabelLight,
          ]}
        >
          Choose up to 3 priorities
        </Text>
        <View style={authStyles.profileChipWrap}>
          {GOAL_OPTIONS.map((goal) =>
            renderChip(
              goal.label,
              form.goals.includes(goal.key),
              () => toggleListValue("goals", goal.key, 3),
              goal.icon as keyof typeof Ionicons.glyphMap,
            ),
          )}
        </View>

        <Text
          style={[
            authStyles.authSectionLabel,
            isLight && authStyles.authSectionLabelLight,
          ]}
        >
          Training setup
        </Text>
        <View style={authStyles.profileChipWrap}>
          {EQUIPMENT_OPTIONS.map((item) =>
            renderChip(item.label, form.equipment.includes(item.key), () =>
              toggleListValue("equipment", item.key),
            ),
          )}
        </View>
        {renderScrollPickers([
          {
            label: "Days available",
            value: form.trainingDaysPerWeek,
            values: pickerValues.trainingDays,
            unit: "/ wk",
            icon: "calendar-outline",
            isLight,
            onChange: (value) => updateField("trainingDaysPerWeek", value),
          },
          {
            label: "Session length",
            value: form.sessionLengthMinutes,
            values: pickerValues.sessionLength,
            unit: "min",
            icon: "time-outline",
            isLight,
            onChange: (value) => updateField("sessionLengthMinutes", value),
          },
        ])}

        <Text
          style={[
            authStyles.authSectionLabel,
            isLight && authStyles.authSectionLabelLight,
          ]}
        >
          Protect these areas
        </Text>
        <View style={authStyles.profileChipWrap}>
          {RESTRICTION_OPTIONS.map((item) =>
            renderChip(item.label, form.restrictions.includes(item.key), () =>
              toggleListValue("restrictions", item.key),
            ),
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[authStyles.onboardingRoot, isLight && authStyles.containerLight]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
    >
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
        ref={pageScrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={authStyles.onboardingContent}
      >
        <View style={authStyles.onboardingHeader}>
          <Text
            style={[
              authStyles.onboardingEyebrow,
              isLight && authStyles.onboardingEyebrowLight,
            ]}
          >
            {stepMeta.eyebrow}
          </Text>
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
          <View
            style={[
              authStyles.profileProgressTrack,
              isLight && authStyles.profileProgressTrackLight,
            ]}
          >
            <View
              style={[
                authStyles.profileProgressFill,
                {
                  width: `${
                    (Math.min(step, QUESTION_STEP_COUNT) / QUESTION_STEP_COUNT) *
                    100
                  }%`,
                },
              ]}
            />
          </View>
        </View>

        <View
          style={[
            authStyles.authCard,
            authStyles.authCardShadow,
            authStyles.registerCard,
            isLight && authStyles.authCardLight,
          ]}
        >
          {step !== RESULT_STEP && (
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
          )}

          {renderStepContent()}
          {error && <Text style={authStyles.errorText}>{error}</Text>}

          {step !== RESULT_STEP && (
            <View style={authStyles.registerFooter}>
              <View style={authStyles.wizardDotsRow}>
                {Array.from({ length: QUESTION_STEP_COUNT }, (_, index) => {
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
                  (loading || accountChecking) &&
                    authStyles.primaryButtonDisabled,
                ]}
                activeOpacity={0.9}
                onPress={
                  step === QUESTION_STEP_COUNT
                    ? handleCalculateProfile
                    : handleNext
                }
                disabled={loading || accountChecking}
              >
                <Text
                  style={[
                    authStyles.primaryButtonText,
                    authStyles.wizardPrimaryButtonText,
                  ]}
                >
                  {step === QUESTION_STEP_COUNT
                    ? "Calculate my profile"
                    : step === 1 && accountChecking
                      ? "Checking account..."
                      : "Continue"}
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
                  style={[
                    authStyles.linkText,
                    isLight && authStyles.linkTextLight,
                  ]}
                >
                  Already have an account? Login
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;
