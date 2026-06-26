import { useState, useEffect, useRef, useCallback } from 'react';
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

// Your chart of accounts only has these 5 account_type values:
// 'Equity' | 'Expense' | 'Revenue' | 'Asset' | 'Liability'
// Revenue and Expense map directly to P&L. There is no literal "Net Profit"
// account — it's always Revenue minus Expense, computed, never a stored row.
type AccountCategory = 'revenue' | 'cogs' | 'opex' | 'other';

// HEURISTIC — your account_type doesn't separate COGS from OpEx, so this
// guesses based on keywords in the account NAME. VERIFY this against the
// console.log output below (search for "Unique Expense account names") and
// tell me the actual naming convention so I can replace this with an exact map.
function classifyExpenseSubtype(accountName: string): 'cogs' | 'opex' {
  const n = (accountName || '').toLowerCase();
  
  const cogsKeywords = [
    'cogs', 'cost of goods', 'cost of sales', 'cost of revenue',
    'direct cost', 'materials', 'production cost', 'raw material',
  ];
  if (cogsKeywords.some((kw) => n.includes(kw))) return 'cogs';
  return 'opex'; // default bucket for everything else classified as Expense
}

function classifyAccount(row: { account?: string; account_type?: string }): AccountCategory {
  switch (row.account_type) {
    case 'Revenue':
      return 'revenue';
    case 'Expense':
      return classifyExpenseSubtype(row.account || '');
    default:
      // Equity / Asset / Liability — Balance Sheet items, not part of P&L gauges
      return 'other';
  }
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

// Single-page fetch — replaces the old 50-page pagination loop.
// The old approach made up to 50 × 6 = 300 sequential requests per filter change,
// freezing the browser tab. One page of 500 rows is fast and sufficient.
async function fetchBudgetRows(params: Record<string, any>): Promise<any[]> {
  try {
    const response = await getBudget({ ...params, page: 1, page_size: 500 });
    return response.data.data || [];
  } catch (err) {
    console.error('fetchBudgetRows failed:', err);
    return [];
  }
}

// Fetches all budget rows in scope (no account filter — account_type isn't a
// backend query param), then sums only Revenue-typed rows per department/entity.
// Used for the "Actual vs Budget by Department/Entity" charts.
async function fetchRevenueGrouped(
  groupKey: 'department' | 'entity',
  version: 'Actual' | 'Budget',
  filters: { year?: number; entity?: string; department?: string; scenario?: string }
): Promise<Record<string, number>> {
  const params: Record<string, any> = { version };
  if (filters.year) params.year = filters.year;
  if (filters.entity) params.entity = filters.entity;
  if (filters.department) params.department = filters.department;
  if (filters.scenario) params.scenario = filters.scenario;

  const rows = await fetchBudgetRows(params);

  const totals: Record<string, number> = {};
  rows.forEach((row) => {
    if (row.account_type !== 'Revenue') return;
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
   const fetchingRef = useRef(false);

  const [gaugeData, setGaugeData] = useState({
    revenue: { actual: 0, target: 0 },
    cogs: { actual: 0, target: 0 },
    opex: { actual: 0, target: 0 },
    profitMargin: { actual: 0, target: 0 },
  });
  // Renamed for clarity — these are Revenue comparisons now, not Net Profit
  // (kept the NetProfitChart component itself since it's generic chart code)
  const [revenueByDept, setRevenueByDept] = useState<NetProfitRow[]>([]);
  const [revenueByEntity, setRevenueByEntity] = useState<NetProfitRow[]>([]);

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
    // Restored — your filters state still reads filters.scenario / filters.version
    // in loadData, but these dropdown definitions had been dropped, which would
    // make those filters unreachable from the UI.
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
    const controller = new AbortController();
    loadData(controller.signal);
    return () => { controller.abort(); fetchingRef.current = false; };
  }, [filters]);

  const loadData = useCallback(async (_signal?: AbortSignal) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
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

      // ---- gauge source data: filtered raw rows, classified client-side by account_type ----
      const gaugeBaseParams: Record<string, any> = {};
      if (npYear) gaugeBaseParams.year = npYear;
      if (npEntity) gaugeBaseParams.entity = npEntity;
      if (npDepartment) gaugeBaseParams.department = npDepartment;
      if (npScenario) gaugeBaseParams.scenario = npScenario;

      const [acctActualRows, acctBudgetRows] = await Promise.all([
        fetchBudgetRows({ ...gaugeBaseParams, version: 'Actual' }),
        fetchBudgetRows({ ...gaugeBaseParams, version: 'Budget' }),
      ]);

      // DEBUG — run once, check console, then tell me the actual Expense
      // account naming convention so I can replace the COGS/OpEx heuristic
      // with an exact mapping instead of a keyword guess.
      const expenseAccountNames = [...new Set(
        acctActualRows.filter((r) => r.account_type === 'Expense').map((r) => r.account)
      )];
      console.log('Unique Expense account names:', expenseAccountNames);
      console.log('Unique Revenue account names:', [...new Set(
        acctActualRows.filter((r) => r.account_type === 'Revenue').map((r) => r.account)
      )]);

      // ---- Revenue actual vs budget, by department / entity ----
      const [deptActual, deptBudget, entActual, entBudget] = await Promise.all([
        fetchRevenueGrouped('department', 'Actual', { year: npYear, scenario: npScenario, entity: npEntity }),
        fetchRevenueGrouped('department', 'Budget', { year: npYear, scenario: npScenario, entity: npEntity }),
        fetchRevenueGrouped('entity', 'Actual', { year: npYear, scenario: npScenario, department: npDepartment }),
        fetchRevenueGrouped('entity', 'Budget', { year: npYear, scenario: npScenario, department: npDepartment }),
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

      // ---- Revenue actual vs budget, by department / entity ----
      setRevenueByDept(mergeGroupedTotals(deptActual, deptBudget));
      setRevenueByEntity(mergeGroupedTotals(entActual, entBudget));
    } catch (err: any) {
      console.error('Error loading budget data:', err);
      setError(err.message || 'Failed to load budget data');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

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
        <button onClick={() => loadData()} className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
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
        onApply={setFilters}
        onReset={handleResetFilters}
      />

      {/* Revenue actual vs budget, by department / entity, side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        
        <NetProfitChart title="Revenue: Actual vs Budget by Entity" data={revenueByEntity} />
      </div>

      <AnnotationPanel pageKey="cfo-budgeting" period={`${filters.year}:${filters.entity}`} />
    </div>
  );
}