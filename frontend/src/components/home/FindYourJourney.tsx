import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Stethoscope, Landmark, Rocket, TrendingUp, ArrowRight } from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { Reveal } from '../ui/Reveal';

// Audience tabs map directly onto the real Session.track values from the platform's
// data model (Policy & Governance / Clinical AI & Diagnostics / Infrastructure & Data /
// Venture & Investment) rather than inventing a separate taxonomy just for this widget.
const JOURNEYS = [
  {
    key: 'clinical',
    label: 'Doctors & Clinical Teams',
    icon: Stethoscope,
    track: 'Clinical AI & Diagnostics',
    headline: 'Validated clinical AI, built for African hospital workflows.',
    description:
      'Sessions on point-of-care diagnostics, workforce-readiness, and AI tools already running in African clinical settings.',
    gains: [
      'Clinical AI case studies from frontline practitioners',
      'Live demonstrations of diagnostic and triage tools',
      'Direct dialogue with peers deploying AI in resource-limited settings',
    ],
  },
  {
    key: 'policy',
    label: 'Policymakers & Regulators',
    icon: Landmark,
    track: 'Policy & Governance',
    headline: 'Shape the national framework, not just react to it.',
    description:
      'The governance, ethics, and regulatory track building toward a coordinated national AI-in-health roadmap.',
    gains: [
      'A seat in the policy and ethical-guidance working sessions',
      'Direct engagement with government, WHO, and multilateral partners',
      'Input into the Summit Communiqué and National Policy Brief',
    ],
  },
  {
    key: 'founders',
    label: 'Healthtech Founders & Builders',
    icon: Rocket,
    track: 'Infrastructure & Data',
    headline: 'Showcase what you’ve built to the people who can scale it.',
    description:
      'The startup showcase and infrastructure track — for teams solving data interoperability, access, and delivery at scale.',
    gains: [
      'A slot in the Startup Showcase or Poster & Abstract sessions',
      'Structured time in the Startup Pod & Deal Room',
      'Visibility with government, investor, and institutional stakeholders',
    ],
  },
  {
    key: 'investors',
    label: 'Investors & Development Partners',
    icon: TrendingUp,
    track: 'Venture & Investment',
    headline: 'Source Africa’s next wave of health AI investment.',
    description:
      'Curated access to vetted AI-in-health ventures, alongside the policy context that shapes where capital should move next.',
    gains: [
      'Structured matchmaking with vetted African health-tech startups',
      'Policy and regulatory context that de-risks investment decisions',
      'Direct relationships with government and multilateral co-investors',
    ],
  },
] as const;

export const FindYourJourney = () => {
  const [activeKey, setActiveKey] = useState<(typeof JOURNEYS)[number]['key']>('clinical');
  const active = JOURNEYS.find((j) => j.key === activeKey)!;

  return (
    <section className="bg-offwhite py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Interactive</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Find Your Summit Journey</h2>
          <p className="mt-2 max-w-xl text-slate-600">
            Select where you fit to see the track, sessions, and outcomes most relevant to you.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-2.5">
          {JOURNEYS.map((j) => {
            const isActive = j.key === activeKey;
            return (
              <button
                key={j.key}
                onClick={() => setActiveKey(j.key)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'border-orange bg-orange text-white shadow-md shadow-orange/25'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-orange/40'
                }`}
              >
                <j.icon size={16} />
                {j.label}
              </button>
            );
          })}
        </Reveal>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="mt-8 grid gap-8 rounded-2xl border border-slate-200 bg-white p-8 lg:grid-cols-12"
          >
            <div className="lg:col-span-7">
              <span className="inline-block rounded-full bg-navy-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange">
                {active.track}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-navy sm:text-2xl">{active.headline}</h3>
              <p className="mt-3 text-slate-600">{active.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink to="/agenda" variant="primary">
                  View This Track <ArrowRight size={16} className="ml-1" />
                </ButtonLink>
                <ButtonLink to="/register" variant="secondary" className="!border-slate-300 !bg-transparent !text-navy">
                  Register Interest
                </ButtonLink>
              </div>
            </div>

            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">What you&rsquo;ll gain in Abuja</p>
              <ul className="mt-4 space-y-3">
                {active.gains.map((gain) => (
                  <li key={gain} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
                    {gain}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
