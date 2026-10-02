import { api } from './api';

export const KNOWLEDGE_PRODUCT_TYPES = ['communique', 'proceedings', 'policyBrief', 'technicalReport', 'actionPlan'] as const;
export type KnowledgeProductType = (typeof KNOWLEDGE_PRODUCT_TYPES)[number];

export interface KnowledgeProductSection {
  heading: string;
  content: string;
}

export interface KnowledgeProductSummary {
  type: KnowledgeProductType;
  status: 'draft' | 'approved';
}

export interface AdminKnowledgeProduct {
  type: KnowledgeProductType;
  sections: KnowledgeProductSection[];
  status: 'draft' | 'approved';
  generatedAt: string | null;
  generationError: string | null;
  inputSummary: Record<string, number>;
  approvedAt: string | null;
}

export interface PublishedKnowledgeProduct {
  type: KnowledgeProductType;
  sections: KnowledgeProductSection[];
  approvedAt: string;
}

// --- Public ---

export const fetchKnowledgeProductSummaries = async (): Promise<KnowledgeProductSummary[]> => {
  const res = await api.get<{ success: true; data: KnowledgeProductSummary[] }>('/knowledge-products');
  return res.data.data;
};

export const fetchKnowledgeProduct = async (type: KnowledgeProductType): Promise<PublishedKnowledgeProduct> => {
  const res = await api.get<{ success: true; data: PublishedKnowledgeProduct }>(`/knowledge-products/${type}`);
  return res.data.data;
};

// --- Admin ---

export const adminListKnowledgeProducts = async (): Promise<AdminKnowledgeProduct[]> => {
  const res = await api.get<{ success: true; data: AdminKnowledgeProduct[] }>('/admin/knowledge-products');
  return res.data.data;
};

export const adminGenerateKnowledgeProduct = async (type: KnowledgeProductType): Promise<AdminKnowledgeProduct> => {
  const res = await api.post<{ success: true; data: AdminKnowledgeProduct }>(`/admin/knowledge-products/${type}/generate`);
  return res.data.data;
};

export const adminUpdateKnowledgeProduct = async (
  type: KnowledgeProductType,
  input: { sections?: KnowledgeProductSection[]; status?: 'approved' }
): Promise<AdminKnowledgeProduct> => {
  const res = await api.patch<{ success: true; data: AdminKnowledgeProduct }>(`/admin/knowledge-products/${type}`, input);
  return res.data.data;
};
