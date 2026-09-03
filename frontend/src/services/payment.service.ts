import { api } from './api';

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
}

export const initializePayment = async (registrationId: string): Promise<InitializePaymentResult> => {
  const res = await api.post<{ success: true; data: InitializePaymentResult }>('/payments/initialize', {
    registrationId,
  });
  return res.data.data;
};

export interface VerifyPaymentResult {
  paymentStatus: 'not_required' | 'unpaid' | 'paid' | 'failed';
  status: 'pending' | 'reviewed' | 'confirmed' | 'declined';
  fullName?: string;
  ticketCategory?: string;
  amountNaira: number;
}

export const verifyPayment = async (reference: string): Promise<VerifyPaymentResult> => {
  const res = await api.get<{ success: true; data: VerifyPaymentResult }>(`/payments/verify/${reference}`);
  return res.data.data;
};
