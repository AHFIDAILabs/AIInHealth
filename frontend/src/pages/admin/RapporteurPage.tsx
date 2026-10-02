import { useState } from 'react';
import { AdminTabs } from '../../components/ui/AdminTabs';
import { AssignTab } from './rapporteur/AssignTab';
import { LiveStatusTab } from './rapporteur/LiveStatusTab';
import { ReviewQueueTab } from './rapporteur/ReviewQueueTab';
import { LiveTranscriptTab } from './rapporteur/LiveTranscriptTab';

const TABS = [
  { key: 'assign', label: 'Assign' },
  { key: 'live-status', label: 'Live Status' },
  { key: 'review-queue', label: 'Review Queue' },
  { key: 'live-transcript', label: 'Live Transcript' },
];

export const RapporteurPage = () => {
  const [tab, setTab] = useState('assign');

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Rapporteurs</h1>
        <p className="text-sm text-slate-500">
          Assign session rapporteurs, watch their notes come in live, and review AI-polished summaries before they go out.
        </p>
      </div>

      <div className="mt-6">
        <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {tab === 'assign' && <AssignTab />}
        {tab === 'live-status' && <LiveStatusTab />}
        {tab === 'review-queue' && <ReviewQueueTab />}
        {tab === 'live-transcript' && <LiveTranscriptTab />}
      </div>
    </div>
  );
};
