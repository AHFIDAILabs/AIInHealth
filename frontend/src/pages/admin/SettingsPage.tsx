import { useEffect, useState } from 'react';
import * as authService from '../../services/auth.service';
import { NOTIFICATION_EVENTS, type NotificationEvent } from '../../services/auth.service';
import { enablePush, disablePush, isPushSupported } from '../../services/push.service';
import { getApiErrorMessage } from '../../services/api';
import { AdminInput, AdminToggle } from '../../components/ui/AdminField';
import { Banner } from '../../components/ui/Banner';
import { ImagePicker } from '../../components/ui/ImagePicker';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { uploadAdminImage } from '../../services/upload.service';
import { fetchAdminVolunteerSettings, setVolunteerApplicationsOpen } from '../../services/volunteerSettings.service';
import { fetchAdminInnovatorSettings, setInnovatorApplicationsOpen } from '../../services/innovatorSettings.service';
import { adminFetchPromoStatus, adminLaunchPromoCampaign, adminSetPromoActive, type PromoStatus } from '../../services/promo.service';

// Same roles that manage Volunteers elsewhere (Registrations' Volunteers
// filter, Volunteer Tracks) — not the personal-account roles above, this is
// the one event-wide setting on an otherwise per-admin page.
const VOLUNTEER_SETTINGS_ROLES = ['super_admin', 'admin', 'registrations_officer'];
// innovator_lead owns this area (not registrations_officer — Innovator was
// deliberately carved out of that role's scope elsewhere in this app).
const INNOVATOR_SETTINGS_ROLES = ['super_admin', 'admin', 'innovator_lead'];

const EVENT_LABEL: Record<NotificationEvent, string> = {
  'registration.new': 'New registration submitted',
  'inquiry.new': 'New partnership inquiry',
  'message.new': 'New contact message',
  'newsletter.new': 'New newsletter signup',
  'abstract.new': 'New abstract submission',
  'abstract.reviewer_declined': 'Reviewer declined an assignment',
  'scholarship_application.new': 'New sponsorship application',
  'whatsapp.handoff_requested': 'WhatsApp: visitor wants a person',
};

const PASSWORD_RULES = [
  { test: (v: string) => v.length >= 10, label: 'At least 10 characters' },
  { test: (v: string) => /[a-z]/.test(v) && /[A-Z]/.test(v), label: 'Upper & lowercase letters' },
  { test: (v: string) => /[0-9]/.test(v), label: 'A number' },
  { test: (v: string) => /[^A-Za-z0-9]/.test(v), label: 'A symbol' },
];

