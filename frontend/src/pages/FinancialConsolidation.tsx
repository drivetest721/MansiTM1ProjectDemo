import { useState, useEffect, useCallback } from 'react';
import CubeGrid from '../components/CubeGrid';
import type { CubeRow } from '../components/CubeGrid';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import HierarchyTree from '../components/HierarchyTree';
import type { HierarchyNode } from '../components/HierarchyTree';
import { getEntityHierarchy, getConsolidatedCubeData } from '../services/api';
import { Loader2 } from 'lucide-react';

// Removed ~230 lines of mock data - now using real backend data from consolidation_service.py
const CHILDREN_INDENT: Record<number, number> = {
  0: 1,
  1: 2,
};

const filterOptions: FilterOption[] = [
  {
    id: 'year',
    label: 'Year',
    options: [
      { value: '2025', label: '2025' },
      { value: '2024', label: '2024' },
    ],
  },
  {
    id: 'month',
    label: 'Month',
    options: [
      { value: 'ytd', label: 'Year to Date' },
      { value: '12', label: 'December' },
    ],
  },
  {
    id: 'currency',
    label: 'Currency',
    options: [
      { value: 'usd', label: 'USD' },
      { value: 'eur', label: 'EUR' },
      { value: 'local', label: 'Local Currency' },
    ],
  },
  {
    id: 'version',
    label: 'Version',
    options: [
      { value: 'actual', label: 'Actual' },
      { value: 'budget', label: 'Budget' },
    ],
  },
];

export default function FinancialConsolidation() {
  const [filters, setFilters] = useState<Record<string, string>>({
    year: '2024',
    month: 'ytd',
    currency: 'usd',
    version: 'actual',
  });

  const [hierarchyData, setHierarchyData] = useState<HierarchyNode[]>([]);
  const [cubeData, setCubeData] = useState<CubeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Load entity hierarchy
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        const response = await getEntityHierarchy();
        if (response.data.success) {
          setHierarchyData(response.data.data);
        }
      } catch (err: any) {
        console.error('Failed to load entity hierarchy:', err);
        setError('Failed to load entity hierarchy');
      }
    };
    loadHierarchy();
  }, []);
  

  useEffect(() => {
  if (cubeData.length > 0) {
    console.log('🔍 cubeData sample (first 3 rows):', JSON.stringify(cubeData.slice(0, 3), null, 2));
  }
}, [cubeData]);
  // Load consolidated cube data
  useEffect(() => {
    const loadCubeData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = {
          year: parseInt(filters.year)
        };

        const response = await getConsolidatedCubeData(params);
        if (response.data.success) {
          setCubeData(response.data.data.rows);
        } else {
          setError('No consolidation data available');
          setCubeData([]);
        }
      } catch (err: any) {
        console.error('Failed to load consolidation cube data:', err);
        setError('Failed to connect to backend. Please ensure the server is running.');
        setCubeData([]);
      } finally {
        setLoading(false);
      }
    };

    loadCubeData();
  }, [filters.year]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Consolidation</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Entity consolidation across regions - ✅ Real data from database</p>
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filterOptions}
        values={filters}
        onChange={(id, val) => setFilters({ ...filters, [id]: val })}
        onReset={() => setFilters({ year: '2024', month: 'ytd', currency: 'usd', version: 'actual' })}
      />

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ {error}
          </p>
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
              <HierarchyTree
                data={hierarchyData}
                title="Entity Hierarchy"
              />
            </div>

            {/* Consolidation Cube */}
            <div className="lg:col-span-2">
              <CubeGrid
                data={cubeData.filter(row => (row.indent ?? 0) === 0)} // only Global row
                measures={['Revenue', 'Expense', 'EBITDA', 'Net Income', 'Assets', 'Liabilities', 'Equity']}
                title="Consolidated Financial Data"
                showExport={true}
                onExport={() => console.log('Export')}
                onDrillDown={async (row) => getChildRows(row)}  // ← key fix
              />
            </div>
          </div>

          {/* FX Conversion Note */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              <strong>Real Data Source:</strong> Financial data aggregated from Finance.vw_PL_Statement and Finance.vw_BalanceSheet views. 
              Entity hierarchy from TM1.vw_Dim_Entity. Data rolled up hierarchically: Global → Americas/APAC/EMEA → Individual Entities.
              All amounts in {filters.currency.toUpperCase()}.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
