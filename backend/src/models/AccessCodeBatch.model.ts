import { Schema, model, type InferSchemaType } from 'mongoose';

// One doc per "Generate Batch" click (accessCodeBatch.controller.ts's
// adminGenerate) — groups the N AccessCode docs it mints (each
// type:'bulk_invite', linked back here via its own `batch` field) under one
// distributor, so the admin can see at a glance who a given bunch of codes
// was handed to and how they've been used, without having to filter the flat
// Access Codes list by hand. expiresAt is set ONCE here (generatedAt + 48h)
// and copied onto every code in the batch — all N share the same deadline
// regardless of when any individual one gets redeemed.
const accessCodeBatchSchema = new Schema(
  {
    // Admin's own free-text note (e.g. "AHFID Partner Outreach — Oct 2026") —
    // purely for their own recall across many batches; never shown to anyone
    // who redeems a code from it.
    label: { type: String, trim: true, maxlength: 200 },
    distributorEmail: { type: String, required: true, trim: true, lowercase: true },
    quantity: { type: Number, required: true, min: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, required: true },
    // Set once the batch email successfully sends — absent if generation
    // succeeded but the send itself failed, same "codes exist even if the
    // email didn't go out" tolerance accessCode.controller.ts's adminGenerate
    // already has for the per-email flow.
    sentAt: { type: Date },
  },
  { timestamps: true }
);

accessCodeBatchSchema.index({ createdAt: -1 });

export type AccessCodeBatchDoc = InferSchemaType<typeof accessCodeBatchSchema>;
export const AccessCodeBatch = model('AccessCodeBatch', accessCodeBatchSchema);
