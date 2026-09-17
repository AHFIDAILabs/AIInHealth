import { Schema, model, type InferSchemaType } from 'mongoose';
import { LEAD_INTEREST_LEVELS } from '../types/enums.js';

// A booth visitor an exhibitor (or staff, on their behalf) wants to follow up
// with after the event — manually logged for now, not tied to a registered
// attendee record (a visitor may not even be registered, e.g. walk-up
// interest), so contact details are captured directly here rather than by
// reference.
const leadSchema = new Schema(
  {
    exhibitor: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    organization: { type: String, trim: true },
    interestLevel: { type: String, enum: LEAD_INTEREST_LEVELS, default: 'warm' },
    notes: { type: String, trim: true, maxlength: 1000 },
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

leadSchema.index({ exhibitor: 1, capturedAt: -1 });

export type LeadDoc = InferSchemaType<typeof leadSchema>;
export const Lead = model('Lead', leadSchema);
