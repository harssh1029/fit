export type CommunityFriendSummary = {
  id: string;
  name: string;
  username?: string;
  avatarInitials?: string;
  avatarUrl?: string;
  overallScore?: number;
  consistencyScore: number;
  challengesCompleted: number;
  bodyBalancePercent?: number;
  activePlanName?: string | null;
  streakDays?: number;
  recentSessionsThisWeek?: number;
  fitnessAgeYears?: number | null;
  followersCount?: number;
  followingCount?: number;
  postCount?: number;
  performanceScore?: number;
  weeklyXp?: number;
  careerXp?: number;
  currentLevel?: number;
  currentTitle?: string;
  tier?: string;
};

export type CommunityUserSuggestion = {
  id: number;
  username: string;
  name: string;
  avatarInitials?: string;
  avatarUrl?: string;
  friendshipStatus?: string | null;
};

export type CommunityActivity = {
  id: number;
  userId: number;
  userName: string;
  avatarInitials?: string;
  avatarUrl?: string;
  type: "workout" | "challenge" | "plan" | "test" | "badge" | "group";
  title: string;
  description?: string;
  score?: number | null;
  metadata?: Record<string, unknown>;
  occurredAt: string;
  likedByMe?: boolean;
  savedByMe?: boolean;
  likesCount?: number;
  commentsCount?: number;
  shareCount?: number;
  frontendSummary?: {
    title?: string;
    duration_minutes?: number;
    intensity?: string;
    focus?: string;
    xp?: number;
    challenge_badge?: string | null;
    image_urls?: string[];
    earned_badges?: Array<{
      id: string;
      name: string;
      rarity?: string;
      reason?: string;
    }>;
  } | null;
};

export type SavedCommunityActivityPage = {
  results: CommunityActivity[];
  nextCursor?: number | null;
};

export type CommunityActivityComment = {
  id: number;
  userId: number;
  userName: string;
  avatarInitials?: string;
  avatarUrl?: string;
  body: string;
  createdAt: string;
};

export type TodayActivityUpdate = {
  id: string;
  user: {
    id: number;
    name: string;
    avatar_url?: string;
  };
  type:
    | "workout_completed"
    | "workout_started"
    | "challenge_joined"
    | "challenge_completed"
    | "plan_completed"
    | "streak_reached"
    | "rank_moved"
    | "pr_logged"
    | "group_joined"
    | "badge_earned";
  title: string;
  subtitle?: string;
  time_ago: string;
  created_at: string;
  is_live: boolean;
  live_duration_seconds?: number | null;
  priority_score: number;
};

