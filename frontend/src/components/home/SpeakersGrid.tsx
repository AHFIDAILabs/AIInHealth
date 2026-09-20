import { useEffect, useState } from 'react';
import { Reveal } from '../ui/Reveal';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { SpeakerModal } from '../ui/SpeakerModal';
import { AbujaSkyline } from '../ui/AbujaSkyline';
import { useDominantColor, hashColor } from '../../hooks/useDominantColor';
import { listPublicSpeakers, type AdminSpeaker } from '../../services/speaker.service';

// Default state: a "designed" card — the full photo (not a cropped avatar)
// tinted with a color pulled from that same photo via a color-blend overlay
// (recolors it while keeping its own detail/luminance, a duotone effect —
// see the mixBlendMode below), with PageHero.tsx's visual language — a glow
// blob, a decorative circle, and the AbujaSkyline silhouette along the
// bottom — floating on top of it. On hover it cross-fades to the plain
// full-bleed photo + name/title reveal this card used to show by default —
// the "original" look, preserved as-is.
const SpeakerCard = ({ speaker, onOpen }: { speaker: AdminSpeaker; onOpen: () => void }) => {
  const fallback = hashColor(speaker.fullName);
  const { color, ref, onLoad } = useDominantColor(speaker.photoUrl, fallback);

  return (
    <button onClick={onOpen} className="group block w-full text-left">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-navy-secondary">
        {/* Layer 1 — designed default, fades out on hover */}
        <div className="absolute inset-0 overflow-hidden transition-opacity duration-300 group-hover:opacity-0">
          {speaker.photoUrl ? (
            <img
              ref={ref}
              src={speaker.photoUrl}
              alt={speaker.fullName}
              crossOrigin="anonymous"
              onLoad={onLoad}
              className="h-full w-full object-cover"
            />
          ) : (
            <InitialsAvatar name={speaker.fullName} className="h-full w-full rounded-none" />
          )}

          {/* Tints the full photo with its own extracted color, keeping the
              photo's own detail/luminance visible underneath (duotone). */}
          <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: color, mixBlendMode: 'color' }} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/25 to-navy/10" />

          <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full border border-white/10" />
          <AbujaSkyline className="pointer-events-none absolute bottom-0 left-0 h-8 w-full" opacity={0.4} />

          <div className="absolute inset-x-0 bottom-0 p-3.5">
            <p className="font-display text-sm font-bold leading-snug text-white">{speaker.fullName}</p>
            <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-white/80">{speaker.title}</p>
          </div>
        </div>

        {/* Layer 2 — the original card, cross-faded in on hover. Same
            crossOrigin as the layer-1 photo above — mixing crossOrigin and
            non-crossOrigin <img> requests for the identical URL is what
            caused the render bug this is fixed from (see
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
