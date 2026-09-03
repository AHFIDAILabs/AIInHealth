import { useEffect, useState } from 'react';
import { CreditCard, Mail, Bell, CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import { fetchIntegrationsStatus, sendTestEmail, sendTestPush, type IntegrationsStatus } from '../../services/integrations.service';
import { getApiErrorMessage } from '../../services/api';
import { Skeleton } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { useToast } from '../../contexts/ToastContext';

export const IntegrationsPage = () => {
  const toast = useToast();
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [error, setError] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchIntegrationsStatus()
      .then(setStatus)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  const copyWebhook = async () => {
    if (!status) return;
    try {
      await navigator.clipboard.writeText(status.paystack.webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast('error', 'Could not copy — copy it manually.');
    }
  };

  const runTestEmail = async () => {
    setTestingEmail(true);
    try {
      const sentTo = await sendTestEmail();
      toast('success', `Test email sent to ${sentTo}`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setTestingEmail(false);
    }
  };

  const runTestPush = async () => {
    setTestingPush(true);
    try {
      const count = await sendTestPush();
      toast('success', `Test push sent to ${count} device${count === 1 ? '' : 's'}`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setTestingPush(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Integrations</h1>
        <p className="text-sm text-slate-500">Connection status for the services this portal depends on — configured via server environment variables, never edited here.</p>
      </div>

      {error && (
        <div className="mt-6">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {/* Paystack */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                <CreditCard size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">Paystack</p>
                <p className="text-xs text-slate-500">Payment checkout &amp; webhook confirmation</p>
              </div>
            </div>
            {!status ? (
              <Skeleton className="h-6 w-24" />
            ) : status.paystack.configured ? (
              <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                <CheckCircle2 size={13} /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                <XCircle size={13} /> Not configured
              </span>
            )}
          </div>
          {status && (
            <div className="mt-4 rounded-lg bg-offwhite px-3.5 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Webhook URL — paste into Paystack Dashboard</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate text-xs text-navy">{status.paystack.webhookUrl}</code>
                <button onClick={copyWebhook} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-navy">
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Email */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                <Mail size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">Email (Microsoft Graph)</p>
                <p className="text-xs text-slate-500">{status?.email.sender ?? 'Registration confirmations, digests, magic links'}</p>
              </div>
            </div>
            {!status ? (
              <Skeleton className="h-6 w-24" />
            ) : status.email.configured ? (
              <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                <CheckCircle2 size={13} /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                <XCircle size={13} /> Not configured
              </span>
            )}
          </div>
          <button
            onClick={runTestEmail}
            disabled={!status?.email.configured || testingEmail}
            className="mt-4 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-navy transition-colors hover:border-orange/40 disabled:opacity-40"
          >
            {testingEmail ? 'Sending…' : 'Send test email to myself'}
          </button>
        </div>

        {/* Push */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                <Bell size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">Web Push (VAPID)</p>
                <p className="text-xs text-slate-500">Admin &amp; delegate browser notifications</p>
              </div>
            </div>
            {!status ? (
              <Skeleton className="h-6 w-24" />
            ) : status.push.configured ? (
              <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                <CheckCircle2 size={13} /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                <XCircle size={13} /> Not configured
              </span>
            )}
          </div>
          <button
            onClick={runTestPush}
            disabled={!status?.push.configured || testingPush}
            className="mt-4 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-navy transition-colors hover:border-orange/40 disabled:opacity-40"
          >
            {testingPush ? 'Sending…' : 'Send test push to myself'}
          </button>
          <p className="mt-2 text-xs text-slate-400">Requires push enabled for your account in Settings first.</p>
        </div>
      </div>
    </div>
  );
};
