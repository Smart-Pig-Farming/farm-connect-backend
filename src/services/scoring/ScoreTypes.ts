export const POINT_SCALE = 1000;

export const Points = {
  POST_CREATED: 2,
  REPLY_CREATED_REPLIER: 1,
  REPLY_CREATED_PARENT: 1,
  REACTION_UPVOTE_RECEIVED: 1,
  REACTION_DOWNVOTE_RECEIVED: -1,
  MOD_APPROVED_BONUS: 15,
  REPORT_CONFIRMED_PENALTY: -5,
  REPORT_CONFIRMED_REPORTER_REWARD: 1,
  REPORT_REJECTED_REPORTER_REWARD: 1,
  STREAK_7: 5,
  STREAK_30: 10,
  // Refined streak bonus progression:
  // 7 (+5 cumulative 5), 30 (+10 cumulative 15), 90 (+25 cumulative 40),
  // 180 (+50 cumulative 90), 365 (+100 cumulative 190)
  STREAK_90: 25,
  STREAK_180: 50,
  STREAK_365: 100,
  TRICKLE_PARENT_SUPPORTIVE: 1,
  TRICKLE_GRANDPARENT_SUPPORTIVE: 0.5,
  TRICKLE_ROOT_SUPPORTIVE: 0.25,
  TRICKLE_PARENT_CONTRADICT_UPVOTE: -1,
  TRICKLE_GRANDPARENT_CONTRADICT_UPVOTE: -0.5,
  TRICKLE_ROOT_CONTRADICT_UPVOTE: -0.25,
  TRICKLE_PARENT_CONTRADICT_DOWNVOTE: 1,
  TRICKLE_GRANDPARENT_CONTRADICT_DOWNVOTE: 0.5,
  TRICKLE_ROOT_CONTRADICT_DOWNVOTE: 0.25,
  BEST_PRACTICE_FIRST_READ: 1,
  QUIZ_COMPLETED_PASS: 5,
  QUIZ_COMPLETED_FAIL: 1,
} as const;

export type SemanticLabel = "supportive" | "contradictory";

export interface ClassificationResult {
  label: SemanticLabel;
  confidence: number;
  source: string;
}

export function toScaled(value: number): number {
  return Math.round(value * POINT_SCALE);
}

export function fromScaled(value: number): number {
  return value / POINT_SCALE;
}
