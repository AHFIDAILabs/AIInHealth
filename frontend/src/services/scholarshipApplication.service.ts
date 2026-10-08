import { api } from './api';

// Workflow state — see backend/src/types/enums.ts's SCHOLARSHIP_APPLICATION_STATUSES.
export const SCHOLARSHIP_APPLICATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ScholarshipApplicationStatus = (typeof SCHOLARSHIP_APPLICATION_STATUSES)[number];

// Same tiers as a manually-issued scholarship AccessCode — see
// accessCode.service.ts's ACCESS_CODE_DISCOUNTS.
export const SCHOLARSHIP_DISCOUNTS = [10, 25, 50, 100] as const;
export type ScholarshipDiscount = (typeof SCHOLARSHIP_DISCOUNTS)[number];

// See backend/src/types/enums.ts's SCHOLARSHIP_APPLICANT_TYPES/SCHOLARSHIP_STUDY_LEVELS.
export const SCHOLARSHIP_APPLICANT_TYPES = ['employee', 'student', 'other'] as const;
export type ScholarshipApplicantType = (typeof SCHOLARSHIP_APPLICANT_TYPES)[number];

export const SCHOLARSHIP_STUDY_LEVELS = ['undergraduate', 'postgraduate_masters', 'postgraduate_phd', 'diploma_certificate', 'other'] as const;
export type ScholarshipStudyLevel = (typeof SCHOLARSHIP_STUDY_LEVELS)[number];

export interface SubmitScholarshipApplicationInput {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  country: string;
  applicantType: ScholarshipApplicantType;
  designation?: string;
  courseOfStudy?: string;
  level?: ScholarshipStudyLevel;
  reason: string;
  supportingDocumentUrl?: string;
}

export const submitScholarshipApplication = async (input: SubmitScholarshipApplicationInput): Promise<string> => {
  const res = await api.post<{ success: true; data: { id: string; message: string } }>('/scholarship-applications', input);
  return res.data.data.message;
};

// Field name must be 'file' — matches backend upload.middleware.ts's
// uploadDocument picker (.single('file')), not the 'image' field name above.
export const uploadScholarshipDocument = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<{ success: true; data: { url: string } }>('/scholarship-applications/upload-document', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.url;
};

export interface AdminScholarshipApplication extends SubmitScholarshipApplicationInput {
  _id: string;
  status: ScholarshipApplicationStatus;
  reviewNotes?: string;
  decidedAt?: string;
  issuedAccessCode?: string;
  createdAt: string;
  // AI-assisted ranking (adminAnalyzeApplications below) — suggestion-only,
  // never read by decideScholarshipApplication. Absent until analyzed.
  aiScore?: number;
  aiRationale?: string;
  aiScoredAt?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const fetchScholarshipApplications = async (params: {
  status?: ScholarshipApplicationStatus;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<Paginated<AdminScholarshipApplication>> => {
  const res = await api.get<{ success: true; data: AdminScholarshipApplication[]; meta: Omit<Paginated<never>, 'items'> }>(
    '/admin/scholarship-applications',
    { params }
  );
  return { items: res.data.data, ...res.data.meta };
};

export const exportScholarshipApplicationsUrl = (params: { status?: ScholarshipApplicationStatus; q?: string }): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const base = (import.meta.env.VITE_API_URL as string) ?? '/api/v1';
  return `${base}/admin/scholarship-applications/export?${search.toString()}`;
};

// Admin-triggered, suggestion-only AI scoring — ids omitted analyzes every
// pending application. Never changes status; decideScholarshipApplication
// below is still the only way an application gets approved/rejected.
export const adminAnalyzeApplications = async (
  ids?: string[]
): Promise<{ scored: number; items: { _id: string; aiScore?: number; aiRationale?: string }[] }> => {
  const res = await api.post<{
    success: true;
    data: { scored: number; items: { _id: string; aiScore?: number; aiRationale?: string }[] };
  }>('/admin/scholarship-applications/analyze', { ids });
  return res.data.data;
};

export const decideScholarshipApplication = async (
  id: string,
  input: { status: 'approved' | 'rejected'; reviewNotes?: string; discountPercent?: ScholarshipDiscount }
): Promise<AdminScholarshipApplication> => {
  const res = await api.patch<{ success: true; data: AdminScholarshipApplication }>(
    `/admin/scholarship-applications/${id}/decide`,
    input
  );
  return res.data.data;
};
