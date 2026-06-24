import { formatValue } from '../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  kpi: {
    title: string;
    value: number;
    format: 'number' | 'currency' | 'percentage';
    trend?: number;
  };
}

export default function KPICard({ kpi }: KPICardProps) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:scale-105 transition-all duration-300">
      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wider">{kpi.title}</h3>
      <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{formatValue(kpi.value, kpi.format)}</p>
      {kpi.trend !== undefined && (
        <div className={`flex items-center gap-2 mt-3 px-3 py-1 rounded-full w-fit ${kpi.trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {kpi.trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="text-sm font-semibold">{Math.abs(kpi.trend).toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}
