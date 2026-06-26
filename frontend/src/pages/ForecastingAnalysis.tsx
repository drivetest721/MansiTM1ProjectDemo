import { useState, useEffect, useRef } from 'react';
import FinancialTable from '../components/FinancialTable';
import type { FinancialRow } from '../components/FinancialTable';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { Loader2 } from 'lucide-react';
import { getScenarioSummary, getForecastTable, getEntities, getForecastMonthlyTrend } from '../services/api';
import WorkflowStatusBadge from '../components/WorkflowStatusBadge';
import AnnotationPanel from '../components/AnnotationPanel';
import RollingForecastPanel from '../components/RollingForecastPanel';
import { exportFinancialTableToExcel } from '../utils/exportToExcel';

// ---------------------------------------------------------------------------
// Static fallback data — used when API is unavailable
// ---------------------------------------------------------------------------
const scenariosFallback = [
  { name: 'Most Likely Case', revenue: 145800000, ebitda: -54400000, netIncome: -61200000, probability: '50%', color: 'blue' },
  { name: 'Best Case',        revenue: 158200000, ebitda: -48900000, netIncome: -55100000, probability: '25%', color: 'green' },
  { name: 'Worst Case',       revenue: 132400000, ebitda: -62100000, netIncome: -69800000, probability: '25%', color: 'red' },
];

const forecastTrendFallback = [
  { month: 'Jan', budget: 11200000, forecast: 11500000 },
  { month: 'Feb', budget: 11500000, forecast: 11800000 },
  { month: 'Mar', budget: 11800000, forecast: 12200000 },
  { month: 'Apr', budget: 12000000, forecast: 12500000 },
  { month: 'May', budget: 12300000, forecast: 12800000 },
  { month: 'Jun', budget: 12500000, forecast: 13000000 },
  { month: 'Jul', budget: 12800000, forecast: 13200000 },
  { month: 'Aug', budget: 13000000, forecast: 13500000 },
  { month: 'Sep', budget: 13200000, forecast: 13700000 },
  { month: 'Oct', budget: 13500000, forecast: 14000000 },
  { month: 'Nov', budget: 13700000, forecast: 14200000 },
  { month: 'Dec', budget: 14000000, forecast: 14500000 },
];

