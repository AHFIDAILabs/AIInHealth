import { User, Building2, GraduationCap, FileCheck2, ScrollText, Handshake, Users2 } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';

const WHO_ATTENDS = [
  { icon: User, label: 'Individual Delegates', note: 'Clinicians, researchers, and health professionals — full two-day access.' },
  { icon: Building2, label: 'Organizations', note: 'Government agencies, companies, and institutions registering team seats.' },
  { icon: GraduationCap, label: 'Students & Early-Career Researchers', note: 'Reduced-rate access for the next generation of AI-in-health talent.' },
];

const STATS = [
  { value: '500+', label: 'Delegates', note: 'Ministers, clinicians, founders & investors' },
  { value: '45+', label: 'African Nations', note: 'Continental policy & research alignment' },
  { value: '50+', label: 'AI Solutions Showcased', note: 'Clinical, diagnostic & operational tools' },
  { value: '20+', label: 'Sessions', note: 'Across two days of programming' },
];

const OUTCOMES = [
  {
    icon: ScrollText,
    title: 'Summit Communiqué',
    body: 'A jointly-endorsed statement capturing the Summit’s consensus on priorities for AI adoption across Nigerian and African health systems.',
  },
  {
    icon: FileCheck2,
    title: 'National Policy Brief',
    body: 'A concrete policy document feeding directly into Nigeria’s national AI-in-health framework and regulatory roadmap.',
  },
  {
    icon: Handshake,
    title: 'Deal Room Commitments',
    body: 'Structured investor-startup matchmaking outcomes — partnerships, pilots, and funding commitments made during the Summit.',
  },
  {
    icon: Users2,
    title: 'Cross-Sector Network',
    body: 'A standing network of government, clinical, industry, and donor stakeholders to sustain momentum after the Summit closes.',
  },
];

export const ParticipantsOutcomes = () => {
  const headlineOutcome = OUTCOMES[0];

  return (
  <>
    <PageHero
      eyebrow="Participants & Outcomes"
      title="Who Attends, and What the Summit Delivers"
      subtitle="From ministers and clinicians to founders and investors — convened around outcomes designed to outlast the two days on the calendar."
    />

    {/* Projected impact stats */}
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-orange">Projected Impact</p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.06} className="text-center">
              <p className="font-display text-4xl font-bold text-navy">{stat.value}</p>
              <p className="mt-2 text-sm font-semibold text-navy">{stat.label}</p>
              <p className="mt-1 text-xs leading-snug text-slate-500">{stat.note}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Who attends */}
    <section className="bg-offwhite py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold text-navy sm:text-3xl">Who Attends</h2>
          <p className="mt-2 max-w-xl text-slate-600">Three registration paths, one shared agenda.</p>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {WHO_ATTENDS.map((w, i) => (
            <Reveal key={w.label} delay={i * 0.07}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-secondary text-orange">
                  <w.icon size={20} />
                </span>
                <p className="mt-4 font-semibold text-navy">{w.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{w.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Expected outcomes — one featured outcome up top (full-width), three supporting
        outcomes below. Deliberately a different bento shape than the Objectives grid
        elsewhere on the site, since this is a 4-item set, not 5. */}
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">What the Summit Delivers</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Expected Outcomes</h2>
        </Reveal>

        <div className="mt-10 space-y-4">
          <Reveal>
            <div className="group relative overflow-hidden rounded-2xl bg-navy p-8 sm:p-10">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-6 -top-10 font-display text-[10rem] font-bold leading-none text-white/[0.04] transition-transform duration-500 group-hover:scale-110"
              >
                01
              </span>
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-orange text-white shadow-md shadow-orange/30">
                  <headlineOutcome.icon size={24} />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-orange">Headline Outcome</p>
                  <h3 className="mt-1.5 font-display text-xl font-semibold text-white sm:text-2xl">{headlineOutcome.title}</h3>
                  <p className="mt-2 max-w-2xl text-slate-300">{headlineOutcome.body}</p>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-3">
            {OUTCOMES.slice(1).map((o, i) => (
              <Reveal key={o.title} delay={0.1 + i * 0.08}>
                <div className="group h-full rounded-2xl border border-slate-200 bg-offwhite p-6 transition-all hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-md">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-orange shadow-sm shadow-navy/5 transition-colors group-hover:bg-orange group-hover:text-white">
                    <o.icon size={18} />
                  </span>
                  <p className="mt-4 font-display text-base font-semibold text-navy">{o.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{o.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="relative overflow-hidden bg-gradient-to-br from-orange to-orange-hover py-20">
      <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">Find Your Registration Path</h2>
        <p className="mt-4 text-white/90">Individual, organization, or student — see which category fits you.</p>
        <ButtonLink to="/register" variant="secondary" className="!mt-8 !bg-navy !border-navy">
          Register Interest
        </ButtonLink>
      </Reveal>
    </section>
  </>
  );
};
