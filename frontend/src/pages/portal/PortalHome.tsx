import { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle2, Clock, Bell, BellOff, Users2, Pencil, Check, X } from 'lucide-react';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import {
  fetchTicketQr,
  updateDirectoryOptIn,
  updateDelegateProfile,
  enableDelegatePush,
  disableDelegatePush,
  isDelegatePushSupported,
} from '../../services/delegate.service';
import { getApiErrorMessage } from '../../services/api';
import { getCachedTicketQr, setCachedTicketQr } from '../../lib/ticketQrCache';
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

export const PortalHome = () => {
  const { delegate, refresh } = useDelegateAuth();
  const toast = useToast();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrError, setQrError] = useState('');
  const [qrIsCached, setQrIsCached] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [optInBusy, setOptInBusy] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileOrg, setProfileOrg] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

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
          Add a profile photo so our team can recognize you at the event —{' '}
          <button onClick={openEditProfile} className="font-semibold underline underline-offset-2">
            complete your profile
          </button>
          .
        </Banner>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* E-ticket / QR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your E-Ticket</p>
          {delegate.checkedIn ? (
            <div className="mt-4 flex flex-col items-center gap-2 py-8">
              <CheckCircle2 size={40} className="text-success" />
              <p className="font-display text-lg font-semibold text-navy">Checked In</p>
              {delegate.checkedInAt && (
                <p className="text-sm text-slate-500">{new Date(delegate.checkedInAt).toLocaleString('en-GB')}</p>
              )}
            </div>
          ) : qrDataUrl ? (
            <>
              <img src={qrDataUrl} alt="Your check-in QR code" className="mx-auto mt-4 h-48 w-48 rounded-xl border border-slate-100" />
              <p className="mt-3 text-xs text-slate-400">
                {qrIsCached
                  ? "Showing your last saved ticket — you're offline right now, but this still works at the desk."
                  : 'Show this at the registration desk on event day.'}
              </p>
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
            <button
              onClick={toggleDirectory}
              disabled={optInBusy}
              className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-left text-[13px] font-medium text-navy transition-colors hover:border-orange/40 disabled:opacity-60"
            >
              <Users2 size={15} className={delegate.directoryOptIn ? 'text-orange' : 'text-slate-400'} />
              {delegate.directoryOptIn ? 'Listed in delegate directory' : 'Join the delegate directory'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
