import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import * as Haptics from "expo-haptics";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import {
  GLASS_ACCENT_GREEN,
  GLASS_ACCENT_GREEN_SOFT,
  LIGHT_ACCENT_ORANGE,
  DARK_ACCENT_ORANGE,
  LIGHT_TEXT_MUTED,
  GLASS_TEXT_MUTED,
} from "../../styles/theme";
import { AppHeader } from "../../components/AppHeader";
import { AppTabs, PremiumCard } from "../../components/PremiumUI";
import {
  MotionEntrance,
  MotionProgressFill,
} from "../../components/PremiumMotion";
import ExerciseDetailSheet from "../../components/ExerciseDetailSheet";
import { fetchRequiredAuth, invalidateWorkoutData } from "../../api/client";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import { useWorkoutHistory } from "../../hooks/useWorkoutHistory";
import { useUserProfileBasic } from "../../hooks/useUserProfileBasic";
import { usePlanDetail } from "../../hooks/usePlanDetail";
import { useActiveUserPlan } from "../../hooks/useActiveUserPlan";
import BodyMuscleFront, { MuscleSelection } from "../../BodyMuscleFront";
import { FancyWorkoutTypeIcon } from "../../TrainingDayIcons";
import { loadExerciseDemoIds } from "../../utils/exerciseLookup";

import {
  useThemeMode,
  useExercisePrs,
  useAuth,
  styles,
  type PlanDayDetail,
  SAMPLE_ACTIVE_WORKOUTS,
  SAMPLE_ACTIVE_NUTRITIONS,
  WEEKDAY_LABELS,
  MONTH_LABELS,
  toISODate,
  addMonths,
  buildSampleMonthCalendarDays,
  buildMonthCalendarDaysFromDashboard,
  buildActiveWorkoutsFromPlan,
  buildActiveNutritionsFromPlan,
  BODY_BATTLE_CANONICAL_LABELS,
  BODY_BATTLE_GROUP_ORDER,
  BODY_BATTLE_RANK_COLORS,
  MUSCLE_TO_BODY_BATTLE_GROUP,
  MetricGauge,
  PercentileCurve,
} from "../../App";

type InsightMetric = {
  key: string;
  label: string;
  metric_type?: "body_part" | "training_category";
  xp: number;
  target_xp: number;
  percent: number;
  rank?: string;
  tier?: string;
  sessions?: number;
  icon?: string;
  accent: string;
};

type InsightComparisonPoint = {
  label: string;
  you: number;
  average: number;
  ideal: number;
};

type InsightComparisonMetric = {
  key: string;
  label: string;
  unit: string;
  description?: string;
  current: number;
  average: number;
  ideal: number;
  trend: InsightComparisonPoint[];
};

const clampPercent = (value: number | null | undefined) =>
  Math.max(0, Math.min(100, Number.isFinite(Number(value)) ? Number(value) : 0));

const formatCompactXp = (value: number | null | undefined) =>
  `${Math.round(Number(value) || 0).toLocaleString()} XP`;

const formatComparisonValue = (
  value: number | null | undefined,
  unit: string,
) => {
  const formatted = Math.round(Number(value) || 0).toLocaleString();
  if (unit === "%") return `${formatted}%`;
  if (unit === "XP") return `${formatted} XP`;
  if (unit === "days") return `${formatted}d`;
  return `${formatted} ${unit}`.trim();
};

