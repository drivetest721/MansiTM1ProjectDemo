import { useState, useEffect } from 'react';
import type { FinancialRow } from '../components/FinancialTable';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import { DollarSign, TrendingUp, CheckCircle, Building2, FileText } from 'lucide-react';
import {
  getBudget,
  getBudgetByAccount,
  getBudgetByDepartment,
  getBudgetByEntity,
  getBudgetDrillDown,
} from '../services/api';
import { exportFinancialTableToExcel } from '../utils/exportToExcel';
import AnnotationPanel from '../components/AnnotationPanel';
import WorkflowStatusBadge from '../components/WorkflowStatusBadge';
import GaugeChart from '../components/GaugeChart';
import NetProfitChart, { type NetProfitRow } from '../components/NetProfitChart';
import { THEME_COLORS, formatCurrency2dp, formatPercent2dp } from '../theme/colors';

// CONFIRM THIS against your Account dimension. Change if your model uses
// "Net Income" / "Net Earnings" / etc. instead of "Net Profit".
const NET_PROFIT_ACCOUNT_NAME = 'Net Profit';

type AccountCategory = 'revenue' | 'cogs' | 'opex' | 'other';

function classifyAccount(row: { account?: string; account_type?: string }): AccountCategory {
  // Prefer account_type if your data populates it cleanly — it's more reliable
  // than guessing off the free-text account name.
  const typeStr = (row.account_type || '').toLowerCase();
  const nameStr = (row.account || '').toLowerCase();
  const n = typeStr || nameStr;

  if (n.includes('revenue') || n.includes('income') || n.includes('sales')) return 'revenue';
  if (n.includes('cogs') || n.includes('cost of goods') || n.includes('cost of sales')) return 'cogs';
  if (n.includes('operating expense') || n.includes('opex') || n.includes('expense')) return 'opex';
  return 'other';
}

function sumByCategory(rows: any[]) {
  const totals = { revenue: 0, cogs: 0, opex: 0 };
  (rows || []).forEach((r: any) => {
    const cat = classifyAccount(r);
    if (cat === 'revenue') totals.revenue += r.amount || 0;
    else if (cat === 'cogs') totals.cogs += r.amount || 0;
    else if (cat === 'opex') totals.opex += r.amount || 0;
  });
  return totals;
}

// Fully paginates the raw /api/budget-forecast/budget endpoint for a given
// filter set, since the backend caps page_size at 1000.
async function fetchAllBudgetRows(params: Record<string, any>): Promise<any[]> {
  let page = 1;
  let allRows: any[] = [];
  while (true) {
    const response = await getBudget({ ...params, page, page_size: 1000 });
    allRows = allRows.concat(response.data.data);
    if (!response.data.pagination.has_next) break;
    page += 1;
    if (page > 50) {
      console.warn('fetchAllBudgetRows: stopped after 50 pages, possible runaway pagination');
      break;
    }
  }
  return allRows;
}

// Fetches Net Profit rows for a given group dimension (department/entity) and
// version, then sums amount per group key. Uses the raw /budget endpoint
// because /by-department and /by-entity don't accept an `account` filter.
async function fetchNetProfitGrouped(
  groupKey: 'department' | 'entity',
  version: 'Actual' | 'Budget',
  filters: { year?: number; entity?: string; department?: string; scenario?: string }
): Promise<Record<string, number>> {
  const params: Record<string, any> = {
    account: NET_PROFIT_ACCOUNT_NAME,
    version,
  };
  if (filters.year) params.year = filters.year;
  if (filters.entity) params.entity = filters.entity;
  if (filters.department) params.department = filters.department;
  if (filters.scenario) params.scenario = filters.scenario;

  const rows = await fetchAllBudgetRows(params);

  const totals: Record<string, number> = {};
  rows.forEach((row) => {
    const key = row[groupKey];
    if (!key) return;
    totals[key] = (totals[key] || 0) + (row.amount || 0);
  });
  return totals;
}

function mergeGroupedTotals(actual: Record<string, number>, budget: Record<string, number>): NetProfitRow[] {
  const keys = new Set([...Object.keys(actual), ...Object.keys(budget)]);
  return Array.from(keys).map((name) => {
    const a = actual[name] || 0;
    const b = budget[name] || 0;
    const variance = a - b;
    const variancePercent = b !== 0 ? (variance / Math.abs(b)) * 100 : 0;
    return { name, actual: a, budget: b, variance, variancePercent };
  });
}

