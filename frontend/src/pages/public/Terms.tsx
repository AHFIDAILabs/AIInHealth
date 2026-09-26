import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '../../lib/siteInfo';

export const Terms = () => {
  const { t } = useTranslation();

  // `id` is the stable, untranslated identifier used for the React key —
  // `title`/`body` are translated (built inside the component so they can go
  // through t()), same split as Navbar.tsx's NAV_ITEMS.
  const SECTIONS = [
    {
      id: 'section1',
      title: t('terms.section1.heading', '1. Acceptance of Terms'),
      body: t(
        'terms.section1.body',
        'By accessing this website or registering for the AI in Health Summit 2026, you agree to be bound by these Terms of Service. If you do not agree, please do not use this website or register for the Summit.'
      ),
    },
    {
      id: 'section2',
      title: t('terms.section2.heading', '2. Registration & Eligibility'),
      body: t(
        'terms.section2.body',
        'Registration confirms your intent to attend the Summit under the category selected (individual, organization, or student). AHFID reserves the right to verify eligibility for reduced-rate categories and to decline or revoke registration where information provided is false or misleading.'
      ),
    },
    {
      id: 'section3',
      title: t('terms.section3.heading', '3. Fees & Payment'),
      body: t(
        'terms.section3.body',
        'Where applicable, registration fees will be published on the Register page and must be paid in full to confirm attendance. Complimentary categories (e.g., government officials, accredited media) are subject to verification.'
      ),
    },
    {
      id: 'section4',
      title: t('terms.section4.heading', '4. Cancellations & Refunds'),
      body: t(
        'terms.section4.body',
        'Cancellation and refund terms will be published alongside registration pricing closer to the event. Registrations may generally be transferred to a colleague at no extra cost.'
      ),
    },
    {
      id: 'section5',
      title: t('terms.section5.heading', '5. Code of Conduct'),
      body: t(
        'terms.section5.body',
        'All delegates, speakers, exhibitors, and partners are expected to conduct themselves professionally and respectfully. AHFID reserves the right to remove any participant whose conduct is disruptive, unlawful, or unsafe.'
      ),
    },
    {
      id: 'section6',
      title: t('terms.section6.heading', '6. Media & Recording'),
      body: t(
        'terms.section6.body',
        'Sessions may be photographed, recorded, or livestreamed for promotional and archival purposes. By attending, you consent to your likeness being used in such materials unless you notify us in advance.'
      ),
    },
    {
      id: 'section7',
      title: t('terms.section7.heading', '7. Intellectual Property'),
      body: t(
        'terms.section7.body',
        'All content on this website, including text, graphics, and branding, is the property of AHFID and the AI in Health Summit 2026 unless otherwise credited, and may not be reproduced without permission.'
      ),
    },
    {
      id: 'section8',
      title: t('terms.section8.heading', '8. Limitation of Liability'),
      body: t(
        'terms.section8.body',
        'AHFID and its partners are not liable for indirect, incidental, or consequential damages arising from participation in the Summit, including travel, accommodation, or visa-related costs.'
      ),
    },
    {
      id: 'section9',
      title: t('terms.section9.heading', '9. Changes to These Terms'),
      body: t(
        'terms.section9.body',
        'These Terms may be updated periodically. Continued use of this website or participation in the Summit after changes are posted constitutes acceptance of the revised Terms.'
      ),
    },
    {
      id: 'section10',
      title: t('terms.section10.heading', '10. Governing Law'),
      body: t('terms.section10.body', 'These Terms are governed by the laws of the Federal Republic of Nigeria.'),
    },
  ];

  return (
    <>
      <PageHero
        eyebrow={t('terms.eyebrow', 'Legal')}
        title={t('terms.title', 'Terms of Service')}
        subtitle={t('terms.effectiveDate', 'Effective date: 1 January 2026')}
      />

      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-[15px] leading-relaxed text-slate-600">
              {t(
                'terms.intro',
                'These Terms of Service govern your use of this website and your participation in the AI in Health Summit 2026, convened by the Africa Hub for Innovation & Development (AHFID).'
              )}
            </p>
          </Reveal>

          <div className="mt-10 space-y-10">
            {SECTIONS.map((s, i) => (
              <Reveal key={s.id} delay={Math.min(i * 0.035, 0.3)}>
                <h2 className="font-display text-lg font-semibold text-navy">{s.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{s.body}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3} className="mt-12 rounded-xl border border-slate-200 bg-offwhite p-6">
            <p className="text-sm text-slate-600">
              {t('terms.questions', 'Questions about these Terms? Contact us at')}{' '}
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
};
