import { Target, Compass, CalendarDays, MapPin, HeartPulse, Lightbulb, ShieldCheck, Handshake } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { RevealText } from '../../components/ui/RevealText';
import { ButtonLink } from '../../components/ui/Button';

const OBJECTIVES = [
  {
    title: 'Catalyze a National AI-in-Health Framework',
    body: 'Facilitate strategic, inclusive national roadmaps for AI adoption in healthcare.',
    icon: Target,
  },
  {
    title: 'Advance Universal Health Coverage through AI',
    body: 'Promote AI as a tool to improve access, affordability, and quality of care.',
    icon: HeartPulse,
  },
  {
    title: 'Share Innovations and Best Practices',
    body: 'Provide a platform for innovators to showcase scalable AI-driven health solutions.',
    icon: Lightbulb,
  },
  {
    title: 'Strengthen Policy and Ethical Guidance',
    body: 'Foster dialogue on ethical, policy, and regulatory frameworks for responsible AI use.',
    icon: ShieldCheck,
  },
  {
    title: 'Facilitate Partnerships, Collaboration and Investment',
    body: 'Drive investment and ecosystem-building across the AI-in-health landscape.',
    icon: Handshake,
  },
];

const KEY_FACTS = [
  { icon: CalendarDays, label: 'Dates', value: '19–20 October 2026' },
  { icon: MapPin, label: 'Venue', value: 'International Conference Centre (ICC), Abuja' },
  { icon: Target, label: 'Format', value: 'Two-day hybrid summit — in-person + livestreamed sessions' },
  { icon: Compass, label: 'Convener', value: 'Africa Hub for Innovation & Development (AHFID)' },
];

export const About = () => {
  const featuredObjective = OBJECTIVES[0];

  return (
  <>
    <PageHero
      eyebrow="About the Summit"
      title="Nigeria&rsquo;s Premier Platform for AI-Enabled Healthcare"
      subtitle="A two-day national convening built to turn AI ambition into a coordinated, actionable framework for health systems across Nigeria and the continent."
    />

    {/* Key facts strip */}
    <section className="border-b border-slate-100 bg-white py-14">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {KEY_FACTS.map((fact, i) => (
          <Reveal key={fact.label} delay={i * 0.06} className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-secondary text-orange">
              <fact.icon size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{fact.label}</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-navy">{fact.value}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>

    {/* Context / narrative */}
    <section className="bg-offwhite py-24">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <Reveal className="lg:col-span-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">The Context</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">
            Why Now, Why Nigeria
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            AI is rapidly transforming healthcare delivery worldwide &mdash; enabling more accurate diagnostics,
            predictive disease surveillance, personalized treatment, operational efficiency, workforce
            optimization, and evidence-informed policymaking. As countries accelerate digital transformation, AI
            has emerged as a strategic enabler for strengthening health systems and advancing Universal Health
            Coverage (UHC).
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            Nigeria has demonstrated significant commitment through its National Artificial Intelligence Strategy,
            investments in digital public infrastructure, and health information systems modernization &mdash;
            presenting a unique opportunity to position the country as a continental leader in responsible AI for
            health. The AI in Health Summit 2026 is designed to convert that momentum into a concrete, coordinated
            national framework.
          </p>
        </Reveal>

        <Reveal delay={0.12} className="lg:col-span-5">
          <div className="rounded-2xl bg-navy p-7">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-orange">Format at a Glance</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
                Keynotes, panels, and political engagements on Day 1
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
                Startup Showcase, Deal Room, and technical tracks on Day 2
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
                Outputs: a Summit Communiqu&eacute; and National Policy Brief
              </li>
            </ul>
            <ButtonLink to="/agenda" variant="primary" className="!mt-6 !w-full !py-2.5 !text-sm">
              View the Full Agenda
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>

    {/* Summit Goal */}
    <section className="relative overflow-hidden bg-white py-24">
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal y={14}>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange">Summit Goal</p>
        </Reveal>
        <RevealText
          text="To catalyze a coordinated national and regional ecosystem that accelerates the responsible adoption, governance, financing, and implementation of Artificial Intelligence for stronger, more resilient, equitable, and future-ready health systems."
          className="mt-7 font-display text-xl italic leading-relaxed text-navy sm:text-2xl lg:text-[1.7rem]"
        />
      </div>
    </section>

    {/* Objectives — same asymmetric bento treatment as the Home preview, so the full
        version reads as a match rather than a stale duplicate. */}
    <section className="bg-offwhite py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Five Foundational Pillars</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Summit Objectives</h2>
        </Reveal>

        <div className="mt-10 flex flex-col gap-4 lg:grid lg:grid-cols-6">
          <Reveal className="lg:col-span-4">
            <div className="group relative h-full overflow-hidden rounded-2xl bg-navy p-8">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-4 -top-8 font-display text-[9rem] font-bold leading-none text-white/[0.04] transition-transform duration-500 group-hover:scale-110"
              >
                01
              </span>
              <div className="relative">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange text-white shadow-md shadow-orange/30">
                  <featuredObjective.icon size={20} />
                </span>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-orange">Primary Pillar</p>
                <h3 className="mt-2 max-w-sm font-display text-2xl font-semibold text-white">{featuredObjective.title}</h3>
                <p className="mt-3 max-w-sm text-slate-300">{featuredObjective.body}</p>
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col gap-4 lg:col-span-2">
            {OBJECTIVES.slice(1, 3).map((obj, i) => (
              <Reveal key={obj.title} delay={0.1 + i * 0.08} className="flex-1">
                <div className="group h-full rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-offwhite text-orange transition-colors group-hover:bg-orange group-hover:text-white">
                      <obj.icon size={16} />
                    </span>
                    <span className="text-[10px] font-bold text-slate-300">0{i + 2}</span>
                  </div>
                  <h3 className="mt-3 font-display text-[15px] font-semibold leading-snug text-navy">{obj.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{obj.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {OBJECTIVES.slice(3, 5).map((obj, i) => (
            <Reveal key={obj.title} delay={0.26 + i * 0.08} className="lg:col-span-3">
              <div className="group flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-orange/40 hover:shadow-md">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-offwhite text-orange transition-colors group-hover:bg-orange group-hover:text-white">
                  <obj.icon size={17} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pillar 0{i + 4}</p>
                  <h3 className="mt-1 font-display text-[15px] font-semibold leading-snug text-navy">{obj.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{obj.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Closing CTA */}
    <section className="relative overflow-hidden bg-gradient-to-br from-orange to-orange-hover py-20">
      <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">Ready to Be Part of It?</h2>
        <p className="mt-4 text-white/90">Explore the agenda, meet the partners, or register your interest today.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink to="/register" variant="secondary" className="!bg-navy !border-navy">
            Register Interest
          </ButtonLink>
          <ButtonLink to="/agenda" variant="secondary" className="!bg-white/10 !border-white/40">
            View Agenda
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  </>
  );
};