const formatDashboardUpdatedAt = (value: string | null | undefined) => {
  if (!value) return "Updates after completed workouts";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Updates after completed workouts";
  return `Updated ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const buildSmoothChartPath = (
  points: Array<{ x: number; y: number }>,
  closed = false,
  bottom = 0,
) => {
  if (!points.length) return "";
  if (points.length === 1) {
    const path = `M ${points[0].x} ${points[0].y}`;
    return closed ? `${path} L ${points[0].x} ${bottom} Z` : path;
  }
  const commands = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    commands.push(
      `C ${midX.toFixed(1)} ${previous.y.toFixed(1)} ${midX.toFixed(1)} ${current.y.toFixed(1)} ${current.x.toFixed(1)} ${current.y.toFixed(1)}`,
    );
  }
  if (closed) {
    const first = points[0];
    const last = points[points.length - 1];
    commands.push(
      `L ${last.x.toFixed(1)} ${bottom.toFixed(1)} L ${first.x.toFixed(1)} ${bottom.toFixed(1)} Z`,
    );
  }
  return commands.join(" ");
};

const InsightComparisonGraph: React.FC<{
  metrics: InsightComparisonMetric[];
  activeKey: string;
  onChange: (key: string) => void;
  isLight: boolean;
}> = ({ metrics, activeKey, onChange, isLight }) => {
  const metric = metrics.find((item) => item.key === activeKey) ?? metrics[0];
  const [activeRange, setActiveRange] = useState<"week" | "4w" | "6w">("6w");
  const [isRangeOpen, setIsRangeOpen] = useState(false);
  if (!metric) return null;

  const allPoints = metric.trend?.length
    ? metric.trend
    : [{ label: "Now", you: metric.current, average: metric.average, ideal: metric.ideal }];
  const rangeOptions = [
    { key: "week" as const, label: "This week", take: 1 },
    { key: "4w" as const, label: "4 weeks", take: 4 },
    { key: "6w" as const, label: "6 weeks", take: 6 },
  ];
  const selectedRange =
    rangeOptions.find((item) => item.key === activeRange) ?? rangeOptions[2];
  const points = allPoints.slice(-selectedRange.take);
  const maxValue = Math.max(
    metric.ideal,
    metric.current,
    metric.average,
    ...points.flatMap((point) => [point.you, point.average, point.ideal]),
    metric.unit === "%" ? 125 : 1,
  );
  const width = 330;
  const height = 226;
  const left = 38;
  const right = width - 14;
  const top = 46;
  const bottom = height - 34;
  const xStep = points.length > 1 ? (right - left) / (points.length - 1) : 0;
  const toY = (value: number) =>
    bottom - (Math.max(0, value) / maxValue) * (bottom - top);
  const chartPoints = points.map((point, index) => ({
    x: left + index * xStep,
    y: toY(point.you),
    ...point,
  }));
  const averagePoints = points.map((point, index) => ({
    x: left + index * xStep,
    y: toY(point.average),
  }));
  const idealY = toY(metric.ideal);
  const linePath = buildSmoothChartPath(chartPoints);
  const areaPath = buildSmoothChartPath(chartPoints, true, bottom);
  const averagePath = buildSmoothChartPath(averagePoints);
  const activeIndex = Math.max(0, chartPoints.length - 2);
  const activePoint = chartPoints[activeIndex] ?? chartPoints[chartPoints.length - 1];
  const axisValues =
    metric.unit === "%" ? [125, 100, 75, 50, 25, 0].filter((item) => item <= maxValue) : [maxValue, maxValue * 0.75, maxValue * 0.5, maxValue * 0.25, 0];
  const labelPoints = [
    chartPoints[0],
    chartPoints[Math.floor((chartPoints.length - 1) / 2)],
    chartPoints[chartPoints.length - 1],
  ].filter(Boolean);

  return (
    <View style={insightStyles.comparisonPanel}>
      <View
        style={[
          insightStyles.comparisonGraphCard,
          isLight && insightStyles.comparisonGraphCardLight,
        ]}
      >
        <View style={insightStyles.comparisonHeader}>
          <View style={insightStyles.comparisonTitleBlock}>
            <Text
              style={[
                insightStyles.comparisonTitle,
                isLight && insightStyles.comparisonTitleLight,
              ]}
            >
              {metric.label} Progress
            </Text>
            <Text
              style={[
                insightStyles.comparisonMeta,
                isLight && insightStyles.comparisonMetaLight,
              ]}
            >
              You {formatComparisonValue(metric.current, metric.unit)} · Avg {formatComparisonValue(metric.average, metric.unit)}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setIsRangeOpen((current) => !current)}
            style={[
              insightStyles.comparisonRangePill,
              isLight && insightStyles.comparisonRangePillLight,
            ]}
          >
            <Text
              style={[
                insightStyles.comparisonRangeText,
                isLight && insightStyles.comparisonRangeTextLight,
              ]}
            >
              {selectedRange.label}
            </Text>
            <Ionicons
              name={isRangeOpen ? "chevron-up" : "chevron-down"}
              size={13}
              color={isLight ? "#0068BD" : "#38A8FF"}
            />
          </TouchableOpacity>
        </View>
        {isRangeOpen && (
          <View
            style={[
              insightStyles.comparisonRangeMenu,
              isLight && insightStyles.comparisonRangeMenuLight,
            ]}
          >
            {rangeOptions.map((option) => {
              const selected = option.key === activeRange;
              return (
                <TouchableOpacity
                  key={option.key}
                  activeOpacity={0.82}
                  onPress={() => {
                    setActiveRange(option.key);
                    setIsRangeOpen(false);
                  }}
                  style={[
                    insightStyles.comparisonRangeOption,
                    selected && insightStyles.comparisonRangeOptionActive,
                    isLight &&
                      selected &&
                      insightStyles.comparisonRangeOptionActiveLight,
                  ]}
                >
                  <Text
                    style={[
                      insightStyles.comparisonRangeOptionText,
                      selected && insightStyles.comparisonRangeOptionTextActive,
                      isLight && insightStyles.comparisonRangeOptionTextLight,
                      isLight &&
                        selected &&
                        insightStyles.comparisonRangeOptionTextActiveLight,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id="insightComparisonFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={isLight ? "#0070CC" : "#38A8FF"} stopOpacity={isLight ? "0.30" : "0.62"} />
              <Stop offset="0.62" stopColor={isLight ? "#0070CC" : "#38A8FF"} stopOpacity={isLight ? "0.12" : "0.22"} />
              <Stop offset="1" stopColor={isLight ? "#0070CC" : "#38A8FF"} stopOpacity="0.02" />
            </LinearGradient>
          </Defs>
          {axisValues.map((value) => {
            const y = toY(value);
            return (
              <React.Fragment key={`axis-${value}`}>
                <Path
                  d={`M ${left} ${y} L ${right} ${y}`}
                  stroke={isLight ? "rgba(15,23,42,0.12)" : "rgba(148,163,184,0.16)"}
                  strokeWidth={1}
                />
                <SvgText
                  x={left - 10}
                  y={y + 4}
                  fill={isLight ? "#475569" : "#94A3B8"}
                  fontSize="10"
                  textAnchor="end"
                >
                  {formatComparisonValue(value, metric.unit)}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Path d={areaPath} fill="url(#insightComparisonFill)" />
          <Path d={`M ${left} ${idealY} L ${right} ${idealY}`} fill="none" stroke={isLight ? "#0F9F86" : "#20DDBB"} strokeWidth={1.8} strokeDasharray="6 7" strokeLinecap="round" opacity={0.78} />
          <Path d={linePath} fill="none" stroke={isLight ? "#0070CC" : "#1D9BF0"} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          <Path d={averagePath} fill="none" stroke={isLight ? "#B7791F" : "#F2C16F"} strokeWidth={2.4} strokeDasharray="6 6" strokeLinecap="round" opacity={0.98} />
          {activePoint ? (
            <Path d={`M ${activePoint.x} ${top - 4} L ${activePoint.x} ${bottom}`} stroke={isLight ? "#0070CC" : "#1D9BF0"} strokeWidth={1.8} opacity={0.9} />
          ) : null}
          {chartPoints.map((point, index) => (
            <Circle
              key={`${point.label}-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === activeIndex ? 4.8 : 2.8}
              fill={index === activeIndex ? (isLight ? "#FFFFFF" : "#EAF6FF") : isLight ? "#0070CC" : "#1D9BF0"}
              stroke={isLight ? "#0070CC" : "#1D9BF0"}
              strokeWidth={index === activeIndex ? 2 : 0}
            />
          ))}
          {labelPoints.map((point, index) => (
            <SvgText
              key={`${point.label}-${index}`}
              x={point.x}
              y={height - 8}
              fill={isLight ? "#475569" : "#94A3B8"}
              fontSize="10"
              textAnchor={index === 0 ? "start" : index === labelPoints.length - 1 ? "end" : "middle"}
            >
              {point.label}
            </SvgText>
          ))}
        </Svg>
        <View style={insightStyles.comparisonLegend}>
          <View style={insightStyles.legendItem}>
            <View style={[insightStyles.legendDot, { backgroundColor: isLight ? "#0070CC" : "#2454F4" }]} />
            <Text style={[insightStyles.legendText, isLight && insightStyles.legendTextLight]}>You</Text>
          </View>
          <View style={insightStyles.legendItem}>
            <View style={[insightStyles.legendDot, { backgroundColor: isLight ? "#B7791F" : "#F2C16F" }]} />
            <Text style={[insightStyles.legendText, isLight && insightStyles.legendTextLight]}>Average</Text>
          </View>
          <View style={insightStyles.legendItem}>
            <View style={[insightStyles.legendDot, { backgroundColor: isLight ? "#0F9F86" : "#20DDBB" }]} />
            <Text style={[insightStyles.legendText, isLight && insightStyles.legendTextLight]}>Ideal</Text>
          </View>
        </View>
      </View>
      <Text
        style={[
          insightStyles.comparisonDescription,
          isLight && insightStyles.comparisonDescriptionLight,
        ]}
        numberOfLines={2}
      >
        {metric.description || "Your current training output against average users and a healthy ideal."}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={insightStyles.comparisonChips}
      >
        {metrics.map((item) => {
          const isActive = item.key === metric.key;
          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.84}
              onPress={() => onChange(item.key)}
              style={[
                insightStyles.comparisonChip,
                isActive && insightStyles.comparisonChipActive,
                isLight && insightStyles.comparisonChipLight,
                isLight && isActive && insightStyles.comparisonChipActiveLight,
              ]}
            >
              <Text
                style={[
                  insightStyles.comparisonChipText,
                  isActive && insightStyles.comparisonChipTextActive,
                  isLight && insightStyles.comparisonChipTextLight,
                  isLight &&
                    isActive &&
                    insightStyles.comparisonChipTextActiveLight,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const InsightProgressBar: React.FC<{ percent: number; height?: number }> = ({
  percent,
  height = 28,
}) => (
  <View style={[insightStyles.questTrack, { height }]}>
    <MotionProgressFill
      progress={percent / 100}
      minimumPercent={8}
      style={insightStyles.questFillTertiary}
    />
    <MotionProgressFill
      progress={(percent * 0.82) / 100}
      minimumPercent={8}
      delay={70}
      style={insightStyles.questFillSecondary}
    />
    <MotionProgressFill
      progress={(percent * 0.55) / 100}
      minimumPercent={8}
      delay={140}
      style={insightStyles.questFillPrimary}
    />
  </View>
);

const InsightLevelCard: React.FC<{
  level: { level: number; title: string; career_xp: number; next_level_xp: number; progress_percent: number };
  categories: InsightMetric[];
  isLight: boolean;
}> = ({ level, categories, isLight }) => (
    <View
      style={[
        insightStyles.referenceCard,
        isLight && insightStyles.referenceCardLight,
      ]}
    >
    <View style={insightStyles.cardHeaderBlock}>
      <Text style={[insightStyles.cardEyebrow, isLight && insightStyles.cardEyebrowLight]}>
        Training level
      </Text>
      <Text style={[insightStyles.cardHelper, isLight && insightStyles.cardHelperLight]}>
        Overall career XP, separated from body-part ranks.
      </Text>
      <View style={insightStyles.levelHeadingRow}>
        <Text style={[insightStyles.levelHeading, isLight && insightStyles.levelHeadingLight]}>
          Lvl {level.level}
        </Text>
        <Text style={[insightStyles.levelXp, isLight && insightStyles.levelXpLight]}>
          {formatCompactXp(level.next_level_xp)}
        </Text>
      </View>
    </View>
    <InsightProgressBar percent={clampPercent(level.progress_percent)} />
    <View style={insightStyles.verticalMetricsRow}>
      {categories.slice(0, 5).map((item) => {
        const percent = clampPercent(item.percent);
        const bubbleBottom = Math.max(0, Math.min(86, (percent / 100) * 136 - 25));
        const label = item.key === "conditioning" ? "Cond." : item.label;
        return (
          <View key={item.key} style={insightStyles.verticalMetricItem}>
            <View
              style={[
                insightStyles.verticalTrack,
                isLight && insightStyles.verticalTrackLight,
              ]}
            >
              <View style={[insightStyles.verticalFill, { height: `${Math.max(18, percent)}%` as any, backgroundColor: item.accent }]} />
              <View
                style={[
                  insightStyles.verticalBubble,
                  {
                    backgroundColor: item.accent,
                    bottom: bubbleBottom,
                  },
                ]}
              >
                <Text
                  style={insightStyles.verticalBubbleText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.76}
                >
                  {Math.round(item.xp)} XP
                </Text>
              </View>
            </View>
            <Text
              style={[
                insightStyles.verticalLabel,
                isLight && insightStyles.verticalLabelLight,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  </View>
);

const CUSTOM_WORKOUT_GROUPS = [
  { key: "chest", label: "Chest" },
  { key: "shoulders", label: "Shoulders" },
  { key: "arms", label: "Arms" },
  { key: "back", label: "Back" },
  { key: "core", label: "Core" },
  { key: "glutes", label: "Glutes" },
  { key: "legs", label: "Legs" },
];

const getMonthWeekIndex = (date: Date) => {
  const firstDayOfMonth = new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  ).getDay();
  return Math.floor((date.getDate() + firstDayOfMonth - 1) / 7);
};

const getMonthWeekCount = (monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  return Math.ceil((firstDayOfMonth + daysInMonth) / 7);
};

type FitnessTestInputs = {
  age: string;
  heightCm: string;
  weightKg: string;
  pushups: string;
  pullups: string;
  squats: string;
  runMinutes: string;
};

type FitnessTestResult = {
  completedAt: string;
  inputs: FitnessTestInputs;
  chronologicalAge: number;
  fitnessAgeYears: number;
  percentile: number;
  raceScore: number;
  bodyBalanceScore: number;
  bodyMapRows: {
    key: string;
    label: string;
    rank: string;
    color: string;
    sessions: number;
  }[];
  components: {
    pushupScore: number;
    pullupScore: number;
    squatScore: number;
    runScore: number;
    bmiScore: number;
    overallScore: number;
  };
};

const FITNESS_TEST_CALCULATION_STEPS = [
  "Calculating fitness age",
  "Comparing peer percentile",
  "Scoring race readiness",
  "Mapping body-part ranks",
  "Updating dashboard",
];

const getDefaultFitnessTestInputs = (
  profileHeight?: number | null,
  profileWeight?: number | null,
): FitnessTestInputs => ({
  age: "25",
  heightCm: profileHeight != null ? String(Math.round(profileHeight)) : "172",
  weightKg: profileWeight != null ? String(Math.round(profileWeight)) : "70",
  pushups: "15",
  pullups: "3",
  squats: "30",
  runMinutes: "7",
});

const clampScore = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

const rankFromScore = (score: number) => {
  if (score >= 82) return "Legend";
  if (score >= 65) return "Beast";
  if (score >= 45) return "Warrior";
  if (score >= 25) return "Soldier";
  return "Recruit";
};

const parseFitnessTestNumber = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const calculateFitnessTestResult = (
  inputs: FitnessTestInputs,
): FitnessTestResult => {
  const age = Math.max(16, Math.min(80, parseFitnessTestNumber(inputs.age, 25)));
  const heightCm = Math.max(
    120,
    Math.min(220, parseFitnessTestNumber(inputs.heightCm, 172)),
  );
  const weightKg = Math.max(
    40,
    Math.min(180, parseFitnessTestNumber(inputs.weightKg, 70)),
  );
  const pushups = Math.max(0, parseFitnessTestNumber(inputs.pushups, 0));
  const pullups = Math.max(0, parseFitnessTestNumber(inputs.pullups, 0));
  const squats = Math.max(0, parseFitnessTestNumber(inputs.squats, 0));
  const runMinutes = Math.max(
    3,
    Math.min(20, parseFitnessTestNumber(inputs.runMinutes, 7)),
  );

  const bmi = weightKg / (heightCm / 100) ** 2;
  const bmiScore = clampScore(100 - Math.abs(bmi - 22) * 8, 20, 100);
  const pushupScore = clampScore((pushups / 45) * 100);
  const pullupScore = clampScore((pullups / 12) * 100);
  const squatScore = clampScore((squats / 70) * 100);
  const runScore = clampScore(110 - ((runMinutes - 4) / 8) * 90, 15, 100);
  const upperStrength = clampScore(pushupScore * 0.55 + pullupScore * 0.45);
  const lowerStrength = clampScore(squatScore * 0.7 + runScore * 0.3);
  const overallScore = clampScore(
    pushupScore * 0.22 +
      pullupScore * 0.18 +
      squatScore * 0.2 +
      runScore * 0.28 +
      bmiScore * 0.12,
  );
  const fitnessAgeYears = Math.max(
    16,
    Math.min(
      80,
      Math.round(age - (overallScore - 55) / 4 + Math.max(0, 70 - bmiScore) / 15),
    ),
  );
  const percentile = clampScore(18 + overallScore * 0.8, 5, 98);
  const raceScore = clampScore(
    runScore * 0.42 + lowerStrength * 0.24 + upperStrength * 0.24 + bmiScore * 0.1,
  );

  const groupScores: Record<string, number> = {
    shoulders: clampScore(pushupScore * 0.75 + pullupScore * 0.25),
    chest: pushupScore,
    arms: clampScore(pushupScore * 0.35 + pullupScore * 0.65),
    core: clampScore(runScore * 0.45 + squatScore * 0.35 + bmiScore * 0.2),
    back: clampScore(pullupScore * 0.78 + squatScore * 0.22),
    glutes: clampScore(squatScore * 0.72 + runScore * 0.28),
    legs: clampScore(squatScore * 0.55 + runScore * 0.45),
  };
  const groupScoreValues = Object.values(groupScores);
  const averageGroupScore =
    groupScoreValues.reduce((sum, score) => sum + score, 0) /
    groupScoreValues.length;
  const spreadPenalty =
    Math.max(...groupScoreValues) - Math.min(...groupScoreValues);
  const bodyBalanceScore = clampScore(averageGroupScore - spreadPenalty * 0.18);

  const bodyMapRows = BODY_BATTLE_GROUP_ORDER.map((key) => {
    const score = groupScores[key] ?? 0;
    const rank = rankFromScore(score);
    return {
      key,
      label: BODY_BATTLE_CANONICAL_LABELS[key] ?? key,
      rank,
      color: BODY_BATTLE_RANK_COLORS[rank] ?? BODY_BATTLE_RANK_COLORS.Recruit,
      sessions: Math.round(score / 10),
    };
  });

  return {
    completedAt: new Date().toISOString(),
    inputs,
    chronologicalAge: Math.round(age),
    fitnessAgeYears,
    percentile,
    raceScore,
    bodyBalanceScore,
    bodyMapRows,
    components: {
      pushupScore,
      pullupScore,
      squatScore,
      runScore,
      bmiScore,
      overallScore,
    },
  };
};

const HomeScreen: React.FC = () => {
  const { mode, toggle } = useThemeMode();
  const isLight = mode === "light";
  const navigation = useNavigation<any>();
  const { savePr } = useExercisePrs();
  const { accessToken, refreshAccessToken, signOut } = useAuth();
  const auth = useMemo(
    () => ({ accessToken, refreshAccessToken, signOut }),
    [accessToken, refreshAccessToken, signOut],
  );
  const {
    summary,
    loading: metricsLoading,
    error: metricsError,
    reload: reloadMetrics,
  } = useDashboardSummary();
  const { profile } = useUserProfileBasic();
  const { activeUserPlan } = useActiveUserPlan();
  const activePlanId = profile?.profile.active_plan_id ?? null;
  const activePlanSessionsPerWeek =
    activeUserPlan?.plan.id === activePlanId
      ? activeUserPlan.plan_version?.sessions_per_week ??
        activeUserPlan.sessions_per_week
      : null;
  const fitnessTestStorageKey = profile?.id
    ? `fitness_test_result_v1_${profile.id}`
    : "fitness_test_result_v1_guest";
  const {
    plan: activePlan,
    loading: activePlanLoading,
    error: activePlanError,
  } = usePlanDetail(activePlanId, activePlanSessionsPerWeek);
  const [fitnessTestInputs, setFitnessTestInputs] =
    useState<FitnessTestInputs>(() => getDefaultFitnessTestInputs());
  const [fitnessTestResult, setFitnessTestResult] =
    useState<FitnessTestResult | null>(null);
  const [pendingFitnessTestResult, setPendingFitnessTestResult] =
    useState<FitnessTestResult | null>(null);
  const [isFitnessTestHydrated, setIsFitnessTestHydrated] = useState(false);
  const [isFitnessTestModalVisible, setIsFitnessTestModalVisible] =
    useState(false);
  const [isCustomWorkoutVisible, setIsCustomWorkoutVisible] = useState(false);
  const [customWorkoutGroups, setCustomWorkoutGroups] = useState<string[]>([]);
  const [customWorkoutExerciseCount, setCustomWorkoutExerciseCount] =
    useState("4");
  const [customWorkoutDuration, setCustomWorkoutDuration] = useState("45");
  const [customWorkoutCardio, setCustomWorkoutCardio] = useState(false);
  const [customWorkoutSaving, setCustomWorkoutSaving] = useState(false);
  const [customWorkoutError, setCustomWorkoutError] = useState<string | null>(
    null,
  );
  const [fitnessTestPhase, setFitnessTestPhase] = useState<
    "form" | "calculating" | "complete"
  >("form");
  const [fitnessTestCalculationStep, setFitnessTestCalculationStep] =
    useState(0);
  const [fitnessTestError, setFitnessTestError] = useState<string | null>(null);
  const [activeInsightComparisonKey, setActiveInsightComparisonKey] =
    useState("consistency");

  const [homeActiveTab, setHomeActiveTab] = useState<"workouts" | "nutrition">(
    "workouts",
  );
  const [isAllActiveSheetVisible, setIsAllActiveSheetVisible] = useState(false);
  const [activeExerciseName, setActiveExerciseName] = useState<string | null>(
    null,
  );
  const [demoExerciseIds, setDemoExerciseIds] = useState<
    Record<string, string>
  >({});
  const [allActiveTab, setAllActiveTab] = useState<"workouts" | "nutrition">(
    "workouts",
  );

  const {
    items: workoutHistoryItems,
    loading: workoutHistoryLoading,
    error: workoutHistoryError,
    reload: reloadWorkoutHistory,
  } = useWorkoutHistory();

  const [isWorkoutHistoryVisible, setIsWorkoutHistoryVisible] = useState(false);

  useEffect(() => {
    setFitnessTestInputs((prev) => {
      if (fitnessTestResult) return prev;
      return {
        ...prev,
        heightCm:
          profile?.profile.height_cm != null
            ? String(Math.round(profile.profile.height_cm))
            : prev.heightCm,
        weightKg:
          profile?.profile.weight_kg != null
            ? String(Math.round(profile.profile.weight_kg))
            : prev.weightKg,
      };
    });
  }, [
    fitnessTestResult,
    profile?.profile.height_cm,
    profile?.profile.weight_kg,
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadFitnessTestResult = async () => {
      setIsFitnessTestHydrated(false);
      try {
        const stored = await SecureStore.getItemAsync(fitnessTestStorageKey);
        if (!isMounted) return;
        if (stored) {
          const parsed = JSON.parse(stored) as FitnessTestResult;
          setFitnessTestResult(parsed);
          setFitnessTestInputs(parsed.inputs);
        } else {
          setFitnessTestResult(null);
        }
      } catch {
        if (isMounted) {
          setFitnessTestResult(null);
        }
      } finally {
        if (isMounted) {
          setIsFitnessTestHydrated(true);
        }
      }
    };

    void loadFitnessTestResult();

    return () => {
      isMounted = false;
    };
  }, [fitnessTestStorageKey]);

  useEffect(() => {
    if (fitnessTestPhase !== "calculating" || !pendingFitnessTestResult) {
      return;
    }

    if (fitnessTestCalculationStep >= FITNESS_TEST_CALCULATION_STEPS.length) {
      setFitnessTestResult(pendingFitnessTestResult);
      setFitnessTestInputs(pendingFitnessTestResult.inputs);
      setPendingFitnessTestResult(null);
      setFitnessTestPhase("complete");
      SecureStore.setItemAsync(
        fitnessTestStorageKey,
        JSON.stringify(pendingFitnessTestResult),
      ).catch(() => {
        // Local persistence is helpful, but the calculated result is already
        // applied in memory if secure storage is unavailable.
      });
      return;
    }

    const timeout = setTimeout(() => {
      setFitnessTestCalculationStep((prev) => prev + 1);
      Haptics.selectionAsync().catch(() => {
        // best-effort haptics
      });
    }, 720);

    return () => clearTimeout(timeout);
  }, [
    fitnessTestCalculationStep,
    fitnessTestPhase,
    fitnessTestStorageKey,
    pendingFitnessTestResult,
  ]);

  const [completedWorkouts, setCompletedWorkouts] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    for (const item of SAMPLE_ACTIVE_WORKOUTS) {
      if (item.progressPercent >= 100) {
        initial[item.id] = true;
      }
    }
    return initial;
  });

  const [completedNutritions, setCompletedNutritions] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    for (const item of SAMPLE_ACTIVE_NUTRITIONS) {
      if (item.progressPercent >= 100) {
        initial[item.id] = true;
      }
    }
    return initial;
  });

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(() =>
    getMonthWeekIndex(new Date()),
  );

  const [exercisePrInputs, setExercisePrInputs] = useState<
    Record<string, { weight: string; sets: string }>
  >({});
  const [savedExercisePrs, setSavedExercisePrs] = useState<
    Record<string, boolean>
  >({});

  const calendar = summary?.calendar as any | null;
  const trainingDays =
    calendar != null
      ? buildMonthCalendarDaysFromDashboard(currentMonth, calendar)
      : buildSampleMonthCalendarDays(currentMonth);

  const todayDate = new Date();
  const todayIso = toISODate(todayDate);

  const activeWorkoutItems = useMemo(
    () =>
      buildActiveWorkoutsFromPlan(activePlan, workoutHistoryItems, todayIso),
    [activePlan, workoutHistoryItems, todayIso],
  );

  useEffect(() => {
    let isMounted = true;
    const names = activeWorkoutItems.flatMap((item) =>
      (item.exerciseSegments ?? []).map((segment) => segment.label),
    );

    if (!names.length) {
      setDemoExerciseIds({});
      return;
    }

    void loadExerciseDemoIds(names).then((ids) => {
      if (isMounted) {
        setDemoExerciseIds(ids);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeWorkoutItems]);

  const activeNutritionItems = useMemo(
    () => buildActiveNutritionsFromPlan(activePlan),
    [activePlan],
  );
  // Seed completion state for active workouts based on workout history
  useEffect(() => {
    if (!activeWorkoutItems.length || !workoutHistoryItems.length) {
      return;
    }

    const seeded: Record<string, boolean> = {};
    for (const item of activeWorkoutItems) {
      const weekNumber = item.planWeekNumber ?? null;
      const dayIndex = item.planDayIndex ?? null;
      if (!weekNumber || !dayIndex) continue;

      const matchingEntry = workoutHistoryItems.find(
        (entry) =>
          entry.status === "completed" &&
          entry.week_number === weekNumber &&
          entry.scheduled_day_index === dayIndex,
      );

      if (matchingEntry) {
        seeded[item.id] = true;
      }
    }

    if (Object.keys(seeded).length > 0) {
      setCompletedWorkouts((prev) => ({ ...prev, ...seeded }));
    }
  }, [activeWorkoutItems, workoutHistoryItems]);

  const activeItems =
    homeActiveTab === "workouts" ? activeWorkoutItems : activeNutritionItems;

  const maxPlanDayIndex = useMemo(() => {
    if (!activePlan) return null;
    let max = 0;
    for (const week of activePlan.weeks) {
      for (const day of week.days) {
        if (typeof day.day === "number") {
          max = Math.max(max, day.day);
        }
      }
    }
    return max > 0 ? max : null;
  }, [activePlan]);

  const isActivePlanFinished = useMemo(() => {
    if (!maxPlanDayIndex) return false;
    return workoutHistoryItems.some(
      (entry) =>
        typeof entry.scheduled_day_index === "number" &&
        entry.scheduled_day_index >= maxPlanDayIndex &&
        (entry.status === "completed" || entry.status === "missed") &&
        entry.date <= todayIso,
    );
  }, [maxPlanDayIndex, todayIso, workoutHistoryItems]);

  const shouldShowWorkoutSetup =
    homeActiveTab === "workouts" &&
    (!activePlanId ||
      (!activePlanLoading && !activePlan) ||
      isActivePlanFinished);

  const planDayTypeByWeekday = useMemo<Record<
    number,
    PlanDayDetail["type"]
  > | null>(() => {
    if (!activePlan) return null;
    const map: Record<number, PlanDayDetail["type"]> = {};
    for (const week of activePlan.weeks) {
      for (const day of week.days) {
        const idx = day.day;
        if (idx >= 1 && idx <= 7 && !map[idx]) {
          map[idx] = day.type;
        }
      }
    }
    return map;
  }, [activePlan]);

  const monthLabel = MONTH_LABELS[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
  const monthSlots: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i += 1) {
    monthSlots.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    monthSlots.push(new Date(year, monthIndex, day));
  }
  while (monthSlots.length % 7 !== 0) {
    monthSlots.push(null);
  }
  const monthWeeks: (Date | null)[][] = [];
  for (let i = 0; i < monthSlots.length; i += 7) {
    monthWeeks.push(monthSlots.slice(i, i + 7));
  }
  const selectedWeekDates = monthWeeks[selectedWeekIndex] ?? monthWeeks[0] ?? [];
  const selectedWeekLabel = `${monthLabel}, Week ${selectedWeekIndex + 1}`;

  const todayWeekday = todayDate.getDay(); // 0 (Sun) - 6 (Sat)
  const todayPlanDayIndex = todayWeekday === 0 ? 7 : todayWeekday;
  const todayPlannedWorkoutType =
    planDayTypeByWeekday?.[todayPlanDayIndex] ?? null;

  const [activeMetricTooltip, setActiveMetricTooltip] = useState<
    null | "fitness_age" | "race_readiness" | "percentile" | "body_battle_map"
  >(null);
  const [activeBodyBattleGroup, setActiveBodyBattleGroup] = useState<
    string | null
  >(null);

  const calendarRangeStart: string | null =
    calendar && typeof calendar.range_start === "string"
      ? (calendar.range_start as string)
      : null;
  const calendarRangeEnd: string | null =
    calendar && typeof calendar.range_end === "string"
      ? (calendar.range_end as string)
      : null;

  const metrics = summary?.metrics;
  const hasBackendAssessment =
    metrics?.fitness_age?.detail?.source === "assessment_activity_adjusted";
  const hasCompletedFitnessTest = fitnessTestResult != null || hasBackendAssessment;
  const hasMetricEstimate = Boolean(
    metrics?.fitness_age?.available ||
      metrics?.percentile_rank?.available ||
      metrics?.race_readiness?.available ||
      metrics?.body_battle_map?.available,
  );
  const isFitnessTestLocked = !hasCompletedFitnessTest && !hasMetricEstimate;
  const fitness = fitnessTestResult
    ? {
        fitness_age_years: fitnessTestResult.fitnessAgeYears,
        chronological_age: fitnessTestResult.chronologicalAge,
      }
    : metrics?.fitness_age ?? null;
  const race = fitnessTestResult
    ? {
        score: fitnessTestResult.raceScore,
        detail: {
          components: {
            energy_score: fitnessTestResult.components.bmiScore,
            run_1km_score: fitnessTestResult.components.runScore,
            wall_balls_score: fitnessTestResult.components.squatScore,
            sled_score: Math.round(
              (fitnessTestResult.components.pushupScore +
                fitnessTestResult.components.pullupScore) /
                2,
            ),
          },
        },
      }
    : metrics?.race_readiness ?? null;
  const percentile = fitnessTestResult
    ? { percentile: fitnessTestResult.percentile }
    : metrics?.percentile_rank ?? null;
  const streak = metrics?.streak;
  const totalTime = metrics?.total_time;
  const bodyBattle = fitnessTestResult
    ? {
        balance_score: fitnessTestResult.bodyBalanceScore,
        detail: {
          groups: fitnessTestResult.bodyMapRows.reduce<Record<string, any>>(
            (acc, row) => {
              acc[row.key] = {
                rank: row.rank,
                sessions: row.sessions,
              };
              return acc;
            },
            {},
          ),
        },
      }
    : metrics?.body_battle_map ?? null;

  const fitnessAgeValue =
    typeof fitness?.fitness_age_years === "number"
      ? `${fitness.fitness_age_years} yrs`
      : metricsLoading && !isFitnessTestLocked
        ? "Loading…"
        : "—";

  let fitnessAgeDelta: string | null = null;
  let fitnessAgeDeltaTone:
    | "positive"
    | "negative"
    | "neutral"
    | "error"
    | null = null;
  if (metricsError) {
    fitnessAgeDelta = "Unable to load";
    fitnessAgeDeltaTone = "error";
  } else if (
    fitness?.chronological_age != null &&
    typeof fitness?.fitness_age_years === "number"
  ) {
    const diff = fitness.chronological_age - fitness.fitness_age_years;
    if (diff > 1) {
      fitnessAgeDelta = `${Math.round(diff)} yrs younger`;
      fitnessAgeDeltaTone = "positive";
    } else if (diff < -1) {
      fitnessAgeDelta = `${Math.abs(Math.round(diff))} yrs older`;
      fitnessAgeDeltaTone = "negative";
    } else {
      fitnessAgeDelta = "On track";
      fitnessAgeDeltaTone = "neutral";
    }
  }

  const raceScoreValue =
    typeof race?.score === "number"
      ? `${Math.round(race.score)} / 100`
      : metricsLoading && !isFitnessTestLocked
        ? "Loading…"
        : "—";

  let raceScoreLabel: string | null = null;
  let raceScoreTone: "positive" | "negative" | "neutral" | "error" | null =
    null;
  if (metricsError) {
    raceScoreLabel = "Unable to load";
    raceScoreTone = "error";
  } else if (typeof race?.score === "number") {
    if (race.score >= 80) {
      raceScoreLabel = "Race ready";
      raceScoreTone = "positive";
    } else if (race.score >= 60) {
      raceScoreLabel = "Solid base";
      raceScoreTone = "neutral";
    } else if (race.score >= 40) {
      raceScoreLabel = "Building base";
      raceScoreTone = "negative";
    } else {
      raceScoreLabel = "Early days";
      raceScoreTone = "negative";
    }
  }

  let percentileLabel: string | null = null;
  let percentileTone: "positive" | "negative" | "neutral" | "error" | null =
    null;
  if (metricsError) {
    percentileLabel = "Unable to load";
    percentileTone = "error";
  } else if (typeof percentile?.percentile === "number") {
    const p = percentile.percentile;
    if (p >= 80) {
      const topShare = 100 - Math.round(p);
      percentileLabel = `Top ${Math.max(topShare, 1)}% of peers`;
      percentileTone = "positive";
    } else if (p >= 50) {
      percentileLabel = "Above average";
      percentileTone = "positive";
    } else if (p >= 30) {
      percentileLabel = "Around average";
      percentileTone = "neutral";
    } else {
      percentileLabel = "Below average";
      percentileTone = "negative";
    }
  }

  let percentileDeltaColor: string | undefined;
  if (percentileTone === "positive") {
    percentileDeltaColor = GLASS_ACCENT_GREEN_SOFT;
  } else if (percentileTone === "negative" || percentileTone === "error") {
    percentileDeltaColor = isLight ? LIGHT_ACCENT_ORANGE : DARK_ACCENT_ORANGE;
  } else if (percentileTone === "neutral") {
    percentileDeltaColor = isLight ? LIGHT_TEXT_MUTED : GLASS_TEXT_MUTED;
  }

  const chronologicalAge =
    typeof fitness?.chronological_age === "number"
      ? fitness.chronological_age
      : null;

  const racePercent =
    typeof race?.score === "number" ? Math.round(race.score) : null;
  const racePercentDisplay =
    racePercent != null
      ? `${racePercent}%`
      : metricsLoading && !isFitnessTestLocked
        ? "Loading…"
        : "—";
  const raceGaugeProgress =
    racePercent != null ? Math.max(0, Math.min(1, racePercent / 100)) : null;
  const fitnessAgeYears =
    typeof fitness?.fitness_age_years === "number"
      ? Math.round(fitness.fitness_age_years)
      : null;
  const fitnessAgeGaugeProgress =
    fitnessAgeYears != null
      ? Math.max(
          0.08,
          Math.min(
            1,
            chronologicalAge != null
              ? 0.5 + (chronologicalAge - fitnessAgeYears) / 20
              : (80 - fitnessAgeYears) / 60,
          ),
        )
      : null;

  const raceDetail: any = race?.detail;
  const racePlanPercent =
    raceDetail && typeof raceDetail.plan_progress_pct === "number"
      ? raceDetail.plan_progress_pct
      : null;

  let raceConsistencyPercent: number | null = null;
  let raceBenchmarksPercent: number | null = null;
  if (raceDetail && raceDetail.components) {
    const components = raceDetail.components as any;
    if (typeof components.energy_score === "number") {
      raceConsistencyPercent = components.energy_score;
    }
    const scores: number[] = [];
    if (typeof components.run_1km_score === "number") {
      scores.push(components.run_1km_score);
    }
    if (typeof components.wall_balls_score === "number") {
      scores.push(components.wall_balls_score);
    }
    if (typeof components.sled_score === "number") {
      scores.push(components.sled_score);
    }
    if (scores.length > 0) {
      raceBenchmarksPercent =
        scores.reduce((sum, v) => sum + v, 0) / scores.length;
    }
  }

  const percentilePercent =
    typeof percentile?.percentile === "number"
      ? Math.round(percentile.percentile)
      : null;
  const percentilePercentDisplay =
    percentilePercent != null
      ? `${percentilePercent}%`
      : metricsLoading && !isFitnessTestLocked
        ? "Loading…"
        : "—";

  const formatMinutesShort = (minutes: number | null | undefined): string => {
    if (typeof minutes !== "number") {
      return metricsLoading ? "Loading…" : "—";
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h${mins ? ` ${mins}m` : ""}`;
    }
    return `${mins}m`;
  };

  const streakCurrentDays =
    typeof streak?.current_streak_days === "number"
      ? streak.current_streak_days
      : null;
  const streakLongestDays =
    typeof streak?.longest_streak_days === "number"
      ? streak.longest_streak_days
      : null;
  const streakMultiplier =
    typeof streak?.multiplier === "number" ? streak.multiplier : null;

  const streakCurrentLabel =
    streakCurrentDays != null
      ? `${streakCurrentDays} day${streakCurrentDays === 1 ? "" : "s"}`
      : metricsLoading
        ? "Loading…"
        : "—";
  const streakBestLabel =
    streakLongestDays != null ? `Best: ${streakLongestDays}d` : null;
  const streakMultiplierLabel =
    streakMultiplier != null ? `${streakMultiplier.toFixed(1)}x` : null;

  const totalTimeAllLabel = formatMinutesShort(
    (totalTime?.total_minutes_all_time ?? null) as number | null,
  );
  const totalTime30dLabel = formatMinutesShort(
    (totalTime?.total_minutes_30d ?? null) as number | null,
  );
  const totalTime7dLabel = formatMinutesShort(
    (totalTime?.total_minutes_7d ?? null) as number | null,
  );

  const totalMinutesAllTime =
    typeof totalTime?.total_minutes_all_time === "number"
      ? totalTime.total_minutes_all_time
      : null;
  const totalTimeAllHours =
    totalMinutesAllTime != null ? Math.floor(totalMinutesAllTime / 60) : null;
  const totalTimeAllMinutes =
    totalMinutesAllTime != null ? totalMinutesAllTime % 60 : null;

  const bodyBalanceScore =
    typeof bodyBattle?.balance_score === "number"
      ? Math.round(bodyBattle.balance_score)
      : null;
  const bodyBalanceDisplay =
    bodyBalanceScore != null
      ? `${bodyBalanceScore} / 100`
      : metricsLoading && !isFitnessTestLocked
        ? "Loading…"
        : "—";
  let bodyBalanceLabel: string | null = null;
  if (metricsError) {
    bodyBalanceLabel = "Unable to load";
  } else if (typeof bodyBattle?.balance_score === "number") {
    const score = bodyBattle.balance_score;
    if (score >= 80) {
      bodyBalanceLabel = "Legendary balance";
    } else if (score >= 60) {
      bodyBalanceLabel = "Balanced";
    } else if (score > 0) {
      bodyBalanceLabel = "Focus on weak spots";
    }
  }

  type BodyMapRow = {
    key: string;
    label: string;
    rank: string;
    color: string;
    sessions: number;
  };

  const bodyBattleGroups: Record<string, any> | null =
    !metricsError && bodyBattle?.detail && (bodyBattle.detail as any).groups
      ? ((bodyBattle.detail as any).groups as Record<string, any>)
      : null;

  const realBodyMapRows: BodyMapRow[] = BODY_BATTLE_GROUP_ORDER.map(
    (gKey): BodyMapRow => {
      const info = bodyBattleGroups?.[gKey] || {};
      const rank: string = info.rank || "Recruit";
      const label = BODY_BATTLE_CANONICAL_LABELS[gKey] ?? gKey;
      const sessions: number =
        typeof info.sessions === "number" ? info.sessions : 0;
      const color =
        BODY_BATTLE_RANK_COLORS[rank] ?? BODY_BATTLE_RANK_COLORS["Recruit"];
      return { key: gKey, label, rank, color, sessions };
    },
  );

  const recruitBodyMapRows: BodyMapRow[] = BODY_BATTLE_GROUP_ORDER.map(
    (gKey): BodyMapRow => {
      const label = BODY_BATTLE_CANONICAL_LABELS[gKey] ?? gKey;
      const rank = "Recruit";
      const sessions = 0;
      const color =
        BODY_BATTLE_RANK_COLORS[rank] ?? BODY_BATTLE_RANK_COLORS["Recruit"];
      return { key: gKey, label, rank, color, sessions };
    },
  );

  const bodyMapRows: BodyMapRow[] =
    bodyBattleGroups ? realBodyMapRows : recruitBodyMapRows;

  const trainingProfile = metrics?.training_profile;
  const bodyMapUpdatedAt = formatDashboardUpdatedAt(
    typeof (bodyBattle?.detail as any)?.updated_at === "string"
      ? (bodyBattle?.detail as any).updated_at
      : trainingProfile?.updated_at,
  );
  const insightLevel = trainingProfile?.level ?? {
    level: 1,
    title: "Rookie",
    career_xp: 0,
    current_level_xp: 0,
    next_level_xp: 1000,
    progress_percent: 0,
  };
  const insightCategoryMetrics: InsightMetric[] =
    trainingProfile?.category_levels?.length
      ? trainingProfile.category_levels.map((item: any) => ({
          key: item.key,
          label: item.label,
          metric_type: item.metric_type || "training_category",
          xp: Number(item.xp) || 0,
          target_xp: Number(item.target_xp) || 500,
          percent: Number(item.percent) || 0,
          tier: item.tier,
          icon: item.icon,
          accent: item.accent || "#2454F4",
        }))
      : [
          {
            key: "strength",
            label: "Strength",
            metric_type: "training_category",
            xp: 0,
            target_xp: 500,
            percent: 0,
            tier: "Bronze",
            icon: "barbell-outline",
            accent: "#2454F4",
          },
          {
            key: "cardio",
            label: "Cardio",
            metric_type: "training_category",
            xp: 0,
            target_xp: 500,
            percent: 0,
            tier: "Bronze",
            icon: "pulse-outline",
            accent: "#22C9D8",
          },
          {
            key: "conditioning",
            label: "Conditioning",
            metric_type: "training_category",
            xp: 0,
            target_xp: 500,
            percent: 0,
            tier: "Bronze",
            icon: "flash-outline",
            accent: "#20DDBB",
          },
          {
            key: "mobility",
            label: "Mobility",
            metric_type: "training_category",
            xp: 0,
            target_xp: 500,
            percent: 0,
            tier: "Bronze",
            icon: "accessibility-outline",
            accent: "#7867F2",
          },
          {
            key: "sport",
            label: "Sport",
            metric_type: "training_category",
            xp: 0,
            target_xp: 500,
            percent: 0,
            tier: "Bronze",
            icon: "football-outline",
            accent: "#86A5F4",
          },
        ];
  const insightComparisonMetrics: InsightComparisonMetric[] =
    trainingProfile?.comparison_metrics?.metrics?.length
      ? trainingProfile.comparison_metrics.metrics.map((item: any) => ({
          key: String(item.key || "metric"),
          label: String(item.label || "Metric"),
          unit: String(item.unit || ""),
          description: item.description,
          current: Number(item.current) || 0,
          average: Number(item.average) || 0,
          ideal: Number(item.ideal) || 0,
          trend: Array.isArray(item.trend)
            ? item.trend.map((point: any) => ({
                label: String(point.label || ""),
                you: Number(point.you) || 0,
                average: Number(point.average) || 0,
                ideal: Number(point.ideal) || 0,
              }))
            : [],
        }))
      : [
          {
            key: "consistency",
            label: "Weekly consistency",
            unit: "%",
            description: "Weeks with enough active training days against average users and a healthy ideal.",
            current: Math.round(trainingProfile?.performance_score ?? 0),
            average: 40,
            ideal: 75,
            trend: [
              { label: "W-5", you: 0, average: 40, ideal: 75 },
              { label: "W-4", you: 0, average: 40, ideal: 75 },
              { label: "W-3", you: 0, average: 40, ideal: 75 },
              { label: "W-2", you: 0, average: 40, ideal: 75 },
              { label: "W-1", you: 0, average: 40, ideal: 75 },
              { label: "Now", you: Math.round(trainingProfile?.performance_score ?? 0), average: 40, ideal: 75 },
            ],
          },
        ];

  const handlePressRaceReadiness = () => {
    if (isFitnessTestLocked) {
      openFitnessTest();
      return;
    }
    setActiveMetricTooltip("race_readiness");
  };

  const handlePressFitnessAge = () => {
    if (isFitnessTestLocked) {
      openFitnessTest();
      return;
    }
    setActiveMetricTooltip("fitness_age");
  };

  const handlePressPercentile = () => {
    if (isFitnessTestLocked) {
      openFitnessTest();
      return;
    }
    setActiveMetricTooltip("percentile");
  };

  const handlePressBodyBattleMap = () => {
    if (isFitnessTestLocked) {
      openFitnessTest();
      return;
    }
    setActiveMetricTooltip("body_battle_map");
  };

  const handleBodyMapSelectionChange = (selection: MuscleSelection) => {
    const groupKey = MUSCLE_TO_BODY_BATTLE_GROUP[selection.muscle];
    if (!groupKey) return;
    if (selection.active) {
      setActiveBodyBattleGroup(groupKey);
    } else {
      setActiveBodyBattleGroup((prev) => (prev === groupKey ? null : prev));
    }
  };

  const toggleItemCompleted = async (
    kind: "workouts" | "nutrition",
    id: string,
  ) => {
    if (kind === "workouts") {
      const workoutItem = activeWorkoutItems.find((item) => item.id === id);

      if (
        activePlan &&
        workoutItem &&
        accessToken &&
        !completedWorkouts[id] &&
        (workoutItem.planDayId ||
          (workoutItem.planWeekNumber && workoutItem.planDayIndex))
      ) {
        try {
          const payload: Record<string, unknown> = {};
          if (workoutItem.planDayId) {
            payload.plan_day_id = workoutItem.planDayId;
          } else {
            payload.plan_id = activePlan.id;
            payload.plan_week_number = workoutItem.planWeekNumber;
            payload.plan_day_index = workoutItem.planDayIndex;
          }

          const response = await fetchRequiredAuth("/plans/complete-day/", auth, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            try {
              const errorText = await response.text();
              console.error(
                "Failed to complete plan day:",
                response.status,
                errorText,
              );
            } catch (e) {
              console.error(
                "Failed to complete plan day (unable to read body):",
                response.status,
              );
            }
            return;
          }

          setCompletedWorkouts((prev) => ({
            ...prev,
            [id]: true,
          }));

          invalidateWorkoutData();
          reloadMetrics();
          reloadWorkoutHistory();
          return;
        } catch (err) {
          console.error("Error calling /plans/complete-day/:", err);
          return;
        }
      }

      setCompletedWorkouts((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    } else {
      setCompletedNutritions((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    }
  };

  const toggleCustomWorkoutGroup = (group: string) => {
    setCustomWorkoutError(null);
    setCustomWorkoutGroups((prev) =>
      prev.includes(group)
        ? prev.filter((item) => item !== group)
        : [...prev, group],
    );
  };

  const submitCustomWorkout = async () => {
    if (!customWorkoutGroups.length && !customWorkoutCardio) {
      setCustomWorkoutError("Select a body part or cardio.");
      return;
    }
    if (!accessToken) {
      setCustomWorkoutError("Sign in again to log this workout.");
      return;
    }

    setCustomWorkoutSaving(true);
    setCustomWorkoutError(null);
    try {
      const payload = {
        body_groups: customWorkoutGroups,
        exercise_count: Number(customWorkoutExerciseCount) || 0,
        duration_minutes: Number(customWorkoutDuration) || 30,
        cardio: customWorkoutCardio,
      };

      const response = await fetchRequiredAuth("/workouts/custom/", auth, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setCustomWorkoutError(data?.detail || "Could not log workout.");
        return;
      }

      setIsCustomWorkoutVisible(false);
      setCustomWorkoutGroups([]);
      setCustomWorkoutCardio(false);
      setCustomWorkoutExerciseCount("4");
      setCustomWorkoutDuration("45");
      invalidateWorkoutData();
      reloadMetrics();
      reloadWorkoutHistory();
    } catch {
      setCustomWorkoutError("Could not log workout.");
    } finally {
      setCustomWorkoutSaving(false);
    }
  };

  const updateExercisePrInput = (
    segmentId: string,
    field: "weight" | "sets",
    value: string,
  ) => {
    setExercisePrInputs((prev) => ({
      ...prev,
      [segmentId]: {
        weight: field === "weight" ? value : (prev[segmentId]?.weight ?? ""),
        sets: field === "sets" ? value : (prev[segmentId]?.sets ?? ""),
      },
    }));
  };

  const handleSaveExercisePr = (
    segmentId: string,
    segmentLabel: string,
    basePrimary: string,
    baseSecondary: string | undefined,
    workoutTitle: string,
  ) => {
    setSavedExercisePrs((prev) => ({
      ...prev,
      [segmentId]: true,
    }));
    const pr = exercisePrInputs[segmentId] ?? { weight: "", sets: "" };
    savePr({
      segmentId,
      exerciseLabel: segmentLabel,
      workoutTitle,
      basePrimary,
      baseSecondary,
      prWeight: pr.weight,
      prSets: pr.sets,
      savedAt: Date.now(),
    });
  };

  const handlePrevWeek = () => {
    if (selectedWeekIndex > 0) {
      setSelectedWeekIndex((prev) => prev - 1);
      return;
    }

    setCurrentMonth((prev) => {
      const next = addMonths(prev, -1);
      setSelectedWeekIndex(Math.max(0, getMonthWeekCount(next) - 1));
      return next;
    });
  };

  const handleNextWeek = () => {
    if (selectedWeekIndex < monthWeeks.length - 1) {
      setSelectedWeekIndex((prev) => prev + 1);
      return;
    }

    setCurrentMonth((prev) => {
      const next = addMonths(prev, 1);
      setSelectedWeekIndex(0);
      return next;
    });
  };

  const openFitnessTest = () => {
    setFitnessTestError(null);
    setPendingFitnessTestResult(null);
    setFitnessTestCalculationStep(0);
    setFitnessTestPhase("form");
    setIsFitnessTestModalVisible(true);
  };

  const closeFitnessTest = () => {
    if (fitnessTestPhase === "calculating") return;
    setIsFitnessTestModalVisible(false);
  };

  const updateFitnessTestInput = (
    key: keyof FitnessTestInputs,
    value: string,
  ) => {
    setFitnessTestError(null);
    setFitnessTestInputs((prev) => ({
      ...prev,
      [key]: value.replace(/[^0-9.]/g, ""),
    }));
  };

  const startFitnessTestCalculation = () => {
    const requiredFields: (keyof FitnessTestInputs)[] = [
      "age",
      "heightCm",
      "weightKg",
      "pushups",
      "pullups",
      "squats",
      "runMinutes",
    ];
    const hasMissingField = requiredFields.some(
      (field) => fitnessTestInputs[field].trim().length === 0,
    );
    if (hasMissingField) {
      setFitnessTestError("Fill each test input so the score is reliable.");
      return;
    }

    const result = calculateFitnessTestResult(fitnessTestInputs);
    setFitnessTestError(null);
    setPendingFitnessTestResult(result);
    setFitnessTestCalculationStep(0);
    setFitnessTestPhase("calculating");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // best-effort haptics
    });
  };

  const finishFitnessTest = () => {
    setIsFitnessTestModalVisible(false);
    setFitnessTestPhase("form");
  };

  const renderFitnessTestField = (
    key: keyof FitnessTestInputs,
    label: string,
    suffix: string,
    iconName: React.ComponentProps<typeof Ionicons>["name"],
  ) => (
    <View
      key={key}
      style={[
        styles.fitnessTestInputCard,
        isLight && styles.fitnessTestInputCardLight,
      ]}
    >
      <View style={styles.fitnessTestInputLabelRow}>
        <Ionicons
          name={iconName}
          size={16}
          color={isLight ? "#0070cc" : "#7DD3FC"}
        />
        <Text
          style={[
            styles.fitnessTestInputLabel,
            isLight && styles.fitnessTestInputLabelLight,
          ]}
        >
          {label}
        </Text>
      </View>
      <View
        style={[
          styles.fitnessTestValueRow,
          isLight && styles.fitnessTestValueRowLight,
        ]}
      >
        <TextInput
          value={fitnessTestInputs[key]}
          onChangeText={(value) => updateFitnessTestInput(key, value)}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={isLight ? "#94A3B8" : "#64748B"}
          style={[
            styles.fitnessTestInput,
            isLight && styles.fitnessTestInputLight,
          ]}
        />
        <Text
          style={[
            styles.fitnessTestInputSuffix,
            isLight && styles.fitnessTestInputSuffixLight,
          ]}
        >
          {suffix}
        </Text>
      </View>
    </View>
  );

  const renderFitnessTestModal = () => (
    <Modal
      visible={isFitnessTestModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeFitnessTest}
    >
      <View style={styles.fitnessTestModalBackdrop}>
        <View
          style={[
            styles.fitnessTestModalCard,
            isLight && styles.fitnessTestModalCardLight,
          ]}
        >
          <View style={styles.fitnessTestHeaderRow}>
            <View>
              <Text
                style={[
                  styles.fitnessTestTitle,
                  isLight && styles.fitnessTestTitleLight,
                ]}
              >
                Fitness test
              </Text>
              <Text
                style={[
                  styles.fitnessTestSubtitle,
                  isLight && styles.fitnessTestSubtitleLight,
                ]}
              >
                Quick inputs. Clean dashboard metrics.
              </Text>
            </View>
            {fitnessTestPhase !== "calculating" && (
              <TouchableOpacity
                style={[
                  styles.fitnessTestCloseButton,
                  isLight && styles.fitnessTestCloseButtonLight,
                ]}
                activeOpacity={0.8}
                onPress={closeFitnessTest}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={isLight ? "#0F172A" : "#FFFFFF"}
                />
              </TouchableOpacity>
            )}
          </View>

          {fitnessTestPhase === "form" && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View
                style={[
                  styles.fitnessTestHintCard,
                  isLight && styles.fitnessTestHintCardLight,
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={18}
                  color={isLight ? "#0070cc" : "#7DD3FC"}
                />
                <Text
                  style={[
                    styles.fitnessTestHintText,
                    isLight && styles.fitnessTestHintTextLight,
                  ]}
                >
                  Enter honest numbers from one attempt. The app will unlock
                  fitness age, peer score, readiness, and body-map ranks.
                </Text>
              </View>

              <Text
                style={[
                  styles.fitnessTestSectionLabel,
                  isLight && styles.fitnessTestSectionLabelLight,
                ]}
              >
                Body basics
              </Text>
              <View style={styles.fitnessTestGrid}>
                {renderFitnessTestField("age", "Age", "yrs", "calendar-outline")}
                {renderFitnessTestField(
                  "heightCm",
                  "Height",
                  "cm",
                  "resize-outline",
                )}
                {renderFitnessTestField(
                  "weightKg",
                  "Weight",
                  "kg",
                  "scale-outline",
                )}
              </View>

              <Text
                style={[
                  styles.fitnessTestSectionLabel,
                  isLight && styles.fitnessTestSectionLabelLight,
                ]}
              >
                Strength snapshot
              </Text>
              <View style={styles.fitnessTestGrid}>
                {renderFitnessTestField(
                  "pushups",
                  "Pushups",
                  "reps",
                  "body-outline",
                )}
                {renderFitnessTestField(
                  "pullups",
                  "Pullups",
                  "reps",
                  "barbell-outline",
                )}
                {renderFitnessTestField(
                  "squats",
                  "Squats",
                  "reps",
                  "accessibility-outline",
                )}
              </View>

              <Text
                style={[
                  styles.fitnessTestSectionLabel,
                  isLight && styles.fitnessTestSectionLabelLight,
                ]}
              >
                Easy run
              </Text>
              {renderFitnessTestField(
                "runMinutes",
                "1 km run",
                "min",
                "walk-outline",
              )}

              {fitnessTestError && (
                <Text style={styles.fitnessTestErrorText}>
                  {fitnessTestError}
                </Text>
              )}

              <TouchableOpacity
                style={styles.fitnessTestPrimaryButton}
                activeOpacity={0.9}
                onPress={startFitnessTestCalculation}
              >
                <Text style={styles.fitnessTestPrimaryButtonText}>
                  Calculate metrics
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </ScrollView>
          )}

          {fitnessTestPhase === "calculating" && (
            <View style={styles.fitnessTestCalculationPanel}>
              <View style={styles.fitnessTestPulseRing}>
                <ActivityIndicator size="large" color="#7DD3FC" />
              </View>
              {FITNESS_TEST_CALCULATION_STEPS.map((label, index) => {
                const isDone = index < fitnessTestCalculationStep;
                const isActive = index === fitnessTestCalculationStep;
                return (
                  <View
                    key={label}
                    style={[
                      styles.fitnessTestCalcRow,
                      isActive && styles.fitnessTestCalcRowActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.fitnessTestCalcIcon,
                        isDone && styles.fitnessTestCalcIconDone,
                        isActive && styles.fitnessTestCalcIconActive,
                      ]}
                    >
                      {isDone ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : isActive ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <View style={styles.fitnessTestCalcDot} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.fitnessTestCalcText,
                        isLight && styles.fitnessTestCalcTextLight,
                        isDone && styles.fitnessTestCalcTextDone,
                        isActive && styles.fitnessTestCalcTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {fitnessTestPhase === "complete" && fitnessTestResult && (
            <View style={styles.fitnessTestCompletePanel}>
              <View style={styles.fitnessTestCompleteIcon}>
                <Ionicons name="checkmark" size={28} color="#FFFFFF" />
              </View>
              <Text
                style={[
                  styles.fitnessTestTitle,
                  isLight && styles.fitnessTestTitleLight,
                  { textAlign: "center" },
                ]}
              >
                Test complete
              </Text>
              <Text
                style={[
                  styles.fitnessTestSubtitle,
                  isLight && styles.fitnessTestSubtitleLight,
                  { textAlign: "center", marginTop: 6 },
                ]}
              >
                Your dashboard has been updated with fresh baseline metrics.
              </Text>
              <View style={styles.fitnessTestResultRow}>
                <View
                  style={[
                    styles.fitnessTestResultPill,
                    isLight && styles.fitnessTestResultPillLight,
                  ]}
                >
                  <Text style={styles.fitnessTestResultValue}>
                    {fitnessTestResult.fitnessAgeYears}
                  </Text>
                  <Text
                    style={[
                      styles.fitnessTestResultLabel,
                      isLight && styles.fitnessTestResultLabelLight,
                    ]}
                  >
                    fitness age
                  </Text>
                </View>
                <View
                  style={[
                    styles.fitnessTestResultPill,
                    isLight && styles.fitnessTestResultPillLight,
                  ]}
                >
                  <Text style={styles.fitnessTestResultValue}>
                    {fitnessTestResult.percentile}%
                  </Text>
                  <Text
                    style={[
                      styles.fitnessTestResultLabel,
                      isLight && styles.fitnessTestResultLabelLight,
                    ]}
                  >
                    fitter than
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.fitnessTestPrimaryButton}
                activeOpacity={0.9}
                onPress={finishFitnessTest}
              >
                <Text style={styles.fitnessTestPrimaryButtonText}>
                  View dashboard
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderCustomWorkoutModal = () => (
    <Modal
      visible={isCustomWorkoutVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setIsCustomWorkoutVisible(false)}
    >
      <View style={styles.fitnessTestModalBackdrop}>
        <View
          style={[
            styles.fitnessTestModalCard,
            isLight && styles.fitnessTestModalCardLight,
          ]}
        >
          <View style={styles.fitnessTestHeaderRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={[
                  styles.fitnessTestTitle,
                  isLight && styles.fitnessTestTitleLight,
                ]}
              >
                Log custom workout
              </Text>
              <Text
                style={[
                  styles.fitnessTestSubtitle,
                  isLight && styles.fitnessTestSubtitleLight,
                ]}
              >
                Track what you trained today without building a full exercise
                list.
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.fitnessTestCloseButton,
                isLight && styles.fitnessTestCloseButtonLight,
              ]}
              onPress={() => setIsCustomWorkoutVisible(false)}
            >
              <Ionicons
                name="close"
                size={18}
                color={isLight ? "#0F172A" : "#F8FAFC"}
              />
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.fitnessTestSectionLabel,
              isLight && styles.fitnessTestSectionLabelLight,
            ]}
          >
            Body parts covered
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {CUSTOM_WORKOUT_GROUPS.map((group) => {
              const selected = customWorkoutGroups.includes(group.key);
              return (
                <TouchableOpacity
                  key={group.key}
                  activeOpacity={0.84}
                  onPress={() => toggleCustomWorkoutGroup(group.key)}
                  style={[
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderRadius: 999,
                      marginRight: 8,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: isLight ? "#E2E8F0" : "rgba(148,163,184,0.2)",
                      backgroundColor: isLight ? "#F8FAFC" : "rgba(255,255,255,0.05)",
                    },
                    selected && {
                      backgroundColor: isLight ? "#0F172A" : "#F8FAFC",
                      borderColor: isLight ? "#0F172A" : "#F8FAFC",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected
                        ? isLight
                          ? "#FFFFFF"
                          : "#0F172A"
                        : isLight
                          ? "#334155"
                          : "#CBD5E1",
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {group.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={() => setCustomWorkoutCardio((prev) => !prev)}
            style={[
              styles.fitnessTestHintCard,
              isLight && styles.fitnessTestHintCardLight,
              { alignItems: "center", marginTop: 4 },
            ]}
          >
            <Ionicons
              name={customWorkoutCardio ? "checkbox" : "square-outline"}
              size={20}
              color={isLight ? "#0F172A" : "#E5E7EB"}
            />
            <Text
              style={[
                styles.fitnessTestHintText,
                isLight && styles.fitnessTestHintTextLight,
                { marginLeft: 10 },
              ]}
            >
              Included cardio
            </Text>
          </TouchableOpacity>

          <View style={styles.fitnessTestGrid}>
            {([
              ["exercise_count", "Exercises", customWorkoutExerciseCount, setCustomWorkoutExerciseCount],
              ["duration_minutes", "Duration", customWorkoutDuration, setCustomWorkoutDuration],
            ] as const).map((field) => (
              <View key={field[0]} style={styles.fitnessTestInputCard}>
                <Text
                  style={[
                    styles.fitnessTestInputLabel,
                    isLight && styles.fitnessTestInputLabelLight,
                    { marginLeft: 0, marginBottom: 7 },
                  ]}
                >
                  {field[1]}
                </Text>
                <View
                  style={[
                    styles.fitnessTestValueRow,
                    isLight && styles.fitnessTestValueRowLight,
                  ]}
                >
                  <TextInput
                    value={field[2]}
                    onChangeText={(value) => field[3](value.replace(/[^0-9]/g, ""))}
                    keyboardType="numeric"
                    style={[
                      styles.fitnessTestInput,
                      isLight && styles.fitnessTestInputLight,
                    ]}
                  />
                  <Text
                    style={[
                      styles.fitnessTestInputSuffix,
                      isLight && styles.fitnessTestInputSuffixLight,
                    ]}
                  >
                    {field[0] === "duration_minutes" ? "min" : "total"}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {customWorkoutError ? (
            <Text style={styles.fitnessTestErrorText}>{customWorkoutError}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.fitnessTestPrimaryButton}
            activeOpacity={0.9}
            onPress={submitCustomWorkout}
            disabled={customWorkoutSaving}
          >
            {customWorkoutSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.fitnessTestPrimaryButtonText}>
                  Log workout
                </Text>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderMetricTooltip = () => {
    if (!activeMetricTooltip) return null;
    const close = () => setActiveMetricTooltip(null);

    const renderMetricHeader = (
      iconName: React.ComponentProps<typeof Ionicons>["name"],
      title: string,
      subtitle?: string,
    ) => (
      <View style={styles.metricTooltipHeaderRow}>
        <View
          style={[
            styles.metricTooltipIconCircle,
            isLight && styles.metricTooltipIconCircleLight,
          ]}
        >
          <Ionicons
            name={iconName}
            size={18}
            color={isLight ? "#0F172A" : "#ECFEFF"}
          />
        </View>
        <View style={styles.metricTooltipHeaderTextGroup}>
          <Text
            style={[
              styles.metricTooltipTitle,
              isLight && styles.metricTooltipTitleLight,
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.metricTooltipSubtitle,
                isLight && styles.metricTooltipSubtitleLight,
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    );

    const renderSubMetricRow = (
      label: string,
      value: number | null | undefined,
    ) => {
      if (value == null) return null;
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      return (
        <View key={label} style={styles.metricTooltipSubMetricRow}>
          <Text
            style={[
              styles.metricTooltipSubMetricLabel,
              isLight && styles.metricTooltipSubMetricLabelLight,
            ]}
          >
            {label}
          </Text>
          <View style={styles.metricTooltipSubMetricTrack}>
            <View
              style={[
                styles.metricTooltipSubMetricFill,
                { width: `${clamped}%` },
              ]}
            />
          </View>
          <Text
            style={[
              styles.metricTooltipSubMetricValue,
              isLight && styles.metricTooltipSubMetricValueLight,
            ]}
          >
            {clamped}%
          </Text>
        </View>
      );
    };

    let content: React.ReactNode = null;

    if (activeMetricTooltip === "fitness_age") {
      const isYounger =
        typeof fitnessAgeDelta === "string" &&
        fitnessAgeDelta.toLowerCase().includes("younger");

      content = (
        <View style={styles.metricTooltipContent}>
          {renderMetricHeader(
            "hourglass-outline",
            "Fitness age",
            'How "young" your training makes you',
          )}
          <View style={styles.metricTooltipPrimaryRow}>
            <View>
              <Text
                style={[
                  styles.metricTooltipValue,
                  isLight && styles.metricTooltipValueLight,
                ]}
              >
                {fitnessAgeValue}
              </Text>
              {chronologicalAge != null && (
                <Text
                  style={[
                    styles.metricTooltipText,
                    isLight && styles.metricTooltipTextLight,
                  ]}
                >
                  {`Actual age: ${chronologicalAge} yrs`}
                </Text>
              )}
            </View>
            {fitnessAgeDelta && (
              <View
                style={[
                  styles.metricTooltipBadge,
                  isYounger && styles.metricTooltipBadgePositive,
                ]}
              >
                <Text style={styles.metricTooltipBadgeText}>
                  {fitnessAgeDelta}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.metricTooltipSection}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              WHAT THIS MEANS
            </Text>
            <Text
              style={[
                styles.metricTooltipBody,
                isLight && styles.metricTooltipBodyLight,
              ]}
            >
              Your fitness age compares your recent training volume and
              intensity with your profile or assessment baseline to estimate
              how "young" your body is moving.
            </Text>
          </View>
          <View style={styles.metricTooltipSectionLast}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              WHAT AFFECTS THIS
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Daily streak and weekly consistency
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Overall volume (time on feet)
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Intensity of your key workouts
            </Text>
          </View>
        </View>
      );
    } else if (activeMetricTooltip === "race_readiness") {
      content = (
        <View style={styles.metricTooltipContent}>
          {renderMetricHeader(
            "flag-outline",
            "Race readiness",
            "How prepared you are for race day",
          )}
          <View style={styles.metricTooltipPrimaryRow}>
            <View>
              <Text
                style={[
                  styles.metricTooltipValue,
                  isLight && styles.metricTooltipValueLight,
                ]}
              >
                {racePercentDisplay}
              </Text>
              {raceScoreLabel && (
                <Text
                  style={[
                    styles.metricTooltipText,
                    isLight && styles.metricTooltipTextLight,
                  ]}
                >
                  {raceScoreLabel}
                </Text>
              )}
            </View>
          </View>
          {racePercent != null && (
            <View style={styles.metricTooltipSection}>
              <Text
                style={[
                  styles.metricTooltipSectionTitle,
                  isLight && styles.metricTooltipSectionTitleLight,
                ]}
              >
                OVERALL READINESS
              </Text>
              <View style={styles.metricTooltipProgressSection}>
                <View style={styles.metricTooltipProgressTrack}>
                  <View
                    style={[
                      styles.metricTooltipProgressFill,
                      {
                        width: `${Math.max(0, Math.min(100, racePercent))}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.metricTooltipProgressLabelsRow}>
                  <Text
                    style={[
                      styles.metricTooltipSubMetricLabel,
                      isLight && styles.metricTooltipSubMetricLabelLight,
                    ]}
                  >
                    Base
                  </Text>
                  <Text
                    style={[
                      styles.metricTooltipSubMetricLabel,
                      isLight && styles.metricTooltipSubMetricLabelLight,
                    ]}
                  >
                    Race ready
                  </Text>
                </View>
              </View>
            </View>
          )}
          <View style={styles.metricTooltipSection}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              KEY DRIVERS
            </Text>
            <View style={styles.metricTooltipSubMetricGroup}>
              {renderSubMetricRow("Plan progress", racePlanPercent)}
              {renderSubMetricRow("Energy score", raceConsistencyPercent)}
              {renderSubMetricRow("Benchmarks", raceBenchmarksPercent)}
            </View>
          </View>
          <View style={styles.metricTooltipSectionLast}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              HOW TO IMPROVE
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Stick to your planned long runs and key workouts
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Keep weekly training consistent (avoid big spikes)
            </Text>
            <Text
              style={[
                styles.metricTooltipText,
                isLight && styles.metricTooltipTextLight,
              ]}
            >
              • Hit the benchmark workouts at goal pace
            </Text>
          </View>
        </View>
      );
    } else if (activeMetricTooltip === "percentile") {
      content = (
        <View style={styles.metricTooltipContent}>
          {renderMetricHeader(
            "stats-chart-outline",
            "Fitter than",
            "Where you sit vs similar athletes",
          )}
          <View style={styles.metricTooltipPrimaryRow}>
            <View>
              <Text
                style={[
                  styles.metricTooltipValue,
                  isLight && styles.metricTooltipValueLight,
                ]}
              >
                {percentilePercentDisplay}
              </Text>
              {percentileLabel && (
                <Text
                  style={[
                    styles.metricTooltipText,
                    isLight && styles.metricTooltipTextLight,
                  ]}
                >
                  {percentileLabel}
                </Text>
              )}
            </View>
          </View>
          {percentilePercent != null && (
            <View style={styles.metricTooltipSection}>
              <Text
                style={[
                  styles.metricTooltipSectionTitle,
                  isLight && styles.metricTooltipSectionTitleLight,
                ]}
              >
                WHERE YOU RANK
              </Text>
              <View style={styles.metricTooltipProgressSection}>
                <View style={styles.metricTooltipProgressTrack}>
                  <View
                    style={[
                      styles.metricTooltipProgressFill,
                      {
                        width: `${Math.max(
                          0,
                          Math.min(100, percentilePercent),
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.metricTooltipProgressLabelsRow}>
                  <Text
                    style={[
                      styles.metricTooltipSubMetricLabel,
                      isLight && styles.metricTooltipSubMetricLabelLight,
                    ]}
                  >
                    Behind
                  </Text>
                  <Text
                    style={[
                      styles.metricTooltipSubMetricLabel,
                      isLight && styles.metricTooltipSubMetricLabelLight,
                    ]}
                  >
                    Elite
                  </Text>
                </View>
              </View>
            </View>
          )}
          <View style={styles.metricTooltipSectionLast}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              WHAT THIS MEANS
            </Text>
            <Text
              style={[
                styles.metricTooltipBody,
                isLight && styles.metricTooltipBodyLight,
              ]}
            >
              Your percentile rank compares your overall performance to other
              athletes of similar age and gender using your profile or
              assessment baseline plus recent activity.
            </Text>
          </View>
        </View>
      );
    } else if (activeMetricTooltip === "body_battle_map") {
      content = (
        <View style={styles.metricTooltipContent}>
          {renderMetricHeader(
            "grid-outline",
            "Body battle map",
            "How balanced your full-body training is",
          )}
          <View style={styles.metricTooltipPrimaryRow}>
            <View>
              <Text
                style={[
                  styles.metricTooltipValue,
                  isLight && styles.metricTooltipValueLight,
                ]}
              >
                {bodyBalanceDisplay}
              </Text>
              {bodyBalanceLabel && (
                <Text
                  style={[
                    styles.metricTooltipText,
                    isLight && styles.metricTooltipTextLight,
                  ]}
                >
                  {bodyBalanceLabel}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.metricTooltipSection}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              MUSCLE GROUP BALANCE
            </Text>
            {bodyMapRows.length > 0 ? (
              <View style={styles.metricTooltipBodyMapList}>
                {bodyMapRows.map((row) => (
                  <View key={row.key} style={styles.metricTooltipBodyMapRow}>
                    <View style={styles.metricTooltipBodyMapBullet} />
                    <View style={styles.metricTooltipBodyMapTextGroup}>
                      <Text
                        style={[
                          styles.metricTooltipText,
                          isLight && styles.metricTooltipTextLight,
                        ]}
                      >
                        {row.label}
                      </Text>
                      <Text
                        style={[
                          styles.metricTooltipSubMetricLabel,
                          isLight && styles.metricTooltipSubMetricLabelLight,
                        ]}
                      >
                        {`${row.sessions} session${
                          row.sessions === 1 ? "" : "s"
                        } · ${row.rank}`}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={[
                  styles.metricTooltipText,
                  isLight && styles.metricTooltipTextLight,
                ]}
              >
                No completed workouts mapped to muscle groups yet.
              </Text>
            )}
          </View>
          <View style={styles.metricTooltipSectionLast}>
            <Text
              style={[
                styles.metricTooltipSectionTitle,
                isLight && styles.metricTooltipSectionTitleLight,
              ]}
            >
              WHAT THIS MEANS
            </Text>
            <Text
              style={[
                styles.metricTooltipBody,
                isLight && styles.metricTooltipBodyLight,
              ]}
            >
              Body battle map counts how many completed sessions hit each major
              muscle group and scores how balanced your training is across your
              body.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <Modal
        visible={!!activeMetricTooltip}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.metricTooltipBackdrop}>
          <View
            style={[
              styles.metricTooltipCard,
              isLight && styles.metricTooltipCardLight,
            ]}
          >
            <ScrollView>{content}</ScrollView>
            <TouchableOpacity
              onPress={close}
              style={styles.metricTooltipCloseButton}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.metricTooltipCloseText,
                  isLight && styles.metricTooltipCloseTextLight,
                ]}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderPremiumInsightsSection = () => (
    <View style={insightStyles.section}>
      <View style={insightStyles.sectionHeader}>
        <View>
          <Text style={[insightStyles.sectionTitle, isLight && insightStyles.sectionTitleLight]}>
            Insights
          </Text>
          <Text style={[insightStyles.sectionSubtitle, isLight && insightStyles.sectionSubtitleLight]}>
            Training categories, level XP, and real-time progress
          </Text>
        </View>
      </View>

      <MotionEntrance delay={40}>
        <InsightComparisonGraph
          metrics={insightComparisonMetrics}
          activeKey={activeInsightComparisonKey}
          onChange={setActiveInsightComparisonKey}
          isLight={isLight}
        />
      </MotionEntrance>

      <MotionEntrance delay={110}>
        <InsightLevelCard
          level={insightLevel}
          categories={insightCategoryMetrics}
          isLight={isLight}
        />
      </MotionEntrance>

      <MotionEntrance delay={180}>
        <View style={[insightStyles.summaryStrip, isLight && insightStyles.summaryStripLight]}>
          <View style={insightStyles.summaryItem}>
            <Text style={[insightStyles.summaryValue, isLight && insightStyles.summaryValueLight]}>
              {Math.round(trainingProfile?.performance_score ?? 0)}
            </Text>
            <Text style={[insightStyles.summaryLabel, isLight && insightStyles.summaryLabelLight]}>Performance</Text>
          </View>
          <View style={[insightStyles.summaryDivider, isLight && insightStyles.summaryDividerLight]} />
          <View style={insightStyles.summaryItem}>
            <Text style={[insightStyles.summaryValue, isLight && insightStyles.summaryValueLight]}>
              {Math.round(trainingProfile?.training_balance_score ?? bodyBalanceScore ?? 0)}
            </Text>
            <Text style={[insightStyles.summaryLabel, isLight && insightStyles.summaryLabelLight]}>Balance</Text>
          </View>
          <View style={[insightStyles.summaryDivider, isLight && insightStyles.summaryDividerLight]} />
          <View style={insightStyles.summaryItem}>
            <Text style={[insightStyles.summaryValue, isLight && insightStyles.summaryValueLight]}>
              {Math.round(trainingProfile?.weekly_xp ?? 0)}
            </Text>
            <Text style={[insightStyles.summaryLabel, isLight && insightStyles.summaryLabelLight]}>Weekly XP</Text>
          </View>
        </View>
      </MotionEntrance>
    </View>
  );

  return (
    <>
      <ScrollView
        style={[styles.screenContainer, isLight && styles.screenContainerLight]}
        contentContainerStyle={styles.homeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AppHeader
          isLight={isLight}
          title="Ready to train?"
          greetingText="Good morning,"
          userName={profile?.profile.display_name || profile?.username || null}
          avatarUrl={profile?.profile.avatar_url}
          onThemeToggle={toggle}
        />

        {false && (
          <>

        {/* Active workouts / nutrition hero card */}
        <PremiumCard
          isLight={isLight}
          style={[styles.homeHeroCard, isLight && styles.homeHeroCardLight]}
        >
          <View style={styles.homeHeroCardInner}>
          <AppTabs
            tabs={[
              { key: "workouts", label: "Workouts" },
              { key: "nutrition", label: "Nutrition" },
            ]}
            activeKey={homeActiveTab}
            isLight={isLight}
            onChange={(key) => setHomeActiveTab(key as "workouts" | "nutrition")}
            style={{ marginBottom: 16 }}
          />

          <Text
            style={[styles.homeHeroLabel, isLight && styles.homeHeroLabelLight]}
          >
            {homeActiveTab === "workouts"
              ? "My Active Workout"
              : "My Active Nutrition"}
          </Text>

          {shouldShowWorkoutSetup ? (
            <View
              style={[
                styles.homeActiveListItem,
                isLight && styles.homeActiveListItemLight,
                { marginTop: 10 },
              ]}
            >
              <View
                style={[
                  styles.homeActiveListIndexPill,
                  isLight && styles.homeActiveListIndexPillLight,
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={isLight ? "#0F172A" : "#E5E7EB"}
                />
              </View>
              <View style={styles.homeActiveListContent}>
                <Text
                  style={[
                    styles.homeActiveItemTitle,
                    isLight && styles.homeActiveItemTitleLight,
                  ]}
                >
                  {isActivePlanFinished ? "Plan completed" : "No active plan"}
                </Text>
                <Text
                  style={[
                    styles.homeActiveItemMeta,
                    isLight && styles.homeActiveItemMetaLight,
                    { lineHeight: 18 },
                  ]}
                >
                  Enroll in a plan for today's workout, or log a custom session
                  if you trained differently.
                </Text>
              </View>
            </View>
          ) : (
            activeItems.map((item, index) => {
            const isCompleted =
              homeActiveTab === "workouts"
                ? completedWorkouts[item.id]
                : completedNutritions[item.id];

            return (
              <View
                key={item.id}
                style={[
                  styles.homeActiveListItem,
                  isLight && styles.homeActiveListItemLight,
                  index === 0 && { marginTop: 10 },
                ]}
              >
                <View
                  style={[
                    styles.homeActiveListIndexPill,
                    isLight && styles.homeActiveListIndexPillLight,
                  ]}
                >
                  <Ionicons
                    name={
                      homeActiveTab === "workouts"
                        ? "barbell-outline"
                        : "fast-food-outline"
                    }
                    size={14}
                    color={isLight ? "#0F172A" : "#E5E7EB"}
                  />
                  <Text
                    style={[
                      styles.homeActiveListIndexText,
                      isLight && styles.homeActiveListIndexTextLight,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.homeActiveListContent}>
                  <View style={styles.homeActiveItemHeaderRow}>
                    <View style={styles.homeActiveItemHeaderText}>
                      <Text
                        style={[
                          styles.homeActiveItemTitle,
                          isLight && styles.homeActiveItemTitleLight,
                        ]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <View style={styles.homeActiveItemMetaRow}>
                        <Text
                          style={[
                            styles.homeActiveItemMeta,
                            isLight && styles.homeActiveItemMetaLight,
                          ]}
                        >
                          {`${item.durationDisplay || `${item.durationMinutes} min`} • ${item.style}`}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.homeActiveItemCheckButton,
                        isLight && styles.homeActiveItemCheckButtonLight,
                      ]}
                      activeOpacity={0.8}
                      onPress={() =>
                        toggleItemCompleted(homeActiveTab, item.id)
                      }
                    >
                      <Ionicons
                        name={
                          isCompleted
                            ? "checkmark-circle"
                            : "checkmark-circle-outline"
                        }
                        size={20}
                        color={
                          isCompleted
                            ? GLASS_ACCENT_GREEN
                            : isLight
                              ? "#CBD5E1"
                              : "#4B5563"
                        }
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
            })
          )}

          <View style={styles.homeActiveDivider} />

          {shouldShowWorkoutSetup ? (
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                style={[
                  styles.homeActiveSeeAllRow,
                  isLight && styles.homeActiveSeeAllRowLight,
                  { flex: 1, marginRight: 8 },
                ]}
                activeOpacity={0.84}
                onPress={() => navigation.navigate("Plans")}
              >
                <Text
                  style={[
                    styles.homeActiveSeeAllLabel,
                    isLight && styles.homeActiveSeeAllLabelLight,
                  ]}
                >
                  Enroll plan
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={isLight ? "#475569" : "#CBD5E1"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.homeActiveSeeAllRow,
                  isLight && styles.homeActiveSeeAllRowLight,
                  { flex: 1 },
                ]}
                activeOpacity={0.84}
                onPress={() => setIsCustomWorkoutVisible(true)}
              >
                <Text
                  style={[
                    styles.homeActiveSeeAllLabel,
                    isLight && styles.homeActiveSeeAllLabelLight,
                  ]}
                >
                  Log custom
                </Text>
                <Ionicons
                  name="add"
                  size={17}
                  color={isLight ? "#475569" : "#CBD5E1"}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.homeActiveSeeAllRow,
                isLight && styles.homeActiveSeeAllRowLight,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                setAllActiveTab(homeActiveTab);
                setIsAllActiveSheetVisible(true);
              }}
            >
              <Text
                style={[
                  styles.homeActiveSeeAllLabel,
                  isLight && styles.homeActiveSeeAllLabelLight,
                ]}
              >
                {homeActiveTab === "workouts"
                  ? "See All Active Workouts"
                  : "Watch complete details"}
              </Text>
              <Text
                style={[
                  styles.homeActiveSeeAllArrow,
                  isLight && styles.homeActiveSeeAllArrowLight,
                ]}
              >
                →
              </Text>
            </TouchableOpacity>
          )}
          </View>
        </PremiumCard>

        {/* Training Days calendar */}
        <View style={styles.trainingSection}>
          <View style={styles.trainingHeaderRow}>
            <Text
              style={[
                styles.trainingTitle,
                isLight && styles.trainingTitleLight,
              ]}
            >
              Training Days
            </Text>
            <View style={styles.trainingMonthControls}>
              <TouchableOpacity
                style={styles.trainingNavButton}
                onPress={handlePrevWeek}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={isLight ? "#0F172A" : "#E5E7EB"}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.trainingMonthLabel,
                  isLight && styles.trainingMonthLabelLight,
                ]}
              >
                {selectedWeekLabel}
              </Text>
              <TouchableOpacity
                style={styles.trainingNavButton}
                onPress={handleNextWeek}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isLight ? "#0F172A" : "#E5E7EB"}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.trainingCalendarContainer,
              isLight && styles.trainingCalendarContainerLight,
            ]}
          >
            <View style={styles.trainingWeekdayHeaderRow}>
              {WEEKDAY_LABELS.map((label) => (
                <View key={label} style={styles.trainingDayColumn}>
                  <Text
                    style={[
                      styles.trainingDayWeekday,
                      isLight && styles.trainingDayWeekdayLight,
                    ]}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.trainingMonthGrid}>
              <View style={styles.trainingWeekRow}>
                {selectedWeekDates.map((date, dayIndex) => {
                  if (!date) {
                    return (
                      <View
                        key={`empty-${selectedWeekIndex}-${dayIndex}`}
                        style={styles.trainingDayColumn}
                      />
                    );
                  }

                  const iso = toISODate(date);
                  const trainingDay = trainingDays.find(
                    (day) => day.date === iso,
                  );
                  const workoutsCount = trainingDay?.workouts ?? 0;
                  const isToday = iso === todayIso;
                  const weekday = date.getDay();
                  const planDayIndex = weekday === 0 ? 7 : weekday;
                  const plannedWorkoutType =
                    planDayTypeByWeekday?.[planDayIndex] ?? null;

                  const inCalendarRange =
                    calendarRangeStart &&
                    calendarRangeEnd &&
                    iso >= calendarRangeStart &&
                    iso <= calendarRangeEnd;

                  const isCompleted = inCalendarRange && workoutsCount > 0;
                  const hasPlannedWorkout = !!plannedWorkoutType;
                  const isMissed =
                    inCalendarRange &&
                    hasPlannedWorkout &&
                    workoutsCount === 0 &&
                    iso < todayIso;

                  const showStatusCircle =
                    hasPlannedWorkout || isCompleted || isMissed || isToday;
                  const statusCircleStyles: any[] = [
                    styles.trainingDayStickerCircle,
                  ];
                  if (hasPlannedWorkout) {
                    if (plannedWorkoutType === "strength") {
                      statusCircleStyles.push(
                        styles.trainingDayActiveCircleSecondary,
                      );
                    } else if (plannedWorkoutType === "cardio") {
                      statusCircleStyles.push(
                        styles.trainingDayActiveCirclePrimary,
                      );
                    } else if (
                      plannedWorkoutType === "recovery" ||
                      plannedWorkoutType === "rest"
                    ) {
                      statusCircleStyles.push(
                        styles.trainingDayActiveCirclePrimary,
                      );
                    }
                  }
                  if (isToday) {
                    statusCircleStyles.push(
                      isLight
                        ? styles.trainingDayTodayCircleLight
                        : styles.trainingDayTodayCircleDark,
                    );
                  }
                  if (isMissed) {
                    statusCircleStyles.push(styles.trainingDayMissedCircle);
                  }

                  return (
                    <View key={iso} style={styles.trainingDayColumn}>
                      <View style={styles.trainingDayMarkerSlot}>
                        {showStatusCircle && (
                          <View style={statusCircleStyles}>
                            {hasPlannedWorkout && (
                              <FancyWorkoutTypeIcon
                                type={plannedWorkoutType as any}
                                size={18}
                              />
                            )}
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.trainingDayDate,
                          isLight && styles.trainingDayDateLight,
                          isToday &&
                            (isLight
                              ? styles.trainingDayDateTodayLight
                              : styles.trainingDayDateTodayDark),
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={styles.trainingLegendRow}>
              {[
                {
                  key: "strength",
                  label: "Strength",
                  type: "strength" as const,
                },
                { key: "run", label: "Run", type: "run" as const },
                { key: "hybrid", label: "Hybrid", type: "hybrid" as const },
                { key: "rest", label: "Rest", type: "recovery" as const },
              ].map(({ key, label, type }) => {
                let isActive = false;
                if (todayPlannedWorkoutType) {
                  if (
                    key === "strength" &&
                    todayPlannedWorkoutType === "strength"
                  ) {
                    isActive = true;
                  } else if (
                    (key === "run" || key === "hybrid") &&
                    todayPlannedWorkoutType === "cardio"
                  ) {
                    isActive = true;
                  } else if (
                    key === "rest" &&
                    todayPlannedWorkoutType === "recovery"
                  ) {
                    isActive = true;
                  }
                }
                const iconSize = isActive ? 24 : 22;
                const iconColor = isActive
                  ? "#FFFFFF"
                  : isLight
                    ? "#1E293B"
                    : "#F9FAFB";
                return (
                  <View
                    key={key}
                    style={[
                      styles.trainingLegendItem,
                      isActive &&
                        (isLight
                          ? styles.trainingLegendItemActiveLight
                          : styles.trainingLegendItemActiveDark),
                    ]}
                  >
                    <View
                      style={[
                        styles.trainingLegendIconWrap,
                        isActive
                          ? styles.trainingLegendIconActive
                          : styles.trainingLegendIconDimmed,
                      ]}
                    >
                      <FancyWorkoutTypeIcon
                        type={type}
                        size={iconSize}
                        color={iconColor}
                      />
                    </View>
                    <Text
                      style={[
                        styles.metricCaption,
                        isLight && styles.metricCaptionLight,
                        styles.trainingLegendLabel,
                        isActive &&
                          (isLight
                            ? styles.trainingLegendLabelActiveLight
                            : styles.trainingLegendLabelActiveDark),
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity
              style={styles.homeActiveSeeAllRow}
              activeOpacity={0.8}
              onPress={() => {
                void reloadWorkoutHistory();
                setIsWorkoutHistoryVisible(true);
              }}
            >
              <Text
                style={[
                  styles.homeActiveSeeAllLabel,
                  isLight && styles.homeActiveSeeAllLabelLight,
                ]}
              >
                View previous workouts
              </Text>
              <Text
                style={[
                  styles.homeActiveSeeAllArrow,
                  isLight && styles.homeActiveSeeAllArrowLight,
                ]}
              >
                →
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* All active workouts/nutrition bottom sheet (like Exercise Library) */}
        <Modal
          visible={isAllActiveSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsAllActiveSheetVisible(false)}
        >
          <View style={styles.filterSheetRoot}>
            <TouchableOpacity
              style={styles.filterSheetBackdrop}
              activeOpacity={1}
              onPress={() => setIsAllActiveSheetVisible(false)}
            />
            <View
              style={[
                styles.filterSheetContainer,
                styles.homeAllActiveSheetContainer,
                isLight && styles.filterSheetContainerLight,
              ]}
            >
              <View style={styles.filterSheetHandle} />
              <View style={styles.homeAllActiveHeaderRow}>
                <View style={styles.homeAllActiveHeaderTextCol}>
                  <Text
                    style={[
                      styles.filterSheetTitle,
                      isLight && styles.filterSheetTitleLight,
                    ]}
                  >
                    Active workouts & nutrition
                  </Text>
                  <Text
                    style={[
                      styles.filterSheetSubtitle,
                      isLight && styles.filterSheetSubtitleLight,
                    ]}
                  >
                    Browse all your current plans in one place.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.homeAllActiveCloseButton}
                  activeOpacity={0.8}
                  onPress={() => setIsAllActiveSheetVisible(false)}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={isLight ? "#4B5563" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.exerciseTabsToggle,
                  isLight && styles.exerciseTabsToggleLight,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.exerciseTabButton,
                    isLight && styles.exerciseTabButtonLight,
                    allActiveTab === "workouts" &&
                      (isLight
                        ? styles.exerciseTabButtonActiveLight
                        : styles.exerciseTabButtonActive),
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setAllActiveTab("workouts")}
                >
                  <Text
                    style={[
                      styles.exerciseTabLabel,
                      isLight && styles.exerciseTabLabelLight,
                      allActiveTab === "workouts" &&
                        styles.exerciseTabLabelActive,
                    ]}
                  >
                    Workouts
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.exerciseTabButton,
                    isLight && styles.exerciseTabButtonLight,
                    allActiveTab === "nutrition" &&
                      (isLight
                        ? styles.exerciseTabButtonActiveLight
                        : styles.exerciseTabButtonActive),
                  ]}
                  activeOpacity={0.9}
                  onPress={() => setAllActiveTab("nutrition")}
                >
                  <Text
                    style={[
                      styles.exerciseTabLabel,
                      isLight && styles.exerciseTabLabelLight,
                      allActiveTab === "nutrition" &&
                        styles.exerciseTabLabelActive,
                    ]}
                  >
                    Nutritions
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.homeAllActiveListScroll}
              >
                {(allActiveTab === "workouts"
                  ? activeWorkoutItems
                  : activeNutritionItems
                ).map((item) => {
                  const isCompleted =
                    allActiveTab === "workouts"
                      ? completedWorkouts[item.id]
                      : completedNutritions[item.id];

                  return (
                    <PremiumCard
                      key={item.id}
                      isLight={isLight}
                      style={[
                        styles.homeAllActiveWorkoutCard,
                        isLight && styles.homeAllActiveWorkoutCardLight,
                        { padding: 0 },
                      ]}
                    >
                      {/* Workout Header */}
                      <View style={styles.homeAllActiveWorkoutHeader}>
                        <View style={styles.homeAllActiveWorkoutTitleRow}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={[
                                styles.homeAllActiveWorkoutTitle,
                                isLight &&
                                  styles.homeAllActiveWorkoutTitleLight,
                              ]}
                              numberOfLines={2}
                            >
                              {item.title}
                            </Text>
                            <Text
                              style={[
                                styles.homeAllActiveWorkoutMeta,
                                isLight && styles.homeAllActiveWorkoutMetaLight,
                              ]}
                            >
                              {`${item.durationDisplay || `${item.durationMinutes} min`} • ${item.style}`}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.homeActiveItemCheckButton}
                            activeOpacity={0.8}
                            onPress={() =>
                              toggleItemCompleted(allActiveTab, item.id)
                            }
                          >
                            <Ionicons
                              name={
                                isCompleted
                                  ? "checkmark-circle"
                                  : "checkmark-circle-outline"
                              }
                              size={24}
                              color={
                                isCompleted
                                  ? GLASS_ACCENT_GREEN
                                  : isLight
                                    ? "#CBD5E1"
                                    : "#4B5563"
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Exercises List */}
                      {allActiveTab === "workouts" &&
                      item.exerciseSegments &&
                      item.exerciseSegments.length ? (
                        <View style={styles.homeAllActiveExerciseList}>
                          {item.exerciseSegments.map((segment, index) => {
                            const pr = exercisePrInputs[segment.id] ?? {
                              weight: "",
                              sets: "",
                            };
                            const isSaved = savedExercisePrs[segment.id];
                            const demoExerciseId =
                              demoExerciseIds[segment.label];
                            return (
                              <View
                                key={segment.id}
                                style={[
                                  styles.homeAllActiveExerciseCard,
                                  isLight &&
                                    styles.homeAllActiveExerciseCardLight,
                                ]}
                              >
                                {/* Exercise Info */}
                                <TouchableOpacity
                                  style={styles.homeAllActiveExerciseInfo}
                                  activeOpacity={demoExerciseId ? 0.82 : 1}
                                  disabled={!demoExerciseId}
                                  onPress={() => {
                                    if (demoExerciseId) {
                                      setActiveExerciseName(segment.label);
                                    }
                                  }}
                                >
                                  <View style={styles.viewWorkoutExerciseTapRow}>
                                    <Text
                                      style={[
                                        styles.homeAllActiveExerciseName,
                                        isLight &&
                                          styles.homeAllActiveExerciseNameLight,
                                        { flex: 1 },
                                      ]}
                                      numberOfLines={2}
                                    >
                                      {segment.label}
                                    </Text>
                                    {demoExerciseId ? (
                                      <Ionicons
                                        name="play-circle-outline"
                                        size={17}
                                        color={isLight ? "#2563EB" : "#93C5FD"}
                                      />
                                    ) : null}
                                  </View>
                                  <View
                                    style={styles.homeAllActiveExerciseMetaRow}
                                  >
                                    <Text
                                      style={[
                                        styles.homeAllActiveExerciseDetail,
                                        isLight &&
                                          styles.homeAllActiveExerciseDetailLight,
                                      ]}
                                    >
                                      {segment.primary}
                                    </Text>
                                    {segment.secondary && (
                                      <>
                                        <Text
                                          style={
                                            styles.homeAllActiveExerciseSeparator
                                          }
                                        >
                                          •
                                        </Text>
                                        <Text
                                          style={[
                                            styles.homeAllActiveExerciseDetail,
                                            isLight &&
                                              styles.homeAllActiveExerciseDetailLight,
                                          ]}
                                        >
                                          {segment.secondary}
                                        </Text>
                                      </>
                                    )}
                                  </View>
                                </TouchableOpacity>

                                {/* Personal Best Input */}
                                <View style={styles.homeAllActivePrContainer}>
                                  <Text
                                    style={[
                                      styles.homeAllActivePrLabel,
                                      isLight &&
                                        styles.homeAllActivePrLabelLight,
                                    ]}
                                  >
                                    PERSONAL BEST
                                  </Text>
                                  <View style={styles.homeAllActivePrInputRow}>
                                    <TextInput
                                      style={[
                                        styles.homeAllActivePrInput,
                                        isLight &&
                                          styles.homeAllActivePrInputLight,
                                      ]}
                                      placeholder="Weight"
                                      placeholderTextColor={
                                        isLight ? "#9CA3AF" : "#6B7280"
                                      }
                                      keyboardType="numeric"
                                      value={pr.weight}
                                      onChangeText={(text) =>
                                        updateExercisePrInput(
                                          segment.id,
                                          "weight",
                                          text,
                                        )
                                      }
                                    />
                                    <TextInput
                                      style={[
                                        styles.homeAllActivePrInput,
                                        isLight &&
                                          styles.homeAllActivePrInputLight,
                                      ]}
                                      placeholder="Sets"
                                      placeholderTextColor={
                                        isLight ? "#9CA3AF" : "#6B7280"
                                      }
                                      keyboardType="numeric"
                                      value={pr.sets}
                                      onChangeText={(text) =>
                                        updateExercisePrInput(
                                          segment.id,
                                          "sets",
                                          text,
                                        )
                                      }
                                    />
                                    <TouchableOpacity
                                      style={[
                                        styles.homeAllActivePrSaveButton,
                                        isLight &&
                                          styles.homeAllActivePrSaveButtonLight,
                                        isSaved &&
                                          styles.homeAllActivePrSaveButtonSaved,
                                      ]}
                                      activeOpacity={0.85}
                                      onPress={() =>
                                        handleSaveExercisePr(
                                          segment.id,
                                          segment.label,
                                          segment.primary,
                                          segment.secondary,
                                          item.title,
                                        )
                                      }
                                    >
                                      <Text
                                        style={[
                                          styles.homeAllActivePrSaveLabel,
                                          isLight &&
                                            styles.homeAllActivePrSaveLabelLight,
                                          isSaved &&
                                            styles.homeAllActivePrSaveLabelSaved,
                                        ]}
                                      >
                                        {isSaved ? "Saved" : "Save"}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : null}

                      {/* Nutrition Details */}
                      {allActiveTab === "nutrition" &&
                      item.dietDetails &&
                      item.dietDetails.length ? (
                        <View style={styles.homeAllActiveDietCardsContainer}>
                          {item.dietDetails.map((detail, detailIndex) => (
                            <View
                              key={`${item.id}_detail_${detailIndex}`}
                              style={[
                                styles.homeAllActiveDietCard,
                                isLight && styles.homeAllActiveDietCardLight,
                              ]}
                            >
                              <Text style={styles.homeAllActiveDietBulletDot}>
                                •
                              </Text>
                              <Text
                                style={[
                                  styles.homeAllActiveDietText,
                                  isLight && styles.homeAllActiveDietTextLight,
                                ]}
                              >
                                {detail}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </PremiumCard>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Previous workouts history bottom sheet */}
        <Modal
          visible={isWorkoutHistoryVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsWorkoutHistoryVisible(false)}
        >
          <View style={styles.filterSheetRoot}>
            <TouchableOpacity
              style={styles.filterSheetBackdrop}
              activeOpacity={1}
              onPress={() => setIsWorkoutHistoryVisible(false)}
            />
            <View
              style={[
                styles.filterSheetContainer,
                styles.homeAllActiveSheetContainer,
                isLight && styles.filterSheetContainerLight,
              ]}
            >
              <View style={styles.filterSheetHandle} />
              <View style={styles.homeAllActiveHeaderRow}>
                <View style={styles.homeAllActiveHeaderTextCol}>
                  <Text
                    style={[
                      styles.filterSheetTitle,
                      isLight && styles.filterSheetTitleLight,
                    ]}
                  >
                    Previous workouts
                  </Text>
                  <Text
                    style={[
                      styles.filterSheetSubtitle,
                      isLight && styles.filterSheetSubtitleLight,
                    ]}
                  >
                    See your recent completed and missed training days.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.homeAllActiveCloseButton}
                  activeOpacity={0.8}
                  onPress={() => setIsWorkoutHistoryVisible(false)}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={isLight ? "#4B5563" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              </View>

              {workoutHistoryError ? (
                <Text
                  style={[
                    styles.metricCaption,
                    isLight && styles.metricCaptionLight,
                  ]}
                >
                  {workoutHistoryError}
                </Text>
              ) : null}

              {workoutHistoryLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={GLASS_ACCENT_GREEN} />
                </View>
              )}

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.homeAllActiveListScroll}
              >
                {!workoutHistoryLoading &&
                workoutHistoryItems.length === 0 &&
                !workoutHistoryError ? (
                  <Text
                    style={[
                      styles.workoutHistoryEmptyText,
                      isLight && styles.workoutHistoryEmptyTextLight,
                    ]}
                  >
                    No workouts logged yet.
                  </Text>
                ) : (
                  workoutHistoryItems.map((item, index) => {
                    const isCompleted = item.status === "completed";
                    const dateLabel = item.completed_at ?? item.date;
                    return (
                      <View
                        key={`${item.date}-${item.title}-${index}`}
                        style={[
                          styles.workoutHistoryRow,
                          isLight && styles.workoutHistoryRowLight,
                        ]}
                      >
                        <View style={styles.workoutHistoryTextCol}>
                          <Text
                            style={[
                              styles.workoutHistoryTitle,
                              isLight && styles.workoutHistoryTitleLight,
                            ]}
                          >
                            {item.title}
                          </Text>
                          <Text
                            style={[
                              styles.workoutHistoryDate,
                              isLight && styles.workoutHistoryDateLight,
                            ]}
                          >
                            {dateLabel}
                          </Text>
                        </View>
                        <View style={styles.workoutHistoryStatusWrap}>
                          <Ionicons
                            name={
                              isCompleted
                                ? "checkmark-circle"
                                : "close-circle-outline"
                            }
                            size={20}
                            color={
                              isCompleted
                                ? GLASS_ACCENT_GREEN
                                : DARK_ACCENT_ORANGE
                            }
                          />
                          <Text
                            style={[
                              styles.workoutHistoryStatusLabel,
                              isCompleted
                                ? styles.workoutHistoryStatusCompleted
                                : styles.workoutHistoryStatusMissed,
                            ]}
                          >
                            {isCompleted ? "Completed" : "Missed"}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

          </>
        )}

        {renderPremiumInsightsSection()}

        <View style={styles.metricsSection}>
          <MotionEntrance delay={220}>
            <View
              style={[
                insightMetricStyles.summaryCard,
                isLight && insightMetricStyles.summaryCardLight,
              ]}
            >
            <TouchableOpacity
              style={insightMetricStyles.racePane}
              activeOpacity={0.9}
              onPress={handlePressFitnessAge}
            >
              <Text
                style={[
                  insightMetricStyles.metricKicker,
                  isLight && insightMetricStyles.metricKickerLight,
                ]}
              >
                Fitness age
              </Text>
              <View style={insightMetricStyles.raceGaugeWrap}>
                <MetricGauge
                  progress={fitnessAgeGaugeProgress}
                  isLight={isLight}
                  size="small"
                  centerText={
                    fitnessAgeYears != null
                      ? String(fitnessAgeYears)
                      : metricsLoading && !isFitnessTestLocked
                        ? "..."
                        : "--"
                  }
                  centerSubText="yrs"
                />
              </View>
              <View style={insightMetricStyles.raceLabelRow}>
                <Text
                  style={[
                    insightMetricStyles.raceEdgeLabel,
                    isLight && insightMetricStyles.raceEdgeLabelLight,
                  ]}
                >
                  Older
                </Text>
                <Text
                  style={[
                    insightMetricStyles.raceEdgeLabel,
                    isLight && insightMetricStyles.raceEdgeLabelLight,
                  ]}
                >
                  Fitter
                </Text>
              </View>
              <TouchableOpacity
                onPress={handlePressFitnessAge}
                activeOpacity={0.78}
                style={insightMetricStyles.tinyInfoButton}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={isLight ? "#6B7280" : "#8B93A7"}
                />
              </TouchableOpacity>
            </TouchableOpacity>

            <View
              style={[
                insightMetricStyles.summaryDivider,
                isLight && insightMetricStyles.summaryDividerLight,
              ]}
            />

            <TouchableOpacity
              style={insightMetricStyles.percentilePane}
              activeOpacity={0.9}
              onPress={handlePressPercentile}
            >
              <View style={insightMetricStyles.percentileHeader}>
                <View style={insightMetricStyles.percentileTitleRow}>
                  <Ionicons
                    name="trophy-outline"
                    size={24}
                    color="#8B6CF6"
                  />
                  <Text
                    style={[
                      insightMetricStyles.metricKicker,
                      isLight && insightMetricStyles.metricKickerLight,
                    ]}
                  >
                    Fitter than
                  </Text>
                </View>
                <Ionicons
                  name="bar-chart-outline"
                  size={24}
                  color={isLight ? "#6B7280" : "#A6ACBA"}
                />
              </View>
              <Text
                style={[
                  insightMetricStyles.percentileValue,
                  isLight && insightMetricStyles.percentileValueLight,
                ]}
              >
                {percentilePercentDisplay}
              </Text>
              <Text
                style={[
                  insightMetricStyles.percentileCaption,
                  isLight && insightMetricStyles.percentileCaptionLight,
                ]}
                numberOfLines={1}
              >
                {percentilePercent != null
                  ? `Fitter than ${percentilePercent}% of peers`
                  : "Profile and activity estimate"}
              </Text>
              <View style={insightMetricStyles.percentileCurveWrap}>
                <PercentileCurve
                  isLight={isLight}
                  percentile={percentilePercent}
                />
              </View>
              {percentileLabel && (
                <Text
                  style={[
                    insightMetricStyles.percentileStatus,
                    percentileDeltaColor && { color: percentileDeltaColor },
                  ]}
                  numberOfLines={1}
                >
                  {percentileLabel}
                </Text>
              )}
            </TouchableOpacity>
            </View>
          </MotionEntrance>

          <MotionEntrance delay={290}>
            <View
              style={[
                insightMetricStyles.bodyRankCard,
                isLight && insightMetricStyles.bodyRankCardLight,
              ]}
            >
            <View style={insightMetricStyles.bodyRankHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    insightMetricStyles.metricKicker,
                    isLight && insightMetricStyles.metricKickerLight,
                  ]}
                >
                  Body-part ranks
                </Text>
                <Text
                  style={[
                    insightMetricStyles.bodySubtitle,
                    isLight && insightMetricStyles.bodySubtitleLight,
                  ]}
                  numberOfLines={1}
                >
                  Completed sessions by muscle group · {bodyMapUpdatedAt}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handlePressBodyBattleMap}
                activeOpacity={0.78}
                style={[
                  insightMetricStyles.infoButton,
                  isLight && insightMetricStyles.infoButtonLight,
                ]}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={21}
                  color={isLight ? "#6B7280" : "#9AA2B4"}
                />
              </TouchableOpacity>
            </View>

            <View style={insightMetricStyles.bodyRankContent}>
              <View style={insightMetricStyles.bodyFigurePane}>
                <BodyMuscleFront
                  isLight={isLight}
                  resetKey={0}
                  singleSelect
                  onSelectionChange={handleBodyMapSelectionChange}
                />
              </View>
              <View style={insightMetricStyles.bodyRankList}>
                {bodyMapRows.map((row) => {
                  const isActive = row.key === activeBodyBattleGroup;
                  const rowColor = row.sessions > 0 ? row.color : "#94A3B8";
                  return (
                    <View
                      key={row.key}
                      style={[
                        insightMetricStyles.bodyRankRow,
                        isActive && insightMetricStyles.bodyRankRowActive,
                      ]}
                    >
                      <View style={insightMetricStyles.bodyRankNameWrap}>
                        <View
                          style={[
                            insightMetricStyles.rankDot,
                            { backgroundColor: rowColor },
                          ]}
                        />
                        <Text
                          style={[
                            insightMetricStyles.bodyRankName,
                            isLight && insightMetricStyles.bodyRankNameLight,
                          ]}
                          numberOfLines={1}
                        >
                          {row.label}
                        </Text>
                      </View>
                      <Text
                        style={[
                          insightMetricStyles.bodyRankValue,
                          { color: rowColor },
                        ]}
                        numberOfLines={1}
                      >
                        {row.sessions}
                      </Text>
                      <Text
                        style={[
                          insightMetricStyles.bodyRankSeparator,
                          isLight && insightMetricStyles.bodyRankSeparatorLight,
                        ]}
                      >
                        ·
                      </Text>
                      <Text
                        style={[
                          insightMetricStyles.bodyRankTier,
                          isLight && insightMetricStyles.bodyRankTierLight,
                        ]}
                        numberOfLines={1}
                      >
                        {row.rank}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={insightMetricStyles.rankLegend}>
              {["Recruit", "Soldier", "Warrior", "Beast", "Legend"].map(
                (rank) => {
                  const color =
                    BODY_BATTLE_RANK_COLORS[rank] ??
                    BODY_BATTLE_RANK_COLORS["Recruit"];
                  return (
                    <View key={rank} style={insightMetricStyles.rankLegendItem}>
                      <View
                        style={[
                          insightMetricStyles.legendDot,
                          { backgroundColor: color },
                        ]}
                      />
                      <Text
                        style={[
                          insightMetricStyles.legendLabel,
                          isLight && insightMetricStyles.legendLabelLight,
                        ]}
                      >
                        {rank}
                      </Text>
                    </View>
                  );
                },
              )}
            </View>
            </View>
          </MotionEntrance>
        </View>
      </ScrollView>

      {renderFitnessTestModal()}
      {renderCustomWorkoutModal()}
      {renderMetricTooltip()}
      <ExerciseDetailSheet
        visible={!!activeExerciseName}
        isLight={isLight}
        exerciseId={
          activeExerciseName ? demoExerciseIds[activeExerciseName] : null
        }
        exerciseName={activeExerciseName}
        onClose={() => setActiveExerciseName(null)}
      />
    </>
  );
};

const insightMetricStyles = StyleSheet.create({
  summaryCard: {
    minHeight: 156,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "#0F1A2C",
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  summaryCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  racePane: {
    width: "32%",
    minWidth: 112,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: 18,
    backgroundColor: "rgba(148,163,184,0.20)",
  },
  summaryDividerLight: {
    backgroundColor: "rgba(15,23,42,0.10)",
  },
  percentilePane: {
    flex: 1,
    minWidth: 0,
    paddingTop: 16,
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 14,
  },
  percentileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 28,
  },
  percentileTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 7,
  },
  metricKicker: {
    color: "#A7ADBC",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  metricKickerLight: {
    color: "#5E6676",
  },
  raceGaugeWrap: {
    marginTop: 10,
    minHeight: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  raceLabelRow: {
    width: "100%",
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  raceEdgeLabel: {
    color: "#F7F8FA",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    lineHeight: 15,
  },
  raceEdgeLabelLight: {
    color: "#111827",
  },
  tinyInfoButton: {
    marginTop: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  percentileValue: {
    marginTop: 8,
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 0,
  },
  percentileValueLight: {
    color: "#0F172A",
  },
  percentileCaption: {
    marginTop: 2,
    color: "#A7ADBC",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  percentileCaptionLight: {
    color: "#6B7280",
  },
  percentileCurveWrap: {
    marginTop: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  percentileStatus: {
    marginTop: 2,
    alignSelf: "flex-start",
    color: "#8B6CF6",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    lineHeight: 18,
  },
  bodyRankCard: {
    marginTop: 12,
    minHeight: 238,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "#0F1A2C",
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  bodyRankCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  bodyRankHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bodySubtitle: {
    marginTop: 5,
    color: "#A7ADBC",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  bodySubtitleLight: {
    color: "#6B7280",
  },
  infoButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.48)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  infoButtonLight: {
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  bodyRankContent: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  bodyFigurePane: {
    width: 100,
    height: 154,
    marginRight: 12,
  },
  bodyRankList: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  bodyRankRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 6,
  },
  bodyRankRowActive: {
    backgroundColor: "rgba(139,108,246,0.12)",
  },
  bodyRankNameWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  rankDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 9,
  },
  bodyRankName: {
    flex: 1,
    minWidth: 0,
    color: "#F7F8FA",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    lineHeight: 16,
  },
  bodyRankNameLight: {
    color: "#111827",
  },
  bodyRankValue: {
    minWidth: 24,
    textAlign: "right",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    lineHeight: 16,
  },
  bodyRankSeparator: {
    marginHorizontal: 7,
    color: "#A7ADBC",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  bodyRankSeparatorLight: {
    color: "#9CA3AF",
  },
  bodyRankTier: {
    minWidth: 50,
    color: "#A7ADBC",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  bodyRankTierLight: {
    color: "#6B7280",
  },
  rankLegend: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    rowGap: 7,
  },
  rankLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  legendLabel: {
    color: "#A7ADBC",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 15,
  },
  legendLabelLight: {
    color: "#6B7280",
  },
});

const insightStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 0,
    paddingBottom: 6,
    gap: 12,
  },
  sectionHeader: {
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontFamily: "Inter_700Bold",
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: 0,
  },
  sectionTitleLight: {
    color: "#0F172A",
  },
  sectionSubtitle: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  sectionSubtitleLight: {
    color: "#64748B",
  },
  testButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(36,84,244,0.14)",
  },
  testButtonText: {
    marginLeft: 6,
    color: "#EAF0FF",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  referenceCard: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#0F1A2C",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  referenceCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  cardHeaderBlock: {
    marginBottom: 10,
  },
  comparisonPanel: {
    width: "100%",
    paddingHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 4,
  },
  comparisonGraphCard: {
    width: "100%",
    borderRadius: 20,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: "#0F1A2C",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  comparisonGraphCardLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  comparisonTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  comparisonEyebrow: {
    color: "#94A3B8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  comparisonTitle: {
    color: "#F8FAFC",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: 0,
  },
  comparisonTitleLight: {
    color: "#1F1F1F",
  },
  comparisonRangePill: {
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(36,84,244,0.14)",
  },
  comparisonRangePillLight: {
    backgroundColor: "rgba(229,240,248,0.72)",
    borderWidth: 1,
    borderColor: "rgba(0,112,204,0.12)",
  },
  comparisonRangeText: {
    color: "#1D9BF0",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  comparisonRangeTextLight: {
    color: "#0068BD",
  },
  comparisonRangeMenu: {
    alignSelf: "flex-end",
    marginTop: 10,
    marginRight: 4,
    padding: 4,
    borderRadius: 18,
    flexDirection: "row",
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  comparisonRangeMenuLight: {
    backgroundColor: "rgba(238,244,248,0.78)",
    borderColor: "rgba(148,163,184,0.12)",
  },
  comparisonRangeOption: {
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  comparisonRangeOptionActive: {
    backgroundColor: "rgba(36,84,244,0.28)",
  },
  comparisonRangeOptionActiveLight: {
    backgroundColor: "rgba(229,240,248,0.82)",
  },
  comparisonRangeOptionText: {
    color: "#94A3B8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  comparisonRangeOptionTextLight: {
    color: "#475569",
  },
  comparisonRangeOptionTextActive: {
    color: "#F8FAFC",
  },
  comparisonRangeOptionTextActiveLight: {
    color: "#0068BD",
  },
  comparisonValueBlock: {
    alignItems: "flex-end",
  },
  comparisonCurrent: {
    color: "#F8FAFC",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: 0,
  },
  comparisonMeta: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: "Inter_500Medium",
    fontSize: 10,
  },
  comparisonMetaLight: {
    color: "#475569",
  },
  comparisonDescription: {
    marginTop: 8,
    paddingHorizontal: 2,
    color: "#94A3B8",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 15,
  },
  comparisonDescriptionLight: {
    color: "#475569",
  },
  comparisonGraphFrame: {
    marginTop: 10,
  },
  comparisonLegend: {
    marginTop: -2,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    color: "#CBD5E1",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  legendTextLight: {
    color: "#475569",
  },
  comparisonChips: {
    paddingTop: 10,
    paddingRight: 0,
    gap: 8,
  },
  comparisonChip: {
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148,163,184,0.10)",
  },
  comparisonChipLight: {
    backgroundColor: "rgba(238,244,248,0.72)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
  },
  comparisonChipActive: {
    backgroundColor: "rgba(36,84,244,0.24)",
  },
  comparisonChipActiveLight: {
    backgroundColor: "#0070CC",
    borderColor: "#0070CC",
  },
  comparisonChipText: {
    color: "#94A3B8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  comparisonChipTextLight: {
    color: "#475569",
  },
  comparisonChipTextActive: {
    color: "#F8FAFC",
  },
  comparisonChipTextActiveLight: {
    color: "#FFFFFF",
  },
  cardEyebrow: {
    color: "#CBD5E1",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  cardEyebrowLight: {
    color: "#1F1F1F",
  },
  cardHelper: {
    marginTop: 4,
    color: "#94A3B8",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 15,
  },
  cardHelperLight: {
    color: "#475569",
  },
  levelHeadingRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "baseline",
  },
  levelHeading: {
    color: "#F8FAFC",
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    letterSpacing: 0,
  },
  levelHeadingLight: {
    color: "#1F1F1F",
  },
  levelXp: {
    marginLeft: 10,
    color: "#94A3B8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  levelXpLight: {
    color: "#475569",
  },
  questTrack: {
    marginTop: 12,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.16)",
    overflow: "hidden",
    position: "relative",
  },
  questFillTertiary: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#20DDBB",
  },
  questFillSecondary: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#22C9D8",
  },
  questFillPrimary: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#2454F4",
  },
  verticalMetricsRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  verticalMetricItem: {
    width: "18%",
    alignItems: "center",
  },
  verticalTrack: {
    width: "100%",
    height: 96,
    borderRadius: 22,
    backgroundColor: "rgba(148,163,184,0.14)",
    overflow: "hidden",
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
  },
  verticalTrackLight: {
    backgroundColor: "#E5E7EB",
  },
  verticalFill: {
    width: "100%",
    borderRadius: 22,
    position: "absolute",
    bottom: 0,
  },
  verticalBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    shadowOpacity: 0,
  },
  verticalBubbleText: {
    color: "#F8FAFC",
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    lineHeight: 11,
    textAlign: "center",
    includeFontPadding: false,
    paddingHorizontal: 2,
    width: "100%",
  },
  verticalLabel: {
    marginTop: 7,
    color: "#E2E8F0",
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    lineHeight: 11,
    textAlign: "center",
    includeFontPadding: false,
    width: "108%",
  },
  verticalLabelLight: {
    color: "#1F1F1F",
  },
  summaryStrip: {
    minHeight: 54,
    borderRadius: 20,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F1A2C",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
  },
  summaryStripLight: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    color: "#F8FAFC",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  summaryValueLight: {
    color: "#0F172A",
  },
  summaryLabel: {
    marginTop: 3,
    color: "#94A3B8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    lineHeight: 12,
  },
  summaryLabelLight: {
    color: "#64748B",
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  summaryDividerLight: {
    backgroundColor: "#E5E7EB",
  },
});

export default HomeScreen;
