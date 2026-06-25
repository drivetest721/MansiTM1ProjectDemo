import { useState, useEffect } from 'react';
import FinancialTable from '../components/FinancialTable';
import type { FinancialRow } from '../components/FinancialTable';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { getScenarioSummary, getForecastTable, getEntities, getForecastMonthlyTrend } from '../services/api';
import WorkflowStatusBadge from '../components/WorkflowStatusBadge';
import AnnotationPanel from '../components/AnnotationPanel';
import RollingForecastPanel from '../components/RollingForecastPanel';

// ---------------------------------------------------------------------------
// Static fallback data — used when API is unavailable
// ---------------------------------------------------------------------------

// NOTE: scenario names intentionally match what the backend returns so the
//       comparison chart works correctly whether using live or fallback data.
const scenariosFallback = [
  {
    name: 'Base Case',
    revenue: 145800000,
    ebitda: -54400000,
    netIncome: -61200000,
    probability: '50%',
    color: 'blue',
  },
  {
    name: 'Best Case',
    revenue: 158200000,
    ebitda: -48900000,
    netIncome: -55100000,
    probability: '25%',
    color: 'green',
  },
  {
    name: 'Worst Case',
    revenue: 132400000,
    ebitda: -62100000,
    netIncome: -69800000,
    probability: '25%',
    color: 'red',
  },
];

// Static monthly trend — used as fallback when API call fails
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

