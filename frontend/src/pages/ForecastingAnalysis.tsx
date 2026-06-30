import { useState, useEffect } from 'react';
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
  { name: 'Base Case',  revenue: 145800000, ebitda: -54400000, netIncome: -61200000, probability: '100%', color: 'blue' },
  { name: 'Best Case',  revenue: 158200000, ebitda: -48900000, netIncome: -55100000, probability: '109%', color: 'green' },  // 158.2/145.8 * 100
  { name: 'Worst Case', revenue: 132400000, ebitda: -62100000, netIncome: -69800000, probability: '91%',  color: 'red' },   // 132.4/145.8 * 100
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
// Dummy account-wise forecast data generator (100 rows)
// Matches pattern: "<Account Type> <N>" with actual blank, forecast populated
// ---------------------------------------------------------------------------
const forecastTableFallback: FinancialRow[] = [
  { id: "acct-0", label: "Insurance Expense 164", actual: 644660, budget: undefined, forecast: 615878, variance: 28782, variancePercent: 4.7, forecastVariance: 28782, forecastVariancePercent: 4.7 },
  { id: "acct-1", label: "Rent Expense 141", actual: -433921, budget: undefined, forecast: -568206, variance: 134285, variancePercent: 23.6, forecastVariance: 134285, forecastVariancePercent: 23.6 },
  { id: "acct-3", label: "Current Year Profit 167", actual: -56259, budget: undefined, forecast: 0, variance: -56259, variancePercent: 0, forecastVariance: -56259, forecastVariancePercent: 0 },
  { id: "acct-4", label: "Marketing Expense 135", actual: 77467, budget: undefined, forecast: 0, variance: 77467, variancePercent: 0, forecastVariance: 77467, forecastVariancePercent: 0 },
  { id: "acct-5", label: "License Revenue 147", actual: -7404, budget: undefined, forecast: 0, variance: -7404, variancePercent: 0, forecastVariance: -7404, forecastVariancePercent: 0 },
  { id: "acct-7", label: "Consulting Revenue 57", actual: -94475, budget: undefined, forecast: 0, variance: -94475, variancePercent: 0, forecastVariance: -94475, forecastVariancePercent: 0 },
  { id: "acct-8", label: "Current Year Profit 189", actual: -128265, budget: undefined, forecast: 0, variance: -128265, variancePercent: 0, forecastVariance: -128265, forecastVariancePercent: 0 },
  { id: "acct-9", label: "Rent Expense 84", actual: -802835, budget: undefined, forecast: -699208, variance: -103627, variancePercent: -14.8, forecastVariance: -103627, forecastVariancePercent: -14.8 },
  { id: "acct-10", label: "Interest Income 123", actual: 19065, budget: undefined, forecast: 0, variance: 19065, variancePercent: 0, forecastVariance: 19065, forecastVariancePercent: 0 },
  { id: "acct-11", label: "Consulting Revenue 114", actual: -843138, budget: undefined, forecast: -785916, variance: -57222, variancePercent: -7.3, forecastVariance: -57222, forecastVariancePercent: -7.3 },
  { id: "acct-12", label: "Current Year Profit 115", actual: -144716, budget: undefined, forecast: 0, variance: -144716, variancePercent: 0, forecastVariance: -144716, forecastVariancePercent: 0 },
  { id: "acct-16", label: "Marketing Expense 153", actual: 7636, budget: undefined, forecast: 0, variance: 7636, variancePercent: 0, forecastVariance: 7636, forecastVariancePercent: 0 },
  { id: "acct-19", label: "Subscription Revenue 167", actual: 92609, budget: undefined, forecast: 0, variance: 92609, variancePercent: 0, forecastVariance: 92609, forecastVariancePercent: 0 },
  { id: "acct-20", label: "Insurance Expense 115", actual: 17693, budget: undefined, forecast: 0, variance: 17693, variancePercent: 0, forecastVariance: 17693, forecastVariancePercent: 0 },
  { id: "acct-26", label: "Service Revenue 43", actual: -652348, budget: undefined, forecast: -698059, variance: 45711, variancePercent: 6.5, forecastVariance: 45711, forecastVariancePercent: 6.5 },
  { id: "acct-30", label: "Retained Earnings 90", actual: 97173, budget: undefined, forecast: 0, variance: 97173, variancePercent: 0, forecastVariance: 97173, forecastVariancePercent: 0 },
  { id: "acct-31", label: "License Revenue 43", actual: 703027, budget: undefined, forecast: 757990, variance: -54963, variancePercent: -7.3, forecastVariance: -54963, forecastVariancePercent: -7.3 },
  { id: "acct-33", label: "Rent Expense 33", actual: -235743, budget: undefined, forecast: -265195, variance: 29452, variancePercent: 11.1, forecastVariance: 29452, forecastVariancePercent: 11.1 },
  { id: "acct-34", label: "Office Supplies Expense 43", actual: -54801, budget: undefined, forecast: 0, variance: -54801, variancePercent: 0, forecastVariance: -54801, forecastVariancePercent: 0 },
  { id: "acct-37", label: "Interest Income 77", actual: -586743, budget: undefined, forecast: -609757, variance: 23014, variancePercent: 3.8, forecastVariance: 23014, forecastVariancePercent: 3.8 },
  { id: "acct-38", label: "Travel Expense 130", actual: -385806, budget: undefined, forecast: -258999, variance: -126807, variancePercent: -49, forecastVariance: -126807, forecastVariancePercent: -49 },
  { id: "acct-40", label: "Subscription Revenue 123", actual: -50435, budget: undefined, forecast: 0, variance: -50435, variancePercent: 0, forecastVariance: -50435, forecastVariancePercent: 0 },
  { id: "acct-42", label: "Insurance Expense 155", actual: -906535, budget: undefined, forecast: -763278, variance: -143257, variancePercent: -18.8, forecastVariance: -143257, forecastVariancePercent: -18.8 },  
 
   { id: "acct-46", label: "Insurance Expense 152", actual: -58789, budget: undefined, forecast: 0, variance: -58789, variancePercent: 0, forecastVariance: -58789, forecastVariancePercent: 0 },
  { id: "acct-47", label: "Subscription Revenue 88", actual: -4153, budget: undefined, forecast: 0, variance: -4153, variancePercent: 0, forecastVariance: -4153, forecastVariancePercent: 0 },
  { id: "acct-48", label: "Interest Income 12", actual: 114295, budget: undefined, forecast: 0, variance: 114295, variancePercent: 0, forecastVariance: 114295, forecastVariancePercent: 0 },
  { id: "acct-49", label: "Travel Expense 103", actual: -102519, budget: undefined, forecast: 0, variance: -102519, variancePercent: 0, forecastVariance: -102519, forecastVariancePercent: 0 },
  { id: "acct-50", label: "Retained Earnings 66", actual: -64781, budget: undefined, forecast: 0, variance: -64781, variancePercent: 0, forecastVariance: -64781, forecastVariancePercent: 0 },
  { id: "acct-51", label: "Retained Earnings 20", actual: 139546, budget: undefined, forecast: 0, variance: 139546, variancePercent: 0, forecastVariance: 139546, forecastVariancePercent: 0 },
  { id: "acct-52", label: "Subscription Revenue 120", actual: 665571, budget: undefined, forecast: 641355, variance: 24216, variancePercent: 3.8, forecastVariance: 24216, forecastVariancePercent: 3.8 },
  { id: "acct-54", label: "Travel Expense 104", actual: -12023, budget: undefined, forecast: 80041, variance: -92064, variancePercent: -115, forecastVariance: -92064, forecastVariancePercent: -115 },
  { id: "acct-55", label: "License Revenue 55", actual: -682872, budget: undefined, forecast: -659119, variance: -23753, variancePercent: -3.6, forecastVariance: -23753, forecastVariancePercent: -3.6 },
  { id: "acct-56", label: "Retained Earnings 192", actual: -437335, budget: undefined, forecast: -583669, variance: 146334, variancePercent: 25.1, forecastVariance: 146334, forecastVariancePercent: 25.1 },
  { id: "acct-57", label: "Deferred Revenue 107", actual: -131052, budget: undefined, forecast: 0, variance: -131052, variancePercent: 0, forecastVariance: -131052, forecastVariancePercent: 0 },
 
  { id: "acct-61", label: "Subscription Revenue 125", actual: 924240, budget: undefined, forecast: 798333, variance: 125907, variancePercent: 15.8, forecastVariance: 125907, forecastVariancePercent: 15.8 },
  { id: "acct-63", label: "Office Supplies Expense 118", actual: -98665, budget: undefined, forecast: 0, variance: -98665, variancePercent: 0, forecastVariance: -98665, forecastVariancePercent: 0 },
  { id: "acct-67", label: "Travel Expense 75", actual: -219482, budget: undefined, forecast: -289177, variance: 69695, variancePercent: 24.1, forecastVariance: 69695, forecastVariancePercent: 24.1 },
  { id: "acct-68", label: "Marketing Expense 67", actual: -343211, budget: undefined, forecast: -408995, variance: 65784, variancePercent: 16.1, forecastVariance: 65784, forecastVariancePercent: 16.1 },
  { id: "acct-69", label: "Travel Expense 67", actual: 74433, budget: undefined, forecast: 0, variance: 74433, variancePercent: 0, forecastVariance: 74433, forecastVariancePercent: 0 },
  { id: "acct-70", label: "Service Revenue 165", actual: -67922, budget: undefined, forecast: 0, variance: -67922, variancePercent: 0, forecastVariance: -67922, forecastVariancePercent: 0 },
  { id: "acct-71", label: "Insurance Expense 162", actual: -82576, budget: undefined, forecast: 0, variance: -82576, variancePercent: 0, forecastVariance: -82576, forecastVariancePercent: 0 },
  { id: "acct-73", label: "Utility Expense 112", actual: -164229, budget: undefined, forecast: -161883, variance: -2346, variancePercent: -1.4, forecastVariance: -2346, forecastVariancePercent: -1.4 },
  { id: "acct-75", label: "Service Revenue 30", actual: -717570, budget: undefined, forecast: -634266, variance: -83304, variancePercent: -13.1, forecastVariance: -83304, forecastVariancePercent: -13.1 },
  { id: "acct-76", label: "Rent Expense 99", actual: -108374, budget: undefined, forecast: 0, variance: -108374, variancePercent: 0, forecastVariance: -108374, forecastVariancePercent: 0 },
  { id: "acct-77", label: "Consulting Revenue 87", actual: -146485, budget: undefined, forecast: 0, variance: -146485, variancePercent: 0, forecastVariance: -146485, forecastVariancePercent: 0 },
  { id: "acct-78", label: "Salary Expense 51", actual: 266840, budget: undefined, forecast: 321403, variance: -54563, variancePercent: -17, forecastVariance: -54563, forecastVariancePercent: -17 },
  { id: "acct-80", label: "Office Supplies Expense 179", actual: -100192, budget: undefined, forecast: -231646, variance: 131454, variancePercent: 56.7, forecastVariance: 131454, forecastVariancePercent: 56.7 },
  { id: "acct-81", label: "Travel Expense 12", actual: 138174, budget: undefined, forecast: 0, variance: 138174, variancePercent: 0, forecastVariance: 138174, forecastVariancePercent: 0 },
  { id: "acct-84", label: "License Revenue 145", actual: 96131, budget: undefined, forecast: 172503, variance: -76372, variancePercent: -44.3, forecastVariance: -76372, forecastVariancePercent: -44.3 },
  { id: "acct-85", label: "Insurance Expense 9", actual: -562986, budget: undefined, forecast: -445820, variance: -117166, variancePercent: -26.3, forecastVariance: -117166, forecastVariancePercent: -26.3 },
  { id: "acct-86", label: "Salary Expense 31", actual: -590547, budget: undefined, forecast: -602881, variance: 12334, variancePercent: 2, forecastVariance: 12334, forecastVariancePercent: 2 },
  { id: "acct-87", label: "Subscription Revenue 84", actual: 333900, budget: undefined, forecast: 433810, variance: -99910, variancePercent: -23, forecastVariance: -99910, forecastVariancePercent: -23 },
  { id: "acct-88", label: "Salary Expense 78", actual: -82928, budget: undefined, forecast: 0, variance: -82928, variancePercent: 0, forecastVariance: -82928, forecastVariancePercent: 0 },
  { id: "acct-90", label: "License Revenue 44", actual: -753713, budget: undefined, forecast: -779873, variance: 26160, variancePercent: 3.4, forecastVariance: 26160, forecastVariancePercent: 3.4 },
  { id: "acct-91", label: "Consulting Revenue 57", actual: 122995, budget: undefined, forecast: 219650, variance: -96655, variancePercent: -44, forecastVariance: -96655, forecastVariancePercent: -44 },
  { id: "acct-92", label: "Subscription Revenue 16", actual: -103768, budget: undefined, forecast: -148110, variance: 44342, variancePercent: 29.9, forecastVariance: 44342, forecastVariancePercent: 29.9 },
  { id: "acct-94", label: "Salary Expense 16", actual: -135382, budget: undefined, forecast: 0, variance: -135382, variancePercent: 0, forecastVariance: -135382, forecastVariancePercent: 0 },
  { id: "acct-95", label: "License Revenue 99", actual: 100041, budget: undefined, forecast: 0, variance: 100041, variancePercent: 0, forecastVariance: 100041, forecastVariancePercent: 0 },
  { id: "acct-96", label: "Retained Earnings 59", actual: 253924, budget: undefined, forecast: 362346, variance: -108422, variancePercent: -29.9, forecastVariance: -108422, forecastVariancePercent: -29.9 },
  { id: "acct-97", label: "Travel Expense 101", actual: -513633, budget: undefined, forecast: -566115, variance: 52482, variancePercent: 9.3, forecastVariance: 52482, forecastVariancePercent: 9.3 },
  { id: "acct-98", label: "Office Supplies Expense 137", actual: 215703, budget: undefined, forecast: 322764, variance: -107061, variancePercent: -33.2, forecastVariance: -107061, forecastVariancePercent: -33.2 }
];
// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ForecastingAnalysis() {
  // Filters: Year and Entity only — Scenario removed (consistent with other pages)
  const [filters, setFilters] = useState<Record<string, string>>({
    year: '2024',
    entity: 'all',
  });

  const [scenarios, setScenarios]               = useState<any[]>(scenariosFallback);
 const [forecastTableData, setForecastTableData] = useState<FinancialRow[]>(forecastTableFallback);
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
  // Load scenario summary, forecast table, and monthly trend.
  // Uses a `cancelled` closure flag — no race condition from rapid filter
  // changes. Previous data stays visible while the new fetch is in flight.
  // -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params: { year: number; entity?: string } = { year: parseInt(filters.year) };
    if (filters.entity !== 'all') params.entity = filters.entity;

    (async () => {
      try {
        const [scenarioRes, tableRes, trendRes] = await Promise.allSettled([
          getScenarioSummary(params),
          getForecastTable(params),
          getForecastMonthlyTrend(params),
        ]);

        if (cancelled) return;

        // Scenarios
        if (scenarioRes.status === 'fulfilled') {
          const scenarioData = scenarioRes.value.data.data;
          if (scenarioData?.scenarios?.length > 0) {
            const mapped = scenarioData.scenarios.map((s: any) => ({
              name:        s.scenario_name, 
              revenue:     s.revenue,
              ebitda:      s.ebitda ?? s.net_income * 1.1,
              netIncome:   s.net_income,
              probability: s.probability != null ? `${(s.probability * 100).toFixed(0)}%` : '100%',
              color:       s.color || 'blue',
            }));
            const order: Record<string, number> = { 'Base Case': 2, 'Best Case': 1, 'Worst Case': 3 };
            mapped.sort((a: any, b: any) => (order[a.name] || 99) - (order[b.name] || 99));
            setScenarios(mapped);
          } else {
            setScenarios(scenariosFallback);
          }
        }

        // Forecast table
        // if (tableRes.status === 'fulfilled') {
        //   setForecastTableData(tableRes.value.data.data || []);
        // } else {
        //   console.error('Forecast table failed:', tableRes.reason);
        // }

        // Monthly trend
        if (trendRes.status === 'fulfilled') {
          const trend: any[] = trendRes.value.data.data || [];
          if (trend.length > 0) setForecastTrendData(trend);
        } else {
          console.error('Monthly trend failed:', trendRes.reason);
        }

        if (
          scenarioRes.status === 'rejected' &&
          tableRes.status    === 'rejected' &&
          trendRes.status    === 'rejected'
        ) {
          setError('Could not reach the backend. Showing sample data.');
        }

      } catch (err: any) {
        if (cancelled) return;
        console.error('Unexpected error loading forecast data:', err);
        setError(err.message || 'Failed to load forecasting data');
        setScenarios(scenariosFallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

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
      id: 'entity',
      label: 'Entity',
      options: entityOptions ?? [],
    },
  ];
   

const formatChartCurrency = (value: number | undefined) => {
  if (value === undefined || value === null) return '-';

  const abs = Math.abs(value);

  let formatted: string;

  if (abs >= 1_000_000_000) {
    formatted = `${(abs / 1_000_000_000).toFixed(1)}B`;
  } else if (abs >= 1_000_000) {
    formatted = `${(abs / 1_000_000).toFixed(1)}M`;
  } else if (abs >= 1_000) {
    formatted = `${(abs / 1_000).toFixed(1)}K`;
  } else {
    formatted = abs.toFixed(0);
  }

  return value < 0 ? `(${formatted})` : formatted;
};

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
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{formatChartCurrency(scenario.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">EBITDA</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{formatChartCurrency(scenario.ebitda)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Net Income</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{formatChartCurrency(scenario.netIncome)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            {/* Monthly Budget vs Forecast Trend */}
            {/* <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Monthly Budget vs Forecast Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={forecastTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis tickFormatter={(v) => formatChartCurrency(Number(v))} stroke="#6b7280" />
                  <Tooltip formatter={(value) => (value ? formatChartCurrency(Number(value)) : '')} />
                  <Legend />
                  <Line type="monotone" dataKey="budget" name="Budget" stroke="#10b981" strokeWidth={2}>
                    <LabelList
                      dataKey="budget"
                      position="top"
                      offset={-25}
                      angle={-45}
                      formatter={(v) => (v != null ? formatChartCurrency(Number(v)) : '')}
                      style={{ fontSize: 14, fill: '#10b981' }}
                    />
                  </Line>
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5">
                    <LabelList
                      dataKey="forecast"
                      position="bottom"
                      offset={25}
                      angle={45}
                      formatter={(v) => (v != null ? formatChartCurrency(Number(v)) : '')}
                      style={{ fontSize: 14, fill: '#f59e0b' }}
                    />
                  </Line>
                  <Line type="monotone" dataKey="variance" name="Variance" stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2">
                    <LabelList
                      dataKey="variance"
                      position="top"
                      offset={25}
                      angle={45}
                      formatter={(v) => (v != null ? formatChartCurrency(Number(v)) : '')}
                      style={{ fontSize: 14, fill: '#ef4444' }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div> */}

            {/* Scenario Comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Scenario Comparison
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scenarioComparisonData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="scenario" stroke="#6b7280" />
                  <YAxis tickFormatter={(v) => formatChartCurrency(v)} stroke="#6b7280" />
                  <Tooltip formatter={(value) => (value ? formatCurrency(Number(value)) : '')} />
                  <Legend />
                 
                 <Bar dataKey="Net Income" name="Net Income" fill="#f59e0b">
                  <LabelList
                    dataKey="Net Income"
                    position="bottom"
                    formatter={(v: any) => formatChartCurrency(v)}
                    style={{ fontSize: 12, fontWeight: 500, fill: '#f59e0b' }}
                  />
                </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Forecast Table */}
          {forecastTableData.length > 0 && (
            <FinancialTable
              data={forecastTableData}
              title="Forecast Analysis Table"
              showExport={true}
              onExport={handleExportForecastTable}
              showBudget={false}
            />
          )}

        

          <AnnotationPanel
            pageKey="forecasting-analysis"
            period={`${filters.year}:${filters.entity !== 'all' ? filters.entity : 'all'}`}
          />
        </>
      )}
    </div>
  );
}