const colorClasses: Record<string, string> = {
  blue:  'bg-blue-50  dark:bg-blue-900/20  border-blue-200  dark:border-blue-800',
  green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  red:   'bg-red-50   dark:bg-red-900/20   border-red-200   dark:border-red-800',
  gray:  'bg-gray-50  dark:bg-gray-900/20  border-gray-200  dark:border-gray-800',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ForecastingAnalysis() {
  // Filters: Year and Entity only — Scenario removed (consistent with other pages)
  const [filters, setFilters] = useState<Record<string, string>>({
    year: '2024',
    entity: 'all',
  });

  const fetchingRef = useRef(false);
  const [scenarios, setScenarios]               = useState<any[]>(scenariosFallback);
  const [forecastTableData, setForecastTableData] = useState<FinancialRow[]>([]);
  const [forecastTrendData, setForecastTrendData] = useState<any[]>(forecastTrendFallback);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState<string | null>(null);

  // Dynamic filter options — same pattern as CFOBudgeting / WorkforcePlanning
  const [entityOptions, setEntityOptions]       = useState<{ value: string; label: string }[] | undefined>(undefined);
  const [filtersLoading, setFiltersLoading]     = useState(true);

  // -------------------------------------------------------------------------
  // Load entity options on mount — Promise.allSettled so a failure here
  // does not block the data load
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
  // Load scenario summary, forecast table, and monthly trend
  // -------------------------------------------------------------------------
  useEffect(() => {
    const loadForecastData = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      const params: { year: number; entity?: string } = { year: parseInt(filters.year) };
      if (filters.entity !== 'all') params.entity = filters.entity;

      try {
        const [scenarioRes, tableRes, trendRes] = await Promise.allSettled([
          getScenarioSummary(params),
          getForecastTable(params),
          getForecastMonthlyTrend(params),
        ]);

        // Scenarios
        if (scenarioRes.status === 'fulfilled') {
          const scenarioData = scenarioRes.value.data.data;
          if (scenarioData?.scenarios?.length > 0) {
            const mapped = scenarioData.scenarios.map((s: any) => ({
              name:        s.scenario_name === 'Base Case' ? 'Most Likely Case' : s.scenario_name,
              revenue:     s.revenue,
              ebitda:      s.ebitda ?? s.net_income * 1.1,
              netIncome:   s.net_income,
              probability: s.probability ? `${(s.probability * 100).toFixed(0)}%` : '33%',
              color:       s.color || 'blue',
            }));
            const order: Record<string, number> = { 'Most Likely Case': 2, 'Best Case': 1, 'Worst Case': 3 };
            mapped.sort((a: any, b: any) => (order[a.name] || 99) - (order[b.name] || 99));
            setScenarios(mapped);
          } else {
            setScenarios(scenariosFallback);
          }
        }

        // Forecast table
        if (tableRes.status === 'fulfilled') {
          setForecastTableData(tableRes.value.data.data || []);
        } else {
          console.error('Forecast table failed:', tableRes.reason);
        }

        // Monthly trend
        if (trendRes.status === 'fulfilled') {
          const trend: any[] = trendRes.value.data.data || [];
          if (trend.length > 0) setForecastTrendData(trend);
        } else {
          console.error('Monthly trend failed:', trendRes.reason);
        }

        if (
          scenarioRes.status === 'rejected' &&
          tableRes.status  === 'rejected' &&
          trendRes.status  === 'rejected'
        ) {
          setError('Could not reach the backend. Showing sample data.');
        }

      } catch (err: any) {
        console.error('Unexpected error loading forecast data:', err);
        setError(err.message || 'Failed to load forecasting data');
        setScenarios(scenariosFallback);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    const controller = new AbortController();
    loadForecastData();
    return () => { controller.abort(); fetchingRef.current = false; };
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
      id: 'entity',
      label: 'Entity',
      options: entityOptions ?? [],
    },
  ];

  const handleResetFilters = () => setFilters({ year: '2024', entity: 'all' });

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return `$${(value / 1_000_000).toFixed(1)}M`;
  };

  const scenarioComparisonData = scenarios.map((s) => ({
    scenario:     s.name,
    Revenue:      s.revenue   || 0,
    EBITDA:       s.ebitda    || 0,
    'Net Income': s.netIncome || 0,
  }));

  const handleExportForecastTable = () => {
    try {
      exportFinancialTableToExcel(forecastTableData, 'Forecast_Analysis_Table');
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Forecasting Analysis</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Forecast scenario analysis and planning</p>
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
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading forecast scenarios...</span>
        </div>
      ) : (
        <>
          {/* Scenario Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scenarios.map((scenario) => {
              const cardClass = colorClasses[scenario.color as string] ?? colorClasses.gray;
              return (
                <div key={scenario.name} className={`rounded-lg border-2 p-6 ${cardClass}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{scenario.name}</h3>
                    <span className="px-3 py-1 text-xs font-semibold bg-white dark:bg-gray-800 rounded-full">
                      {scenario.probability}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(scenario.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">EBITDA</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(scenario.ebitda)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Net Income</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(scenario.netIncome)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Forecast Table */}
          {forecastTableData.length > 0 && (
            <FinancialTable
              data={forecastTableData}
              title="Forecast Analysis Table"
              showExport={true}
              onExport={handleExportForecastTable}
            />
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Budget vs Forecast Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Monthly Budget vs Forecast Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={forecastTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#6b7280" />
                  <Tooltip formatter={(value) => (value ? formatCurrency(Number(value)) : '')} />
                  <Legend />
                  <Line type="monotone" dataKey="budget" name="Budget" stroke="#10b981" strokeWidth={2}>
                    <LabelList
                      dataKey="budget"
                      position="top"
                      offset={-25}
                      angle={-45}
                      formatter={(v) => (v != null ? formatCurrency(Number(v)) : '')}
                      style={{ fontSize: 14, fill: '#10b981' }}
                    />
                  </Line>
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5">
                    <LabelList
                      dataKey="forecast"
                      position="bottom"
                      offset={25}
                      angle={45}
                      formatter={(v) => (v != null ? formatCurrency(Number(v)) : '')}
                      style={{ fontSize: 14, fill: '#f59e0b' }}
                    />
                  </Line>
                  <Line type="monotone" dataKey="variance" name="Variance" stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2">
                    <LabelList
                      dataKey="variance"
                      position="top"
                      offset={25}
                      angle={45}
                      formatter={(v) => (v != null ? formatCurrency(Number(v)) : '')}
                      style={{ fontSize: 14, fill: '#ef4444' }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Scenario Comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Scenario Comparison
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scenarioComparisonData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="scenario" stroke="#6b7280" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#6b7280" />
                  <Tooltip formatter={(value) => (value ? formatCurrency(Number(value)) : '')} />
                  <Legend />
                  <Bar dataKey="Revenue" name="Revenue" fill="#3b82f6">
                    <LabelList
                      dataKey="Revenue"
                      position="top"
                      formatter={(v: any) => formatCurrency(v)}
                      style={{ fontSize: 14, fontWeight: 500, fill: '#3b82f6' }}
                    />
                  </Bar>
                  <Bar dataKey="EBITDA" name="EBITDA" fill="#10b981">
                    <LabelList
                      dataKey="EBITDA"
                      position="bottom"
                      formatter={(v: any) => formatCurrency(v)}
                      style={{ fontSize: 12, fontWeight: 500, fill: '#10b981' }}
                    />
                  </Bar>
                  <Bar dataKey="Net Income" name="Net Income" fill="#f59e0b">
                    <LabelList
                      dataKey="Net Income"
                      position="bottom"
                      formatter={(v: any) => formatCurrency(v)}
                      style={{ fontSize: 12, fontWeight: 500, fill: '#f59e0b' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        

          <AnnotationPanel
            pageKey="forecasting-analysis"
            period={`${filters.year}:${filters.entity !== 'all' ? filters.entity : 'all'}`}
          />
        </>
      )}
    </div>
  );
}