export const SettingsPage = () => {
  const toast = useToast();
  const { user, setUser } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [prefs, setPrefs] = useState(
    user?.notificationPrefs ?? { emailDigest: true, pushEnabled: false, events: [...NOTIFICATION_EVENTS] }
  );
  const [savingPrefs, setSavingPrefs] = useState(false);

  const saveProfile = async () => {
    if (!fullName.trim()) {
      setProfileError('Full name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    setProfileError('');
    try {
      const updated = await authService.updateProfile({ fullName: fullName.trim(), avatarUrl: avatarUrl.trim() });
      setUser({ ...updated, notificationPrefs: user?.notificationPrefs });
      toast('success', 'Profile updated');
    } catch (err) {
      setProfileError(getApiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPasswordChange = async () => {
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (PASSWORD_RULES.some((r) => !r.test(newPassword))) {
      setPasswordError('New password does not meet the requirements below.');
      return;
    }
    setChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword, confirmPassword);
      toast('success', 'Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(getApiErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const savePrefs = async (next: typeof prefs) => {
    setPrefs(next);
    setSavingPrefs(true);
    try {
      const updated = await authService.updateNotificationPrefs(next);
      setPrefs(updated);
      if (user) setUser({ ...user, notificationPrefs: updated });
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSavingPrefs(false);
    }
  };

  const toggleEvent = (event: NotificationEvent) => {
    const events = prefs.events.includes(event) ? prefs.events.filter((e) => e !== event) : [...prefs.events, event];
    savePrefs({ ...prefs, events });
  };

  const [pushBusy, setPushBusy] = useState(false);
  const togglePush = async (enable: boolean) => {
    setPushBusy(true);
    try {
      if (enable) {
        await enablePush();
      } else {
        await disablePush();
      }
      await savePrefs({ ...prefs, pushEnabled: enable });
      toast('success', enable ? 'Desktop push enabled' : 'Desktop push disabled');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : getApiErrorMessage(err));
    } finally {
      setPushBusy(false);
    }
  };

  const canManageVolunteerSettings = !!user && VOLUNTEER_SETTINGS_ROLES.includes(user.role);
  const [volunteerOpen, setVolunteerOpenState] = useState<boolean | null>(null);
  const [volunteerBusy, setVolunteerBusy] = useState(false);

  const canManageInnovatorSettings = !!user && INNOVATOR_SETTINGS_ROLES.includes(user.role);
  const [innovatorOpen, setInnovatorOpenState] = useState<boolean | null>(null);
  const [innovatorBusy, setInnovatorBusy] = useState(false);

  // A real, uncapped-quantity 100%-off giveaway running for a fixed 10 days
  // once launched — restricted to super_admin, distinct from the broader
  // registrations_officer/admin scope every other card above allows.
  const canManagePromo = user?.role === 'super_admin';
  const [promoStatus, setPromoStatus] = useState<PromoStatus | null>(null);
  const [promoLaunching, setPromoLaunching] = useState(false);
  const [confirmLaunchOpen, setConfirmLaunchOpen] = useState(false);
  const [promoBusy, setPromoBusy] = useState(false);

  useEffect(() => {
    if (!canManageVolunteerSettings) return;
    fetchAdminVolunteerSettings()
      .then((s) => setVolunteerOpenState(s.open))
      .catch((err) => toast('error', getApiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageVolunteerSettings]);

  const toggleVolunteerApplications = async (next: boolean) => {
    const reason = !next ? window.prompt('Optional: reason shown to admins (and visitors) — e.g. "Volunteer slots are full."') ?? undefined : undefined;
    setVolunteerBusy(true);
    try {
      const settings = await setVolunteerApplicationsOpen(next, reason);
      setVolunteerOpenState(settings.open);
      toast('success', next ? 'Volunteer applications reopened' : 'Volunteer applications closed');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setVolunteerBusy(false);
    }
  };

  useEffect(() => {
    if (!canManageInnovatorSettings) return;
    fetchAdminInnovatorSettings()
      .then((s) => setInnovatorOpenState(s.open))
      .catch((err) => toast('error', getApiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageInnovatorSettings]);

  const toggleInnovatorApplications = async (next: boolean) => {
    const reason = !next ? window.prompt('Optional: reason shown to admins (and visitors) — e.g. "Innovator slots are full."') ?? undefined : undefined;
    setInnovatorBusy(true);
    try {
      const settings = await setInnovatorApplicationsOpen(next, reason);
      setInnovatorOpenState(settings.open);
      toast('success', next ? 'Innovator applications reopened' : 'Innovator applications closed');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setInnovatorBusy(false);
    }
  };

  useEffect(() => {
    if (!canManagePromo) return;
    adminFetchPromoStatus()
      .then(setPromoStatus)
      .catch((err) => toast('error', getApiErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManagePromo]);

  const launchPromo = async () => {
    setPromoLaunching(true);
    try {
      await adminLaunchPromoCampaign();
      const refreshed = await adminFetchPromoStatus();
      setPromoStatus(refreshed);
      setConfirmLaunchOpen(false);
      toast('success', 'QR promo campaign launched — live for the next 10 days');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setPromoLaunching(false);
    }
  };

  const togglePromoActive = async (next: boolean) => {
    const reason = !next ? window.prompt('Optional: reason shown to admins — e.g. "Pausing until the next cohort."') ?? undefined : undefined;
    setPromoBusy(true);
    try {
      const refreshed = await adminSetPromoActive(next, reason);
      setPromoStatus(refreshed);
      toast('success', next ? 'Promo campaign resumed' : 'Promo campaign paused');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setPromoBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-semibold text-navy">Settings</h1>
      <p className="text-sm text-slate-500">Manage your account and notification preferences.</p>

      {/* Account */}
      <div className="mt-8 rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Account</p>
        <div className="mt-4 space-y-4">
          {profileError && <Banner variant="error">{profileError}</Banner>}

          <ImagePicker
            value={avatarUrl}
            onChange={setAvatarUrl}
            upload={uploadAdminImage}
            size={64}
            fallbackText={fullName || user?.fullName}
          />

          <AdminInput label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <AdminInput label="Email" value={user?.email ?? ''} disabled className="!bg-offwhite !text-slate-400" />
          <div>
            <span className="mb-1.5 block text-[13px] font-semibold text-navy">Role</span>
            <span className="inline-block rounded-full bg-navy-secondary px-3 py-1 text-xs font-medium text-orange">{user?.role}</span>
          </div>
          <button
            onClick={saveProfile}
            disabled={savingProfile}
            className="rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
          >
            {savingProfile ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Change Password</p>
        <div className="mt-4 space-y-4">
          {passwordError && <Banner variant="error">{passwordError}</Banner>}
          <AdminInput label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
          <AdminInput label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          {newPassword.length > 0 && (
            <ul className="-mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(newPassword);
                return (
                  <li key={rule.label} className={`text-xs ${ok ? 'text-success' : 'text-slate-400'}`}>
                    {ok ? '✓' : '·'} {rule.label}
                  </li>
                );
              })}
            </ul>
          )}
          <AdminInput label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          <button
            onClick={submitPasswordChange}
            disabled={changingPassword || !currentPassword || !newPassword}
            className="rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
          >
            {changingPassword ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Notification preferences */}
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notification Preferences</p>
        <div className="mt-4 space-y-3">
          <AdminToggle label="Daily email digest" checked={prefs.emailDigest} onChange={(v) => savePrefs({ ...prefs, emailDigest: v })} />
          <AdminToggle
            label={pushBusy ? 'Desktop push notifications (updating…)' : 'Desktop push notifications'}
            checked={prefs.pushEnabled}
            onChange={togglePush}
          />
          {!isPushSupported() && (
            <p className="text-xs text-warning">Not supported in this browser.</p>
          )}
          <p className="text-xs text-slate-400">Requires granting this site permission to show notifications.</p>

          <p className="mt-4 text-[13px] font-semibold text-navy">Notify me about</p>
          <div className="space-y-2">
            {NOTIFICATION_EVENTS.map((event) => (
              <label key={event} className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5">
                <span className="text-[13px] text-navy">{EVENT_LABEL[event]}</span>
                <input
                  type="checkbox"
                  checked={prefs.events.includes(event)}
                  onChange={() => toggleEvent(event)}
                  disabled={savingPrefs}
                  className="h-4 w-4 accent-orange"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Event-wide setting — not scoped to this admin's own account, unlike
          every card above. Visible only to the roles that actually manage
          Volunteers elsewhere (Registrations' Volunteers filter, Volunteer
          Tracks) — see VOLUNTEER_SETTINGS_ROLES. */}
      {canManageVolunteerSettings && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Volunteer Applications</p>
          <div className="mt-4">
            {volunteerOpen === null ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              <AdminToggle
                label={volunteerBusy ? 'Accepting new applications (updating…)' : 'Accepting new applications'}
                checked={volunteerOpen}
                onChange={toggleVolunteerApplications}
              />
            )}
            <p className="mt-2 text-xs text-slate-400">
              Turn this off to stop new volunteer applications on the public Register page — anyone who already has an
              access code can still confirm their spot either way.
            </p>
          </div>
        </div>
      )}

      {/* Same shape as the Volunteer Applications card above, for the
          Innovator registration type — see INNOVATOR_SETTINGS_ROLES. */}
      {canManageInnovatorSettings && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Innovator Applications</p>
          <div className="mt-4">
            {innovatorOpen === null ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : (
              <AdminToggle
                label={innovatorBusy ? 'Accepting new applications (updating…)' : 'Accepting new applications'}
                checked={innovatorOpen}
                onChange={toggleInnovatorApplications}
              />
            )}
            <p className="mt-2 text-xs text-slate-400">
              Turn this off to stop new Innovator applications on the public Register page — anyone already
              pre-approved with an access code can still confirm immediately either way.
            </p>
          </div>
        </div>
      )}

      {/* super_admin only — a real, uncapped-quantity 100%-off giveaway
          running for a fixed 10 days once launched, distinct from every
          other content/registrations-scoped setting above. */}
      {canManagePromo && (
        <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">QR Promo Campaign</p>
          <div className="mt-4">
            {promoStatus === null ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : promoStatus.startedAt ? (
              <>
                <p className="text-[13px] font-semibold text-navy">
                  {promoStatus.active ? (
                    <span className="text-success">Live — {promoStatus.daysRemaining} day(s) remaining</span>
                  ) : promoStatus.daysRemaining > 0 ? (
                    <span className="text-warning">Paused — {promoStatus.daysRemaining} day(s) remaining</span>
                  ) : (
                    <span className="text-slate-400">Ended</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-400">{promoStatus.claimedCount} code(s) claimed so far.</p>
                {!promoStatus.active && promoStatus.pausedReason && (
                  <p className="mt-1 text-xs text-slate-400">Reason: {promoStatus.pausedReason}</p>
                )}
                <div className="mt-3">
                  <AdminToggle
                    label={promoBusy ? 'Campaign active (updating…)' : 'Campaign active'}
                    checked={promoStatus.active}
                    onChange={togglePromoActive}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Turn this off to pause the landing page's QR banner and stop new claims at any time, or leave it off
                  permanently to end the campaign early — the original 10-day window and days-remaining count keep
                  running in the background either way. Anyone who already claimed a code can still use it either way.
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={() => setConfirmLaunchOpen(true)}
                  className="rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover"
                >
                  Launch QR Promo Campaign
                </button>
                <p className="mt-2 text-xs text-slate-400">
                  Starts the landing page's drifting QR banner and its fixed 10-day claim window immediately. The launch
                  itself can't be undone, but you'll be able to pause or stop the campaign early afterward.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmLaunchOpen}
        title="Launch the QR promo campaign?"
        description="This immediately starts a 10-day window where anyone who scans the landing page's QR banner gets a free (100% off) registration code. The launch itself can't be undone, but you can pause or stop the campaign early afterward."
        confirmLabel="Launch"
        danger={false}
        loading={promoLaunching}
        onConfirm={launchPromo}
        onCancel={() => setConfirmLaunchOpen(false)}
      />
    </div>
  );
};
