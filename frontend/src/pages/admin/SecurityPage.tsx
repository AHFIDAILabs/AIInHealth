import { useState } from 'react';
import { AdminTabs } from '../../components/ui/AdminTabs';
import { OverviewTab } from './security/OverviewTab';
import { EventsTab } from './security/EventsTab';
import { BlockedIpsTab } from './security/BlockedIpsTab';
import { SessionsTab } from './security/SessionsTab';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'events', label: 'Events' },
  { key: 'blocked-ips', label: 'Blocked IPs' },
  { key: 'sessions', label: 'Sessions' },
];

// Root-admin-only — see RequireRootAdmin.tsx (the route guard wrapping this
// page in App.tsx) and requireRootAdmin.middleware.ts (the actual server-side
// enforcement every API call here goes through).
export const SecurityPage = () => {
  const [tab, setTab] = useState('overview');

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Security Command Center</h1>
        <p className="text-sm text-slate-500">Live threat monitoring, IP blocking, lockdown mode, and admin session control.</p>
      </div>

      <div className="mt-6">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'events' && <EventsTab />}
        {tab === 'blocked-ips' && <BlockedIpsTab />}
        {tab === 'sessions' && <SessionsTab />}
      </div>
    </div>
  );
};
