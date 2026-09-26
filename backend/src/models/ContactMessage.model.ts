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
  },
  { timestamps: true }
);

contactMessageSchema.index({ isRead: 1, createdAt: -1 });
contactMessageSchema.index({ priorityLabel: 1, createdAt: -1 });

export type ContactMessageDoc = InferSchemaType<typeof contactMessageSchema>;
export const ContactMessage = model('ContactMessage', contactMessageSchema);
