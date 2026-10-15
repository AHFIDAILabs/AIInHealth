import { describe, it, expect } from 'vitest';
import {
  WEIGHTS,
  CAPS,
  MAX_ENGAGEMENT_SCORE,
  ENGAGEMENT_BADGES,
  computeEngagementScore,
  resolveLeaderboardVisibility,
  addRankBadges,
  buildDistinctCounterpartMap,
  type EngagementInput,
} from '../utils/engagementScoring.js';

const base: EngagementInput = {
  type: 'attendee',
  ticketCategory: 'nigerian_professional',
  checkedIn: false,
  bookmarkedSessionsCount: 0,
  distinctAcceptedMeetingCounterparts: 0,
  hasProfilePhoto: false,
  leaderboardOptIn: undefined,
};

describe('computeEngagementScore', () => {
  it('awards nothing for a totally blank registration', () => {
    const result = computeEngagementScore(base);
    expect(result.score).toBe(0);
    expect(result.breakdown).toEqual({ checkIn: 0, meetings: 0, bookmarks: 0, profile: 0 });
    expect(result.badges).toEqual([]);
  });

  it('check-in is a flat binary +20, no partial credit', () => {
    expect(computeEngagementScore({ ...base, checkedIn: true }).breakdown.checkIn).toBe(WEIGHTS.checkIn);
    expect(computeEngagementScore({ ...base, checkedIn: false }).breakdown.checkIn).toBe(0);
  });

  it.each([
    [0, 0],
    [1, 2],
    [9, 18],
    [10, 20],
    [11, 20],
    [25, 20],
  ])('bookmarks clamp at the cap: %i bookmarks -> %i points', (count, expectedPoints) => {
    const result = computeEngagementScore({ ...base, bookmarkedSessionsCount: count });
    expect(result.breakdown.bookmarks).toBe(expectedPoints);
  });

  it.each([
    [0, 0],
    [1, 10],
    [4, 40],
    [5, 50],
    [6, 50],
    [20, 50],
  ])('meetings clamp at the cap: %i distinct counterparts -> %i points', (count, expectedPoints) => {
    const result = computeEngagementScore({ ...base, distinctAcceptedMeetingCounterparts: count });
    expect(result.breakdown.meetings).toBe(expectedPoints);
  });

  it('profile photo gates its flat bonus exactly', () => {
    expect(computeEngagementScore({ ...base, hasProfilePhoto: true }).breakdown.profile).toBe(WEIGHTS.profile);
    expect(computeEngagementScore({ ...base, hasProfilePhoto: false }).breakdown.profile).toBe(0);
  });

  it('a maxed-out input sums to exactly MAX_ENGAGEMENT_SCORE — regression guard on the ceiling', () => {
    const maxed = computeEngagementScore({
      ...base,
      checkedIn: true,
      bookmarkedSessionsCount: CAPS.bookmarks + 5,
      distinctAcceptedMeetingCounterparts: CAPS.meetingCounterparts + 5,
      hasProfilePhoto: true,
    });
    expect(maxed.score).toBe(MAX_ENGAGEMENT_SCORE);
    expect(MAX_ENGAGEMENT_SCORE).toBe(100);
  });

  it('badge thresholds: networker vs super networker vs session explorer vs profile pro', () => {
    expect(computeEngagementScore({ ...base, distinctAcceptedMeetingCounterparts: 1 }).badges).toContain(ENGAGEMENT_BADGES.networker);
    expect(computeEngagementScore({ ...base, distinctAcceptedMeetingCounterparts: 5 }).badges).toContain(
      ENGAGEMENT_BADGES.superNetworker
    );
    expect(computeEngagementScore({ ...base, distinctAcceptedMeetingCounterparts: 5 }).badges).not.toContain(
      ENGAGEMENT_BADGES.networker
    );
    expect(computeEngagementScore({ ...base, bookmarkedSessionsCount: 5 }).badges).toContain(ENGAGEMENT_BADGES.sessionExplorer);
    expect(computeEngagementScore({ ...base, bookmarkedSessionsCount: 4 }).badges).not.toContain(ENGAGEMENT_BADGES.sessionExplorer);
    expect(computeEngagementScore({ ...base, hasProfilePhoto: true }).badges).toContain(ENGAGEMENT_BADGES.profilePro);
  });
});

