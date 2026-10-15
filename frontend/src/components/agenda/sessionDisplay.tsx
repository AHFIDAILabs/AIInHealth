import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, CalendarCheck, CalendarPlus, ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AdminSession, SessionDay, SessionCardStyle, SessionPartnerRef } from '../../services/session.service';
import type { AdminSpeaker } from '../../services/speaker.service';
import type { SiteLanguage } from '../../contexts/LanguageContext';
import { buildMultiEventIcs, downloadIcsFile, sessionDateRange, type IcsEvent } from '../../lib/calendar';

// Shared by the public Agenda page and the delegate portal's "My Agenda"
// page — both render the exact same session card + detail modal (the portal
// just doesn't add the public page's own hero/filters/Build-My-Day chrome
// around them), and both need to offer the same bookmark toggle in both
// places. Extracted here once two consumers needed it, rather than forking
// a second near-identical copy of either component.

export interface DisplaySpeaker {
  _id: string;
  fullName: string;
  title?: string;
  photoUrl?: string;
}

export interface DisplaySession {
  key: string;
  startTime: string;
  endTime: string;
  title: string;
  format: string;
  tracks: { name: string; color: string }[];
  room?: string;
  speakers: DisplaySpeaker[];
  moderator?: DisplaySpeaker;
  partners: SessionPartnerRef[];
  description?: string;
  requiresRsvp?: boolean;
  cardStyle: SessionCardStyle;
}

// The Summit's two real calendar days — kept in sync with
// SessionsListTab.tsx's own DAY_TO_DATE and jobs/sessionReminder.job.ts.
export const DAY_DATES: Record<SessionDay, Date> = {
  day1: new Date('2026-10-19T00:00:00+01:00'),
  day2: new Date('2026-10-20T00:00:00+01:00'),
};

// `s.translations` only ever carries a language key when that translation's
// status is 'approved' — the backend strips drafts before this even reaches
// the public API (see utils/translations.ts) — so no separate status check
// is needed here beyond the `||` fallback to English.
export const fromRealSession = (s: AdminSession, lang: SiteLanguage): DisplaySession => {
  const t = lang !== 'en' ? s.translations?.[lang] : undefined;
  return {
    key: s._id,
    startTime: s.startTime,
    endTime: s.endTime,
    title: t?.title || s.title,
    format: s.format,
    tracks: s.tracks.map((tr) => ({ name: tr.name, color: tr.color })),
    room: s.room,
    speakers: s.speakers,
    moderator: s.moderator ?? undefined,
    partners: s.partners,
    description: t?.description || s.description,
    requiresRsvp: s.requiresRsvp,
    cardStyle: s.cardStyle ?? 'standard',
  };
};

