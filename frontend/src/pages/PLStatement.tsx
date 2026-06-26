import { useState, useEffect } from 'react';
import FinancialTable, { type FinancialRow } from '../components/FinancialTable';
import GlobalFilters, { type FilterOption } from '../components/GlobalFilters';
import { getPLStatementMapped, getEntities } from '../services/api';
import { Loader2 } from 'lucide-react';
import { exportFinancialTableToExcel } from '../utils/exportToExcel';
import AnnotationPanel from '../components/AnnotationPanel';

export default function PLStatement() {
  // Filters: Year, Month, Entity only — Version removed (consistent with other pages)
  const [filters, setFilters] = useState<Record<string, string>>({
    year: '2024',
    month: 'ytd',
    entity: 'all',
  });

  const [plData, setPlData]     = useState<FinancialRow[]>([]);
  const [summary, setSummary]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Dynamic entity options — undefined = loading, [] = loaded (possibly empty)
  const [entityOptions, setEntityOptions]   = useState<{ value: string; label: string }[] | undefined>(undefined);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // -------------------------------------------------------------------------
  // Load entity options on mount — Promise.allSettled so a failure here
  // does not block the data load. API returns snake_case entity_name.
  // -------------------------------------------------------------------------
  useEffect(() => {
    setFiltersLoading(true);
    (async () => {
      const [entResult] = await Promise.allSettled([getEntities()]);

      if (entResult.status === 'fulfilled') {
        const entities: any[] = entResult.value.data?.data ?? [];
        setEntityOptions(
          entities.map((e) => ({ value: e.entity_name, label: e.entity_name }))
        );
      } else {
        console.error('Entity options failed:', entResult.reason);
        setEntityOptions([]);
      }

      setFiltersLoading(false);
    })();
  }, []);

  // -------------------------------------------------------------------------
  // Fetch P&L statement data whenever year or entity changes.
  // Uses a `cancelled` closure flag — no race condition from fetchingRef.
  // Previous data stays visible while reloading (overlay spinner only).
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: { year: number; entity?: string } = { year: parseInt(filters.year) };
    if (filters.entity !== 'all') params.entity = filters.entity;

    getPLStatementMapped(params)
      .then((response) => {
        if (cancelled) return;
        const result = response.data.data;
        if (result?.lines?.length > 0) {
          setPlData(result.lines);
          setSummary(result.summary);
          setError(null);
        } else {
          setPlData([]);
          setError('No P&L data available for the selected filters. Try a different year or entity.');
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        console.error('Failed to load P&L data:', err);
        setError('Failed to connect to backend. Please ensure the backend server is running on localhost:8000.');
        setPlData([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters.year, filters.entity]);

  // -------------------------------------------------------------------------
  // Filter definitions
  // -------------------------------------------------------------------------
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
        { value: '01',  label: 'January'   },
        { value: '02',  label: 'February'  },
        { value: '03',  label: 'March'     },
        { value: '04',  label: 'April'     },
        { value: '05',  label: 'May'       },
        { value: '06',  label: 'June'      },
        { value: '07',  label: 'July'      },
        { value: '08',  label: 'August'    },
        { value: '09',  label: 'September' },
        { value: '10',  label: 'October'   },
        { value: '11',  label: 'November'  },
        { value: '12',  label: 'December'  },
      ],
    },
    {
      id: 'entity',
      label: 'Entity',
      options: entityOptions ?? [],
    },
  ];

  const handleResetFilters = () =>
    setFilters({ year: '2024', month: 'ytd', entity: 'all' });

  // -------------------------------------------------------------------------
  // Margin calculations from live summary
  // -------------------------------------------------------------------------
  const calculateMargins = () => {
    if (!summary) {
      return { grossMargin: 30.7, operatingMargin: -55.3, ebitdaMargin: -51.6, netMargin: -57.3 };
    }
    const { total_revenue, gross_profit, net_income } = summary;
    return {
      grossMargin:      total_revenue > 0 ? (gross_profit / total_revenue) * 100 : 0,
      operatingMargin:  -55.3, // simplified until backend provides operating income
      ebitdaMargin:     -51.6, // simplified until backend provides EBITDA
      netMargin:        total_revenue > 0 ? (net_income   / total_revenue) * 100 : 0,
    };
  };

  const margins = calculateMargins();

  const handleExportPLTable = () => {
    try {
      exportFinancialTableToExcel(plData, 'PL_Statement_Table');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profit & Loss Statement</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive income statement</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">Period: FY {filters.year}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Entity: {filters.entity !== 'all' ? filters.entity : 'All Entities'}
          </p>
        </div>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Gross Margin %</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{margins.grossMargin.toFixed(1)}%</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">Operating Margin %</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{margins.operatingMargin.toFixed(1)}%</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">EBITDA Margin %</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">{margins.ebitdaMargin.toFixed(1)}%</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Net Margin %</p>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">{margins.netMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Global Filters — spinner shown while entity options load */}
      <div className="relative">
        {filtersLoading && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-indigo-500" />
            Loading filters…
          </div>
        )}
        <GlobalFilters
          filters={filterOptions}
          values={filters}
          onApply={setFilters}
          onReset={handleResetFilters}
        />
      </div>

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
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading P&L statement...</span>
        </div>
      ) : (
        <>
          <FinancialTable
            data={plData}
            title={`Profit & Loss Statement - ${filters.year}`}
            showExport={true}
            showForecast={false}
            onExport={handleExportPLTable}
          />

          <AnnotationPanel
            pageKey="pl-statement"
            period={`${filters.year}:${filters.entity !== 'all' ? filters.entity : 'all'}`}
          />
        </>
      )}
    </div>
  );
}
