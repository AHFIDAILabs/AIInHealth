import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  CheckCircle2,
  Clock,
  Bell,
  BellOff,
  Users2,
  Trophy,
  Pencil,
  Check,
  X,
  Mail,
  CalendarPlus,
  Download,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import {
  fetchTicketQr,
  resendTicketEmail,
  updateDirectoryOptIn,
  updateLeaderboardOptIn,
  updateDelegateProfile,
  enableDelegatePush,
  disableDelegatePush,
  isDelegatePushSupported,
  fetchMyBookmarks,
} from '../../services/delegate.service';
import type { Gender } from '../../services/registration.service';
import { getApiErrorMessage } from '../../services/api';
import { getCachedTicketQr, setCachedTicketQr } from '../../lib/ticketQrCache';
import { downloadSummitIcs, googleCalendarUrl, outlookCalendarUrl } from '../../lib/calendar';
import {
  fromRealSession,
  googleCalendarUrl as sessionGoogleCalendarUrl,
  outlookCalendarUrl as sessionOutlookCalendarUrl,
  downloadSessionIcs,
} from '../../components/agenda/sessionDisplay';
import { useToast } from '../../contexts/ToastContext';
import { LightField } from '../../components/ui/LightField';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { Avatar } from '../../components/ui/Avatar';
import { ImagePicker } from '../../components/ui/ImagePicker';
import { uploadDelegateImage } from '../../services/upload.service';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending Review',
  reviewed: 'Under Review',
  confirmed: 'Confirmed',
  declined: 'Declined',
};

// Directory is hidden (not deleted) for now — see PortalLayout.tsx/App.tsx's
// matching flag.
const DIRECTORY_ENABLED = import.meta.env.VITE_DIRECTORY_ENABLED === 'true';
const LEADERBOARD_ENABLED = import.meta.env.VITE_LEADERBOARD_ENABLED === 'true';
// Mirrors backend/src/utils/engagementScoring.ts's SENSITIVE_LEADERBOARD_CATEGORIES
// — copy-only here (the actual visibility decision is fully server-computed),
// so this delegate sees an accurate "your category is private by default"
// message instead of a generic one.
const SENSITIVE_LEADERBOARD_CATEGORIES = ['vip', 'government_official', 'speaker'];