export type CommunityLeaderboardResponse = {
  metric: string;
  scope?: "global" | "following" | "group" | "location";
  selected_group?: CommunityGroupCard | null;
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

export type CommunityGroupCard = {
  id: number;
  name: string;
  description?: string;
  category?: string;
  groupType?: string;
  privacy: "public" | "private" | "invite_only";
  goal?: string;
  coverImageUrl?: string;
  weeklyGoalTarget?: number;
  weeklyActivityCount?: number;
  groupRank?: number | null;
  activeChallenge?: string;
  memberCount: number;
  myRole?: "owner" | "admin" | "member" | null;
  joined: boolean;
};

export type CommunityGroupMember = {
  id: number;
  userId: number;
  userName: string;
  avatarInitials?: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "member";
  status: string;
  created_at: string;
};

export type CommunityGroupJoinRequest = {
  id: number;
  userId: number;
  userName: string;
  avatarInitials?: string;
  createdAt: string;
};

export type CommunityGroupChallenge = {
  id: number;
  groupId: number;
  createdById: number;
  title: string;
  challenge_type: string;
  eligible_workout_types: string[];
  eligible_body_parts: string[];
  min_duration: number;
  max_daily_entries: number;
  start_date: string;
  end_date: string;
  scoring_rules: Record<string, unknown>;
  completion_bonus: number;
  required_sessions: number;
  reward_xp: number;
  badge_icon?: string;
  visibility: "official" | "community" | "group" | string;
  created_at: string;
};

export type CommunityGroupDetail = CommunityGroupCard & {
  pulse?: CommunityActivity[];
  memberActivity?: CommunityActivity[];
  threads?: CommunityActivity[];
  events?: CommunityActivity[];
  notifications?: CommunityActivity[];
  weeklyGoal?: {
    target: number;
    current: number;
    percent: number;
  };
  activeChallenges?: CommunityGroupChallenge[];
  leaderboard?: {
    top: Array<{ rank: number; userId: number; name: string; score: number; isYou?: boolean }>;
    userRank?: { rank: number; userId: number; name: string; score: number; isYou?: boolean } | null;
    neighborhood?: Array<{ rank: number; userId: number; name: string; score: number; isYou?: boolean }>;
  };
  pinnedAnnouncement?: {
    id: number;
    title: string;
    body?: string;
    announcement_type: string;
  } | null;
  pendingRequest?: boolean;
  joinRequests?: CommunityGroupJoinRequest[];
};

export type CommunityGroupFeed = {
  memberActivity: CommunityActivity[];
  threads: CommunityActivity[];
  events: CommunityActivity[];
  notifications: CommunityActivity[];
};

export type CommunityPublicProfile = {
  public_card: CommunityFriendSummary;
  posts: CommunityActivity[];
  prs: Array<Record<string, unknown>>;
  challenges: Array<Record<string, unknown>>;
  groups: CommunityGroupCard[];
  achievements?: {
    level?: Record<string, unknown>;
    categoryLevels?: Array<Record<string, unknown>>;
    featuredBadges?: Array<Record<string, unknown>>;
    recentBadges?: Array<Record<string, unknown>>;
    completedChallenges?: Array<Record<string, unknown>>;
    completedPlans?: Array<Record<string, unknown>>;
  };
  is_following?: boolean;
};

export type PremiumChallengeCard = {
  id: number;
  name: string;
  description?: string;
  requirement: string;
  durationDays?: number;
  eligibleWorkoutTypes?: string[];
  eligibleBodyParts?: string[];
  minimumDuration?: number;
  requiredSessions?: number;
  allowedIntensity?: string[];
  startDate?: string | null;
  endDate?: string | null;
  progress: {
    sessionsCompleted: number;
    requiredSessions: number;
    percent: number;
  };
  participants: number;
  completedParticipants?: number;
  daysLeft: number;
  badgeRewardPreview?: string;
  xpReward: number;
  joined: boolean;
  completed: boolean;
  visibility: "official" | "community" | "group";
  isOfficial: boolean;
  groupId?: number | null;
  groupName?: string | null;
};

export type TrainingChallengeCreatePayload = {
  name: string;
  description?: string;
  requirement?: string;
  duration_days?: number;
  required_sessions?: number;
  minimum_duration?: number;
  reward_xp?: number;
  eligible_workout_types?: string[];
  eligible_body_parts?: string[];
  allowed_intensity?: string[];
  visibility?: "community" | "group" | "official";
};

export type TrainingChallengeParticipant = {
  id: number;
  userId: number;
  userName: string;
  avatarInitials?: string;
  status: "active" | "completed" | "left";
  joinedAt?: string | null;
  completedAt?: string | null;
  progress: {
    sessionsCompleted: number;
    requiredSessions: number;
    percent: number;
    points: number;
    activeDays: number;
  };
};

export type PremiumChallengeSections = {
  active: PremiumChallengeCard[];
  trending: PremiumChallengeCard[];
  official: PremiumChallengeCard[];
  community: PremiumChallengeCard[];
  completed: PremiumChallengeCard[];
};

export type AchievementBadge = {
  id: number;
  badge: {
    id: string;
    name: string;
    description: string;
    category: string;
    tier: string;
    icon?: string;
    rarity: "common" | "rare" | "elite" | "legendary";
  };
  earnedAt: string;
  periodKey?: string;
};

export type CommunityOverview = {
  todayActivity: TodayActivityUpdate[];
  groups: CommunityGroupCard[];
  challenges: PremiumChallengeSections;
};
