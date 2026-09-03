import { useCallback, useEffect, useState } from 'react';
import { Handshake, Check, X, Ban, Mail } from 'lucide-react';
import { fetchMeetings, respondToMeetingRequest, type MeetingRequestItem } from '../../services/meeting.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const STATUS_BADGE: Record<MeetingRequestItem['status'], string> = {
  pending: 'text-warning bg-warning/10',
  accepted: 'text-success bg-success/10',
  declined: 'text-danger bg-danger/10',
  cancelled: 'text-slate-400 bg-slate-100',
};

export const PortalMeetings = () => {
  const toast = useToast();
  const [items, setItems] = useState<MeetingRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchMeetings()
      .then(setItems)
      .catch((err) => toast('error', getApiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(load, [load]);

  const respond = async (id: string, action: 'accept' | 'decline' | 'cancel') => {
    setBusyId(id);
    try {
      await respondToMeetingRequest(id, action);
      await load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const received = items.filter((m) => m.direction === 'received');
  const sent = items.filter((m) => m.direction === 'sent');

  const Row = ({ m }: { m: MeetingRequestItem }) => (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy">{m.counterpart.name}</p>
        {m.counterpart.organization && <p className="text-xs text-slate-500">{m.counterpart.organization}</p>}
        {m.message && <p className="mt-1 text-xs text-slate-500">&ldquo;{m.message}&rdquo;</p>}
        {m.status === 'accepted' && m.counterpart.email && (
          <a href={`mailto:${m.counterpart.email}`} className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-orange hover:text-orange-hover">
            <Mail size={12} /> {m.counterpart.email}
          </a>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_BADGE[m.status]}`}>{m.status}</span>
        {m.direction === 'received' && m.status === 'pending' && (
          <>
            <button
              onClick={() => respond(m.id, 'accept')}
              disabled={busyId === m.id}
              className="flex items-center gap-1 rounded-lg bg-success px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Check size={13} /> Accept
            </button>
            <button
              onClick={() => respond(m.id, 'decline')}
              disabled={busyId === m.id}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-navy hover:border-danger/40 hover:text-danger disabled:opacity-50"
            >
              <X size={13} /> Decline
            </button>
          </>
        )}
        {m.direction === 'sent' && m.status === 'pending' && (
          <button
            onClick={() => respond(m.id, 'cancel')}
            disabled={busyId === m.id}
            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-navy hover:border-danger/40 hover:text-danger disabled:opacity-50"
          >
            <Ban size={13} /> Cancel
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy">Meetings</h1>
      <p className="mt-1 text-sm text-slate-500">Requests you&rsquo;ve sent and received from the delegate directory.</p>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-offwhite text-slate-400">
            <Handshake size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No meeting requests yet</p>
          <p className="mt-1 text-sm text-slate-500">Browse the directory to send your first request.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {received.length > 0 && (
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Received ({received.length})</p>
              <div className="space-y-2.5">
                {received.map((m) => (
                  <Row key={m.id} m={m} />
                ))}
              </div>
            </div>
          )}
          {sent.length > 0 && (
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Sent ({sent.length})</p>
              <div className="space-y-2.5">
                {sent.map((m) => (
                  <Row key={m.id} m={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
