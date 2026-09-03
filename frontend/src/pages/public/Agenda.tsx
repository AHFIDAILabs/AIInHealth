import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, MapPin, Mic2, Users, Rocket, FileText, Handshake, Landmark, Network } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';

const DAYS = [
  {
    key: 'day1',
    label: 'Day 1',
    date: '19 October 2026',
    theme: 'Vision, Policy & Political Commitment',
    sessions: [
      { time: '08:00 – 09:00', title: 'Registration & Welcome Coffee', track: 'Arrivals', icon: Users },
      { time: '09:00 – 10:00', title: 'Opening Ceremony & Keynote Addresses', track: 'Plenary', icon: Mic2 },
      { time: '10:00 – 11:00', title: 'Political Engagements: National Commitments to AI in Health', track: 'Plenary', icon: Landmark },
      { time: '11:00 – 11:30', title: 'Networking Break', track: 'Networking', icon: Network },
      { time: '11:30 – 13:00', title: 'Panel: AI in Health Policy & Regulation', track: 'Policy & Governance', icon: Users },
      { time: '13:00 – 14:00', title: 'Lunch', track: 'Networking', icon: Network },
      { time: '14:00 – 15:30', title: 'Panel: AI for Resource-Limited Settings', track: 'Clinical AI & Diagnostics', icon: Users },
      { time: '15:30 – 17:00', title: 'Poster & Abstract Presentations', track: 'Research', icon: FileText },
      { time: '17:00 – 18:30', title: 'Welcome Reception & Networking', track: 'Networking', icon: Network },
    ],
  },
  {
    key: 'day2',
    label: 'Day 2',
    date: '20 October 2026',
    theme: 'Innovation, Investment & Implementation',
    sessions: [
      { time: '08:30 – 09:00', title: 'Morning Coffee', track: 'Arrivals', icon: Users },
      { time: '09:00 – 10:30', title: 'Startup Showcase: Live Demonstrations', track: 'Venture & Investment', icon: Rocket },
      { time: '10:30 – 11:00', title: 'Networking Break', track: 'Networking', icon: Network },
      { time: '11:00 – 13:00', title: 'Startup Pod & Deal Room: Investor Matchmaking', track: 'Venture & Investment', icon: Handshake },
      { time: '13:00 – 14:00', title: 'Lunch', track: 'Networking', icon: Network },
      { time: '14:00 – 15:30', title: 'Panel: Data Interoperability & Infrastructure', track: 'Infrastructure & Data', icon: Users },
      { time: '15:30 – 16:30', title: 'Working Session: Draft National Policy Brief', track: 'Policy & Governance', icon: FileText },
      { time: '16:30 – 17:15', title: 'Closing Plenary & Summit Communiqué', track: 'Plenary', icon: Mic2 },
      { time: '17:15 – 18:00', title: 'Closing Reception', track: 'Networking', icon: Network },
    ],
  },
] as const;

export const Agenda = () => {
  const [dayKey, setDayKey] = useState<(typeof DAYS)[number]['key']>('day1');
  const day = DAYS.find((d) => d.key === dayKey)!;

  return (
    <>
      <PageHero
        eyebrow="Programme"
        title="Two Days, One National Agenda"
        subtitle="A working agenda combining thought leadership with actionable deal-making and policy dialogue. Final timings and speakers will be confirmed closer to the Summit."
      />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Day switcher */}
          <Reveal className="flex flex-wrap items-center justify-center gap-3">
            {DAYS.map((d) => {
              const isActive = d.key === dayKey;
              return (
                <button
                  key={d.key}
                  onClick={() => setDayKey(d.key)}
                  className={`rounded-full border px-6 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? 'border-orange bg-orange text-white shadow-md shadow-orange/25'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-orange/40'
                  }`}
                >
                  {d.label} <span className="ml-1.5 font-normal opacity-80">&middot; {d.date}</span>
                </button>
              );
            })}
          </Reveal>

          <AnimatePresence mode="wait">
            <motion.div
              key={dayKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="mt-10"
            >
              <div className="rounded-2xl bg-navy px-6 py-5 text-center sm:px-8">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-orange">{day.label} Theme</p>
                <p className="mt-1 font-display text-lg font-semibold text-white sm:text-xl">{day.theme}</p>
              </div>

              <div className="mt-8 space-y-3">
                {day.sessions.map((s, i) => (
                  <Reveal key={s.time + s.title} delay={i * 0.04}>
                    <div className="flex items-start gap-4 rounded-xl border border-slate-200 p-4 transition-colors hover:border-orange/40 sm:items-center sm:gap-6 sm:p-5">
                      <div className="flex w-28 shrink-0 items-center gap-2 text-xs font-semibold text-slate-500 sm:w-36 sm:text-sm">
                        <Clock size={14} className="shrink-0 text-orange" />
                        {s.time}
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                        <s.icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-navy">{s.title}</p>
                        <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">{s.track}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-offwhite py-16">
        <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 text-center sm:px-6 lg:px-8">
          <MapPin size={22} className="text-orange" />
          <p className="text-slate-600">
            All sessions take place at the International Conference Centre (ICC), Abuja. A detailed venue map and
            session locations will be shared with registered delegates ahead of the Summit.
          </p>
          <ButtonLink to="/register" variant="primary">
            Register Interest
          </ButtonLink>
        </Reveal>
      </section>
    </>
  );
};
