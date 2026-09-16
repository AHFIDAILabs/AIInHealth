import { Schema, model, type InferSchemaType } from 'mongoose';
import { DELIVERABLE_STATUSES } from '../types/enums.js';

// A promised benefit owed to a sponsor/partner (e.g. "Logo on step-and-repeat
// banner", "Exhibition booth setup") tracked to completion. "Overdue" is
// computed (status === 'pending' && dueDate < now) wherever it's shown —
// never stored, so it can't go stale relative to the current date.
const deliverableSchema = new Schema(
  {
    partner: { type: Schema.Types.ObjectId, ref: 'Partner', required: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: DELIVERABLE_STATUSES, default: 'pending' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

deliverableSchema.index({ partner: 1, createdAt: -1 });
deliverableSchema.index({ status: 1, dueDate: 1 });

export type DeliverableDoc = InferSchemaType<typeof deliverableSchema>;
export const Deliverable = model('Deliverable', deliverableSchema);
