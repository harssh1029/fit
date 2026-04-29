export type ChallengeStatus = "unlocked" | "locked" | "done";

export type ChallengeCard = {
  icon: string; // emoji or short label
  name: string;
  body_map_tags: string[];
  short_description: string;
  level: "beginner" | "intermediate" | "advanced";
  level_index: number; // 1-10
  status: ChallengeStatus;
};

export type ChallengeDetailExercise = {
  name: string;
  reps_or_time: string;
};

export type ChallengeDetailDay = {
  day_number: number;
  day_type: "workout" | "rest" | "test";
  day_title: string;
  exercises: ChallengeDetailExercise[];
  day_note: string;
  track_metric: string | null;
  goal: string | null;
};

export type ChallengeDetail = {
  quote: string;
  format: string;
  duration_days: number;
  difficulty: number; // 1-5
  days: ChallengeDetailDay[];
  complete_condition: string;
  badge_name: string;
  bonus: string | null;
};

export type ChallengeUnlockCondition = {
  body_part: string;
  min_workouts: number;
  level_required: "recruit" | "soldier" | "warrior" | "beast" | "legend";
};

export type ChallengeUnlock = {
  is_free: boolean;
  conditions: ChallengeUnlockCondition[];
  challenges_completed_required: number;
  unlock_message: string;
};

export type ChallengeUnlockProgressGroup = {
  key: string;
  label: string;
  sessions: number;
  rank: string;
  rankIndex: number;
  sessionsMet: boolean;
  rankMet: boolean;
  isMet: boolean;
};

export type ChallengeUnlockProgressCondition = {
  bodyPart: string;
  minWorkouts: number;
  levelRequired: ChallengeUnlockCondition["level_required"];
  levelRequiredIndex: number;
  isMet: boolean;
  mode: "any";
  groups: ChallengeUnlockProgressGroup[];
};

export type ChallengeUnlockProgress = {
  isUnlocked: boolean;
  isFree: boolean;
  conditions: ChallengeUnlockProgressCondition[];
  challengesCompletedRequired: number;
  challengesCompletedCount: number;
  unlockMessage: string;
};

export type ApiChallenge = {
  id: string;
  order: number;
  card: ChallengeCard;
  detail: ChallengeDetail;
  unlock: ChallengeUnlock;
  unlockProgress?: ChallengeUnlockProgress;
};
