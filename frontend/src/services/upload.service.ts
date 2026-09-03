import { api } from './api';

// Two thin wrappers around the same shape of endpoint, mounted under each auth
// context's own namespace (backend/src/routes/v1/admin.routes.ts and
// delegate.routes.ts) so uploads always ride the caller's real session.
const uploadTo = async (path: string, file: File): Promise<string> => {
  const form = new FormData();
  form.append('image', file);
  const res = await api.post<{ success: true; data: { url: string } }>(path, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.url;
};

export const uploadAdminImage = (file: File): Promise<string> => uploadTo('/admin/uploads/image', file);
export const uploadDelegateImage = (file: File): Promise<string> => uploadTo('/delegate/uploads/image', file);
