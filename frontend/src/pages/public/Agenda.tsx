import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Mic2, Users, Rocket, FileText, Handshake, Landmark, Network, CalendarCheck, type LucideIcon } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { SessionRsvpModal } from '../../components/ui/SessionRsvpModal';
import { SpeakerModal } from '../../components/ui/SpeakerModal';
import { listPublicSessions, type AdminSession, type SessionDay, type SessionFormat } from '../../services/session.service';
import { listPublicSpeakers, type AdminSpeaker } from '../../services/speaker.service';

interface DisplaySpeaker {
  _id: string;
  fullName: string;
  title?: string;
  photoUrl?: string;
}

interface DisplaySession {
  key: string;
  time: string;
  title: string;
  track: string;
  trackColor?: string;
  icon: LucideIcon;
  room?: string;
  speakers?: DisplaySpeaker[];
  description?: string;
  requiresRsvp?: boolean;
}

const FORMAT_ICON: Record<SessionFormat, LucideIcon> = {
  Keynote: Mic2,
  'Panel Discussion': Users,
  'Startup Showcase': Rocket,
  'Poster & Abstract': FileText,
  'Political Engagement': Landmark,
  Networking: Network,
};

const fromRealSession = (s: AdminSession): DisplaySession => ({
  key: s._id,
  time: `${s.startTime} – ${s.endTime}`,
  title: s.title,
  track: s.track?.name ?? 'General Session',
  trackColor: s.track?.color,
  icon: FORMAT_ICON[s.format] ?? Users,
  room: s.room,
  speakers: s.speakers,
  description: s.description,
  requiresRsvp: s.requiresRsvp,
});

// Illustrative fallback — shown for a day only once it has zero real published
// sessions. Not claimed as confirmed; PageHero's subtitle already sets that
// expectation ("final timings and speakers will be confirmed closer to the
// Summit"). As soon as a real session is published for a day, this stops
// applying to that day specifically — the two are never blended.
const STATIC_DAYS: { key: SessionDay; label: string; date: string; theme: string; sessions: DisplaySession[] }[] = [
  {
    key: 'day1',
    label: 'Day 1',
    date: '19 October 2026',
    theme: 'Vision, Policy & Political Commitment',
    sessions: [
      { key: 's1-1', time: '08:00 – 09:00', title: 'Registration & Welcome Coffee', track: 'Arrivals', icon: Users },
      { key: 's1-2', time: '09:00 – 10:00', title: 'Opening Ceremony & Keynote Addresses', track: 'Plenary', icon: Mic2 },
      { key: 's1-3', time: '10:00 – 11:00', title: 'Political Engagements: National Commitments to AI in Health', track: 'Plenary', icon: Landmark },
      { key: 's1-4', time: '11:00 – 11:30', title: 'Networking Break', track: 'Networking', icon: Network },
      { key: 's1-5', time: '11:30 – 13:00', title: 'Panel: AI in Health Policy & Regulation', track: 'Policy & Governance', icon: Users },
      { key: 's1-6', time: '13:00 – 14:00', title: 'Lunch', track: 'Networking', icon: Network },
      { key: 's1-7', time: '14:00 – 15:30', title: 'Panel: AI for Resource-Limited Settings', track: 'Clinical AI & Diagnostics', icon: Users },
      { key: 's1-8', time: '15:30 – 17:00', title: 'Poster & Abstract Presentations', track: 'Research', icon: FileText },
      { key: 's1-9', time: '17:00 – 18:30', title: 'Welcome Reception & Networking', track: 'Networking', icon: Network },
    ],
  },
  {
    key: 'day2',
    label: 'Day 2',
    date: '20 October 2026',
    theme: 'Innovation, Investment & Implementation',
    sessions: [
      { key: 's2-1', time: '08:30 – 09:00', title: 'Morning Coffee', track: 'Arrivals', icon: Users },
      { key: 's2-2', time: '09:00 – 10:30', title: 'Startup Showcase: Live Demonstrations', track: 'Venture & Investment', icon: Rocket },
      { key: 's2-3', time: '10:30 – 11:00', title: 'Networking Break', track: 'Networking', icon: Network },
      { key: 's2-4', time: '11:00 – 13:00', title: 'Startup Pod & Deal Room: Investor Matchmaking', track: 'Venture & Investment', icon: Handshake },
      { key: 's2-5', time: '13:00 – 14:00', title: 'Lunch', track: 'Networking', icon: Network },
      { key: 's2-6', time: '14:00 – 15:30', title: 'Panel: Data Interoperability & Infrastructure', track: 'Infrastructure & Data', icon: Users },
      { key: 's2-7', time: '15:30 – 16:30', title: 'Working Session: Draft National Policy Brief', track: 'Policy & Governance', icon: FileText },
      { key: 's2-8', time: '16:30 – 17:15', title: 'Closing Plenary & Summit Communiqué', track: 'Plenary', icon: Mic2 },
      { key: 's2-9', time: '17:15 – 18:00', title: 'Closing Reception', track: 'Networking', icon: Network },
    ],
  },
];

