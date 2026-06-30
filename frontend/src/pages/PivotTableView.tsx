import { useState, useEffect, type JSX } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Download, ChevronDown, ChevronRight } from 'lucide-react';
import type { PivotConfig } from '../components/PivotDialog';
import { exportToExcel } from '../utils/exportToExcel';

interface PivotTableViewProps {
  title: string;
  sourceData: any[];
  pivotConfig: PivotConfig;
  sourcePage: string;
  fetchData?: () => Promise<any[]>;
}

const DIMENSION_FIELD_MAP: Record<string, string> = {
  // Revenue dimensions
  Product: 'product_category',
  Customer: 'customer_segment',
  Time: 'quarter',
  Region: 'region',
  Entity: 'entity',
  Version: 'version',
  // Workforce dimensions
  Department: 'department',
  'Job Level': 'job_level',
  'Employment Status': 'employment_status',
};

const MEASURE_FIELD_MAP: Record<string, string> = {
  // Revenue measures
  Revenue: 'revenue',
  Cost: 'cost',
  Quantity: 'quantity',
  'Gross Margin': 'margin',
  'Gross Margin %': 'margin_percent',
  // Workforce measures
  Headcount: 'headcount',
  'Base Salary': 'base_salary',
  Bonus: 'bonus',
  Benefits: 'benefits',
  'Total Compensation': 'total_compensation',
};

const PERCENT_MEASURES = new Set(['Gross Margin %']);

// One node in the hierarchical row tree (mirrors Excel's nested PivotTable rows)
interface PivotNode {
  key: string;          // unique path-based id
  label: string;         // display value at this level
  level: number;          // depth (0 = outermost dimension)
  rows: any[];            // raw source rows under this node (all descendants)
  children: PivotNode[];  // child nodes (next dimension down), empty if leaf
}

