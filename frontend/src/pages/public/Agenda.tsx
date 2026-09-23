import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ChevronDown } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { SessionRsvpModal } from '../../components/ui/SessionRsvpModal';
import { SpeakerModal } from '../../components/ui/SpeakerModal';
import {
  listPublicSessions,
  type AdminSession,
  type SessionDay,
  type SessionCardStyle,
  type SessionPartnerRef,
} from '../../services/session.service';
import { listPublicSpeakers, type AdminSpeaker } from '../../services/speaker.service';

interface DisplaySpeaker {
  _id: string;
  fullName: string;
  title?: string;
  photoUrl?: string;
}

interface DisplaySession {
  key: string;
  startTime: string;
  endTime: string;
  title: string;
  format: string;
  track: { name: string; color: string } | null;
  room?: string;
  speakers: DisplaySpeaker[];
  partners: SessionPartnerRef[];
  description?: string;
  requiresRsvp?: boolean;
  cardStyle: SessionCardStyle;
}

const fromRealSession = (s: AdminSession): DisplaySession => ({
  key: s._id,
  startTime: s.startTime,
  endTime: s.endTime,
  title: s.title,
  format: s.format,
  track: s.track ? { name: s.track.name, color: s.track.color } : null,
  room: s.room,
  speakers: s.speakers,
  partners: s.partners,
  description: s.description,
  requiresRsvp: s.requiresRsvp,
  cardStyle: s.cardStyle ?? 'standard',
});

// The Summit's two real calendar days — kept in sync with
// SessionsListTab.tsx's own DAY_TO_DATE and jobs/sessionReminder.job.ts.
const DAY_DATES: Record<SessionDay, Date> = {
  day1: new Date('2026-10-19T00:00:00+01:00'),
  day2: new Date('2026-10-20T00:00:00+01:00'),
};

const dayTabParts = (date: Date) => ({
  dayOfMonth: date.toLocaleDateString('en-GB', { day: '2-digit' }),
  weekday: date.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
  month: date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
});

// Illustrative fallback — shown for a day only once it has zero real published
// sessions. Normalized to the same DisplaySession shape the real data uses, so
// it renders through the identical timeline/card UI below (just always
// 'standard' cards, since there's no real curation to reflect yet).
const STATIC_DAYS: { key: SessionDay; sessions: DisplaySession[] }[] = [
  {
    key: 'day1',
    sessions: [
      { key: 's1-1', startTime: '08:00', endTime: '09:00', title: 'Registration & Welcome Coffee', format: 'Networking', track: null, speakers: [], partners: [], cardStyle: 'break' },
      { key: 's1-2', startTime: '09:00', endTime: '10:00', title: 'Opening Ceremony & Keynote Addresses', format: 'Keynote', track: { name: 'Plenary', color: '#E8792C' }, speakers: [], partners: [], cardStyle: 'featured' },
      { key: 's1-3', startTime: '10:00', endTime: '11:00', title: 'Political Engagements: National Commitments to AI in Health', format: 'Political Engagement', track: { name: 'Plenary', color: '#E8792C' }, speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's1-4', startTime: '11:00', endTime: '11:30', title: 'Networking Break', format: 'Networking', track: null, speakers: [], partners: [], cardStyle: 'break' },
      { key: 's1-5', startTime: '11:30', endTime: '13:00', title: 'Panel: AI in Health Policy & Regulation', format: 'Panel Discussion', track: { name: 'Policy & Governance', color: '#14213D' }, speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's1-6', startTime: '13:00', endTime: '14:00', title: 'Lunch', format: 'Networking', track: null, speakers: [], partners: [], cardStyle: 'break' },
      { key: 's1-7', startTime: '14:00', endTime: '15:30', title: 'Panel: AI for Resource-Limited Settings', format: 'Panel Discussion', track: { name: 'Clinical AI & Diagnostics', color: '#0F172A' }, speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's1-8', startTime: '15:30', endTime: '17:00', title: 'Poster & Abstract Presentations', format: 'Poster & Abstract', track: { name: 'Research', color: '#64748B' }, speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's1-9', startTime: '17:00', endTime: '18:30', title: 'Welcome Reception & Networking', format: 'Networking', track: null, speakers: [], partners: [], cardStyle: 'break' },
    ],
  },
  {
    key: 'day2',
    sessions: [
      { key: 's2-1', startTime: '08:30', endTime: '09:00', title: 'Morning Coffee', format: 'Networking', track: null, speakers: [], partners: [], cardStyle: 'break' },
      { key: 's2-2', startTime: '09:00', endTime: '10:30', title: 'Startup Showcase: Live Demonstrations', format: 'Startup Showcase', track: { name: 'Venture & Investment', color: '#E8792C' }, speakers: [], partners: [], cardStyle: 'featured' },
      { key: 's2-3', startTime: '10:30', endTime: '11:00', title: 'Networking Break', format: 'Networking', track: null, speakers: [], partners: [], cardStyle: 'break' },
      { key: 's2-4', startTime: '11:00', endTime: '13:00', title: 'Startup Pod & Deal Room: Investor Matchmaking', format: 'Startup Showcase', track: { name: 'Venture & Investment', color: '#E8792C' }, speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's2-5', startTime: '13:00', endTime: '14:00', title: 'Lunch', format: 'Networking', track: null, speakers: [], partners: [], cardStyle: 'break' },
      { key: 's2-6', startTime: '14:00', endTime: '15:30', title: 'Panel: Data Interoperability & Infrastructure', format: 'Panel Discussion', track: { name: 'Infrastructure & Data', color: '#14213D' }, speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's2-7', startTime: '15:30', endTime: '16:30', title: 'Working Session: Draft National Policy Brief', format: 'Poster & Abstract', track: { name: 'Policy & Governance', color: '#64748B' }, speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's2-8', startTime: '16:30', endTime: '17:15', title: 'Closing Plenary & Summit Communiqué', format: 'Keynote', track: { name: 'Plenary', color: '#E8792C' }, speakers: [], partners: [], cardStyle: 'featured' },
      { key: 's2-9', startTime: '17:15', endTime: '18:00', title: 'Closing Reception', format: 'Networking', track: null, speakers: [], partners: [], cardStyle: 'break' },
    ],
  },
];

