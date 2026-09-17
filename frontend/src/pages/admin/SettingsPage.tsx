import { useState } from 'react';
import * as authService from '../../services/auth.service';
import { NOTIFICATION_EVENTS, type NotificationEvent } from '../../services/auth.service';
import { enablePush, disablePush, isPushSupported } from '../../services/push.service';
import { getApiErrorMessage } from '../../services/api';
import { AdminInput, AdminToggle } from '../../components/ui/AdminField';
import { Banner } from '../../components/ui/Banner';
import { ImagePicker } from '../../components/ui/ImagePicker';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { uploadAdminImage } from '../../services/upload.service';

const EVENT_LABEL: Record<NotificationEvent, string> = {
  'registration.new': 'New registration submitted',
  'inquiry.new': 'New partnership inquiry',
  'message.new': 'New contact message',
  'newsletter.new': 'New newsletter signup',
  'abstract.reviewer_declined': 'Reviewer declined an assignment',
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
    </div>
  );
};
