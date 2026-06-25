import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Type definitions for API parameters
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface RevenueFilters extends PaginationParams {
  year?: number;
  quarter?: string;
  month?: number;
  entity?: string;
  region?: string;
  customer_segment?: string;
  product_category?: string;
  version?: string;
}

export interface WorkforceFilters extends PaginationParams {
  year?: number;
  entity?: string;
  department?: string;
  cost_center?: string;
  job_level?: string;
  employment_status?: string;
  version?: string;
}

export interface BudgetFilters extends PaginationParams {
  year?: number;
  entity?: string;
  department?: string;
  account?: string;
  cost_center?: string;
  version?: string;
  scenario?: string;
}

export interface ForecastFilters extends PaginationParams {
  year?: number;
  entity?: string;
  department?: string;
  account?: string;
  scenario?: string;
  version?: string;
}

export interface VarianceFilters extends PaginationParams {
  year?: number;
  entity?: string;
  department?: string;
  account?: string;
  version?: string;
}

export interface PLParams {
  year: number;
  entity?: string;
}

export interface BalanceSheetParams {
  year: number;
  entity?: string;
}

export interface ConsolidationFilters extends PaginationParams {
  year?: number;
  entity?: string;
  version?: string;
}

// ==========================================
// HEALTH CHECK APIs
// ==========================================
export const getHealth = () => api.get('/health');
export const getHealthDatabase = () => api.get('/health/database');
export const getHealthViews = () => api.get('/health/views');

// ==========================================
// DASHBOARD APIs
// ==========================================
export const getDashboard = () => api.get('/api/dashboard');
export const getDashboardKPIs = () => api.get('/api/dashboard/kpis');
export const getRevenueByYear = () => api.get('/api/dashboard/revenue-by-year');
export const getRevenueByRegion = () => api.get('/api/dashboard/revenue-by-region');
export const getRevenueByCategory = () => api.get('/api/dashboard/revenue-by-category');
export const getRevenueBySegment = () => api.get('/api/dashboard/revenue-by-segment');

// ==========================================
// METADATA APIs (for dropdowns/filters)
// ==========================================
export const getEntities = () => api.get('/api/metadata/entities');
export const getDepartments = () => api.get('/api/metadata/departments');
export const getProducts = () => api.get('/api/metadata/products');
export const getCustomers = () => api.get('/api/metadata/customers');
export const getVersions = () => api.get('/api/metadata/versions');
export const getScenarios = () => api.get('/api/metadata/scenarios');
export const getYears = () => api.get('/api/metadata/years');
export const getAccounts = () => api.get('/api/metadata/accounts');
export const getCostCenters = () => api.get('/api/metadata/cost-centers');

// ==========================================
// REVENUE CUBE APIs
// ==========================================
export const getRevenueCube = (params?: RevenueFilters) => 
  api.get('/api/revenue', { params });

export const getRevenueByRegionAgg = (params?: { year?: number; quarter?: string; entity?: string; scenario?: string; version?: string }) =>
  api.get('/api/revenue/by-region', { params });

export const getRevenueByProduct = (params?: { year?: number; quarter?: string; region?: string; entity?: string; scenario?: string; version?: string }) =>
  api.get('/api/revenue/by-product', { params });

export const getRevenueByCustomerSegment = (params?: { year?: number; quarter?: string; region?: string; entity?: string; scenario?: string; version?: string }) =>
  api.get('/api/revenue/by-customer-segment', { params });

// ==========================================
// WORKFORCE PLANNING APIs
// ==========================================
export const getWorkforceCube = (params?: WorkforceFilters) => 
  api.get('/api/workforce/', { params });

export const getWorkforceByDepartment = (params?: { year?: number; entity?: string; department?: string; job_level?: string; version?: string }) =>
  api.get('/api/workforce/by-department', { params });

export const getWorkforceByJobLevel = (params?: { year?: number; entity?: string; department?: string; version?: string }) =>
  api.get('/api/workforce/by-job-level', { params });

export const getWorkforceByEntity = (params?: { year?: number; department?: string; job_level?: string; version?: string }) =>
  api.get('/api/workforce/by-entity', { params });

// ==========================================
// BUDGET APIs
// ==========================================
export const getBudget = (params?: BudgetFilters) => 
  api.get('/api/budget-forecast/budget', { params });

export const getBudgetByAccount = (params?: { year?: number; version?: string }) => 
  api.get('/api/budget-forecast/budget/by-account', { params });

