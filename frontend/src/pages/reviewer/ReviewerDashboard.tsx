import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, Clock, Check, X, Ban } from 'lucide-react';
import { fetchMyAssignments, respondToAssignment, type MyAssignment } from '../../services/reviewer.service';
import { Skeleton } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { getApiErrorMessage } from '../../services/api';

const CardShell = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5">{children}</div>
);

const CardHeader = ({ assignment }: { assignment: MyAssignment }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{assignment.abstract.track}</p>
    <h3 className="mt-1 font-display text-base font-semibold text-navy">{assignment.abstract.title}</h3>
    <p className="mt-1 text-sm text-slate-500">by {assignment.abstract.authorName}</p>
  </div>
);

// A brand-new assignment the reviewer hasn't responded to yet — Accept/Decline
// right here, without opening (reading the full abstract) first. Declining
// notifies the admin to reassign it; accepting unlocks the card link below.
const AwaitingResponseCard = ({
  assignment,
  onRespond,
  busy,
}: {
  assignment: MyAssignment;
  onRespond: (reviewId: string, response: 'accepted' | 'declined') => void;
  busy: boolean;
}) => (
  <CardShell>
    <div className="flex items-start justify-between gap-3">
      <CardHeader assignment={assignment} />
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-info/10 px-2.5 py-1 text-[11px] font-semibold text-info">
        <Clock size={12} /> New
      </span>
    </div>
    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
      <button
        type="button"
        disabled={busy}
        onClick={() => onRespond(assignment.reviewId, 'accepted')}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-hover disabled:opacity-50"
      >
        <Check size={14} /> Accept
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onRespond(assignment.reviewId, 'declined')}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
      >
        <X size={14} /> Decline
      </button>
    </div>
  </CardShell>
);

const DeclinedCard = ({ assignment }: { assignment: MyAssignment }) => (
  <CardShell>
    <div className="flex items-start justify-between gap-3 opacity-60">
      <CardHeader assignment={assignment} />
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
        <Ban size={12} /> Declined
      </span>
    </div>
  </CardShell>
);

// Accepted (whether still pending a score, or already completed) — the only
// state that's actually clickable through to the score form.
const OpenableCard = ({ assignment }: { assignment: MyAssignment }) => (
  <Link to={`/review/abstracts/${assignment.reviewId}`} className="block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-orange/40">
    <div className="flex items-start justify-between gap-3">
      <CardHeader assignment={assignment} />
      {assignment.status === 'completed' ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
          <CheckCircle2 size={12} /> Scored {assignment.weightedScore}/100
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning">
          <Clock size={12} /> Pending
        </span>
      )}
    </div>
  </Link>
);

export const ReviewerDashboard = () => {
  const [assignments, setAssignments] = useState<MyAssignment[] | null>(null);
  const [error, setError] = useState('');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondError, setRespondError] = useState('');

  const load = () => {
    fetchMyAssignments()
      .then(setAssignments)
      .catch((err) => setError(getApiErrorMessage(err)));
  };

  useEffect(load, []);

  const respond = async (reviewId: string, response: 'accepted' | 'declined') => {
    if (respondingId) return;
    setRespondError('');
    setRespondingId(reviewId);
    try {
      await respondToAssignment(reviewId, response);
      setAssignments((prev) => prev?.map((a) => (a.reviewId === reviewId ? { ...a, reviewerStatus: response } : a)) ?? null);
    } catch (err) {
      setRespondError(getApiErrorMessage(err));
    } finally {
      setRespondingId(null);
    }
  };

  const awaitingResponse = assignments?.filter((a) => a.reviewerStatus === 'pending') ?? [];
  const pending = assignments?.filter((a) => a.reviewerStatus === 'accepted' && a.status === 'pending') ?? [];
  const completed = assignments?.filter((a) => a.status === 'completed') ?? [];
  const declined = assignments?.filter((a) => a.reviewerStatus === 'declined') ?? [];

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-navy">Your Assigned Abstracts</h1>
      <p className="mt-1 text-sm text-slate-500">Accept or decline each new assignment, then score what you accept against the review rubric.</p>

      {error && (
        <div className="mt-6">
          <Banner variant="error">{error}</Banner>
        </div>
      )}
      {respondError && (
        <div className="mt-6">
          <Banner variant="error">{respondError}</Banner>
        </div>
      )}

      {!error && assignments === null && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      )}

      {assignments !== null && assignments.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <FileText size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 font-display text-base font-semibold text-navy">No abstracts assigned yet</p>
          <p className="mt-1 text-sm text-slate-500">Check back once the programme committee assigns you some.</p>
        </div>
      )}

      {awaitingResponse.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Awaiting Your Response ({awaitingResponse.length})
          </h2>
          <div className="mt-3 space-y-3">
            {awaitingResponse.map((a) => (
              <AwaitingResponseCard key={a.reviewId} assignment={a} onRespond={respond} busy={respondingId === a.reviewId} />
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Pending ({pending.length})
          </h2>
          <div className="mt-3 space-y-3">
            {pending.map((a) => (
              <OpenableCard key={a.reviewId} assignment={a} />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Completed ({completed.length})
          </h2>
          <div className="mt-3 space-y-3">
            {completed.map((a) => (
              <OpenableCard key={a.reviewId} assignment={a} />
            ))}
          </div>
        </div>
      )}

      {declined.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Declined ({declined.length})
          </h2>
          <div className="mt-3 space-y-3">
            {declined.map((a) => (
              <DeclinedCard key={a.reviewId} assignment={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
