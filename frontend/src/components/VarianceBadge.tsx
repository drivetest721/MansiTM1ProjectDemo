import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VarianceBadgeProps {
  value: number;
  showIcon?: boolean;
  format?: 'currency' | 'percent' | 'number';
  size?: 'sm' | 'md' | 'lg';
}

export default function VarianceBadge({ 
  value, 
  showIcon = true, 
  format = 'currency',
  size = 'md' 
}: VarianceBadgeProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  const formatValue = () => {
    const absValue = Math.abs(value);
    const sign = isPositive ? '+' : isNegative ? '-' : '';
    
    switch (format) {
      case 'currency':
        return `${sign}$${absValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      case 'percent':
        return `${sign}${absValue.toFixed(1)}%`;
      case 'number':
        return `${sign}${absValue.toLocaleString('en-US')}`;
      default:
        return value.toString();
    }
  };

  const colorClasses = {
    positive: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
    negative: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
    neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSize = size === 'sm' ? 12 : size === 'md' ? 14 : 16;

  const getIcon = () => {
    if (!showIcon) return null;
    if (isPositive) return <TrendingUp size={iconSize} />;
    if (isNegative) return <TrendingDown size={iconSize} />;
    return <Minus size={iconSize} />;
  };

  const colorClass = isPositive ? colorClasses.positive : isNegative ? colorClasses.negative : colorClasses.neutral;

  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-md border ${colorClass} ${sizeClasses[size]}`}>
      {getIcon()}
      {formatValue()}
    </span>
  );
}
