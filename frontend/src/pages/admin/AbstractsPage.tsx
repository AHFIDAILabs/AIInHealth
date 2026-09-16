import { useState } from 'react';
import { AdminTabs } from '../../components/ui/AdminTabs';
import { AbstractsListTab } from './abstracts/AbstractsListTab';
import { ReviewMatrixTab } from './abstracts/ReviewMatrixTab';
import { RubricTab } from './abstracts/RubricTab';
import { CommunicationsTab } from './abstracts/CommunicationsTab';
import { AnalyticsTab } from './abstracts/AnalyticsTab';

const TABS = [
  { key: 'abstracts', label: 'Abstracts' },
  { key: 'review-matrix', label: 'Review Matrix' },
  { key: 'rubric', label: 'Rubric' },
  { key: 'communications', label: 'Communications' },
  { key: 'analytics', label: 'Analytics' },
];

export const AbstractsPage = () => {
  const [tab, setTab] = useState('abstracts');

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Abstracts &amp; Reviews</h1>
        <p className="text-sm text-slate-500">Manage submissions, reviewer assignments, the scoring rubric, decision notifications, and analytics.</p>
      </div>

      <div className="mt-6">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'abstracts' && <AbstractsListTab />}
        {tab === 'review-matrix' && <ReviewMatrixTab />}
        {tab === 'rubric' && <RubricTab />}
        {tab === 'communications' && <CommunicationsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
};