// Stable, untranslated ids — used as section.label for grouping/React keys.
export const timeOfDay = (startTime: string): 'morning' | 'afternoon' | 'evening' => {
  const hour = Number(startTime.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

// Two or more parallel-track sessions sharing a start time get one shared
// timeline rail with their cards laid out in a row instead of each getting
// its own full-width row. A 'break' card is never grouped — it always sits
// alone even if its time happens to coincide with something else.
export const groupByStartTime = (sessions: DisplaySession[]): DisplaySession[][] => {
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

const pad2 = (n: number) => String(n).padStart(2, '0');
const toIcsUtcStamp = (date: Date) =>
  `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(
    date.getUTCMinutes()
  )}${pad2(date.getUTCSeconds())}Z`;

const getSessionDateRange = (session: DisplaySession, dayKey: SessionDay): { start: Date; end: Date } =>
  sessionDateRange(dayKey, session.startTime, session.endTime);

// Most visitors use Google or Outlook on the web, where the right UX is a
// prefilled "create event" page opened in a new tab — never a file landing
// silently in their Downloads folder. Only Apple Calendar/other desktop
// apps genuinely need a real .ics file, so that's offered as a
// clearly-labeled fallback, not the default click action.
export const googleCalendarUrl = (session: DisplaySession, dayKey: SessionDay): string => {
  const { start, end } = getSessionDateRange(session, dayKey);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.title,
    dates: `${toIcsUtcStamp(start)}/${toIcsUtcStamp(end)}`,
    details: session.description ?? '',
    location: session.room ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const outlookCalendarUrl = (session: DisplaySession, dayKey: SessionDay): string => {
  const { start, end } = getSessionDateRange(session, dayKey);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: session.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: session.description ?? '',
    location: session.room ?? '',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

// Same UID scheme (session.key@aiinhealthsummit.org) the portal's "download
// my bookmarks" export uses too, so re-adding a session from either place
// updates the same calendar entry rather than creating a duplicate.
export const sessionToIcsEvent = (session: DisplaySession, dayKey: SessionDay): IcsEvent => {
  const { start, end } = getSessionDateRange(session, dayKey);
  return {
    uid: `${session.key}@aiinhealthsummit.org`,
    start,
    end,
    summary: session.title,
    description: session.description,
    location: session.room,
  };
};

// Downloads a single-event .ics file — the Apple Calendar/"other app"
// option in the Add to Calendar menu, not the default click action.
export const downloadSessionIcs = (session: DisplaySession, dayKey: SessionDay) => {
  const filename = `${session.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60)}.ics`;
  downloadIcsFile(buildMultiEventIcs([sessionToIcsEvent(session, dayKey)], '-//AI in Health Summit 2026//Agenda//EN'), filename);
};

// 'break' never actually reaches CARD_STYLE_CLASSES[...] at runtime — a break
// card always renders its own standalone bar, never SessionCard — but SessionCard
// takes a plain DisplaySession prop (its cardStyle isn't narrowed the way the old
// inline-ternary version had it), so the type needs an entry for every
// SessionCardStyle even though this one is dead.
export const CARD_STYLE_CLASSES: Record<SessionCardStyle, string> = {
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
  onCardClick: (session: DisplaySession) => void;
  // Bookmarking only makes sense for a real, logged-in-delegate-viewable
  // session — never offered on the illustrative placeholder agenda (see
  // the public page's STATIC_DAYS/day.isLive) or to an anonymous visitor.
  isBookmarkable: boolean;
  isBookmarked: boolean;
  onToggleBookmark: (session: DisplaySession) => void;
}

// A real top-level component, not one declared inside a page's render body —
// a locally-declared component gets a brand-new identity on every render of
// its parent, which makes React remount it (and can make sibling instances'
// state bleed together) instead of preserving each card's own
// briefExpanded state independently. Every value it needs from the caller's
// scope (the RSVP/speaker-modal openers, resolveSpeaker) is passed in as a
// prop instead of closed over.
export const SessionCard = ({ s, onRsvp, onSpeakerClick, resolveSpeaker, onCardClick, isBookmarkable, isBookmarked, onToggleBookmark }: SessionCardProps) => {
  const { t } = useTranslation();
  const [briefExpanded, setBriefExpanded] = useState(false);
  // A short brief (a one-line room note, say) never needs a toggle at all —
  // only the longer ones (e.g. a full list of oral abstract titles, per the
  // Oral Abstracts session type) default to collapsed.
  const briefIsLong = (s.description?.length ?? 0) > 220;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCardClick(s)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick(s);
        }
      }}
      className={`flex-1 cursor-pointer rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md ${
        s.cardStyle === 'standard' ? `${CARD_STYLE_CLASSES.standard} border-l-4` : CARD_STYLE_CLASSES[s.cardStyle]
      }`}
      style={s.cardStyle === 'standard' ? { borderLeftColor: s.tracks[0]?.color ?? '#E8792C' } : undefined}
    >
      {/* flex-col by default — min-w-0 on the content column lets it shrink
          arbitrarily, so a plain flex-wrap row never actually wraps (both
          columns keep fitting side by side); at mobile widths that squeezed
          the title/badges down to one word per line while the partner logos
          held their ground, and the track badge's rounded-full pill ballooned
          into visual overlap with the logos next to it. Only sm+ and up
          reverts to sitting the partner logos beside the content. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                s.cardStyle === 'standard' ? 'bg-orange/10 text-orange' : 'bg-white/15 text-white'
              }`}
            >
              {s.format}
            </span>
            {s.tracks.map((tr) => (
              <span
                key={tr.name}
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  s.cardStyle === 'standard' ? 'bg-offwhite text-slate-500' : 'bg-white/10 text-slate-200'
                }`}
              >
                {tr.name}
              </span>
            ))}
            {s.requiresRsvp && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRsvp({ _id: s.key, title: s.title });
                }}
                className="flex items-center gap-1 rounded-full bg-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-orange-hover"
              >
                <CalendarCheck size={11} /> {t('agenda.card.rsvp', 'RSVP')}
              </button>
            )}
            {isBookmarkable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(s);
                }}
                title={isBookmarked ? t('agenda.card.removeBookmark', 'Remove from My Agenda') : t('agenda.card.addBookmark', 'Save to My Agenda')}
                aria-pressed={isBookmarked}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  isBookmarked
                    ? 'bg-orange text-white'
                    : s.cardStyle === 'standard'
                      ? 'bg-offwhite text-slate-500 hover:bg-orange/10 hover:text-orange'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <Bookmark size={11} fill={isBookmarked ? 'currentColor' : 'none'} />
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
                {t('agenda.card.sessionBrief', 'Session Brief')}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setBriefExpanded((prev) => !prev);
                  }}
                  className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${
                    s.cardStyle === 'standard' ? 'text-orange hover:text-orange-hover' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {briefExpanded ? t('agenda.card.showLess', 'Show less') : t('agenda.card.readMore', 'Read more')}
                  <ChevronDown size={12} className={`transition-transform ${briefExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
          )}

          {/* Moderator and Speakers used to be two stacked blocks (each with
              its own "MODERATOR"/implicit label above a row of chips) —
              reads here as one row instead: speakers on the left, the
              moderator chip pushed to the far right via ml-auto, with its
              own small "MOD" tag so the two are still clearly distinct at a
              glance without needing a separate line each. */}
          {(s.speakers.length > 0 || s.moderator) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {s.speakers.map((sp) => (
                <button
                  key={sp._id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSpeakerClick(resolveSpeaker(sp, s.tracks[0]?.name ?? t('agenda.card.generalSession', 'General Session')));
                  }}
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

              {s.moderator && (
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${s.cardStyle === 'standard' ? 'text-slate-400' : 'text-slate-400'}`}>
                    {t('agenda.detail.moderator', 'Moderator')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSpeakerClick(resolveSpeaker(s.moderator!, s.tracks[0]?.name ?? t('agenda.card.generalSession', 'General Session')));
                    }}
                    className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-left transition-colors ${
                      s.cardStyle === 'standard'
                        ? 'border-slate-200 bg-white hover:border-orange/40 hover:bg-orange/5'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy text-[10px] font-semibold text-white">
                      {s.moderator.photoUrl ? (
                        <img src={s.moderator.photoUrl} alt={s.moderator.fullName} className="h-full w-full object-cover" />
                      ) : (
                        s.moderator.fullName[0]
                      )}
                    </span>
                    <span className={`text-xs font-medium ${s.cardStyle === 'standard' ? 'text-navy' : 'text-white'}`}>
                      {s.moderator.fullName}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {s.partners.length > 0 && (
          <div className="flex flex-wrap gap-3 sm:shrink-0 sm:justify-end">
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

interface PersonRowProps {
  person: DisplaySpeaker;
  onClick: () => void;
}

// One speaker/moderator row inside the session detail panel — avatar, name,
// title — shared by both the Moderator and Speakers sections below so the
// two read as the same visual "person card" the reference design uses.
const PersonRow = ({ person, onClick }: PersonRowProps) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition-colors hover:border-orange/30 hover:bg-orange/5"
  >
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy text-sm font-semibold text-white">
      {person.photoUrl ? <img src={person.photoUrl} alt={person.fullName} className="h-full w-full object-cover" /> : person.fullName[0]}
    </span>
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-navy">{person.fullName}</span>
      {person.title && <span className="block truncate text-xs text-slate-500">{person.title}</span>}
    </span>
  </button>
);

interface SessionDetailModalProps {
  session: DisplaySession | null;
  dayKey: SessionDay;
  dayHeading: string;
  onClose: () => void;
  onRsvp: (session: { _id: string; title: string }) => void;
  onSpeakerClick: (speaker: AdminSpeaker) => void;
  resolveSpeaker: (sp: DisplaySpeaker, trackName: string) => AdminSpeaker;
  // Same meaning as SessionCardProps above — omitted entirely (no bookmark
  // button rendered) when the viewer can't bookmark at all.
  isBookmarkable?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: (session: DisplaySession) => void;
}

// Right-side slide-over showing a session's full detail — same
// AnimatePresence overlay+panel pattern already used for admin slide-overs
// (AccessCodesPage.tsx, ScholarshipApplicationsPage.tsx), reused here for
// the "tap a session to see everything about it" interaction on both the
// public Agenda page and the delegate portal's "My Agenda" page.
// Moderator is a distinct, single field on the session (Session.model.ts),
// separate from speakers[] — shown in its own section above Speakers,
// exactly like the reference design, whenever a session has one set.
export const SessionDetailModal = ({
  session,
  dayKey,
  dayHeading,
  onClose,
  onRsvp,
  onSpeakerClick,
  resolveSpeaker,
  isBookmarkable,
  isBookmarked,
  onToggleBookmark,
}: SessionDetailModalProps) => {
  const { t } = useTranslation();
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);
  const metaLine = [session?.tracks.map((tr) => tr.name).join(', ') || null, session?.room ? `${t('agenda.detail.room', 'Room')}: ${session.room}` : null]
    .filter(Boolean)
    .join(' · ');

  // The menu belongs to whichever session is currently showing — reset it
  // any time the panel closes/switches sessions rather than letting it
  // silently stay open into the next session's panel.
  useEffect(() => {
    setCalendarMenuOpen(false);
  }, [session]);

  return (
    <AnimatePresence>
      {session && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-navy/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <span className="rounded-full bg-orange/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-orange">
                {session.format}
              </span>
              <div className="flex shrink-0 items-center gap-3">
                {isBookmarkable && onToggleBookmark && (
                  <button
                    type="button"
                    onClick={() => onToggleBookmark(session)}
                    title={isBookmarked ? t('agenda.card.removeBookmark', 'Remove from My Agenda') : t('agenda.card.addBookmark', 'Save to My Agenda')}
                    aria-pressed={isBookmarked}
                    className={`rounded-full p-1.5 transition-colors ${isBookmarked ? 'text-orange' : 'text-slate-400 hover:text-orange'}`}
                  >
                    <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
                  </button>
                )}
                <button type="button" onClick={onClose} aria-label={t('common.close', 'Close')} className="text-slate-400 hover:text-navy">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <h2 className="font-display text-xl font-bold leading-snug text-navy">{session.title}</h2>
              <p className="mt-2 text-[13px] font-medium text-slate-500">
                {dayHeading} &middot; {session.startTime} &ndash; {session.endTime}
              </p>
              {metaLine && <p className="mt-1 text-[13px] text-slate-500">{metaLine}</p>}

              {session.description && (
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{session.description}</p>
              )}

              {session.moderator && (
                <div className="mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {t('agenda.detail.moderator', 'Moderator')}
                  </p>
                  <div className="mt-3">
                    <PersonRow
                      person={session.moderator}
                      onClick={() =>
                        onSpeakerClick(resolveSpeaker(session.moderator!, session.tracks[0]?.name ?? t('agenda.card.generalSession', 'General Session')))
                      }
                    />
                  </div>
                </div>
              )}

              {session.speakers.length > 0 && (
                <div className="mt-6">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    {t('agenda.detail.speakers', 'Speakers')}
                  </p>
                  <div className="mt-3 space-y-2.5">
                    {session.speakers.map((sp) => (
                      <PersonRow
                        key={sp._id}
                        person={sp}
                        onClick={() => onSpeakerClick(resolveSpeaker(sp, session.tracks[0]?.name ?? t('agenda.card.generalSession', 'General Session')))}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-slate-100 p-4">
              {session.requiresRsvp && (
                <button
                  type="button"
                  onClick={() => onRsvp({ _id: session.key, title: session.title })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-semibold text-white hover:bg-navy/90"
                >
                  <CalendarCheck size={16} /> {t('agenda.card.rsvp', 'RSVP')}
                </button>
              )}
              <div className="relative">
                {calendarMenuOpen && (
                  <>
                    {/* Click-away catcher — sits behind the menu (lower in
                        this stacking context) so any click outside the menu
                        itself closes it instead of triggering whatever's
                        underneath. */}
                    <div className="fixed inset-0 z-10" onClick={() => setCalendarMenuOpen(false)} />
                    <div className="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <a
                        href={googleCalendarUrl(session, dayKey)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setCalendarMenuOpen(false)}
                        className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-offwhite"
                      >
                        {t('agenda.detail.googleCalendar', 'Google Calendar')}
                      </a>
                      <a
                        href={outlookCalendarUrl(session, dayKey)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setCalendarMenuOpen(false)}
                        className="block border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-navy hover:bg-offwhite"
                      >
                        {t('agenda.detail.outlookCalendar', 'Outlook Calendar')}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          downloadSessionIcs(session, dayKey);
                          setCalendarMenuOpen(false);
                        }}
                        className="block w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-navy hover:bg-offwhite"
                      >
                        {t('agenda.detail.appleCalendar', 'Apple Calendar / Other (.ics file)')}
                      </button>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setCalendarMenuOpen((prev) => !prev)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-navy/20 py-3 text-sm font-semibold text-navy hover:bg-navy/5"
                >
                  <CalendarPlus size={16} /> {t('agenda.detail.addToCalendar', 'Add to My Calendar')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
