import { useState } from 'react';
import { AdminTabs } from '../../components/ui/AdminTabs';
import { SessionsListTab } from './sessions/SessionsListTab';
import { GridViewTab } from './sessions/GridViewTab';
import { TracksTab } from './sessions/TracksTab';

const TABS = [
  { key: 'list', label: 'Sessions List' },
  { key: 'grid', label: 'Grid View' },
  { key: 'tracks', label: 'Tracks' },
];

export const SessionsPage = () => {
  const [tab, setTab] = useState('list');

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Agenda</h1>
        <p className="text-sm text-slate-500">Sessions, tracks, and the public programme.</p>
      </div>

      <div className="mt-6">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'list' && <SessionsListTab />}
        {tab === 'grid' && <GridViewTab />}
        {tab === 'tracks' && <TracksTab />}
      </div>
    </div>
  );
};
