import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ShieldAlert, LogIn, Gauge, Ban, Users, Power } from 'lucide-react';
import { fetchSecurityOverview, setLockdown, type SecurityOverview } from '../../../services/security.service';
import { getApiErrorMessage } from '../../../services/api';
import { Banner } from '../../../components/ui/Banner';
import { Skeleton } from '../../../components/ui/Skeleton';
import { HorizontalBarChart } from '../analytics/HorizontalBarChart';
import { CARD_CLASS, CHART_HEX } from '../../../lib/adminUi';

// Reuses this app's own established status hex values (Banner.tsx's variant
// colors / tailwind.config.js) rather than inventing a new palette — severity
// is a status dimension (informational/warning/critical), not an arbitrary
// category, so it gets the status treatment: fixed colors, always paired with
// a label, never reused for anything else.
const SEVERITY_HEX = { low: '#2563EB', medium: '#D97706', high: '#DC2626' } as const;
const SEVERITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' } as const;

const StatCard = ({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof ShieldAlert;
  color: string;
  label: string;
  value: number;
}) => (
  <div className={`overflow-hidden p-4 ${CARD_CLASS}`}>
    <div className="flex items-center gap-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon size={16} />
      </span>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
    <p className="mt-2 font-display text-xl font-extrabold leading-none tracking-tight text-navy tabular-nums">{value}</p>
  </div>
);

const hourLabel = (hour: string) => {
  const d = new Date(hour);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

// Pivots the backend's one-row-per-(hour,severity) shape into one row per
// hour with a count per severity — what recharts' stacked Bar needs, and lets
// every hour in the last 24h show even if it had zero events (a gap in the
// bars is meaningful here, not just missing data).
const buildHourlyRows = (rows: SecurityOverview['eventsByHour']) => {
  const now = new Date();
  const buckets: { hour: string; low: number; medium: number; high: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    buckets.push({ hour: `${d.toISOString().slice(0, 13)}:00`, low: 0, medium: 0, high: 0 });
  }
  const byHour = new Map(buckets.map((b) => [b.hour, b]));
  for (const row of rows) {
    const bucket = byHour.get(row.hour);
    if (bucket) bucket[row.severity] += row.count;
  }
  return buckets;
};

export const OverviewTab = () => {
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [error, setError] = useState('');
  const [lockdownBusy, setLockdownBusy] = useState(false);

  const load = () => {
    fetchSecurityOverview()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  };

  useEffect(load, []);

  const toggleLockdown = async () => {
    if (!data) return;
    const enabling = !data.lockdown.enabled;
    const confirmMsg = enabling
      ? 'Enable lockdown mode? This immediately blocks all new public form submissions (registration, abstracts, inquiries, etc.) site-wide until you turn it off. Admin access and existing payment flows stay open.'
      : 'Disable lockdown mode? Public form submissions will resume immediately.';
    if (!window.confirm(confirmMsg)) return;

    const reason = enabling ? window.prompt('Optional: note why lockdown is being enabled (shown in the audit log)') ?? undefined : undefined;
    setLockdownBusy(true);
    try {
      await setLockdown(enabling, reason);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLockdownBusy(false);
    }
  };

  if (error) return <Banner variant="error">{error}</Banner>;

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const hourlyRows = buildHourlyRows(data.eventsByHour);
  const topIpRows = data.topOffendingIps.map((r) => ({ label: r.ip, value: r.count }));

  return (
    <div className="space-y-6">
      {/* Lockdown is the "wade it off" button — front and center, not buried
          in a settings tab, since it's meant to be reachable in seconds
          during an actual incident. */}
      <div
        className={`flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center sm:justify-between ${CARD_CLASS} ${
          data.lockdown.enabled ? 'border-danger/30 bg-danger/5' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${data.lockdown.enabled ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'}`}>
            <Power size={20} />
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-navy">
              Lockdown Mode — {data.lockdown.enabled ? <span className="text-danger">ACTIVE</span> : <span className="text-success">Off</span>}
            </p>
            <p className="mt-0.5 max-w-md text-xs text-slate-500">
              {data.lockdown.enabled
                ? `Public submissions are paused${data.lockdown.reason ? ` — "${data.lockdown.reason}"` : ''}. Admin access and payments stay open.`
                : 'Instantly pauses all public form submissions (registration, abstracts, inquiries, newsletter, etc.) while you investigate. Reversible any time.'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleLockdown}
          disabled={lockdownBusy}
          className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
            data.lockdown.enabled ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'
          }`}
        >
          {data.lockdown.enabled ? 'Disable Lockdown' : 'Enable Lockdown'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={LogIn} color="bg-warning/15 text-warning" label="Failed Logins (24h)" value={data.failedLogins24h} />
        <StatCard icon={ShieldAlert} color="bg-danger/15 text-danger" label="High Severity (24h)" value={data.highSeverity24h} />
        <StatCard icon={Gauge} color="bg-chart-blue/15 text-chart-blue" label="Rate Limit Trips (24h)" value={data.rateLimitTrips24h} />
        <StatCard icon={Ban} color="bg-chart-rose/15 text-chart-rose" label="Blocked IPs" value={data.blockedIpCount} />
        <StatCard icon={Users} color="bg-success/15 text-success" label="Active Admin Sessions" value={data.activeAdminSessionCount} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`p-5 ${CARD_CLASS}`}>
          <p className="font-display text-sm font-semibold text-navy">Security Events — Last 24 Hours</p>
          <p className="text-xs text-slate-400">Stacked by severity, one bar per hour</p>
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyRows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="hour" tickFormatter={hourLabel} tick={{ fontSize: 9, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} interval={3} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip labelFormatter={(v) => hourLabel(String(v))} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                <Legend
                  formatter={(value) => SEVERITY_LABEL[value as keyof typeof SEVERITY_LABEL]}
                  wrapperStyle={{ fontSize: 11 }}
                  iconSize={9}
                />
                <Bar dataKey="low" stackId="sev" fill={SEVERITY_HEX.low} name="low" />
                <Bar dataKey="medium" stackId="sev" fill={SEVERITY_HEX.medium} name="medium" />
                <Bar dataKey="high" stackId="sev" fill={SEVERITY_HEX.high} radius={[3, 3, 0, 0]} name="high" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`p-5 ${CARD_CLASS}`}>
          <p className="font-display text-sm font-semibold text-navy">Top Offending IPs</p>
          <p className="text-xs text-slate-400">By event count, last 7 days</p>
          <HorizontalBarChart data={topIpRows} color={CHART_HEX.rose} emptyLabel="No repeat offenders in the last 7 days" />
        </div>
      </div>

      <div className={`overflow-hidden ${CARD_CLASS}`}>
        <p className="p-5 pb-0 font-display text-sm font-semibold text-navy">Recent High-Severity Events</p>
        {data.recentHighSeverityEvents.length === 0 ? (
          <p className="p-5 text-sm text-slate-400">None recorded — this is what you want to see.</p>
        ) : (
          <div className="mt-2 divide-y divide-slate-100">
            {data.recentHighSeverityEvents.map((e) => (
              <div key={e._id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{e.type.replace(/[._]/g, ' ')}</p>
                  <p className="text-xs text-slate-400">
                    {e.ip ?? 'unknown IP'} &middot; {new Date(e.createdAt).toLocaleString()}
                    {e.email && <> &middot; {e.email}</>}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-danger/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-danger">High</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
