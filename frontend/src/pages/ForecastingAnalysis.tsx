import { useState, useEffect } from 'react';
import FinancialTable from '../components/FinancialTable';
import type { FinancialRow } from '../components/FinancialTable';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { getScenarioSummary, getForecastTable, getEntities } from '../services/api';

// Scenario cards data (fallback)
const scenariosFallback = [
  {
    name: 'Most Likely Case',
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

// Forecast table data
const forecastTableData: FinancialRow[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    actual: 142500000,
    budget: 138200000,
    forecast: 145800000,
    variance: 7600000,
    variancePercent: 5.5,
  },
  {
    id: 'cost',
    label: 'Cost',
    actual: 98700000,
    budget: 95100000,
    forecast: 99200000,
    variance: 4100000,
    variancePercent: 4.3,
  },
  {
    id: 'payroll',
    label: 'Payroll',
    actual: 52300000,
    budget: 49800000,
    forecast: 53100000,
    variance: 3300000,
    variancePercent: 6.6,
  },
  {
    id: 'opex',
    label: 'Operating Expenses',
    actual: 28400000,
    budget: 27200000,
    forecast: 29000000,
    variance: 1800000,
    variancePercent: 6.6,
  },
  {
    id: 'ebitda',
    label: 'EBITDA',
    actual: -36900000,
    budget: -33900000,
    forecast: -35500000,
    variance: -1600000,
    variancePercent: -4.7,
    isSubtotal: true,
  },
  {
    id: 'net-income',
    label: 'Net Income',
    actual: -42100000,
    budget: -39200000,
    forecast: -40800000,
    variance: -1600000,
    variancePercent: -4.1,
    isTotal: true,
  },
];

// Forecast trend by month
const forecastTrendData = [
  { month: 'Jan', actual: 11800000, budget: 11200000, forecast: 11500000 },
  { month: 'Feb', actual: 12100000, budget: 11500000, forecast: 11800000 },
  { month: 'Mar', actual: 12400000, budget: 11800000, forecast: 12200000 },
  { month: 'Apr', actual: 12700000, budget: 12000000, forecast: 12500000 },
  { month: 'May', actual: 13000000, budget: 12300000, forecast: 12800000 },
  { month: 'Jun', actual: 11900000, budget: 12500000, forecast: 13000000 },
  { month: 'Jul', actual: null, budget: 12800000, forecast: 13200000 },
  { month: 'Aug', actual: null, budget: 13000000, forecast: 13500000 },
  { month: 'Sep', actual: null, budget: 13200000, forecast: 13700000 },
  { month: 'Oct', actual: null, budget: 13500000, forecast: 14000000 },
  { month: 'Nov', actual: null, budget: 13700000, forecast: 14200000 },
  { month: 'Dec', actual: null, budget: 14000000, forecast: 14500000 },
];

// Scenario comparison data
const scenarioComparisonData = [
  { metric: 'Revenue', base: 145800000, best: 158200000, worst: 132400000 },
  { metric: 'EBITDA', base: -54400000, best: -48900000, worst: -62100000 },
  { metric: 'Net Income', base: -61200000, best: -55100000, worst: -69800000 },
];

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
    id: 'entity',
    label: 'Entity',
    options: [
      { value: 'global', label: 'Global' },
      { value: 'usa', label: 'RiverEdge USA' },
    ],
  },
  {
    id: 'scenario',
    label: 'Scenario',
    options: [
      { value: 'base', label: 'Most Likely Case' },
      { value: 'best', label: 'Best Case' },
      { value: 'worst', label: 'Worst Case' },
    ],
  },
];

