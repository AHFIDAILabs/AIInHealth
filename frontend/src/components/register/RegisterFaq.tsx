import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Reveal } from '../ui/Reveal';

const FAQS = [
  {
    q: 'What ticket categories are available?',
    a: 'Six categories: International Delegate (₦150,000 / $100), Nigerian Professional (₦120,000), Student / Researcher (₦75,000), VIP (₦300,000), Government Official (Complimentary), and Accredited Media (Complimentary).',
  },
  {
    q: 'What is included in registration?',
    a: 'All registrations include access to keynote sessions, panel discussions, the innovation showcase, networking sessions, and catered meals throughout the Summit.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Full refunds are available up to 30 days before the event. After that, registrations can be transferred to a colleague at no extra cost.',
  },
  {
    q: 'Do I need a visa to attend?',
    a: 'International delegates should check Nigeria’s immigration requirements for their country. Registered delegates can request an official invitation letter for visa purposes.',
  },
  {
    q: 'Is there an early bird discount?',
    a: 'Early bird pricing may be available for select ticket categories ahead of the Summit. Check back on this page for current pricing and availability.',
  },
] as const;

export const RegisterFaq = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-offwhite pb-24 pt-4 sm:pt-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Have Questions?</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Frequently Asked Questions</h2>
        </Reveal>

        <div className="mt-10 space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <Reveal key={faq.q} delay={i * 0.05}>
                <div className={`overflow-hidden rounded-xl border bg-white transition-colors ${isOpen ? 'border-orange/40' : 'border-slate-200'}`}>
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-navy">{faq.q}</span>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${
                        isOpen ? 'rotate-45 bg-orange text-white' : 'bg-navy-secondary text-orange'
                      }`}
                    >
                      <Plus size={15} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                      >
                        <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
