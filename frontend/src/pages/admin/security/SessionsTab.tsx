import { useEffect, useState } from 'react';
import { Users, LogOut } from 'lucide-react';
import { listSessions, revokeAllSessions, type AdminSession } from '../../../services/security.service';
import { getApiErrorMessage } from '../../../services/api';
import { Banner } from '../../../components/ui/Banner';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { CARD_CLASS } from '../../../lib/adminUi';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  content_editor: 'Content Editor',
  registrations_officer: 'Registrations Officer',
  viewer: 'Viewer',
};

export const SessionsTab = () => {
  const [items, setItems] = useState<AdminSession[] | null>(null);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [result, setResult] = useState('');

  const load = () => {
    listSessions()
      .then(setItems)
      .catch((err) => setError(getApiErrorMessage(err)));
  };

  useEffect(load, []);

  const handleRevokeAll = async () => {
    if (
      !window.confirm(
        'Revoke every other admin session? Everyone but you will be signed out the moment their current session expires (within 15 minutes) and will need to log in again.'
      )
    )
      return;
    setRevoking(true);
    setError('');
    setResult('');
    try {
      const { revokedCount } = await revokeAllSessions();
      setResult(`${revokedCount} session${revokedCount === 1 ? '' : 's'} revoked.`);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${CARD_CLASS}`}>
        <div>
          <p className="font-display text-sm font-semibold text-navy">Active Admin Sessions</p>
          <p className="mt-0.5 max-w-md text-xs text-slate-500">
            Force every other signed-in admin to re-authenticate — your own session is left untouched. Use this if you
            suspect a session's been compromised.
          </p>
        </div>
        <button
          onClick={handleRevokeAll}
          disabled={revoking}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
        >
          <LogOut size={16} /> Revoke All Other Sessions
        </button>
      </div>

      {result && <Banner variant="success">{result}</Banner>}
      {error && <Banner variant="error">{error}</Banner>}

      <div className={`overflow-hidden ${CARD_CLASS}`}>
        {items === null ? (
          <SkeletonRows rows={5} cols={4} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-blue/15 text-chart-blue">
              <Users size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No active admin sessions</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((s) => (
              <div key={s.userId} className="flex items-center justify-between gap-3 px-5 py-3.5 text-[13px]">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{s.fullName}</p>
                  <p className="truncate text-xs text-slate-400">
                    {s.email} &middot; {s.ips.filter(Boolean).join(', ') || 'unknown IP'} &middot; last active{' '}
                    {new Date(s.lastSeenAt).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-navy-secondary px-2.5 py-1 text-[10px] font-medium text-orange">
                  {ROLE_LABEL[s.role] ?? s.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
