import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { listPublicSessions, type AdminSession, type SessionDay } from '../../services/session.service';
import { listPublicSpeakers, type AdminSpeaker } from '../../services/speaker.service';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import { bookmarkSession, unbookmarkSession } from '../../services/delegate.service';
import { buildMultiEventIcs, downloadIcsFile } from '../../lib/calendar';
import { SessionRsvpModal } from '../../components/ui/SessionRsvpModal';
import { SpeakerModal } from '../../components/ui/SpeakerModal';
import {
  DAY_DATES,
  fromRealSession,
  timeOfDay,
  groupByStartTime,
  sessionToIcsEvent,
  SessionCard,
  SessionDetailModal,
  type DisplaySession,
  type DisplaySpeaker,
} from '../../components/agenda/sessionDisplay';

const DAY_LABEL: Record<SessionDay, string> = { day1: 'Day 1 · Mon 19 Oct', day2: 'Day 2 · Tue 20 Oct' };
const TIME_OF_DAY_LABEL: Record<'morning' | 'afternoon' | 'evening', string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

// The full published Agenda, rendered with the exact same card + detail
// modal as the public page (components/agenda/sessionDisplay.tsx) — just
// without that page's hero/filters/Build-My-Day chrome, since this is meant
// to be the quick, lightweight version a logged-in delegate browses from
// inside their own portal. Bookmarking works from either the card's own
// toggle or the modal's — both write to the same place.
export const PortalMyAgenda = () => {
  // No language toggle inside the portal (LanguageProvider only wraps the
  // public site) — every delegate sees the English session content here,
  // same as every other portal page.
  const lang = 'en';
  const { delegate, refresh: refreshDelegate } = useDelegateAuth();
  const bookmarkedIds = useMemo(() => new Set(delegate?.bookmarkedSessionIds ?? []), [delegate]);

  const [dayKey, setDayKey] = useState<SessionDay>('day1');
  const [realSessions, setRealSessions] = useState<AdminSession[] | null>(null);
  const [allSpeakers, setAllSpeakers] = useState<AdminSpeaker[]>([]);
  const [rsvpSession, setRsvpSession] = useState<{ _id: string; title: string } | null>(null);
  const [activeSpeaker, setActiveSpeaker] = useState<AdminSpeaker | null>(null);
  const [detailSession, setDetailSession] = useState<DisplaySession | null>(null);

  useEffect(() => {
    listPublicSessions()
      .then(setRealSessions)
      .catch(() => setRealSessions([]));
    listPublicSpeakers()
      .then(setAllSpeakers)
      .catch(() => setAllSpeakers([]));
  }, []);

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

  const allDisplaySessions = useMemo(() => (realSessions ?? []).map((s) => fromRealSession(s, lang)), [realSessions, lang]);
  // Keyed by session id so the bookmark export below can look a session's
  // real day back up without re-scanning realSessions for each one.
  const dayById = useMemo(() => new Map((realSessions ?? []).map((s) => [s._id, s.day])), [realSessions]);
  const daySessions = useMemo(
    () => allDisplaySessions.filter((s) => dayById.get(s.key) === dayKey),
    [allDisplaySessions, dayById, dayKey]
  );
  const sections = useMemo(() => {
    const order: ReturnType<typeof timeOfDay>[] = [];
    const map = new Map<ReturnType<typeof timeOfDay>, DisplaySession[]>();
    daySessions.forEach((s) => {
      const label = timeOfDay(s.startTime);
      if (!map.has(label)) {
        map.set(label, []);
        order.push(label);
      }
      map.get(label)!.push(s);
    });
    return order.map((label) => ({ label, sessions: map.get(label)! }));
  }, [daySessions]);

  const toggleBookmark = async (session: DisplaySession) => {
    try {
      if (bookmarkedIds.has(session.key)) await unbookmarkSession(session.key);
      else await bookmarkSession(session.key);
      await refreshDelegate();
    } catch {
      // Transient failure — the button just stays in its current state to retry.
    }
  };

  const downloadMyBookmarks = () => {
    const events = allDisplaySessions
      .filter((s) => bookmarkedIds.has(s.key))
      .map((s) => sessionToIcsEvent(s, dayById.get(s.key)!));
    downloadIcsFile(buildMultiEventIcs(events), 'my-aihs-2026-agenda.ics');
  };

  const bookmarkedCount = allDisplaySessions.filter((s) => bookmarkedIds.has(s.key)).length;
  const dayHeading = DAY_LABEL[dayKey];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Full Programme</p>
          <h1 className="font-display text-2xl font-semibold text-navy">My Agenda</h1>
          <p className="mt-1 text-sm text-slate-500">Tap any session for full details — tap the bookmark icon to save it.</p>
        </div>
        {bookmarkedCount > 0 && (
          <button
            onClick={downloadMyBookmarks}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
          >
            <Download size={15} /> Download Bookmarked ({bookmarkedCount})
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(Object.keys(DAY_DATES) as SessionDay[]).map((key) => (
          <button
            key={key}
            onClick={() => setDayKey(key)}
            className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${
              key === dayKey ? 'bg-navy text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-orange/40'
            }`}
          >
            {DAY_LABEL[key]}
          </button>
        ))}
      </div>

      {realSessions === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : daySessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No published sessions for this day yet — check back closer to the Summit.
        </p>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-orange">{TIME_OF_DAY_LABEL[section.label]}</p>
              <div className="space-y-3">
                {groupByStartTime(section.sessions).map((group) => (
                  <div key={group[0].key} className={group.length > 1 ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : ''}>
                    {group.map((s) => (
                      <SessionCard
                        key={s.key}
                        s={s}
                        onRsvp={setRsvpSession}
                        onSpeakerClick={setActiveSpeaker}
                        resolveSpeaker={resolveSpeaker}
                        onCardClick={setDetailSession}
                        isBookmarkable
                        isBookmarked={bookmarkedIds.has(s.key)}
                        onToggleBookmark={toggleBookmark}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
        isBookmarkable
        isBookmarked={detailSession ? bookmarkedIds.has(detailSession.key) : false}
        onToggleBookmark={toggleBookmark}
      />
    </div>
  );
};
