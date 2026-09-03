import {
  User,
  Building2,
  GraduationCap,
  FileCheck2,
  FileText,
  ScrollText,
  BookOpen,
  Handshake,
  Users2,
  Lightbulb,
  Network,
  Target,
} from 'lucide-react';
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

// Verbatim from the Concept Note's "Expected Outcomes" — four categories, each with
// its own sub-bullets, not a single flattened list.
const EXPECTED_OUTCOMES = [
  {
    icon: FileCheck2,
    title: 'Policy Outcomes',
    items: [
      'Draft recommendations for a National AI-in-Health Framework',
      'Policy recommendations for responsible AI governance',
      'Strategic roadmap for AI integration across health systems',
    ],
  },
  {
    icon: Handshake,
    title: 'Partnership Outcomes',
    items: [
      'New public-private partnerships',
      'Memoranda of Understanding (MoUs)',
      'Multi-sector collaboration platforms',
      'Cross-country technical collaborations',
    ],
  },
  {
    icon: Lightbulb,
    title: 'Innovation Outcomes',
    items: [
      'Increased visibility for African AI innovators',
      'Investment opportunities for health tech startups',
      'New research collaborations',
      'Pilot implementation opportunities',
    ],
  },
  {
    icon: Network,
    title: 'Capacity Outcomes',
    items: [
      'Enhanced understanding of responsible AI among policymakers',
      'Increased institutional readiness for AI adoption',
      'Expanded technical networks across sectors',
    ],
  },
];

// Verbatim from the Concept Note's "Knowledge Products" — documented outputs that
// carry Summit outcomes forward into national policy and practice.
const KNOWLEDGE_PRODUCTS = [
  { icon: ScrollText, title: 'Summit Communiqué' },
  { icon: BookOpen, title: 'AI in Health Summit Proceedings' },
  { icon: FileCheck2, title: 'National Policy Brief' },
  { icon: FileText, title: 'Technical Report' },
  { icon: Users2, title: 'Strategic Partnership Directory' },
  { icon: Target, title: 'Action Plan for AI in Health Implementation' },
];

export const ParticipantsOutcomes = () => {
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

    {/* Expected outcomes — the Concept Note's four real categories, each with its
        own sub-bullets, laid out as a 2x2 grid rather than flattened into one list. */}
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">What the Summit Delivers</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Expected Outcomes</h2>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {EXPECTED_OUTCOMES.map((category, i) => (
            <Reveal key={category.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-slate-200 bg-offwhite p-6 sm:p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-orange">
                  <category.icon size={20} />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-navy">{category.title}</h3>
                <ul className="mt-3 space-y-2">
                  {category.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Knowledge Products — the Concept Note's six documented outputs, distinct from
        the outcome categories above: these are the deliverables that carry those
        outcomes forward into national policy and practice after the Summit closes. */}
    <section className="bg-navy py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Documented Outputs</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">Knowledge Products</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">
            Carrying Summit outcomes forward into national policy and practice.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KNOWLEDGE_PRODUCTS.map((product, i) => (
            <Reveal key={product.title} delay={i * 0.06}>
              <div className="flex h-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange/15 text-orange">
                  <product.icon size={19} />
                </span>
                <p className="font-display text-[15px] font-semibold leading-snug text-white">{product.title}</p>
              </div>
            </Reveal>
          ))}
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
