// Dashboard Types
export interface KPICard {
  title: string;
  value: number;
  format: 'number' | 'currency' | 'percentage';
  trend?: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

export interface DashboardData {
  kpis: KPICard[];
  revenue_by_year: ChartData;
  revenue_by_region: ChartData;
  revenue_by_category: ChartData;
  revenue_by_segment: ChartData;
  payroll_by_department: ChartData;
  budget_forecast_trend: ChartData;
  pl_trend: ChartData;
}

// Revenue Cube Types
export interface RevenueCubeRow {
  year: number;
  quarter: string;
  month: number;
  region: string;
  entity: string;
  product_category: string;
  product_family: string;
  customer_industry: string;
  customer_segment: string;
  revenue: number;
  cost: number;
  quantity: number;
  margin: number;
  margin_pct: number;
}

export interface RevenueCubeMeasures {
  revenue: number;
  cost: number;
  quantity: number;
  margin: number;
  margin_pct: number;
}

export interface RevenueCubeData {
  data: RevenueCubeRow[];
  total: RevenueCubeMeasures;
  count: number;
}

// Workforce Cube Types
export interface WorkforceCubeRow {
  year: number;
  month: number;
  department: string;
  cost_center: string;
  entity: string;
  employee_name: string;
  base_salary: number;
  bonus: number;
  benefits: number;
  total_compensation: number;
}

export interface WorkforceCubeData {
  data: WorkforceCubeRow[];
  count: number;
}

// Budget vs Forecast Types
export interface BudgetForecastRow {
  year: number;
  month: number;
  entity: string;
  department: string;
  account: string;
  scenario: string;
  version: string;
  budget: number;
  forecast: number;
  variance: number;
  variance_pct: number;
}

export interface BudgetForecastData {
  data: BudgetForecastRow[];
  count: number;
}

// Financial Consolidation Types
export interface FinancialConsolidationRow {
  year: number;
  month: number;
  entity: string;
  department: string;
  cost_center: string;
  account: string;
  account_type: string;
  amount: number;
}

export interface FinancialConsolidationData {
  data: FinancialConsolidationRow[];
  count: number;
}

// Dimension Types
export interface DimensionHierarchyNode {
  code: string;
  name: string;
  level: number;
  parent?: string;
  children: DimensionHierarchyNode[];
}

export interface DimensionHierarchyData {
  dimension: string;
  hierarchy: DimensionHierarchyNode[];
}

// Admin Types
export interface TableStats {
  schema_name: string;
  table_name: string;
  row_count: number;
  size_kb: number;
}

export interface AdminStatsData {
  tables: TableStats[];
  total_size_kb: number;
  last_refresh: string | null;
}
