/**
 * RollingForecastPanel — Rolling Forecast Automation
 *
 * Shows the 12-month RF timeline. Each month is either:
 *   • Locked (Actual)  — green, padlock icon, value from actuals
 *   • Open  (Forecast) — blue, clock icon, value from forecast
 *
 * Controls:
 *   - Toggle individual months
 *   - "Lock through month X" quick-action buttons
 *   - YTD summary (Actual vs Forecast vs Variance)
 *
 * Usage:
 *   <RollingForecastPanel year={Number(filters.year)} />
 */

import { useState, useEffect, useCallback } from 'react';
import { Lock, Clock, RefreshCw, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { getRollingForecastView, updateRollingForecastLock } from '../services/api';

interface RFRow {
  month:        string;
  month_num:    number;
  source:       'Actual' | 'Forecast';
  locked:       boolean;
  forecast:     number;
  actual:       number | null;
  rf_value:     number;
  variance:     number | null;
  variance_pct: number | null;
}

interface RFSummary {
  year:         number;
  pattern:      string;
  ytd_actual:   number;
  ytd_forecast: number;
  ytd_variance: number;
  data:         RFRow[];
}

interface Props {
  year?: number;
}

const fmt = (v: number | null | undefined, sign = false) => {
  if (v == null) return '—';
  const s = Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const prefix = v < 0 ? '-$' : sign && v > 0 ? '+$' : '$';
  return `${prefix}${s}`;
};

const fmtM = (v: number) => {
  const m = v / 1_000_000;
  return `$${m.toFixed(1)}M`;
};

export default function RollingForecastPanel({ year = new Date().getFullYear() }: Props) {
  const [summary, setSummary] = useState<RFSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null); // month being toggled
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRollingForecastView({ year });
      setSummary(res.data);
    } catch {
      setError('Could not load rolling forecast. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const toggleLock = async (row: RFRow) => {
    setSaving(row.month_num);
    try {
      await updateRollingForecastLock({ month: row.month_num, year, locked: !row.locked });
      await load();
    } catch {
      setError('Failed to update lock.');
    } finally {
      setSaving(null);
    }
  };

  const lockThrough = async (month: number) => {
    setSaving(-1);
    try {
      await Promise.all(
        Array.from({ length: 12 }, (_, i) => i + 1).map((m) =>
          updateRollingForecastLock({ month: m, year, locked: m <= month })
        )
      );
      await load();
    } catch {
      setError('Failed to set lock-through.');
    } finally {
      setSaving(null);
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center gap-2 p-6 text-gray-400">
        <Loader2 size={16} className="animate-spin" /> Loading rolling forecast…
      </div>
    );
  }

  const rows = summary?.data ?? [];
  const lockedCount = rows.filter((r) => r.locked).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <RefreshCw size={16} className="text-indigo-500" />
            Rolling Forecast — {year}
            {summary && (
              <span className="ml-2 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                {summary.pattern}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Locked months use actuals. Open months use forecast. Toggle to advance the lock date.
          </p>
        </div>
        {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
      </div>

      {error && (
        <div className="px-6 py-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}

      {/* YTD Summary */}
      {summary && (
        <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700">
          {[
            { label: 'YTD Actual',   value: summary.ytd_actual,   color: 'text-green-700 dark:text-green-400' },
            { label: 'YTD Forecast', value: summary.ytd_forecast, color: 'text-blue-700 dark:text-blue-400'   },
            { label: 'YTD Variance', value: summary.ytd_variance, color: summary.ytd_variance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-5 py-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`text-lg font-bold mt-0.5 ${color}`}>{fmtM(value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lock-through quick buttons */}
      <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Lock through:</span>
        {['Mar', 'Jun', 'Sep', 'Dec'].map((label, i) => {
          const m = (i + 1) * 3;
          return (
            <button
              key={label}
              onClick={() => lockThrough(m)}
              disabled={saving !== null}
              className="px-2.5 py-1 text-xs font-medium rounded border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 disabled:opacity-40 transition-colors"
            >
              {label} ({m}+{12 - m})
            </button>
          );
        })}
        <button
          onClick={() => lockThrough(0)}
          disabled={saving !== null}
          className="px-2.5 py-1 text-xs font-medium rounded border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          Reset all
        </button>
      </div>

      {/* Month grid */}
      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {rows.map((row) => {
          const isSaving = saving === row.month_num || saving === -1;
          const locked = row.locked;

          return (
            <button
              key={row.month_num}
              onClick={() => toggleLock(row)}
              disabled={isSaving}
              className={`relative flex flex-col items-center rounded-lg border-2 px-3 py-3 transition-all text-left w-full ${
                locked
                  ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                  : 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10 hover:border-blue-400'
              } disabled:opacity-60`}
            >
              {/* Month label + icon */}
              <div className="flex items-center justify-between w-full">
                <span className={`text-sm font-bold ${locked ? 'text-green-800 dark:text-green-300' : 'text-blue-800 dark:text-blue-300'}`}>
                  {row.month}
                </span>
                {isSaving ? (
                  <Loader2 size={13} className="animate-spin text-gray-400" />
                ) : locked ? (
                  <Lock size={13} className="text-green-500" />
                ) : (
                  <Clock size={13} className="text-blue-400" />
                )}
              </div>

              {/* Source badge */}
              <span className={`mt-1 self-start text-xs px-1.5 py-0.5 rounded font-medium ${
                locked
                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
              }`}>
                {row.source}
              </span>

              {/* RF value */}
              <span className="mt-1.5 text-xs font-mono text-gray-700 dark:text-gray-300">
                {fmt(row.rf_value)}
              </span>

              {/* Variance (locked months only) */}
              {locked && row.variance != null && (
                <span className={`mt-0.5 text-xs flex items-center gap-0.5 ${row.variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {row.variance >= 0
                    ? <TrendingUp size={10} />
                    : <TrendingDown size={10} />}
                  {row.variance_pct != null ? `${row.variance_pct > 0 ? '+' : ''}${row.variance_pct}%` : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-6 pb-4 text-xs text-gray-400 dark:text-gray-500">
        Click a month to toggle its lock state. Green = Actual locked, Blue = Forecast open. {lockedCount} of 12 months locked.
      </div>
    </div>
  );
}
