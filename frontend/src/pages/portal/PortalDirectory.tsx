import { useCallback, useEffect, useState } from 'react';
import { Search, Users, Send } from 'lucide-react';
import { fetchDirectory, createMeetingRequest, type DirectoryEntry } from '../../services/meeting.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export const PortalDirectory = () => {
  const toast = useToast();
  const [items, setItems] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [requesting, setRequesting] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    fetchDirectory(q || undefined)
      .then(setItems)
      .catch((err) => toast('error', getApiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const requestMeeting = async (entry: DirectoryEntry) => {
    setRequesting(entry.id);
    try {
      await createMeetingRequest(entry.id);
      setSentTo((prev) => new Set(prev).add(entry.id));
      toast('success', `Meeting request sent to ${entry.name}`);
    } catch (err) {
      toast('error', getApiErrorMessage(err, "Couldn't send that meeting request."));
    } finally {
      setRequesting(null);
    }
  };

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Delegate Directory</h1>
        <p className="mt-1 text-sm text-slate-500">Browse delegates who&rsquo;ve opted in and send a meeting request.</p>
      </div>

      <div className="relative mt-5 max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or organization..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-offwhite text-slate-400">
            <Users size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No delegates to show yet</p>
          <p className="mt-1 text-sm text-slate-500">Check back once more delegates opt into the directory.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {items.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-secondary text-sm font-semibold text-orange">
                {entry.name[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy">{entry.name}</p>
                <p className="truncate text-xs text-slate-500">{entry.jobTitle || entry.organization || entry.type}</p>
              </div>
              <button
                onClick={() => requestMeeting(entry)}
                disabled={requesting === entry.id || sentTo.has(entry.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-orange/40 disabled:opacity-50"
              >
                <Send size={13} /> {sentTo.has(entry.id) ? 'Sent' : 'Request'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
