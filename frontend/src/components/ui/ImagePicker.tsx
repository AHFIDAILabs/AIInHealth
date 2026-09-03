import { useRef, useState, type ChangeEvent } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../services/api';

interface ImagePickerProps {
  value?: string;
  onChange: (url: string) => void;
  upload: (file: File) => Promise<string>;
  shape?: 'circle' | 'square';
  size?: number;
  label?: string;
  // Initial shown in the empty-state badge (e.g. a name/title) — falls back to a
  // plain camera icon when there's nothing to initial from.
  fallbackText?: string;
}

const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif';

// The single picker behind every profile/logo photo across the app — admin
// settings, delegate portal, speakers, partners, innovations. Uploads immediately
// on selection (via whichever auth-scoped `upload` fn the caller passes) and hands
// the resulting hosted URL back through onChange, same shape a pasted URL used to be.
export const ImagePicker = ({ value, onChange, upload, shape = 'circle', size = 64, label, fallbackText }: ImagePickerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const pick = () => inputRef.current?.click();

  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('error', 'Please choose an image file.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast('error', `Image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setUploading(true);
    try {
      const url = await upload(file);
      onChange(url);
    } catch (err) {
      toast('error', getApiErrorMessage(err, 'Could not upload image.'));
    } finally {
      setUploading(false);
    }
  };

  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={pick}
        disabled={uploading}
        style={{ width: size, height: size }}
        className={`group relative flex shrink-0 items-center justify-center overflow-hidden border border-slate-200 ${radius} ${
          value ? '' : 'bg-gradient-to-br from-navy to-navy-secondary'
        }`}
        title="Change photo"
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : fallbackText ? (
          <span className="text-sm font-bold text-white">{fallbackText[0]?.toUpperCase()}</span>
        ) : (
          <Camera size={18} className="text-white/80" />
        )}
        <span
          className={`absolute inset-0 flex items-center justify-center bg-navy/60 text-white transition-opacity ${
            uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={16} />}
        </span>
      </button>
      <div>
        {label && <p className="text-[13px] font-semibold text-navy">{label}</p>}
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className="mt-1 text-xs font-semibold text-orange hover:underline disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : value ? 'Change photo' : 'Upload photo'}
        </button>
        <p className="mt-1 text-xs text-slate-400">JPEG, PNG, WEBP or GIF, up to {MAX_SIZE_MB}MB.</p>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} onChange={onFileSelected} className="hidden" />
    </div>
  );
};
