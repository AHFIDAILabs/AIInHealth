import { Schema, model, type InferSchemaType } from 'mongoose';

// One row per view/download — deliberately NOT deduped/upserted like
// LivestreamViewer.model.ts, because "how many times was this report viewed
// or downloaded" (admin's own ask) is exactly what repeat rows answer;
// collapsing repeats into a single updated row the way a casual viewer log
// does would throw away the count itself. `action` distinguishes opening a
// report inline (reports.controller.ts's view, GET on the Render host
// directly) from forcing a real save-to-disk (downloadFile, proxied through
// this backend so Content-Disposition can be set) — see that controller's
// own comment for why the two need genuinely different handling.
const ACTIONS = ['view', 'download'] as const;

const reportAccessEventSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    reportId: { type: String, required: true, trim: true },
    action: { type: String, enum: ACTIONS, required: true },
    accessedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

reportAccessEventSchema.index({ reportId: 1, action: 1, accessedAt: -1 });

export type ReportAccessEventDoc = InferSchemaType<typeof reportAccessEventSchema>;
export const ReportAccessEvent = model('ReportAccessEvent', reportAccessEventSchema);
