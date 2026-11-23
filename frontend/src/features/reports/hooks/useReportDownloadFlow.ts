import { useCallback, useState } from 'react';
import { trackEvent } from '../../../lib/analytics';
import { requestReportDownloadUrl } from '../services/reports.service';
import { useReportAccess } from './useReportAccess';
import type { ReportEntry } from '../types';

// Shared by both the library page and the session detail page — every
// "Download" button on either page goes through this one flow: verified
// visitors download immediately, unverified ones get the gate modal and the
// click they just made resumes automatically the moment they verify.
export const useReportDownloadFlow = () => {
  const gate = useReportAccess();
  const [pendingEntry, setPendingEntry] = useState<ReportEntry | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const performDownload = useCallback(async (entry: ReportEntry) => {
    setDownloadingId(entry.id);
    try {
      const url = await requestReportDownloadUrl(entry.id);
      void trackEvent('report_download', { reportId: entry.id, sessionId: entry.sessionId, docType: entry.docType });
      window.open(url, '_blank', 'noopener');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const requestDownload = useCallback(
    (entry: ReportEntry) => {
      if (gate.isVerified) {
        void performDownload(entry);
        return;
      }
      setPendingEntry(entry);
      setGateOpen(true);
    },
    [gate.isVerified, performDownload]
  );

  const handleVerified = useCallback(async () => {
    setGateOpen(false);
    if (pendingEntry) {
      await performDownload(pendingEntry);
      setPendingEntry(null);
    }
  }, [pendingEntry, performDownload]);

  return {
    gate,
    gateOpen,
    closeGate: () => setGateOpen(false),
    handleVerified,
    requestDownload,
    downloadingId,
  };
};
