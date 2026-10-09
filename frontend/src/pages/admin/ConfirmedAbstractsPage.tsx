import { useState } from 'react';
import { AdminTabs } from '../../components/ui/AdminTabs';
import { PresentersTab } from './confirmedAbstracts/PresentersTab';
import { CompendiumTab } from './confirmedAbstracts/CompendiumTab';

const TABS = [
  { key: 'presenters', label: 'Presenters' },
  { key: 'compendium', label: 'Compendium' },
];

// Two tabs over the same ConfirmedAbstract collection, each editing a
// different slice of it: Presenters manages the curated public
// /abstracts/confirmed showcase (headshots, publish toggle); Compendium
// manages the separate open-access book project (abstract body, structured
// authors, consent, publication status) — see ConfirmedAbstract.model.ts's
// "compendium" sub-document comment.
export const ConfirmedAbstractsPage = () => {
  const [tab, setTab] = useState('presenters');

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Confirmed Abstracts</h1>
        <p className="text-sm text-slate-500">Manage the public presenters showcase and the open-access compendium.</p>
      </div>

      <div className="mt-6">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'presenters' && <PresentersTab />}
        {tab === 'compendium' && <CompendiumTab />}
      </div>
    </div>
  );
};
