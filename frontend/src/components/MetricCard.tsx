import { memo } from 'react';
import { type LucideIcon } from 'lucide-react';
import VarianceBadge from './VarianceBadge';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeFormat?: 'currency' | 'percent' | 'number';
  icon?: LucideIcon;
  iconColor?: string;
  subtitle?: string;
}

const MetricCard = memo(function MetricCard({ 
  title, 
  value, 
  change, 
  changeFormat = 'percent',
  icon: Icon, 
  iconColor = 'text-blue-600',
  subtitle 
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'string') return val;
    return val.toLocaleString('en-US');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {formatValue(value)}
          </p>
         
         
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 ${iconColor}`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
});

export default MetricCard;
