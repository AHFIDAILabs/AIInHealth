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
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';

export const ParticipantsOutcomes = () => {
  const { t } = useTranslation();

  // Built inside the component (not module constants) so `label`/`note`/`title`/
  // `text` can go through t() — `id` fields are the stable, untranslated
  // identifiers the `key` props below actually compare against.
  const WHO_ATTENDS = [
    {
      id: 'individual',
      icon: User,
      label: t('participantsOutcomes.whoAttends.individual.label', 'Individual Delegates'),
      note: t('participantsOutcomes.whoAttends.individual.note', 'Clinicians, researchers, and health professionals, with full two-day access.'),
    },
    {
      id: 'organizations',
      icon: Building2,
      label: t('participantsOutcomes.whoAttends.organizations.label', 'Organizations'),
      note: t('participantsOutcomes.whoAttends.organizations.note', 'Government agencies, companies, and institutions registering team seats.'),
    },
    {
      id: 'students',
      icon: GraduationCap,
      label: t('participantsOutcomes.whoAttends.students.label', 'Students & Early-Career Researchers'),
      note: t('participantsOutcomes.whoAttends.students.note', 'Reduced-rate access for the next generation of AI-in-health talent.'),
    },
  ];

  // Stat figures ('500+' etc.) stay as plain numerals outside t(); the labels/notes
  // around them are translated.
  const STATS = [
    {
      id: 'delegates',
      value: '500+',
      label: t('participantsOutcomes.stats.delegates.label', 'Delegates'),
      note: t('participantsOutcomes.stats.delegates.note', 'Ministers, clinicians, founders & investors'),
    },
    {
      id: 'nations',
      value: '45+',
      label: t('participantsOutcomes.stats.nations.label', 'African Nations'),
      note: t('participantsOutcomes.stats.nations.note', 'Continental policy & research alignment'),
    },
    {
      id: 'solutions',
      value: '50+',
      label: t('participantsOutcomes.stats.solutions.label', 'AI Solutions Showcased'),
      note: t('participantsOutcomes.stats.solutions.note', 'Clinical, diagnostic & operational tools'),
    },
    {
      id: 'sessions',
      value: '20+',
      label: t('participantsOutcomes.stats.sessions.label', 'Sessions'),
      note: t('participantsOutcomes.stats.sessions.note', 'Across two days of programming'),
    },
  ];

  // Verbatim from the Concept Note's "Expected Outcomes" — four categories, each with
  // its own sub-bullets, not a single flattened list. Each bullet carries a stable
  // `id` (used for `key`) alongside its translated `text` (used for display).
  const EXPECTED_OUTCOMES = [
    {
      id: 'policy',
      icon: FileCheck2,
      title: t('participantsOutcomes.outcomes.policy.title', 'Policy Outcomes'),
      items: [
        { id: 'framework', text: t('participantsOutcomes.outcomes.policy.item1', 'Draft recommendations for a National AI-in-Health Framework') },
        { id: 'governance', text: t('participantsOutcomes.outcomes.policy.item2', 'Policy recommendations for responsible AI governance') },
        { id: 'roadmap', text: t('participantsOutcomes.outcomes.policy.item3', 'Strategic roadmap for AI integration across health systems') },
      ],
    },
    {
      id: 'partnership',
      icon: Handshake,
      title: t('participantsOutcomes.outcomes.partnership.title', 'Partnership Outcomes'),
      items: [
        { id: 'ppp', text: t('participantsOutcomes.outcomes.partnership.item1', 'New public-private partnerships') },
        { id: 'mou', text: t('participantsOutcomes.outcomes.partnership.item2', 'Memoranda of Understanding (MoUs)') },
        { id: 'platforms', text: t('participantsOutcomes.outcomes.partnership.item3', 'Multi-sector collaboration platforms') },
        { id: 'crossCountry', text: t('participantsOutcomes.outcomes.partnership.item4', 'Cross-country technical collaborations') },
      ],
    },
    {
      id: 'innovation',
      icon: Lightbulb,
      title: t('participantsOutcomes.outcomes.innovation.title', 'Innovation Outcomes'),
      items: [
        { id: 'visibility', text: t('participantsOutcomes.outcomes.innovation.item1', 'Increased visibility for African AI innovators') },
        { id: 'investment', text: t('participantsOutcomes.outcomes.innovation.item2', 'Investment opportunities for health tech startups') },
        { id: 'research', text: t('participantsOutcomes.outcomes.innovation.item3', 'New research collaborations') },
        { id: 'pilots', text: t('participantsOutcomes.outcomes.innovation.item4', 'Pilot implementation opportunities') },
      ],
    },
    {
      id: 'capacity',
      icon: Network,
      title: t('participantsOutcomes.outcomes.capacity.title', 'Capacity Outcomes'),
      items: [
        { id: 'understanding', text: t('participantsOutcomes.outcomes.capacity.item1', 'Enhanced understanding of responsible AI among policymakers') },
        { id: 'readiness', text: t('participantsOutcomes.outcomes.capacity.item2', 'Increased institutional readiness for AI adoption') },
        { id: 'networks', text: t('participantsOutcomes.outcomes.capacity.item3', 'Expanded technical networks across sectors') },
      ],
    },
  ];

  // Verbatim from the Concept Note's "Knowledge Products" — documented outputs that
  // carry Summit outcomes forward into national policy and practice.
  const KNOWLEDGE_PRODUCTS = [
    { id: 'communique', icon: ScrollText, title: t('participantsOutcomes.knowledgeProducts.communique', 'Summit Communiqué') },
    { id: 'proceedings', icon: BookOpen, title: t('participantsOutcomes.knowledgeProducts.proceedings', 'AI in Health Summit Proceedings') },
    { id: 'policyBrief', icon: FileCheck2, title: t('participantsOutcomes.knowledgeProducts.policyBrief', 'National Policy Brief') },
    { id: 'technicalReport', icon: FileText, title: t('participantsOutcomes.knowledgeProducts.technicalReport', 'Technical Report') },
    { id: 'partnershipDirectory', icon: Users2, title: t('participantsOutcomes.knowledgeProducts.partnershipDirectory', 'Strategic Partnership Directory') },
    { id: 'actionPlan', icon: Target, title: t('participantsOutcomes.knowledgeProducts.actionPlan', 'Action Plan for AI in Health Implementation') },
  ];

  return (
  <>
    <PageHero
      eyebrow={t('participantsOutcomes.hero.eyebrow', 'Participants & Outcomes')}
      title={t('participantsOutcomes.hero.title', 'Who Attends, and What the Summit Delivers')}
      subtitle={t(
        'participantsOutcomes.hero.subtitle',
        'From ministers and clinicians to founders and investors, all convened around outcomes designed to outlast the two days on the calendar.'
      )}
    />

    {/* Projected impact stats */}
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-orange">{t('participantsOutcomes.stats.eyebrow', 'Projected Impact')}</p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.id} delay={i * 0.06} className="text-center">
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
          <h2 className="font-display text-2xl font-semibold text-navy sm:text-3xl">{t('participantsOutcomes.whoAttends.heading', 'Who Attends')}</h2>
          <p className="mt-2 max-w-xl text-slate-600">{t('participantsOutcomes.whoAttends.subtitle', 'Three registration paths, one shared agenda.')}</p>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {WHO_ATTENDS.map((w, i) => (
            <Reveal key={w.id} delay={i * 0.07}>
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
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">{t('participantsOutcomes.outcomes.eyebrow', 'What the Summit Delivers')}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">{t('participantsOutcomes.outcomes.heading', 'Expected Outcomes')}</h2>
        </Reveal>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {EXPECTED_OUTCOMES.map((category, i) => (
            <Reveal key={category.id} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-slate-200 bg-offwhite p-6 sm:p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-orange">
                  <category.icon size={20} />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-navy">{category.title}</h3>
                <ul className="mt-3 space-y-2">
                  {category.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
                      {item.text}
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
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">{t('participantsOutcomes.knowledgeProducts.eyebrow', 'Documented Outputs')}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">{t('participantsOutcomes.knowledgeProducts.heading', 'Knowledge Products')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">
            {t('participantsOutcomes.knowledgeProducts.subtitle', 'Carrying Summit outcomes forward into national policy and practice.')}
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {KNOWLEDGE_PRODUCTS.map((product, i) => (
            <Reveal key={product.id} delay={i * 0.06}>
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
        <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">{t('participantsOutcomes.cta.heading', 'Find Your Registration Path')}</h2>
        <p className="mt-4 text-white/90">{t('participantsOutcomes.cta.body', 'Individual, organization, or student: see which category fits you.')}</p>
        <ButtonLink to="/register" variant="secondary" className="!mt-8 !bg-navy !border-navy">
          {t('participantsOutcomes.cta.registerInterest', 'Register Interest')}
        </ButtonLink>
      </Reveal>
    </section>
  </>
  );
};
