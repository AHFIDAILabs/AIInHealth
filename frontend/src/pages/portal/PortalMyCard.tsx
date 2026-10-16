import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import { fetchSpeakerSessions, updateDelegateProfile, type SpeakerSession } from '../../services/delegate.service';
import { uploadDelegateImage } from '../../services/upload.service';
import type { EventCardData } from '../../lib/cardGenerator';
import { SESSION_DAY_LABEL } from '../../lib/siteInfo';
import { CardPanel } from '../../components/cards/CardPanel';
import { ImagePicker } from '../../components/ui/ImagePicker';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const sessionDetailLine = (s: SpeakerSession): string => `${SESSION_DAY_LABEL[s.day]} · ${s.startTime}–${s.endTime} · ${s.room}`;

// "I will be attending" / "I am speaking at AIHS 2026" cards — Batches 1 and
// 3 of the event-extras plan, sharing this one page since both are the same
// delegate's own cards. Every card is composited entirely client-side
// (cardGenerator.ts, via the shared CardPanel): nothing here ever uploads a
// photo or does image processing on the backend, so this feature can't slow
// the rest of the site down no matter how many delegates use it at once.
export const PortalMyCard = () => {
  const { delegate, refresh } = useDelegateAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SpeakerSession[]>([]);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [sessionsError, setSessionsError] = useState('');
  const [savingLogo, setSavingLogo] = useState(false);

  useEffect(() => {
    fetchSpeakerSessions()
      .then((result) => {
        setSessions(result.sessions);
        setIsSpeaker(result.isSpeaker);
      })
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

  // Unlike the personal photo above (local-only, never uploaded), the
  // company logo is a real hosted asset — it needs to persist across visits
  // and devices, so this uploads immediately and saves it to the profile.
  const onLogoChange = async (url: string) => {
    setSavingLogo(true);
    try {
      await updateDelegateProfile({ logoUrl: url });
      await refresh();
    } catch (err) {
      toast('error', getApiErrorMessage(err, 'Could not save your logo.'));
    } finally {
      setSavingLogo(false);
    }
  };

  if (!delegate) return null;

  // A locally-picked photo (never uploaded anywhere) takes priority over the
  // delegate's existing profile avatar, so someone can use a different/
  // better photo for their cards without changing their actual profile.
  // Shared across every card below — it's the same person in all of them.
  const effectivePhotoUrl = localPhotoUrl ?? delegate.avatarUrl ?? null;

  // The attending card's role label reflects the person, not just the card
  // layout: a team/staff registration (an organizer) or a confirmed speaker
  // still uses this same "I will be attending" card, just with a different
  // word under the photo. Speaker takes priority over "team" — someone can
  // be registered as staff and also be a confirmed speaker.
  //
  // paymentStatus === 'not_required' is a reliable "this seat cost them
  // nothing" signal for every free channel at once (a free ticket category
  // like government_official/accredited_media, OR any fully-comped access
  // code redemption — scholarship-100%, promo, staff, bulk_invite,
  // keynote_speaker, complimentary — see registration.controller.ts's
  // create(): a 100%-comped registration never leaves 'not_required').
  // Checked before the VIP case below, per management's ask: a free seat
  // reads "Sponsored" even if its ticketCategory happens to be 'vip'; only a
  // PAID vip keeps its own "VIP" label, and every other paid category reads
  // the generic "Delegate".
  const attendingRoleLabel = isSpeaker
    ? 'Speaker'
    : delegate.type === 'team'
      ? 'Organizer'
      : delegate.paymentStatus === 'not_required'
        ? 'Sponsored'
        : delegate.ticketCategory === 'vip'
          ? 'VIP'
          : 'Delegate';

  const cards: { key: string; heading: string; filename: string; shareText: string; data: EventCardData }[] = [
    {
      key: 'attending',
      heading: 'I Will Be Attending',
      filename: 'aihs-2026-i-will-be-attending.png',
      shareText: "I'll be at the AI in Health Summit 2026! #AIHS2026",
      data: { kind: 'attending', name: delegate.name, photoUrl: effectivePhotoUrl, roleLabel: attendingRoleLabel },
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
    // Exhibitor-only — a separate "Visit Our Booth" card alongside their
    // "I Will Be Attending" one above. companyName/productsDescription
    // aren't on every registration type, so this card is skipped entirely
    // rather than rendering with blank/awkward fallback text. Prefers the
    // uploaded company logo over the shared personal photo — falls back to
    // it so the card isn't photo-less before a logo's been added.
    ...(delegate.type === 'exhibitor' && delegate.companyName
      ? [
          {
            key: 'exhibiting',
            heading: 'Visit Our Booth',
            filename: 'aihs-2026-visit-our-booth.png',
            shareText: `We're exhibiting at the AI in Health Summit 2026 — visit us! #AIHS2026`,
            data: {
              kind: 'exhibiting' as const,
              name: delegate.companyName,
              photoUrl: delegate.logoUrl ?? effectivePhotoUrl,
              line1: delegate.productsDescription || undefined,
              line2: [delegate.boothNumber ? `Booth ${delegate.boothNumber}` : null, delegate.website]
                .filter(Boolean)
                .join(' · ') || undefined,
            },
          },
        ]
      : []),
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

      {delegate.type === 'exhibitor' && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <ImagePicker
            value={delegate.logoUrl}
            onChange={onLogoChange}
            upload={uploadDelegateImage}
            shape="square"
            size={52}
            fallbackText={delegate.companyName || delegate.name}
          />
          <div>
            <p className="text-xs font-semibold text-navy">{savingLogo ? 'Saving…' : 'Company logo'}</p>
            <p className="text-xs text-slate-400">Used on your "Visit Our Booth" card below — saved to your profile.</p>
          </div>
        </div>
      )}

      {sessionsError && <p className="text-xs text-danger">{sessionsError}</p>}

      <div className="grid gap-6 sm:grid-cols-2">
        {cards.map((card) => (
          <CardPanel key={card.key} heading={card.heading} filename={card.filename} shareText={card.shareText} data={card.data} />
        ))}
      </div>
    </div>
  );
};
