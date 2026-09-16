import { useState } from 'react';
import { AdminTabs } from '../../components/ui/AdminTabs';
import { SponsorsTab } from './partners/SponsorsTab';
import { PackagesTab } from './partners/PackagesTab';
import { OutreachTab } from './partners/OutreachTab';
import { DeliverablesOverviewTab } from './partners/DeliverablesOverviewTab';

const TABS = [
  { key: 'sponsors', label: 'Sponsors' },
  { key: 'packages', label: 'Packages' },
  { key: 'outreach', label: 'Outreach' },
  { key: 'deliverables', label: 'Deliverables Overview' },
];

export const PartnersPage = () => {
  const [tab, setTab] = useState('sponsors');

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Sponsors &amp; Partners</h1>
        <p className="text-sm text-slate-500">Manage sponsors, partners, packages, deliverables, and outreach.</p>
      </div>

      <div className="mt-6">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'sponsors' && <SponsorsTab />}
        {tab === 'packages' && <PackagesTab />}
        {tab === 'outreach' && <OutreachTab />}
        {tab === 'deliverables' && <DeliverablesOverviewTab />}
      </div>
    </div>
  );
};