export default function CFOBudgeting() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budgetData, setBudgetData] = useState<FinancialRow[]>([]);
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [byAccount, setByAccount] = useState<any[]>([]);
  const [byDepartment, setByDepartment] = useState<any[]>([]);
  const [byEntity, setByEntity] = useState<any[]>([]);

  const [gaugeData, setGaugeData] = useState({
    revenue: { actual: 0, target: 0 },
    cogs: { actual: 0, target: 0 },
    opex: { actual: 0, target: 0 },
    profitMargin: { actual: 0, target: 0 },
  });
  const [netProfitByDept, setNetProfitByDept] = useState<NetProfitRow[]>([]);
  const [netProfitByEntity, setNetProfitByEntity] = useState<NetProfitRow[]>([]);

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
        ...Array.from({ length: 13 }, (_, i) => 2018 + i).map((y) => ({ value: String(y), label: String(y) })),
      ],
    },
    { id: 'entity', label: 'Entity', options: [] },
    { id: 'department', label: 'Department', options: [] },
    { id: 'account', label: 'Account', options: [] },
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
      const aggParams = filters.year !== 'all'
        ? { year: parseInt(filters.year), version: filters.version !== 'all' ? filters.version : undefined }
        : {};

      const npYear = filters.year !== 'all' ? parseInt(filters.year) : undefined;
      const npScenario = filters.scenario !== 'all' ? filters.scenario : undefined;
      const npEntity = filters.entity !== 'all' ? filters.entity : undefined;
      const npDepartment = filters.department !== 'all' ? filters.department : undefined;

      // ---- existing table/chart aggregations (unchanged endpoints) ----
      const [byAcct, byDept, byEnt] = await Promise.all([
        getBudgetByAccount(aggParams),
        getBudgetByDepartment(aggParams),
        getBudgetByEntity(aggParams),
      ]);

      // ---- NEW: gauge source data, filtered raw rows classified client-side ----
      // (entity/department/scenario actually apply here, unlike by-account)
      const gaugeBaseParams: Record<string, any> = {};
      if (npYear) gaugeBaseParams.year = npYear;
      if (npEntity) gaugeBaseParams.entity = npEntity;
      if (npDepartment) gaugeBaseParams.department = npDepartment;
      if (npScenario) gaugeBaseParams.scenario = npScenario;

      const [acctActualRows, acctBudgetRows] = await Promise.all([
        fetchAllBudgetRows({ ...gaugeBaseParams, version: 'Actual' }),
        fetchAllBudgetRows({ ...gaugeBaseParams, version: 'Budget' }),
      ]);

      // ---- NEW: Net Profit actual vs budget, by department / entity ----
      const [deptActual, deptBudget, entActual, entBudget] = await Promise.all([
        fetchNetProfitGrouped('department', 'Actual', { year: npYear, scenario: npScenario, entity: npEntity }),
        fetchNetProfitGrouped('department', 'Budget', { year: npYear, scenario: npScenario, entity: npEntity }),
        fetchNetProfitGrouped('entity', 'Actual', { year: npYear, scenario: npScenario, department: npDepartment }),
        fetchNetProfitGrouped('entity', 'Budget', { year: npYear, scenario: npScenario, department: npDepartment }),
      ]);

      // ---- existing table/KPI logic (unchanged) ----
      const statementMap: Record<string, any> = {};
      byAcct.data.data.forEach((acct: any) => {
        const statement = acct.dimension_value.includes('Revenue') || acct.dimension_value.includes('Income') ? 'P&L' : 'Balance Sheet';
        if (!statementMap[statement]) statementMap[statement] = { amount: 0, count: 0 };
        statementMap[statement].amount += acct.amount;
        statementMap[statement].count += 1;
      });

      const tableData: FinancialRow[] = Object.entries(statementMap).map(([statement, data]: [string, any]) => ({
        id: `stmt-${statement}`,
        label: statement,
        level: 'statement',
        expandable: true,
        budget: data.amount,
        actual: data.amount * 0.95,
        forecast: data.amount * 1.02,
        variance: data.amount * 0.07,
        variancePercent: 7,
        indent: 0,
      }));

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

      const colors = THEME_COLORS;

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

      // ---- gauge data (Revenue / COGS / OpEx / Profit %) ----
      const actualTotals = sumByCategory(acctActualRows);
      const budgetTotals = sumByCategory(acctBudgetRows);

      const netProfitActual = actualTotals.revenue - actualTotals.cogs - actualTotals.opex;
      const netProfitBudget = budgetTotals.revenue - budgetTotals.cogs - budgetTotals.opex;
      const profitMarginActual = actualTotals.revenue !== 0 ? (netProfitActual / actualTotals.revenue) * 100 : 0;
      const profitMarginBudget = budgetTotals.revenue !== 0 ? (netProfitBudget / budgetTotals.revenue) * 100 : 0;

      setGaugeData({
        revenue: { actual: actualTotals.revenue, target: budgetTotals.revenue },
        cogs: { actual: actualTotals.cogs, target: budgetTotals.cogs },
        opex: { actual: actualTotals.opex, target: budgetTotals.opex },
        profitMargin: { actual: profitMarginActual, target: profitMarginBudget },
      });

      // ---- Net Profit actual vs budget, by department / entity ----
      setNetProfitByDept(mergeGroupedTotals(deptActual, deptBudget));
      setNetProfitByEntity(mergeGroupedTotals(entActual, entBudget));
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
    setFilters({ year: 'all', entity: 'all', department: 'all', account: 'all', scenario: 'all', version: 'all' });
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
      const level = row.level || 'statement';
      const hierarchyMap: Record<string, string> = { statement: 'account_type', account_type: 'account' };
      const nextLevel = hierarchyMap[level];
      if (!nextLevel) return [];

      const params: any = { level: nextLevel, parent_value: row.label };
      if (filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.entity !== 'all') params.entity = filters.entity;
      if (filters.scenario !== 'all') params.scenario = filters.scenario;

      const response = await getBudgetDrillDown(params);

      return response.data.map((item: any) => ({
        id: `${row.id}-${item.dimension_value}`,
        label: item.dimension_value,
        level: nextLevel,
        expandable: nextLevel === 'account_type',
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
        <button onClick={loadData} className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CFO Budgeting</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Budget planning and expense management</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <span className="font-semibold">📊 Drill-Down Hierarchy:</span>
            <span className="bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Statement Type</span>
            <span>→</span>
            <span className="bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Account Type</span>
            <span>→</span>
            <span className="bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Account Name</span>
          </div>
        </div>
      </div>

      <WorkflowStatusBadge
        page="cfo-budgeting"
        entity={filters.entity !== 'all' ? filters.entity : 'all'}
        year={filters.year !== 'all' ? filters.year : 'all'}
      />

      {/* 4 gauges, above filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GaugeChart
          title="Revenue"
          actual={gaugeData.revenue.actual}
          target={gaugeData.revenue.target}
          color={THEME_COLORS[0]}
          format={formatCurrency2dp}
        />
        <GaugeChart
          title="COGS"
          actual={gaugeData.cogs.actual}
          target={gaugeData.cogs.target}
          color={THEME_COLORS[7]}
          format={formatCurrency2dp}
          lowerIsBetter
        />
        <GaugeChart
          title="Operating Expense"
          actual={gaugeData.opex.actual}
          target={gaugeData.opex.target}
          color={THEME_COLORS[4]}
          format={formatCurrency2dp}
          lowerIsBetter
        />
        <GaugeChart
          title="Profit %"
          actual={gaugeData.profitMargin.actual}
          target={gaugeData.profitMargin.target}
          color={THEME_COLORS[3]}
          format={formatPercent2dp}
        />
      </div>

      <GlobalFilters
        filters={filterOptions}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Net Profit actual vs budget, by department / entity, side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NetProfitChart title="Net Profit: Actual vs Budget by Department" data={netProfitByDept} />
        <NetProfitChart title="Net Profit: Actual vs Budget by Entity" data={netProfitByEntity} />
      </div>

      <AnnotationPanel pageKey="cfo-budgeting" period={`${filters.year}:${filters.entity}`} />

      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
        <p className="text-sm text-indigo-800 dark:text-indigo-200">
          <strong>Budget Planning:</strong> Manage and analyze budget allocations across accounts, departments, and entities.
          Use filters to drill down by time period and scenario. Export to Excel for detailed planning.
        </p>
      </div>
    </div>
  );
}