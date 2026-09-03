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

export const fetchReconciliations = async (): Promise<{ configured: boolean; rows: ReconciliationRow[] }> => {
  const res = await api.get<{ success: true; data: { configured: boolean; rows: ReconciliationRow[] } }>(
    '/admin/payments/reconciliations'
  );
  return res.data.data;
};

export const resyncReconciliation = async (reference: string): Promise<void> => {
  await api.post(`/admin/payments/reconciliations/${encodeURIComponent(reference)}/resync`);
};