export default function PivotTableView() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as PivotTableViewProps | null;

  const [tree, setTree] = useState<PivotNode[]>([]);
  const [colKeys, setColKeys] = useState<string[]>([]); // composite column values, e.g. "Q1 | East"
  const [measures, setMeasures] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state && state.sourceData) {
      buildPivotTree(state.sourceData, state.pivotConfig);
    } else {
      navigate(-1);
    }
  }, [state, navigate]);

  const buildPivotTree = (data: any[], config: PivotConfig) => {
    setLoading(true);
    try {
      if (!data || data.length === 0) {
        setTree([]);
        setColKeys([]);
        setMeasures(config.measures);
        setLoading(false);
        return;
      }

      const rowDimKeys = config.rowDimensions.length ? config.rowDimensions : ['Product'];
      const rowFields = rowDimKeys.map(d => DIMENSION_FIELD_MAP[d] || d);

      const colDimKeys = config.columnDimensions;
      const colFields = colDimKeys.map(d => DIMENSION_FIELD_MAP[d] || d);

      const getColKey = (row: any): string | null =>
        colFields.length ? colFields.map(f => row[f] ?? 'Unknown').join(' | ') : null;

      const uniqueColumns = new Set<string>();
      if (colFields.length) {
        data.forEach(row => {
          const key = getColKey(row);
          if (key != null) uniqueColumns.add(key);
        });
      }

      // Recursively build a nested tree: level 0 groups by rowFields[0], each of
      // those groups by rowFields[1], etc. — exactly how Excel nests row fields.
      const buildLevel = (rows: any[], levelIdx: number, parentPath: string): PivotNode[] => {
        if (levelIdx >= rowFields.length) return [];
        const field = rowFields[levelIdx];
        const groups = new Map<string, any[]>();
        rows.forEach(r => {
          const val = r[field] ?? 'Unknown';
          if (!groups.has(val)) groups.set(val, []);
          groups.get(val)!.push(r);
        });

        const nodes: PivotNode[] = [];
        groups.forEach((groupRows, label) => {
          const key = `${parentPath}/${label}`;
          nodes.push({
            key,
            label,
            level: levelIdx,
            rows: groupRows,
            children: buildLevel(groupRows, levelIdx + 1, key),
          });
        });
        // Sort alphabetically for stable, predictable order (Excel default)
        nodes.sort((a, b) => a.label.localeCompare(b.label));
        return nodes;
      };

      const rootNodes = buildLevel(data, 0, 'root');

      setTree(rootNodes);
      setColKeys(Array.from(uniqueColumns).sort());
      setMeasures(config.measures);
      setCollapsed(new Set()); // start fully expanded
    } catch (error) {
      console.error('❌ Error building pivot table:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recompute aggregates correctly: percentages from underlying totals, never summed directly
  const aggregate = (rows: any[], measure: string, colValue?: string): number => {
    const filtered = colValue
      ? rows.filter(r => {
          // Reconstruct the same composite key logic used in buildPivotTree
          return true; // filtering happens via precomputed colKey below
        })
      : rows;

    if (PERCENT_MEASURES.has(measure)) {
      const totalRevenue = filtered.reduce((a, r) => a + (Number(r['revenue']) || 0), 0);
      const totalMargin = filtered.reduce((a, r) => a + (Number(r['margin']) || 0), 0);
      return totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    }
    const field = MEASURE_FIELD_MAP[measure] || measure;
    return filtered.reduce((a, r) => a + (Number(r[field]) || 0), 0);
  };

  const getColKeyForRow = (row: any, colDimKeys: string[]): string => {
    const colFields = colDimKeys.map(d => DIMENSION_FIELD_MAP[d] || d);
    return colFields.map(f => row[f] ?? 'Unknown').join(' | ');
  };

  const cellValue = (rows: any[], measure: string, colKey: string | null, colDimKeys: string[]): number => {
    const scoped = colKey != null
      ? rows.filter(r => getColKeyForRow(r, colDimKeys) === colKey)
      : rows;

    if (PERCENT_MEASURES.has(measure)) {
      const totalRevenue = scoped.reduce((a, r) => a + (Number(r['revenue']) || 0), 0);
      const totalMargin = scoped.reduce((a, r) => a + (Number(r['margin']) || 0), 0);
      return totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    }
    const field = MEASURE_FIELD_MAP[measure] || measure;
    return scoped.reduce((a, r) => a + (Number(r[field]) || 0), 0);
  };

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleBack = () => navigate(-1);
  const handleOpenInNewTab = () => window.open(location.pathname + location.search, '_blank');

  const handleExport = () => {
    try {
      const flat = flattenForExport(tree, colKeys, measures, state!.pivotConfig.columnDimensions);
      exportToExcel({
        data: flat.rows,
        fileName: `${state?.title || 'Pivot_Table'}_Export`,
        sheetName: 'Pivot Table',
        columnHeaders: flat.headers,
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Flatten the tree into plain rows for export (Excel export doesn't need collapse state)
  const flattenForExport = (
    nodes: PivotNode[],
    colKeysList: string[],
    measureList: string[],
    colDimKeys: string[]
  ) => {
    const headers = ['Row Labels', ...(colKeysList.length
      ? colKeysList.flatMap(c => measureList.map(m => `${c} ${m}`))
      : measureList)];

    const rows: any[] = [];
    const walk = (node: PivotNode, indent: number) => {
      const r: any = { 'Row Labels': '  '.repeat(indent) + node.label };
      if (colKeysList.length) {
        colKeysList.forEach(c => {
          measureList.forEach(m => {
            r[`${c} ${m}`] = formatRaw(cellValue(node.rows, m, c, colDimKeys), m);
          });
        });
      } else {
        measureList.forEach(m => {
          r[m] = formatRaw(cellValue(node.rows, m, null, colDimKeys), m);
        });
      }
      rows.push(r);
      node.children.forEach(child => walk(child, indent + 1));
    };
    nodes.forEach(n => walk(n, 0));
    return { headers, rows };
  };

  const formatRaw = (value: number, measure: string) => {
    if (PERCENT_MEASURES.has(measure)) return Number(value.toFixed(2));
    return Number(value.toFixed(2));
  };

  const COUNT_MEASURES = new Set(['Quantity', 'Headcount']);

  const formatDisplay = (value: number, measure: string) => {
    if (isNaN(value)) return '-';
    if (PERCENT_MEASURES.has(measure)) return `${value.toFixed(1)}%`;
    if (COUNT_MEASURES.has(measure)) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Recursively render a node and its visible children, Excel-style:
  // each node gets one row, indented by level, with a subtotal if it has children.
  const renderNode = (node: PivotNode, colDimKeys: string[]): JSX.Element[] => {
    const isCollapsed = collapsed.has(node.key);
    const hasChildren = node.children.length > 0;
    const rowsOut: JSX.Element[] = [];

    rowsOut.push(
      <tr key={node.key} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors border-b border-gray-100 dark:border-gray-700">
        <td
          className="px-3 py-2 text-sm whitespace-nowrap"
          style={{ paddingLeft: `${16 + node.level * 24}px` }}
        >
          <div className="flex items-center gap-1">
            {hasChildren ? (
              <button
                onClick={() => toggleCollapse(node.key)}
                className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : (
              <span className="inline-block w-[18px]" />
            )}
            <span className={hasChildren ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}>
              {node.label}
            </span>
          </div>
        </td>
        {colKeys.length > 0
          ? colKeys.flatMap(colKey =>
              measures.map(measure => (
                <td key={`${colKey}_${measure}`} className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {formatDisplay(cellValue(node.rows, measure, colKey, colDimKeys), measure)}
                </td>
              ))
            )
          : measures.map(measure => (
              <td key={measure} className="px-4 py-2 text-sm text-right text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {formatDisplay(cellValue(node.rows, measure, null, colDimKeys), measure)}
              </td>
            ))}
      </tr>
    );

    if (hasChildren && !isCollapsed) {
      node.children.forEach(child => {
        rowsOut.push(...renderNode(child, colDimKeys));
      });
    }

    return rowsOut;
  };

  if (!state) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No pivot configuration found</p>
          <button onClick={handleBack} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
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

  const colDimKeys = state.pivotConfig.columnDimensions;

  // Grand total row across the whole dataset
  const allRows = tree.flatMap(n => n.rows);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{state.title} - Pivot Table</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Reshaped view based on your configuration</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition-colors">
            <ArrowLeft size={18} /> Back to Cube
          </button>
          {/* <button onClick={handleOpenInNewTab} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition-colors">
            <ExternalLink size={18} /> Open in New Tab
          </button> */}
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors">
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Pivot Configuration</h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <p><strong>Rows:</strong> {state.pivotConfig.rowDimensions.join(' → ') || 'None'}</p>
          <p><strong>Columns:</strong> {state.pivotConfig.columnDimensions.join(', ') || 'None'}</p>
          <p><strong>Measures:</strong> {state.pivotConfig.measures.join(', ')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              {colKeys.length > 0 && (
                <tr>
                  <th className="px-3 py-2 border-b border-gray-200 dark:border-gray-700" />
                  {colKeys.map(colKey => (
                    <th
                      key={colKey}
                      colSpan={measures.length}
                      className="px-4 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-l border-gray-200 dark:border-gray-700"
                    >
                      {colKey}
                    </th>
                  ))}
                </tr>
              )}
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                  Row Labels
                </th>
                {(colKeys.length > 0 ? colKeys.flatMap(() => measures) : measures).map((measure, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700"
                  >
                    {measure}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tree.length === 0 ? (
                <tr>
                  <td colSpan={1 + (colKeys.length > 0 ? colKeys.length * measures.length : measures.length)} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No data available
                  </td>
                </tr>
              ) : (
                tree.flatMap(node => renderNode(node, colDimKeys))
              )}
              {tree.length > 0 && (
                <tr className="bg-gray-100 dark:bg-gray-900 font-bold border-t-2 border-gray-300 dark:border-gray-600">
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">Grand Total</td>
                  {colKeys.length > 0
                    ? colKeys.flatMap(colKey =>
                        measures.map(measure => (
                          <td key={`${colKey}_${measure}_total`} className="px-4 py-2 text-sm text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {formatDisplay(cellValue(allRows, measure, colKey, colDimKeys), measure)}
                          </td>
                        ))
                      )
                    : measures.map(measure => (
                        <td key={`${measure}_total`} className="px-4 py-2 text-sm text-right text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {formatDisplay(cellValue(allRows, measure, null, colDimKeys), measure)}
                        </td>
                      ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Note:</strong> Click the arrows to expand or collapse a group, just like Excel's PivotTable.
        </p>
      </div>
    </div>
  );
}