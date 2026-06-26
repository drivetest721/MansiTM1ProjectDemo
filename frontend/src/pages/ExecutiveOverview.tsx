import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { DollarSign, TrendingUp, Users, Target, Package, Building2, Activity, ChevronDown, ShoppingCart, Wallet, Percent, BriefcaseBusiness } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import FinancialTable from '../components/FinancialTable';
import type { FinancialRow } from '../components/FinancialTable';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboard } from '../services/api';
import { exportFinancialTableToExcel } from '../utils/exportToExcel';
import { THEME_COLORS, formatCurrency2dp, formatCurrency2dpGraph, formatPercent2dp } from '../theme/colors';
import AnnotationPanelRaw from '../components/AnnotationPanel';
const AnnotationPanel = memo(AnnotationPanelRaw);

const COLORS = THEME_COLORS;
const PRIMARY = THEME_COLORS[0];
const SECONDARY = THEME_COLORS[3];
const TERTIARY = THEME_COLORS[4];

interface KPIData {
  title: string;
  value: string;
  change: number;
  icon: any;
  iconColor: string;
}

type DrillLevel = 'year' | 'quarter' | 'month';

// ─── CollapsibleSection ──────────────────────────────────────────────────────
const CollapsibleSection = memo(function CollapsibleSection({
  title, children,
}: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button type="button" onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
        <span className="font-semibold text-gray-700 dark:text-gray-200">{title}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
      </button>
      <div className={isOpen ? 'block' : 'hidden'}>{children}</div>
    </div>
  );
});

// ─── BudgetVsForecastSection ─────────────────────────────────────────────────
const ALL_MONTHLY_TREND = [
  { year: '2024', quarter: 'Q1', month: 'Jan', budget: 11200000, forecast: 11500000, actual: 11800000 },
  { year: '2024', quarter: 'Q1', month: 'Feb', budget: 11500000, forecast: 11800000, actual: 12100000 },
  { year: '2024', quarter: 'Q1', month: 'Mar', budget: 11800000, forecast: 12200000, actual: 12400000 },
  { year: '2024', quarter: 'Q2', month: 'Apr', budget: 12000000, forecast: 12500000, actual: 12700000 },
  { year: '2024', quarter: 'Q2', month: 'May', budget: 12300000, forecast: 12800000, actual: 13000000 },
  { year: '2024', quarter: 'Q2', month: 'Jun', budget: 12500000, forecast: 13000000, actual: 11900000 },
  { year: '2025', quarter: 'Q1', month: 'Jan', budget: 12700000, forecast: 13100000, actual: 13300000 },
  { year: '2025', quarter: 'Q1', month: 'Feb', budget: 12900000, forecast: 13300000, actual: 13600000 },
  { year: '2025', quarter: 'Q1', month: 'Mar', budget: 13100000, forecast: 13600000, actual: 13900000 },
  { year: '2025', quarter: 'Q2', month: 'Apr', budget: 13300000, forecast: 13800000, actual: 14100000 },
  { year: '2025', quarter: 'Q2', month: 'May', budget: 13500000, forecast: 14000000, actual: 14400000 },
  { year: '2025', quarter: 'Q2', month: 'Jun', budget: 13700000, forecast: 14200000, actual: 13950000 },
];

const TREND_DOMAIN: [(v: number) => number, (v: number) => number] = [
  (dataMin: number) => Math.floor(dataMin * 0.96),
  (dataMax: number) => Math.ceil(dataMax * 1.04),
];

