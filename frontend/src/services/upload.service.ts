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

export interface UploadedMedia {
  url: string;
  thumbnailUrl: string;
  type: 'photo' | 'video';
}

// The comms team's Gallery uploader — separate from uploadTo above both because it
// sends a differently-named field (video clips run well past a profile photo's
// size, so this rides its own multer picker) and because it reports progress,
// which a multi-minute video upload actually needs.
export const uploadAdminMedia = (file: File, onProgress?: (pct: number) => void): Promise<UploadedMedia> => {
  const form = new FormData();
  form.append('file', file);
  return api
    .post<{ success: true; data: UploadedMedia }>('/admin/uploads/media', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    })
    .then((res) => res.data.data);
};
