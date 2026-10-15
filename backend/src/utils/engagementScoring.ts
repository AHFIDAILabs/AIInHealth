import type { RegistrationType, TicketCategory } from '../types/enums.js';

// Pure, DB-free scoring rules for the Portal's public Engagement Score
// Leaderboard — same shape as cardGenerator.ts's wrapText: plain functions
// over plain inputs, so the whole scoring/visibility model is unit-testable
// without a database. jobs/engagementScore.job.ts is the only caller; it
// supplies these inputs from real Registration/MeetingRequest documents and
// persists the result.
export const WEIGHTS = {
  checkIn: 20,
  perMeetingCounterpart: 10,
  perBookmark: 2,
  profile: 10,
} as const;

export const CAPS = {
  meetingCounterparts: 5,
  bookmarks: 10,
} as const;

// A regression guard, not a UI constant — if someone tweaks a weight/cap
// above without updating engagementScoring.test.ts's "maxed-out" assertion,
// that test fails loudly instead of the ceiling silently drifting.
export const MAX_ENGAGEMENT_SCORE =
  WEIGHTS.checkIn +
  WEIGHTS.perMeetingCounterpart * CAPS.meetingCounterparts +
  WEIGHTS.perBookmark * CAPS.bookmarks +
  WEIGHTS.profile; // 20 + 50 + 20 + 10 = 100

// Hidden from the public board by default (unless they personally opt in) —
// a sitting minister, VIP partner, or confirmed speaker shouldn't be publicly
// ranked without choosing to be. Everyone else defaults to visible but can
// still opt themselves out (see resolveLeaderboardVisibility).
export const SENSITIVE_LEADERBOARD_CATEGORIES: readonly TicketCategory[] = ['vip', 'government_official', 'speaker'];

export const ENGAGEMENT_BADGES = {
  checkedIn: 'checked_in',
  networker: 'networker',
  superNetworker: 'super_networker',
  sessionExplorer: 'session_explorer',
  profilePro: 'profile_pro',
  top10: 'top_10',
  top3: 'top_3',
} as const;
export type EngagementBadge = (typeof ENGAGEMENT_BADGES)[keyof typeof ENGAGEMENT_BADGES];

export interface EngagementInput {
  type: RegistrationType;
  ticketCategory?: TicketCategory;
  checkedIn: boolean;
  bookmarkedSessionsCount: number;
  distinctAcceptedMeetingCounterparts: number;
  hasProfilePhoto: boolean;
  /** Tri-state: undefined = inherit the category default, true/false = the delegate's own explicit choice (always wins). */
  leaderboardOptIn?: boolean | null;
}

export interface EngagementBreakdown {
  checkIn: number;
  meetings: number;
  bookmarks: number;
  profile: number;
}

export interface EngagementResult {
  score: number;
  breakdown: EngagementBreakdown;
  visible: boolean;
  badges: EngagementBadge[];
}

// Isolated from computeEngagementScore so the visibility matrix (team
// excluded outright / sensitive categories default-hidden / an explicit
// opt-out or opt-in always overriding the category default) is independently
// testable and has exactly one place deciding it.
export const resolveLeaderboardVisibility = (
  input: Pick<EngagementInput, 'type' | 'ticketCategory' | 'leaderboardOptIn'>
): boolean => {
  // Event staff/organizers aren't part of the public board at all — a new
  // rule (no existing 'team'-exclusion precedent in this codebase to lean
  // on), so it's enforced here explicitly rather than assumed elsewhere.
  if (input.type === 'team') return false;
  if (input.leaderboardOptIn === false) return false;
  if (input.leaderboardOptIn === true) return true;
  // leaderboardOptIn is undefined — inherit the category default.
  const isSensitive = !!input.ticketCategory && SENSITIVE_LEADERBOARD_CATEGORIES.includes(input.ticketCategory);
  return !isSensitive;
};

export const computeEngagementScore = (input: EngagementInput): EngagementResult => {
  const cappedMeetingCounterparts = Math.min(input.distinctAcceptedMeetingCounterparts, CAPS.meetingCounterparts);
  const cappedBookmarks = Math.min(input.bookmarkedSessionsCount, CAPS.bookmarks);

  const breakdown: EngagementBreakdown = {
    checkIn: input.checkedIn ? WEIGHTS.checkIn : 0,
    meetings: cappedMeetingCounterparts * WEIGHTS.perMeetingCounterpart,
    bookmarks: cappedBookmarks * WEIGHTS.perBookmark,
    profile: input.hasProfilePhoto ? WEIGHTS.profile : 0,
  };
  const score = breakdown.checkIn + breakdown.meetings + breakdown.bookmarks + breakdown.profile;

  const badges: EngagementBadge[] = [];
  if (input.checkedIn) badges.push(ENGAGEMENT_BADGES.checkedIn);
  if (input.distinctAcceptedMeetingCounterparts >= 5) badges.push(ENGAGEMENT_BADGES.superNetworker);
  else if (input.distinctAcceptedMeetingCounterparts >= 1) badges.push(ENGAGEMENT_BADGES.networker);
  if (input.bookmarkedSessionsCount >= 5) badges.push(ENGAGEMENT_BADGES.sessionExplorer);
  if (input.hasProfilePhoto) badges.push(ENGAGEMENT_BADGES.profilePro);

  return { score, breakdown, visible: resolveLeaderboardVisibility(input), badges };
};

// Rank-based badges can only be assigned once the full visible set is sorted
// — kept as its own pure step (called by the job after ranking) rather than
// folded into computeEngagementScore, which has no notion of rank.
export const addRankBadges = (badges: EngagementBadge[], rank: number): EngagementBadge[] => {
  const result = [...badges];
  if (rank <= 3) result.push(ENGAGEMENT_BADGES.top3);
  else if (rank <= 10) result.push(ENGAGEMENT_BADGES.top10);
  return result;
};

// Collapses a flat list of accepted MeetingRequest (from, to) registration-id
// pairs into, per registration id, the SET of distinct people they've met —
// the collusion-loophole fix: MeetingRequest's own unique index only blocks a
// duplicate PENDING request between the same two people, not a second
// ACCEPTED one, so scoring raw accepted-request count would let two
// colluding delegates (or one person farming a cooperative friend) generate
// unlimited points by repeatedly opening and accepting new requests between
// themselves. Counting distinct counterparts instead closes that loophole
// without needing a schema change to MeetingRequest itself.
export const buildDistinctCounterpartMap = (acceptedPairs: { from: string; to: string }[]): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (a === b) return; // defensive — a self-referential pair should never exist
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const { from, to } of acceptedPairs) {
    addEdge(from, to);
    addEdge(to, from);
  }
  return map;
};
