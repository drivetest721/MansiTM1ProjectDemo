import { Filter, X, SlidersHorizontal } from 'lucide-react';
import { useState, useEffect } from 'react';

export interface FilterOption {
  id: string;
  label: string;
  options: { value: string; label: string }[];
}

interface GlobalFiltersProps {
  filters: FilterOption[];
  values: Record<string, string>;
  /** Called once when the user clicks "Apply Filters" with the full filter map. */
  onApply: (values: Record<string, string>) => void;
  onReset?: () => void;
}

export default function GlobalFilters({ filters, values, onApply, onReset }: GlobalFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [pending, setPending] = useState<Record<string, string>>(values);

  // Sync when parent resets values
  useEffect(() => {
    setPending(values);
  }, [values]);

  const hasActiveFilters = Object.values(values).some(v => v && v !== 'all' && v !== '');
  const isDirty = JSON.stringify(pending) !== JSON.stringify(values);

  const handleChange = (filterId: string, value: string) => {
    setPending(prev => ({ ...prev, [filterId]: value }));
  };

  const handleApply = () => {
    onApply(pending);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onReset?.();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
      <div
        className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white cursor-pointer select-none"
        onClick={() => setIsExpanded(prev => !prev)}
      >
        <div className="flex items-center gap-2">
          <Filter size={20} />
          <h3 className="font-semibold">Global Filters</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">Active</span>
          )}
          {isDirty && (
            <span className="px-2 py-0.5 text-xs bg-amber-400 text-amber-900 rounded-full font-semibold">
              Unapplied changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          {onReset && hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-md transition-colors"
            >
              <X size={14} />
              Reset
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.id} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {filter.label}
                </label>
                <select
                  value={pending[filter.id] ?? 'all'}
                  onChange={(e) => handleChange(filter.id, e.target.value)}
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

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleApply}
              disabled={!isDirty}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-md transition-all shadow-sm ${
                isDirty
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <SlidersHorizontal size={15} />
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
