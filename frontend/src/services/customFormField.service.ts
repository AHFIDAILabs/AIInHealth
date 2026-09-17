import { api } from './api';

export type CustomFormType = 'exhibitor';
export type CustomFieldType = 'text' | 'textarea' | 'select' | 'checkbox';

export interface CustomFormField {
  _id: string;
  formType: CustomFormType;
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
  required: boolean;
  order: number;
}

export interface CustomFormFieldInput {
  formType: CustomFormType;
  label: string;
  fieldType: CustomFieldType;
  options?: string[];
  required?: boolean;
  order?: number;
}

// Public — used by the exhibitor signup form to render admin-defined questions.
export const listCustomFormFields = async (formType: CustomFormType): Promise<CustomFormField[]> => {
  const res = await api.get<{ success: true; data: CustomFormField[] }>('/custom-fields', { params: { formType } });
  return res.data.data;
};

export const adminListCustomFormFields = async (formType: CustomFormType): Promise<CustomFormField[]> => {
  const res = await api.get<{ success: true; data: CustomFormField[] }>('/admin/custom-fields', { params: { formType } });
  return res.data.data;
};

export const createCustomFormField = async (input: CustomFormFieldInput): Promise<CustomFormField> => {
  const res = await api.post<{ success: true; data: CustomFormField }>('/admin/custom-fields', input);
  return res.data.data;
};

export const updateCustomFormField = async (id: string, input: Partial<CustomFormFieldInput>): Promise<CustomFormField> => {
  const res = await api.patch<{ success: true; data: CustomFormField }>(`/admin/custom-fields/${id}`, input);
  return res.data.data;
};

export const deleteCustomFormField = async (id: string): Promise<void> => {
  await api.delete(`/admin/custom-fields/${id}`);
};
