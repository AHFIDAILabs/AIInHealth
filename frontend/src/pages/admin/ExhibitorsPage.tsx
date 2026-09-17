import { useState } from 'react';
import { AdminTabs } from '../../components/ui/AdminTabs';
import { ExhibitorsTab } from './exhibitors/ExhibitorsTab';
import { LeadsAnalyticsTab } from './exhibitors/LeadsAnalyticsTab';
import { FormFieldsTab } from './exhibitors/FormFieldsTab';

const TABS = [
  { key: 'exhibitors', label: 'Exhibitors' },
  { key: 'leads', label: 'Leads Analytics' },
  { key: 'fields', label: 'Form Fields' },
];

export const ExhibitorsPage = () => {
  const [tab, setTab] = useState('exhibitors');

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Exhibitors & Leads</h1>
        <p className="text-sm text-slate-500">Manage exhibitor booths, capture leads at the event, and configure signup questions.</p>
      </div>

      <div className="mt-6">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'exhibitors' && <ExhibitorsTab />}
        {tab === 'leads' && <LeadsAnalyticsTab />}
        {tab === 'fields' && <FormFieldsTab />}
      </div>
    </div>
  );
};
