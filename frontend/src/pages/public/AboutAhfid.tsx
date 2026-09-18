import { Target, Eye, HeartHandshake, Lightbulb, ShieldCheck, Users } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { AhfidLockup } from '../../components/ui/AhfidBadge';
import { ButtonLink } from '../../components/ui/Button';

const PILLARS = [
  {
    icon: Lightbulb,
    title: 'Innovation',
    body: 'Backing practical innovation that actually works within the real constraints of African health systems.',
  },
  {
    icon: ShieldCheck,
    title: 'Responsible Governance',
    body: 'Pushing for the policy and regulatory guardrails that keep new technology accountable and safe.',
  },
  {
    icon: Users,
    title: 'Multi-Sector Collaboration',
    body: 'Bringing government, academia, industry, and development partners to the same table for coordinated action.',
  },
  {
    icon: HeartHandshake,
    title: 'Equity',
    body: 'Ensuring innovation reaches resource-limited settings and underserved populations first, not last.',
  },
];

export const AboutAhfid = () => (
  <>
    <PageHero eyebrow="About the Convener" title="Africa Hub for Innovation & Development">
      <AhfidLockup className="justify-center" />
    </PageHero>

    <section className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Who We Are</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">
            Bringing Africa&rsquo;s Health Innovators Together
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            The Africa Hub for Innovation & Development (AHFID) works across health, technology, and policy,
            building platforms where governments, innovators, researchers, and investors can align around a
            shared agenda for stronger, more resilient health systems. The AI in Health Summit 2026 is
            AHFID&rsquo;s flagship national convening on artificial intelligence in healthcare.
          </p>
        </Reveal>
      </div>
    </section>

    <section className="bg-offwhite py-24">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
        <Reveal>
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-secondary text-orange">
              <Target size={20} />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-navy">Our Mission</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              To accelerate the responsible adoption of innovation, including artificial intelligence, across
              African health systems, through coordinated policy, partnership, and platform-building.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="h-full rounded-2xl border border-slate-200 bg-white p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-secondary text-orange">
              <Eye size={20} />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-navy">Our Vision</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              A future where every African health system has the governance, infrastructure, and workforce it needs
              to safely and equitably benefit from emerging technology.
            </p>
          </div>
        </Reveal>
      </div>
    </section>

    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-center font-display text-2xl font-semibold text-navy sm:text-3xl">What Guides Us</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.07} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-offwhite shadow-sm shadow-navy/5">
                <p.icon size={22} className="text-orange" />
              </span>
              <p className="mt-4 font-semibold text-navy">{p.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <section className="relative overflow-hidden bg-gradient-to-br from-orange to-orange-hover py-20">
      <Reveal className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">Learn More About the Summit</h2>
        <p className="mt-4 text-white/90">See what AHFID and its partners are building toward in Abuja this October.</p>
        <ButtonLink to="/about" variant="secondary" className="!mt-8 !bg-navy !border-navy">
          About the Summit
        </ButtonLink>
      </Reveal>
    </section>
  </>
);
