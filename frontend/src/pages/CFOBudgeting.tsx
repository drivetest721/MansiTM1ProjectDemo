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
// COGS accounts — exact names from Planning.vw_BudgetCube_Source
const COGS_ACCOUNTS = new Set(['Direct Cost', 'Delivery Cost']);

// Revenue → revenue bucket
// Expense where AccountName is "Direct Cost" or "Delivery Cost" → cogs bucket
// All other Expense accounts → opex bucket
// Equity / Asset / Liability → ignored (balance sheet, not P&L)
function sumByCategory(rows: any[]) {
  const totals = { revenue: 0, cogs: 0, opex: 0 };
  (rows || []).forEach((r: any) => {
    if (r.account_type === 'Revenue') {
      totals.revenue += r.amount || 0;
    } else if (r.account_type === 'Expense') {
      if (COGS_ACCOUNTS.has(r.account)) totals.cogs += r.amount || 0;
      else totals.opex += r.amount || 0;
    }
  });
  return totals;
}

async function fetchBudgetRows(params: Record<string, any>): Promise<any[]> {
  try {
    const response = await getBudget({ ...params, page: 1, page_size: 500 });
    return response.data.data || [];
  } catch (err) {
    console.error('fetchBudgetRows failed:', err);
    return [];
  }
}

