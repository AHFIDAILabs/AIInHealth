import { useEffect, useState } from 'react';
import { Users2, CheckCircle2, Wallet, HandCoins, FileCheck2, Building2, HeartHandshake, Mail } from 'lucide-react';
import { fetchAnalyticsOverview, type AnalyticsOverview } from '../../../services/analytics.service';
import { getApiErrorMessage } from '../../../services/api';
import { Banner } from '../../../components/ui/Banner';
import { AnalyticsStatCard } from './AnalyticsStatCard';
import { TrendAreaChart } from './TrendAreaChart';
import { HorizontalBarChart } from './HorizontalBarChart';

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;

export const OverviewTab = () => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyticsOverview()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  if (error) return <Banner variant="error">{error}</Banner>;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AnalyticsStatCard icon={Users2} label="Total Registrations" value={data?.totalRegistrations ?? null} />
        <AnalyticsStatCard icon={CheckCircle2} label="Check-In Rate" value={data ? `${data.checkInRate}%` : null} />
        <AnalyticsStatCard icon={Wallet} label="Total Revenue" value={data ? naira(data.combinedRevenueNaira) : null} />
        <AnalyticsStatCard icon={HandCoins} label="Sponsor Revenue" value={data ? naira(data.sponsorRevenueNaira) : null} />
        <AnalyticsStatCard
          icon={FileCheck2}
          label="Abstracts Accepted"
          value={data ? data.abstractsAccepted : null}
          suffix={data ? `/ ${data.abstractsTotal}` : undefined}
        />
        <AnalyticsStatCard icon={Building2} label="Exhibitors" value={data?.exhibitorsCount ?? null} />
        <AnalyticsStatCard
          icon={HeartHandshake}
          label="Active Volunteers"
          value={data ? data.activeVolunteers : null}
          suffix={data ? `/ ${data.totalVolunteers}` : undefined}
        />
        <AnalyticsStatCard icon={Mail} label="Emails Sent" value={data?.emailsSent ?? null} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registration Trend — Last 30 Days</p>
          <TrendAreaChart
            data={data?.registrationsByDay ?? null}
            color="#E8792C"
            emptyLabel="No registrations in this window yet"
            unitLabel={(n) => `registration${n === 1 ? '' : 's'}`}
          />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sponsor Revenue Breakdown</p>
          <HorizontalBarChart
            data={data?.sponsorRevenueByPackage.map((p) => ({ label: p.packageName, value: p.revenueNaira })) ?? null}
            color="#7C3AED"
            emptyLabel="No sponsor payments recorded yet"
            valueFormatter={naira}
          />
        </div>
      </div>
    </div>
  );
};
