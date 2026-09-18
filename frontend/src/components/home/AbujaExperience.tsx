import { Mountain } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import nigerianCulturalCentre from '../../assets/images/Nigerian Cultural Centre.webp';
import ecowasCommission from '../../assets/images/Abuja_Building.webp';

// Real photography of two of Abuja's most distinctive landmarks — a deliberate step up
// from the icon-only cards this section used before, and a different monument from the
// City Gate shot already carrying the Home hero. Zuma Rock has no confirmed photo asset
// yet, so its card keeps the icon/watermark treatment instead of a photo.
const PHOTO_HIGHLIGHTS = [
  {
    image: nigerianCulturalCentre,
    tag: 'Architectural Landmark',
    title: 'Nigerian Cultural Centre',
    body: 'One of Abuja’s most striking modern structures, with a geometric façade that captures the capital’s architectural ambition.',
  },
  {
    image: ecowasCommission,
    tag: 'Regional Institution',
    title: 'ECOWAS Commission Headquarters',
    body: 'Home to the Economic Community of West African States, anchoring Abuja as a hub for regional diplomacy.',
  },
];

export const AbujaExperience = () => (
  <section className="border-y border-slate-100 bg-white py-16">
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <Reveal className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Host City</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">The Abuja Experience</h2>
        </div>
        <p className="max-w-sm text-sm text-slate-500">Nigeria&rsquo;s capital, hosting the continent&rsquo;s conversation on AI in health.</p>
      </Reveal>

      <div className="mt-8 -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {PHOTO_HIGHLIGHTS.map((h, i) => (
          <Reveal
            key={h.title}
            delay={i * 0.08}
            className="group relative h-56 w-[75%] shrink-0 snap-start overflow-hidden rounded-xl sm:w-[calc(33.333%-14px)]"
          >
            <img
              src={h.image}
              alt={h.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/50 to-navy/0" />
            <div className="relative flex h-full flex-col justify-end p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-orange">{h.tag}</p>
              <p className="mt-1 font-display text-base font-semibold text-white">{h.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-200">{h.body}</p>
            </div>
          </Reveal>
        ))}

        <Reveal
          delay={PHOTO_HIGHLIGHTS.length * 0.08}
          className="relative h-56 w-[75%] shrink-0 snap-start overflow-hidden rounded-xl bg-navy p-4 sm:w-[calc(33.333%-14px)]"
        >
          <Mountain size={18} className="relative text-orange" />
          <Mountain size={120} strokeWidth={1} className="pointer-events-none absolute -bottom-6 -right-6 text-white/[0.05]" />
          <div className="relative mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Nearby Landmark</p>
            <p className="mt-1 font-display text-base font-semibold text-white">Zuma Rock</p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              The iconic 725-metre monolith on the Abuja&ndash;Kaduna corridor, a short drive from the city
              center.
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);
