import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  Mic2,
  Users,
  Rocket,
  FileText,
  Handshake,
  Landmark,
  Network,
  Eye,
  Megaphone,
  Link2,
  TrendingUp,
  ArrowRight,
  Shield,
  Database,
  Wifi,
  Coins,
  ShieldAlert,
  Target,
  HeartPulse,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';
import { ButtonLink } from '../../components/ui/Button';
import { AbujaSkyline } from '../../components/ui/AbujaSkyline';
import { VENUE_SHORT } from '../../lib/siteInfo';
import { Reveal } from '../../components/ui/Reveal';
import { RevealText } from '../../components/ui/RevealText';
import heroBg from '../../assets/images/hero_bg.webp';
import homePageBg from '../../assets/images/home_page_bg.webp';
import { SummitAtAGlance } from '../../components/home/SummitAtAGlance';
import { ConfirmedVoices } from '../../components/home/ConfirmedVoices';
import { ConvenedWith } from '../../components/home/ConvenedWith';
import { NewsletterCapture } from '../../components/home/NewsletterCapture';
import { InnovatorsShowcase } from '../../components/home/InnovatorsShowcase';
import { MediaHighlights } from '../../components/home/MediaHighlights';
import { PressQuoteBand } from '../../components/home/PressQuoteBand';
import { FindYourJourney } from '../../components/home/FindYourJourney';
import { AbujaExperience } from '../../components/home/AbujaExperience';
import { HeroCountdown } from '../../components/home/HeroCountdown';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const BARRIERS = [
  { label: 'Limited governance frameworks', icon: Shield },
  { label: 'Inadequate data interoperability', icon: Database },
  { label: 'Shortage of AI-ready health professionals', icon: Users },
  { label: 'Infrastructure constraints', icon: Wifi },
  { label: 'Financing gaps', icon: Coins },
  { label: 'Ethical concerns', icon: ShieldAlert },
  { label: 'Limited multi-sector collaboration', icon: Network },
];

// Not attributed to any named individual — general programme-level examples of the
// kind of AI-in-health deployment already happening, folded into "Why This Summit
// Matters" as supporting proof rather than a section of its own.
const IMPACT_EXAMPLES = [
  { region: 'Northern & South-Western Nigeria', title: 'Edge AI ultrasound catching high-risk pregnancies early in clinics without a resident sonographer.' },
  { region: 'Lagos & Kano State Hubs', title: 'Automated chest X-ray screening flagging likely TB cases in seconds, easing the load on radiology teams.' },
  { region: 'FCT & Niger State Depots', title: 'Predictive inventory forecasting to reduce stockouts of essential antimalarials and pediatric antibiotics.' },
];

const OBJECTIVES = [
  {
    title: 'Build a National AI-in-Health Framework',
    body: 'Help shape a strategic, inclusive national roadmap for AI adoption in healthcare.',
    icon: Target,
  },
  {
    title: 'Advance Universal Health Coverage through AI',
    body: 'Promote AI as a tool to improve access, affordability, and quality of care.',
    icon: HeartPulse,
  },
  {
    title: 'Showcase Innovations That Work',
    body: 'Give innovators a platform to show scalable AI-driven health solutions in action.',
    icon: Lightbulb,
  },
  {
    title: 'Strengthen Policy and Ethical Guidance',
    body: 'Bring people together on the ethics, policy, and rules that keep AI use in health responsible.',
    icon: ShieldCheck,
  },
  {
    title: 'Facilitate Partnerships, Collaboration and Investment',
    body: 'Connect the investors, builders, and institutions working on AI in health.',
    icon: Handshake,
  },
];

const PROGRAMME = [
  { icon: Mic2, title: 'Keynote Addresses', focus: 'National and continental leaders in health, technology, and AI.' },
  { icon: Users, title: 'Panel Discussions', focus: 'AI in Health Policy & Regulation; AI for Resource-Limited Settings.' },
  { icon: Rocket, title: 'Startup Showcase', focus: 'Live demonstrations of AI-driven healthtech solutions.' },
  { icon: FileText, title: 'Poster & Abstract Presentations', focus: 'Peer-reviewed research on AI innovations and pilots.' },
  { icon: Handshake, title: 'Startup Pod & Deal Room', focus: 'Structured investor-startup matchmaking and collaboration.' },
  { icon: Landmark, title: 'Political Engagements', focus: 'Public commitments from government and continental stakeholders.' },
  { icon: Network, title: 'Networking Sessions', focus: 'Facilitated meetings across government, donors, industry, academia.' },
];

