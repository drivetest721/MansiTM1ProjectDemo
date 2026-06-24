import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Users, Briefcase, Target, Package, Building2, Activity } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import FinancialTable from '../components/FinancialTable';
import type { FinancialRow } from '../components/FinancialTable';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getDashboard } from '../services/api';
import { exportFinancialTableToExcel } from '../utils/exportToExcel';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

interface KPIData {
  title: string;
  value: string;
  change: number;
  icon: any;
  iconColor: string;
}

export default function ExecutiveOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [revenueByYear, setRevenueByYear] = useState<any[]>([]);
  const [revenueByRegion, setRevenueByRegion] = useState<any[]>([]);
  const [revenueByCategory, setRevenueByCategory] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getDashboard();
      const data = response.data;

      // Map KPIs to display format with icons
      const kpiIcons = [
        { icon: DollarSign, color: 'text-blue-600' },
        { icon: TrendingUp, color: 'text-green-600' },
        { icon: Target, color: 'text-purple-600' },
        { icon: Activity, color: 'text-indigo-600' },
        { icon: Briefcase, color: 'text-orange-600' },
        { icon: Target, color: 'text-cyan-600' },
        { icon: Users, color: 'text-pink-600' },
        { icon: Users, color: 'text-teal-600' },
        { icon: Package, color: 'text-amber-600' },
        { icon: Building2, color: 'text-rose-600' },
      ];

      const formatKPIValue = (value: number, format: string): string => {
        if (value === null || value === undefined) return 'N/A';
        
        switch (format) {
          case 'currency':
            return `$${(value / 1_000_000).toFixed(1)}M`;
          case 'percent':
            return `${value.toFixed(1)}%`;
          case 'number':
            return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
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
      
      // Transform chart data from backend format to Recharts format
      const transformChartData = (chartData: any) => {
        if (!chartData || !chartData.labels || !chartData.datasets || chartData.datasets.length === 0) {
          return [];
        }
        return chartData.labels.map((label: string, index: number) => ({
          label,
          value: chartData.datasets[0].data[index]
        }));
      };
      
      // Set chart data
      setRevenueByYear(transformChartData(data.revenue_by_year));
      setRevenueByRegion(transformChartData(data.revenue_by_region));
      setRevenueByCategory(transformChartData(data.revenue_by_category));

    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Mock data for charts not yet in API
  const budgetVsForecast = [
    { month: 'Jan', budget: 11200000, forecast: 11500000, actual: 11800000 },
    { month: 'Feb', budget: 11500000, forecast: 11800000, actual: 12100000 },
    { month: 'Mar', budget: 11800000, forecast: 12200000, actual: 12400000 },
    { month: 'Apr', budget: 12000000, forecast: 12500000, actual: 12700000 },
    { month: 'May', budget: 12300000, forecast: 12800000, actual: 13000000 },
    { month: 'Jun', budget: 12500000, forecast: 13000000, actual: 11900000 },
  ];

  const summaryTableData: FinancialRow[] = [
    {
      id: 'revenue',
      label: 'Revenue',
      actual: 142500000,
      budget: 138200000,
      forecast: 145800000,
      variance: 4300000,
      variancePercent: 3.1,
    },
    {
      id: 'cost',
      label: 'Cost',
      actual: 98700000,
      budget: 95100000,
      forecast: 99200000,
      variance: 3600000,
      variancePercent: 3.8,
    },
    {
      id: 'gross-margin',
      label: 'Gross Margin',
      actual: 43800000,
      budget: 43100000,
      forecast: 46600000,
      variance: 700000,
      variancePercent: 1.6,
      isSubtotal: true,
    },
    {
      id: 'payroll',
      label: 'Payroll',
      actual: 52300000,
      budget: 49800000,
      forecast: 53100000,
      variance: 2500000,
      variancePercent: 5.0,
    },
    {
      id: 'opex',
      label: 'Operating Expenses',
      actual: 28400000,
      budget: 27200000,
      forecast: 29000000,
      variance: 1200000,
      variancePercent: 4.4,
    },
    {
      id: 'ebitda',
      label: 'EBITDA',
      actual: -36900000,
      budget: -33900000,
      forecast: -35500000,
      variance: -3000000,
      variancePercent: -8.8,
      isSubtotal: true,
    },
    {
      id: 'net-income',
      label: 'Net Income',
      actual: -42100000,
      budget: -39200000,
      forecast: -40800000,
      variance: -2900000,
      variancePercent: -7.4,
      isTotal: true,
    },
  ];

  const formatCurrency = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  const handleExportFinancialSummary = () => {
    try {
      exportFinancialTableToExcel(summaryTableData, 'Executive_Overview_Financial_Summary');
    } catch (error) {
      console.error('Export failed:', error);
    }
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
        <button
          onClick={loadDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.slice(0, 5).map((kpi, index) => (
          <MetricCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            icon={kpi.icon}
            iconColor={kpi.iconColor}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.slice(5).map((kpi, index) => (
          <MetricCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            icon={kpi.icon}
            iconColor={kpi.iconColor}
          />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Year */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Year</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByYear}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="label" stroke="#6b7280" />
              <YAxis tickFormatter={formatCurrency} stroke="#6b7280" />
              <Tooltip formatter={(value) => value ? formatCurrency(Number(value)) : ''} />
              <Legend />
              <Bar dataKey="value" name="Revenue" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Region */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Region</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueByRegion}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const name = props.label || props.name;
                  const percent = props.percent;
                  return percent ? `${name} ${(percent * 100).toFixed(0)}%` : '';
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                nameKey="label"
              >
                {revenueByRegion.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value ? formatCurrency(Number(value)) : ''} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Forecast Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget vs Forecast vs Actual (Coming Soon)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={budgetVsForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis tickFormatter={formatCurrency} stroke="#6b7280" />
              <Tooltip formatter={(value) => value ? formatCurrency(Number(value)) : ''} />
              <Legend />
              <Line type="monotone" dataKey="budget" name="Budget" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Product Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" tickFormatter={formatCurrency} stroke="#6b7280" />
              <YAxis type="category" dataKey="label" stroke="#6b7280" />
              <Tooltip formatter={(value) => value ? formatCurrency(Number(value)) : ''} />
              <Bar dataKey="value" name="Revenue">
                {revenueByCategory.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Summary Table */}
      <FinancialTable
        data={summaryTableData}
        title="Financial Summary by Business Area (Sample Data)"
        showExport={true}
        onExport={handleExportFinancialSummary}
      />

      {/* Status Footer */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Status:</strong> Dashboard data loaded from TM1EnterpriseDB. 
          Last updated: {new Date().toLocaleDateString()}. 
          {kpiData.length > 0 && ` Showing ${kpiData.length} KPIs and ${revenueByYear.length} years of revenue data.`}
        </p>
      </div>
    </div>
  );
}
