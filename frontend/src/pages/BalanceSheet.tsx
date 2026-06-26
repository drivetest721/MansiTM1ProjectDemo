/**
 * BalanceSheet — monthly column view
 * Mirrors PLStatement layout: MonthTreeFilter + Entity/Scenario dropdowns + monthly table.
 * No variance columns. Balance validation banner kept at top.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getBalanceSheetMonthly, getEntities } from '../services/api';
import MonthTreeFilter from '../components/MonthTreeFilter';
import AnnotationPanel from '../components/AnnotationPanel';
import { Loader2, Download, CheckCircle, XCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyRow {
  id: string;
  label: string;
  monthly: Record<string, number | null>;
  total: number | null;
  indent?: number;
  isTotal?: boolean;
  isSubtotal?: boolean;
}

interface Validation {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  liabilities_and_equity: number;
  balanced: boolean;
  difference: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function sortMonths(months: string[]): string[] {
  return [...months].sort((a, b) => {
    const ai = MONTH_ORDER.indexOf(a.slice(0, 3));
    const bi = MONTH_ORDER.indexOf(b.slice(0, 3));
    return ai - bi;
  });
}

function allMonthsForYear(year: string): string[] {
  const yy = year.slice(-2);
  return MONTH_ORDER.map((m) => `${m}-${yy}`);
}

function formatCurrency(value: number | null | undefined): string {
  if (value === undefined || value === null) return '';
  const abs = Math.abs(value) / 1_000_000;
  const fmt = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `($${fmt}M)` : `$${fmt}M`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BalanceSheet() {
  // ── Filters ───────────────────────────────────────────────────────────────
  const [selectedYear, setSelectedYear]     = useState('2024');
  const [selectedMonths, setSelectedMonths] = useState<string[]>(allMonthsForYear('2024'));
  const [entity, setEntity]                 = useState('all');
  const [scenario, setScenario]             = useState<'actual' | 'budget'>('actual');

  // ── Data ──────────────────────────────────────────────────────────────────
  const [tableData, setTableData]             = useState<MonthlyRow[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [validation, setValidation]           = useState<Validation | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);

  // ── Entity options ─────────────────────────────────────────────────────────
  const [entityOptions, setEntityOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    getEntities()
      .then((res) => {
        const ents: any[] = res.data?.data ?? [];
        setEntityOptions(ents.map((e) => ({ value: e.entity_name, label: e.entity_name })));
      })
      .catch(() => setEntityOptions([]));
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: { year: number; scenario: string; entity?: string } = {
      year: parseInt(selectedYear),
      scenario,
    };
    if (entity !== 'all') params.entity = entity;

    getBalanceSheetMonthly(params)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        if (data?.lines?.length) {
          setTableData(data.lines);
          setAvailableMonths(data.months ?? []);
          setValidation(data.validation ?? null);
          setError(null);
        } else {
          setTableData([]);
          setError('No Balance Sheet data available for the selected filters.');
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error('Balance Sheet monthly fetch failed:', err);
        const serverDetail = err?.response?.data?.detail;
        const status = err?.response?.status;
        if (status && serverDetail) {
          setError(`Server error (${status}): ${serverDetail}`);
        } else if (status) {
          setError(`Server returned HTTP ${status}. Check backend logs for details.`);
        } else {
          setError('Failed to connect to backend. Ensure the server is running on localhost:8000.');
        }
        setTableData([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedYear, entity, scenario]);

  // ── Month tree apply ───────────────────────────────────────────────────────
  const handleTreeApply = useCallback(
    ({ year, months }: { year: string; months: string[] }) => {
      if (year !== selectedYear) setSelectedYear(year);
      setSelectedMonths(months);
    },
    [selectedYear]
  );

  // ── Visible months ─────────────────────────────────────────────────────────
  const visibleMonths = useMemo(() => {
    const available = new Set(availableMonths);
    const selected  = new Set(selectedMonths);
    const intersection = [...selected].filter((m) => available.has(m));
    return sortMonths(intersection.length ? intersection : [...available]);
  }, [selectedMonths, availableMonths]);

  // ── Scenario label ─────────────────────────────────────────────────────────
  const scenarioLabel = scenario === 'budget' ? 'Budget' : 'Actual';

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    try {
      const rows = tableData
        .filter((r) => r.label)
        .map((r) => {
          const row: Record<string, any> = { Account: r.label };
          visibleMonths.forEach((m) => { row[m] = r.monthly?.[m] ?? null; });
          row['Total'] = r.total ?? null;
          return row;
        });
      const headers = rows[0] ? Object.keys(rows[0]) : [];
      const csv = [
        headers.join(','),
        ...rows.map((r) => headers.map((h) => r[h] ?? '').join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Balance_Sheet_${selectedYear}_${scenario}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
    }
  }, [tableData, visibleMonths, selectedYear, scenario]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Balance Sheet</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Statement of financial position</p>
        </div>
        <div className="text-right text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
          <p>Year: FY {selectedYear}</p>
          <p>Entity: {entity !== 'all' ? entity : 'All Entities'}</p>
          <p>Scenario: {scenarioLabel}</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4 items-start">
        {/* Left: tree filter */}
        <div className="w-64 flex-shrink-0">
          <MonthTreeFilter
            selectedYear={selectedYear}
            selectedMonths={selectedMonths}
            onApply={handleTreeApply}
          />
        </div>

        {/* Right: controls + table */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Entity + Scenario + Export */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md px-4 py-3 flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Scenario</label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as any)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="actual">Actual</option>
                <option value="budget">Budget</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Entity</label>
              <select
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Entities</option>
                {entityOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="ml-auto">
              <button
                onClick={handleExport}
                disabled={loading || !tableData.length}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-40"
              >
                <Download size={15} />
                Export
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">⚠️ {error}</p>
            </div>
          )}

          {/* Balance validation banner */}
          {!loading && validation && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 ${
              validation.balanced
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
            }`}>
              {validation.balanced
                ? <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
                : <XCircle    className="text-red-600 dark:text-red-400 flex-shrink-0"     size={20} />
              }
              <div>
                <p className={`text-sm font-semibold ${validation.balanced ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  {validation.balanced ? 'Balance Sheet is Balanced ✓' : 'Balance Sheet is Out of Balance!'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Assets: {formatCurrency(validation.total_assets)} &nbsp;|&nbsp;
                  Liabilities & Equity: {formatCurrency(validation.liabilities_and_equity)}
                  {!validation.balanced && ` | Diff: ${formatCurrency(validation.difference)}`}
                </p>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">Loading balance sheet…</span>
            </div>
          ) : (
            <MonthlyTable
              rows={tableData}
              months={visibleMonths}
              title={`Balance Sheet — FY ${selectedYear} (${scenarioLabel})`}
            />
          )}

          <AnnotationPanel
            pageKey="cfo-balance-sheet"
            period={`${selectedYear}:${entity !== 'all' ? entity : 'all'}`}
          />
        </div>
      </div>
    </div>
  );
}

