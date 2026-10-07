import { Schema, model, type InferSchemaType } from 'mongoose';
import { ACCESS_CODE_TYPES, ACCESS_CODE_STATUSES, ACCESS_CODE_DISCOUNTS, PRESENTATION_TYPES } from '../types/enums.js';

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
    // Optional — every admin-generated code has one (accessCode.controller.ts's
    // adminGenerate), but a 'promo' code is self-issued by an anonymous public
    // claim (promo.controller.ts) with no admin/user behind it at all.
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date },
    // scholarship-type only — the % knocked off the attendee's ticket price when
    // this code is redeemed (registration.controller.ts). Required-when-scholarship
    // is enforced at the zod layer (accessCode.validation.ts), not here.
    discountPercent: { type: Number, enum: ACCESS_CODE_DISCOUNTS },
    // abstract_presenter-type only — oral vs poster, set by the admin at
    // generation time (from the committee's own confirmed-presenter tracker,
    // not self-reported) and copied onto the Registration on redemption so
    // badge/tag printing can tell the two apart. Required-when-abstract_presenter
    // is enforced at the zod layer (accessCode.validation.ts), not here.
    presentationType: { type: String, enum: PRESENTATION_TYPES },
    // bulk_invite-type only — links this code back to the batch
    // (AccessCodeBatch.model.ts) it was generated as part of, so
    // accessCodeBatch.controller.ts's adminGetOne can list every code in a
    // batch plus who ultimately redeemed each.
    batch: { type: Schema.Types.ObjectId, ref: 'AccessCodeBatch' },
  },
  { timestamps: true }
);

// `code`'s own `unique: true` above already creates that index — no separate
// .index({ code: 1 }) call needed.
accessCodeSchema.index({ status: 1, type: 1 });
accessCodeSchema.index({ batch: 1 });

// At most one *unused* code per (issuedTo, type, discountPercent) — matches what
// accessCode.controller.ts's adminGenerate already intends via its find-existing-
// unused-then-insert check (including reusing a different code when the
// discount tier differs), just made airtight against two concurrent "Generate"
// requests for the same email both missing each other's in-flight insert.
// discountPercent is absent for non-scholarship types, which MongoDB indexes as
// null — exactly right, since only one unused volunteer/keynote_speaker/
// complimentary code per person should exist anyway.
//
// bulk_invite codes all nominally belong to the same distributor, which would
// otherwise collide here after the first one in a batch — rather than trying
// to carve out an exception in this filter (MongoDB's partialFilterExpression
// only supports equality/$exists:true/$gt(e)/$lt(e)/$type/top-level $and; it
// rejects $exists:false outright as an unsupported $not), accessCodeBatch.
// controller.ts's adminGenerate sidesteps the whole question by giving each
// code in a batch its own plus-addressed variant of the distributor's email
// (issuedTo), which is naturally unique per code without touching this index.
accessCodeSchema.index(
  { issuedTo: 1, type: 1, discountPercent: 1 },
  { unique: true, partialFilterExpression: { status: 'unused' } }
);

export type AccessCodeDoc = InferSchemaType<typeof accessCodeSchema>;
export const AccessCode = model('AccessCode', accessCodeSchema);
