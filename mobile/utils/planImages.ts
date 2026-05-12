import type { ImageSourcePropType } from "react-native";

const HYROX_GOAL_BG = require("../assets/plans/hyrox-goal-bg.png");
const MARATHON_GOAL_BG = require("../assets/plans/marathon-goal-bg.png");
const LEAN_MUSCLE_GOAL_BG = require("../assets/plans/lean-muscle-goal-bg.png");
const BUSY_PROFESSIONAL_GOAL_BG = require("../assets/plans/busy-professional-goal-bg.png");
const HYBRID_ATHLETE_GOAL_BG = require("../assets/plans/hybrid-athlete-goal-bg.png");
const FAT_LOSS_SHRED_GOAL_BG = require("../assets/plans/fat-loss-shred-goal-bg.png");

type PlanArtworkSource = {
  id?: string | number | null;
  name?: string | null;
  goal?: string | null;
  summary?: string | null;
  audience?: string | null;
  result?: string | null;
};

const matches = (pattern: RegExp, values: Array<unknown>) =>
  values.some((value) => pattern.test(String(value ?? "")));

export const getPlanImageSource = (
  plan: PlanArtworkSource | null | undefined,
): ImageSourcePropType => {
  const values = [
    plan?.id,
    plan?.name,
    plan?.goal,
    plan?.summary,
    plan?.audience,
    plan?.result,
  ];

  if (matches(/fat[\s_-]*loss|shred|metabolic/i, values)) {
    return FAT_LOSS_SHRED_GOAL_BG;
  }
  if (matches(/hybrid[\s_-]*athlete/i, values)) {
    return HYBRID_ATHLETE_GOAL_BG;
  }
  if (matches(/busy[\s_-]*professional|founder|office/i, values)) {
    return BUSY_PROFESSIONAL_GOAL_BG;
  }
  if (
    matches(
      /lean[\s_-]*muscle|muscle[\s_-]*builder|hypertrophy|aesthetic/i,
      values,
    )
  ) {
    return LEAN_MUSCLE_GOAL_BG;
  }
  if (matches(/marathon/i, values)) {
    return MARATHON_GOAL_BG;
  }
  return HYROX_GOAL_BG;
};
