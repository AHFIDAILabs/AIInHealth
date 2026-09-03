import { Schema, model, type InferSchemaType } from 'mongoose';
import { ACCESS_CODE_TYPES, ACCESS_CODE_STATUSES } from '../types/enums.js';

const accessCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ACCESS_CODE_TYPES, required: true },
    status: { type: String, enum: ACCESS_CODE_STATUSES, default: 'unused' },
    // Required — this is the identity anchor. registration.controller.ts's volunteer
    // redemption rejects any submission whose email doesn't match this exactly, so a
    // leaked/shared code can't be used by anyone other than who it was issued to.
    issuedTo: { type: String, required: true, trim: true, lowercase: true },
    sentAt: { type: Date }, // last time the code was emailed to issuedTo
    usedByRegistration: { type: Schema.Types.ObjectId, ref: 'Registration' },
    usedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

accessCodeSchema.index({ code: 1 }, { unique: true });
accessCodeSchema.index({ status: 1, type: 1 });

export type AccessCodeDoc = InferSchemaType<typeof accessCodeSchema>;
export const AccessCode = model('AccessCode', accessCodeSchema);
