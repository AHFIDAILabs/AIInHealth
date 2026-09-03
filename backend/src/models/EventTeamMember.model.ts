import { Schema, model, type InferSchemaType } from 'mongoose';
import { TEAM_MEMBER_DAYS } from '../types/enums.js';

// A staff/volunteer coordinator roster for running the event itself — distinct from
// both admin User accounts (portal logins) and Registration/volunteer records
// (people attending). Purely an internal reference list, no auth of its own.
const eventTeamMemberSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true }, // e.g. "Registration Desk Lead"
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    day: { type: String, enum: TEAM_MEMBER_DAYS, default: 'both' },
    notes: { type: String, trim: true, maxlength: 500 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

eventTeamMemberSchema.index({ isActive: 1, order: 1 });

export type EventTeamMemberDoc = InferSchemaType<typeof eventTeamMemberSchema>;
export const EventTeamMember = model('EventTeamMember', eventTeamMemberSchema);
