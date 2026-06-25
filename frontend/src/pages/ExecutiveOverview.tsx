import { useState, useEffect, useRef, useCallback } from 'react';
import { DollarSign, TrendingUp, Users, Briefcase, Target, Package, Building2, Activity, ChevronDown } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import FinancialTable from '../components/FinancialTable';
import type { FinancialRow } from '../components/FinancialTable';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboard, getRevenueDrilldown } from '../services/api';
import { exportFinancialTableToExcel } from '../utils/exportToExcel';
import { THEME_COLORS, formatCurrency2dp, formatPercent2dp } from '../theme/colors';

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

// ---- Drill hierarchy types ----
type DrillLevel = 'year' | 'quarter' | 'month';

export default function ExecutiveOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [revenueByYear, setRevenueByYear] = useState<any[]>([]);
  const [revenueByRegion, setRevenueByRegion] = useState<any[]>([]);
  const [revenueByCategory, setRevenueByCategory] = useState<any[]>([]);

  // ---- Year -> Quarter -> Month drill state for the bar chart ----
  const [drillLevel, setDrillLevel] = useState<DrillLevel>('year');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

  // Real drill-down data fetched from the backend (no more fabricated splits)
  const [quarterData, setQuarterData] = useState<any[]>([]);
  const [monthData, setMonthData] = useState<any[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);

  const [openSections, setOpenSections] = useState({ financial: true, static: true });

  const [pieSelectedSlice, setPieSelectedSlice] = useState<string | null>(null);

  // ---- Trend chart (line) hierarchical filter: year / quarter / month ----
  const [trendYear, setTrendYear] = useState<string>('all');
  const [trendQuarter, setTrendQuarter] = useState<string>('all');
  const [trendMonth, setTrendMonth] = useState<string>('all');

  const currentYear = new Date().getFullYear(); // 2026
  const last4YearsData = revenueByYear
    .filter((d) => Number(d.label) <= currentYear)
    .slice(-4);

  const transformChartData = (chartData: any) => {
    if (!chartData || !chartData.labels || !chartData.datasets || chartData.datasets.length === 0) {
      return [];
    }
    return chartData.labels.map((label: string, index: number) => ({
      label,
      value: chartData.datasets[0].data[index],
    }));
  };

  // Handles array response from drilldown API: [{ QuarterName/MonthName, Revenue }]
