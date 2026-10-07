import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Search, Send, HandHelping } from 'lucide-react';
import {
  adminListWhatsAppConversations,
  adminGetWhatsAppConversation,
  adminReplyWhatsAppConversation,
  type WhatsAppConversation,
} from '../../services/whatsapp.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { useToast } from '../../contexts/ToastContext';

const STATE_LABEL: Record<WhatsAppConversation['state'], string> = {
  menu: 'In menu',
  awaiting_registration_email: 'Checking registration',
  awaiting_feedback: 'Giving feedback',
  handed_off: 'Waiting for a person',
};

const registrantLabel = (reg: WhatsAppConversation['registration']): string | null => {
  if (!reg) return null;
  return reg.fullName ?? reg.contactName ?? reg.email ?? reg.contactEmail ?? null;
};

export const WhatsAppConversationsPage = () => {
  const toast = useToast();
  const [items, setItems] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<WhatsAppConversation | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListWhatsAppConversations({ q: q || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q, page]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      return;
    }
    adminGetWhatsAppConversation(activeId)
      .then(setActive)
      .catch((err) => toast('error', getApiErrorMessage(err)));
  }, [activeId, toast]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active?.messages.length]);

  const sendReply = async () => {
    if (!active || !replyText.trim()) return;
    setSending(true);
    try {
      const updated = await adminReplyWhatsAppConversation(active._id, replyText.trim());
      setActive(updated);
      setItems((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      setReplyText('');
      toast('success', 'Reply sent');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">WhatsApp Concierge</h1>
          <p className="text-sm text-slate-500">{total} conversation{total === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Search phone number..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        {q && (
          <button onClick={() => { setQ(''); setPage(1); }} className="text-[13px] font-semibold text-orange hover:text-orange-hover">
            Clear
          </button>
        )}
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
              <MessageCircle size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No conversations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((convo) => {
              const lastMsg = convo.messages[convo.messages.length - 1];
              const name = registrantLabel(convo.registration);
              return (
                <button
                  key={convo._id}
                  onClick={() => setActiveId(convo._id)}
                  className={`flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-offwhite ${convo.handoffRequested ? 'bg-danger/[0.03]' : ''}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${convo.handoffRequested ? 'bg-danger' : 'bg-transparent'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[13px] font-semibold text-navy">
                        {convo.phone.replace(/^whatsapp:/, '')}
                        {name && <span className="font-normal text-slate-400"> &middot; {name}</span>}
                      </p>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {convo.lastMessageAt ? new Date(convo.lastMessageAt).toLocaleString() : ''}
                      </span>
                    </div>
                    {lastMsg && <p className="mt-0.5 truncate text-xs text-slate-500">{lastMsg.direction === 'out' ? 'You: ' : ''}{lastMsg.body}</p>}
                  </div>
                  <span
                    className={`mt-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      convo.handoffRequested ? 'bg-danger/10 text-danger' : 'bg-navy-secondary text-orange'
                    }`}
                  >
                    {STATE_LABEL[convo.state]}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40">
                Next
              </button>
            </div>
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
            onClick={() => setActiveId(null)}
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
                <div>
                  <p className="font-display text-lg font-semibold text-navy">{active.phone.replace(/^whatsapp:/, '')}</p>
                  {registrantLabel(active.registration) && <p className="text-xs text-slate-500">{registrantLabel(active.registration)}</p>}
                </div>
                <button onClick={() => setActiveId(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              {active.handoffRequested && (
                <div className="px-5 pt-4">
                  <Banner variant="warning">
                    <span className="flex items-center gap-1.5"><HandHelping size={14} /> Waiting for a staff reply — sending one clears this flag.</span>
                  </Banner>
                </div>
              )}

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
                {active.messages.map((m, i) => (
                  <div key={i} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                        m.direction === 'out' ? 'bg-orange text-white' : 'bg-offwhite text-navy'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-1 text-[10px] ${m.direction === 'out' ? 'text-white/70' : 'text-slate-400'}`}>
                        {new Date(m.at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  placeholder="Type a reply..."
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !replyText.trim()}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-40"
                >
                  <Send size={15} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