describe('resolveLeaderboardVisibility', () => {
  it('team is always hidden, regardless of leaderboardOptIn', () => {
    expect(resolveLeaderboardVisibility({ type: 'team', ticketCategory: 'nigerian_professional', leaderboardOptIn: true })).toBe(
      false
    );
    expect(resolveLeaderboardVisibility({ type: 'team', ticketCategory: undefined, leaderboardOptIn: undefined })).toBe(false);
  });

  it.each(['vip', 'government_official', 'speaker'] as const)(
    'sensitive category %s defaults hidden when leaderboardOptIn is undefined',
    (ticketCategory) => {
      expect(resolveLeaderboardVisibility({ type: 'attendee', ticketCategory, leaderboardOptIn: undefined })).toBe(false);
    }
  );

  it.each(['vip', 'government_official', 'speaker'] as const)(
    'sensitive category %s becomes visible once leaderboardOptIn is explicitly true',
    (ticketCategory) => {
      expect(resolveLeaderboardVisibility({ type: 'attendee', ticketCategory, leaderboardOptIn: true })).toBe(true);
    }
  );

  it('a non-sensitive category defaults visible when leaderboardOptIn is undefined', () => {
    expect(resolveLeaderboardVisibility({ type: 'attendee', ticketCategory: 'nigerian_professional', leaderboardOptIn: undefined })).toBe(
      true
    );
  });

  it('an explicit leaderboardOptIn:false always hides, even a non-sensitive category', () => {
    expect(resolveLeaderboardVisibility({ type: 'attendee', ticketCategory: 'nigerian_professional', leaderboardOptIn: false })).toBe(
      false
    );
  });
});

describe('addRankBadges', () => {
  it('adds top_3 for ranks 1-3 and top_10 for ranks 4-10, nothing for 11+', () => {
    expect(addRankBadges([], 1)).toContain(ENGAGEMENT_BADGES.top3);
    expect(addRankBadges([], 3)).toContain(ENGAGEMENT_BADGES.top3);
    expect(addRankBadges([], 3)).not.toContain(ENGAGEMENT_BADGES.top10);
    expect(addRankBadges([], 4)).toContain(ENGAGEMENT_BADGES.top10);
    expect(addRankBadges([], 10)).toContain(ENGAGEMENT_BADGES.top10);
    expect(addRankBadges([], 11)).not.toContain(ENGAGEMENT_BADGES.top10);
    expect(addRankBadges([], 11)).not.toContain(ENGAGEMENT_BADGES.top3);
  });
});

describe('buildDistinctCounterpartMap', () => {
  it('collapses repeated accepted pairs between the same two people to one counterpart each — the collusion fix', () => {
    const map = buildDistinctCounterpartMap([
      { from: 'a', to: 'b' },
      { from: 'a', to: 'b' }, // a second accepted request between the same pair
      { from: 'b', to: 'a' },
    ]);
    expect(map.get('a')?.size).toBe(1);
    expect(map.get('b')?.size).toBe(1);
  });

  it('counts distinct counterparts correctly across multiple different people', () => {
    const map = buildDistinctCounterpartMap([
      { from: 'a', to: 'b' },
      { from: 'a', to: 'c' },
      { from: 'd', to: 'a' },
    ]);
    expect(map.get('a')?.size).toBe(3);
    expect(map.get('b')?.size).toBe(1);
  });

  it('ignores a self-referential pair defensively', () => {
    const map = buildDistinctCounterpartMap([{ from: 'a', to: 'a' }]);
    expect(map.get('a')).toBeUndefined();
  });
});
