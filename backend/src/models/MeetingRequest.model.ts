import { Schema, model, type InferSchemaType } from 'mongoose';
import { MEETING_REQUEST_STATUSES } from '../types/enums.js';

// A lightweight async request/accept flow — no calendar/time-slot booking. Once
// accepted, both parties see each other's contact email (see meeting.controller.ts)
// and coordinate a time themselves.
const meetingRequestSchema = new Schema(
  {
    fromRegistration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    toRegistration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true },
    message: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: MEETING_REQUEST_STATUSES, default: 'pending' },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

meetingRequestSchema.index({ fromRegistration: 1, createdAt: -1 });
meetingRequestSchema.index({ toRegistration: 1, createdAt: -1 });
// A given delegate shouldn't be able to spam the same recipient with duplicate
// still-open requests.
meetingRequestSchema.index(
  { fromRegistration: 1, toRegistration: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export type MeetingRequestDoc = InferSchemaType<typeof meetingRequestSchema>;
export const MeetingRequest = model('MeetingRequest', meetingRequestSchema);
