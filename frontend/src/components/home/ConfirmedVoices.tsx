import { ArrowRight } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { FEATURED_SPEAKERS } from '../../lib/speakers';

// Recognition-only, immediately after the hero — name + one-line title, no bios, no
// context. The point is "you know these names," same mechanic as a marquee speaker
// strip; the full bios/filtering live on /speakers. Real confirmed roster only — see
// lib/speakers.ts's own comment on why no placeholder names are invented here.
export const ConfirmedVoices = () => (
  <section className="border-b border-slate-100 bg-white py-14">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <Reveal className="flex flex-col items-center gap-1.5 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange">Confirmed Voices</p>
        <h2 className="font-display text-xl font-semibold text-navy sm:text-2xl">Speaking at AHTS 2026</h2>
      </Reveal>

      {FEATURED_SPEAKERS.length > 0 ? (
        <Reveal delay={0.1} className="mt-8 -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0 [&::-webkit-scrollbar]:hidden">
          {FEATURED_SPEAKERS.map((speaker) => (
            <div key={speaker.id} className="flex w-24 shrink-0 snap-start flex-col items-center text-center sm:w-28">
              {speaker.photo ? (
                <img
                  src={speaker.photo}
                  alt={speaker.name}
                  className="h-20 w-20 rounded-full border-2 border-white object-cover shadow-md shadow-navy/10 sm:h-24 sm:w-24"
                />
              ) : (
                <InitialsAvatar
                  name={speaker.name}
                  className="h-20 w-20 rounded-full border-2 border-white shadow-md shadow-navy/10 sm:h-24 sm:w-24"
                />
              )}
              <p className="mt-3 font-display text-[13px] font-semibold leading-snug text-navy">{speaker.name}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{speaker.title}</p>
            </div>
          ))}
        </Reveal>
      ) : (
        <Reveal delay={0.1} className="mx-auto mt-8 max-w-sm rounded-2xl border border-dashed border-slate-300 py-8 text-center">
          <p className="text-sm font-medium text-slate-500">Speakers to be announced.</p>
        </Reveal>
      )}

      <Reveal delay={0.15} className="mt-8 flex justify-center">
        <ButtonLink to="/speakers" variant="secondary" className="!border-slate-300 !bg-transparent !text-navy hover:!bg-navy/5 !py-2.5 !text-sm">
          See All Speakers <ArrowRight size={15} className="ml-1.5" />
        </ButtonLink>
      </Reveal>
    </div>
  </section>
);
