import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, CheckCircle2, Users2, Wallet } from 'lucide-react';
import { fetchAnalyticsOverview, type AnalyticsOverview } from '../../services/analytics.service';
import { getApiErrorMessage } from '../../services/api';
import { Skeleton } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const AnalyticsPage = () => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyticsOverview()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  const funnelSteps = data
    ? [
        { label: 'Registrations Started', value: data.funnel.created },
        { label: 'Paid', value: data.funnel.paid },
        { label: 'Confirmed', value: data.funnel.confirmed },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Analytics</h1>
        <p className="text-sm text-slate-500">Trends and conversion beyond the Dashboard&rsquo;s point-in-time totals — last 30 days.</p>
      </div>

      {error && (
        <div className="mt-6">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Wallet size={12} /> Attendee Conversion
          </p>
          {data ? (
            <p className="mt-1.5 font-display text-2xl font-bold text-navy">
              {data.funnel.created ? Math.round((data.funnel.paid / data.funnel.created) * 100) : 0}%
            </p>
          ) : (
            <Skeleton className="mt-2 h-7 w-14" />
          )}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <CheckCircle2 size={12} /> Check-In Rate
          </p>
          {data ? <p className="mt-1.5 font-display text-2xl font-bold text-navy">{data.checkInRate}%</p> : <Skeleton className="mt-2 h-7 w-14" />}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <Users2 size={12} /> Directory Opt-In
          </p>
          {data ? <p className="mt-1.5 font-display text-2xl font-bold text-navy">{data.directoryOptInRate}%</p> : <Skeleton className="mt-2 h-7 w-14" />}
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <TrendingUp size={12} /> Checked In
          </p>
          {data ? (
            <p className="mt-1.5 font-display text-2xl font-bold text-navy">
              {data.checkedInCount}
              <span className="text-sm font-medium text-slate-400"> / {data.totalConfirmed}</span>
            </p>
          ) : (
            <Skeleton className="mt-2 h-7 w-14" />
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Registrations trend */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registrations — Last 30 Days</p>
          {!data ? (
            <Skeleton className="mt-4 h-52 w-full" />
          ) : data.registrationsByDay.length === 0 ? (
            <p className="mt-8 py-8 text-center text-sm text-slate-400">No registrations in this window yet</p>
          ) : data.registrationsByDay.length === 1 ? (
            // A single point has nothing to draw a trend line between — Recharts
            // just renders one dot floating in an otherwise-empty canvas, which
            // reads as broken rather than "not enough data yet". A plain stat
            // callout says the same thing honestly instead.
            <div className="mt-4 flex h-44 flex-col items-center justify-center text-center">
              <p className="font-display text-3xl font-bold text-navy">{data.registrationsByDay[0].count}</p>
              <p className="mt-1 text-xs text-slate-400">
                registration{data.registrationsByDay[0].count === 1 ? '' : 's'} on {shortDate(data.registrationsByDay[0].date)}
                <br />
                Trend line appears once there&rsquo;s more than one day of activity.
              </p>
            </div>
          ) : (
            <div className="mt-2 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.registrationsByDay.map((d) => ({ ...d, label: shortDate(d.date) }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#E8792C" fill="#E8792C" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Revenue trend */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue — Last 30 Days</p>
          {!data ? (
            <Skeleton className="mt-4 h-52 w-full" />
          ) : data.revenueByDay.length === 0 ? (
            <p className="mt-8 py-8 text-center text-sm text-slate-400">No payments in this window yet</p>
          ) : data.revenueByDay.length === 1 ? (
            <div className="mt-4 flex h-44 flex-col items-center justify-center text-center">
              <p className="font-display text-3xl font-bold text-navy">{naira(data.revenueByDay[0].amountNaira)}</p>
              <p className="mt-1 text-xs text-slate-400">
                on {shortDate(data.revenueByDay[0].date)}
                <br />
                Trend line appears once there&rsquo;s more than one day of activity.
              </p>
            </div>
          ) : (
            <div className="mt-2 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueByDay.map((d) => ({ ...d, label: shortDate(d.date) }))} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} interval="preserveStartEnd" />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip formatter={(value) => naira(Number(value))} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="amountNaira" stroke="#16A34A" fill="#16A34A" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Funnel */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendee Funnel</p>
          {!data ? (
            <Skeleton className="mt-4 h-40 w-full" />
          ) : (
            <div className="mt-4 space-y-3">
              {funnelSteps.map((step, i) => {
                const pct = funnelSteps[0]?.value ? Math.round((step.value / funnelSteps[0].value) * 100) : 0;
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-navy">{step.label}</span>
                      <span className="text-slate-400">
                        {step.value} <span className="text-slate-300">({pct}%)</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-offwhite">
                      <div
                        className="h-2 rounded-full bg-orange transition-all"
                        style={{ width: `${pct}%`, opacity: 1 - i * 0.15 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By ticket category */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">By Ticket Category</p>
          {!data ? (
            <Skeleton className="mt-4 h-40 w-full" />
          ) : data.byCategory.length === 0 ? (
            <p className="mt-8 py-8 text-center text-sm text-slate-400">No attendee registrations yet</p>
          ) : (
            <div className="mt-2 h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCategory.map((c) => ({ ...c, label: c.category.replace(/_/g, ' ') }))} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 10, fill: '#334155' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#E8792C" radius={[0, 6, 6, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
