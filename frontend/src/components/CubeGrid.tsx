import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { ChevronRight, ChevronDown, Download, Loader2 } from 'lucide-react';

export interface CubeRow {
  id: string;
  rowLabel: string;
  indent?: number;
  hasChildren?: boolean;
  isTotal?: boolean;
  isSubtotal?: boolean;
  level?: string;
  parentValue?: string;
    children?: CubeRow[];       // ← add this

  [key: string]: any; // Dynamic measure columns (Revenue, Cost, Quantity, etc.)
}

interface CubeGridProps {
  data: CubeRow[];
  columns?: ColumnDef<CubeRow>[];
  measures?: string[];
  title?: string;
  showExport?: boolean;
  onExport?: () => void;
  onDrillDown?: (row: CubeRow) => Promise<CubeRow[]>;
}

export default function CubeGrid({
  data,
  columns,
  measures = ['Revenue', 'Cost', 'Margin', 'Quantity'],
  title,
  showExport = true,
  onExport,
  onDrillDown,
}: CubeGridProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [childrenData, setChildrenData] = useState<Record<string, CubeRow[]>>({});
  const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set());

  const formatNumber = (value: number | undefined) => {
  if (value === undefined || value === null) return '-';

  const formatted = (Math.abs(value) / 1_000_000).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return value < 0 ? `($${formatted}M)` : `$${formatted}M`;
};

  const formatPercent = (value: any) => {
    if (value === undefined || value === null || isNaN(value)) return '-';
    if (typeof value === 'number') {
      return `${value.toFixed(1)}%`;
    }
    return String(value);
  };

  const toggleExpand = useCallback(async (row: CubeRow) => {
    const rowId = row.id;
    
    // If already expanded, collapse
    if (expandedRows.has(rowId)) {
      setExpandedRows(prev => {
        const newExpanded = new Set(prev);
        newExpanded.delete(rowId);
        return newExpanded;
      });
      return;
    }

    // If not cached and has onDrillDown, fetch children
    if (!childrenData[rowId] && onDrillDown && (row.hasChildren || row.level)) {
      setLoadingRows(prev => new Set([...prev, rowId]));
      
      try {
        const children = await onDrillDown(row);
        if (children.length === 0) {
          console.warn('⚠️ No children returned for:', rowId);
        }
        
        // Add parent context to children
        const enrichedChildren = children.map((child, idx) => ({
          ...child,
          id: child.id || `${rowId}-child-${idx}`,
          indent: (row.indent || 0) + 1,
          parentValue: row.rowLabel,
        }));

        setChildrenData(prev => ({
          ...prev,
          [rowId]: enrichedChildren,
        }));

        // Expand after loading
        setExpandedRows(prev => {
          const newExpanded = new Set(prev);
          newExpanded.add(rowId);
          return newExpanded;
        });
        
      } catch (error) {
        console.error('❌ Error loading drill-down data:', error);
        // Show user-friendly error
        alert(`Failed to load drill-down data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoadingRows(prev => {
          const newLoading = new Set(prev);
          newLoading.delete(rowId);
          return newLoading;
        });
      }
    } else {
      // Already cached or no drill-down, just expand
      setExpandedRows(prev => {
        const newExpanded = new Set(prev);
        newExpanded.add(rowId);
        return newExpanded;
      });
    }
  }, [expandedRows, childrenData, onDrillDown]);

  const flattenData = useCallback((rows: CubeRow[]): CubeRow[] => {
  const result: CubeRow[] = [];

  for (const row of rows) {
    result.push(row);
    
    if (expandedRows.has(row.id)) {
      // First check dynamically fetched children
      const fetchedChildren = childrenData[row.id];
      if (fetchedChildren && fetchedChildren.length > 0) {
        result.push(...flattenData(fetchedChildren));
      }
      // Then check children embedded in the row itself (pre-loaded data)
      else if (row.children && row.children.length > 0) {
        result.push(...flattenData(row.children));
      }
    }
  }

  return result;
}, [expandedRows, childrenData]);

  const tableData = useMemo(() => flattenData(data), [data, flattenData]);

  const defaultColumns: ColumnDef<CubeRow>[] = useMemo(() => [
    {
      id: 'rowLabel',
      accessorKey: 'rowLabel',
      header: 'Particulars',
      cell: ({ row }: any) => {
        const indent = row.original.indent || 0;
        const hasChildren = row.original.hasChildren || (childrenData[row.original.id]?.length ?? 0) > 0;
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleExpand(row.original);
                }}
                disabled={isLoading}
                type="button"
                className="mr-2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 transition-colors cursor-pointer"
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
            <span>{row.original.rowLabel}</span>
          </div>
        );
      },
    },
    ...measures.map((measure) => ({
      id: measure,
      accessorKey: measure,
      header: () => <div className="text-right">{measure}</div>,
      cell: ({ row }: any) => {
          const value = row.original[measure];
          
          // Don't format Headcount as currency
          const isCount = measure.toLowerCase().includes('headcount') || measure.toLowerCase().includes('count') || measure.toLowerCase().includes('quantity');
          
          const formatted = isCount
            ? (value ?? '-').toString()
            : measure.includes('%') || measure.toLowerCase().includes('percent')
            ? formatPercent(value)
            : formatNumber(value);

          return (
            <div className={`text-right ${row.original.isTotal || row.original.isSubtotal ? 'font-bold' : ''}`}>
              {formatted}
            </div>
          );
        },
    })),
  ], [measures, toggleExpand, expandedRows, childrenData, loadingRows]);

  const table = useReactTable({
    data: tableData,
    columns: columns || defaultColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
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
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${
                    row.original.isTotal
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-t-2 border-b-2 border-blue-300 dark:border-blue-700'
                      : row.original.isSubtotal
                      ? 'bg-gray-100 dark:bg-gray-800/50'
                      : ''
                  } ${row.original.hasChildren ? 'cursor-pointer' : ''}`}
                  onDoubleClick={() => {
                    if (row.original.hasChildren) {
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
