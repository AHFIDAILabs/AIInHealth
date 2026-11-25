import { useCallback, useState } from 'react';
import axios from 'axios';
import { trackEvent } from '../../../lib/analytics';
import { useToast } from '../../../contexts/ToastContext';
import type { ApiErrorShape } from '../../../services/api';
import { requestReportDownloadUrl } from '../services/reports.service';
import { getReportErrorMessage } from '../services/reportsErrorMessage';
import { useReportAccess } from './useReportAccess';
import type { ReportEntry } from '../types';

const isExpiredSession = (err: unknown): boolean =>
  axios.isAxiosError(err) && (err.response?.data as ApiErrorShape | undefined)?.error?.code === 'UNAUTHENTICATED';

// Shared by both the library page and the session detail page — every
// "Download" button on either page goes through this one flow: verified
// visitors download immediately, unverified ones get the gate modal and the
// click they just made resumes automatically the moment they verify.
export const useReportDownloadFlow = () => {
  const gate = useReportAccess();
  const toast = useToast();
  const [pendingEntry, setPendingEntry] = useState<ReportEntry | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const performDownload = useCallback(
    async (entry: ReportEntry) => {
      setDownloadingId(entry.id);
      try {
        const url = await requestReportDownloadUrl(entry.id);
        void trackEvent('report_download', { reportId: entry.id, sessionId: entry.sessionId, docType: entry.docType });
        window.open(url, '_blank', 'noopener');
      } catch (err) {
        if (isExpiredSession(err)) {
          // A ~6-month-old session finally lapsed — re-prompt for this same
          // report rather than just failing; verifying again resumes it,
          // same as the first-time gate flow.
          setPendingEntry(entry);
          setGateOpen(true);
          toast('info', 'Your session expired — please verify your email again.');
          return;
        }
        toast('error', getReportErrorMessage(err, "Couldn't prepare that download. Please try again."));
      } finally {
        setDownloadingId(null);
      }
    },
    [toast]
  );

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
