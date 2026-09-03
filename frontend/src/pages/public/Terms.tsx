import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing this website or registering for the AI in Health Summit 2026, you agree to be bound by these Terms of Service. If you do not agree, please do not use this website or register for the Summit.',
  },
  {
    title: '2. Registration & Eligibility',
    body: 'Registration confirms your intent to attend the Summit under the category selected (individual, organization, or student). AHFID reserves the right to verify eligibility for reduced-rate categories and to decline or revoke registration where information provided is false or misleading.',
  },
  {
    title: '3. Fees & Payment',
    body: 'Where applicable, registration fees will be published on the Register page and must be paid in full to confirm attendance. Complimentary categories (e.g., government officials, accredited media) are subject to verification.',
  },
  {
    title: '4. Cancellations & Refunds',
    body: 'Cancellation and refund terms will be published alongside registration pricing closer to the event. Registrations may generally be transferred to a colleague at no extra cost.',
  },
  {
    title: '5. Code of Conduct',
    body: 'All delegates, speakers, exhibitors, and partners are expected to conduct themselves professionally and respectfully. AHFID reserves the right to remove any participant whose conduct is disruptive, unlawful, or unsafe.',
  },
  {
    title: '6. Media & Recording',
    body: 'Sessions may be photographed, recorded, or livestreamed for promotional and archival purposes. By attending, you consent to your likeness being used in such materials unless you notify us in advance.',
  },
  {
    title: '7. Intellectual Property',
    body: 'All content on this website — including text, graphics, and branding — is the property of AHFID and the AI in Health Summit 2026 unless otherwise credited, and may not be reproduced without permission.',
  },
  {
    title: '8. Limitation of Liability',
    body: 'AHFID and its partners are not liable for indirect, incidental, or consequential damages arising from participation in the Summit, including travel, accommodation, or visa-related costs.',
  },
  {
    title: '9. Changes to These Terms',
    body: 'These Terms may be updated periodically. Continued use of this website or participation in the Summit after changes are posted constitutes acceptance of the revised Terms.',
  },
  {
    title: '10. Governing Law',
    body: 'These Terms are governed by the laws of the Federal Republic of Nigeria.',
  },
];

export const Terms = () => (
  <>
    <PageHero eyebrow="Legal" title="Terms of Service" subtitle="Effective date: 1 January 2026" />

    <section className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-[15px] leading-relaxed text-slate-600">
            These Terms of Service govern your use of this website and your participation in the AI in Health
            Summit 2026, convened by the Africa Hub for Innovation & Development (AHFID).
          </p>
        </Reveal>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.title} delay={Math.min(i * 0.035, 0.3)}>
              <h2 className="font-display text-lg font-semibold text-navy">{s.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.3} className="mt-12 rounded-xl border border-slate-200 bg-offwhite p-6">
          <p className="text-sm text-slate-600">
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:info@aihealthsummit2026.ng" className="font-semibold text-orange hover:text-orange-hover">
              info@aihealthsummit2026.ng
            </a>
            .
          </p>
        </Reveal>
      </div>
    </section>
  </>
);
