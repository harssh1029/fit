export type CommunityFriendSummary = {
  id: string;
  name: string;
  username?: string;
  avatarInitials?: string;
  overallScore?: number;
  consistencyScore: number;
  challengesCompleted: number;
  bodyBalancePercent?: number;
  activePlanName?: string | null;
  streakDays?: number;
  recentSessionsThisWeek?: number;
  fitnessAgeYears?: number | null;
};

export type CommunityUserSuggestion = {
  id: number;
  username: string;
  name: string;
  avatarInitials?: string;
  friendshipStatus?: string | null;
};

export type CommunityActivity = {
  id: number;
  userId: number;
  userName: string;
  avatarInitials?: string;
  type: "workout" | "challenge" | "plan" | "test";
  title: string;
  description?: string;
  score?: number | null;
  metadata?: Record<string, unknown>;
  occurredAt: string;
};

export type CommunityLeaderboardResponse = {
  metric: string;
  limit: number;
  user_rank: number | null;
  user_card?: CommunityFriendSummary;
  results: CommunityFriendSummary[];
};

export type CommunitySummary = {
  public_card: CommunityFriendSummary;
  friends: CommunityFriendSummary[];
  recent_activity: CommunityActivity[];
};
