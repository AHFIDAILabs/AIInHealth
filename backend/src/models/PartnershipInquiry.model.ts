import { Schema, model, type InferSchemaType } from 'mongoose';
import { INQUIRY_STATUSES } from '../types/enums.js';

const partnershipInquirySchema = new Schema(
  {
    organizationName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true, lowercase: true },
    // Free text, not a fixed enum — sponsorship packages are now an
    // admin-editable model (SponsorshipPackage), not a compile-time list, so
    // this is an indicative wishlist value only, not a hard link to one.
    tierInterested: { type: String, trim: true, maxlength: 200 },
    message: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: INQUIRY_STATUSES, default: 'New' },
  },
  { timestamps: true }
);

partnershipInquirySchema.index({ status: 1, createdAt: -1 });

export type PartnershipInquiryDoc = InferSchemaType<typeof partnershipInquirySchema>;
export const PartnershipInquiry = model('PartnershipInquiry', partnershipInquirySchema);
