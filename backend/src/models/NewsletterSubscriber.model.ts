import { Schema, model, type InferSchemaType } from 'mongoose';

// Backs the Home-page email captures — distinguished only by `source`, since the
// data shape (email + first name) is identical; the framing/copy differs client-side.
// 'summit_2027_interest' is the interim "stay in touch" capture on the new /2027
// placeholder page — a lighter-weight stand-in until the full 2027 interest-list
// domain (multi-select interests, consent, WhatsApp opt-in) is built in its own
// later checkpoint.
const SOURCES = ['updates', 'concept_note', 'summit_2027_interest'] as const;

const newsletterSubscriberSchema = new Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    firstName: { type: String, required: true, trim: true },
    source: { type: String, enum: SOURCES, required: true },
  },
  { timestamps: true }
);

// One record per (email, source) — resubmitting the same form is a no-op, not a
// duplicate row, but subscribing via both forms is two intentionally distinct signals.
newsletterSubscriberSchema.index({ email: 1, source: 1 }, { unique: true });

export type NewsletterSubscriberDoc = InferSchemaType<typeof newsletterSubscriberSchema>;
export const NewsletterSubscriber = model('NewsletterSubscriber', newsletterSubscriberSchema);
