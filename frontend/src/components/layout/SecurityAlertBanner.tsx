import { Link } from 'react-router-dom';
import { ShieldAlert, X } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';

const TYPE_LABEL: Record<string, string> = {
  'auth.refresh_reuse_detected': 'Session breach signal detected',
};

// Renders nothing for anyone but a root admin — securityAlerts only ever
// populates from the 'security:alert' socket event, which the server emits
// only into a root admin's own room (see securityEvent.service.ts). Safe to
// mount unconditionally in AdminLayout rather than re-checking isRootAdmin here.
export const SecurityAlertBanner = () => {
  const { securityAlerts, dismissSecurityAlert } = useNotifications();
  if (securityAlerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {securityAlerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <ShieldAlert size={18} className="shrink-0 text-red-500" />
          <span className="min-w-0 flex-1 truncate">
            <span className="font-semibold">{TYPE_LABEL[alert.type] ?? alert.type}</span>
            {alert.ip && <span className="text-red-600"> — from {alert.ip}</span>}
          </span>
          <Link
            to="/admin/security"
            onClick={() => dismissSecurityAlert(alert.id)}
            className="shrink-0 whitespace-nowrap rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
          >
            Investigate
          </Link>
          <button
            onClick={() => dismissSecurityAlert(alert.id)}
            aria-label="Dismiss"
            className="shrink-0 text-red-400 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
