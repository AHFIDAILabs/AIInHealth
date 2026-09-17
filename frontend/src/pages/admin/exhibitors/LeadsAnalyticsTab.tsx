import { useEffect, useState } from 'react';
import { fetchExhibitorAnalytics, type ExhibitorAnalytics } from '../../../services/exhibitor.service';
import { getApiErrorMessage } from '../../../services/api';
import { Banner } from '../../../components/ui/Banner';
import { HorizontalBarChart } from '../analytics/HorizontalBarChart';
import { DonutChart } from '../analytics/DonutChart';
import { CARD_CLASS } from '../../../lib/adminUi';

const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const LeadsAnalyticsTab = () => {
  const [data, setData] = useState<ExhibitorAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchExhibitorAnalytics()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  if (error) return <Banner variant="error">{error}</Banner>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`p-5 ${CARD_CLASS}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Top Exhibitors by Leads</p>
        <HorizontalBarChart
          data={data?.topExhibitorsByLeads.map((e) => ({ label: e.exhibitorName, value: e.leadCount })) ?? null}
          color="#E8792C"
          emptyLabel="No leads captured yet"
        />
      </div>
      <div className={`p-5 ${CARD_CLASS}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Leads by Interest Level</p>
        <DonutChart
          data={data ? Object.entries(data.leadsByInterestLevel).map(([k, v]) => ({ label: label(k), value: v })) : null}
          emptyLabel="No leads captured yet"
        />
      </div>
    </div>
  );
};
