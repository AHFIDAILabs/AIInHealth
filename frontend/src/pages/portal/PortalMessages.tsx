import { useEffect, useState } from 'react';
import { Mail } from 'lucide-react';
import { fetchPortalMessages, type PortalMessage } from '../../services/delegate.service';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import { getApiErrorMessage } from '../../services/api';
import { Banner } from '../../components/ui/Banner';

// Admin replies to this delegate's own contact-form message(s) — see
// contact.controller.ts's adminReply / MessagesPage.tsx's Reply action. The
// nav badge (PortalLayout.tsx) clears itself once this page's fetch runs,
// since the backend marks everything read as a side effect of listing it.
export const PortalMessages = () => {
  const { refresh } = useDelegateAuth();
  const [messages, setMessages] = useState<PortalMessage[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPortalMessages()
      .then(setMessages)
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load your messages.')))
      .finally(() => {
        // Clears the unread badge in the nav — the fetch above already marked
        // everything read server-side, this just refreshes the locally-cached count.
        refresh();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">From the organizers</p>
        <h1 className="font-display text-2xl font-semibold text-navy">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">Replies from the AI in Health Summit 2026 team.</p>
      </div>

      {error && <Banner variant="error">{error}</Banner>}

      {!messages ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange/15 text-orange">
            <Mail size={20} />
          </span>
          <p className="mt-3 font-semibold text-navy">No messages yet</p>
          <p className="mt-1 text-sm text-slate-500">Replies to anything you've sent us will show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy">{m.body}</p>
              <p className="mt-3 text-xs text-slate-400">{new Date(m.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
