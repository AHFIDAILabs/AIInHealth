import { Schema, model, type InferSchemaType } from 'mongoose';

// Event-extras plan, Batch 4 — session (or general event) feedback collected
// via a QR code at the venue. Deliberately anonymous: no attendee identity
// field exists here at all, by design (maximizes response rate for this kind
// of feedback, same reasoning most event platforms use) — unlike every other
// public-write model in this app, there is no email/name to spam-score or
// rate-limit by, so abuse protection here is IP-only (see
// rateLimiter.middleware.ts's feedbackLimiter) plus the same honeypot/
// formToken time-trap every other public form uses.
const feedbackSchema = new Schema(
  {
    // Absent/null = general event feedback, not tied to one session.
    sessionRef: { type: Schema.Types.ObjectId, ref: 'Session' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

feedbackSchema.index({ sessionRef: 1, createdAt: -1 });

export type FeedbackDoc = InferSchemaType<typeof feedbackSchema>;
export const Feedback = model('Feedback', feedbackSchema);
