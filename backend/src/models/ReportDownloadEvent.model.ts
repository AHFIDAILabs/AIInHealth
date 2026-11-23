import { Schema, model, type InferSchemaType } from 'mongoose';

// One row per download — deliberately NOT deduped/upserted like
// LivestreamViewer.model.ts, because "how many times was this report
// downloaded" (admin's own ask) is exactly what repeat rows answer; collapsing
// repeats into a single updated row the way a casual viewer log does would
// throw away the count itself.
const reportDownloadEventSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    reportId: { type: String, required: true, trim: true },
    downloadedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

reportDownloadEventSchema.index({ reportId: 1, downloadedAt: -1 });

export type ReportDownloadEventDoc = InferSchemaType<typeof reportDownloadEventSchema>;
export const ReportDownloadEvent = model('ReportDownloadEvent', reportDownloadEventSchema);
