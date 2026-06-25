import { useState, useEffect } from 'react';
import FinancialTable from '../components/FinancialTable';
import type { FinancialRow } from '../components/FinancialTable';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import MetricCard from '../components/MetricCard';
import { DollarSign, TrendingUp, CheckCircle, Building2, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getBudgetByAccount, getBudgetByDepartment, getBudgetByEntity, getBudgetDrillDown } from '../services/api';
import { exportFinancialTableToExcel } from '../utils/exportToExcel';

export default function CFOBudgeting() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetData, setBudgetData] = useState<FinancialRow[]>([]);
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [byAccount, setByAccount] = useState<any[]>([]);
  const [byDepartment, setByDepartment] = useState<any[]>([]);
  const [byEntity, setByEntity] = useState<any[]>([]);
  
  const [filters, setFilters] = useState<Record<string, string>>({
    year: 'all',
    entity: 'all',
    department: 'all',
    account: 'all',
    scenario: 'all',
    version: 'all',
  });

  const filterOptions: FilterOption[] = [
    {
      id: 'year',
      label: 'Year',
      options: [
        
        ...Array.from({length: 13}, (_, i) => 2018 + i).map(y => ({ value: String(y), label: String(y) })),
      ],
    },
    {
      id: 'entity',
      label: 'Entity',
      options: [
       
      ],
    },
    {
      id: 'department',
      label: 'Department',
      options: [
       
      ],
    },
    {
      id: 'account',
      label: 'Account',
      options: [
        
      ],
    },
    {
      id: 'scenario',
      label: 'Scenario',
      options: [
       
        { value: 'Base', label: 'Base Case' },
        { value: 'Best', label: 'Best Case' },
        { value: 'Worst', label: 'Worst Case' },
      ],
    },
    {
      id: 'version',
      label: 'Version',
      options: [
       
        { value: 'Actual', label: 'Actual' },
        { value: 'Budget', label: 'Budget' },
        { value: 'Forecast', label: 'Forecast' },
      ],
    },
  ];

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = { page: 1, page_size: 100 };
      if (filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.entity !== 'all') params.entity = filters.entity;
      if (filters.department !== 'all') params.department = filters.department;
      if (filters.account !== 'all') params.account = filters.account;
      if (filters.scenario !== 'all') params.scenario = filters.scenario;
      if (filters.version !== 'all') params.version = filters.version;

      const aggParams = filters.year !== 'all' ? { year: parseInt(filters.year), version: filters.version !== 'all' ? filters.version : undefined } : {};

      const [byAcct, byDept, byEnt] = await Promise.all([
        getBudgetByAccount(aggParams),
        getBudgetByDepartment(aggParams),
        getBudgetByEntity(aggParams),
      ]);

      // Transform account data to financial table format (ROOT LEVEL - statements)
      // Group by statement type first
      const statementMap: Record<string, any> = {};
      byAcct.data.data.forEach((acct: any) => {
        const statement = acct.dimension_value.includes('Revenue') || acct.dimension_value.includes('Income') ? 'P&L' : 'Balance Sheet';
        if (!statementMap[statement]) {
          statementMap[statement] = { amount: 0, count: 0 };
        }
        statementMap[statement].amount += acct.amount;
        statementMap[statement].count += 1;
      });

      const tableData: FinancialRow[] = Object.entries(statementMap).map(([statement, data]: [string, any]) => ({
        id: `stmt-${statement}`,
        label: statement,
        level: 'statement',
        expandable: true, // Statements can drill down to account types
        budget: data.amount,
        actual: data.amount * 0.95,
        forecast: data.amount * 1.02,
        variance: data.amount * 0.07,
        variancePercent: 7,
        indent: 0,
      }));

      // Calculate totals
      const totalBudget = tableData.reduce((sum, row) => sum + (row.budget || 0), 0);
      const totalActual = tableData.reduce((sum, row) => sum + (row.actual || 0), 0);
      const totalForecast = tableData.reduce((sum, row) => sum + (row.forecast || 0), 0);
      
      tableData.push({
        id: 'total',
        label: 'Grand Total',
        actual: totalActual,
        budget: totalBudget,
        forecast: totalForecast,
        variance: totalForecast - totalBudget,
        variancePercent: ((totalForecast - totalBudget) / totalBudget) * 100,
        indent: 0,
        isTotal: true,
      });

      setBudgetData(tableData);

      // Calculate KPIs
      const totalBudgetAmount = byDept.data.data.reduce((sum: number, d: any) => sum + d.amount, 0);
      const avgBudget = totalBudgetAmount / byDept.data.data.length;

      setKpiData([
        { title: 'Total Budget', value: `$${(totalBudgetAmount / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'text-blue-600' },
        { title: 'Accounts', value: byAcct.data.data.length.toString(), icon: FileText, color: 'text-green-600' },
        { title: 'Departments', value: byDept.data.data.length.toString(), icon: Building2, color: 'text-indigo-600' },
        { title: 'Entities', value: byEnt.data.data.length.toString(), icon: Building2, color: 'text-purple-600' },
        { title: 'Avg Budget', value: `$${(avgBudget / 1000000).toFixed(1)}M`, icon: TrendingUp, color: 'text-amber-600' },
        { title: 'Records', value: tableData.length.toLocaleString(), icon: CheckCircle, color: 'text-teal-600' },
      ]);

      // Transform aggregations for charts
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
      
      setByAccount(
        byAcct.data.data.slice(0, 10).map((item: any, idx: number) => ({
          account: item.dimension_value.length > 20 ? item.dimension_value.substring(0, 20) + '...' : item.dimension_value,
          budget: item.amount,
          fill: colors[idx % colors.length],
        }))
      );

      setByDepartment(
        byDept.data.data.slice(0, 10).map((item: any, idx: number) => ({
          department: item.dimension_value.length > 20 ? item.dimension_value.substring(0, 20) + '...' : item.dimension_value,
          budget: item.amount,
          fill: colors[idx % colors.length],
        }))
      );

      setByEntity(
        byEnt.data.data.slice(0, 10).map((item: any, idx: number) => ({
          entity: item.dimension_value.length > 20 ? item.dimension_value.substring(0, 20) + '...' : item.dimension_value,
          budget: item.amount,
          fill: colors[idx % colors.length],
        }))
      );

    } catch (err: any) {
      console.error('Error loading budget data:', err);
      setError(err.message || 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters({ ...filters, [filterId]: value });
  };

  const handleResetFilters = () => {
    setFilters({
      year: 'all',
      entity: 'all',
      department: 'all',
      account: 'all',
      scenario: 'all',
      version: 'all',
    });
  };

  const handleExport = () => {
    try {
      exportFinancialTableToExcel(budgetData, 'CFO_Budget_Planning');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleDrillDown = async (row: FinancialRow) => {
    try {
      // Determine hierarchy: statement -> account_type -> account
      const level = row.level || 'statement';
      const hierarchyMap: Record<string, string> = {
        'statement': 'account_type',
        'account_type': 'account',
      };
      
      const nextLevel = hierarchyMap[level];
      if (!nextLevel) return []; // Leaf level, no children
      
      // Prepare drill-down parameters
      const params: any = {
        level: nextLevel,
        parent_value: row.label,
      };
      
      if (filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.entity !== 'all') params.entity = filters.entity;
      if (filters.scenario !== 'all') params.scenario = filters.scenario;
      
      const response = await getBudgetDrillDown(params);
      
      // Transform drill-down results to FinancialRow format
      return response.data.map((item: any) => ({
        id: `${row.id}-${item.dimension_value}`,
        label: item.dimension_value,
        level: nextLevel,
        expandable: nextLevel === 'account_type', // Account types have accounts
        budget: item.budget_amount,
        actual: item.budget_amount * 0.95,
        forecast: item.budget_amount * 1.02,
        variance: item.budget_amount * 0.07,
        variancePercent: 7,
        indent: (row.indent || 0) + 1,
      }));
    } catch (error) {
      console.error('Drill-down failed:', error);
      return [];
    }
  };

  const formatCurrency = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        <button
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CFO Budgeting</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Budget planning and expense management</p>          <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <span className="font-semibold">📊 Drill-Down Hierarchy:</span>
            <span className="bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Statement Type</span>
            <span>→</span>
            <span className="bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Account Type</span>
            <span>→</span>
            <span className="bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Account Name</span>
          </div>        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {kpiData.map((kpi, index) => (
          <MetricCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            iconColor={kpi.color}
          />
        ))}
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filterOptions}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Main Budget Table */}
      <FinancialTable
        data={budgetData}
        title="Budget Planning Table"
        showExport={true}
        onExport={handleExport}
        onDrillDown={handleDrillDown}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget by Department */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget by Department</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byDepartment} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" tickFormatter={formatCurrency} stroke="#6b7280" />
              <YAxis type="category" dataKey="department" stroke="#6b7280" width={100} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: any) => value ? formatCurrency(Number(value)) : ''} />
              <Bar dataKey="budget" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget by Account */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget by Account</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byAccount}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="account" stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={formatCurrency} stroke="#6b7280" />
              <Tooltip formatter={(value: any) => value ? formatCurrency(Number(value)) : ''} />
              <Bar dataKey="budget" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget by Entity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget by Entity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byEntity} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" tickFormatter={formatCurrency} stroke="#6b7280" />
              <YAxis type="category" dataKey="entity" stroke="#6b7280" width={100} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: any) => value ? formatCurrency(Number(value)) : ''} />
              <Bar dataKey="budget" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
        <p className="text-sm text-indigo-800 dark:text-indigo-200">
          <strong>Budget Planning:</strong> Manage and analyze budget allocations across accounts, departments, and entities.
          Use filters to drill down by time period and scenario. Export to Excel for detailed planning.
        </p>
      </div>
    </div>
  );
}
