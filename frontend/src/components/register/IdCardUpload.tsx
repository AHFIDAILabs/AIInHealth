import { useRef, useState, type ChangeEvent } from 'react';
import { UploadCloud, Loader2, CheckCircle2, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { getApiErrorMessage } from '../../services/api';
import { uploadRegistrationIdCard } from '../../services/upload.service';

interface IdCardUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  error?: string;
}

const MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif';

// Uploads immediately on selection (same "upload-then-submit" pattern as
// ImagePicker.tsx) via the public /registrations/upload-id endpoint — no
// session to ride yet at this point in the form, unlike every other image
// picker in this app. Styled as a document dropzone rather than a circular
// profile-photo picker (ImagePicker's shape), since an ID card reads as a
// landscape document, not an avatar.
export const IdCardUpload = ({ value, onChange, error }: IdCardUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const pick = () => inputRef.current?.click();

  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('error', 'Please choose an image file (a clear photo of your ID works fine).');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast('error', `Image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadRegistrationIdCard(file);
      onChange(url);
    } catch (err) {
      toast('error', getApiErrorMessage(err, 'Could not upload your ID. Please try again.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} onChange={onFileSelected} className="hidden" />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/5 p-3">
          <img src={value} alt="Uploaded ID" className="h-14 w-20 shrink-0 rounded-lg border border-slate-200 object-cover" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
              <CheckCircle2 size={15} className="shrink-0 text-success" /> ID uploaded
            </p>
            <button type="button" onClick={pick} className="mt-0.5 text-xs font-semibold text-orange hover:underline">
              Replace photo
            </button>
          </div>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label="Remove uploaded ID"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={uploading}
          className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-white px-4 py-6 text-center transition-colors disabled:opacity-60 ${
            error ? 'border-danger/50' : 'border-slate-300 hover:border-orange/50'
          }`}
        >
          {uploading ? (
            <Loader2 size={22} className="animate-spin text-orange" />
          ) : (
            <UploadCloud size={22} className="text-slate-400" />
          )}
          <span className="text-sm font-semibold text-navy">{uploading ? 'Uploading…' : 'Upload a photo of your ID'}</span>
          <span className="text-xs text-slate-400">JPEG, PNG, WEBP or GIF, up to {MAX_SIZE_MB}MB.</span>
        </button>
      )}
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
};
