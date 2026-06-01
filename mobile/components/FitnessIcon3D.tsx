import React from "react";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
} from "react-native-svg";

export type FitnessIcon3DName =
  | "home"
  | "record"
  | "plans"
  | "calendar"
  | "exercises"
  | "gym"
  | "strength"
  | "workout"
  | "run"
  | "cardio"
  | "sports"
  | "hybrid"
  | "recovery"
  | "rest"
  | "challenges"
  | "trophy"
  | "community"
  | "friends"
  | "insights"
  | "progress"
  | "target"
  | "flame"
  | "sparkles"
  | "flag"
  | "compass"
  | "nutrition";

type FitnessIcon3DProps = {
  name: FitnessIcon3DName;
  size?: number;
  active?: boolean;
  muted?: boolean;
  tile?: boolean;
  color?: string;
  accentColor?: string;
};

const ACTIVE = "#0070CC";
const INACTIVE = "#64748B";
const ACTIVE_ACCENT = "#1EAEDB";

type GlyphProps = {
  name: FitnessIcon3DName;
  stroke: string;
  accent: string;
  active: boolean;
};

const Glyph = ({ name, stroke, accent, active }: GlyphProps) => {
  const strokeWidth = active ? 2.35 : 2.05;
  const common = {
    fill: "none",
    stroke,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const soft = active ? accent : stroke;

  switch (name) {
    case "home":
      return (
        <G>
          <Path {...common} d="M5.2 14.2 16 5.4l10.8 8.8" />
          <Path {...common} d="M8.2 12.4v13h5.3v-7.1h5v7.1h5.3v-13" />
        </G>
      );
    case "record":
      return (
        <G>
          <Circle {...common} cx={16} cy={16} r={9.2} stroke={active ? accent : stroke} />
          <Line {...common} x1={16} y1={10.8} x2={16} y2={21.2} />
          <Line {...common} x1={10.8} y1={16} x2={21.2} y2={16} />
        </G>
      );
    case "plans":
    case "calendar":
      return (
        <G>
          <Rect {...common} x={6.2} y={7.8} width={19.6} height={17.4} rx={4} />
          <Line {...common} x1={6.2} y1={13.1} x2={25.8} y2={13.1} />
          <Line {...common} x1={11.1} y1={5.6} x2={11.1} y2={9.7} />
          <Line {...common} x1={20.9} y1={5.6} x2={20.9} y2={9.7} />
          <Circle cx={11.6} cy={17.4} r={1.15} fill={soft} />
          <Circle cx={16} cy={17.4} r={1.15} fill={soft} opacity={0.72} />
          <Circle cx={20.4} cy={17.4} r={1.15} fill={soft} />
        </G>
      );
    case "exercises":
    case "gym":
    case "strength":
    case "workout":
      return (
        <G>
          <Line {...common} x1={8.2} y1={16} x2={23.8} y2={16} />
          <Rect {...common} x={5.6} y={11.8} width={4} height={8.4} rx={1.4} />
          <Rect {...common} x={22.4} y={11.8} width={4} height={8.4} rx={1.4} />
          <Line {...common} x1={12} y1={13.7} x2={12} y2={18.3} opacity={0.72} />
          <Line {...common} x1={20} y1={13.7} x2={20} y2={18.3} opacity={0.72} />
        </G>
      );
    case "run":
    case "cardio":
    case "sports":
      return (
        <G>
          <Circle cx={17.1} cy={7.8} r={2.2} fill={stroke} />
          <Path {...common} d="M14.3 12.6 17.3 10l3.1 2.5 1.5 4.2" />
          <Path {...common} d="m15.1 13.1-3.4 4.8M18.1 16.2l4.4 4.4M13.1 10.8l-3.4-1.7" />
          <Line {...common} x1={8.3} y1={24.1} x2={23.7} y2={24.1} opacity={0.38} />
        </G>
      );
    case "hybrid":
      return (
        <G>
          <Path {...common} d="M17.4 4.9 9.9 16.9h6.2l-1.4 10.2 7.8-12.8h-6.1Z" stroke={active ? accent : stroke} />
          <Line {...common} x1={7.7} y1={23.3} x2={24.3} y2={23.3} opacity={0.5} />
        </G>
      );
    case "recovery":
    case "rest":
      return (
        <G>
          <Path {...common} d="M22.5 19.7A8.4 8.4 0 0 1 12.3 7.5a9.2 9.2 0 1 0 10.2 12.2Z" />
          <Circle cx={23} cy={8.8} r={1.2} fill={soft} />
          <Circle cx={25.1} cy={13} r={0.8} fill={soft} opacity={0.72} />
        </G>
      );
    case "challenges":
    case "trophy":
      return (
        <G>
          <Path {...common} d="M10.2 6.7h11.6v5.1c0 4.4-2.3 7-5.8 7s-5.8-2.6-5.8-7Z" />
          <Path {...common} d="M10.3 9.1H6.8c.2 4.2 2.2 6.5 5.2 6.9M21.7 9.1h3.5c-.2 4.2-2.2 6.5-5.2 6.9" />
          <Line {...common} x1={16} y1={18.9} x2={16} y2={23.2} />
          <Line {...common} x1={11.8} y1={25} x2={20.2} y2={25} />
        </G>
      );
    case "community":
    case "friends":
      return (
        <G>
          <Circle {...common} cx={16} cy={10.6} r={3.3} />
          <Path {...common} d="M9.5 25.1c.7-4.9 2.9-7.2 6.5-7.2s5.8 2.3 6.5 7.2" />
          <Circle {...common} cx={8.6} cy={14.1} r={2.4} opacity={0.72} />
          <Circle {...common} cx={23.4} cy={14.1} r={2.4} opacity={0.72} />
          <Path {...common} d="M4.8 24.3c.5-3 1.9-4.6 4.1-4.8M27.2 24.3c-.5-3-1.9-4.6-4.1-4.8" opacity={0.72} />
        </G>
      );
    case "insights":
    case "progress":
      return (
        <G>
          <Rect {...common} x={7.3} y={17} width={3.8} height={7.7} rx={1.5} />
          <Rect {...common} x={14.1} y={12.5} width={3.8} height={12.2} rx={1.5} />
          <Rect {...common} x={20.9} y={8.3} width={3.8} height={16.4} rx={1.5} />
          <Path {...common} d="m7.4 13.1 5.3-4 4.7 2.8 6.8-6.2" stroke={active ? accent : stroke} opacity={0.9} />
        </G>
      );
    case "target":
      return (
        <G>
          <Circle {...common} cx={16} cy={16} r={9.2} />
          <Circle {...common} cx={16} cy={16} r={5.2} opacity={0.76} />
          <Circle cx={16} cy={16} r={1.65} fill={soft} />
          <Path {...common} d="m21.9 10.1 4.2-4.2M23.1 5.9h3v3" opacity={0.76} />
        </G>
      );
    case "flame":
      return (
        <G>
          <Path {...common} d="M16.4 26.1c4.3 0 7.3-3 7.3-7.1 0-2.8-1.4-5.1-4-7.3.2 2.4-.8 3.8-2.3 4.6.2-4.1-1.5-7.3-5.3-9.9.6 4.7-3.9 6.8-3.9 12.1 0 4.4 3.3 7.6 8.2 7.6Z" />
          <Path {...common} d="M16.2 22.8c1.7 0 3.1-1.2 3.1-2.9 0-1.2-.6-2.2-1.7-3.1 0 1.2-.6 2-1.7 2.5.1-1.7-.5-3.1-2-4.3.2 2.3-1.5 3.4-1.5 5.1 0 1.6 1.4 2.7 3.8 2.7Z" opacity={0.52} />
        </G>
      );
    case "sparkles":
      return (
        <G>
          <Path {...common} d="M15.8 5.9 18 12l5.9 2.2-5.9 2.2-2.2 6.1-2.2-6.1-5.9-2.2 5.9-2.2Z" />
          <Path {...common} d="m24 6.4.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8ZM8 20.5l.6 1.7 1.7.6-1.7.6L8 25.1l-.6-1.7-1.7-.6 1.7-.6Z" opacity={0.72} />
        </G>
      );
    case "flag":
      return (
        <G>
          <Line {...common} x1={9.2} y1={25.6} x2={9.2} y2={6.2} />
          <Path {...common} d="M10.1 7.1h11.5l-2.2 4.1 2.2 4.1H10.1Z" />
        </G>
      );
    case "compass":
      return (
        <G>
          <Circle {...common} cx={16} cy={16} r={9.7} />
          <Path {...common} d="m20.7 10.4-2.4 7.9-7 3.3 2.4-7.9Z" />
          <Circle cx={16} cy={16} r={1.35} fill={soft} />
        </G>
      );
    case "nutrition":
      return (
        <G>
          <Path {...common} d="M17.8 8.3c4.7-.7 7.2 2.3 6.7 6.5-.5 4.5-4.1 8.1-8.5 8.7-4.4-.6-8-4.2-8.5-8.7-.5-4.2 2-7.2 6.7-6.5.7.1 1.3.3 1.8.6.5-.3 1.1-.5 1.8-.6Z" />
          <Path {...common} d="M16.8 8.4c.4-2.2 1.8-3.6 4.3-4" opacity={0.72} />
        </G>
      );
    default:
      return null;
  }
};

export const FitnessIcon3D: React.FC<FitnessIcon3DProps> = ({
  name,
  size = 30,
  active = false,
  muted = false,
  color,
  accentColor,
}) => {
  const accent = accentColor ?? ACTIVE_ACCENT;
  const stroke = color ?? (active ? ACTIVE : INACTIVE);
  const opacity = muted ? 0.68 : 1;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" opacity={opacity}>
      {active ? (
        <Circle cx={16} cy={16} r={13.2} fill={accent} opacity={0.1} />
      ) : null}
      <Glyph
        name={name}
        stroke={stroke}
        accent={accent}
        active={active}
      />
    </Svg>
  );
};

export const iconNameFromWorkoutType = (
  type: string | null | undefined,
): FitnessIcon3DName | null => {
  switch ((type || "").toLowerCase()) {
    case "strength":
      return "strength";
    case "cardio":
      return "cardio";
    case "run":
    case "running":
      return "run";
    case "hybrid":
      return "hybrid";
    case "recovery":
      return "recovery";
    case "rest":
      return "rest";
    default:
      return null;
  }
};