export const getBudgetByDepartment = (params?: { year?: number; version?: string }) => 
  api.get('/api/budget-forecast/budget/by-department', { params });

export const getBudgetByEntity = (params?: { year?: number; version?: string }) => 
  api.get('/api/budget-forecast/budget/by-entity', { params });

// ==========================================
// FORECAST APIs
// ==========================================
export const getForecast = (params?: ForecastFilters) => 
  api.get('/api/budget-forecast/forecast', { params });

export const getForecastByAccount = (params?: { year?: number; version?: string }) => 
  api.get('/api/budget-forecast/forecast/by-account', { params });

export const getForecastByDepartment = (params?: { year?: number; version?: string }) => 
  api.get('/api/budget-forecast/forecast/by-department', { params });

// ==========================================
// VARIANCE APIs (Budget vs Forecast)
// ==========================================
export const getVariance = (params?: VarianceFilters) => 
  api.get('/api/budget-forecast/variance', { params });

// ==========================================
// FINANCIAL STATEMENT APIs
// ==========================================
export const getPLStatement = (params: PLParams) => 
  api.get('/api/finance/pl', { params });

export const getPLSummary = (params: PLParams) => 
  api.get('/api/finance/pl/summary', { params });

export const getBalanceSheet = (params: BalanceSheetParams) => 
  api.get('/api/finance/balancesheet', { params });

export const getConsolidation = (params?: ConsolidationFilters) => 
  api.get('/api/finance/consolidation', { params });

export const getConsolidationSummary = (params?: { year?: number; version?: string }) => 
  api.get('/api/finance/consolidation/summary', { params });

// ==========================================
// DRILL-DOWN APIs
// ==========================================
export interface DrillDownParams {
  level: string;
  parent_value?: string;
  year?: number;
  region?: string;
  entity?: string;
  scenario?: string;
}

export const getRevenueDrillDown = (params: DrillDownParams) => 
  api.get('/api/revenue/drill-down', { params });

export const getWorkforceDrillDown = (params: Omit<DrillDownParams, 'region' | 'scenario'>) => 
  api.get('/api/workforce/drill-down', { params });

export const getBudgetDrillDown = (params: Omit<DrillDownParams, 'region'>) => 
  api.get('/api/budget-forecast/budget/drill-down', { params });

// ==========================================
// ENHANCED FINANCIAL STATEMENTS APIs (HIGH PRIORITY)
// ==========================================

// P&L Statement (Enhanced)
export const getPLStatementEnhanced = (params: PLParams) => 
  api.get('/api/finance-enhanced/pl-statement', { params });

export const getPLDrillDown = (params: PLParams & { account_type: string }) => 
  api.get('/api/finance-enhanced/pl-statement/drill-down', { params });

// Balance Sheet (Enhanced)
export const getBalanceSheetEnhanced = (params: BalanceSheetParams) => 
  api.get('/api/finance-enhanced/balance-sheet', { params });

export const getBalanceSheetDrillDown = (params: BalanceSheetParams & { account_type: string }) => 
  api.get('/api/finance-enhanced/balance-sheet/drill-down', { params });

// Financial Ratios
export const getFinancialRatios = (params: { year: number; entity?: string }) => 
  api.get('/api/finance-enhanced/ratios', { params });

export const getRevenueDrilldown = (params: { level: 'quarter' | 'month'; year?: number; quarter?: string }) => {
  return api.get('/api/dashboard/revenue-drilldown', { params }).then(response => {
    return response;
  }).catch(error => {
    console.error('❌ API: getRevenueDrilldown error:', error);
    console.error('❌ API: error.response:', error.response);
    throw error;
  });
};

// ==========================================
// MAPPED FINANCIAL STATEMENTS (REAL DATA WITH FRONTEND LABELS)
// ==========================================

// P&L Statement (Mapped - Real Data)
export const getPLStatementMapped = (params: PLParams) => 
  api.get('/api/finance-mapped/pl-statement-mapped', { params });

// Balance Sheet (Mapped - Real Data)
export const getBalanceSheetMapped = (params: BalanceSheetParams) => 
  api.get('/api/finance-mapped/balance-sheet-mapped', { params });

// ==========================================
// FORECASTING & SCENARIOS APIs (HIGH PRIORITY)
// ==========================================

// Scenarios
export const getForecastScenarios = () => 
  api.get('/api/forecast/scenarios');

