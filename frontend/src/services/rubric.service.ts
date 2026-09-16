import { api } from './api';

export interface RubricCriterion {
  _id: string;
  label: string;
  description?: string;
  internalCode: string;
  weight: number;
}

export interface Rubric {
  _id: string;
  criteria: RubricCriterion[];
}

export const fetchRubric = async (): Promise<Rubric> => {
  const res = await api.get<{ success: true; data: Rubric }>('/admin/rubric');
  return res.data.data;
};

// Full-array replace — add/edit/delete/reorder all go through this one call.
// Array order IS the display/scoring order.
export interface RubricCriterionInput {
  _id?: string;
  label: string;
  description?: string;
  internalCode: string;
  weight: number;
}

export const replaceRubric = async (criteria: RubricCriterionInput[]): Promise<Rubric> => {
  const res = await api.put<{ success: true; data: Rubric }>('/admin/rubric', { criteria });
  return res.data.data;
};

export const restoreStandardRubric = async (): Promise<Rubric> => {
  const res = await api.post<{ success: true; data: Rubric }>('/admin/rubric/restore-standard');
  return res.data.data;
};
