export type DashboardFitnessAgeMetric = {
  available: boolean;
  fitness_age_years: number | null;
  chronological_age: number | null;
  detail: any;
};

export type DashboardRaceReadinessMetric = {
  available: boolean;
  score: number | null;
  detail: any;
};

export type DashboardPercentileMetric = {
  available: boolean;
  percentile: number | null;
  detail: any;
};

export type DashboardStreakMetric = {
  available: boolean;
  current_streak_days: number | null;
  longest_streak_days: number | null;
  multiplier: number | null;
  detail: any;
};

export type DashboardTotalTimeMetric = {
  available: boolean;
  total_minutes_7d: number | null;
  total_minutes_30d: number | null;
  total_minutes_all_time: number | null;
  detail: any;
};

export type DashboardBodyBattleMapMetric = {
  available: boolean;
  balance_score: number | null;
  detail: any;
};

export type DashboardMetrics = {
  fitness_age: DashboardFitnessAgeMetric;
  race_readiness: DashboardRaceReadinessMetric;
  percentile_rank: DashboardPercentileMetric;
  streak: DashboardStreakMetric;
  total_time: DashboardTotalTimeMetric;
  body_battle_map: DashboardBodyBattleMapMetric;
};

export type DashboardSummary = {
  hero: any;
  metrics: DashboardMetrics;
  quick_workouts: any[];
  recent_activity: any[];
  calendar: any;
  ai_estimation: any;
  badge_preview: any;
};
