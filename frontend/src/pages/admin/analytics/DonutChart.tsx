import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '../../../components/ui/Skeleton';

const COLORS = ['#E8792C', '#2563EB', '#7C3AED', '#0D9488', '#D97706', '#E11D48', '#94A3B8'];

interface DonutChartProps {
  data: { label: string; value: number }[] | null;
  emptyLabel: string;
}

export const DonutChart = ({ data, emptyLabel }: DonutChartProps) => {
  if (data === null) return <Skeleton className="mt-4 h-48 w-full" />;
  const withValues = data.filter((d) => d.value > 0);
  if (withValues.length === 0) return <p className="mt-8 py-8 text-center text-sm text-slate-400">{emptyLabel}</p>;
  return (
    <div className="mt-2 h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={withValues} dataKey="value" nameKey="label" innerRadius={45} outerRadius={72} paddingAngle={2}>
            {withValues.map((entry, i) => (
              <Cell key={entry.label} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
