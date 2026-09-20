import { useEffect, useState } from 'react';
import { Reveal } from '../ui/Reveal';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { SpeakerModal } from '../ui/SpeakerModal';
import { AbujaSkyline } from '../ui/AbujaSkyline';
import { useDominantColor, hashColor, shadeColor } from '../../hooks/useDominantColor';
import { listPublicSpeakers, type AdminSpeaker } from '../../services/speaker.service';

// Cloudinary's AI background-removal add-on, applied on the fly to whatever
// photo the admin already uploaded — no separate cutout asset to manage.
// Cloudinary caches the transformed result on its CDN after the first
// request, so this only actually runs the (metered) add-on once per photo,
// not on every page view. Falls back to the original URL for a non-
// Cloudinary host, or if the URL shape doesn't match what we expect.
const toCutoutUrl = (url: string): string => {
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1 || !url.includes('res.cloudinary.com')) return url;
  const before = url.slice(0, idx + marker.length);
  const after = url.slice(idx + marker.length).replace(/\.(jpg|jpeg|png|webp)$/i, '.png');
  return `${before}e_background_removal/${after}`;
};

// A small folded-corner accent, decoration only — the one geometric touch
// the reference design uses in the top-right of every card.
const AccentShape = ({ color }: { color: string }) => (
  <svg width="52" height="52" viewBox="0 0 52 52" className="pointer-events-none absolute right-3 top-3" aria-hidden="true">
    <path d="M8 40 L40 40 L40 8" stroke={color} strokeWidth="8" strokeLinecap="square" fill="none" />
  </svg>
);

// Default state: a flat, solid card color (extracted from the speaker's own
// photo) with that same photo's background removed (Cloudinary AI cutout),
// so the person appears to stand directly on the card color, plus a small
// geometric accent in the corner — matching the reference design given
// directly. On hover it cross-fades to the plain full-bleed photo + name/
// title reveal this card showed by default before this redesign.
const SpeakerCard = ({ speaker, onOpen }: { speaker: AdminSpeaker; onOpen: () => void }) => {
  const fallback = hashColor(speaker.fullName);
  const { color, ref, onLoad } = useDominantColor(speaker.photoUrl, fallback);
  const accent = shadeColor(color, 0.45);

  return (
    <button onClick={onOpen} className="group block w-full text-left">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl" style={{ backgroundColor: color }}>
        {/* Layer 1 — designed default, fades out on hover */}
        <div className="absolute inset-0 overflow-hidden transition-opacity duration-300 group-hover:opacity-0">
          <AccentShape color={accent} />
          {speaker.photoUrl ? (
            <img
              ref={ref}
              src={speaker.photoUrl}
              alt=""
              aria-hidden="true"
              crossOrigin="anonymous"
              onLoad={onLoad}
              className="absolute h-px w-px opacity-0"
            />
          ) : null}
          {speaker.photoUrl ? (
            <img
              src={toCutoutUrl(speaker.photoUrl)}
              alt={speaker.fullName}
              className="absolute bottom-0 left-1/2 h-[92%] w-[124%] -translate-x-1/2 object-contain object-bottom"
            />
          ) : (
            <InitialsAvatar name={speaker.fullName} className="absolute inset-x-6 bottom-0 top-6 rounded-t-full" />
          )}

          {/* Floating on top of the cutout, same silhouette PageHero.tsx uses
              along the bottom of every interior page header. */}
          <AbujaSkyline className="pointer-events-none absolute inset-x-0 bottom-0 h-7 w-full" tone="onLight" opacity={0.4} />
        </div>

        {/* Layer 2 — the original card, cross-faded in on hover. Same
            crossOrigin as the hidden sampling <img> above — mixing
            crossOrigin and non-crossOrigin <img> requests for the identical
            URL is what caused an earlier render bug (see
            useDominantColor.ts's comment). */}
        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {speaker.photoUrl ? (
            <img
              src={speaker.photoUrl}
              alt={speaker.fullName}
              crossOrigin="anonymous"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <InitialsAvatar name={speaker.fullName} className="h-full w-full rounded-none" />
          )}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy/95 via-navy/40 to-transparent p-3.5">
            <p className="font-display text-sm font-bold leading-snug text-white">{speaker.fullName}</p>
            <p className="mt-0.5 text-xs leading-snug text-white/80">{speaker.title}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 font-display text-[15px] font-bold leading-snug text-navy">{speaker.fullName}</p>
      <p className="mt-0.5 text-xs leading-snug text-slate-500">{speaker.title}</p>
    </button>
  );
};

// Backed by the real GET /speakers, so this never drifts from /speakers or
// from what admin has actually published.
export const SpeakersGrid = () => {
  const [speakers, setSpeakers] = useState<AdminSpeaker[] | null>(null);
  const [active, setActive] = useState<AdminSpeaker | null>(null);

  useEffect(() => {
    listPublicSpeakers()
      .then(setSpeakers)
      .catch(() => setSpeakers([]));
  }, []);

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Speakers</h2>
          <span className="mx-auto mt-3 block h-1 w-14 rounded-full bg-orange" />
        </Reveal>

        {speakers === null ? null : speakers.length === 0 ? (
          <Reveal delay={0.1} className="mx-auto mt-10 max-w-sm rounded-2xl border border-dashed border-slate-300 py-8 text-center">
            <p className="text-sm font-medium text-slate-500">Speakers to be announced.</p>
          </Reveal>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {speakers.map((speaker, i) => (
              <Reveal key={speaker._id} delay={i * 0.04}>
                <SpeakerCard speaker={speaker} onOpen={() => setActive(speaker)} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      <SpeakerModal speaker={active} onClose={() => setActive(null)} />
    </section>
  );
};
