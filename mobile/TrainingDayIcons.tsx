import React from "react";

import {
  FitnessIcon3D,
  iconNameFromWorkoutType,
} from "./components/FitnessIcon3D";

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

export const FancyWorkoutTypeIcon: React.FC<Props> = ({
  type,
  size = 22,
}) => {
  const iconName = iconNameFromWorkoutType(type);
  if (!iconName) return null;

  return <FitnessIcon3D name={iconName} size={size} tile={false} />;
};
