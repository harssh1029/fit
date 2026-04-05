import React from "react";
import Svg, { Rect, Circle, Path } from "react-native-svg";

export type WorkoutTypeIconKind =
  | "strength"
  | "cardio"
  | "run"
  | "hybrid"
  | "recovery"
  | "rest";

type Props = {
  type: WorkoutTypeIconKind | null | undefined;
  size?: number;
  color?: string;
};

const ICON_PRIMARY = "#F9FAFB"; // light ink so it works on dark tiles

// Minimal, high‑contrast barbell glyph
const StrengthIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={5} y={10} width={2.4} height={4} rx={0.9} fill={color} />
    <Rect x={7.8} y={11} width={8.4} height={2} rx={1} fill={color} />
    <Rect x={16.2} y={10} width={2.4} height={4} rx={0.9} fill={color} />
  </Svg>
);

// Simple running figure / movement glyph – used for "Run" days
const RunIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    {/* Head */}
    <Circle cx={11} cy={7} r={1.4} fill={color} />
    {/* Torso + front leg */}
    <Path
      d="M9.2 10.2 11.3 9l1.3 1.2 1.1 2.8M10.3 10.8l-1.6 3.2M11.9 12.5l2.6 2.4"
      fill="none"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Hybrid glyph – circle with small barbell to suggest mixed training
const HybridIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle
      cx={12}
      cy={12}
      r={6.4}
      stroke={color}
      strokeWidth={1.2}
      fill="none"
    />
    <Rect x={8.4} y={11} width={1.8} height={3.2} rx={0.8} fill={color} />
    <Rect x={10.4} y={11.7} width={4.8} height={1.8} rx={0.9} fill={color} />
    <Rect x={15.4} y={11} width={1.8} height={3.2} rx={0.8} fill={color} />
  </Svg>
);

// Crescent‑moon rest glyph
const RecoveryIcon = ({ size, color }: { size: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M15.4 8.1A5.1 5.1 0 0 1 10.2 14 5 5 0 0 1 8 13.4 4.4 4.4 0 0 0 13.1 8a4.4 4.4 0 0 0-1.7-3.2A5.1 5.1 0 0 1 15.4 8.1Z"
      fill={color}
    />
    <Circle cx={16.4} cy={8.2} r={0.5} fill={color} />
    <Circle cx={15.6} cy={11.6} r={0.4} fill={color} />
  </Svg>
);

export const FancyWorkoutTypeIcon: React.FC<Props> = ({
  type,
  size = 20,
  color = ICON_PRIMARY,
}) => {
  if (!type) return null;
  switch (type) {
    case "strength":
      return <StrengthIcon size={size} color={color} />;
    case "run":
      return <RunIcon size={size} color={color} />;
    case "cardio":
      return <RunIcon size={size} color={color} />;
    case "hybrid":
      return <HybridIcon size={size} color={color} />;
    case "recovery":
    case "rest":
      return <RecoveryIcon size={size} color={color} />;
    default:
      return null;
  }
};
