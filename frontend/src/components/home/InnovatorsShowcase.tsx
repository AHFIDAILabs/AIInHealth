import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import { listInnovations, type Innovation } from '../../services/innovation.service';

// Adapted from Web Summit's "they came as small startups" growth wall (brief #6) —
// but AHTS has no track record of alumni to claim yet, so this borrows only the
// *mechanic* (a curated showcase, not a generic grid) and points at real submitted
// innovations instead. Renders nothing at all until at least one is published —
// an empty or placeholder version here would be exactly the fabrication risk the
// brief flags, so "hidden" is the honest default for a first-year event.
export const InnovatorsShowcase = () => {
  const [items, setItems] = useState<Innovation[] | null>(null);

  useEffect(() => {
    listInnovations()
      .then((data) => setItems(data.slice(0, 6)))
      .catch(() => setItems([]));
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="bg-offwhite py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Startup Showcase</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">
              African Health-AI Innovators to Watch
            </h2>
            <p className="mt-2 max-w-xl text-slate-600">Who to meet on the floor in Abuja.</p>
          </div>
          <ButtonLink to="/innovation-showcase" variant="secondary" className="!border-slate-300 !bg-transparent !text-navy hover:!bg-navy/5">
            View Full Showcase <ArrowRight size={16} className="ml-1.5" />
          </ButtonLink>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((innovation, i) => (
            <Reveal key={innovation._id} delay={i * 0.06}>
              <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-orange/40 hover:shadow-lg hover:shadow-navy/5">
                <div className="flex items-center gap-3">
                  {innovation.logoUrl ? (
                    <img src={innovation.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                      <Sparkles size={18} />
                    </span>
                  )}
                  <div>
                    <p className="font-display text-sm font-semibold text-navy">{innovation.name}</p>
                    {innovation.organization && <p className="text-xs text-slate-500">{innovation.organization}</p>}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{innovation.tagline}</p>
                <span className="mt-4 inline-block rounded-full bg-orange/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange">
                  {innovation.track}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
