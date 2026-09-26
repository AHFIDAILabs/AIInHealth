import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { AttendeeForm } from '../../components/register/AttendeeForm';
import { ExhibitorForm } from '../../components/register/ExhibitorForm';
import { SponsorForm } from '../../components/register/SponsorForm';
import { VolunteerForm } from '../../components/register/VolunteerForm';
import { RegisterFaq } from '../../components/register/RegisterFaq';

type Tab = 'attendee' | 'exhibitor' | 'sponsor' | 'volunteer';

export const Register = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('attendee');

  // `key` is the stable, untranslated identifier used for the React key,
  // state, and conditional rendering below — `label` is the display-only
  // translated text (same split as Navbar.tsx's NAV_ITEMS).
  const TABS: { key: Tab; label: string }[] = [
    { key: 'attendee', label: t('register.tabs.attendee', 'Attendee') },
    { key: 'exhibitor', label: t('register.tabs.exhibitor', 'Exhibitor') },
    { key: 'sponsor', label: t('register.tabs.sponsor', 'Sponsor Inquiry') },
    { key: 'volunteer', label: t('register.tabs.volunteer', 'Volunteer') },
  ];

  return (
    <>
      <PageHero
        eyebrow={t('register.eyebrow', 'Register')}
        title={t('register.title', 'Register for the Summit')}
        subtitle={t(
          'register.subtitle',
          'Secure your spot at the AI in Health Summit 2026. Multiple ticket categories are available for delegates, exhibitors, and sponsors.'
        )}
      />

      <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
        <Reveal className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
            <div className="flex flex-wrap justify-center gap-2.5">
              {TABS.map((t) => {
                const isActive = t.key === tab;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? 'border-orange bg-orange text-white shadow-md shadow-orange/25'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-orange/40'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="mt-9"
              >
                {tab === 'attendee' && <AttendeeForm />}
                {tab === 'exhibitor' && <ExhibitorForm />}
                {tab === 'sponsor' && <SponsorForm />}
                {tab === 'volunteer' && <VolunteerForm />}
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </section>

      <RegisterFaq />
    </>
  );
};
