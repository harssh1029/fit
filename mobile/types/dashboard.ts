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

export type DashboardTrainingProfileMetric = {
  available: boolean;
  level: {
    level: number;
    title: string;
    career_xp: number;
    current_level_xp: number;
    next_level_xp: number;
    progress_percent: number;
  };
  body_focus: Array<{
    key: string;
    label: string;
    xp: number;
    target_xp: number;
    percent: number;
    rank: string;
    sessions: number;
    icon: string;
    accent: string;
  }>;
  category_levels: Array<{
    key: string;
    label: string;
    xp: number;
    target_xp: number;
    percent: number;
    tier: string;
    icon: string;
    accent: string;
  }>;
  weekly_xp: number;
  monthly_xp: number;
  performance_score: number;
  training_balance_score: number;
  comparison_metrics?: {
    default_metric: string;
    metrics: Array<{
      key: string;
      label: string;
      unit: string;
      description?: string;
      current: number;
      average: number;
      ideal: number;
      trend: Array<{
        label: string;
        you: number;
        average: number;
        ideal: number;
      }>;
    }>;
  };
};

export type DashboardMetrics = {
  fitness_age: DashboardFitnessAgeMetric;
  race_readiness: DashboardRaceReadinessMetric;
  percentile_rank: DashboardPercentileMetric;
  streak: DashboardStreakMetric;
  total_time: DashboardTotalTimeMetric;
  body_battle_map: DashboardBodyBattleMapMetric;
  training_profile?: DashboardTrainingProfileMetric;
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
