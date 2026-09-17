import { useState } from 'react';
import { AdminTabs } from '../../components/ui/AdminTabs';
import { OverviewTab } from './analytics/OverviewTab';
import { RegistrationsTab } from './analytics/RegistrationsTab';
import { RevenueTab } from './analytics/RevenueTab';
import { EngagementTab } from './analytics/EngagementTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'registrations', label: 'Registrations' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'engagement', label: 'Engagement' },
];

export const AnalyticsPage = () => {
  const [tab, setTab] = useState('overview');

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Analytics & Reports</h1>
        <p className="text-sm text-slate-500">Cross-module insights for this event — every number here is a real, live query.</p>
      </div>

      <div className="mt-6">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'registrations' && <RegistrationsTab />}
        {tab === 'revenue' && <RevenueTab />}
        {tab === 'engagement' && <EngagementTab />}
      </div>
    </div>
  );
};