export const getScenarioSummary = (params: { year: number; entity?: string }) => 
  api.get('/api/forecast/scenarios/summary', { params });

export const getScenarioData = (scenarioId: number, params: { year: number; entity?: string }) => 
  api.get(`/api/forecast/scenarios/${scenarioId}`, { params });

// Forecast Table
export const getForecastTable = (params: { year: number; entity?: string }) => 
  api.get('/api/forecast/table', { params });

// Scenario Comparison
export interface CompareScenarioParams {
  year: number;
  scenario_ids: number[];
  entity?: string;
}

export const compareForecastScenarios = (params: CompareScenarioParams) => 
  api.post('/api/forecast/comparison', null, { params });

// Forecast Assumptions
export const getScenarioAssumptions = (scenarioId: number, params: { year: number }) =>
  api.get(`/api/forecast/assumptions/${scenarioId}`, { params });

// Monthly Budget vs Forecast trend (drives line chart)
export const getForecastMonthlyTrend = (params: { year: number; entity?: string }) =>
  api.get('/api/forecast/monthly-trend', { params });

// ==========================================
// CONSOLIDATION APIs (MEDIUM PRIORITY)
// ==========================================

// Entity Hierarchy
export const getEntityHierarchy = () => 
  api.get('/api/consolidation/hierarchy');

// Consolidated Financial Data
export const getConsolidatedFinancialData = (params: { year: number }) => 
  api.get('/api/consolidation/financial-data', { params });

// Consolidated Cube Data
export const getConsolidatedCubeData = (params: { year: number }) => 
  api.get('/api/consolidation/cube-data', { params });

// ==========================================
// WORKFLOW / APPROVAL APIs
// ==========================================

// Get workflow status for a page
export const getWorkflowStatus = (page: string, entity: string, year: string) => 
  api.get('/api/workflow/status', { params: { page, entity, year } });

// Set workflow status for a page
export interface SetWorkflowStatusParams {
  page: string;
  entity: string;
  year: string;
  status: string;
}

export const setWorkflowStatus = (params: SetWorkflowStatusParams) => 
  api.post('/api/workflow/status', params);

// ==========================================
// ROLLING FORECAST APIs
// ==========================================

// Get rolling forecast view
export const getRollingForecastView = (params: { year: number }) => 
  api.get('/api/forecast/rolling-view', { params });

// Update rolling forecast lock status
export interface UpdateRollingForecastLockParams {
  month: number;
  year: number;
  locked: boolean;
}

export const updateRollingForecastLock = (params: UpdateRollingForecastLockParams) => 
  api.post('/api/forecast/rolling-lock', params);

// ==========================================
// ADMIN & HEALTH MONITORING APIs (MEDIUM PRIORITY)
// ==========================================

// System Health
export const getSystemStatus = () => 
  api.get('/api/admin/system-status');

// Table Health
export const getTableHealth = () => 
  api.get('/api/admin/table-health');

// Cube Health
export const getCubeHealth = () => 
  api.get('/api/admin/cube-health');

// Refresh History
export const getRefreshHistory = (days: number = 30) => 
  api.get('/api/admin/refresh-history', { params: { days } });

// Data Quality
export const getDataQuality = () =>
  api.get('/api/admin/data-quality');

// ==========================================
// CUBE EXPLORER APIs (LOW PRIORITY)
// ==========================================

// Get all cubes
export const getCubes = () => 
  api.get('/api/metadata/cubes');

// Get cube details
export const getCubeDetails = (cubeId: string) => 
  api.get(`/api/metadata/cubes/${cubeId}`);

// Get cube sample data
export const getCubeSampleData = (cubeId: string, limit: number = 10) => 
  api.get(`/api/metadata/cubes/${cubeId}/sample`, { params: { limit } });

// ==========================================
// DIMENSION EXPLORER APIs (LOW PRIORITY)
// ==========================================

// Get all dimensions
export const getDimensions = () =>
  api.get('/api/metadata/dimensions');

// Get dimension details
export const getDimensionDetails = (dimensionId: string) =>
  api.get(`/api/metadata/dimensions/${dimensionId}`);

// Get dimension hierarchy
export const getDimensionHierarchy = (dimensionId: string) =>
  api.get(`/api/metadata/dimensions/${dimensionId}/hierarchy`);

// Get dimension elements
export const getDimensionElements = (dimensionId: string, limit: number = 50) =>
  api.get(`/api/metadata/dimensions/${dimensionId}/elements`, { params: { limit } });

export default api;
