import { useState, useEffect, useCallback } from 'react';
import CubeGrid from '../components/CubeGrid';
import type { CubeRow } from '../components/CubeGrid';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import HierarchyTree from '../components/HierarchyTree';
import type { HierarchyNode } from '../components/HierarchyTree';
import { getEntityHierarchy, getConsolidatedCubeData } from '../services/api';
import { Loader2 } from 'lucide-react';
import AnnotationPanel from '../components/AnnotationPanel';
import { exportCubeToExcel } from '../utils/exportToExcel';

const CHILDREN_INDENT: Record<number, number> = {
  0: 1,
  1: 2,
};

export default function FinancialConsolidation() {
  // Filters: Year, Month, Currency — Scenario and Version removed (consistent with other pages)
  const [filters, setFilters] = useState<Record<string, string>>({
    year: '2024',
    month: 'ytd',
    currency: 'usd',
  });

  const [hierarchyData, setHierarchyData] = useState<HierarchyNode[]>([]);
  const [cubeData, setCubeData]           = useState<CubeRow[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Drill-down helper — stable reference via useCallback([cubeData])
  // ---------------------------------------------------------------------------
  const getChildRows = useCallback((parentRow: CubeRow): CubeRow[] => {
    const childIndent = CHILDREN_INDENT[parentRow.indent ?? 0];
    if (childIndent === undefined) return [];

    const parentIndex = cubeData.findIndex(r => r.id === parentRow.id);
    if (parentIndex === -1) return [];

    const children: CubeRow[] = [];
    for (let i = parentIndex + 1; i < cubeData.length; i++) {
      const row = cubeData[i];
      const rowIndent = row.indent ?? 0;
      if (rowIndent <= (parentRow.indent ?? 0)) break;
      if (rowIndent === childIndent) children.push(row);
    }
    return children;
  }, [cubeData]);

  // ---------------------------------------------------------------------------
  // Load entity hierarchy once on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    getEntityHierarchy()
      .then((response) => {
        if (response.data.success) setHierarchyData(response.data.data);
      })
      .catch((err: any) => {
        console.error('Failed to load entity hierarchy:', err);
        setError('Failed to load entity hierarchy');
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Load consolidated cube data whenever year changes.
  // Uses `cancelled` closure flag — no race condition from fetchingRef.
  // Previous data stays visible while reloading (overlay spinner only).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getConsolidatedCubeData({ year: parseInt(filters.year) })
      .then((response) => {
        if (cancelled) return;
        if (response.data.success) {
          setCubeData(response.data.data.rows);
        } else {
          setError('No consolidation data available');
          setCubeData([]);
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error('Failed to load consolidation cube data:', err);
        setError('Failed to connect to backend. Please ensure the server is running.');
        setCubeData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters.year]);

  // ---------------------------------------------------------------------------
  // Filter definitions — inside component so year list renders consistently
  // ---------------------------------------------------------------------------
  const filterOptions: FilterOption[] = [
    {
      id: 'year',
      label: 'Year',
      options: Array.from({ length: 13 }, (_, i) => 2018 + i).map((y) => ({
        value: String(y),
        label: String(y),
      })),
    },
    {
      id: 'month',
      label: 'Month',
      options: [
        { value: 'ytd', label: 'Year to Date' },
        { value: '01', label: 'January'   },
        { value: '02', label: 'February'  },
        { value: '03', label: 'March'     },
        { value: '04', label: 'April'     },
        { value: '05', label: 'May'       },
        { value: '06', label: 'June'      },
        { value: '07', label: 'July'      },
        { value: '08', label: 'August'    },
        { value: '09', label: 'September' },
        { value: '10', label: 'October'   },
        { value: '11', label: 'November'  },
        { value: '12', label: 'December'  },
      ],
    },
    {
      id: 'currency',
      label: 'Currency',
      options: [
        { value: 'usd',   label: 'USD' },
        { value: 'eur',   label: 'EUR' },
        { value: 'local', label: 'Local Currency' },
      ],
    },
  ];

  const handleResetFilters = () =>
    setFilters({ year: '2024', month: 'ytd', currency: 'usd' });

  const handleExportConsolidationTable = () => {
    try {
      exportCubeToExcel(
        cubeData,
        ['Revenue', 'Expense', 'EBITDA', 'Net Income', 'Assets', 'Liabilities', 'Equity'],
        'Consolidation_Table'
      );
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Consolidation</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Entity consolidation across regions</p>
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filterOptions}
        values={filters}
        onApply={setFilters}
        onReset={handleResetFilters}
      />

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">⚠️ {error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading consolidation data...</span>
        </div>
      ) : (
        <>
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Entity Hierarchy Tree */}
            <div className="lg:col-span-1">
              <HierarchyTree data={hierarchyData} title="Entity Hierarchy" />
            </div>

            {/* Consolidation Cube */}
            <div className="lg:col-span-2">
              <CubeGrid
                data={cubeData.filter(row => (row.indent ?? 0) === 0)}
                measures={['Revenue', 'Expense', 'EBITDA', 'Net Income', 'Assets', 'Liabilities', 'Equity']}
                title="Consolidated Financial Data"
                showExport={true}
                onExport={handleExportConsolidationTable}
                onDrillDown={async (row) => getChildRows(row)}
              />
            </div>
          </div>
        </>
      )}

      <AnnotationPanel
        pageKey="cfo-financial-consolidation"
        period={`${filters.year}:${filters.currency}`}
      />
    </div>
  );
}
