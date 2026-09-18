import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../../lib/siteInfo';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: 'When you register interest, apply as an exhibitor or sponsor, or contact us, we collect information you provide directly — such as your name, email address, phone number, organization, and job title. We also collect basic usage data (pages visited, browser type) via standard web analytics.',
  },
  {
    title: '2. How We Use Your Information',
    body: 'We use your information to process registrations and applications, communicate Summit updates, respond to inquiries, and improve this website. We do not sell your personal information to third parties.',
  },
  {
    title: '3. Sharing of Information',
    body: 'We may share information with Summit partners, sponsors, and vendors strictly to the extent necessary to deliver the event (e.g., venue access, badge printing), and with service providers who process data on our behalf under confidentiality obligations.',
  },
  {
    title: '4. Data Retention',
    body: 'We retain registration and contact information for as long as needed to organize the Summit and maintain records of past delegates, partners, and communications, after which it is securely deleted or anonymized.',
  },
  {
    title: '5. Your Rights',
    body: `You may request access to, correction of, or deletion of your personal information at any time by contacting us at ${SUPPORT_EMAIL}.`,
  },
  {
    title: '6. Cookies',
    body: 'This website may use cookies and similar technologies to remember preferences and understand site usage. You can control cookies through your browser settings.',
  },
  {
    title: '7. Security',
    body: 'We take reasonable technical and organizational measures to protect your information against unauthorized access, alteration, or disclosure.',
  },
  {
    title: '8. Changes to This Policy',
    body: 'We may update this Privacy Policy from time to time. Material changes will be reflected on this page with an updated effective date.',
  },
];

export const Privacy = () => (
  <>
    <PageHero eyebrow="Legal" title="Privacy Policy" subtitle="Effective date: 1 January 2026" />

    <section className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-[15px] leading-relaxed text-slate-600">
            The AI in Health Summit 2026, convened by the Africa Hub for Innovation & Development (AHFID), is
            committed to protecting the privacy of everyone who interacts with this website. This policy explains
            what information we collect and how it&rsquo;s used.
          </p>
        </Reveal>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.title} delay={Math.min(i * 0.04, 0.3)}>
              <h2 className="font-display text-lg font-semibold text-navy">{s.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-12 rounded-xl border border-slate-200 bg-offwhite p-6">
          <p className="text-sm text-slate-600">
            Questions about this policy? Contact us at{' '}
            <a href={SUPPORT_MAILTO} className="font-semibold text-orange hover:text-orange-hover">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  </>
);
