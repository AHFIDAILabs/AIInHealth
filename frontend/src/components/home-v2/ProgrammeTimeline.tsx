import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import { SessionRsvpModal } from '../ui/SessionRsvpModal';
import { SpeakerModal } from '../ui/SpeakerModal';
import { listPublicSessions, type AdminSession, type SessionDay } from '../../services/session.service';
import { listPublicSpeakers, type AdminSpeaker } from '../../services/speaker.service';

interface RowSpeaker {
  _id: string;
  fullName: string;
  title?: string;
  photoUrl?: string;
}

interface Row {
  key: string;
  time: string;
  title: string;
  track: string;
  trackColor?: string;
  description?: string;
  speakers?: RowSpeaker[];
  requiresRsvp?: boolean;
}

const DAY_LABEL: Record<SessionDay, string> = { day1: 'Day 1 · 19 Oct', day2: 'Day 2 · 20 Oct' };

// Same illustrative fallback content as the public /agenda page (Agenda.tsx),
// trimmed to 4 highlights per day for a homepage teaser. Kept in sync with
// that file manually — if the real Agenda's STATIC_DAYS content changes,
// mirror the change here too. Shown only for a day with zero real published
// sessions, exactly like Agenda.tsx — never blended with real ones.
const STATIC_ROWS: Record<SessionDay, Row[]> = {
  day1: [
    { key: 's1-2', time: '09:00 – 10:00', title: 'Opening Ceremony & Keynote Addresses', track: 'Plenary' },
    { key: 's1-3', time: '10:00 – 11:00', title: 'Political Engagements: National Commitments to AI in Health', track: 'Plenary' },
    { key: 's1-5', time: '11:30 – 13:00', title: 'Panel: AI in Health Policy & Regulation', track: 'Policy & Governance' },
    { key: 's1-7', time: '14:00 – 15:30', title: 'Panel: AI for Resource-Limited Settings', track: 'Clinical AI & Diagnostics' },
  ],
  day2: [
    { key: 's2-2', time: '09:00 – 10:30', title: 'Startup Showcase: Live Demonstrations', track: 'Venture & Investment' },
    { key: 's2-4', time: '11:00 – 13:00', title: 'Startup Pod & Deal Room: Investor Matchmaking', track: 'Venture & Investment' },
    { key: 's2-6', time: '14:00 – 15:30', title: 'Panel: Data Interoperability & Infrastructure', track: 'Infrastructure & Data' },
    { key: 's2-8', time: '16:30 – 17:15', title: 'Closing Plenary & Summit Communiqué', track: 'Plenary' },
  ],
};

const fromReal = (s: AdminSession): Row => ({
  key: s._id,
  time: `${s.startTime} – ${s.endTime}`,
  title: s.title,
  track: s.track?.name ?? 'General Session',
  trackColor: s.track?.color,
  description: s.description,
  speakers: s.speakers,
  requiresRsvp: s.requiresRsvp,
});

// Homepage teaser version of the full /agenda page: day tabs + a trimmed
// vertical timeline, styled to match the new design language (dot-and-line,
// orange-to-navy gradient rail). Backed by the same listPublicSessions() call
// as Agenda.tsx, so a session published in the admin shows up here too.
export const ProgrammeTimeline = () => {
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

  // Rows only carry a speaker's _id/fullName/title/photoUrl; the full profile
  // (track/organization/bio) SpeakerModal shows lives on the speaker record
  // itself, fetched separately and matched up here — same approach as Agenda.tsx.
  const speakerMap = useMemo(() => {
    const map = new Map<string, AdminSpeaker>();
    allSpeakers.forEach((sp) => map.set(sp._id, sp));
    return map;
  }, [allSpeakers]);

  const resolveSpeaker = (sp: RowSpeaker, rowTrack: string): AdminSpeaker =>
    speakerMap.get(sp._id) ?? {
      _id: sp._id,
      fullName: sp.fullName,
      title: sp.title ?? '',
      track: rowTrack,
      photoUrl: sp.photoUrl,
      isPublished: true,
      order: 0,
      createdAt: '',
      updatedAt: '',
    };

  const realForDay = (realSessions ?? [])
    .filter((s) => s.day === dayKey)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const rows: Row[] = realForDay.length > 0 ? realForDay.slice(0, 4).map(fromReal) : STATIC_ROWS[dayKey];
  const isLive = realForDay.length > 0;

  return (
    <section className="bg-offwhite py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Programme</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">
              What the day is built around
            </h2>
          </div>
          <p className="max-w-sm text-sm text-slate-500">
            {isLive
              ? 'Confirmed sessions for this day — see the full two-day agenda for the complete schedule.'
              : "Indicative programme — confirmed sessions publish here as they're finalized."}
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-8 flex gap-3">
          {(['day1', 'day2'] as SessionDay[]).map((d) => (
            <button
              key={d}
              onClick={() => setDayKey(d)}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-all ${
                dayKey === d
                  ? 'border-orange bg-orange text-white shadow-md shadow-orange/25'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-orange/40'
              }`}
            >
              {DAY_LABEL[d]}
            </button>
          ))}
        </Reveal>

        <AnimatePresence mode="wait">
          <motion.div
            key={dayKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="relative mt-10 pl-8"
          >
            <div className="absolute bottom-2 left-[9px] top-2 w-px bg-gradient-to-b from-orange via-orange to-navy" />
            {rows.map((row) => (
              <div key={row.key} className="relative mb-5 last:mb-0">
                <span className="absolute -left-8 top-6 h-[18px] w-[18px] rounded-full border-[3px] border-navy bg-white" />
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-navy-secondary">
                      {row.time} &middot;
                      {row.trackColor && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: row.trackColor }} />}
                      <span style={row.trackColor ? { color: row.trackColor } : undefined}>{row.track}</span>
                    </p>
                    {row.requiresRsvp && (
                      <button
                        type="button"
                        onClick={() => setRsvpSession({ _id: row.key, title: row.title })}
                        className="flex shrink-0 items-center gap-1 rounded-full bg-orange/10 px-2.5 py-1 text-[11px] font-semibold text-orange hover:bg-orange/20"
                      >
                        <CalendarCheck size={12} /> RSVP
                      </button>
                    )}
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold text-navy">{row.title}</h3>
                  {row.description && <p className="mt-2 text-sm leading-relaxed text-slate-500">{row.description}</p>}
                  {row.speakers && row.speakers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.speakers.map((sp) => (
                        <button
                          key={sp._id}
                          type="button"
                          onClick={() => setActiveSpeaker(resolveSpeaker(sp, row.track))}
                          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-left transition-colors hover:border-orange/40 hover:bg-orange/5"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy text-[11px] font-semibold text-white">
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
            ))}
          </motion.div>
        </AnimatePresence>

        <Reveal delay={0.15} className="mt-8 flex justify-center">
          <ButtonLink
            to="/agenda"
            variant="secondary"
            className="!border !border-slate-300 !bg-transparent !text-navy hover:!bg-navy/5"
          >
            View Full Agenda
          </ButtonLink>
        </Reveal>
      </div>

      <SessionRsvpModal session={rsvpSession} onClose={() => setRsvpSession(null)} />
      <SpeakerModal speaker={activeSpeaker} onClose={() => setActiveSpeaker(null)} />
    </section>
  );
};