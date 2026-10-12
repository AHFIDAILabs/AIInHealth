import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Image as ImageIcon } from 'lucide-react';
import { SEO } from '../../components/seo/SEO';
import { NotFound } from './NotFound';
import { fetchPresentingCard, type PresentingCardData } from '../../services/confirmedAbstract.service';
import { SESSION_DAY_LABEL } from '../../lib/siteInfo';
import { CardPanel } from '../../components/cards/CardPanel';
import { getApiErrorMessage } from '../../services/api';

// "I will be presenting" card — Batch 2 of the event-extras plan. Reached
// via a one-time magic link emailed to the presenter (no portal login exists
// for presenters, unlike attendees/speakers — ConfirmedAbstract has no
// reliable link to a Registration). Rendered entirely client-side
// (cardGenerator.ts via the shared CardPanel) — the backend's only
// involvement anywhere in this page is the one GET that resolved the token.
export const PresentingCard = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PresentingCardData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      return;
    }
    fetchPresentingCard(token)
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

  const effectivePhotoUrl = localPhotoUrl ?? data.photoUrl;
  const sessionLine = data.session
    ? `${SESSION_DAY_LABEL[data.session.day]} · ${data.session.startTime}–${data.session.endTime} · ${data.session.room}`
    : undefined;

  return (
    <>
      <SEO
        title="I Will Be Presenting"
        description="Generate your personalized presenter card for the AI in Health Summit 2026."
        path="/presenting"
        noindex
      />
      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{data.code}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-navy">{data.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{data.authorName}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {data.track && <span className="rounded-full bg-offwhite px-2.5 py-1">{data.track}</span>}
            {data.presentationType && <span className="rounded-full bg-offwhite px-2.5 py-1">{data.presentationType}</span>}
          </div>

          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-4">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-orange"
            >
              <ImageIcon size={14} /> {effectivePhotoUrl ? 'Use a different photo' : 'Add a photo'}
            </button>
            <p className="text-xs text-slate-400">Never uploaded — stays on this device.</p>
          </div>

          <div className="mt-6">
            <CardPanel
              heading="I Will Be Presenting"
              filename={`aihs-2026-presenting-${data.code}.png`}
              shareText={`I'm presenting "${data.title}" at the AI in Health Summit 2026! #AIHS2026`}
              data={{ kind: 'presenting', name: data.authorName, photoUrl: effectivePhotoUrl, line1: data.title, line2: sessionLine }}
            />
          </div>

          {!data.session && (
            <p className="mt-4 text-xs text-slate-400">
              Session details haven't been assigned yet — check back closer to the event, or contact the secretariat.
            </p>
          )}
        </div>
      </section>
    </>
  );
};
