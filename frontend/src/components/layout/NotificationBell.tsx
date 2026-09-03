import { useState } from 'react';
import { Bell, UserPlus, Handshake, MessageSquare, Check } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import type { AdminNotification } from '../../services/notification.service';

const ICON: Record<AdminNotification['type'], typeof UserPlus> = {
  'registration.new': UserPlus,
  'inquiry.new': Handshake,
  'message.new': MessageSquare,
};

const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const NotificationBell = () => {
  const { notifications, unreadCount, connected, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? notifications : notifications.slice(0, 8);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-offwhite hover:text-navy"
        aria-label="Notifications"
        title={connected ? 'Live notifications connected' : 'Reconnecting…'}
      >
        <Bell size={17} />
        <span className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${connected ? 'bg-success' : 'bg-slate-300'}`} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1.5 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-[13px] font-semibold text-navy">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] font-semibold text-orange hover:text-orange-hover">
                  <Check size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {visible.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-slate-400">No notifications yet</p>
              ) : (
                visible.map((n) => {
                  const Icon = ICON[n.type];
                  return (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-offwhite ${!n.isRead ? 'bg-orange/[0.03]' : ''}`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-secondary text-orange">
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] leading-snug ${!n.isRead ? 'font-semibold text-navy' : 'text-slate-600'}`}>{n.title}</p>
                        {n.body && <p className="mt-0.5 truncate text-xs text-slate-400">{n.body}</p>}
                        <p className="mt-0.5 text-[10px] text-slate-300">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />}
                    </button>
                  );
                })
              )}
            </div>

            {!showAll && notifications.length > 8 && (
              <button onClick={() => setShowAll(true)} className="block w-full border-t border-slate-100 py-2.5 text-center text-[12px] font-semibold text-orange hover:text-orange-hover">
                View All
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
