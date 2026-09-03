import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { Reveal } from '../ui/Reveal';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { FEATURED_SPEAKERS } from '../../lib/speakers';

export const FeaturedSpeakers = () => (
  <section className="bg-white py-24">
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Distinguished Faculty</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Featured Speakers</h2>
          <p className="mt-2 max-w-xl text-slate-600">
            Ministers, regulators, and global health leaders convening in Abuja.
          </p>
        </div>
        <ButtonLink to="/speakers" variant="secondary" className="!border-slate-300 !bg-transparent !text-navy hover:!bg-navy/5">
          View All Speakers <ArrowRight size={16} className="ml-1.5" />
        </ButtonLink>
      </Reveal>

      <div className="mt-10 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        {FEATURED_SPEAKERS.map((speaker, i) => (
          <Reveal key={speaker.id} delay={i * 0.05}>
            <div className="group h-full overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-orange/40 hover:shadow-lg hover:shadow-navy/5">
              <div className="relative aspect-[4/5] overflow-hidden">
                {speaker.photo ? (
                  <img
                    src={speaker.photo}
                    alt={speaker.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <InitialsAvatar
                    name={speaker.name}
                    className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-orange opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="p-3">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-orange">{speaker.track}</span>
                <p className="mt-1 font-display text-[13px] font-semibold leading-snug text-navy">{speaker.name}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{speaker.title}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);
