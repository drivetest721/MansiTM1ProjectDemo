import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { THEME_COLORS, formatCurrency2dp } from '../theme/colors';

export interface NetProfitRow {
  name: string;
  actual: number;
  budget: number;
  variance: number;
  variancePercent: number;
}

interface NetProfitChartProps {
  title: string;
  data: NetProfitRow[];
}

export default function NetProfitChart({ title, data }: NetProfitChartProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 30, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 14 , fontWeight: 'bold', fill: '#6b7280'}}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={60}
          />
          <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency2dp(v)} tick={{ fontSize: 14 , fontWeight: 'bold', fill: '#6b7280'}} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, name) => {
                const num = typeof value === 'number' ? value : Number(value);
                if (isNaN(num)) return '';
                return name === 'Variance %' ? `${num.toFixed(2)}%` : formatCurrency2dp(num);
            }}
            />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="actual"
            name="Actual Net Profit"
            fill={THEME_COLORS[0]}
            radius={[4, 4, 0, 0]}
            label={{ position: 'top', formatter: (value) => formatCurrency2dp(value), fontSize: 14 , fontWeight: 'bold'}}
          />
          <Bar
            yAxisId="left"
            dataKey="budget"
            name="Budgeted Net Profit"
            fill={THEME_COLORS[1]}
            radius={[4, 4, 0, 0]}
            label={{ position: 'top', formatter: (value) => formatCurrency2dp(value), fontSize: 14 , fontWeight: 'bold'}}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="variancePercent"
            name="Variance %"
            stroke={THEME_COLORS[8]}
            strokeWidth={2}
            dot={{ r: 4 }}
            label={{ position: 'top', formatter: (value) => `${value.toFixed(2)}%`, fontSize: 14 , fontWeight: 'bold'}}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}