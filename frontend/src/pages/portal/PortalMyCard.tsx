import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import { fetchSpeakerSessions, type SpeakerSession } from '../../services/delegate.service';
import type { EventCardData } from '../../lib/cardGenerator';
import { SESSION_DAY_LABEL } from '../../lib/siteInfo';
import { CardPanel } from '../../components/cards/CardPanel';
import { getApiErrorMessage } from '../../services/api';

const sessionDetailLine = (s: SpeakerSession): string => `${SESSION_DAY_LABEL[s.day]} · ${s.startTime}–${s.endTime} · ${s.room}`;

// "I will be attending" / "I am speaking at AIHS 2026" cards — Batches 1 and
// 3 of the event-extras plan, sharing this one page since both are the same
// delegate's own cards. Every card is composited entirely client-side
// (cardGenerator.ts, via the shared CardPanel): nothing here ever uploads a
// photo or does image processing on the backend, so this feature can't slow
// the rest of the site down no matter how many delegates use it at once.
export const PortalMyCard = () => {
  const { delegate } = useDelegateAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SpeakerSession[]>([]);
  const [sessionsError, setSessionsError] = useState('');

  useEffect(() => {
    fetchSpeakerSessions()
      .then((result) => setSessions(result.sessions))
      .catch((err) => setSessionsError(getApiErrorMessage(err, 'Could not check your speaking sessions.')));
  }, []);

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

  if (!delegate) return null;

  // A locally-picked photo (never uploaded anywhere) takes priority over the
  // delegate's existing profile avatar, so someone can use a different/
  // better photo for their cards without changing their actual profile.
  // Shared across every card below — it's the same person in all of them.
  const effectivePhotoUrl = localPhotoUrl ?? delegate.avatarUrl ?? null;

  const cards: { key: string; heading: string; filename: string; shareText: string; data: EventCardData }[] = [
    {
      key: 'attending',
      heading: 'I Will Be Attending',
      filename: 'aihs-2026-i-will-be-attending.png',
      shareText: "I'll be at the AI in Health Summit 2026! #AIHS2026",
      data: { kind: 'attending', name: delegate.name, photoUrl: effectivePhotoUrl },
    },
    ...sessions.map((s) => ({
      key: s.id,
      heading: 'I Am Speaking',
      filename: `aihs-2026-speaking-${s.id}.png`,
      shareText: `I'm speaking at the AI in Health Summit 2026 — "${s.title}"! #AIHS2026`,
      data: {
        kind: 'speaking' as const,
        name: delegate.name,
        photoUrl: effectivePhotoUrl,
        line1: s.title,
        line2: sessionDetailLine(s),
      },
    })),
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Share the news</p>
        <h1 className="font-display text-2xl font-semibold text-navy">My Cards</h1>
        <p className="mt-1 text-sm text-slate-500">
          Download or share your personalized cards for the AI in Health Summit 2026.
        </p>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-4">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-orange"
        >
          <ImageIcon size={14} /> {effectivePhotoUrl ? 'Use a different photo' : 'Add a photo'}
        </button>
        <p className="text-xs text-slate-400">Used on every card below — never uploaded, stays on this device.</p>
      </div>

      {sessionsError && <p className="text-xs text-danger">{sessionsError}</p>}

      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map((card) => (
          <CardPanel key={card.key} heading={card.heading} filename={card.filename} shareText={card.shareText} data={card.data} />
        ))}
      </div>
    </div>
  );
};