const BudgetVsForecastSection = memo(function BudgetVsForecastSection() {
  const [trendYear, setTrendYear] = useState('all');
  const [trendQuarter, setTrendQuarter] = useState('all');
  const [trendMonth, setTrendMonth] = useState('all');
  const trendYears = useMemo(() => Array.from(new Set(ALL_MONTHLY_TREND.map((d) => d.year))), []);
  const trendQuarters = useMemo(() =>
    trendYear === 'all' ? [] : Array.from(new Set(
      ALL_MONTHLY_TREND.filter((d) => d.year === trendYear).map((d) => d.quarter)
    )), [trendYear]);
  const trendMonths = useMemo(() =>
    trendQuarter === 'all' ? [] : Array.from(new Set(
      ALL_MONTHLY_TREND.filter((d) => d.year === trendYear && d.quarter === trendQuarter).map((d) => d.month)
    )), [trendYear, trendQuarter]);
  const chartData = useMemo(() =>
    ALL_MONTHLY_TREND.filter((d) => {
      if (trendYear !== 'all' && d.year !== trendYear) return false;
      if (trendQuarter !== 'all' && d.quarter !== trendQuarter) return false;
      if (trendMonth !== 'all' && d.month !== trendMonth) return false;
      return true;
    }).map((d) => ({
      month: trendYear === 'all' ? `${d.year} ${d.month}` : d.month,
      budget: d.budget, forecast: d.forecast, actual: d.actual,
    })),
    [trendYear, trendQuarter, trendMonth]);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget vs Forecast vs Actual</h3>
        <div className="flex items-center gap-2">
          <select value={trendYear} onChange={(e) => { setTrendYear(e.target.value); setTrendQuarter('all'); setTrendMonth('all'); }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700">
            <option value="all">All Years</option>
            {trendYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={trendQuarter} onChange={(e) => { setTrendQuarter(e.target.value); setTrendMonth('all'); }}
            disabled={trendYear === 'all'}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 disabled:opacity-50">
            <option value="all">All Quarters</option>
            {trendQuarters.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <select value={trendMonth} onChange={(e) => setTrendMonth(e.target.value)}
            disabled={trendQuarter === 'all'}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 disabled:opacity-50">
            <option value="all">All Months</option>
            {trendMonths.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 0, left: 30, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis dataKey="month" stroke="#6b7280" />
          <YAxis domain={TREND_DOMAIN} tickFormatter={formatCurrency2dpGraph} stroke="#6b7280" />
          <Tooltip formatter={(value) => (value ? formatCurrency2dpGraph(Number(value)) : '')} />
          <Legend />
          <Line type="monotone" dataKey="budget" name="Budget" stroke={SECONDARY} strokeWidth={2} dot={{ r: 3 }}
            />
          <Line type="monotone" dataKey="forecast" name="Forecast" stroke={TERTIARY} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="actual" name="Actual" stroke={PRIMARY} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

// ─── Static data ─────────────────────────────────────────────────────────────
const SUMMARY_TABLE_DATA: FinancialRow[] = [
  { 
    id: 'revenue', label: 'Revenue', 
    actual: 142500000, budget: 138200000, forecast: 145800000, 
    variance: 4300000, variancePercent: 3.1,
    forecastVariance: 142500000 - 145800000,           // -3300000
    forecastVariancePercent: ((142500000 - 145800000) / 145800000) * 100   // -2.26%
  },
  { 
    id: 'COGS', label: 'COGS', 
    actual: 98700000, budget: 95100000, forecast: 99200000, 
    variance: 3600000, variancePercent: 3.8,
    forecastVariance: 98700000 - 99200000,             // -500000
    forecastVariancePercent: ((98700000 - 99200000) / 99200000) * 100
  },
  { 
    id: 'gross-margin', label: 'Gross Margin', 
    actual: 43800000, budget: 43100000, forecast: 46600000, 
    variance: 700000, variancePercent: 1.6, isSubtotal: true,
    forecastVariance: 43800000 - 46600000,
    forecastVariancePercent: ((43800000 - 46600000) / 46600000) * 100
  },
  { 
    id: 'payroll', label: 'Payroll', 
    actual: 52300000, budget: 49800000, forecast: 53100000, 
    variance: 2500000, variancePercent: 5.0,
    forecastVariance: 52300000 - 53100000,
    forecastVariancePercent: ((52300000 - 53100000) / 53100000) * 100
  },
  { 
    id: 'opex', label: 'Operating Expenses', 
    actual: 28400000, budget: 27200000, forecast: 29000000, 
    variance: 1200000, variancePercent: 4.4,
    forecastVariance: 28400000 - 29000000,
    forecastVariancePercent: ((28400000 - 29000000) / 29000000) * 100
  },
  { 
    id: 'ebitda', label: 'EBITDA', 
    actual: -36900000, budget: -33900000, forecast: -35500000, 
    variance: -3000000, variancePercent: -8.8, isSubtotal: true,
    forecastVariance: -36900000 - (-35500000),
    forecastVariancePercent: ((-36900000 - (-35500000)) / Math.abs(-35500000)) * 100
  },
]

// ─── Helper functions (module-level, stable references) ──────────────────────
function transformChartData(chartData: any): { label: string; value: number }[] {
  if (!chartData || !chartData.labels || !chartData.datasets || chartData.datasets.length === 0) return [];
  return chartData.labels.map((label: string, index: number) => ({
    label,
    value: chartData.datasets[0].data[index],
  }));
}

function transformDrillData(data: any): { label: string; value: number }[] {
  if (!data) return [];
  if (data.labels && data.datasets) return transformChartData(data);
  if (Array.isArray(data)) return data.map((item: any) => ({
    label: item.QuarterName ?? item.MonthName ?? item.quarter ?? item.month ?? item.label ?? '',
    value: Number(item.Revenue ?? item.revenue ?? item.value ?? 0),
  }));
  return [];
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ExecutiveOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [revenueByYear, setRevenueByYear] = useState<any[]>([]);
  const [revenueByRegion, setRevenueByRegion] = useState<any[]>([]);
  const [revenueByCategory, setRevenueByCategory] = useState<any[]>([]);

  const [drillLevel, setDrillLevel] = useState<DrillLevel>('year');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [quarterData, setQuarterData] = useState<any[]>([]);
  const [monthData, setMonthData] = useState<any[]>([]);
  const [drillError, setDrillError] = useState<string | null>(null);

  const [categoryLoading] = useState(false);
  const originalCategoryDataRef = useRef<any[]>([]);
  const [pieSelectedSlice, setPieSelectedSlice] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();

  const last4YearsData = useMemo(() =>
    revenueByYear.filter((d) => Number(d.label) <= currentYear).slice(-4),
    [revenueByYear, currentYear]
  );

  const fetchingRef = useRef(false);
  const drillingRef = useRef(false);
  const drillLevelRef = useRef<DrillLevel>('year');
  const selectedYearRef = useRef<string | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  drillLevelRef.current = drillLevel;
  selectedYearRef.current = selectedYear;

  const currentBarData = useMemo(() => {
    if (drillLevel === 'year') return last4YearsData;
    if (drillLevel === 'quarter') return quarterData;
    return monthData;
  }, [drillLevel, last4YearsData, quarterData, monthData]);

  // ─── Load dashboard ─────────────────────────────────────────────────────────
  const loadDashboardData = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboard();
      const data = response.data;

      const kpiIcons = [
        { icon: DollarSign, color: 'text-blue-600' },
        { icon: ShoppingCart, color: 'text-green-600' },
        { icon: Wallet, color: 'text-purple-600' },
        { icon: Percent, color: 'text-indigo-600' },
        { icon: Users, color: 'text-pink-600' },
        { icon: Package, color: 'text-amber-600' },
        { icon: BriefcaseBusiness, color: 'text-teal-600' },
        { icon: Building2, color: 'text-rose-600' },
      ];

      const formatKPIValue = (value: number, format: string): string => {
        if (value === null || value === undefined) return 'N/A';
        switch (format) {
          case 'currency': return formatCurrency2dp(value);
          case 'percent': return formatPercent2dp(value);
          case 'number': return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
          default: return value.toLocaleString('en-US');
        }
      };

      setKpiData(data.kpis.map((kpi: any, index: number) => ({
        title: kpi.title,
        value: formatKPIValue(kpi.value, kpi.format),
        change: kpi.change_percent || 0,
        icon: kpiIcons[index]?.icon || DollarSign,
        iconColor: kpiIcons[index]?.color || 'text-gray-600',
      })));

      setRevenueByYear(transformChartData(data.revenue_by_year));
      setRevenueByRegion(transformChartData(data.revenue_by_region));
      const catData = transformChartData(data.revenue_by_category);
      setRevenueByCategory(catData);
      originalCategoryDataRef.current = catData;
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => { loadDashboardData(); }, []);

  // ─── Drill-down click handler ────────────────────────────────────────────────
  // KEY FIX: No state setters (setDrillLoading etc.) before the fetch.
  // Any setState before await causes React to re-render and cancel the fetch.
  const handleBarClick = async (data: any) => {
    const label = data?.payload?.label ?? data?.activePayload?.[0]?.payload?.label ?? data?.label;
    if (!label) return;

    const level = drillLevelRef.current;
    const year = selectedYearRef.current;

    if (level === 'month') return;
    if (drillingRef.current) return;

    const now = Date.now();
    if (now - lastClickTimeRef.current < 500) return;
    lastClickTimeRef.current = now;

    drillingRef.current = true;
    // ⚠️ Do NOT call setDrillLoading(true) here — it triggers a re-render
    // that cancels the in-flight fetch before it resolves.

    try {
      if (level === 'year') {
        const raw = await fetch(
          `http://localhost:8000/api/dashboard/revenue-drilldown?level=quarter&year=${Number(label)}`
        ).then(r => r.json());
        const transformed = transformDrillData(raw?.data ?? raw);
        if (transformed.length === 0) {
          setDrillError(`No quarterly data found for ${label}`);
        } else {
          setDrillError(null);
          setQuarterData(transformed);
          setSelectedYear(label);
          setDrillLevel('quarter');
        }
      } else if (level === 'quarter') {
        const raw = await fetch(
          `http://localhost:8000/api/dashboard/revenue-drilldown?level=month&year=${Number(year)}&quarter=${encodeURIComponent(label)}`
        ).then(r => r.json());
        const transformed = transformDrillData(raw?.data ?? raw);
        if (transformed.length === 0) {
          setDrillError(`No monthly data found for ${year} ${label}`);
        } else {
          setDrillError(null);
          setMonthData(transformed);
          setSelectedQuarter(label);
          setDrillLevel('month');
        }
      }
    } catch (err: any) {
      setDrillError('Failed to load drill-down data');
      console.error('[Drill] error:', err);
    } finally {
      drillingRef.current = false;
    }
  };

  // ─── Breadcrumb navigation ───────────────────────────────────────────────────
  const handleBarBreadcrumb = (target: DrillLevel) => {
    if (drillingRef.current) return;
    if (target === 'year') {
      setDrillLevel('year');
      setSelectedYear(null);
      setSelectedQuarter(null);
      setQuarterData([]);
      setMonthData([]);
      setDrillError(null);
    } else if (target === 'quarter') {
      setDrillLevel('quarter');
      setSelectedQuarter(null);
      setMonthData([]);
      setDrillError(null);
    }
  };

  const handleExportFinancialSummary = () => {
    try {
      exportFinancialTableToExcel(SUMMARY_TABLE_DATA, 'Executive_Overview_Financial_Summary');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // ─── Loading / error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Dashboard</h3>
        <p className="text-red-600 dark:text-red-300">{error}</p>
        <button onClick={loadDashboardData} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors">
          Retry
        </button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Executive Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">CFO-level financial performance dashboard</p>
        </div>
        
      </div>

      {/* Financial KPIs */}
      <CollapsibleSection title="Financial KPIs">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpiData.slice(0, 4).map((kpi, index) => (
            <MetricCard key={index} title={kpi.title} value={kpi.value} change={kpi.change} icon={kpi.icon} iconColor={kpi.iconColor} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Statistical KPIs */}
      <CollapsibleSection title="Statistical KPIs">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpiData.slice(4).map((kpi, index) => (
            <MetricCard key={index} title={kpi.title} value={kpi.value} change={kpi.change} icon={kpi.icon} iconColor={kpi.iconColor} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue drill-down bar chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {drillLevel === 'year' && 'Revenue by Year'}
              {drillLevel === 'quarter' && `Revenue by Quarter — ${selectedYear}`}
              {drillLevel === 'month' && `Revenue by Month — ${selectedYear} ${selectedQuarter}`}
            </h3>
          </div>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-2 text-gray-500">
            <button onClick={() => handleBarBreadcrumb('year')}
              className={drillLevel === 'year' ? 'font-semibold text-blue-600' : 'hover:underline text-blue-600'}>
              Year
            </button>
            {drillLevel !== 'year' && (
              <>
                <span>/</span>
                <button onClick={() => handleBarBreadcrumb('quarter')}
                  className={drillLevel === 'quarter' ? 'font-semibold text-blue-600' : 'hover:underline text-blue-600'}>
                  {selectedYear}
                </button>
              </>
            )}
            {drillLevel === 'month' && (
              <>
                <span>/</span>
                <span className="font-semibold">{selectedQuarter}</span>
              </>
            )}
          </div>

          {drillError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-3">
              <p className="text-sm text-red-600 dark:text-red-400">{drillError}</p>
            </div>
          )}

          {currentBarData.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-3">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">No data available for this selection</p>
            </div>
          )}

          <ResponsiveContainer
            width="100%"
            height={300}
            className="px-4"
            key={`chart-${drillLevel}-${selectedYear}-${selectedQuarter}`}
          >
            <BarChart data={currentBarData} margin={{ top: 20, right: 0, left: 30, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="label" stroke="#6b7280" />
              <YAxis tickFormatter={formatCurrency2dpGraph} stroke="#6b7280" />
              <Tooltip
                content={(props: any) => {
                  if (!props.active || !props.payload || !props.payload[0]) return null;
                  return (
                    <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3">
                      <p className="font-semibold text-gray-900 dark:text-white">{props.payload[0].payload.label}</p>
                      <p className="text-blue-600 dark:text-blue-400">Revenue: {formatCurrency2dpGraph(props.payload[0].value)}</p>
                      {drillLevel !== 'month' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">👆 Click to drill down</p>
                      )}
                    </div>
                  );
                }}
              />
              <Legend />
              <Bar
                dataKey="value"
                name="Revenue"
                fill={PRIMARY}
                isAnimationActive={false}
                cursor={drillLevel !== 'month' ? 'pointer' : 'default'}
                onClick={(data: any) => {
                  if (drillLevel !== 'month' && !drillingRef.current) {
                    handleBarClick(data);
                  }
                }}
                label={{ position: 'top', formatter: (v: any) => formatCurrency2dp(Number(v)), fontSize: 16, fontWeight: 'bold', fill: '#374151' }}
              />
            </BarChart>
          </ResponsiveContainer>

          <p className="text-center text-xs text-gray-400 mt-2">
            {drillLevel === 'year'
              ? '👆 Single-click any bar to drill down to quarters'
              : drillLevel === 'quarter'
              ? '👆 Click a bar to drill down to months'
              : '👆 Month level — use breadcrumb to go back'}
          </p>
        </div>

        {/* Revenue by Region */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue by Region</h3>
            {pieSelectedSlice && (
              <button onClick={() => setPieSelectedSlice(null)} className="text-sm text-blue-600 hover:underline">
                ← Show All
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieSelectedSlice ? revenueByRegion.filter((d) => d.label === pieSelectedSlice) : revenueByRegion}
                cx="50%" cy="50%"
                labelLine={false}
                label={(props: any) => {
                const name = props.label || props.name;
                const percent = props.percent;
                if (!percent) return null;
                return (
                  <text x={props.x} y={props.y} fill={props.fill} textAnchor={props.textAnchor} dominantBaseline="central" fontWeight="bold" fontSize={14}>
                    {`${name} ${(percent * 100).toFixed(2)}%`}
                  </text>
                );
              }}
                outerRadius={100}
                dataKey="value"
                nameKey="label"
                isAnimationActive={false}
                onClick={(entry: any) => {
                  const now = Date.now();
                  if (now - lastClickTimeRef.current < 300) return;
                  lastClickTimeRef.current = now;
                  const label = entry?.payload?.label ?? entry?.label;
                  setPieSelectedSlice(label);
                }}
              >
                {(pieSelectedSlice ? revenueByRegion.filter((d) => d.label === pieSelectedSlice) : revenueByRegion).map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} style={{ cursor: 'pointer' }} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => (value ? formatCurrency2dp(Number(value)) : '')} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetVsForecastSection />

        {/* Revenue by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Revenue by Category
                {drillLevel !== 'year' && (
                  <span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400">
                    — {drillLevel === 'month' ? `${selectedYear} ${selectedQuarter}` : selectedYear}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {drillLevel === 'year' ? 'All periods · Click a year bar ← to filter by period' : 'Synced with Revenue drill-down ←'}
              </p>
            </div>
            {categoryLoading && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-500" />
                Updating…
              </div>
            )}
          </div>
          <div style={{ opacity: categoryLoading ? 0.4 : 1, pointerEvents: categoryLoading ? 'none' : undefined }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByCategory} layout="vertical" margin={{ left: 40, right: 40, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis type="number" tickFormatter={formatCurrency2dpGraph} stroke="#6b7280" />
                <YAxis type="category" dataKey="label" stroke="#6b7280" width={120} tick={{ fontSize: 12 }} interval={0} />
                <Tooltip formatter={(value) => (value ? formatCurrency2dpGraph(Number(value)) : '')} />
                <Bar dataKey="value" name="Revenue"
                  label={{ position: 'right', formatter: (v: any) => (v !== undefined && v !== null ? formatCurrency2dpGraph(Number(v)) : ''), fontSize: 14 , fontWeight: 'bold' }}>
                  {revenueByCategory.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Financial Summary Table */}
      <FinancialTable
        data={SUMMARY_TABLE_DATA}
        title="Financial Summary by Business Area."
        showExport={true}
        onExport={handleExportFinancialSummary}
      />
      <AnnotationPanel pageKey="cfo-overview" />
    </div>
  );
}