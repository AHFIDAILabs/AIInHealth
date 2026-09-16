import { useEffect, useState } from 'react';
import { MessageSquare, CalendarClock } from 'lucide-react';
import { fetchPartnerAnalytics, PARTNER_STATUSES, type PartnerAnalytics, type PartnerStatus } from '../../../services/partner.service';
import { getApiErrorMessage } from '../../../services/api';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { CARD_CLASS, CHART_HEX } from '../../../lib/adminUi';

const STATUS_LABEL: Record<PartnerStatus, string> = {
  lead: 'Lead',
  contacted: 'Contacted',
  negotiating: 'Negotiating',
  confirmed: 'Confirmed',
  active: 'Active',
};

const StatCard = ({ icon: Icon, color, label, value, hint }: { icon: typeof MessageSquare; color: string; label: string; value: number; hint: string }) => (
  <div className={`overflow-hidden p-5 ${CARD_CLASS}`}>
    <div className="flex items-center gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={20} />
      </span>
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
    </div>
    <p className="mt-3 font-display text-[26px] font-extrabold leading-none tracking-tight text-navy tabular-nums">{value}</p>
    <p className="mt-1 text-xs text-slate-400">{hint}</p>
  </div>
);

export const OutreachTab = () => {
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
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  const maxCount = Math.max(1, ...PARTNER_STATUSES.map((s) => data.conversionFunnel[s]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={MessageSquare} color="bg-chart-blue/15 text-chart-blue" label="Total Interactions" value={data.totalInteractions} hint="Logged across all sponsors" />
        <StatCard icon={CalendarClock} color="bg-warning/15 text-warning" label="Pending Follow-Ups" value={data.pendingFollowUps} hint="Tasks requiring attention" />
      </div>

      <div className={`p-6 ${CARD_CLASS}`}>
        <p className="font-display text-base font-semibold text-navy">Conversion Funnel</p>
        <p className="text-sm text-slate-500">Sponsor progression from initial lead to active participant.</p>
        <div className="mt-6 space-y-4">
          {PARTNER_STATUSES.map((status, i) => {
            const count = data.conversionFunnel[status];
            const pct = (count / maxCount) * 100;
            return (
              <div key={status}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-navy">{STATUS_LABEL[status]}</span>
                  <span className="font-semibold text-navy">{count}</span>
                </div>
                <div className="mt-1.5 h-3 rounded-full bg-offwhite">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%`, backgroundColor: Object.values(CHART_HEX)[i % Object.values(CHART_HEX).length] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
