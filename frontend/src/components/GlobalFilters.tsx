import { Filter, X } from 'lucide-react';
import { useState } from 'react';

export interface FilterOption {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

interface GlobalFiltersProps {
  filters: FilterOption[];
  values: Record<string, string>;
  onChange: (filterId: string, value: string) => void;
  onReset?: () => void;
}

export default function GlobalFilters({ filters, values, onChange, onReset }: GlobalFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasActiveFilters = Object.values(values).some(v => v && v !== 'all');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
      <div 
        className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Filter size={20} />
          <h3 className="font-semibold">Global Filters</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">
              Active
            </span>
          )}
        </div>
        {onReset && hasActiveFilters && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-md transition-colors"
          >
            <X size={14} />
            Reset
          </button>
        )}
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
          {filters.map((filter) => (
            <div key={filter.id} className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {filter.label}
              </label>
              <select
                value={values[filter.id] || 'all'}
                onChange={(e) => onChange(filter.id, e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="all">All {filter.label}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