export const PortalHome = () => {
  const { delegate, refresh } = useDelegateAuth();
  const toast = useToast();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const [qrIsCached, setQrIsCached] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [optInBusy, setOptInBusy] = useState(false);
  const [leaderboardOptInBusy, setLeaderboardOptInBusy] = useState(false);
  const [resendingTicket, setResendingTicket] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileOrg, setProfileOrg] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [bookmarkedSessions, setBookmarkedSessions] = useState<Awaited<ReturnType<typeof fetchMyBookmarks>> | null>(null);
  const [openCalendarFor, setOpenCalendarFor] = useState<string | null>(null);
  const [genderBusy, setGenderBusy] = useState(false);

  useEffect(() => {
    if (!delegate?.hasTicket) return;
    // Reset before refetching — otherwise a stale QR or stale error from a previous
    // ticket state can linger on screen if hasTicket flips true→true across a refresh
    // (e.g. after a profile/payment update) without ever passing through the "no
    // ticket yet" branch that would have cleared them.
    setQrDataUrl('');
    setQrError('');
    setQrIsCached(false);
    fetchTicketQr()
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
        setCachedTicketQr(delegate.id, dataUrl);
      })
      .catch((err) => {
        // Offline/network failure specifically (not e.g. a 404 for "no ticket")
        // falls back to whatever was last cached for THIS registration — the
        // scenario this exists for is a phone losing signal at the door. The
        // check-in scan itself is still the live, authoritative check; this is
        // display-only, so a revoked/declined ticket simply fails at the scan
        // even though the stale QR still renders here — expected, not a bug.
        const isNetworkFailure = axios.isAxiosError(err) && !err.response;
        const cached = isNetworkFailure ? getCachedTicketQr(delegate.id) : null;
        if (cached) {
          setQrDataUrl(cached);
          setQrIsCached(true);
        } else {
          setQrError(getApiErrorMessage(err));
        }
      });
  }, [delegate?.hasTicket, delegate?.id]);

  useEffect(() => {
    if (!isDelegatePushSupported()) return;
    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setPushEnabled(Boolean(sub));
    });
  }, []);

  // Full session data for whatever this delegate has bookmarked from the
  // public Agenda / "My Agenda" portal page — re-fetched whenever the bookmark
  // COUNT changes (bookmarking/un-bookmarking elsewhere only updates the id
  // list on `delegate`, not this page's own full-session copy).
  const bookmarkedCount = delegate?.bookmarkedSessionIds?.length ?? 0;
  useEffect(() => {
    if (bookmarkedCount === 0) {
      setBookmarkedSessions([]);
      return;
    }
    fetchMyBookmarks()
      .then(setBookmarkedSessions)
      .catch(() => setBookmarkedSessions([]));
  }, [bookmarkedCount]);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disableDelegatePush();
        setPushEnabled(false);
        toast('success', 'Push notifications turned off');
      } else {
        await enableDelegatePush();
        setPushEnabled(true);
        toast('success', "You'll now get event updates on this device");
      }
    } catch (err) {
      toast('error', getApiErrorMessage(err, 'Could not update push notifications.'));
    } finally {
      setPushBusy(false);
    }
  };

  const resendTicket = async () => {
    setResendingTicket(true);
    try {
      const sentTo = await resendTicketEmail();
      toast('success', `Sent to ${sentTo}`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setResendingTicket(false);
    }
  };

  const toggleDirectory = async () => {
    if (!delegate) return;
    setOptInBusy(true);
    try {
      await updateDirectoryOptIn(!delegate.directoryOptIn);
      await refresh();
      toast('success', delegate.directoryOptIn ? 'You are no longer listed in the directory' : "You're now listed in the directory");
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setOptInBusy(false);
    }
  };

  // isCurrentlyVisible reads the server-resolved leaderboardVisible (team
  // exclusion + category default + this flag already collapsed into one
  // boolean by the scoring job) rather than the raw leaderboardOptIn flag, so
  // the button's own label always matches reality instead of a sensitive
  // delegate's un-set flag reading as "hidden" when they'd already opted in.
  const toggleLeaderboard = async () => {
    if (!delegate) return;
    setLeaderboardOptInBusy(true);
    try {
      await updateLeaderboardOptIn(!delegate.leaderboardVisible);
      await refresh();
      // The score/rank itself only updates on the next scheduled recompute
      // (every ~10 min) — the opt-in choice is saved immediately, but it's
      // honest to say "within a few minutes" rather than implying it's live.
      toast(
        'success',
        delegate.leaderboardVisible
          ? "You'll be off the public leaderboard within a few minutes"
          : "You'll appear on the public leaderboard within a few minutes"
      );
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setLeaderboardOptInBusy(false);
    }
  };

  // One-tap answer, no need to open the full edit-profile panel for a single
  // optional field — see backend/src/types/enums.ts's GENDERS comment on why
  // the portal is one of three chances to catch this (most attendees are
  // already registered, so a registration-form-only change would miss them).
  const submitGender = async (gender: Gender) => {
    setGenderBusy(true);
    try {
      await updateDelegateProfile({ gender });
      await refresh();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setGenderBusy(false);
    }
  };

  const openEditProfile = () => {
    if (!delegate) return;
    setProfileName(delegate.name);
    setProfilePhone(delegate.phone ?? '');
    setProfileOrg(delegate.organization ?? '');
    setProfileAvatarUrl(delegate.avatarUrl ?? '');
    setProfileError('');
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    if (!profileName.trim()) {
      setProfileError('Enter your full name.');
      return;
    }
    setSavingProfile(true);
    setProfileError('');
    try {
      await updateDelegateProfile({
        name: profileName.trim(),
        phone: profilePhone.trim(),
        organization: profileOrg.trim(),
        avatarUrl: profileAvatarUrl.trim(),
      });
      await refresh();
      toast('success', 'Profile updated');
      setEditingProfile(false);
    } catch (err) {
      setProfileError(getApiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  if (!delegate) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Welcome back</p>
        {editingProfile ? (
          <div className="mt-3 max-w-md rounded-2xl border border-slate-200 bg-white p-5">
            {profileError && <p className="mb-3 text-sm font-medium text-danger">{profileError}</p>}
            <ImagePicker
              value={profileAvatarUrl}
              onChange={setProfileAvatarUrl}
              upload={uploadDelegateImage}
              size={52}
              fallbackText={profileName || delegate.name}
            />
            <p className="mt-1.5 text-xs text-slate-400">Used by event staff to recognize you at the event.</p>
            <div className="mt-4 space-y-4">
              <LightField label="Full Name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              <LightField label="Phone" type="tel" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
              {delegate.type !== 'exhibitor' && delegate.type !== 'sponsor' && (
                <LightField label="Organization" value={profileOrg} onChange={(e) => setProfileOrg(e.target.value)} />
              )}
            </div>
            <div className="mt-4 flex gap-2.5">
              <Button type="button" variant="primary" loading={savingProfile} onClick={saveProfile} className="!px-4 !py-2 !text-sm">
                <Check size={15} className="mr-1" /> Save
              </Button>
              <button
                onClick={() => setEditingProfile(false)}
                disabled={savingProfile}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-navy"
              >
                <X size={15} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2.5">
            <Avatar name={delegate.name} avatarUrl={delegate.avatarUrl} size={44} />
            <div>
              <h1 className="font-display text-2xl font-semibold text-navy">{delegate.name}</h1>
              {delegate.organization && <p className="text-sm text-slate-500">{delegate.organization}</p>}
            </div>
            <button
              onClick={openEditProfile}
              title="Edit profile"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-offwhite hover:text-orange"
            >
              <Pencil size={15} />
            </button>
          </div>
        )}
      </div>

      {!delegate.avatarUrl && !editingProfile && (
        <Banner variant="info">
          Add a profile photo so our team can recognize you at the event:{' '}
          <button onClick={openEditProfile} className="font-semibold underline underline-offset-2">
            complete your profile
          </button>
          .
        </Banner>
      )}

      {delegate.gender === null && (
        <Banner variant="info">
          <div className="flex flex-wrap items-center gap-2.5">
            <span>Help with our event planning — what&rsquo;s your gender? (optional)</span>
            <div className="flex flex-wrap gap-1.5">
              {(['female', 'male', 'prefer_not_to_say'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => submitGender(option)}
                  disabled={genderBusy}
                  className="rounded-full border border-info/40 bg-white px-3 py-1 text-xs font-semibold text-info hover:bg-info/10 disabled:opacity-60"
                >
                  {option === 'prefer_not_to_say' ? 'Prefer not to say' : option === 'female' ? 'Female' : 'Male'}
                </button>
              ))}
            </div>
          </div>
        </Banner>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* E-ticket / QR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your E-Ticket</p>
          {delegate.checkedIn && (
            <div className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <CheckCircle2 size={13} />
              Checked in{delegate.checkedInAt && ` — ${new Date(delegate.checkedInAt).toLocaleString('en-GB')}`}
            </div>
          )}
          {qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="Your check-in QR code" className="mx-auto mt-4 h-48 w-48 rounded-xl border border-slate-100" />
              <p className="mt-3 text-xs text-slate-400">
                {delegate.checkedIn
                  ? 'This is a 2-day event — keep this QR code for re-entry on day 2.'
                  : qrIsCached
                    ? "Showing your last saved ticket. You're offline right now, but this still works at the desk."
                    : 'Show this at the registration desk on event day.'}
              </p>
              <button
                onClick={resendTicket}
                disabled={resendingTicket}
                className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-semibold text-orange hover:text-orange-hover disabled:opacity-50"
              >
                <Mail size={13} /> {resendingTicket ? 'Sending…' : 'Email me this ticket'}
              </button>
            </>
          ) : qrError ? (
            <p className="mt-6 py-6 text-sm text-slate-500">{qrError}</p>
          ) : (
            <div className="mt-6 flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
              <Clock size={15} /> {delegate.hasTicket ? 'Loading your ticket…' : 'Your ticket will appear here once confirmed.'}
            </div>
          )}
        </div>

        {/* Status summary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registration</p>
          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-semibold text-navy">{STATUS_LABEL[delegate.status] ?? delegate.status}</dd>
            </div>
            {delegate.ticketCategory && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Ticket Category</dt>
                <dd className="font-semibold capitalize text-navy">{delegate.ticketCategory.replace(/_/g, ' ')}</dd>
              </div>
            )}
            {delegate.trackAssigned && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Track Assigned</dt>
                <dd className="font-semibold text-navy">{delegate.trackAssigned}</dd>
              </div>
            )}
            {!delegate.trackAssigned && delegate.trackSelected && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Track Selected</dt>
                <dd className="font-semibold text-navy">{delegate.trackSelected}</dd>
              </div>
            )}
            {delegate.tshirtSize && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">T-Shirt Size</dt>
                <dd className="font-semibold text-navy">{delegate.tshirtSize}</dd>
              </div>
            )}
            {delegate.paymentStatus !== 'not_required' && (
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Payment</dt>
                <dd className="font-semibold capitalize text-navy">{delegate.paymentStatus}</dd>
              </div>
            )}
          </dl>

          <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
            <button
              onClick={togglePush}
              disabled={pushBusy}
              className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-left text-[13px] font-medium text-navy transition-colors hover:border-orange/40 disabled:opacity-60"
            >
              {pushEnabled ? <Bell size={15} className="text-orange" /> : <BellOff size={15} className="text-slate-400" />}
              {pushEnabled ? 'Event push notifications on' : 'Enable event push notifications'}
            </button>
            {DIRECTORY_ENABLED && (
              <button
                onClick={toggleDirectory}
                disabled={optInBusy}
                className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-left text-[13px] font-medium text-navy transition-colors hover:border-orange/40 disabled:opacity-60"
              >
                <Users2 size={15} className={delegate.directoryOptIn ? 'text-orange' : 'text-slate-400'} />
                {delegate.directoryOptIn ? 'Listed in delegate directory' : 'Join the delegate directory'}
              </button>
            )}
            {LEADERBOARD_ENABLED && (
              <button
                onClick={toggleLeaderboard}
                disabled={leaderboardOptInBusy}
                className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-left text-[13px] font-medium text-navy transition-colors hover:border-orange/40 disabled:opacity-60"
              >
                <Trophy size={15} className={delegate.leaderboardVisible ? 'text-orange' : 'text-slate-400'} />
                {delegate.leaderboardVisible
                  ? 'Listed on the public leaderboard'
                  : SENSITIVE_LEADERBOARD_CATEGORIES.includes(delegate.ticketCategory ?? '')
                    ? 'Your category is private by default — join the leaderboard'
                    : 'Join the public leaderboard'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RSVP — add the Summit to a personal calendar. Only meaningful once
          the registration is actually confirmed (status gate matches the
          E-Ticket panel above), since a pending/declined registration has
          nothing to RSVP to yet. */}
      {delegate.status === 'confirmed' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">RSVP</p>
          <p className="mt-1.5 text-sm text-slate-500">
            Add the Summit to your calendar — 19&ndash;20 October 2026.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <a
              href={googleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-[13px] font-medium text-navy transition-colors hover:border-orange/40"
            >
              <CalendarPlus size={15} className="text-orange" /> Google Calendar
            </a>
            <a
              href={outlookCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-[13px] font-medium text-navy transition-colors hover:border-orange/40"
            >
              <CalendarPlus size={15} className="text-orange" /> Outlook
            </a>
            <button
              onClick={downloadSummitIcs}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-[13px] font-medium text-navy transition-colors hover:border-orange/40"
            >
              <Download size={15} className="text-orange" /> Apple / Download .ics
            </button>
          </div>
        </div>
      )}

      {/* Bookmarked sessions — same compact row style as the public
          homepage's Summit Programme preview (SummitProgramme.tsx), so a
          delegate sees their own saved sessions rendered the same familiar
          way rather than the denser full card used on the Agenda/My Agenda
          pages. Each row gets its own Add to Calendar menu (the per-SESSION
          calendar helpers from sessionDisplay.tsx, not the whole-Summit ones
          the RSVP card above uses). */}
      {bookmarkedSessions && bookmarkedSessions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">My Sessions</p>
          <p className="mt-1.5 text-sm text-slate-500">Sessions you&rsquo;ve bookmarked — add any of them to your own calendar.</p>

          <div className="mt-4 space-y-3">
            {bookmarkedSessions.map((real) => {
              const session = fromRealSession(real, 'en');
              const dayKey = real.day;
              const menuOpen = openCalendarFor === session.key;
              return (
                <div
                  key={session.key}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-offwhite p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    {session.tracks[0]?.color && (
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: session.tracks[0].color }} />
                    )}
                    <div>
                      <p className="font-display text-[15px] font-semibold text-navy">{session.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{session.tracks[0]?.name ?? session.format}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Clock size={13} className="text-orange" /> {session.startTime}&ndash;{session.endTime}
                    </span>
                    {session.room && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <MapPin size={13} className="text-orange" /> {session.room}
                      </span>
                    )}

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenCalendarFor(menuOpen ? null : session.key)}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-navy hover:border-orange/40"
                      >
                        <CalendarPlus size={13} className="text-orange" /> Add to Calendar
                        <ChevronDown size={12} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {menuOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenCalendarFor(null)} />
                          <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                            <a
                              href={sessionGoogleCalendarUrl(session, dayKey)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setOpenCalendarFor(null)}
                              className="block px-4 py-2.5 text-sm font-medium text-navy hover:bg-offwhite"
                            >
                              Google Calendar
                            </a>
                            <a
                              href={sessionOutlookCalendarUrl(session, dayKey)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setOpenCalendarFor(null)}
                              className="block border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-navy hover:bg-offwhite"
                            >
                              Outlook Calendar
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                downloadSessionIcs(session, dayKey);
                                setOpenCalendarFor(null);
                              }}
                              className="block w-full border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-navy hover:bg-offwhite"
                            >
                              Apple / Download .ics
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