const transformDrillData = (data: any): { label: string; value: number }[] => {
  console.log('🔍 transformDrillData received:', data);
  
  if (!data) {
    console.warn('⚠️ transformDrillData: data is null/undefined');
    return [];
  }
  
  // Already in chart format { labels, datasets }
  if (data.labels && data.datasets) {
    console.log('✅ Data is in ChartData format, transforming...');
    const transformed = transformChartData(data);
    console.log('✅ Transformed result:', transformed);
    return transformed;
  }
  
  // Array format from backend
  if (Array.isArray(data)) {
    console.log('✅ Data is array format, mapping...');
    const transformed = data.map((item: any) => ({
      label: item.QuarterName ?? item.MonthName ?? item.quarter ?? item.month ?? item.label ?? '',
      value: Number(item.Revenue ?? item.revenue ?? item.value ?? 0),
    }));
    console.log('✅ Array transformed result:', transformed);
    return transformed;
  }
  
  console.error('❌ transformDrillData: Unknown data format:', typeof data);
  return [];
};

  const fetchingRef = useRef(false);

  const loadDashboardData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);

      const response = await getDashboard();
      const data = response.data;

      const kpiIcons = [
        { icon: DollarSign, color: 'text-blue-600' },
        { icon: TrendingUp, color: 'text-green-600' },
        { icon: Target, color: 'text-purple-600' },
        { icon: Activity, color: 'text-indigo-600' },
        
        { icon: Users, color: 'text-pink-600' },
        { icon: Package, color: 'text-amber-600' },
        { icon: Users, color: 'text-teal-600' },
        { icon: Building2, color: 'text-rose-600' },
      ];

         


      const formatKPIValue = (value: number, format: string): string => {
        if (value === null || value === undefined) return 'N/A';
        switch (format) {
          case 'currency':
            return formatCurrency2dp(value);
          case 'percent':
            return formatPercent2dp(value);
          case 'number':
            return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          default:
            return value.toLocaleString('en-US');
        }
      };

      const formattedKPIs = data.kpis.map((kpi: any, index: number) => ({
        title: kpi.title,
        value: formatKPIValue(kpi.value, kpi.format),
        change: kpi.change_percent || 0,
        icon: kpiIcons[index]?.icon || DollarSign,
        iconColor: kpiIcons[index]?.color || 'text-gray-600',
      }));

      setKpiData(formattedKPIs);

      setRevenueByYear(transformChartData(data.revenue_by_year));
      setRevenueByRegion(transformChartData(data.revenue_by_region));
      setRevenueByCategory(transformChartData(data.revenue_by_category));
      
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);
  
  useEffect(() => {
    const controller = new AbortController();
    loadDashboardData();
    return () => { controller.abort(); fetchingRef.current = false; };
  }, [loadDashboardData]);



    const currentBarData =
            drillLevel === 'year'
              ? last4YearsData
              : drillLevel === 'quarter'
              ? quarterData
              : monthData;


  // ---- Real drill-down data, fetched from backend on click ----

  const handleBarClick = async (data: any) => {
    // FIX: Recharts passes the Rectangle's props on click; the real datum is
    // nested under `.payload`. Check payload first, fall back to top-level.
    const label = data?.payload?.label ?? data?.label;
    console.log('🎯 Bar clicked:', { data, label, drillLevel });
    
    if (!label) {
      console.warn('⚠️ No label found in clicked data');
      return;
    }

    if (drillLevel === 'year') {
        const yearNum = Number(label);
        setDrillLoading(true);
        setDrillError(null);
        // ❌ REMOVE these two lines from here — don't set drill level yet
        // setSelectedYear(label);
        // setDrillLevel('quarter');
        try {
          console.log('⏳ About to call API...');  // ← add
          const res = await getRevenueDrilldown({ level: 'quarter', year: yearNum });
          console.log('✅ API returned:', res);                          // ← add
          console.log('✅ res.data:', JSON.stringify(res.data));         // ← add
          console.log('✅ res.status:', res.status);                     // ← add
          const chartData = res.data?.data ?? res.data;
          console.log('✅ chartData:', JSON.stringify(chartData));       // ← add
          const transformed = transformChartData(chartData);
          console.log('✅ transformed:', transformed);   
                if (transformed.length === 0) {
            setDrillError(`No quarterly data found for ${label}`);
          } else {
            setQuarterData(transformed);
            // ✅ Only change drill level AFTER data is ready
            setSelectedYear(label);
            setDrillLevel('quarter');
          }
        } catch (err: any) {
          console.error('Failed to load quarter drill-down:', err);
          setDrillError('Failed to load quarter data');
           console.error('❌ CAUGHT ERROR:', err);           // ← change this
          console.error('❌ Error message:', err?.message); // ← add
          console.error('❌ Error stack:', err?.stack);     // ← add
          console.error('❌ Error response:', err?.response?.data); // ← add (axios error)
          setDrillError('Failed to load quarter data');
        } finally {
          setDrillLoading(false);
        }
}
 else if (drillLevel === 'quarter') {
  setDrillLoading(true);
  setDrillError(null);
  // ❌ Don't set these yet
  // setSelectedQuarter(label);
  // setDrillLevel('month');
  try {
    const res = await getRevenueDrilldown({
      level: 'month',
      year: Number(selectedYear),
      quarter: label,
    });
    const chartData = res.data?.data ?? res.data;
    const transformed = transformChartData(chartData);
    console.log('Month transformed:', transformed);
    if (transformed.length === 0) {
      setDrillError(`No monthly data found for ${selectedYear} ${label}`);
    } else {
      setMonthData(transformed);
      // ✅ Only change drill level AFTER data is ready
      setSelectedQuarter(label);
      setDrillLevel('month');
    }
  } catch (err: any) {
    console.error('Failed to load month drill-down:', err);
    setDrillError('Failed to load month data');
  } finally {
    setDrillLoading(false);
  }
}
    // month = leaf level, no further drill
  };

  const handleBarBreadcrumb = (target: DrillLevel) => {
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

  // ---- Trend (line) chart: hierarchical Year/Quarter/Month filtering ----
  // Mock monthly data; swap with API data keyed by year/month when available
  const allMonthlyTrend = [
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

  const trendYears = Array.from(new Set(allMonthlyTrend.map((d) => d.year)));
  const trendQuarters = trendYear === 'all'
    ? []
    : Array.from(new Set(allMonthlyTrend.filter((d) => d.year === trendYear).map((d) => d.quarter)));
  const trendMonths = trendQuarter === 'all'
    ? []
    : Array.from(new Set(allMonthlyTrend.filter((d) => d.year === trendYear && d.quarter === trendQuarter).map((d) => d.month)));

  const budgetVsForecast = allMonthlyTrend.filter((d) => {
    if (trendYear !== 'all' && d.year !== trendYear) return false;
    if (trendQuarter !== 'all' && d.quarter !== trendQuarter) return false;
    if (trendMonth !== 'all' && d.month !== trendMonth) return false;
    return true;
  }).map((d) => ({ month: trendYear === 'all' ? `${d.year} ${d.month}` : d.month, budget: d.budget, forecast: d.forecast, actual: d.actual }));

  // Y-axis domain that does NOT start at zero - pads around the actual data range
  const trendDomain: [number | ((dataMin: number) => number), number | ((dataMax: number) => number)] = [
    (dataMin: number) => Math.floor(dataMin * 0.96),
    (dataMax: number) => Math.ceil(dataMax * 1.04),
  ];

  const summaryTableData: FinancialRow[] = [
    { id: 'revenue', label: 'Revenue', actual: 142500000, budget: 138200000, forecast: 145800000, variance: 4300000, variancePercent: 3.1 },
    { id: 'cost', label: 'Cost', actual: 98700000, budget: 95100000, forecast: 99200000, variance: 3600000, variancePercent: 3.8 },
    { id: 'gross-margin', label: 'Gross Margin', actual: 43800000, budget: 43100000, forecast: 46600000, variance: 700000, variancePercent: 1.6, isSubtotal: true },
    { id: 'payroll', label: 'Payroll', actual: 52300000, budget: 49800000, forecast: 53100000, variance: 2500000, variancePercent: 5.0 },
    { id: 'opex', label: 'Operating Expenses', actual: 28400000, budget: 27200000, forecast: 29000000, variance: 1200000, variancePercent: 4.4 },
    { id: 'ebitda', label: 'EBITDA', actual: -36900000, budget: -33900000, forecast: -35500000, variance: -3000000, variancePercent: -8.8, isSubtotal: true },
    { id: 'net-income', label: 'Net Income', actual: -42100000, budget: -39200000, forecast: -40800000, variance: -2900000, variancePercent: -7.4, isTotal: true },
  ];

  const handleExportFinancialSummary = () => {
    try {
      exportFinancialTableToExcel(summaryTableData, 'Executive_Overview_Financial_Summary');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const toggleSection = (section: 'financial' | 'static') => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Executive Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">CFO-level financial performance dashboard</p>
        </div>
        <div className="text-right text-sm text-gray-600 dark:text-gray-400">
          <div>Period: FY 2025</div>
          <div>Last Updated: {new Date().toLocaleDateString()}</div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button type="button" onClick={() => { console.log('clicked financial'); toggleSection('financial'); }} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <span className="font-semibold text-gray-700 dark:text-gray-200">Financial KPIs</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${openSections.financial ? 'rotate-180' : 'rotate-0'}`} />
        </button>
        <div className={openSections.financial ? 'block' : 'hidden'}>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiData.slice(0, 4).map((kpi, index) => (
              <MetricCard key={index} title={kpi.title} value={kpi.value} change={kpi.change} icon={kpi.icon} iconColor={kpi.iconColor} />
            ))}
          </div>
        </div>
      </div>

      {/* Static KPIs */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button type="button" onClick={() => toggleSection('static')} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <span className="font-semibold text-gray-700 dark:text-gray-200">Static KPIs</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${openSections.static ? 'rotate-180' : 'rotate-0'}`} />
        </button>
        <div className={openSections.static ? 'block' : 'hidden'}>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {kpiData.slice(4).map((kpi, index) => (
              <MetricCard key={index} title={kpi.title} value={kpi.value} change={kpi.change} icon={kpi.icon} iconColor={kpi.iconColor} />
            ))}
          </div>
        </div>
      </div>

      {/* Status Header */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Status:</strong> Dashboard data loaded from TM1EnterpriseDB. Last updated: {new Date().toLocaleDateString()}.
          {kpiData.length > 0 && ` Showing ${kpiData.length} KPIs and ${revenueByYear.length} years of revenue data.`}
        </p>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Year -> Quarter -> Month drill-down */}
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
            <button onClick={() => handleBarBreadcrumb('year')} className={drillLevel === 'year' ? 'font-semibold text-blue-600' : 'hover:underline text-blue-600'}>
              Year
            </button>
            {drillLevel !== 'year' && (
              <>
                <span>/</span>
                <button onClick={() => handleBarBreadcrumb('quarter')} className={drillLevel === 'quarter' ? 'font-semibold text-blue-600' : 'hover:underline text-blue-600'}>
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

          {drillLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Loading drill-down data...</span>
            </div>
          )}
          
          {drillError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-3">
              <p className="text-sm text-red-600 dark:text-red-400">{drillError}</p>
            </div>
          )}
          
          {!drillLoading && currentBarData.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-3">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">No data available for this selection</p>
            </div>
          )}

          <div className={drillLoading ? 'opacity-30 transition-opacity pointer-events-none' : 'transition-opacity'}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={currentBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="label" stroke="#6b7280" />
                <YAxis tickFormatter={formatCurrency2dp} stroke="#6b7280" />
                <Tooltip formatter={(value) => (value ? formatCurrency2dp(Number(value)) : '')} />
                <Legend />
                <Bar
                  dataKey="value"
                  name="Revenue"
                  fill={PRIMARY}
                  cursor={drillLevel !== 'month' ? 'pointer' : 'default'}
                  onClick={(data: any) => {
                    if (drillLevel !== 'month' && !drillLoading) handleBarClick(data);
                  }}
                  label={{ position: 'top', formatter: (v: any) => formatCurrency2dp(Number(v)), fontSize: 11 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {drillLevel !== 'year' && <p className="text-center text-xs text-gray-400 mt-2">Click a bar to drill down further (down to Month level)</p>}
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
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => {
                    const name = props.label || props.name;
                    const percent = props.percent;
                    return percent ? `${name} ${(percent * 100).toFixed(2)}%` : '';
                  }}
                  outerRadius={100}
                  dataKey="value"
                  nameKey="label"
                  onClick={(entry: any) => {
                    // FIX: Recharts' pie click event nests the real datum under
                    // `.payload` — `entry.label` is undefined, so the filter
                    // below never matched anything. Read `.payload.label` first.
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
        {/* Budget vs Forecast vs Actual - with hierarchical Year/Quarter/Month filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Budget vs Forecast vs Actual</h3>
            <div className="flex items-center gap-2">
              <select
                value={trendYear}
                onChange={(e) => { setTrendYear(e.target.value); setTrendQuarter('all'); setTrendMonth('all'); }}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700"
              >
                <option value="all">All Years</option>
                {trendYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                value={trendQuarter}
                onChange={(e) => { setTrendQuarter(e.target.value); setTrendMonth('all'); }}
                disabled={trendYear === 'all'}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 disabled:opacity-50"
              >
                <option value="all">All Quarters</option>
                {trendQuarters.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
              <select
                value={trendMonth}
                onChange={(e) => setTrendMonth(e.target.value)}
                disabled={trendQuarter === 'all'}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 disabled:opacity-50"
              >
                <option value="all">All Months</option>
                {trendMonths.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={budgetVsForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis domain={trendDomain} tickFormatter={formatCurrency2dp} stroke="#6b7280" />
              <Tooltip formatter={(value) => (value ? formatCurrency2dp(Number(value)) : '')} />
              <Legend />
              <Line type="monotone" dataKey="budget" name="Budget" stroke={SECONDARY} strokeWidth={2} dot={{ r: 3 }}
                label={{ position: 'top', formatter: (v: any) => formatCurrency2dp(Number(v)), fontSize: 10 }} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke={TERTIARY} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke={PRIMARY} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByCategory} layout="vertical" margin={{ left: 40, right: 40, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" tickFormatter={formatCurrency2dp} stroke="#6b7280" />
              <YAxis type="category" dataKey="label" stroke="#6b7280" width={120} tick={{ fontSize: 12 }} interval={0} />
              <Tooltip formatter={(value) => (value ? formatCurrency2dp(Number(value)) : '')} />
              <Bar dataKey="value" name="Revenue" label={{ position: 'right', formatter: (v: any) => (v !== undefined && v !== null ? formatCurrency2dp(Number(v)) : ''), fontSize: 11 }}>
                {revenueByCategory.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Summary Table */}
      <FinancialTable data={summaryTableData} title="Financial Summary by Business Area." showExport={true} onExport={handleExportFinancialSummary} />
    </div>
  );
}