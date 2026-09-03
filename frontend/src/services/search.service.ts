import { api } from './api';

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

export interface SearchGroup {
  key: string;
  label: string;
  results: SearchResultItem[];
}

export interface GlobalSearchResponse {
  groups: SearchGroup[];
  total: number;
}

export const globalSearch = async (q: string): Promise<GlobalSearchResponse> => {
  const res = await api.get<{ success: true; data: GlobalSearchResponse }>('/admin/search', { params: { q } });
  return res.data.data;
};
