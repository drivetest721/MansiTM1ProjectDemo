/**
 * DrillContext — Universal drill-anywhere for the EPM Portal
 *
 * Any page / component can call `useDrill().openDrill(config)` to open a
 * slide-in panel showing detail rows for any cell or summary value.
 *
 * Usage example:
 *   const { openDrill } = useDrill();
 *   openDrill({
 *     title: 'Revenue – EMEA Q3',
 *     subtitle: 'Transaction-level detail',
 *     columns: ['Entity', 'Product', 'Customer', 'Amount'],
 *     fetchData: () => api.get('/api/revenue/drill?region=EMEA&quarter=Q3'),
 *   });
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { X, Loader2, Download } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DrillColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  format?: (val: any) => string;
}

export interface DrillRequest {
  title: string;
  subtitle?: string;
  /** If omitted, columns are inferred from the first data row's keys */
  columns?: DrillColumn[];
  fetchData: () => Promise<Record<string, any>[]>;
}

interface DrillContextValue {
  openDrill: (req: DrillRequest) => void;
  closeDrill: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DrillContext = createContext<DrillContextValue | null>(null);

export function useDrill() {
  const ctx = useContext(DrillContext);
  if (!ctx) throw new Error('useDrill must be used inside <DrillProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider + Panel
// ---------------------------------------------------------------------------

export function DrillProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DrillRequest | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [columns, setColumns] = useState<DrillColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openDrill = useCallback(async (req: DrillRequest) => {
    setRequest(req);
    setRows([]);
    setError(null);
    setLoading(true);
    try {
      const data = await req.fetchData();
      setRows(data);
      // Build column definitions if not provided
      if (req.columns) {
        setColumns(req.columns);
      } else if (data.length > 0) {
        setColumns(
          Object.keys(data[0]).map((k) => ({
            key: k,
            label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            align: typeof data[0][k] === 'number' ? 'right' : 'left',
          }))
        );
      } else {
        setColumns([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load drill-down data');
    } finally {
      setLoading(false);
    }
  }, []);

  const closeDrill = useCallback(() => {
    setRequest(null);
    setRows([]);
    setColumns([]);
    setError(null);
  }, []);

  const exportDrillCSV = () => {
    if (!rows.length) return;
    const headers = columns.map((c) => c.label).join(',');
    const body = rows
      .map((r) =>
        columns
          .map((c) => {
            const v = r[c.key];
            return typeof v === 'string' && v.includes(',') ? `"${v}"` : v ?? '';
          })
          .join(',')
      )
      .join('\n');
    const blob = new Blob([`${headers}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(request?.title ?? 'drill').replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (col: DrillColumn, val: any) => {
    if (col.format) return col.format(val);
    if (val === null || val === undefined) return '—';
    if (typeof val === 'number') {
      return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    return String(val);
  };

  return (
    <DrillContext.Provider value={{ openDrill, closeDrill }}>
      {children}

      {/* Backdrop */}
      {request && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={closeDrill}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-3xl flex flex-col bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ${
          request ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {request?.title ?? ''}
            </h2>
            {request?.subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {request.subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportDrillCSV}
              disabled={!rows.length}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-40 transition-colors"
            >
              <Download size={13} />
              CSV
            </button>
            <button
              onClick={closeDrill}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {loading && (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
              <span className="text-gray-500 dark:text-gray-400">Loading…</span>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="flex items-center justify-center h-48 text-gray-400 dark:text-gray-500">
              No detail rows available.
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-blue-600 text-white sticky top-0 z-10">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider ${
                          col.align === 'right' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 text-gray-800 dark:text-gray-200 ${
                            col.align === 'right' ? 'text-right font-mono' : ''
                          }`}
                        >
                          {fmt(col, row[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700">
                {rows.length.toLocaleString()} row{rows.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>
    </DrillContext.Provider>
  );
}
