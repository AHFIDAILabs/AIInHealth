import { Schema, model, type InferSchemaType } from 'mongoose';
import { PARTNER_TIERS, INQUIRY_STATUSES } from '../types/enums.js';

const partnershipInquirySchema = new Schema(
  {
    organizationName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    tierInterested: { type: String, enum: PARTNER_TIERS },
    message: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: INQUIRY_STATUSES, default: 'New' },
  },
  { timestamps: true }
);

partnershipInquirySchema.index({ status: 1, createdAt: -1 });

export type PartnershipInquiryDoc = InferSchemaType<typeof partnershipInquirySchema>;
export const PartnershipInquiry = model('PartnershipInquiry', partnershipInquirySchema);
