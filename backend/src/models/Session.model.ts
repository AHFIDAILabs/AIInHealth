import { Schema, model, type InferSchemaType } from 'mongoose';
import { SESSION_DAYS, SESSION_FORMATS, TRACKS } from '../types/enums.js';

const sessionSchema = new Schema(
  {
    day: { type: String, enum: SESSION_DAYS, required: true },
    startTime: { type: String, required: true, trim: true }, // "09:00", 24h — validated in Zod
    endTime: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    track: { type: String, enum: TRACKS, required: true },
    format: { type: String, enum: SESSION_FORMATS, required: true },
    room: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 3000 },
    speakers: [{ type: Schema.Types.ObjectId, ref: 'Speaker' }],
    isPublished: { type: Boolean, default: false },
    // Set by the session-reminder cron job once it's fired for this session, so a
    // 5-minute polling loop never sends the same reminder twice.
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// The agenda page's two constant queries: "give me day X sorted by time" and
// "give me day X filtered by track" — both covered by one compound index.
sessionSchema.index({ day: 1, startTime: 1 });
sessionSchema.index({ track: 1, day: 1 });
// Conflict detection queries by day + room directly.
sessionSchema.index({ day: 1, room: 1 });

export type SessionDoc = InferSchemaType<typeof sessionSchema>;
export const Session = model('Session', sessionSchema);
