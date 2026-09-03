import { Schema, model, type InferSchemaType } from 'mongoose';
import { PARTNER_TIERS, PARTNER_CATEGORIES } from '../types/enums.js';

// logoUrl is a plain string — same upload.controller.ts flow as Speaker.photoUrl.
const partnerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    tier: { type: String, enum: PARTNER_TIERS, required: true },
    category: { type: String, enum: PARTNER_CATEGORIES, required: true },
    website: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    logoUrl: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

partnerSchema.index({ isPublished: 1, tier: 1, order: 1 });
partnerSchema.index({ category: 1 });

export type PartnerDoc = InferSchemaType<typeof partnerSchema>;
export const Partner = model('Partner', partnerSchema);
