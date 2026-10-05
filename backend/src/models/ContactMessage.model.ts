import { Schema, model, type InferSchemaType } from 'mongoose';
import { CONTACT_CATEGORIES, AI_PRIORITY_LABELS } from '../types/enums.js';

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    category: { type: String, enum: CONTACT_CATEGORIES, required: true },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    isRead: { type: Boolean, default: false },
    isResolved: { type: Boolean, default: false },
    // Set fire-and-forget by triage.service.ts right after creation — a sort
    // hint for the admin list, never a gate (see AI_PRIORITY_LABELS comment).
    // Stays 'standard' (the schema default) if classification never runs
    // (Groq unconfigured, or the call fails) — the message is always saved
    // either way, this only affects default list ordering.
    priorityLabel: { type: String, enum: AI_PRIORITY_LABELS, default: 'standard' },
    priorityReason: { type: String, trim: true, maxlength: 200 },

    // Public form spam hardening — see spamHeuristics.ts / contact.controller.ts's
    // create(). A quarantined message skips AI triage, admin notification,
    // and is hidden from the default inbox (every "not spam" query must use
    // `{ isSpam: { $ne: true } }`, never `{ isSpam: false }` — existing
    // documents have neither field set).
    isSpam: { type: Boolean, default: false },
    spamScore: { type: Number, default: 0 },
    spamReasons: { type: [String], default: [] },
    // Gmail-dot/plus-collapsed form of `email` (canonicalizeEmail) — powers
    // both the velocity check at submission time and grouping repeat
    // offenders together in the admin view/backfill.
    emailCanonical: { type: String, trim: true, lowercase: true },
  },
  { timestamps: true }
);

contactMessageSchema.index({ isSpam: 1, isRead: 1, createdAt: -1 });
contactMessageSchema.index({ priorityLabel: 1, createdAt: -1 });
contactMessageSchema.index({ emailCanonical: 1, createdAt: -1 });
// Auto-purge quarantined messages after 30 days — legitimate messages (isSpam
// false/unset) are never touched by this index at all, per the partial filter.
contactMessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30, partialFilterExpression: { isSpam: true } }
);

export type ContactMessageDoc = InferSchemaType<typeof contactMessageSchema>;
export const ContactMessage = model('ContactMessage', contactMessageSchema);
