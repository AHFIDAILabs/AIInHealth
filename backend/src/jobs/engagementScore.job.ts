import cron from 'node-cron';
import { logger } from '../config/logger.js';
import { Registration } from '../models/Registration.model.js';
import { MeetingRequest } from '../models/MeetingRequest.model.js';
import { LeaderboardMeta } from '../models/LeaderboardMeta.model.js';
import {
  computeEngagementScore,
  addRankBadges,
  buildDistinctCounterpartMap,
} from '../utils/engagementScoring.js';

// Portal Engagement Score + public Leaderboard — recomputed on a schedule,
// NEVER live on a page view. GET /delegate/leaderboard (delegate.controller.ts)
// only ever reads the fields this job writes via one indexed find+sort+limit;
// the one cross-collection query in this whole feature is the MeetingRequest
// read below, run once per sweep for every registration at once, not once
// per request.
//
// Deliberately NOT routed through utils/batch.ts's runInBatches — that
// utility concurrency-limits per-item ASYNC work (Paystack/Graph/HTTP calls
// in the other jobs in this folder). Once the two queries below return,
// everything here is synchronous JS plus a couple of bulkWrite calls — there
// is nothing to rate-limit.
let running = false;

const hasProfilePhoto = (avatarUrl?: string | null): boolean => !!avatarUrl && avatarUrl.trim().length > 0;

export const runRecompute = async (): Promise<{ computed: number; visible: number; durationMs: number }> => {
  if (running) {
    logger.warn('engagementScore: previous run still in progress, skipping this tick');
    return { computed: 0, visible: 0, durationMs: 0 };
  }
  running = true;
  const startedAt = Date.now();

  try {
    // 'team' (event staff/organizers) is excluded from the candidate set
    // entirely, not just hidden post-hoc — see resolveLeaderboardVisibility's
    // own comment on why this needs its own explicit filter.
    const candidates = await Registration.find({ type: { $ne: 'team' }, status: 'confirmed', isActive: true })
      .select(
        '_id type ticketCategory checkedIn bookmarkedSessions avatarUrl leaderboardOptIn engagementScore engagementRank'
      )
      .lean();

    const acceptedMeetings = await MeetingRequest.find({ status: 'accepted' }).select('fromRegistration toRegistration').lean();
    const counterpartMap = buildDistinctCounterpartMap(
      acceptedMeetings.map((m) => ({ from: m.fromRegistration.toString(), to: m.toRegistration.toString() }))
    );

    const scored = candidates.map((reg) => {
      const id = reg._id.toString();
      const result = computeEngagementScore({
        type: reg.type,
        ticketCategory: reg.ticketCategory ?? undefined,
        checkedIn: !!reg.checkedIn,
        bookmarkedSessionsCount: (reg.bookmarkedSessions ?? []).length,
        distinctAcceptedMeetingCounterparts: counterpartMap.get(id)?.size ?? 0,
        hasProfilePhoto: hasProfilePhoto(reg.avatarUrl),
        leaderboardOptIn: reg.leaderboardOptIn,
      });
      return { id, previousRank: reg.engagementRank ?? null, previousScore: reg.engagementScore ?? 0, ...result };
    });

    // Rank is assigned ONLY over the visible subset — "you're #743" is noise
    // when most of the people ahead of you are hidden from the board.
    const visibleSorted = scored.filter((s) => s.visible).sort((a, b) => b.score - a.score);
    const rankById = new Map<string, number>();
    visibleSorted.forEach((s, i) => rankById.set(s.id, i + 1));

    const ops = scored.map((s) => {
      const rank = rankById.get(s.id) ?? null;
      const badges = rank ? addRankBadges(s.badges, rank) : s.badges;
      return {
        updateOne: {
          filter: { _id: s.id },
          update: {
            $set: {
              engagementScore: s.score,
              engagementBreakdown: s.breakdown,
              engagementBadges: badges,
              leaderboardVisible: s.visible,
              engagementRank: rank,
              previousEngagementRank: s.previousRank,
              previousEngagementScore: s.previousScore,
            },
          },
        },
      };
    });

    // Chunked defensively — a Summit-scale registration count (hundreds, not
    // millions) never actually needs this, but it keeps any single bulkWrite
    // call bounded regardless.
    const CHUNK_SIZE = 500;
    for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
      const chunk = ops.slice(i, i + CHUNK_SIZE);
      if (chunk.length > 0) await Registration.bulkWrite(chunk);
    }

    const durationMs = Date.now() - startedAt;
    await LeaderboardMeta.findOneAndUpdate(
      {},
      { lastComputedAt: new Date(), lastComputeDurationMs: durationMs, lastComputeCount: scored.length },
      { upsert: true }
    );

    return { computed: scored.length, visible: visibleSorted.length, durationMs };
  } finally {
    running = false;
  }
};

export const scheduleEngagementScoreRecompute = (): void => {
  // Every 10 minutes — frequent enough that the board feels alive without
  // ever computing anything live on a request.
  cron.schedule('*/10 * * * *', () => {
    runRecompute().catch((err) => logger.error({ err }, 'Engagement score recompute job failed'));
  });
  logger.info('Engagement score recompute job scheduled (every 10 minutes)');
};

export const runEngagementScoreRecomputeNow = runRecompute;
