import { useEffect, useState } from 'react';
import { Wallet, HandCoins, Banknote } from 'lucide-react';
import { fetchAnalyticsRevenue, type AnalyticsRevenue } from '../../../services/analytics.service';
import { getApiErrorMessage } from '../../../services/api';
import { Banner } from '../../../components/ui/Banner';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { AnalyticsStatCard } from './AnalyticsStatCard';
import { HorizontalBarChart } from './HorizontalBarChart';

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const RevenueTab = () => {
  const [data, setData] = useState<AnalyticsRevenue | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyticsRevenue()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  if (error) return <Banner variant="error">{error}</Banner>;

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <AnalyticsStatCard icon={Wallet} label="Total Registration Revenue" value={data ? naira(data.totalRegistrationRevenueNaira) : null} />
        <AnalyticsStatCard icon={HandCoins} label="Total Sponsor Revenue" value={data ? naira(data.totalSponsorRevenueNaira) : null} />
        <AnalyticsStatCard icon={Banknote} label="Combined Revenue" value={data ? naira(data.combinedRevenueNaira) : null} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sponsor Revenue by Package</p>
          <HorizontalBarChart
            data={data?.sponsorRevenueByPackage.map((p) => ({ label: p.packageName, value: p.revenueNaira })) ?? null}
            color="#7C3AED"
            emptyLabel="No sponsor payments recorded yet"
            valueFormatter={naira}
          />
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registration Revenue by Ticket</p>
          <HorizontalBarChart
            data={data?.registrationRevenueByTicket.map((c) => ({ label: label(c.category), value: c.revenueNaira })) ?? null}
            color="#E11D48"
            emptyLabel="No ticket revenue recorded yet"
            valueFormatter={naira}
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        <p className="px-5 pt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Top Sponsors</p>
        {!data ? (
          <SkeletonRows rows={4} cols={3} />
        ) : data.topSponsors.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">No sponsors recorded yet</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Company</th>
                  <th className="px-3 py-3 font-semibold">Package</th>
                  <th className="px-3 py-3 font-semibold text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.topSponsors.map((s) => (
                  <tr key={s.name}>
                    <td className="px-5 py-3 font-medium text-navy">{s.name}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-offwhite px-2 py-0.5 text-[11px] font-medium text-slate-500">{s.packageName}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-navy">{naira(s.amountPaidNaira)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