export default function ForecastingAnalysis() {
  const [filters, setFilters] = useState<Record<string, string>>({
    year: '2024',
    entity: '',
    scenario: 'base',
  });

  const [scenarios, setScenarios] = useState<any[]>(scenariosFallback);
  const [forecastTableData, setForecastTableData] = useState<FinancialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityOptions, setEntityOptions] = useState<FilterOption['options']>([
    { value: '', label: 'All Entities' }
  ]);

  // Fetch entities for filter dropdown
  useEffect(() => {
    const loadEntities = async () => {
      try {
        const response = await getEntities();
        const entities = response.data.data || [];
        setEntityOptions([
          { value: '', label: 'All Entities' },
          ...entities.map((e: any) => ({
            value: e.EntityName,
            label: e.EntityName
          }))
        ]);
      } catch (err) {
        console.error('Failed to load entities:', err);
      }
    };
    loadEntities();
  }, []);

  // Fetch scenario summary and forecast table data
  useEffect(() => {
    const loadForecastData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = {
          year: parseInt(filters.year),
          entity: filters.entity || undefined
        };
        
        // Load scenario summary
        const scenarioResponse = await getScenarioSummary(params);
        const scenarioData = scenarioResponse.data.data;
        
        if (scenarioData && scenarioData.scenarios && scenarioData.scenarios.length > 0) {
          // Map backend data to frontend format while keeping original structure
          const mappedScenarios = scenarioData.scenarios.map((s: any) => ({
            name: s.scenario_name,
            revenue: s.revenue,
            ebitda: s.ebitda || s.net_income * 1.1, // Approximation if EBITDA not available
            netIncome: s.net_income,
            probability: s.probability ? `${(s.probability * 100).toFixed(0)}%` : '33%',
            color: s.color || 'blue'
          }));
          setScenarios(mappedScenarios);
        } else {
          // Keep original hardcoded scenarios
          setScenarios(scenariosFallback);
        }
        
        // Load forecast table
        const tableResponse = await getForecastTable(params);
        const tableData = tableResponse.data.data;
        
        if (tableData && Array.isArray(tableData)) {
          setForecastTableData(tableData);
        }
        
      } catch (err: any) {
        console.error('Failed to load forecast data:', err);
        setError(err.message || 'Failed to load forecasting data');
        // Use fallback data on error
        setScenarios(scenariosFallback);
      } finally {
        setLoading(false);
      }
    };

    loadForecastData();
  }, [filters.year, filters.entity]);

  const filterOptions: FilterOption[] = [
    {
      id: 'year',
      label: 'Year',
      options: [
        { value: '2024', label: '2024' },
        { value: '2023', label: '2023' },
        { value: '2022', label: '2022' },
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
        { value: 'base', label: 'Base Case' },
        { value: 'best', label: 'Best Case' },
        { value: 'worst', label: 'Worst Case' },
      ],
    },
  ];

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  // Build scenario comparison data from scenarios
  const scenarioComparisonData = [
    { 
      metric: 'Revenue', 
      base: scenarios.find(s => s.name === 'Base Case')?.revenue || 0,
      best: scenarios.find(s => s.name === 'Best Case')?.revenue || 0,
      worst: scenarios.find(s => s.name === 'Worst Case')?.revenue || 0
    },
    { 
      metric: 'EBITDA', 
      base: scenarios.find(s => s.name === 'Base Case')?.ebitda || 0,
      best: scenarios.find(s => s.name === 'Best Case')?.ebitda || 0,
      worst: scenarios.find(s => s.name === 'Worst Case')?.ebitda || 0
    },
    { 
      metric: 'Net Income', 
      base: scenarios.find(s => s.name === 'Base Case')?.netIncome || 0,
      best: scenarios.find(s => s.name === 'Best Case')?.netIncome || 0,
      worst: scenarios.find(s => s.name === 'Worst Case')?.netIncome || 0
    },
  ];

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
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ {error}
          </p>
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
              const colorClasses = {
                blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
              };
              
              return (
                <div
                  key={scenario.name}
                  className={`rounded-lg border-2 p-6 ${colorClasses[scenario.color as keyof typeof colorClasses]}`}
                >
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
            />
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Forecast Trend by Month */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Forecast Trend by Month</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={forecastTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis tickFormatter={(val) => formatCurrency(val)} stroke="#6b7280" />
                  <Tooltip formatter={(value) => value ? formatCurrency(Number(value)) : ''} />
                  <Legend />
                  <Line type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="budget" name="Budget" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Scenario Comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Scenario Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scenarioComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="metric" stroke="#6b7280" />
                  <YAxis tickFormatter={(val) => formatCurrency(val)} stroke="#6b7280" />
                  <Tooltip formatter={(value) => value ? formatCurrency(Number(value)) : ''} />
                  <Legend />
                  <Bar dataKey="worst" name="Worst Case" fill="#ef4444" />
                  <Bar dataKey="base" name="Base Case" fill="#3b82f6" />
                  <Bar dataKey="best" name="Best Case" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </>
       )}
    </div>
  );
}