const WHY_PARTNER = [
  { icon: Eye, label: 'Visibility & Positioning', body: 'Establish your organization’s brand as an AI-in-health leader.' },
  { icon: Megaphone, label: 'Influence', body: 'Help shape AI policy across Nigeria and the wider African continent.' },
  { icon: Link2, label: 'Access', body: 'Connect directly with key government, investor, and innovation stakeholders.' },
  { icon: TrendingUp, label: 'Impact', body: 'Contribute measurably to health coverage and system efficiency.' },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: [0.21, 0.47, 0.32, 0.98] as const },
  }),
};

export const Home = () => {
  useDocumentTitle('Abuja, Nigeria');

  return (
  <>
    {/* Hero — full-bleed photo panel with all content centered on top.
        Capped to one viewport at lg+ so the whole thing is visible with no scroll —
        every size/gap below is deliberately tight to make that fit.
        Video-ready: once real event/Abuja footage exists, this <img> becomes a muted
        autoplay <video> with the same absolute-fill treatment — no other markup here
        needs to change. No stock "conference crowd" footage in the meantime; a static
        photo of the real skyline is more honest than a generic loop. */}
    <section className="relative isolate overflow-hidden bg-navy lg:h-[calc(100vh-4rem)] lg:max-h-[620px] lg:min-h-[520px]">
      <img src={heroBg} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-navy/95 via-navy/85 to-[#3a2415]/80" />
      <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-4 -top-8 h-56 w-56 rounded-full border border-orange/20" />
      <div className="pointer-events-none absolute right-20 top-32 h-40 w-40 rounded-full bg-orange/20 blur-[80px]" />

      <div className="relative mx-auto flex flex-col items-center gap-4 px-4 py-8 text-center sm:px-6 lg:h-full lg:max-w-3xl lg:justify-center lg:gap-4 lg:py-6">
        <motion.div initial="hidden" animate="show">
          <motion.span
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-orange/40 bg-orange/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-orange"
          >
            19&ndash;20 October 2026 &middot; Abuja, Nigeria
          </motion.span>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="mx-auto mt-3.5 max-w-2xl font-mono text-xl font-semibold leading-[1.3] tracking-normal text-white sm:text-2xl lg:text-[1.75rem] xl:text-[2rem]"
          >
            Building Nigeria&rsquo;s National{' '}
            <span className="text-orange">AI-in-Health</span> Framework
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} className="mx-auto mt-3.5 max-w-lg text-[13px] leading-relaxed text-slate-300 lg:text-sm">
            Nigeria&rsquo;s premier platform for AI-enabled healthcare, convening national and international
            leaders to build practical pathways for responsible AI adoption across health systems.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink to="/register" variant="primary" className="!px-5 !py-2.5 !text-[13px]">
              Register Interest
            </ButtonLink>
            <ButtonLink to="/partners" variant="secondary" className="!px-5 !py-2.5 !text-[13px]">
              Become a Partner
            </ButtonLink>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
        >
          <HeroCountdown />
        </motion.div>
      </div>
    </section>

    <ConfirmedVoices />

    <NewsletterCapture
      photo={homePageBg}
      eyebrow="Stay Informed"
      title="Get Summit Updates & Policy Briefings"
      body="Be first to hear about confirmed speakers, agenda releases, and policy briefings ahead of Abuja."
      cta="Sign Up"
      source="updates"
      successMessage="You're subscribed. Watch your inbox for updates."
    />

    <ConvenedWith />

    <SummitAtAGlance />

    {/* Summit Goal — full-width statement band, no card. Atmosphere + a word-by-word
        reveal carry this instead of a layout trick, so it doesn't echo the asymmetric
        split used in "Why This Summit Matters" right below it. */}
    <section className="relative overflow-hidden bg-offwhite py-28">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{ backgroundImage: 'radial-gradient(circle, #0F172A 1px, transparent 1px)', backgroundSize: '28px 28px', maskImage: 'radial-gradient(ellipse at center, black, transparent 70%)' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange/10 blur-[130px]"
      />

      <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal y={14}>
          <span aria-hidden="true" className="font-display text-[5.5rem] leading-none text-orange/20">
            &ldquo;
          </span>
        </Reveal>
        <Reveal y={14} delay={0.05} className="-mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange">Summit Goal</p>
        </Reveal>

        <RevealText
          text="To bring Nigeria and its neighbors together around a shared, practical path to responsible AI in health, backed by real policy, funding, and systems to make it last."
          className="mt-7 font-extralight font-serif text-xl italic leading-relaxed text-navy sm:text-2xl lg:text-[1.7rem] space-x-2"
        />

        <Reveal delay={0.3} className="mx-auto mt-9 h-px w-16 bg-orange/50" />
      </div>
    </section>

    {/* Why This Summit Matters — asymmetric 7/5 split */}
    <section className="relative overflow-hidden bg-white py-24">
      <div className="pointer-events-none absolute -left-40 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-orange/[0.04] blur-[120px]" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <Reveal className="lg:col-span-7">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-orange" />
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Strategic Mandate</p>
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold text-navy sm:text-3xl">Why This Summit Matters</h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-600 text-justify">
            AI is already changing how healthcare gets delivered worldwide: more accurate diagnostics, earlier
            disease detection, personalized treatment, and health systems that run more efficiently on better
            information. As countries push digital transformation forward, AI has become a real lever for
            strengthening health systems and advancing{' '}
            <strong className="font-semibold text-navy">Universal Health Coverage (UHC)</strong>.
          </p>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-600 text-justify">
            Nigeria has already shown real commitment here, through its{' '}
            <strong className="font-semibold text-navy">National Artificial Intelligence Strategy</strong>,
            investment in digital public infrastructure, and health information systems modernization. That gives
            the country a genuine opening to lead the continent on responsible AI for health.
          </p>
          <Link
            to="/about"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-orange transition-colors hover:text-orange-hover"
          >
            Read Full Background & Positioning <ArrowRight size={15} />
          </Link>
        </Reveal>

        <Reveal delay={0.12} className="lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-offwhite p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-navy">Key Barriers to Scale</p>
              <span className="rounded-full bg-navy/5 px-2.5 py-1 text-[10px] font-bold text-navy">
                {BARRIERS.length}
              </span>
            </div>
            <ul className="mt-4 space-y-1.5">
              {BARRIERS.map((barrier, i) => (
                <Reveal key={barrier.label} delay={0.12 + i * 0.05}>
                  <li className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-600 transition-colors hover:bg-white">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-orange shadow-sm shadow-navy/5 transition-colors group-hover:bg-orange group-hover:text-white">
                      <barrier.icon size={15} />
                    </span>
                    {barrier.label}
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      {/* compact proof strip — folded into this section rather than standing alone */}
      <div className="relative mx-auto mt-16 max-w-6xl border-t border-slate-200 px-4 pt-10 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Already in Practice</p>
        </Reveal>
        <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-3">
          {IMPACT_EXAMPLES.map((example, i) => (
            <Reveal key={example.region} delay={0.08 + i * 0.06} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{example.region}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{example.title}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Summit Objectives — asymmetric bento grid: one featured pillar carries the
        visual weight, the other four sit around it at a smaller scale. Deliberately
        not five identical cards in a row — that's the "AI template" tell this is
        fixing. */}
    <section className="bg-offwhite py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Five Foundational Pillars</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Summit Objectives</h2>
          </div>
          <p className="max-w-sm text-sm text-slate-500">
            The framework guiding every plenary session, working group, and bilateral room in Abuja.
          </p>
        </Reveal>

        <div className="mt-10 flex flex-col gap-4 lg:grid lg:grid-cols-6">
          {/* featured pillar — dark, oversized, giant faint numeral */}
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
                  <Target size={20} />
                </span>
                <p className="mt-6 text-[11px] font-bold uppercase tracking-widest text-orange">Primary Pillar</p>
                <h3 className="mt-2 max-w-sm font-display text-2xl font-semibold text-white">
                  {OBJECTIVES[0].title}
                </h3>
                <p className="mt-3 max-w-sm text-slate-300">{OBJECTIVES[0].body}</p>
              </div>
            </div>
          </Reveal>

          {/* two stacked satellite cards */}
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

          {/* bottom row — two wider cards */}
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

    {/* Programme Structure preview — compact two-column icon list */}
    <section className="relative overflow-hidden bg-white py-24">
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[26rem] w-[26rem] rounded-full bg-navy/[0.03] blur-[120px]" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Multi-Track Format</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Programme Structure</h2>
            <p className="mt-2 max-w-xl text-slate-600">
              A two-day programme mixing real policy dialogue with deal-making and hands-on sessions.
            </p>
          </div>
          <Link
            to="/agenda"
            className="group inline-flex items-center gap-1.5 font-semibold text-orange hover:text-orange-hover"
          >
            View Full Agenda
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <div className="mt-10 grid gap-x-10 gap-y-2 sm:grid-cols-2">
          {PROGRAMME.map(({ icon: Icon, title, focus }, i) => (
            <Reveal key={title} delay={i * 0.05}>
              <div className="group flex items-start gap-4 rounded-xl border-b border-slate-100 px-3 py-5 transition-colors hover:bg-offwhite">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-secondary text-orange transition-colors duration-300 group-hover:bg-orange group-hover:text-white">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="flex items-center gap-2 font-semibold text-navy">
                    {title}
                    <span className="text-[10px] font-medium text-slate-400">0{i + 1}</span>
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">{focus}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <FindYourJourney />

    <InnovatorsShowcase />

    <MediaHighlights />

    <PressQuoteBand />

    {/* Why Partner — full cards with real copy, plus a CTA through to the tiers page */}
    <section className="relative overflow-hidden bg-white py-24">
      <div className="pointer-events-none absolute -right-32 top-0 h-80 w-80 rounded-full bg-orange/[0.05] blur-[110px]" />

      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Value Proposition</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Why Partner With the Summit</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Engage directly with the decision-makers defining Africa&rsquo;s national AI-in-health frameworks.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-4">
          {WHY_PARTNER.map(({ icon: Icon, label, body }, i) => (
            <Reveal key={label} delay={i * 0.07}>
              <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-orange/40 hover:shadow-lg hover:shadow-navy/5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-offwhite text-orange transition-colors group-hover:bg-orange group-hover:text-white">
                  <Icon size={20} />
                </span>
                <p className="mt-4 font-display text-base font-semibold text-navy">{label}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2} className="mt-10">
          <ButtonLink to="/partners" variant="primary">
            Explore Partnership Tiers <ArrowRight size={16} className="ml-1.5" />
          </ButtonLink>
        </Reveal>
      </div>
    </section>

    <AbujaExperience />

    {/* Closing CTA */}
    <section className="relative overflow-hidden bg-gradient-to-br from-orange to-orange-hover py-24">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{ backgroundImage: 'radial-gradient(circle, #0F172A 1px, transparent 1px)', backgroundSize: '26px 26px' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-[100px]"
      />
      <AbujaSkyline tone="onLight" className="pointer-events-none absolute bottom-0 left-0 h-24 w-full" opacity={0.15} />

      <Reveal className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white">
          Join Africa&rsquo;s Health AI Leadership
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold text-white sm:text-3xl">
          Be Part of Nigeria&rsquo;s AI-in-Health Moment
        </h2>
        <p className="mt-4 text-white/90">Join policymakers, innovators, and investors shaping the future of AI in African healthcare.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink to="/register" variant="secondary" className="!bg-navy !border-navy">
            Register Interest
          </ButtonLink>
          <ButtonLink to="/partners" variant="secondary" className="!bg-white/10 !border-white/40">
            Partner With Us
          </ButtonLink>
        </div>
        <p className="mt-8 text-xs font-medium text-white/70">
          19&ndash;20 October 2026 &middot; {VENUE_SHORT}, Nigeria
        </p>
      </Reveal>
    </section>
  </>
  );
};