export const Agenda = () => {
  const [dayKey, setDayKey] = useState<SessionDay>('day1');
  const [realSessions, setRealSessions] = useState<AdminSession[] | null>(null);
  const [rsvpSession, setRsvpSession] = useState<{ _id: string; title: string } | null>(null);
  const [allSpeakers, setAllSpeakers] = useState<AdminSpeaker[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<AdminSpeaker | null>(null);

  useEffect(() => {
    listPublicSessions()
      .then(setRealSessions)
      .catch(() => setRealSessions([]));
    listPublicSpeakers()
      .then(setAllSpeakers)
      .catch(() => setAllSpeakers([]));
  }, []);

  // Sessions only carry a speaker's _id/fullName/title/photoUrl; the full
  // profile (track/organization/bio) that SpeakerModal shows lives on the
  // speaker record itself, fetched separately and matched up here.
  const speakerMap = useMemo(() => {
    const map = new Map<string, AdminSpeaker>();
    allSpeakers.forEach((sp) => map.set(sp._id, sp));
    return map;
  }, [allSpeakers]);

  const resolveSpeaker = (sp: DisplaySpeaker, sessionTrack: string): AdminSpeaker =>
    speakerMap.get(sp._id) ?? {
      _id: sp._id,
      fullName: sp.fullName,
      title: sp.title ?? '',
      track: sessionTrack,
      photoUrl: sp.photoUrl,
      isPublished: true,
      order: 0,
      createdAt: '',
      updatedAt: '',
    };

  const days = STATIC_DAYS.map((staticDay) => {
    const realForDay = (realSessions ?? [])
      .filter((s) => s.day === staticDay.key)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return {
      ...staticDay,
      sessions: realForDay.length > 0 ? realForDay.map(fromRealSession) : staticDay.sessions,
      isLive: realForDay.length > 0,
    };
  });

  const day = days.find((d) => d.key === dayKey)!;

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
            {days.map((d) => {
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
                {!day.isLive && (
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Indicative programme: confirmed sessions publish here as they're finalized
                  </p>
                )}
              </div>

              <div className="mt-8 space-y-3">
                {day.sessions.map((s, i) => (
                  <Reveal key={s.key} delay={i * 0.04}>
                    <div className="flex items-start gap-4 rounded-xl border border-slate-200 p-4 transition-colors hover:border-orange/40 sm:items-center sm:gap-6 sm:p-5">
                      <div className="flex w-28 shrink-0 items-center gap-2 text-xs font-semibold text-slate-500 sm:w-36 sm:text-sm">
                        <Clock size={14} className="shrink-0 text-orange" />
                        {s.time}
                      </div>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                        <s.icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-semibold text-navy">{s.title}</p>
                          {s.requiresRsvp && (
                            <button
                              type="button"
                              onClick={() => setRsvpSession({ _id: s.key, title: s.title })}
                              className="flex shrink-0 items-center gap-1 rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-semibold text-orange hover:bg-orange/20"
                            >
                              <CalendarCheck size={12} /> RSVP
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                          {s.trackColor && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: s.trackColor }} />}
                          <span style={s.trackColor ? { color: s.trackColor } : undefined}>{s.track}</span>
                          {s.room && <span className="normal-case tracking-normal text-slate-400"> &middot; {s.room}</span>}
                        </p>
                        {s.description && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.description}</p>}
                        {s.speakers && s.speakers.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {s.speakers.map((sp) => (
                              <button
                                key={sp._id}
                                type="button"
                                onClick={() => setActiveSpeaker(resolveSpeaker(sp, s.track))}
                                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-left transition-colors hover:border-orange/40 hover:bg-orange/5"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy text-[10px] font-semibold text-white">
                                  {sp.photoUrl ? (
                                    <img src={sp.photoUrl} alt={sp.fullName} className="h-full w-full object-cover" />
                                  ) : (
                                    sp.fullName[0]
                                  )}
                                </span>
                                <span className="text-xs font-medium text-navy">{sp.fullName}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <SessionRsvpModal session={rsvpSession} onClose={() => setRsvpSession(null)} />
      <SpeakerModal speaker={activeSpeaker} onClose={() => setActiveSpeaker(null)} />
    </>
  );
};
