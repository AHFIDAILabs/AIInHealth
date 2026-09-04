import { useRef, useState, type ChangeEvent } from 'react';
import { ImagePlus, Video, Loader2, X } from 'lucide-react';
import { uploadAdminMedia, type UploadedMedia } from '../../services/upload.service';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../services/api';

interface MediaUploaderProps {
  value: { url: string; thumbnailUrl?: string; type: 'photo' | 'video' } | null;
  onChange: (media: UploadedMedia | null) => void;
}

const MAX_SIZE_MB = 100;
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm';

// The Gallery form's picker — a large drop zone rather than ImagePicker's small
// avatar-shaped circle, since a comms upload needs to show a real preview of a
// photo or a playable video clip, plus progress for the larger video files.
export const MediaUploader = ({ value, onChange }: MediaUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const toast = useToast();

  const pick = () => inputRef.current?.click();

  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast('error', 'Please choose an image or video file.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast('error', `File must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const media = await uploadAdminMedia(file, setProgress);
      onChange(media);
    } catch (err) {
      toast('error', getApiErrorMessage(err, 'Could not upload the file.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-navy">Photo or Video</label>
      <div
        className={`relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed ${
          value ? 'border-transparent' : 'border-slate-200 hover:border-orange/40'
        } bg-offwhite`}
      >
        {value ? (
          <>
            {value.type === 'video' ? (
              <video src={value.url} poster={value.thumbnailUrl} controls className="h-full w-full object-cover" />
            ) : (
              <img src={value.url} alt="" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => onChange(null)}
              title="Remove"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy/70 text-white hover:bg-danger"
            >
              <X size={14} />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 size={22} className="animate-spin text-orange" />
            <p className="text-xs font-medium">Uploading… {progress}%</p>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-orange transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <button type="button" onClick={pick} className="flex flex-col items-center gap-2 p-6 text-center text-slate-400 hover:text-orange">
            <span className="flex items-center gap-1.5">
              <ImagePlus size={20} /> <Video size={20} />
            </span>
            <span className="text-xs font-semibold">Click to upload a photo or video</span>
            <span className="text-[11px] text-slate-400">JPEG, PNG, WEBP, GIF, MP4, MOV or WEBM &middot; up to {MAX_SIZE_MB}MB</span>
          </button>
        )}
      </div>
      {value && (
        <button type="button" onClick={pick} disabled={uploading} className="mt-2 text-xs font-semibold text-orange hover:underline disabled:opacity-60">
          Replace file
        </button>
      )}
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} onChange={onFileSelected} className="hidden" />
    </div>
  );
};
