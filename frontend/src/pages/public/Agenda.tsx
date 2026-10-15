import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { SessionRsvpModal } from '../../components/ui/SessionRsvpModal';
import { SpeakerModal } from '../../components/ui/SpeakerModal';
import {
  listPublicSessions,
  recommendAgenda,
  type AdminSession,
  type SessionDay,
  type RecommendedSession,
} from '../../services/session.service';
import { listPublicSpeakers, type AdminSpeaker } from '../../services/speaker.service';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import { bookmarkSession, unbookmarkSession } from '../../services/delegate.service';
import { SEO } from '../../components/seo/SEO';
import {
  DAY_DATES,
  fromRealSession,
  timeOfDay,
  groupByStartTime,
  SessionCard,
  SessionDetailModal,
  type DisplaySession,
  type DisplaySpeaker,
} from '../../components/agenda/sessionDisplay';

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
      { key: 's1-1', startTime: '08:00', endTime: '09:00', title: 'Registration & Welcome Coffee', format: 'Networking', tracks: [], speakers: [], partners: [], cardStyle: 'break' },
      { key: 's1-2', startTime: '09:00', endTime: '10:00', title: 'Opening Ceremony & Keynote Addresses', format: 'Keynote', tracks: [{ name: 'Plenary', color: '#E8792C' }], speakers: [], partners: [], cardStyle: 'featured' },
      { key: 's1-3', startTime: '10:00', endTime: '11:00', title: 'Political Engagements: National Commitments to AI in Health', format: 'Political Engagement', tracks: [{ name: 'Plenary', color: '#E8792C' }], speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's1-4', startTime: '11:00', endTime: '11:30', title: 'Networking Break', format: 'Networking', tracks: [], speakers: [], partners: [], cardStyle: 'break' },
      { key: 's1-5', startTime: '11:30', endTime: '13:00', title: 'Panel: AI in Health Policy & Regulation', format: 'Panel Discussion', tracks: [{ name: 'Policy & Governance', color: '#14213D' }], speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's1-6', startTime: '13:00', endTime: '14:00', title: 'Lunch', format: 'Networking', tracks: [], speakers: [], partners: [], cardStyle: 'break' },
      { key: 's1-7', startTime: '14:00', endTime: '15:30', title: 'Panel: AI for Resource-Limited Settings', format: 'Panel Discussion', tracks: [{ name: 'Clinical AI & Diagnostics', color: '#0F172A' }], speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's1-8', startTime: '15:30', endTime: '17:00', title: 'Poster & Abstract Presentations', format: 'Poster & Abstract', tracks: [{ name: 'Research', color: '#64748B' }], speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's1-9', startTime: '17:00', endTime: '18:30', title: 'Welcome Reception & Networking', format: 'Networking', tracks: [], speakers: [], partners: [], cardStyle: 'break' },
    ],
  },
  {
    key: 'day2',
    sessions: [
      { key: 's2-1', startTime: '08:30', endTime: '09:00', title: 'Morning Coffee', format: 'Networking', tracks: [], speakers: [], partners: [], cardStyle: 'break' },
      { key: 's2-2', startTime: '09:00', endTime: '10:30', title: 'Startup Showcase: Live Demonstrations', format: 'Startup Showcase', tracks: [{ name: 'Venture & Investment', color: '#E8792C' }], speakers: [], partners: [], cardStyle: 'featured' },
      { key: 's2-3', startTime: '10:30', endTime: '11:00', title: 'Networking Break', format: 'Networking', tracks: [], speakers: [], partners: [], cardStyle: 'break' },
      { key: 's2-4', startTime: '11:00', endTime: '13:00', title: 'Startup Pod & Deal Room: Investor Matchmaking', format: 'Startup Showcase', tracks: [{ name: 'Venture & Investment', color: '#E8792C' }], speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's2-5', startTime: '13:00', endTime: '14:00', title: 'Lunch', format: 'Networking', tracks: [], speakers: [], partners: [], cardStyle: 'break' },
      { key: 's2-6', startTime: '14:00', endTime: '15:30', title: 'Panel: Data Interoperability & Infrastructure', format: 'Panel Discussion', tracks: [{ name: 'Infrastructure & Data', color: '#14213D' }], speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's2-7', startTime: '15:30', endTime: '16:30', title: 'Working Session: Draft National Policy Brief', format: 'Poster & Abstract', tracks: [{ name: 'Policy & Governance', color: '#64748B' }], speakers: [], partners: [], cardStyle: 'standard' },
      { key: 's2-8', startTime: '16:30', endTime: '17:15', title: 'Closing Plenary & Summit Communiqué', format: 'Keynote', tracks: [{ name: 'Plenary', color: '#E8792C' }], speakers: [], partners: [], cardStyle: 'featured' },
      { key: 's2-9', startTime: '17:15', endTime: '18:00', title: 'Closing Reception', format: 'Networking', tracks: [], speakers: [], partners: [], cardStyle: 'break' },
    ],
  },
];

