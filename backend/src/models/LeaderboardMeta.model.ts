import { Schema, model, type InferSchemaType } from 'mongoose';

// Singleton, same findOne-or-create convention as WaiHealthSettings.model.ts /
// VolunteerSettings.model.ts / PromoSettings.model.ts — exactly one row
// recording when jobs/engagementScore.job.ts last ran, so the public
// Leaderboard page can show "updated 4 minutes ago" instead of implying a
// live number.
const leaderboardMetaSchema = new Schema(
  {
    lastComputedAt: { type: Date },
    lastComputeDurationMs: { type: Number },
    lastComputeCount: { type: Number },
  },
  { timestamps: true }
);

export type LeaderboardMetaDoc = InferSchemaType<typeof leaderboardMetaSchema>;
export const LeaderboardMeta = model('LeaderboardMeta', leaderboardMetaSchema);

export const getOrCreateLeaderboardMeta = async () => {
  const existing = await LeaderboardMeta.findOne();
  if (existing) return existing;
  return LeaderboardMeta.create({});
};
