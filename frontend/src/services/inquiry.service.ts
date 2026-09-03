import { api } from './api';
import type { PartnerTier } from './partner.service';

export interface PartnershipInquiryPayload {
  organizationName: string;
  contactName: string;
  contactEmail: string;
  tierInterested?: PartnerTier;
  message?: string;
}

export const submitPartnershipInquiry = async (payload: PartnershipInquiryPayload): Promise<string> => {
  const res = await api.post<{ success: true; data: { id: string; message: string } }>('/inquiries/partnership', payload);
  return res.data.data.message;
};