export const Agenda = () => {
  const { t } = useTranslation();
  const TIME_OF_DAY_LABEL: Record<'morning' | 'afternoon' | 'evening', string> = {
    morning: t('agenda.timeOfDay.morning', 'Morning Sessions'),
    afternoon: t('agenda.timeOfDay.afternoon', 'Afternoon Sessions'),
    evening: t('agenda.timeOfDay.evening', 'Evening Sessions'),
  };
  const { lang } = useLanguage();
  const { delegate, isAuthenticated, refresh: refreshDelegate } = useDelegateAuth();
  const bookmarkedIds = useMemo(() => new Set(delegate?.bookmarkedSessionIds ?? []), [delegate]);
  const toggleBookmark = async (session: DisplaySession) => {
    try {
      if (bookmarkedIds.has(session.key)) await unbookmarkSession(session.key);
      else await bookmarkSession(session.key);
      await refreshDelegate();
    } catch {
      // A transient failure just leaves the button in its same (unchanged)
      // state to retry — nothing locally to roll back since this never
      // updates optimistically.
    }
  };
  const [dayKey, setDayKey] = useState<SessionDay>('day1');
  const [realSessions, setRealSessions] = useState<AdminSession[] | null>(null);
  const [rsvpSession, setRsvpSession] = useState<{ _id: string; title: string } | null>(null);
  const [allSpeakers, setAllSpeakers] = useState<AdminSpeaker[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<AdminSpeaker | null>(null);
  const [detailSession, setDetailSession] = useState<DisplaySession | null>(null);

  const [formatFilter, setFormatFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');

  const [buildMyDayOpen, setBuildMyDayOpen] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
  const [myDayResults, setMyDayResults] = useState<RecommendedSession[] | null>(null);
  const [myDayLoading, setMyDayLoading] = useState(false);

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
          sessions: realForDay.length > 0 ? realForDay.map((s) => fromRealSession(s, lang)) : staticDay.sessions,
          isLive: realForDay.length > 0,
        };
      }),
    [realSessions, lang]
  );

  const day = days.find((d) => d.key === dayKey)!;

  // Filter dropdown/pill options are drawn from BOTH days' real data (not just
  // the active day), so switching days doesn't make an option disappear —
  // only the sessions shown change.
  const allRealSessions = useMemo(() => (realSessions ?? []).map((s) => fromRealSession(s, lang)), [realSessions, lang]);
  const trackOptions = useMemo(() => {
    const map = new Map<string, string>();
    allRealSessions.forEach((s) => {
      s.tracks.forEach((tr) => map.set(tr.name, tr.color));
    });
    return Array.from(map.entries());
  }, [allRealSessions]);
  const toggleInterest = (name: string) => {
    setSelectedInterests((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const runBuildMyDay = async () => {
    setMyDayLoading(true);
    try {
      const results = await recommendAgenda(Array.from(selectedInterests));
      setMyDayResults(results);
    } catch {
      setMyDayResults([]);
    } finally {
      setMyDayLoading(false);
    }
  };

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
      (!trackFilter || s.tracks.some((tr) => tr.name === trackFilter)) &&
      (!roomFilter || s.room === roomFilter)
  );

  // Sessions already come back sorted by time; grouping by time-of-day here
  // just labels that existing order (Morning/Afternoon/Evening), it never
  // re-sorts.
  const sections = useMemo(() => {
    const order: ReturnType<typeof timeOfDay>[] = [];
    const map = new Map<ReturnType<typeof timeOfDay>, DisplaySession[]>();
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

  const dateLabel = DAY_DATES[dayKey].toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const dayHeading = `${dayKey === 'day1' ? t('agenda.day1', 'Day 1') : t('agenda.day2', 'Day 2')} — ${dateLabel}`;

  return (
    <>
      <SEO title="Agenda" description="Two-day schedule for the AI in Health Summit 2026 in Abuja: tracks, sessions, speakers, and formats across 19-20 October 2026." path="/agenda" />
      <PageHero
        eyebrow={t('agenda.hero.eyebrow', 'Programme')}
        title={t('agenda.hero.title', 'Two Days, One National Agenda')}
        subtitle={t(
          'agenda.hero.subtitle',
          'A working agenda combining thought leadership with actionable deal-making and policy dialogue. Final timings and speakers will be confirmed closer to the Summit.'
        )}
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
                      {key === 'day1' ? t('agenda.day1', 'Day 1') : t('agenda.day2', 'Day 2')}
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
            {t('agenda.partnerWithUs', 'Partner With Us')}
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
              {t('common.all', 'All')}
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
              <option value="">{t('agenda.filters.allTracks', 'All Tracks')}</option>
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
              <option value="">{t('agenda.filters.allRooms', 'All Rooms')}</option>
              {roomOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={() => setBuildMyDayOpen((v) => !v)}
              className={`ml-auto flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                buildMyDayOpen ? 'bg-orange text-white' : 'border border-orange/40 bg-orange/5 text-orange hover:bg-orange/10'
              }`}
            >
              <Sparkles size={14} /> {t('agenda.buildMyDay.toggle', 'Build My Day')}
            </button>
          </div>

          {buildMyDayOpen && (
            <div className="mt-4 rounded-2xl border border-orange/20 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold text-navy">{t('agenda.buildMyDay.heading', 'Build My Day')}</p>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    {t(
                      'agenda.buildMyDay.subtitle',
                      "Pick what you're interested in — we'll suggest a conflict-free personal schedule from the published sessions."
                    )}
                  </p>
                </div>
                <button onClick={() => setBuildMyDayOpen(false)} className="shrink-0 text-slate-400 hover:text-navy">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {trackOptions.map(([name]) => (
                  <button
                    key={name}
                    onClick={() => toggleInterest(name)}
                    className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                      selectedInterests.has(name) ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600 hover:border-orange/40'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <button
                onClick={runBuildMyDay}
                disabled={selectedInterests.size === 0 || myDayLoading}
                className="mt-4 flex items-center gap-1.5 rounded-lg bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-50"
              >
                <Sparkles size={14} /> {myDayLoading ? t('agenda.buildMyDay.building', 'Building…') : t('agenda.buildMyDay.showPicks', 'Show My Picks')}
              </button>

              {myDayResults && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  {myDayResults.length === 0 ? (
                    <p className="text-[13px] text-slate-500">
                      {t('agenda.buildMyDay.noMatches', 'No published sessions match those interests yet — check back closer to the Summit.')}
                    </p>
                  ) : (
                    <>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-orange">
                        {t('agenda.buildMyDay.yourPicks', 'Your Picks')} &middot; {myDayResults.length}{' '}
                        {myDayResults.length === 1 ? t('agenda.buildMyDay.sessionSingular', 'session') : t('agenda.buildMyDay.sessionPlural', 'sessions')}
                      </p>
                      <div className="mt-3 space-y-3">
                        {myDayResults.map((r) => (
                          <div key={r.session._id} className="rounded-xl border border-slate-100 bg-offwhite/60 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                              {r.session.day === 'day1' ? t('agenda.day1', 'Day 1') : t('agenda.day2', 'Day 2')} &middot; {r.session.startTime}
                            </p>
                            <p className="mt-0.5 font-semibold text-navy">
                              {(lang !== 'en' && r.session.translations?.[lang]?.title) || r.session.title}
                            </p>
                            <p className="mt-1 text-[12px] text-slate-500">{r.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="mt-4 text-[13px] text-slate-400">
            {t('agenda.summary.day', 'Day')} {dayKey === 'day1' ? '1' : '2'} &middot; {dateLabel} &mdash; {filteredSessions.length}{' '}
            {filteredSessions.length === 1 ? t('agenda.buildMyDay.sessionSingular', 'session') : t('agenda.buildMyDay.sessionPlural', 'sessions')}{' '}
            {t('agenda.summary.shown', 'shown')}
          </p>

          {!day.isLive && (
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {t('agenda.indicativeProgramme', "Indicative programme: confirmed sessions publish here as they're finalized")}
            </p>
          )}

          {/* Timeline */}
          <div className="mt-8 space-y-10">
            {sections.map((section) => (
              <div key={section.label}>
                <div className="mb-5 flex items-center gap-3">
                  <p className="shrink-0 text-xs font-bold uppercase tracking-widest text-orange">{TIME_OF_DAY_LABEL[section.label]}</p>
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
                            style={{ backgroundColor: first.tracks[0]?.color ?? '#E8792C' }}
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
                              onCardClick={setDetailSession}
                              isBookmarkable={day.isLive && isAuthenticated}
                              isBookmarked={bookmarkedIds.has(s.key)}
                              onToggleBookmark={toggleBookmark}
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
                {t('agenda.noMatches', 'No sessions match these filters yet.')}
              </p>
            )}
          </div>
        </div>
      </section>

      <SessionRsvpModal session={rsvpSession} onClose={() => setRsvpSession(null)} />
      <SpeakerModal speaker={activeSpeaker} onClose={() => setActiveSpeaker(null)} />
      <SessionDetailModal
        session={detailSession}
        dayKey={dayKey}
        dayHeading={dayHeading}
        onClose={() => setDetailSession(null)}
        onRsvp={(session) => {
          setDetailSession(null);
          setRsvpSession(session);
        }}
        onSpeakerClick={(speaker) => {
          setDetailSession(null);
          setActiveSpeaker(speaker);
        }}
        resolveSpeaker={resolveSpeaker}
        isBookmarkable={day.isLive && isAuthenticated}
        isBookmarked={detailSession ? bookmarkedIds.has(detailSession.key) : false}
        onToggleBookmark={toggleBookmark}
      />
    </>
  );
};
