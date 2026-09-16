import { useState } from 'react';
import { AdminTabs } from '../../components/ui/AdminTabs';
import { AbstractsListTab } from './abstracts/AbstractsListTab';
import { ReviewMatrixTab } from './abstracts/ReviewMatrixTab';
import { RubricTab } from './abstracts/RubricTab';

// Communications and Analytics tabs are a separate, later phase — see the
// "Abstracts & Reviews" plan. This shell only wires up the three Phase 1 tabs.
const TABS = [
  { key: 'abstracts', label: 'Abstracts' },
  { key: 'review-matrix', label: 'Review Matrix' },
  { key: 'rubric', label: 'Rubric' },
];

export const AbstractsPage = () => {
  const [tab, setTab] = useState('abstracts');

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Abstracts &amp; Reviews</h1>
        <p className="text-sm text-slate-500">Manage submissions, reviewer assignments, and the scoring rubric.</p>
      </div>

      <div className="mt-6">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'abstracts' && <AbstractsListTab />}
        {tab === 'review-matrix' && <ReviewMatrixTab />}
        {tab === 'rubric' && <RubricTab />}
      </div>
    </div>
  );
};
