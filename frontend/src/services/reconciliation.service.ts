import { api } from './api';

export interface ReconciliationRow {
  reference: string;
  paystackStatus: 'success' | 'failed' | 'abandoned' | 'pending';
  paystackAmountKobo: number;
  paystackPaidAt: string | null;
  customerEmail: string | null;
  localFound: boolean;
  localName?: string;
  localTicketCategory?: string;
  localPaymentStatus?: string;
  localAmountKobo?: number;
  mismatch: boolean;
}

export interface ReconciliationsResult {
  configured: boolean;
  rows: ReconciliationRow[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const fetchReconciliations = async (params: { page?: number; limit?: number } = {}): Promise<ReconciliationsResult> => {
  const res = await api.get<{
    success: true;
    data: { configured: boolean; rows: ReconciliationRow[] };
    meta: { page: number; limit: number; total: number; pages: number };
  }>('/admin/payments/reconciliations', { params });
  return { ...res.data.data, ...res.data.meta };
};

export const resyncReconciliation = async (reference: string): Promise<void> => {
  await api.post(`/admin/payments/reconciliations/${encodeURIComponent(reference)}/resync`);
};
