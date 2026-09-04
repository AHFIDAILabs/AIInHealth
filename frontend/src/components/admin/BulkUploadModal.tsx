import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Loader2, CheckCircle2, XCircle, ImagePlus } from 'lucide-react';
import { uploadAdminMedia } from '../../services/upload.service';
import { adminCreateMedia, type AdminMedia, type MediaDay } from '../../services/media.service';

interface QueuedFile {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

interface BulkUploadModalProps {
  onClose: () => void;
  onDone: (created: AdminMedia[]) => void;
}

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm';

// Event-day workflow: the comms team drops in a whole batch of photos/videos at
// once instead of the single-item form. Each file uploads and creates its own
// Media doc independently — one slow video doesn't block the photos behind it —
// captions stay blank (edited individually afterwards from the grid) and every
// item lands unpublished by default unless "Publish immediately" is checked, so a
// batch dump never goes live before anyone's looked at it.
export const BulkUploadModal = ({ onClose, onDone }: BulkUploadModalProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [day, setDay] = useState<MediaDay>('general');
  const [publishImmediately, setPublishImmediately] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files)
      .filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map((file): QueuedFile => ({ file, status: 'pending', progress: 0 }));
    setQueue((prev) => [...prev, ...next]);
  };

  const runUpload = async () => {
    setRunning(true);
    const created: AdminMedia[] = [];

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status !== 'pending') continue;
      setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'uploading' } : q)));
      try {
        // eslint-disable-next-line no-await-in-loop
        const uploaded = await uploadAdminMedia(queue[i].file, (pct) =>
          setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, progress: pct } : q)))
        );
        // eslint-disable-next-line no-await-in-loop
        const media = await adminCreateMedia({
          type: uploaded.type,
          url: uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl,
          day,
          isPublished: publishImmediately,
        });
        created.push(media);
        setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'done', progress: 100 } : q)));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: 'error', error: message } : q)));
      }
    }

    setRunning(false);
    setDone(true);
    if (created.length > 0) onDone(created);
  };

  const removeFile = (idx: number) => setQueue((prev) => prev.filter((_, i) => i !== idx));
  const pendingCount = queue.filter((q) => q.status === 'pending').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <p className="font-display text-lg font-semibold text-navy">Bulk Upload</p>
          <button onClick={onClose} className="text-slate-400 hover:text-navy">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-offwhite p-6 text-center text-slate-400 hover:border-orange/40 hover:text-orange"
          >
            <ImagePlus size={22} />
            <span className="text-xs font-semibold">Click to select multiple photos or videos</span>
          </button>
          <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} multiple onChange={(e) => addFiles(e.target.files)} className="hidden" />

          {queue.length > 0 && (
            <div className="space-y-1.5">
              {queue.map((q, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-lg border border-slate-100 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{q.file.name}</span>
                  {q.status === 'pending' && !running && (
                    <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-danger">
                      <X size={13} />
                    </button>
                  )}
                  {q.status === 'uploading' && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-orange">
                      <Loader2 size={12} className="animate-spin" /> {q.progress}%
                    </span>
                  )}
                  {q.status === 'done' && <CheckCircle2 size={14} className="text-success" />}
                  {q.status === 'error' && (
                    <span title={q.error}>
                      <XCircle size={14} className="shrink-0 text-danger" />
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="flex-1 text-[13px] font-semibold text-navy">Tag all as</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value as MediaDay)}
              disabled={running}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
            >
              <option value="general">General</option>
              <option value="day1">Day 1</option>
              <option value="day2">Day 2</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5">
            <span className="text-[13px] font-semibold text-navy">Publish immediately</span>
            <input type="checkbox" checked={publishImmediately} onChange={(e) => setPublishImmediately(e.target.checked)} disabled={running} className="h-4 w-4 accent-orange" />
          </label>
          {!publishImmediately && (
            <p className="text-xs text-slate-400">Items upload as drafts — publish each from the grid once you've added captions.</p>
          )}
        </div>

        <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && (
            <button
              onClick={runUpload}
              disabled={running || pendingCount === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
            >
              {running ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {running ? 'Uploading…' : `Upload ${pendingCount || ''}`.trim()}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
