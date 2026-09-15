import { Schema, model, type InferSchemaType } from 'mongoose';
import { ACCESS_CODE_TYPES, ACCESS_CODE_STATUSES, ACCESS_CODE_DISCOUNTS } from '../types/enums.js';

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
    // scholarship-type only — the % knocked off the attendee's ticket price when
    // this code is redeemed (registration.controller.ts). Required-when-scholarship
    // is enforced at the zod layer (accessCode.validation.ts), not here.
    discountPercent: { type: Number, enum: ACCESS_CODE_DISCOUNTS },
  },
  { timestamps: true }
);

// `code`'s own `unique: true` above already creates that index — no separate
// .index({ code: 1 }) call needed.
accessCodeSchema.index({ status: 1, type: 1 });

// At most one *unused* code per (issuedTo, type, discountPercent) — matches what
// accessCode.controller.ts's adminGenerate already intends via its find-existing-
// unused-then-insert check (including reusing a different code when the
// discount tier differs), just made airtight against two concurrent "Generate"
// requests for the same email both missing each other's in-flight insert.
// discountPercent is absent for non-scholarship types, which MongoDB indexes as
// null — exactly right, since only one unused volunteer/keynote_speaker/
// complimentary code per person should exist anyway.
accessCodeSchema.index(
  { issuedTo: 1, type: 1, discountPercent: 1 },
  { unique: true, partialFilterExpression: { status: 'unused' } }
);

export type AccessCodeDoc = InferSchemaType<typeof accessCodeSchema>;
export const AccessCode = model('AccessCode', accessCodeSchema);
