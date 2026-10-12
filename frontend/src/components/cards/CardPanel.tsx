import { useEffect, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { renderEventCard, shareOrDownloadCard, downloadBlob, type EventCardData } from '../../lib/cardGenerator';
import { Button } from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';

// Shared by every "I will be attending/presenting/speaking" card consumer
// (PortalMyCard.tsx, PresentingCard.tsx) — renders one card via
// cardGenerator.ts's client-side canvas engine and offers Share/Download.
// Extracted once a second consumer needed the exact same preview/share/
// download behavior rather than duplicating it.
export const CardPanel = ({
  heading,
  filename,
  shareText,
  data,
}: {
  heading: string;
  filename: string;
  shareText: string;
  data: EventCardData;
}) => {
  const toast = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setGenerating(true);
    setError('');
    renderEventCard(data)
      .then((renderedBlob) => {
        if (cancelled) return;
        setBlob(renderedBlob);
        objectUrl = URL.createObjectURL(renderedBlob);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError('Could not generate this card. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // `data` is a freshly-built object per render from the caller; its own
    // fields (name/photoUrl/line1/line2) are the real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.kind, data.name, data.photoUrl, data.line1, data.line2]);

  const handleDownload = () => {
    if (!blob) return;
    downloadBlob(blob, filename);
  };

  const handleShare = async () => {
    if (!blob) return;
    const result = await shareOrDownloadCard(blob, filename, shareText);
    if (result === 'downloaded') toast('success', 'Card downloaded — attach it to your post.');
  };

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="self-start text-xs font-semibold uppercase tracking-wide text-slate-400">{heading}</p>
      {error ? (
        <p className="py-16 text-sm text-danger">{error}</p>
      ) : previewUrl ? (
        <img src={previewUrl} alt={`${heading} card preview`} className="w-full max-w-xs rounded-xl shadow-lg" />
      ) : (
        <div className="flex h-64 w-full max-w-xs items-center justify-center rounded-xl bg-offwhite text-sm text-slate-400">
          Generating…
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button type="button" variant="primary" onClick={handleShare} disabled={!blob || generating} className="!px-4 !py-2 !text-sm">
          <Share2 size={14} className="mr-1.5" /> Share
        </Button>
        <button
          onClick={handleDownload}
          disabled={!blob || generating}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-orange/40 disabled:opacity-50"
        >
          <Download size={14} /> Download
        </button>
      </div>
    </div>
  );
};
