import { User, Building2, GraduationCap, ArrowRight } from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { Reveal } from '../ui/Reveal';

// Every figure here is a target, not a claim — the reference draft this was adapted
// from presented numbers like these as settled fact ("$15M+ Deal Pipeline") before
// the event has happened. Labeling the section "Projected" keeps the ambition visible
// without asserting something no one can back up yet. Swap in real numbers as they firm up.
const STATS = [
  { value: '500+', label: 'Delegates', note: 'Ministers, clinicians, founders & investors' },
  { value: '45+', label: 'African Nations', note: 'Continental policy & research alignment', accent: true },
  { value: '50+', label: 'AI Solutions Showcased', note: 'Clinical, diagnostic & operational tools' },
  { value: '20+', label: 'Sessions', note: 'Across two days of programming' },
];

// Ties directly to the real registrantCategory tiers in the platform's data model —
// no invented prices here; those come from PricingTier once finance confirms them.
const REG_TIERS = [
  { icon: User, label: 'Individual', note: 'Full delegate access, two days' },
  { icon: Building2, label: 'Organization', note: 'Team seats for institutions & companies' },
  { icon: GraduationCap, label: 'Student', note: 'Reduced-rate access for students' },
];

export const SummitAtAGlance = () => (
  <section className="bg-white py-20">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Projected Impact</p>
          <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-4">
            {STATS.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 0.06}>
                <p className={`font-display text-4xl font-bold ${stat.accent ? 'text-orange' : 'text-navy'}`}>
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-semibold text-navy">{stat.label}</p>
                <p className="mt-1 text-xs leading-snug text-slate-500">{stat.note}</p>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* dark, elevated card — a deliberate accent block rather than a full section
            wash, now doing double duty as the registration-tiers teaser */}
        <Reveal delay={0.15} className="lg:col-span-5">
          <div className="rounded-2xl bg-navy p-6 shadow-xl shadow-navy/10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-orange">Ways to Join</p>
            <p className="mt-1 text-sm font-semibold text-white">Three registration paths into the Summit</p>

            <div className="mt-5 space-y-2.5">
              {REG_TIERS.map((tier) => (
                <div key={tier.label} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange/15 text-orange">
                    <tier.icon size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{tier.label}</p>
                    <p className="text-xs text-slate-400">{tier.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <ButtonLink to="/register" variant="primary" className="!mt-5 !w-full !py-2.5 !text-sm">
              See Registration Options <ArrowRight size={15} className="ml-1" />
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);
