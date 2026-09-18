import { useEffect, useState } from 'react';
import { Reveal } from '../ui/Reveal';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { SpeakerModal } from '../ui/SpeakerModal';
import { listPublicSpeakers, type AdminSpeaker } from '../../services/speaker.service';

// Rectangular photo cards, name/title in plain view below by default — on
// hover the photo darkens and the same name/title reappear as an overlay
// directly on the image (see the real site's Dr. Salma Ibrahim Anas card).
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
                <button onClick={() => setActive(speaker)} className="group block w-full text-left">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-navy-secondary">
                    {speaker.photoUrl ? (
                      <img
                        src={speaker.photoUrl}
                        alt={speaker.fullName}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <InitialsAvatar name={speaker.fullName} className="h-full w-full rounded-none" />
                    )}
                    {/* Hover reveal — dark gradient + name/title on the image itself */}
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-navy/95 via-navy/40 to-transparent p-3.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <p className="font-display text-sm font-bold leading-snug text-white">{speaker.fullName}</p>
                      <p className="mt-0.5 text-xs leading-snug text-white/80">{speaker.title}</p>
                    </div>
                  </div>
                  <p className="mt-3 font-display text-[15px] font-bold leading-snug text-navy">{speaker.fullName}</p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">{speaker.title}</p>
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      <SpeakerModal speaker={active} onClose={() => setActive(null)} />
    </section>
  );
};
