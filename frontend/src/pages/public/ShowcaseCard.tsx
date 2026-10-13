import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Image as ImageIcon } from 'lucide-react';
import { SEO } from '../../components/seo/SEO';
import { NotFound } from './NotFound';
import { fetchShowcaseCard, type ShowcaseCardData } from '../../services/innovationShowcaseEntry.service';
import { CardPanel } from '../../components/cards/CardPanel';
import { getApiErrorMessage } from '../../services/api';

// "I'm showcasing" card — reached via a one-time magic link emailed to a
// confirmed Innovation Showcase entrant (no portal login exists for showcase
// entrants, same as abstract presenters — PresentingCard.tsx is this page's
// closest sibling and near-identical in shape). Rendered entirely
// client-side (cardGenerator.ts via the shared CardPanel) — the backend's
// only involvement anywhere in this page is the one GET that resolved the
// token.
export const ShowcaseCard = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShowcaseCardData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      return;
    }
    fetchShowcaseCard(token)
      .then(setData)
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) setNotFound(true);
        else setError(getApiErrorMessage(err, 'Could not load your card right now.'));
      });
  }, [token]);

  useEffect(
    () => () => {
      if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
    },
    [localPhotoUrl]
  );

  const onPickPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localPhotoUrl) URL.revokeObjectURL(localPhotoUrl);
    setLocalPhotoUrl(URL.createObjectURL(file));
  };

  if (notFound) return <NotFound />;
  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <p className="text-sm text-slate-500">Loading your card…</p>
      </div>
    );
  }

  // Logo doubles as the default "photo" for this card — a startup has a logo
  // on file far more often than a personal headshot, and either works fine
  // dropped into the same photo box.
  const effectivePhotoUrl = localPhotoUrl ?? data.logoUrl;

  return (
    <>
      <SEO
        title="I'm Showcasing"
        description="Generate your personalized Innovation Showcase card for the AI in Health Summit 2026."
        path="/showcase"
        noindex
      />
      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Innovation Showcase</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-navy">{data.startupName}</h1>
          {data.founderNames && <p className="mt-2 text-sm text-slate-600">{data.founderNames}</p>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {data.solutionName && <span className="rounded-full bg-offwhite px-2.5 py-1">{data.solutionName}</span>}
            {data.category && <span className="rounded-full bg-offwhite px-2.5 py-1">{data.category}</span>}
          </div>

          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-4">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-orange"
            >
              <ImageIcon size={14} /> {localPhotoUrl ? 'Use a different photo' : 'Add a photo'}
            </button>
            <p className="text-xs text-slate-400">Never uploaded — stays on this device.</p>
          </div>

          <div className="mt-6">
            <CardPanel
              heading="I'm Showcasing"
              filename={`aihs-2026-showcase-${data.startupName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`}
              shareText={`${data.startupName} is in the Innovation Showcase at the AI in Health Summit 2026! #AIHS2026`}
              data={{
                kind: 'showcase',
                name: data.startupName,
                photoUrl: effectivePhotoUrl,
                line1: data.solutionName ?? undefined,
                line2: data.category ?? undefined,
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
};
