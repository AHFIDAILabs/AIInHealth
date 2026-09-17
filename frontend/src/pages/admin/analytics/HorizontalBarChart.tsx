import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '../../../components/ui/Skeleton';

interface HorizontalBarChartProps {
  data: { label: string; value: number }[] | null;
  color: string;
  emptyLabel: string;
  valueFormatter?: (n: number) => string;
}

// Shared horizontal-bar shape reused across the Analytics tabs for "count/
// revenue by category" breakdowns — same pattern the old single-page
// AnalyticsPage.tsx already used for "By Ticket Category".
export const HorizontalBarChart = ({ data, color, emptyLabel, valueFormatter }: HorizontalBarChartProps) => {
  if (data === null) return <Skeleton className="mt-4 h-40 w-full" />;
  if (data.length === 0) return <p className="mt-8 py-8 text-center text-sm text-slate-400">{emptyLabel}</p>;
  return (
    <div className="mt-2 h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="#F1F5F9" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis dataKey="label" type="category" width={130} tick={{ fontSize: 10, fill: '#334155' }} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(value) => (valueFormatter ? valueFormatter(Number(value)) : value)}
            contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
