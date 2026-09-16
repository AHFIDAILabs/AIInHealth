import { api } from './api';

export interface AdminSponsorshipPackage {
  _id: string;
  name: string;
  price: number;
  tierOrder: number;
  benefits?: string[];
  utilization: number;
}

export interface PublicSponsorshipPackage {
  _id: string;
  name: string;
  price: number;
  tierOrder: number;
  benefits?: string[];
}

export interface SponsorshipPackageInput {
  name: string;
  price: number;
  tierOrder?: number;
  benefits?: string[];
}

export const listPublicPackages = async (): Promise<PublicSponsorshipPackage[]> => {
  const res = await api.get<{ success: true; data: PublicSponsorshipPackage[] }>('/packages');
  return res.data.data;
};

export const adminListPackages = async (): Promise<AdminSponsorshipPackage[]> => {
  const res = await api.get<{ success: true; data: AdminSponsorshipPackage[] }>('/admin/sponsorship-packages');
  return res.data.data;
};

export const adminCreatePackage = async (input: SponsorshipPackageInput): Promise<AdminSponsorshipPackage> => {
  const res = await api.post<{ success: true; data: AdminSponsorshipPackage }>('/admin/sponsorship-packages', input);
  return res.data.data;
};

export const adminUpdatePackage = async (id: string, input: Partial<SponsorshipPackageInput>): Promise<AdminSponsorshipPackage> => {
  const res = await api.patch<{ success: true; data: AdminSponsorshipPackage }>(`/admin/sponsorship-packages/${id}`, input);
  return res.data.data;
};

export const adminDeletePackage = async (id: string): Promise<void> => {
  await api.delete(`/admin/sponsorship-packages/${id}`);
};
