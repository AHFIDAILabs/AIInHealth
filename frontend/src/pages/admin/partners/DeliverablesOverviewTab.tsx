import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { fetchPartnerAnalytics, type PartnerAnalytics } from '../../../services/partner.service';
import { getApiErrorMessage } from '../../../services/api';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { CARD_CLASS } from '../../../lib/adminUi';

const StatBlock = ({ icon: Icon, color, label, value }: { icon: typeof CheckCircle2; color: string; label: string; value: number }) => (
  <div className="rounded-xl bg-offwhite p-4 text-center">
    <Icon size={18} className={`mx-auto ${color}`} />
    <p className="mt-2 font-display text-2xl font-extrabold text-navy tabular-nums">{value}</p>
    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
  </div>
);

export const DeliverablesOverviewTab = () => {
  const [data, setData] = useState<PartnerAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPartnerAnalytics()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  if (error) return <Banner variant="error">{error}</Banner>;

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className={`p-6 ${CARD_CLASS}`}>
        <p className="font-display text-base font-semibold text-navy">Deliverable Progress</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatBlock icon={CheckCircle2} color="text-success" label="Completed" value={data.deliverableProgress.completed} />
          <StatBlock icon={Clock} color="text-slate-400" label="Pending" value={data.deliverableProgress.pending} />
          <StatBlock icon={AlertTriangle} color="text-danger" label="Overdue" value={data.deliverableProgress.overdue} />
        </div>
      </div>

      <div className={`p-6 ${CARD_CLASS}`}>
        <p className="font-display text-base font-semibold text-navy">Recent Deliverables</p>
        {data.recentDeliverables.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No recent deliverables.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {data.recentDeliverables.map((d) => {
              const overdue = d.status === 'pending' && new Date(d.dueDate) < new Date();
              return (
                <div key={d._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-navy">{d.description}</p>
                    <p className="text-xs text-slate-400">{d.partner.name} &middot; Due {new Date(d.dueDate).toLocaleDateString()}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      d.status === 'completed' ? 'bg-success/10 text-success' : overdue ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {d.status === 'completed' ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
