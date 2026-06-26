/**
 * MonthTreeFilter — redesigned for clear visual selection feedback.
 *
 * - Selected rows get a solid blue highlight (not just a tiny checkbox tick)
 * - Quarter rows show how many of their 3 months are selected
 * - Year row shows total selected months
 * - Defaults to last 6 years, auto-scrolled so current year is visible
 * - Selected months shown as chips below the tree header
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Calendar, X } from 'lucide-react';

export interface MonthTreeFilterValue {
  year: string;
  months: string[];
}

interface Props {
  selectedYear: string;
  selectedMonths: string[];
  onApply: (value: MonthTreeFilterValue) => void;
  yearRange?: [number, number];
}

const QUARTERS = [
  { label: 'Q1', months: ['Jan', 'Feb', 'Mar'] },
  { label: 'Q2', months: ['Apr', 'May', 'Jun'] },
  { label: 'Q3', months: ['Jul', 'Aug', 'Sep'] },
  { label: 'Q4', months: ['Oct', 'Nov', 'Dec'] },
];

function mk(mon: string, year: string) {
  return `${mon}-${year.slice(-2)}`;
}

function allForYear(year: string) {
  return QUARTERS.flatMap((q) => q.months.map((m) => mk(m, year)));
}

export default function MonthTreeFilter({
  selectedYear,
  selectedMonths,
  onApply,
  yearRange = [2018, 2030],
}: Props) {
  const [pendingYear, setPendingYear] = useState(selectedYear);
  const [pendingMonths, setPendingMonths] = useState<Set<string>>(new Set(selectedMonths));
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set([selectedYear]));
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(
    new Set(QUARTERS.map((q) => `${selectedYear}-${q.label}`))
  );

  const treeRef = useRef<HTMLDivElement>(null);

  // Scroll active year into view on mount
  useEffect(() => {
    const el = treeRef.current?.querySelector(`[data-year="${selectedYear}"]`);
    el?.scrollIntoView({ block: 'center' });
  }, []);

  const years = Array.from(
    { length: yearRange[1] - yearRange[0] + 1 },
    (_, i) => String(yearRange[0] + i)
  );

  // ── Selection helpers ────────────────────────────────────────────────────────

  const toggleYear = useCallback((year: string, add: boolean) => {
    setPendingYear(year);
    setPendingMonths((prev) => {
      const next = new Set<string>();
      // Keep months from OTHER years untouched (but we constrain to single year)
      // Actually: clear previous year's months, set this year's
      if (add) allForYear(year).forEach((m) => next.add(m));
      return next.size || !add ? next : prev;
    });
    // If checking a year, clear other year months and add all
    if (add) {
      setPendingMonths(new Set(allForYear(year)));
      setExpandedYears((p) => new Set([...p, year]));
    } else {
      setPendingMonths((prev) => {
        const next = new Set(prev);
        allForYear(year).forEach((m) => next.delete(m));
        return next;
      });
    }
  }, []);

  const toggleQuarter = useCallback((year: string, q: typeof QUARTERS[0], add: boolean) => {
    setPendingYear(year);
    const keys = q.months.map((m) => mk(m, year));
    setPendingMonths((prev) => {
      const next = new Set(prev);
      // Remove other-year months when switching year context
      if (year !== pendingYear) allForYear(pendingYear).forEach((m) => next.delete(m));
      keys.forEach((k) => (add ? next.add(k) : next.delete(k)));
      return next;
    });
  }, [pendingYear]);

  const toggleMonth = useCallback((year: string, mon: string, add: boolean) => {
    const key = mk(mon, year);
    setPendingYear(year);
    setPendingMonths((prev) => {
      const next = new Set(prev);
      if (year !== pendingYear) allForYear(pendingYear).forEach((m) => next.delete(m));
      add ? next.add(key) : next.delete(key);
      return next;
    });
  }, [pendingYear]);

  // ── Check states ─────────────────────────────────────────────────────────────

  function yearState(year: string): 'all' | 'some' | 'none' {
    const all = allForYear(year);
    const n = all.filter((m) => pendingMonths.has(m)).length;
    return n === 0 ? 'none' : n === all.length ? 'all' : 'some';
  }

  function quarterState(year: string, q: typeof QUARTERS[0]): 'all' | 'some' | 'none' {
    const keys = q.months.map((m) => mk(m, year));
    const n = keys.filter((k) => pendingMonths.has(k)).length;
    return n === 0 ? 'none' : n === keys.length ? 'all' : 'some';
  }

  // ── Tri-state checkbox ────────────────────────────────────────────────────────

  function TristateBox({
    state,
    onChange,
    size = 'md',
  }: {
    state: 'all' | 'some' | 'none';
    onChange: (v: boolean) => void;
    size?: 'sm' | 'md';
  }) {
    const sz = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
    return (
      <input
        type="checkbox"
        checked={state === 'all'}
        ref={(el) => { if (el) el.indeterminate = state === 'some'; }}
        onChange={(e) => onChange(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className={`${sz} rounded accent-blue-600 cursor-pointer flex-shrink-0`}
      />
    );
  }

  // ── Apply ─────────────────────────────────────────────────────────────────────

  const isDirty =
    pendingYear !== selectedYear ||
    JSON.stringify([...pendingMonths].sort()) !== JSON.stringify([...selectedMonths].sort());

  const handleApply = () => onApply({ year: pendingYear, months: [...pendingMonths] });

  const removeMonth = (m: string) => {
    setPendingMonths((prev) => { const n = new Set(prev); n.delete(m); return n; });
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2.5">
        {/* Row 1: title + count */}
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={15} className="text-white/80 flex-shrink-0" />
          <span className="text-sm font-semibold text-white leading-none">Period Selection</span>
          {pendingMonths.size > 0 && (
            <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-white/25 text-white rounded-full whitespace-nowrap">
              {pendingMonths.size} month{pendingMonths.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Row 2: Apply button — full width, always visible */}
        <button
          onClick={handleApply}
          disabled={!isDirty}
          className={`w-full py-1.5 text-xs font-bold rounded-md transition-all ${
            isDirty
              ? 'bg-white text-blue-700 hover:bg-blue-50 shadow-sm'
              : 'bg-white/20 text-white/50 cursor-not-allowed'
          }`}
        >
          {isDirty ? 'Apply Changes' : 'Applied'}
        </button>

        {/* Selected chips */}
        
      </div>

      {/* ── Tree ── */}
      <div ref={treeRef} className="max-h-80 overflow-y-auto py-1">
        {years.map((year) => {
          const yst = yearState(year);
          const isYearExpanded = expandedYears.has(year);
          const isActiveYear = year === pendingYear;
          const selectedCount = allForYear(year).filter((m) => pendingMonths.has(m)).length;

          return (
            <div key={year} data-year={year}>
              {/* Year row */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none transition-colors ${
                  yst !== 'none'
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() =>
                  setExpandedYears((p) => {
                    const n = new Set(p);
                    n.has(year) ? n.delete(year) : n.add(year);
                    return n;
                  })
                }
              >
                <span className="text-gray-400 w-3">
                  {isYearExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
                <TristateBox
                  state={yst}
                  onChange={(checked) => toggleYear(year, checked)}
                />
                <span
                  className={`text-sm font-semibold flex-1 ${
                    yst !== 'none'
                      ? 'text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {year}
                </span>
                {selectedCount > 0 && (
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-full">
                    {selectedCount}/12
                  </span>
                )}
              </div>

              {/* Quarters */}
              {isYearExpanded && (
                <div className="ml-2 border-l-2 border-gray-100 dark:border-gray-700 ml-6">
                  {QUARTERS.map((q) => {
                    const qKey = `${year}-${q.label}`;
                    const qst = quarterState(year, q);
                    const isQExpanded = expandedQuarters.has(qKey);
                    const qSelected = q.months.filter((m) => pendingMonths.has(mk(m, year))).length;

                    return (
                      <div key={qKey}>
                        {/* Quarter row */}
                        <div
                          className={`flex items-center gap-2 px-3 py-1 cursor-pointer select-none transition-colors ${
                            qst !== 'none'
                              ? 'bg-blue-50/70 dark:bg-blue-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                          }`}
                          onClick={() =>
                            setExpandedQuarters((p) => {
                              const n = new Set(p);
                              n.has(qKey) ? n.delete(qKey) : n.add(qKey);
                              return n;
                            })
                          }
                        >
                          <span className="text-gray-400 w-3">
                            {isQExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                          </span>
                          <TristateBox
                            size="sm"
                            state={qst}
                            onChange={(checked) => toggleQuarter(year, q, checked)}
                          />
                          <span
                            className={`text-xs font-semibold flex-1 ${
                              qst !== 'none'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {q.label} {year}
                          </span>
                          {qSelected > 0 && (
                            <span className="text-xs text-blue-500 dark:text-blue-400">
                              {qSelected}/3
                            </span>
                          )}
                        </div>

                        {/* Month rows */}
                        {isQExpanded && (
                          <div className="ml-4 border-l border-gray-100 dark:border-gray-700">
                            {q.months.map((mon) => {
                              const key = mk(mon, year);
                              const isSelected = pendingMonths.has(key);
                              return (
                                <label
                                  key={key}
                                  className={`flex items-center gap-2 px-3 py-1 cursor-pointer select-none transition-colors ${
                                    isSelected
                                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 text-gray-600 dark:text-gray-400'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => toggleMonth(year, mon, e.target.checked)}
                                    className="w-3 h-3 rounded accent-blue-600 cursor-pointer flex-shrink-0"
                                  />
                                  <span className={`text-xs font-medium ${isSelected ? 'font-semibold' : ''}`}>
                                    {mon}-{year.slice(-2)}
                                  </span>
                                  {isSelected && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Footer: clear all ── */}
      {pendingMonths.size > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
          <button
            onClick={() => setPendingMonths(new Set())}
            className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            Clear all selections
          </button>
        </div>
      )}
    </div>
  );
}