// ---------------------------------------------------------------------------
// Color mapping for scenario cards — with safe fallback
// ---------------------------------------------------------------------------
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
  const [filters, setFilters] = useState<Record<string, string>>({
    year: '2024',
    entity: '',
    scenario: 'base',
  });

  const [scenarios, setScenarios]           = useState<any[]>(scenariosFallback);
  const [forecastTableData, setForecastTableData] = useState<FinancialRow[]>([]);
  const [forecastTrendData, setForecastTrendData] = useState<any[]>(forecastTrendFallback);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [entityOptions, setEntityOptions]   = useState<FilterOption['options']>([
    { value: '', label: 'All Entities' },
  ]);

  // -------------------------------------------------------------------------
  // Load entity list for filter dropdown
  // -------------------------------------------------------------------------
  useEffect(() => {
    const loadEntities = async () => {
      try {
        const response = await getEntities();
        // API returns { success, data: [ { entity_name, ... }, ... ] }
        const entities: any[] = response.data.data || [];
        setEntityOptions([
          { value: '', label: 'All Entities' },
          ...entities.map((e) => ({
            value: e.entity_name,   // ← backend returns snake_case
            label: e.entity_name,
          })),
        ]);
      } catch (err) {
        // Non-critical: entity filter just won't be populated
        console.error('Failed to load entities:', err);
      }
    };
    loadEntities();
  }, []);

  // -------------------------------------------------------------------------
  // Load scenario summary, forecast table, and monthly trend
  // -------------------------------------------------------------------------
  useEffect(() => {
    const loadForecastData = async () => {
      setLoading(true);
      setError(null);

      const params = {
        year: parseInt(filters.year),
        entity: filters.entity || undefined,
      };

      try {
        // All three requests fire in parallel
        const [scenarioRes, tableRes, trendRes] = await Promise.allSettled([
          getScenarioSummary(params),
          getForecastTable(params),
          getForecastMonthlyTrend(params),
        ]);

        // --- Scenarios ---
        if (scenarioRes.status === 'fulfilled') {
          const scenarioData = scenarioRes.value.data.data; // { year, entity, scenarios }
          if (scenarioData?.scenarios?.length > 0) {
            const mapped = scenarioData.scenarios.map((s: any) => ({
              name:        s.scenario_name,
              revenue:     s.revenue,
              ebitda:      s.ebitda ?? s.net_income * 1.1,
              netIncome:   s.net_income,
              probability: s.probability ? `${(s.probability * 100).toFixed(0)}%` : '33%',
              color:       s.color || 'blue',
            }));
            setScenarios(mapped);
          } else {
            setScenarios(scenariosFallback);
          }
        } else {
          console.error('Scenario summary failed:', scenarioRes.reason);
          setScenarios(scenariosFallback);
        }

        // --- Forecast table ---
        if (tableRes.status === 'fulfilled') {
          const tableData: FinancialRow[] = tableRes.value.data.data || [];
          setForecastTableData(tableData);
        } else {
          console.error('Forecast table failed:', tableRes.reason);
        }

        // --- Monthly trend ---
        if (trendRes.status === 'fulfilled') {
          const trend: any[] = trendRes.value.data.data || [];
          if (trend.length > 0) {
            setForecastTrendData(trend);
          }
          // else keep fallback
        } else {
          console.error('Monthly trend failed:', trendRes.reason);
          // keep fallback already set
        }

        // Surface an error banner only if ALL three failed
        if (
          scenarioRes.status === 'rejected' &&
          tableRes.status === 'rejected' &&
          trendRes.status === 'rejected'
        ) {
          setError('Could not reach the backend. Showing sample data.');
        }

      } catch (err: any) {
        console.error('Unexpected error loading forecast data:', err);
        setError(err.message || 'Failed to load forecasting data');
        setScenarios(scenariosFallback);
      } finally {
        setLoading(false);
      }
    };

    loadForecastData();
  }, [filters.year, filters.entity]);

  // -------------------------------------------------------------------------
  // Filter options (defined inside component so entityOptions state is used)
  // -------------------------------------------------------------------------
  const filterOptions: FilterOption[] = [
    {
      id: 'year',
      label: 'Year',
      options: [
        { value: '2025', label: '2025' },
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' },
      ],
    },
    {
      id: 'entity',
      label: 'Entity',
      options: entityOptions,
    },
    {
      id: 'scenario',
      label: 'Scenario',
      options: [
        { value: 'base',  label: 'Base Case' },
        { value: 'best',  label: 'Best Case' },
        { value: 'worst', label: 'Worst Case' },
      ],
    },
  ];

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return `$${(value / 1_000_000).toFixed(1)}M`;
  };

  // -------------------------------------------------------------------------
  // Build scenario comparison from live state (works for both API + fallback)
  // -------------------------------------------------------------------------
  const findScenario = (name: string) => scenarios.find((s) => s.name === name);

  const scenarioComparisonData = [
    {
      metric: 'Revenue',
      base:  findScenario('Base Case')?.revenue   || 0,
      best:  findScenario('Best Case')?.revenue   || 0,
      worst: findScenario('Worst Case')?.revenue  || 0,
    },
    {
      metric: 'EBITDA',
      base:  findScenario('Base Case')?.ebitda    || 0,
      best:  findScenario('Best Case')?.ebitda    || 0,
      worst: findScenario('Worst Case')?.ebitda   || 0,
    },
    {
      metric: 'Net Income',
      base:  findScenario('Base Case')?.netIncome  || 0,
      best:  findScenario('Best Case')?.netIncome  || 0,
      worst: findScenario('Worst Case')?.netIncome || 0,
    },
  ];

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

      {/* Global Filters */}
      <GlobalFilters
        filters={filterOptions}
        values={filters}
        onChange={(id, val) => setFilters({ ...filters, [id]: val })}
        onReset={() => setFilters({ year: '2024', entity: '', scenario: 'base' })}
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
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading forecast scenarios...</span>
        </div>
      ) : (
        <>
          {/* Scenario Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scenarios.map((scenario) => {
              // Safe color fallback: if API returns an unknown color, use gray
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

          {/* Forecast Table (only shown when API returns data) */}
          {forecastTableData.length > 0 && (
            <FinancialTable
              data={forecastTableData}
              title="Forecast Analysis Table"
              showExport={true}
            />
          )}

          {/* Rolling Forecast Panel */}
          <RollingForecastPanel year={Number(filters.year)} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Budget vs Forecast Trend */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Monthly Budget vs Forecast Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={forecastTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#6b7280" />
                  <Tooltip formatter={(value) => (value ? formatCurrency(Number(value)) : '')} />
                  <Legend />
                  <Line type="monotone" dataKey="budget"   name="Budget"   stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="forecast" name="Forecast"  stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="variance" name="Variance"  stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Scenario Comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Scenario Comparison
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scenarioComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="metric" stroke="#6b7280" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} stroke="#6b7280" />
                  <Tooltip formatter={(value) => (value ? formatCurrency(Number(value)) : '')} />
                  <Legend />
                  <Bar dataKey="worst" name="Worst Case" fill="#ef4444" />
                  <Bar dataKey="base"  name="Base Case"  fill="#3b82f6" />
                  <Bar dataKey="best"  name="Best Case"  fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Workflow Status */}
          <WorkflowStatusBadge
            page="forecasting-analysis"
            entity={filters.entity || 'all'}
            year={filters.year}
          />

          {/* Annotation Panel */}
          <AnnotationPanel
            pageKey="forecasting-analysis"
            period={`${filters.year}:${filters.entity || 'all'}`}
          />
        </>
      )}
    </div>
  );
}
