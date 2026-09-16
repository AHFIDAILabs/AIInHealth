import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { FileText, CheckCircle2, Clock, RotateCcw, XCircle, Users2, Mail } from 'lucide-react';
import { fetchAbstractsAnalytics, type AbstractAnalytics, type AbstractDecision, type ScoreBand } from '../../../services/abstract.service';
import { getApiErrorMessage } from '../../../services/api';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { CARD_CLASS, CHART_HEX } from '../../../lib/adminUi';

const DECISION_LABEL: Record<AbstractDecision, string> = {
  accepted_oral: 'Accept – Oral',
  accepted_poster: 'Accept – Poster',
  rejected: 'Reject',
  waitlisted: 'Waitlist',
};

const BAND_LABEL: Record<ScoreBand, string> = {
  strong_accept: 'Strong Accept',
  accept: 'Accept',
  borderline: 'Borderline',
  reject: 'Reject',
};

const BAND_HEX: Record<ScoreBand, string> = {
  strong_accept: '#16A34A',
  accept: CHART_HEX.orange,
  borderline: CHART_HEX.amber,
  reject: '#DC2626',
};

interface BarRow {
  key: string;
  label: string;
  value: number;
  displayValue: string;
  hex: string;
}

// Shared horizontal-bar-list layout for every simple "label + value,
// proportional bar" breakdown below (Track Breakdown, Committee Decisions,
// Score Bands, Reviewer Recommendations, Criterion Performance) — same shape,
// different data and value formatting, so this avoids repeating the row
// markup five times.
const BarList = ({ rows }: { rows: BarRow[] }) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.key}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{r.label}</span>
            <span className="font-semibold text-navy">{r.displayValue}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-offwhite">
            <div className="h-2 rounded-full" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: r.hex }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const StatCard = ({ icon: Icon, color, label, value }: { icon: typeof FileText; color: string; label: string; value: number }) => (
  <div className={`overflow-hidden p-4 ${CARD_CLASS}`}>
    <div className="flex items-center gap-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon size={16} />
      </span>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
    <p className="mt-2 font-display text-xl font-extrabold leading-none tracking-tight text-navy tabular-nums">{value}</p>
  </div>
);

