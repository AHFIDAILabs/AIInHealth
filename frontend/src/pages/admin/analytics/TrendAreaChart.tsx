import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '../../../components/ui/Skeleton';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

interface TrendAreaChartProps {
  data: { date: string; count: number }[] | null;
  color: string;
  emptyLabel: string;
  unitLabel: (n: number) => string;
}

// A single shared trend-chart shape reused across the Analytics tabs
// (Registrations, Check-Ins, ...) — including the "one data point" fallback:
// Recharts renders a single point as one dot floating in an empty canvas,
// which reads as broken rather than "not enough history yet". A plain stat
// callout says the same thing honestly instead of a misleading empty chart.
export const TrendAreaChart = ({ data, color, emptyLabel, unitLabel }: TrendAreaChartProps) => {
  if (data === null) return <Skeleton className="mt-4 h-52 w-full" />;
  if (data.length === 0) return <p className="mt-8 py-8 text-center text-sm text-slate-400">{emptyLabel}</p>;
  if (data.length === 1) {
    return (
      <div className="mt-4 flex h-44 flex-col items-center justify-center text-center">
        <p className="font-display text-3xl font-bold text-navy">{data[0].count}</p>
        <p className="mt-1 text-xs text-slate-400">
          {unitLabel(data[0].count)} on {shortDate(data[0].date)}
          <br />
          Trend line appears once there&rsquo;s more than one day of activity.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-2 h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map((d) => ({ ...d, label: shortDate(d.date) }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#F1F5F9" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={28} />
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Area type="monotone" dataKey="count" stroke={color} fill={color} fillOpacity={0.12} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
