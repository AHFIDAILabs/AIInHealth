import { useCallback, useState } from 'react';
import axios from 'axios';
import { trackEvent } from '../../../lib/analytics';
import { useToast } from '../../../contexts/ToastContext';
import type { ApiErrorShape } from '../../../services/api';
import { requestReportViewUrl, reportDownloadFileUrl } from '../services/reports.service';
import { getReportErrorMessage } from '../services/reportsErrorMessage';
import { useReportAccess } from './useReportAccess';
import type { ReportEntry } from '../types';

type ReportAction = 'view' | 'download';
type PendingAction = { entry: ReportEntry; action: ReportAction } | null;

const isExpiredSession = (err: unknown): boolean =>
  axios.isAxiosError(err) && (err.response?.data as ApiErrorShape | undefined)?.error?.code === 'UNAUTHENTICATED';

// Triggers a real browser download (not window.open, which would just
// re-open a PDF inline the same as View) by clicking a detached, invisible
// <a> pointed at the backend's byte-proxying download endpoint — the
// Content-Disposition header that endpoint sets is what forces the save, the
// `download` attribute here just reinforces that for any edge-case browser.
const triggerFileDownload = (url: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = '';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

// Shared by both the library page and the session detail page — every
// "View"/"Download" button on either goes through this one flow: verified
// visitors act immediately, unverified ones get the gate modal and the
// specific click they just made (view OR download) resumes automatically the
// moment they verify.
export const useReportDownloadFlow = () => {
  const gate = useReportAccess();
  const toast = useToast();
  const [pending, setPending] = useState<PendingAction>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const perform = useCallback(
    async (entry: ReportEntry, action: ReportAction) => {
      setBusyId(entry.id);
      try {
        if (action === 'view') {
          const url = await requestReportViewUrl(entry.id);
          void trackEvent('report_view', { reportId: entry.id, sessionId: entry.sessionId, docType: entry.docType });
          window.open(url, '_blank', 'noopener');
        } else {
          triggerFileDownload(reportDownloadFileUrl(entry.id));
          void trackEvent('report_download', { reportId: entry.id, sessionId: entry.sessionId, docType: entry.docType });
        }
      } catch (err) {
        if (isExpiredSession(err)) {
          // A ~6-month-old session finally lapsed — re-prompt for this same
          // action rather than just failing; verifying again resumes it,
          // same as the first-time gate flow.
          setPending({ entry, action });
          setGateOpen(true);
          toast('info', 'Your session expired — please verify your email again.');
          return;
        }
        toast(
          'error',
          getReportErrorMessage(err, action === 'view' ? "Couldn't open that report. Please try again." : "Couldn't prepare that download. Please try again.")
        );
      } finally {
        setBusyId(null);
      }
    },
    [toast]
  );

  const requestAction = useCallback(
    (entry: ReportEntry, action: ReportAction) => {
      if (gate.isVerified) {
        void perform(entry, action);
        return;
      }
      setPending({ entry, action });
      setGateOpen(true);
    },
    [gate.isVerified, perform]
  );

  const requestView = useCallback((entry: ReportEntry) => requestAction(entry, 'view'), [requestAction]);
  const requestDownload = useCallback((entry: ReportEntry) => requestAction(entry, 'download'), [requestAction]);

  const handleVerified = useCallback(async () => {
    setGateOpen(false);
    if (pending) {
      await perform(pending.entry, pending.action);
      setPending(null);
    }
  }, [pending, perform]);

  return {
    gate,
    gateOpen,
    closeGate: () => setGateOpen(false),
    handleVerified,
    requestView,
    requestDownload,
    busyId,
  };
};
