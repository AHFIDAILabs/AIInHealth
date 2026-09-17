import { useEffect, useState } from 'react';
import { Send, XCircle, FileEdit, Mail } from 'lucide-react';
import { fetchAnalyticsEngagement, type AnalyticsEngagement } from '../../../services/analytics.service';
import { getApiErrorMessage } from '../../../services/api';
import { Banner } from '../../../components/ui/Banner';
import { AnalyticsStatCard } from './AnalyticsStatCard';
import { DonutChart } from './DonutChart';
import { HorizontalBarChart } from './HorizontalBarChart';

const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Deliberately no open-rate/click-rate card here — that data doesn't exist
// anywhere in this app (Microsoft Graph's sendMail has no tracking built in),
// and this page never shows an invented number in place of a real one. What's
// shown instead is real: how many abstract decision emails actually sent vs.
// failed, and newsletter growth.
export const EngagementTab = () => {
  const [data, setData] = useState<AnalyticsEngagement | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyticsEngagement()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  if (error) return <Banner variant="error">{error}</Banner>;

  return (
    <div>
      <div>
        <h2 className="font-display text-base font-semibold text-navy">Emails</h2>
        <p className="text-xs text-slate-500">Abstract decision-notification sends — the only email flow this app tracks status for.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AnalyticsStatCard icon={Send} label="Sent" value={data?.emailPipeline.sent ?? null} />
          <AnalyticsStatCard icon={XCircle} label="Failed" value={data?.emailPipeline.failed ?? null} />
          <AnalyticsStatCard icon={FileEdit} label="Draft" value={data?.emailPipeline.draft ?? null} />
          <AnalyticsStatCard icon={Mail} label="Newsletter Subscribers" value={data?.newsletterSubscribers ?? null} />
        </div>
      </div>

      <div className="mt-6">
        <h2 className="font-display text-base font-semibold text-navy">Abstracts</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Abstracts by Status</p>
            <DonutChart
              data={data ? Object.entries(data.abstractsByStatus).map(([k, v]) => ({ label: label(k), value: v })) : null}
              emptyLabel="No abstracts submitted yet"
            />
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Abstracts by Track</p>
            <HorizontalBarChart
              data={data ? Object.entries(data.abstractsByTrack).map(([k, v]) => ({ label: k, value: v })) : null}
              color="#0D9488"
              emptyLabel="No abstracts submitted yet"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
