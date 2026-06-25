import { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { ChevronRight, ChevronDown, Download, Loader2, ZoomIn } from 'lucide-react';
import { useDrill } from '../context/DrillContext';

export interface FinancialRow {
  id: string;
  label: string;
  actual?: number;
  budget?: number;
  forecast?: number;
  variance?: number;
  variancePercent?: number;
  forecastVariance?: number;           // Actual vs Forecast  ← NEW
  forecastVariancePercent?: number
  isTotal?: boolean;
  isSubtotal?: boolean;
  indent?: number;
  children?: FinancialRow[];
  expandable?: boolean;
  level?: string;
  parentValue?: string;
}

interface FinancialTableProps {
  data: FinancialRow[];
  title?: string;
  showExport?: boolean;
  columns?: ColumnDef<FinancialRow>[];
  showForecast?: boolean;
  /** When true, single-click on any data row opens the global DrillPanel */
  drillEnabled?: boolean;
  onExport?: () => void;
  onDrillDown?: (row: FinancialRow) => Promise<FinancialRow[]>;
}

export default function FinancialTable({
  data,
  title,
  showExport = true,
  showForecast = true,
  drillEnabled = false,
  columns,
  onExport,
  onDrillDown,
}: FinancialTableProps) {
  const drill = useDrill();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [childrenData, setChildrenData] = useState<Record<string, FinancialRow[]>>({});
  const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set());

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    const formatted = Math.abs(value).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return value < 0 ? `($${formatted})` : `$${formatted}`;
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getVarianceColor = (value: number | undefined) => {
    if (value === undefined || value === null) return 'text-gray-700 dark:text-gray-300';
    if (value > 0) return 'text-green-600 dark:text-green-400 font-semibold';
    if (value < 0) return 'text-red-600 dark:text-red-400 font-semibold';
    return 'text-gray-700 dark:text-gray-300';
  };
  const getRowVarianceColor = (row: FinancialRow, value: number | undefined) => {
  // Cost-type rows: higher actual = bad (red), lower = good (green)
  if (row.id === 'cost' ) {
    return getCostVarianceColor(value);
  }
  // Default: higher = good (green), lower = bad (red)
  return getVarianceColor(value);
};
  const getCostVarianceColor = (value: number | undefined) => {
    if (value === undefined || value === null) return 'text-gray-700 dark:text-gray-300';
    if (value < 0) return 'text-green-600 dark:text-green-400 font-semibold';
    if (value > 0) return 'text-red-600 dark:text-red-400 font-semibold';
    return 'text-gray-700 dark:text-gray-300';
  };

  const toggleExpand = async (row: FinancialRow) => {
    const rowId = row.id;

    // If already expanded, collapse
    if (expandedRows.has(rowId)) {
      const newExpanded = new Set(expandedRows);
      newExpanded.delete(rowId);
      setExpandedRows(newExpanded);
      return;
    }

    // If has pre-loaded children, just expand
    if (row.children && row.children.length > 0) {
      const newExpanded = new Set(expandedRows);
      newExpanded.add(rowId);
      setExpandedRows(newExpanded);
      return;
    }

    // If not cached and has onDrillDown, fetch children
    if (!childrenData[rowId] && onDrillDown && (row.expandable || row.level)) {
      setLoadingRows(prev => new Set([...prev, rowId]));
      try {
        const children = await onDrillDown(row);

        // Enrich children with parent context
        const enrichedChildren = children.map((child, idx) => ({
          ...child,
          id: child.id || `${rowId}-child-${idx}`,
          indent: (row.indent || 0) + 1,
          parentValue: row.label,
        }));

        setChildrenData(prev => ({
          ...prev,
          [rowId]: enrichedChildren,
        }));

        // Expand after loading
        const newExpanded = new Set(expandedRows);
        newExpanded.add(rowId);
        setExpandedRows(newExpanded);
      } catch (error) {
        console.error('Error loading drill-down data:', error);
      } finally {
        setLoadingRows(prev => {
          const newLoading = new Set(prev);
          newLoading.delete(rowId);
          return newLoading;
        });
      }
    } else if (childrenData[rowId]) {
      // Already cached, just expand
      const newExpanded = new Set(expandedRows);
      newExpanded.add(rowId);
      setExpandedRows(newExpanded);
    }
  };

  const flattenData = (rows: FinancialRow[]): FinancialRow[] => {
    const result: FinancialRow[] = [];

    for (const row of rows) {
      result.push(row);

      // If expanded, add children
      if (expandedRows.has(row.id)) {
        // Check pre-loaded children first
        if (row.children && row.children.length > 0) {
          result.push(...flattenData(row.children));
        }
        // Then check dynamically loaded children
        else if (childrenData[row.id] && childrenData[row.id].length > 0) {
          result.push(...flattenData(childrenData[row.id]));
        }
      }
    }

    return result;
  };

  const defaultColumns: ColumnDef<FinancialRow>[] = [
      {
      id: 'label',
      accessorKey: 'label',
      header: 'Particular',
      cell: ({ row }) => {
        const indent = row.original.indent || 0;
        const hasChildren =
          (row.original.children && row.original.children.length > 0) ||
          row.original.expandable ||
          childrenData[row.original.id]?.length > 0 ||
          Boolean(row.original.level);
        const isExpanded = expandedRows.has(row.original.id);
        const isLoading = loadingRows.has(row.original.id);
        const isTotal = row.original.isTotal;
        const isSubtotal = row.original.isSubtotal;

        return (
          <div
            className={`flex items-center ${isTotal || isSubtotal ? 'font-bold' : ''}`}
            style={{ paddingLeft: `${indent * 1.5}rem` }}
          >
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(row.original)}
                disabled={isLoading}
                className="mr-2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                ) : isExpanded ? (
                  <ChevronDown size={16} className="text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="text-gray-600 dark:text-gray-400" />
                )}
              </button>
            ) : (
              <span className="w-6 mr-2" />
            )}
            <span>{row.original.label}</span>
          </div>
        );
      },
    },
  {
    id: 'actual',
    accessorKey: 'actual',
    header: () => <div className="text-right">Actual</div>,
    cell: ({ row }) => (
      <div className={`text-right ${row.original.isTotal || row.original.isSubtotal ? 'font-bold' : ''}`}>
        {formatCurrency(row.original.actual)}
      </div>
    ),
  },
  {
    id: 'budget',
    accessorKey: 'budget',
    header: () => <div className="text-right">Budget</div>,
    cell: ({ row }) => (
      <div className={`text-right ${row.original.isTotal || row.original.isSubtotal ? 'font-bold' : ''}`}>
        {formatCurrency(row.original.budget)}
      </div>
    ),
  },
  // Variance: Actual vs Budget — always visible
  {
    id: 'variance',
    accessorKey: 'variance',
    header: () => <div className="text-right">Variance</div>,
    cell: ({ row }) => (
      <div className={`text-right ${getRowVarianceColor(row.original, row.original.variance)} ${row.original.isTotal || row.original.isSubtotal ? 'font-bold' : ''}`}>
        {formatCurrency(row.original.variance)}
      </div>
    ),
  },
  {
    id: 'variancePercent',
    accessorKey: 'variancePercent',
    header: () => <div className="text-right">Variance %</div>,
    cell: ({ row }) => (
      <div className={`text-right ${getRowVarianceColor(row.original, row.original.variancePercent)} ${row.original.isTotal || row.original.isSubtotal ? 'font-bold' : ''}`}>
        {formatPercent(row.original.variancePercent)}
      </div>
    ),
  },

  // Forecast group — only rendered when showForecast is true
  ...(showForecast
    ? ([
        {
          id: 'forecast',
          accessorKey: 'forecast',
          header: () => <div className="text-right">Forecast</div>,
          cell: ({ row }) => (
            <div className={`text-right ${row.original.isTotal || row.original.isSubtotal ? 'font-bold' : ''}`}>
              {formatCurrency(row.original.forecast)}
            </div>
          ),
        },
        {
          id: 'forecastVariance',
          accessorKey: 'forecastVariance',
          header: () => <div className="text-right">Variance (Actual vs Forecast)</div>,
          cell: ({ row }) => (
            <div className={`text-right ${getRowVarianceColor(row.original, row.original.forecastVariance)} ${row.original.isTotal || row.original.isSubtotal ? 'font-bold' : ''}`}>
              {formatCurrency(row.original.forecastVariance)}
            </div>
          ),
        },
        {
          id: 'forecastVariancePercent',
          accessorKey: 'forecastVariancePercent',
          header: () => <div className="text-right">Variance % (Actual vs Forecast)</div>,
          cell: ({ row }) => (
            <div className={`text-right ${getRowVarianceColor(row.original, row.original.forecastVariancePercent)} ${row.original.isTotal || row.original.isSubtotal ? 'font-bold' : ''}`}>
              {formatPercent(row.original.forecastVariancePercent)}
            </div>
          ),
        },
      ] as ColumnDef<FinancialRow>[])
    : []),
 ];
  const table = useReactTable({
    data: flattenData(data),
    columns: columns || defaultColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      console.log('Export to Excel functionality - no handler provided');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {(title || showExport) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {title && <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>}
          {showExport && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              <Download size={16} />
              Export
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No data available
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const hasChildren =
                  (row.original.children && row.original.children.length > 0) ||
                  row.original.expandable ||
                  childrenData[row.original.id]?.length > 0 ||
                  Boolean(row.original.level);

                const handleRowClick = () => {
                  if (drillEnabled && !hasChildren) {
                    // Single-click → open global DrillPanel for leaf rows
                    drill.openDrill({
                      title: row.original.label,
                      subtitle: `Actual: ${formatCurrency(row.original.actual)}  |  Budget: ${formatCurrency(row.original.budget)}`,
                      fetchData: async () => {
                        // Return a summary breakdown as drill rows
                        const entries: Record<string, any>[] = [];
                        if (row.original.actual !== undefined)
                          entries.push({ Metric: 'Actual', Value: row.original.actual });
                        if (row.original.budget !== undefined)
                          entries.push({ Metric: 'Budget', Value: row.original.budget });
                        if (row.original.forecast !== undefined)
                          entries.push({ Metric: 'Forecast', Value: row.original.forecast });
                        if (row.original.variance !== undefined)
                          entries.push({ Metric: 'Variance (Actual vs Budget)', Value: row.original.variance });
                        if (row.original.variancePercent !== undefined)
                          entries.push({ Metric: 'Variance %', Value: `${row.original.variancePercent?.toFixed(1)}%` });
                        return entries;
                      },
                    });
                  }
                };

                return (
                <tr
                  key={row.id}
                  onClick={handleRowClick}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                    row.original.isTotal
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-t-2 border-b-2 border-blue-300 dark:border-blue-700'
                      : row.original.isSubtotal
                      ? 'bg-gray-100 dark:bg-gray-800/50'
                      : ''
                  } ${hasChildren ? 'cursor-pointer' : drillEnabled ? 'cursor-zoom-in' : ''}`}
                  onDoubleClick={() => {
                    if (hasChildren) {
                      toggleExpand(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                  {drillEnabled && !hasChildren && (
                    <td className="px-3 py-3 text-gray-300 dark:text-gray-600">
                      <ZoomIn size={14} />
                    </td>
                  )}
                </tr>
              );})
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
