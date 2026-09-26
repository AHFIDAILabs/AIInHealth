import { useState } from 'react';
import { AdminTabs } from '../../components/ui/AdminTabs';
import { EntriesTab } from './policyTracker/EntriesTab';
import { SourcesTab } from './policyTracker/SourcesTab';

const TABS = [
  { key: 'entries', label: 'Entries' },
  { key: 'sources', label: 'Sources' },
];

export const PolicyTrackerPage = () => {
  const [tab, setTab] = useState('entries');

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Policy Tracker</h1>
        <p className="text-sm text-slate-500">Which countries have (or are drafting) national AI-in-health frameworks.</p>
      </div>

      <div className="mt-6">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'entries' && <EntriesTab />}
        {tab === 'sources' && <SourcesTab />}
      </div>
    </div>
  );
};
