import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquare, X, CheckCircle2, Mail } from 'lucide-react';
import { adminListMessages, adminUpdateMessage, type AdminMessage } from '../../services/adminMessage.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { useToast } from '../../contexts/ToastContext';

export const MessagesPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [active, setActive] = useState<AdminMessage | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListMessages({ read: unreadOnly ? 'false' : undefined, limit: 100 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [unreadOnly]);

  useEffect(load, [load]);

  const openMessage = async (msg: AdminMessage) => {
    setActive(msg);
    if (!msg.isRead) {
      try {
        const updated = await adminUpdateMessage(msg._id, { isRead: true });
        setItems((prev) => prev.map((m) => (m._id === msg._id ? updated : m)));
        setActive(updated);
      } catch {
        // silent — read-state is a nice-to-have, not worth surfacing an error toast for
      }
    }
  };

  const toggleResolved = async (msg: AdminMessage) => {
    try {
      const updated = await adminUpdateMessage(msg._id, { isResolved: !msg.isResolved });
      setItems((prev) => prev.map((m) => (m._id === msg._id ? updated : m)));
      setActive(updated);
      toast('success', updated.isResolved ? 'Marked as resolved' : 'Reopened');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const unreadCount = items.filter((m) => !m.isRead).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Contact Messages</h1>
          <p className="text-sm text-slate-500">
            {items.length} message{items.length === 1 ? '' : 's'}
            {unreadCount > 0 && <span className="ml-1.5 font-semibold text-orange">&middot; {unreadCount} unread</span>}
          </p>
        </div>
        <button
          onClick={() => setUnreadOnly((v) => !v)}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium ${unreadOnly ? 'border-orange bg-orange text-white' : 'border-slate-200 text-slate-600'}`}
        >
          Unread only
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={6} cols={4} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-teal/15 text-chart-teal">
              <MessageSquare size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No messages yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((msg) => (
              <button
                key={msg._id}
                onClick={() => openMessage(msg)}
                className={`flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-offwhite ${!msg.isRead ? 'bg-orange/[0.03]' : ''}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!msg.isRead ? 'bg-orange' : 'bg-transparent'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className={`truncate text-[13px] ${!msg.isRead ? 'font-semibold text-navy' : 'font-medium text-slate-600'}`}>
                      {msg.name} <span className="font-normal text-slate-400">&middot; {msg.email}</span>
                    </p>
                    <span className="shrink-0 text-[11px] text-slate-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{msg.message}</p>
                </div>
                <span className="mt-1 shrink-0 rounded-full bg-navy-secondary px-2 py-0.5 text-[10px] font-medium text-orange">{msg.category}</span>
                {msg.isResolved && <CheckCircle2 size={16} className="mt-1 shrink-0 text-success" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy/50"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">{active.name}</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <div className="flex items-center justify-between">
                  <a href={`mailto:${active.email}`} className="text-sm text-orange hover:text-orange-hover">
                    {active.email}
                  </a>
                  <span className="rounded-full bg-navy-secondary px-2.5 py-0.5 text-[11px] font-medium text-orange">{active.category}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy">{active.message}</p>
                <p className="text-xs text-slate-400">{new Date(active.createdAt).toLocaleString()}</p>
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <a
                  href={`mailto:${active.email}?subject=${encodeURIComponent('Re: Your message to AI in Health Summit 2026')}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite"
                >
                  <Mail size={15} /> Reply via Email
                </a>
                <button
                  onClick={() => toggleResolved(active)}
                  className={`flex-1 rounded-lg py-2.5 text-[13px] font-semibold text-white ${active.isResolved ? 'bg-slate-400 hover:bg-slate-500' : 'bg-orange hover:bg-orange-hover'}`}
                >
                  {active.isResolved ? 'Reopen' : 'Mark Resolved'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