const timeOfDay = (startTime: string): 'Morning Sessions' | 'Afternoon Sessions' | 'Evening Sessions' => {
  const hour = Number(startTime.slice(0, 2));
  if (hour < 12) return 'Morning Sessions';
  if (hour < 17) return 'Afternoon Sessions';
  return 'Evening Sessions';
};

// 'break' never actually reaches CARD_STYLE_CLASSES[...] at runtime — a break
// card always renders its own standalone bar, never SessionCard — but SessionCard
// takes a plain DisplaySession prop (its cardStyle isn't narrowed the way the old
// inline-ternary version had it), so the type needs an entry for every
// SessionCardStyle even though this one is dead.
const CARD_STYLE_CLASSES: Record<SessionCardStyle, string> = {
  standard: 'bg-white text-navy',
  featured: 'bg-navy text-white',
  spotlight: 'bg-navy-secondary text-white',
  break: '',
};

interface SessionCardProps {
  s: DisplaySession;
  onRsvp: (session: { _id: string; title: string }) => void;
  onSpeakerClick: (speaker: AdminSpeaker) => void;
  resolveSpeaker: (sp: DisplaySpeaker, trackName: string) => AdminSpeaker;
}

// A real top-level component, not one declared inside Agenda's render body —
// a locally-declared component gets a brand-new identity on every render of
// its parent, which makes React remount it (and can make sibling instances'
// state bleed together) instead of preserving each card's own
// briefExpanded state independently. Every value it needs from Agenda's
// scope (the RSVP/speaker-modal openers, resolveSpeaker) is passed in as a
// prop instead of closed over.
const SessionCard = ({ s, onRsvp, onSpeakerClick, resolveSpeaker }: SessionCardProps) => {
  const [briefExpanded, setBriefExpanded] = useState(false);
  // A short brief (a one-line room note, say) never needs a toggle at all —
  // only the longer ones (e.g. a full list of oral abstract titles, per the
  // Oral Abstracts session type) default to collapsed.
  const briefIsLong = (s.description?.length ?? 0) > 220;

  return (
    <div
      className={`flex-1 rounded-xl p-5 shadow-sm ${
        s.cardStyle === 'standard' ? `${CARD_STYLE_CLASSES.standard} border-l-4` : CARD_STYLE_CLASSES[s.cardStyle]
      }`}
      style={s.cardStyle === 'standard' ? { borderLeftColor: s.track?.color ?? '#E8792C' } : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                s.cardStyle === 'standard' ? 'bg-orange/10 text-orange' : 'bg-white/15 text-white'
              }`}
            >
              {s.format}
            </span>
            {s.track && (
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  s.cardStyle === 'standard' ? 'bg-offwhite text-slate-500' : 'bg-white/10 text-slate-200'
                }`}
              >
                {s.track.name}
              </span>
            )}
            {s.requiresRsvp && (
              <button
                type="button"
                onClick={() => onRsvp({ _id: s.key, title: s.title })}
                className="flex items-center gap-1 rounded-full bg-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-orange-hover"
              >
                <CalendarCheck size={11} /> RSVP
              </button>
            )}
          </div>

          <p className={`mt-2 font-display text-base font-bold sm:text-lg ${s.cardStyle === 'standard' ? 'text-navy' : 'text-white'}`}>
            {s.title}
          </p>
          {s.room && (
            <p className={`mt-0.5 text-[12px] font-medium ${s.cardStyle === 'standard' ? 'text-slate-400' : 'text-slate-300'}`}>
              {s.room}
            </p>
          )}

          {s.description && (
            <div className="mt-3">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${s.cardStyle === 'standard' ? 'text-slate-400' : 'text-slate-400'}`}>
                Session Brief
              </p>
              <p
                className={`mt-1 whitespace-pre-line text-[13px] leading-relaxed ${briefIsLong && !briefExpanded ? 'line-clamp-3' : ''} ${
                  s.cardStyle === 'standard' ? 'text-slate-600' : 'text-slate-200'
                }`}
              >
                {s.description}
              </p>
              {briefIsLong && (
                <button
                  type="button"
                  onClick={() => setBriefExpanded((prev) => !prev)}
                  className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${
                    s.cardStyle === 'standard' ? 'text-orange hover:text-orange-hover' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {briefExpanded ? 'Show less' : 'Read more'}
                  <ChevronDown size={12} className={`transition-transform ${briefExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}

          {s.speakers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {s.speakers.map((sp) => (
                <button
                  key={sp._id}
                  type="button"
                  onClick={() => onSpeakerClick(resolveSpeaker(sp, s.track?.name ?? 'General Session'))}
                  className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-left transition-colors ${
                    s.cardStyle === 'standard'
                      ? 'border-slate-200 bg-white hover:border-orange/40 hover:bg-orange/5'
                      : 'border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy text-[10px] font-semibold text-white">
                    {sp.photoUrl ? (
                      <img src={sp.photoUrl} alt={sp.fullName} className="h-full w-full object-cover" />
                    ) : (
                      sp.fullName[0]
                    )}
                  </span>
                  <span className={`text-xs font-medium ${s.cardStyle === 'standard' ? 'text-navy' : 'text-white'}`}>{sp.fullName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {s.partners.length > 0 && (
          <div className="flex shrink-0 flex-wrap justify-end gap-3">
            {s.partners.map((p) => (
              <div key={p._id} className="flex w-20 flex-col items-center gap-1.5 text-center">
                <span className="flex h-12 w-20 items-center justify-center rounded-lg bg-white p-2 shadow-sm">
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt={p.name} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] font-semibold text-navy">{p.name}</span>
                  )}
                </span>
                <span className={`text-[10px] font-medium leading-tight ${s.cardStyle === 'standard' ? 'text-slate-500' : 'text-slate-300'}`}>
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const Agenda = () => {
  const [dayKey, setDayKey] = useState<SessionDay>('day1');
  const [realSessions, setRealSessions] = useState<AdminSession[] | null>(null);
  const [rsvpSession, setRsvpSession] = useState<{ _id: string; title: string } | null>(null);
  const [allSpeakers, setAllSpeakers] = useState<AdminSpeaker[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<AdminSpeaker | null>(null);

  const [formatFilter, setFormatFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');

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

  const days = useMemo(
    () =>
      STATIC_DAYS.map((staticDay) => {
        const realForDay = (realSessions ?? [])
          .filter((s) => s.day === staticDay.key)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        return {
          key: staticDay.key,
          sessions: realForDay.length > 0 ? realForDay.map(fromRealSession) : staticDay.sessions,
          isLive: realForDay.length > 0,
        };
      }),
    [realSessions]
  );

  const day = days.find((d) => d.key === dayKey)!;

  // Filter dropdown/pill options are drawn from BOTH days' real data (not just
  // the active day), so switching days doesn't make an option disappear —
  // only the sessions shown change.
  const allRealSessions = useMemo(() => (realSessions ?? []).map(fromRealSession), [realSessions]);
  const trackOptions = useMemo(() => {
    const map = new Map<string, string>();
    allRealSessions.forEach((s) => {
      if (s.track) map.set(s.track.name, s.track.color);
    });
    return Array.from(map.entries());
  }, [allRealSessions]);
  const roomOptions = useMemo(
    () => Array.from(new Set(allRealSessions.map((s) => s.room).filter((r): r is string => !!r))).sort(),
    [allRealSessions]
  );
  const formatCounts = useMemo(() => {
    const counts = new Map<string, number>();
    day.sessions.forEach((s) => counts.set(s.format, (counts.get(s.format) ?? 0) + 1));
    return counts;
  }, [day.sessions]);
  // Format is free text now (admin-typeable, see the Sessions admin form's
  // combobox) rather than a fixed list, so the filter pills are derived
  // straight from whatever formats are actually present today — a custom
  // type an admin just added shows up here the same as any built-in one.
  const formatOptions = useMemo(() => Array.from(formatCounts.keys()).sort(), [formatCounts]);

  const filteredSessions = day.sessions.filter(
    (s) =>
      (!formatFilter || s.format === formatFilter) &&
      (!trackFilter || s.track?.name === trackFilter) &&
      (!roomFilter || s.room === roomFilter)
  );

  // Sessions already come back sorted by time; grouping by time-of-day here
  // just labels that existing order (Morning/Afternoon/Evening), it never
  // re-sorts.
  const sections = useMemo(() => {
    const order: DisplaySession['key'][] = [];
    const map = new Map<string, DisplaySession[]>();
    filteredSessions.forEach((s) => {
      const label = timeOfDay(s.startTime);
      if (!map.has(label)) {
        map.set(label, []);
        order.push(label);
      }
      map.get(label)!.push(s);
    });
    return order.map((label) => ({ label, sessions: map.get(label)! }));
  }, [filteredSessions]);

  // Two or more parallel-track sessions sharing a start time get one shared
  // timeline rail with their cards laid out in a row instead of each getting
  // its own full-width row — that's what "happening at the same time" should
  // look like on a timeline, not a plain vertical stack that implies
  // sequence. A 'break' card is never grouped (it's rendered as its own
  // centered bar, not the rail+card shape), so it always sits alone even if
  // its time happens to coincide with something else.
  const groupByStartTime = (sessions: DisplaySession[]): DisplaySession[][] => {
    const groups: DisplaySession[][] = [];
    for (const s of sessions) {
      const prev = groups[groups.length - 1];
      if (s.cardStyle !== 'break' && prev && prev[0].cardStyle !== 'break' && prev[0].startTime === s.startTime) {
        prev.push(s);
      } else {
        groups.push([s]);
      }
    }
    return groups;
  };

  const dateLabel = DAY_DATES[dayKey].toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <PageHero
        eyebrow="Programme"
        title="Two Days, One National Agenda"
        subtitle="A working agenda combining thought leadership with actionable deal-making and policy dialogue. Final timings and speakers will be confirmed closer to the Summit."
      />

      {/* Day tabs — sticky under the fixed site header, reading the same
          measured --header-height Navbar.tsx sets, so it lines up exactly
          instead of guessing a breakpoint offset. */}
      <div className="sticky z-30 bg-navy-nav" style={{ top: 'var(--header-height, 4rem)' }}>
        <div className="mx-auto flex max-w-6xl items-stretch justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex flex-1 items-stretch">
            {(Object.keys(DAY_DATES) as SessionDay[]).map((key) => {
              const { dayOfMonth, weekday, month } = dayTabParts(DAY_DATES[key]);
              const isActive = key === dayKey;
              return (
                <button
                  key={key}
                  onClick={() => setDayKey(key)}
                  className={`flex items-center gap-2.5 border-b-2 px-2 py-4 transition-colors sm:px-6 ${
                    isActive ? 'border-orange bg-white/5' : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <span className={`font-display text-2xl font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>{dayOfMonth}</span>
                  <span className="text-left leading-tight">
                    <span className={`block text-[13px] font-semibold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {key === 'day1' ? 'Day 1' : 'Day 2'}
                    </span>
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      {weekday} {month}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <a
            href="/partners"
            className="ml-2 flex shrink-0 items-center self-center rounded-full bg-orange px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-orange-hover sm:px-4"
          >
            Partner With Us
          </a>
        </div>
      </div>

      <section className="bg-offwhite py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Filter pills + dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setFormatFilter('')}
              className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                !formatFilter ? 'bg-navy text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-orange/40'
              }`}
            >
              All
            </button>
            {formatOptions.map((f) => (
              <button
                key={f}
                onClick={() => setFormatFilter(f)}
                className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                  formatFilter === f ? 'bg-navy text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-orange/40'
                }`}
              >
                {f} &middot; {formatCounts.get(f)}
              </button>
            ))}

            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 focus:border-orange/40 focus:outline-none"
            >
              <option value="">All Tracks</option>
              {trackOptions.map(([name]) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 focus:border-orange/40 focus:outline-none"
            >
              <option value="">All Rooms</option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-4 text-[13px] text-slate-400">
            Day {dayKey === 'day1' ? '1' : '2'} &middot; {dateLabel} &mdash; {filteredSessions.length} session
            {filteredSessions.length === 1 ? '' : 's'} shown
          </p>

          {!day.isLive && (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Indicative programme: confirmed sessions publish here as they're finalized
            </p>
          )}

          {/* Timeline */}
          <div className="mt-8 space-y-10">
            {sections.map((section) => (
              <div key={section.label}>
                <div className="mb-5 flex items-center gap-3">
                  <p className="shrink-0 text-xs font-bold uppercase tracking-widest text-orange">{section.label}</p>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="space-y-4">
                  {groupByStartTime(section.sessions).map((group) => {
                    const first = group[0];
                    if (first.cardStyle === 'break') {
                      return (
                        <div key={first.key} className="rounded-lg bg-slate-100 py-3 text-center text-[13px] font-medium text-slate-500">
                          {first.startTime} &ndash; {first.endTime} &middot; {first.title}
                        </div>
                      );
                    }
                    // Concurrent sessions share one rail — a single endTime
                    // label would be misleading if the parallel tracks run
                    // different lengths, so the rail only commits to the
                    // shared start time in that case.
                    const isConcurrent = group.length > 1;
                    return (
                      <div key={first.key} className="flex gap-4 sm:gap-5">
                        {/* Timeline rail */}
                        <div className="flex w-12 shrink-0 flex-col items-center sm:w-16">
                          <span className="text-[13px] font-bold text-navy sm:text-sm">{first.startTime}</span>
                          <span
                            className="my-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-offwhite"
                            style={{ backgroundColor: first.track?.color ?? '#E8792C' }}
                          />
                          <span className="w-px flex-1 bg-slate-200" />
                          {!isConcurrent && <span className="text-[11px] font-medium text-slate-400">{first.endTime}</span>}
                        </div>

                        {/* Parallel-track sessions lay out two per row (stacked on
                            mobile) — a 3rd/5th/etc. session wraps onto its own new
                            row rather than all of them squeezing into one line. A
                            single session at this time still gets the full-width
                            card it always had. */}
                        <div className={isConcurrent ? 'grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2' : 'flex flex-1 flex-col gap-4'}>
                          {group.map((s) => (
                            <SessionCard
                              key={s.key}
                              s={s}
                              onRsvp={setRsvpSession}
                              onSpeakerClick={setActiveSpeaker}
                              resolveSpeaker={resolveSpeaker}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredSessions.length === 0 && (
              <p className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
                No sessions match these filters yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <SessionRsvpModal session={rsvpSession} onClose={() => setRsvpSession(null)} />
      <SpeakerModal speaker={activeSpeaker} onClose={() => setActiveSpeaker(null)} />
    </>
  );
};