// ─── MonthlyTable ─────────────────────────────────────────────────────────────

interface MonthlyTableProps {
  rows: MonthlyRow[];
  months: string[];
  title?: string;
}

function MonthlyTable({ rows, months, title }: MonthlyTableProps) {
  if (!rows.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-400 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {title && (
        <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h2>
        </div>
      )}
      <div className="overflow-x-auto">
        <table
          className="w-full text-xs"
          style={{ tableLayout: 'fixed', minWidth: `${220 + months.length * 90 + 90}px` }}
        >
          <colgroup>
            <col style={{ width: '220px' }} />
            {months.map((m) => <col key={m} style={{ width: '90px' }} />)}
            <col style={{ width: '90px' }} />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 uppercase tracking-wide">
                Account
              </th>
              {months.map((m) => (
                <th key={m} className="px-2 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 uppercase tracking-wide whitespace-nowrap">
                  {m}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 uppercase tracking-wide bg-blue-50 dark:bg-blue-900/20 whitespace-nowrap">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {rows.map((row) => {
              if (!row.label) {
                return (
                  <tr key={row.id} className="h-2">
                    <td colSpan={months.length + 2} />
                  </tr>
                );
              }

              const isHeader   = row.isSubtotal && !row.total && Object.values(row.monthly).every((v) => v === null);
              const isTotal    = row.isTotal;
              const isSubtotal = row.isSubtotal;
              const indent     = row.indent ?? 0;

              return (
                <tr
                  key={row.id}
                  className={
                    isTotal
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-300 dark:border-blue-700'
                      : isHeader
                      ? 'bg-gray-100 dark:bg-gray-700/50'
                      : isSubtotal
                      ? 'bg-gray-50 dark:bg-gray-800/50'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'
                  }
                >
                  <td
                    className={`px-3 py-1.5 whitespace-nowrap overflow-hidden text-ellipsis ${
                      isTotal || isSubtotal ? 'font-bold' : ''
                    } text-gray-900 dark:text-gray-100`}
                    style={{ paddingLeft: `${12 + indent * 16}px` }}
                    title={row.label}
                  >
                    {row.label}
                  </td>

                  {months.map((m) => {
                    const val = row.monthly?.[m];
                    return (
                      <td
                        key={m}
                        className={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums ${
                          isTotal || isSubtotal ? 'font-bold' : ''
                        } ${
                          typeof val === 'number' && val < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {val === null || val === undefined ? '' : formatCurrency(val)}
                      </td>
                    );
                  })}

                  <td
                    className={`px-2 py-1.5 text-right whitespace-nowrap tabular-nums bg-blue-50 dark:bg-blue-900/10 ${
                      isTotal || isSubtotal ? 'font-bold' : ''
                    } ${
                      typeof row.total === 'number' && row.total < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {row.total === null || row.total === undefined ? '' : formatCurrency(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
