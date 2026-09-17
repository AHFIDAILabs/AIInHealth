import { useEffect, useState } from 'react';
import { fetchAnalyticsRegistrations, type AnalyticsRegistrations } from '../../../services/analytics.service';
import { getApiErrorMessage } from '../../../services/api';
import { Banner } from '../../../components/ui/Banner';
import { Skeleton } from '../../../components/ui/Skeleton';
import { TrendAreaChart } from './TrendAreaChart';
import { HorizontalBarChart } from './HorizontalBarChart';
import { DonutChart } from './DonutChart';

const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const RegistrationsTab = () => {
  const [data, setData] = useState<AnalyticsRegistrations | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyticsRegistrations()
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  if (error) return <Banner variant="error">{error}</Banner>;

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registrations Over Time — Last 30 Days</p>
          <TrendAreaChart
            data={data?.registrationsByDay ?? null}
            color="#E8792C"
            emptyLabel="No registrations in this window yet"
            unitLabel={(n) => `registration${n === 1 ? '' : 's'}`}
          />
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Check-Ins Over Time — Last 30 Days</p>
          <TrendAreaChart
            data={data?.checkInsByDay ?? null}
            color="#16A34A"
            emptyLabel="No check-ins yet — doors haven't opened."
            unitLabel={(n) => `check-in${n === 1 ? '' : 's'}`}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">By Status</p>
          <DonutChart
            data={data ? Object.entries(data.byStatus).map(([k, v]) => ({ label: label(k), value: v })) : null}
            emptyLabel="No registrations yet"
          />
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">By Ticket Type</p>
          <HorizontalBarChart
            data={data?.byTicketType.map((c) => ({ label: label(c.category), value: c.count })) ?? null}
            color="#2563EB"
            emptyLabel="No attendee registrations yet"
          />
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">By Registration Type</p>
          <DonutChart
            data={data ? Object.entries(data.byType).map(([k, v]) => ({ label: label(k), value: v })) : null}
            emptyLabel="No registrations yet"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Payment Status</p>
          {!data ? (
            <Skeleton className="mt-4 h-24 w-full" />
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(data.byPaymentStatus).map(([status, count]) => (
                <div key={status} className="rounded-xl bg-offwhite px-3 py-3 text-center">
                  <p className="font-display text-xl font-bold text-navy">{count}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label(status)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attendee Funnel</p>
            {data && <p className="text-xs text-slate-400">Directory opt-in: {data.directoryOptInRate}%</p>}
          </div>
          {!data ? (
            <Skeleton className="mt-4 h-32 w-full" />
          ) : (
            <div className="mt-4 space-y-3">
              {[
                { key: 'Registrations Started', value: data.funnel.created },
                { key: 'Paid', value: data.funnel.paid },
                { key: 'Confirmed', value: data.funnel.confirmed },
              ].map((step, i) => {
                const pct = data.funnel.created ? Math.round((step.value / data.funnel.created) * 100) : 0;
                return (
                  <div key={step.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-navy">{step.key}</span>
                      <span className="text-slate-400">
                        {step.value} <span className="text-slate-300">({pct}%)</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-offwhite">
                      <div className="h-2 rounded-full bg-orange transition-all" style={{ width: `${pct}%`, opacity: 1 - i * 0.15 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
