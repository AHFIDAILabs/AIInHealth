import { api } from './api';

export interface AuditLogEntry {
  _id: string;
  actor: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface ListAuditLogParams {
  actor?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogPage {
  items: AuditLogEntry[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  actions: string[];
}

export const adminListAuditLogs = async (params: ListAuditLogParams): Promise<AuditLogPage> => {
  const res = await api.get<{
    success: true;
    data: AuditLogEntry[];
    meta: { page: number; limit: number; total: number; pages: number; actions: string[] };
  }>('/admin/audit-logs', { params });
  return { items: res.data.data, ...res.data.meta };
};
