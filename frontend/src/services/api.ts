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

export const getRevenueByRegionAgg = (params?: { year?: number; version?: string }) => 
  api.get('/api/revenue/by-region', { params });

export const getRevenueByProduct = (params?: { year?: number; version?: string }) => 
  api.get('/api/revenue/by-product', { params });

export const getRevenueByCustomerSegment = (params?: { year?: number; version?: string }) => 
  api.get('/api/revenue/by-customer-segment', { params });

// ==========================================
// WORKFORCE PLANNING APIs
// ==========================================
export const getWorkforceCube = (params?: WorkforceFilters) => 
  api.get('/api/workforce/', { params });

export const getWorkforceByDepartment = (params?: { year?: number; version?: string }) => 
  api.get('/api/workforce/by-department', { params });

export const getWorkforceByJobLevel = (params?: { year?: number; version?: string }) => 
  api.get('/api/workforce/by-job-level', { params });

export const getWorkforceByEntity = (params?: { year?: number; version?: string }) => 
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
// LEGACY COMPATIBILITY (deprecated, use specific endpoints above)
// ==========================================
export const getRevenueCubeFilters = getEntities; // Use getEntities, getDepartments, etc. instead
export const getWorkforceCubeFilters = getEntities;
export const getBudgetForecastFilters = getEntities;

export default api;
