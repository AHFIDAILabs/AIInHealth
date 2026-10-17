import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Registration } from '../models/Registration.model.js';
import { LeaderboardMeta } from '../models/LeaderboardMeta.model.js';

// GET /leaderboard/top3 — public, no portal login required. Backs the
// homepage's scrolling "top 3" ticker (LeaderboardTicker.tsx). Deliberately
// the smallest possible slice of what delegate.controller.ts's own
// leaderboard() already exposes to any logged-in delegate (top 50, with
// avatars/badges/rank) — same leaderboardVisible filter (the job's own
// opt-out/sensitive-category/team-exclusion logic already baked in), just
// capped at 3 and stripped to name/organization/score, since this is shown
// to anonymous site visitors, not just other delegates.
export const publicTop3 = catchAsync(async (_req: Request, res: Response) => {
  const [meta, top] = await Promise.all([
    LeaderboardMeta.findOne().select('lastComputedAt'),
    Registration.find({ leaderboardVisible: true })
      .sort({ engagementRank: 1 })
      .limit(3)
      .select('fullName contactName companyName organization engagementScore engagementRank'),
  ]);

  res.json(
    new ApiResponse({
      computedAt: meta?.lastComputedAt ?? null,
      top: top.map((r) => ({
        name: r.fullName || r.contactName || r.companyName || 'A delegate',
        organization: r.organization || r.companyName || null,
        score: r.engagementScore,
        rank: r.engagementRank,
      })),
    })
  );
});