async function fetchRevenueGrouped(
  groupKey: 'department' | 'entity',
  version: 'Actual' | 'Budget',
  filters: { year?: number; entity?: string; department?: string }
): Promise<Record<string, number>> {
  const params: Record<string, any> = { version };
  if (filters.year) params.year = filters.year;
  if (filters.entity) params.entity = filters.entity;
  if (filters.department) params.department = filters.department;

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
  const [revenueByDept, setRevenueByDept] = useState<NetProfitRow[]>([]);
  const [revenueByEntity, setRevenueByEntity] = useState<NetProfitRow[]>([]);

  // Filters: Year, Entity, Department, Account only.
  // Scenario and Version removed — consistent with Revenue and Workforce pages.
  const [filters, setFilters] = useState<Record<string, string>>({
    year: 'all',
    entity: 'all',
    department: 'all',
    account: 'all',
  });

  // Dynamic filter options — loaded from the same endpoints that power the table.
  // undefined = still loading | [] = loaded (possibly empty) | [...] = has options
  const [entityOptions, setEntityOptions]     = useState<{ value: string; label: string }[] | undefined>(undefined);
  const [departmentOptions, setDepartmentOptions] = useState<{ value: string; label: string }[] | undefined>(undefined);
  const [accountOptions, setAccountOptions]   = useState<{ value: string; label: string }[] | undefined>(undefined);
  const [filtersLoading, setFiltersLoading]   = useState(true);

  // Load filter options on mount using Promise.allSettled so one failing call
  // cannot wipe out the others. Options come from the same aggregation endpoints
  // as the table, so values are guaranteed to match what's in the data.
  useEffect(() => {
    setFiltersLoading(true);
    (async () => {
      const [entResult, deptResult, acctResult] = await Promise.allSettled([
        getBudgetByEntity({}),
        getBudgetByDepartment({}),
        getBudgetByAccount({}),
      ]);

      if (entResult.status === 'fulfilled') {
        setEntityOptions(
          (entResult.value.data?.data ?? []).map((e: any) => ({ value: e.dimension_value, label: e.dimension_value }))
        );
      } else {
        console.error('Entity options failed:', entResult.reason);
        setEntityOptions([]);
      }

      if (deptResult.status === 'fulfilled') {
        setDepartmentOptions(
          (deptResult.value.data?.data ?? []).map((d: any) => ({ value: d.dimension_value, label: d.dimension_value }))
        );
      } else {
        console.error('Department options failed:', deptResult.reason);
        setDepartmentOptions([]);
      }

      if (acctResult.status === 'fulfilled') {
        setAccountOptions(
          (acctResult.value.data?.data ?? []).map((a: any) => ({ value: a.dimension_value, label: a.dimension_value }))
        );
      } else {
        console.error('Account options failed:', acctResult.reason);
        setAccountOptions([]);
      }

      setFiltersLoading(false);
    })();
  }, []);

  const filterOptions: FilterOption[] = [
    {
      id: 'year',
      label: 'Year',
      options: Array.from({ length: 13 }, (_, i) => 2018 + i).map((y) => ({ value: String(y), label: String(y) })),
    },
    {
      id: 'entity',
      label: 'Entity',
      options: entityOptions ?? [],
    },
    {
      id: 'department',
      label: 'Department',
      options: departmentOptions ?? [],
    },
    {
      id: 'account',
      label: 'Account',
      options: accountOptions ?? [],
    },
  ];

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => { controller.abort(); fetchingRef.current = false; };
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // NOTE: [filters] in deps is required — without it loadData is a stale closure
  // that always sees the initial filter values regardless of user selections.
  const loadData = useCallback(async (_signal?: AbortSignal) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const aggParams: Record<string, any> = {};
      if (filters.year !== 'all') aggParams.year = parseInt(filters.year);
      if (filters.entity !== 'all') aggParams.entity = filters.entity;
      if (filters.department !== 'all') aggParams.department = filters.department;

      const npYear       = filters.year !== 'all'       ? parseInt(filters.year)   : undefined;
      const npEntity     = filters.entity !== 'all'     ? filters.entity           : undefined;
      const npDepartment = filters.department !== 'all' ? filters.department        : undefined;

      const [byAcct, byDept, byEnt] = await Promise.all([
        getBudgetByAccount(aggParams),
        getBudgetByDepartment(aggParams),
        getBudgetByEntity(aggParams),
      ]);

      // Gauge source: Actual vs Budget rows, classified client-side by account_type
      const gaugeBaseParams: Record<string, any> = {};
      if (npYear)       gaugeBaseParams.year       = npYear;
      if (npEntity)     gaugeBaseParams.entity     = npEntity;
      if (npDepartment) gaugeBaseParams.department = npDepartment;

      const [acctActualRows, acctBudgetRows] = await Promise.all([
        fetchBudgetRows({ ...gaugeBaseParams, version: 'Actual' }),
        fetchBudgetRows({ ...gaugeBaseParams, version: 'Budget' }),
      ]);

      console.log('Unique Expense account names:', [...new Set(
        acctActualRows.filter((r) => r.account_type === 'Expense').map((r) => r.account)
      )]);

      // Revenue actual vs budget, by department / entity
      const [deptActual, deptBudget, entActual, entBudget] = await Promise.all([
        fetchRevenueGrouped('department', 'Actual', { year: npYear, entity: npEntity, department: npDepartment }),
        fetchRevenueGrouped('department', 'Budget', { year: npYear, entity: npEntity, department: npDepartment }),
        fetchRevenueGrouped('entity', 'Actual',     { year: npYear, entity: npEntity, department: npDepartment }),
        fetchRevenueGrouped('entity', 'Budget',     { year: npYear, entity: npEntity, department: npDepartment }),
      ]);

      // Table / KPI
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

      const totalBudget   = tableData.reduce((sum, row) => sum + (row.budget   || 0), 0);
      const totalActual   = tableData.reduce((sum, row) => sum + (row.actual   || 0), 0);
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
      const avgBudget = totalBudgetAmount / (byDept.data.data.length || 1);

      setKpiData([
        { title: 'Total Budget',  value: `$${(totalBudgetAmount / 1000000).toFixed(1)}M`, icon: DollarSign,   color: 'text-blue-600'   },
        { title: 'Accounts',      value: byAcct.data.data.length.toString(),               icon: FileText,     color: 'text-green-600'  },
        { title: 'Departments',   value: byDept.data.data.length.toString(),               icon: Building2,    color: 'text-indigo-600' },
        { title: 'Entities',      value: byEnt.data.data.length.toString(),                icon: Building2,    color: 'text-purple-600' },
        { title: 'Avg Budget',    value: `$${(avgBudget / 1000000).toFixed(1)}M`,          icon: TrendingUp,   color: 'text-amber-600'  },
        { title: 'Records',       value: tableData.length.toLocaleString(),                icon: CheckCircle,  color: 'text-teal-600'   },
      ]);

      const colors = THEME_COLORS;

      setByAccount(
        byAcct.data.data.slice(0, 10).map((item: any, idx: number) => ({
          account:    item.dimension_value.length > 20 ? item.dimension_value.substring(0, 20) + '...' : item.dimension_value,
          budget:     item.amount,
          fill:       colors[idx % colors.length],
        }))
      );
      setByDepartment(
        byDept.data.data.slice(0, 10).map((item: any, idx: number) => ({
          department: item.dimension_value.length > 20 ? item.dimension_value.substring(0, 20) + '...' : item.dimension_value,
          budget:     item.amount,
          fill:       colors[idx % colors.length],
        }))
      );
      setByEntity(
        byEnt.data.data.slice(0, 10).map((item: any, idx: number) => ({
          entity:     item.dimension_value.length > 20 ? item.dimension_value.substring(0, 20) + '...' : item.dimension_value,
          budget:     item.amount,
          fill:       colors[idx % colors.length],
        }))
      );

      // Gauge data
      const actualTotals = sumByCategory(acctActualRows);
      const budgetTotals = sumByCategory(acctBudgetRows);

      // Net Profit = Revenue − COGS − OpEx
      const netProfitActual    = actualTotals.revenue - actualTotals.cogs - actualTotals.opex;
      const netProfitBudget    = budgetTotals.revenue - budgetTotals.cogs - budgetTotals.opex;
      const profitMarginActual = actualTotals.revenue !== 0 ? (netProfitActual / actualTotals.revenue) * 100 : 0;
      const profitMarginBudget = budgetTotals.revenue !== 0 ? (netProfitBudget / budgetTotals.revenue) * 100 : 0;

      setGaugeData({
        revenue:      { actual: actualTotals.revenue, target: budgetTotals.revenue },
        cogs:         { actual: actualTotals.cogs,    target: budgetTotals.cogs    },
        opex:         { actual: actualTotals.opex,    target: budgetTotals.opex    },
        profitMargin: { actual: profitMarginActual,   target: profitMarginBudget   },
      });

      setRevenueByDept(mergeGroupedTotals(deptActual, deptBudget));
      setRevenueByEntity(mergeGroupedTotals(entActual, entBudget));

    } catch (err: any) {
      console.error('Error loading budget data:', err);
      setError(err.message || 'Failed to load budget data');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [filters]); // [filters] required — prevents stale closure

  const handleResetFilters = () => {
    setFilters({ year: 'all', entity: 'all', department: 'all', account: 'all' });
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
      if (filters.year !== 'all')        params.year   = parseInt(filters.year);
      if (filters.entity !== 'all')      params.entity = filters.entity;
      if (filters.department !== 'all')  params.department = filters.department;

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

      {/* 4 gauges */}
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

      {/* Global Filters — spinner shown while dynamic options load */}
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

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <NetProfitChart title="Revenue: Actual vs Budget by Entity" data={revenueByEntity} />
      </div>

      <AnnotationPanel pageKey="cfo-budgeting" period={`${filters.year}:${filters.entity}`} />
    </div>
  );
}
