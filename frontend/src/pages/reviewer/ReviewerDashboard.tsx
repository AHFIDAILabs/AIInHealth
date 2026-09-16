import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CheckCircle2, Clock } from 'lucide-react';
import { fetchMyAssignments, type MyAssignment } from '../../services/reviewer.service';
import { Skeleton } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { getApiErrorMessage } from '../../services/api';

const AssignmentCard = ({ assignment }: { assignment: MyAssignment }) => (
  <Link
    to={`/review/abstracts/${assignment.reviewId}`}
    className="block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-orange/40"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{assignment.abstract.track}</p>
        <h3 className="mt-1 font-display text-base font-semibold text-navy">{assignment.abstract.title}</h3>
        <p className="mt-1 text-sm text-slate-500">by {assignment.abstract.authorName}</p>
      </div>
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

  useEffect(() => {
    fetchMyAssignments()
      .then(setAssignments)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  const pending = assignments?.filter((a) => a.status === 'pending') ?? [];
  const completed = assignments?.filter((a) => a.status === 'completed') ?? [];

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-navy">Your Assigned Abstracts</h1>
      <p className="mt-1 text-sm text-slate-500">Score each abstract against the review rubric.</p>

      {error && (
        <div className="mt-6">
          <Banner variant="error">{error}</Banner>
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

      {pending.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Pending ({pending.length})
          </h2>
          <div className="mt-3 space-y-3">
            {pending.map((a) => (
              <AssignmentCard key={a.reviewId} assignment={a} />
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
              <AssignmentCard key={a.reviewId} assignment={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