export const AnalyticsTab = () => {
  const [data, setData] = useState<AbstractAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAbstractsAnalytics()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  if (error) return <Banner variant="error">{error}</Banner>;

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const chartColors = Object.values(CHART_HEX);
  const trackRows: BarRow[] = Object.entries(data.trackCounts)
    .filter(([, count]) => count > 0)
    .map(([track, count], i) => ({ key: track, label: track, value: count, displayValue: String(count), hex: chartColors[i % chartColors.length] }));

  const decisionRows: BarRow[] = Object.entries(data.decisionCounts).map(([decision, count]) => ({
    key: decision,
    label: DECISION_LABEL[decision as AbstractDecision],
    value: count,
    displayValue: String(count),
    hex: decision === 'rejected' ? '#DC2626' : decision === 'waitlisted' ? CHART_HEX.amber : '#16A34A',
  }));

  const bandRows: BarRow[] = Object.entries(data.scoreBandCounts).map(([band, count]) => ({
    key: band,
    label: BAND_LABEL[band as ScoreBand],
    value: count,
    displayValue: String(count),
    hex: BAND_HEX[band as ScoreBand],
  }));

  const recommendationRows: BarRow[] = Object.entries(data.recommendationCounts).map(([decision, count]) => ({
    key: decision,
    label: DECISION_LABEL[decision as AbstractDecision],
    value: count,
    displayValue: String(count),
    hex: decision === 'rejected' ? '#DC2626' : decision === 'waitlisted' ? CHART_HEX.amber : '#16A34A',
  }));

  const criterionRows: BarRow[] = data.criterionPerformance.map((c) => ({
    key: c.criterionId,
    label: `${c.label} (${c.weight}%)`,
    value: c.average ?? 0,
    displayValue: c.average !== null ? `${c.average}/5` : 'No scores yet',
    hex: CHART_HEX.violet,
  }));

  const completionPct = data.reviewCompletion.total > 0 ? Math.round((data.reviewCompletion.completed / data.reviewCompletion.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatCard icon={FileText} color="bg-orange/15 text-orange" label="Total" value={data.total} />
        <StatCard icon={Clock} color="bg-warning/15 text-warning" label="Submitted" value={data.statusCounts.submitted} />
        <StatCard icon={Clock} color="bg-info/15 text-info" label="Under Review" value={data.statusCounts.under_review} />
        <StatCard icon={RotateCcw} color="bg-chart-amber/15 text-chart-amber" label="Revision Requested" value={data.statusCounts.revision_requested} />
        <StatCard icon={CheckCircle2} color="bg-success/15 text-success" label="Accepted" value={data.statusCounts.accepted} />
        <StatCard icon={XCircle} color="bg-danger/15 text-danger" label="Rejected" value={data.statusCounts.rejected} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`p-5 ${CARD_CLASS}`}>
          <p className="font-display text-sm font-semibold text-navy">Track Breakdown</p>
          <div className="mt-4">{trackRows.length > 0 ? <BarList rows={trackRows} /> : <p className="text-sm text-slate-400">No abstracts yet</p>}</div>
        </div>

        <div className={`p-5 ${CARD_CLASS}`}>
          <p className="font-display text-sm font-semibold text-navy">Review Completion</p>
          <p className="mt-1 text-sm text-slate-500">
            {data.reviewCompletion.completed} / {data.reviewCompletion.total} completed
          </p>
          <div className="mt-3 h-3 rounded-full bg-offwhite">
            <div className="h-3 rounded-full bg-success" style={{ width: `${completionPct}%` }} />
          </div>
          <p className="mt-1.5 text-right text-xs font-semibold text-success">{completionPct}%</p>

          <p className="mt-5 font-display text-sm font-semibold text-navy">Average Score by Track</p>
          {data.averageScoreByTrack.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No completed reviews yet</p>
          ) : (
            <div className="mt-3 space-y-2">
              {data.averageScoreByTrack.map((t) => (
                <div key={t.track} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">
                    {t.track} <span className="text-slate-400">({t.abstractCount} abstracts)</span>
                  </span>
                  <span className="font-semibold text-navy">{t.averageScore}/100</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`p-5 ${CARD_CLASS}`}>
          <p className="font-display text-sm font-semibold text-navy">Committee Decisions</p>
          <div className="mt-4">
            <BarList rows={decisionRows} />
          </div>
        </div>

        <div className={`p-5 ${CARD_CLASS}`}>
          <p className="font-display text-sm font-semibold text-navy">Score Bands</p>
          <div className="mt-4">
            <BarList rows={bandRows} />
          </div>
        </div>

        <div className={`p-5 ${CARD_CLASS}`}>
          <p className="font-display text-sm font-semibold text-navy">Score Distribution</p>
          <p className="text-xs text-slate-400">Histogram of all completed weighted scores</p>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.scoreDistribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: '#F8F9FA' }} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={40}>
                  {data.scoreDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_HEX.violet} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`p-5 ${CARD_CLASS}`}>
          <p className="font-display text-sm font-semibold text-navy">Reviewer Recommendations</p>
          <div className="mt-4">
            <BarList rows={recommendationRows} />
          </div>
        </div>
      </div>

      <div className={`p-5 ${CARD_CLASS}`}>
        <p className="font-display text-sm font-semibold text-navy">Criterion Performance</p>
        <p className="text-xs text-slate-400">Sorted by lowest average score, to highlight systematic weaknesses</p>
        <div className="mt-4">
          {criterionRows.length > 0 ? <BarList rows={criterionRows} /> : <p className="text-sm text-slate-400">No completed reviews yet</p>}
        </div>
      </div>

      <div className={`overflow-hidden ${CARD_CLASS}`}>
        <p className="p-5 pb-0 font-display text-sm font-semibold text-navy">Reviewer Workload &amp; Scoring Tendencies</p>
        {data.reviewerWorkload.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">No reviewers assigned yet</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Reviewer</th>
                  <th className="px-3 py-3 font-semibold">Assigned</th>
                  <th className="px-3 py-3 font-semibold">Completed</th>
                  <th className="px-3 py-3 font-semibold">Pending</th>
                  <th className="px-3 py-3 font-semibold">Avg Score</th>
                  <th className="px-3 py-3 font-semibold">Avg Turnaround</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.reviewerWorkload.map((r) => (
                  <tr key={r.reviewer._id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-navy">{r.reviewer.fullName}</p>
                      <p className="text-xs text-slate-400">{r.reviewer.email}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{r.assigned}</td>
                    <td className="px-3 py-3 text-slate-500">{r.completed}</td>
                    <td className="px-3 py-3 text-slate-500">{r.pending}</td>
                    <td className="px-3 py-3 text-slate-500">{r.averageScore ?? '—'}</td>
                    <td className="px-3 py-3 text-slate-500">{r.averageTurnaroundHours !== null ? `${r.averageTurnaroundHours}h` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <p className="font-display text-sm font-semibold text-navy">Communication Pipeline</p>
        <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Mail} color="bg-warning/15 text-warning" label="Drafts Prepared" value={data.communicationPipeline.draft} />
          <StatCard icon={CheckCircle2} color="bg-success/15 text-success" label="Sent" value={data.communicationPipeline.sent} />
          <StatCard icon={XCircle} color="bg-danger/15 text-danger" label="Failed" value={data.communicationPipeline.failed} />
          <StatCard icon={Users2} color="bg-slate-200 text-slate-500" label="Cancelled" value={data.communicationPipeline.cancelled} />
        </div>
      </div>
    </div>
  );
};
