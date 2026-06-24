import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Download } from 'lucide-react';
import type { PivotConfig } from '../components/PivotDialog';
import { exportToExcel } from '../utils/exportToExcel';

interface PivotTableViewProps {
  title: string;
  sourceData: any[];
  pivotConfig: PivotConfig;
  sourcePage: string;
  fetchData?: () => Promise<any[]>;
}

interface PivotCell {
  rowKey: string;
  colKey: string;
  values: Record<string, number>;
}

export default function PivotTableView() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PivotTableViewProps | null;

  const [pivotData, setPivotData] = useState<any[]>([]);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state && state.sourceData) {
      buildPivotTable(state.sourceData, state.pivotConfig);
    } else {
      // No data provided, redirect back
      navigate(-1);
    }
  }, [state, navigate]);

  const buildPivotTable = (data: any[], config: PivotConfig) => {
    setLoading(true);
    try {
      console.log('🔄 Building pivot table with config:', config);
      console.log('📊 Source data:', data);

      if (!data || data.length === 0) {
        setPivotData([]);
        setColumnHeaders([]);
        setLoading(false);
        return;
      }

      // For now, we'll create a simple pivot view
      // This reshapes data based on the first row dimension
      const rowDim = config.rowDimensions[0] || 'rowLabel';
      
      // Get unique column values if column dimensions are specified
      const colDim = config.columnDimensions[0];
      const uniqueColumns: Set<string> = new Set();
      
      if (colDim && data[0]?.[colDim]) {
        data.forEach(row => {
          if (row[colDim]) uniqueColumns.add(row[colDim]);
        });
      }

      // Build pivot rows
      const pivotRows: any[] = [];
      const rowGroups = new Map<string, any[]>();

      // Group data by row dimension
      data.forEach(row => {
        const rowKey = row[rowDim] || row.rowLabel || 'Unknown';
        if (!rowGroups.has(rowKey)) {
          rowGroups.set(rowKey, []);
        }
        rowGroups.get(rowKey)!.push(row);
      });

      // Create pivot table structure
      rowGroups.forEach((rows, rowKey) => {
        const pivotRow: any = {
          [rowDim]: rowKey,
        };

        if (uniqueColumns.size > 0) {
          // Cross-tabulated view
          uniqueColumns.forEach(colValue => {
            const matchingRows = rows.filter(r => r[colDim] === colValue);
            config.measures.forEach(measure => {
              const sum = matchingRows.reduce((acc, r) => acc + (Number(r[measure]) || 0), 0);
              pivotRow[`${colValue}_${measure}`] = sum;
            });
          });
        } else {
          // Simple aggregation
          config.measures.forEach(measure => {
            const sum = rows.reduce((acc, r) => acc + (Number(r[measure]) || 0), 0);
            pivotRow[measure] = sum;
          });
        }

        pivotRows.push(pivotRow);
      });

      // Build column headers
      const headers: string[] = [rowDim];
      if (uniqueColumns.size > 0) {
        uniqueColumns.forEach(colValue => {
          config.measures.forEach(measure => {
            headers.push(`${colValue}_${measure}`);
          });
        });
      } else {
        headers.push(...config.measures);
      }

      console.log('✅ Pivot table built:', pivotRows.length, 'rows');
      setPivotData(pivotRows);
      setColumnHeaders(headers);
    } catch (error) {
      console.error('❌ Error building pivot table:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenInNewTab = () => {
    window.open(location.pathname + location.search, '_blank');
  };

  const handleExport = () => {
    try {
      exportToExcel({
        data: pivotData,
        fileName: `${state?.title || 'Pivot_Table'}_Export`,
        sheetName: 'Pivot Table',
        columnHeaders: columnHeaders,
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatValue = (value: any, header: string) => {
    if (value === undefined || value === null || isNaN(value)) return '-';
    if (typeof value === 'number') {
      if (header.includes('%') || header.includes('Percent')) {
        return `${value.toFixed(1)}%`;
      }
      if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
      } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
      }
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return String(value);
  };

  if (!state) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No pivot configuration found</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {state.title} - Pivot Table
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Reshaped view based on your configuration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Cube
          </button>
          <button
            onClick={handleOpenInNewTab}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition-colors"
          >
            <ExternalLink size={18} />
            Open in New Tab
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Pivot Configuration
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <p>
            <strong>Rows:</strong> {state.pivotConfig.rowDimensions.join(', ') || 'None'}
          </p>
          <p>
            <strong>Columns:</strong> {state.pivotConfig.columnDimensions.join(', ') || 'None'}
          </p>
          <p>
            <strong>Measures:</strong> {state.pivotConfig.measures.join(', ')}
          </p>
        </div>
      </div>

      {/* Pivot Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <tr>
                {columnHeaders.map((header, idx) => (
                  <th
                    key={idx}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700"
                  >
                    {header.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pivotData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnHeaders.length}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No data available
                  </td>
                </tr>
              ) : (
                pivotData.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    {columnHeaders.map((header, colIdx) => (
                      <td
                        key={colIdx}
                        className={`px-6 py-3 text-sm ${
                          colIdx === 0
                            ? 'font-medium text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300 text-right'
                        } whitespace-nowrap`}
                      >
                        {colIdx === 0
                          ? row[header]
                          : formatValue(row[header], header)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Note:</strong> This is a dynamically generated pivot table based on your configuration.
          The data is aggregated and reshaped according to your selected dimensions and measures.
          {pivotData.length > 0 && ` Showing ${pivotData.length} row${pivotData.length !== 1 ? 's' : ''}.`}
        </p>
      </div>
    </div>
  );
}
