# Frontend-Backend Integration Guide
## TM1 Enterprise Performance Management Portal

**Date**: June 23, 2026  
**Status**: Page 1 of 12 Complete ✅  
**Current URL**: http://localhost:5176/

---

## 📋 Table of Contents

1. [Page Implementation Status](#page-implementation-status)
2. [Page 1: Executive Overview - Implementation Details](#page-1-executive-overview---complete-)
3. [Issues Encountered & Solutions](#issues-encountered--solutions)
4. [Lessons Learned - DO NOT REPEAT](#lessons-learned---do-not-repeat)
5. [Backend API Endpoints Reference](#backend-api-endpoints-reference)
6. [Implementation Pattern for Remaining Pages](#implementation-pattern-for-remaining-pages)
7. [Page-by-Page Implementation Plan](#page-by-page-implementation-plan)

---

## 📊 Page Implementation Status

| # | Page Name | Route | Backend Endpoint | Status |
|---|-----------|-------|------------------|--------|
| 1 | **Executive Overview** | `/` | `/api/dashboard/` | ✅ **COMPLETE** |
| 2 | Revenue Planning | `/revenue` | `/api/revenue/cube` | ⏳ TODO |
| 3 | Workforce Planning | `/workforce` | `/api/workforce/cube` | ⏳ TODO |
| 4 | CFO Budgeting | `/budget` | `/api/budget/cube` | ⏳ TODO |
| 5 | Forecasting Analysis | `/forecast` | `/api/forecast/cube` | ⏳ TODO |
| 6 | P&L Statement | `/pl` | `/api/finance/pl` | ⏳ TODO |
| 7 | Balance Sheet | `/balance-sheet` | `/api/finance/balance-sheet` | ⏳ TODO |
| 8 | Financial Consolidation | `/consolidation` | `/api/finance/consolidation` | ⏳ TODO |
| 9 | Cube Explorer | `/cube` | `/api/revenue/cube`, `/api/metadata/*` | ⏳ TODO |
| 10 | Dimension Explorer | `/dimensions` | `/api/metadata/*` | ⏳ TODO |
| 11 | TM1 Architecture | `/architecture` | N/A (Diagram only) | ⏳ TODO |
| 12 | Admin Data Health | `/admin` | `/health` | ⏳ TODO |

---

## 🎯 Page 1: Executive Overview - Complete ✅

### Implementation Summary

**File**: `frontend/src/pages/ExecutiveOverview.tsx`

**What We Built**:
- Connected to backend API `/api/dashboard/`
- Displays 9 KPI metrics from real database
- Shows 4 charts with real data:
  - Revenue by Year (Bar Chart)
  - Revenue by Region (Pie Chart)
  - Revenue by Category (Bar Chart)
  - Revenue by Segment (Bar Chart)
- Loading state with spinner
- Error handling with retry button
- Responsive grid layout

**Data Flow**:
```
Frontend                Backend                    Database
--------                -------                    --------
ExecutiveOverview.tsx → getDashboard() → /api/dashboard/ → dashboard_service.py → SQL Views
                                                              ↓
                                                    Sales.vw_RevenueCube_Source
                                                    HR.vw_WorkforceCube_Source
                                                    Planning.vw_BudgetCube_Source
                                                    Planning.vw_ForecastCube_Source
```

**Key Code Sections**:

1. **API Call**:
```typescript
const loadDashboardData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const response = await getDashboard();
    const data = response.data;
    
    // Process KPIs and charts...
  } catch (err: any) {
    setError(err.message || 'Failed to load dashboard data');
  } finally {
    setLoading(false);
  }
};
```

2. **KPI Value Formatting**:
```typescript
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
```

3. **Chart Data Transformation**:
```typescript
// Backend returns: { labels: [...], datasets: [{data: [...]}] }
// Recharts needs: [{ label: "...", value: ... }, ...]

const transformChartData = (chartData: any) => {
  if (!chartData || !chartData.labels || !chartData.datasets) {
    return [];
  }
  return chartData.labels.map((label: string, index: number) => ({
    label,
    value: chartData.datasets[0].data[index]
  }));
};
```

**Backend API Response Example**:
```json
{
  "kpis": [
    {
      "title": "Total Revenue",
      "value": 32525515071.95,
      "format": "currency",
      "change": null,
      "change_percent": null
    },
    {
      "title": "Total Employees",
      "value": 20000.0,
      "format": "number",
      "change": null,
      "change_percent": null
    }
  ],
  "revenue_by_year": {
    "labels": ["2018", "2019", "2020"],
    "datasets": [{
      "label": "Revenue",
      "data": [2508360781.89, 2480602173.59, 2486418081.06]
    }]
  }
}
```

---

## 🐛 Issues Encountered & Solutions

### Issue 1: ODBC Connection String Syntax Error

**Error**:
```
(pyodbc.Error) ('IM012', '[IM012] [Microsoft][ODBC Driver Manager] 
DRIVER keyword syntax error (0) (SQLDriverConnect)')
```

**Root Cause**:
- Curly braces `{}` in driver name `{ODBC Driver 17 for SQL Server}` not properly handled
- Initial approach using `?driver=...` parameter didn't work

**Solution**:
```python
# backend/config.py
from urllib.parse import quote_plus

@property
def DATABASE_URL(self) -> str:
    # Build ODBC connection string
    odbc_connect = (
        f"DRIVER={self.DB_DRIVER};"
        f"SERVER={self.DB_SERVER};"
        f"DATABASE={self.DB_NAME};"
        f"Trusted_Connection=yes;"
    )
    # URL-encode the entire connection string
    params = quote_plus(odbc_connect)
    return f"mssql+pyodbc:///?odbc_connect={params}"
```

**Result**: ✅ Connection successful with 500,000 records in revenue view

---

### Issue 2: Invalid Column Names in SQL Queries

**Error**:
```
(pyodbc.ProgrammingError) ('42S22', "[42S22] [Microsoft][ODBC Driver 17 for SQL Server]
[SQL Server]Invalid column name 'Employee'. (207) (SQLExecDirectW)")
```

**Root Cause**:
- Assumed column names didn't match actual database schema
- Used shorthand names like `Employee`, `Customer`, `Product`, `Year`, `Region`, `Amount`

**Actual Column Names**:
```
Sales.vw_RevenueCube_Source:
- CustomerID (not Customer)
- ProductID (not Product)
- YearNumber (not Year)
- RegionName (not Region)

HR.vw_WorkforceCube_Source:
- EmployeeID (not Employee)

Planning.vw_BudgetCube_Source:
- BudgetAmount (not Amount)

Planning.vw_ForecastCube_Source:
- ForecastAmount (not Amount)
```

**Solution**:
- Used Python script to query `SELECT TOP 1 * FROM [view]` and get actual column names
- Updated all service files with correct column names

**Fix Script**:
```python
from database import engine
from sqlalchemy import text

conn = engine.connect()
result = conn.execute(text('SELECT TOP 1 * FROM Sales.vw_RevenueCube_Source'))
columns = list(result.keys())
print('Columns:', columns)
conn.close()
```

**Result**: ✅ All queries now use correct column names

---

### Issue 3: SECRET_KEY Security Issue

**Error**:
```python
SECRET_KEY = "your-secret-key-here-change-in-production"
```

**Root Cause**:
- Placeholder secret key not secure for production

**Solution**:
```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Generated: IeDWNagnd_kv_e4oxShySGDdFOtn7YoIDAl41LMaKo4
```

Updated in both `.env` and `config.py`

**Result**: ✅ Secure random key generated

---

### Issue 4: Frontend TypeError - Cannot Read Properties of Undefined

**Error**:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'toLocaleString')
    at formatValue (MetricCard.tsx:25:16)
```

**Root Cause**:
- `value` parameter was `undefined` or `null`
- Tried to call `.toLocaleString()` on undefined value

**Solution**:
```typescript
// frontend/src/components/MetricCard.tsx
const formatValue = (val: string | number) => {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'string') return val;
  return val.toLocaleString('en-US');
};
```

**Result**: ✅ Graceful handling of null/undefined values

---

### Issue 5: Backend API Response Format Mismatch

**Error**:
- Frontend expected: `kpi.name`, `kpi.formatted_value`
- Backend returned: `kpi.title`, `kpi.value`, `kpi.format`

**Root Cause**:
- Assumed backend would pre-format values
- Backend returns raw numbers with format specification

**Solution**:
```typescript
// Frontend handles formatting
const formatKPIValue = (value: number, format: string): string => {
  switch (format) {
    case 'currency':
      return `$${(value / 1_000_000).toFixed(1)}M`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'number':
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
};

const formattedKPIs = data.kpis.map((kpi: any) => ({
  title: kpi.title,
  value: formatKPIValue(kpi.value, kpi.format),
  change: kpi.change_percent || 0,
  icon: kpiIcons[index]?.icon,
  iconColor: kpiIcons[index]?.color,
}));
```

**Result**: ✅ Frontend correctly formats values from backend

---

### Issue 6: Chart Data Format Mismatch

**Error**:
- Backend returns Chart.js format: `{ labels: [], datasets: [{data: []}] }`
- Recharts expects: `[{ label: "...", value: ... }]`

**Solution**:
```typescript
const transformChartData = (chartData: any) => {
  if (!chartData || !chartData.labels || !chartData.datasets || chartData.datasets.length === 0) {
    return [];
  }
  return chartData.labels.map((label: string, index: number) => ({
    label,
    value: chartData.datasets[0].data[index]
  }));
};

setRevenueByYear(transformChartData(data.revenue_by_year));
setRevenueByRegion(transformChartData(data.revenue_by_region));
setRevenueByCategory(transformChartData(data.revenue_by_category));
```

**Result**: ✅ Charts render with correct data

---

## ⚠️ Lessons Learned - DO NOT REPEAT

### 1. Always Verify Database Column Names FIRST

**DO THIS**:
```python
# Create check_columns.py before writing queries
from database import engine
from sqlalchemy import text

conn = engine.connect()
result = conn.execute(text('SELECT TOP 1 * FROM [ViewName]'))
print('Columns:', list(result.keys()))
conn.close()
```

**DON'T ASSUME** column names like:
- ❌ `Employee` → Use `EmployeeID`
- ❌ `Customer` → Use `CustomerID`
- ❌ `Product` → Use `ProductID`
- ❌ `Year` → Use `YearNumber`
- ❌ `Region` → Use `RegionName`
- ❌ `Amount` → Use `BudgetAmount` or `ForecastAmount` (view-specific)

---

### 2. Always Handle Null/Undefined Values

**DO THIS**:
```typescript
const formatValue = (val: string | number) => {
  if (val === null || val === undefined) return 'N/A';
  // ... rest of logic
};
```

**DON'T DO**:
```typescript
// ❌ This will throw error if value is undefined
return val.toLocaleString('en-US');
```

---

### 3. Transform Backend Data to Match Frontend Library Format

**DO THIS**:
```typescript
// Transform backend format to Recharts format
const transformChartData = (chartData: any) => {
  return chartData.labels.map((label, index) => ({
    label,
    value: chartData.datasets[0].data[index]
  }));
};
```

**DON'T ASSUME** backend format matches frontend library expectations.

---

### 4. Use Proper ODBC Connection String Format

**DO THIS**:
```python
odbc_connect = (
    f"DRIVER={self.DB_DRIVER};"
    f"SERVER={self.DB_SERVER};"
    f"DATABASE={self.DB_NAME};"
    f"Trusted_Connection=yes;"
)
params = quote_plus(odbc_connect)
return f"mssql+pyodbc:///?odbc_connect={params}"
```

**DON'T USE**:
```python
# ❌ This causes DRIVER keyword syntax error
return f"mssql+pyodbc://@{server}/{database}?driver={driver}&trusted_connection=yes"
```

---

### 5. Format Large Numbers for Readability

**DO THIS**:
```typescript
// $32.5M instead of $32,525,515,071.95
return `$${(value / 1_000_000).toFixed(1)}M`;
```

**DON'T SHOW** raw large numbers that are hard to read.

---

### 6. Always Close Database Result Sets

**DO THIS**:
```python
result = conn.execute(text(query))
columns = list(result.keys())
result.close()  # ✅ Close before next query
```

**DON'T FORGET** to close results or you'll get "Connection is busy with results for another command" error.

---

### 7. Test API Endpoints Independently First

**DO THIS**:
```powershell
# Test API directly before frontend integration
curl.exe http://localhost:8000/api/dashboard/ --silent | ConvertFrom-Json
```

**DON'T START** frontend integration until backend returns valid data.

---

## 🔌 Backend API Endpoints Reference

### Base URL
```
http://localhost:8000
```

### Health Check
```
GET /health
```

### Dashboard
```
GET /api/dashboard/
GET /api/dashboard/kpis
GET /api/dashboard/revenue-by-year
GET /api/dashboard/revenue-by-region
GET /api/dashboard/revenue-by-category
GET /api/dashboard/revenue-by-segment
```

### Metadata (for filters/dropdowns)
```
GET /api/metadata/entities
GET /api/metadata/departments
GET /api/metadata/products
GET /api/metadata/customers
GET /api/metadata/versions
GET /api/metadata/scenarios
GET /api/metadata/years
GET /api/metadata/accounts
GET /api/metadata/cost-centers
```

### Revenue Planning
```
GET /api/revenue/cube?page=1&page_size=50&year=2025&entity=...
GET /api/revenue/by-region
GET /api/revenue/by-product
GET /api/revenue/by-customer-segment
```

### Workforce Planning
```
GET /api/workforce/cube?page=1&page_size=50&year=2025&department=...
GET /api/workforce/by-department
GET /api/workforce/by-job-level
```

### Budget & Forecast
```
GET /api/budget/cube?page=1&page_size=50&year=2025&department=...
GET /api/budget/by-account
GET /api/budget/by-department
GET /api/forecast/cube?page=1&page_size=50&year=2025&department=...
GET /api/variance?year=2025&entity=...
```

### Financial Statements
```
GET /api/finance/pl?year=2025&entity=1
GET /api/finance/pl/summary?year=2025
GET /api/finance/balance-sheet?year=2025&entity=1
GET /api/finance/consolidation?year=2025
GET /api/finance/consolidation/summary?year=2025
```

---

## 🔄 Implementation Pattern for Remaining Pages

### Standard Implementation Steps

1. **Verify API Endpoint Works**
   ```powershell
   curl.exe http://localhost:8000/api/[endpoint] --silent | ConvertFrom-Json
   ```

2. **Check Column Names**
   ```python
   # Run check_columns.py for the view
   result = conn.execute(text('SELECT TOP 1 * FROM [ViewName]'))
   print(list(result.keys()))
   ```

3. **Update Frontend Page**
   - Add state variables
   - Create API call function
   - Handle loading/error states
   - Transform data if needed
   - Update UI to display data

4. **Test in Browser**
   - Check console for errors
   - Verify data loads
   - Test filters
   - Test pagination

### Standard Page Structure

```typescript
import { useState, useEffect } from 'react';
import { get[Feature] } from '../services/api';

export default function [PageName]() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    year: 2025,
    page: 1,
    page_size: 50
  });

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await get[Feature](filters);
      setData(response.data.records || response.data);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={loadData} />;
  }

  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

---

## 📝 Page-by-Page Implementation Plan

### Page 2: Revenue Planning

**File**: `frontend/src/pages/RevenuePlanning.tsx`

**API Endpoint**: `/api/revenue/cube`

**Required Changes**:
1. Import `getRevenueCube` from `api.ts`
2. Add state for revenue data
3. Add filters: year, entity, region, customerSegment, productCategory
4. Load metadata for dropdowns (entities, products, customers)
5. Display data in table with expand/collapse by region
6. Add aggregation charts (by region, product, segment)

**Key Features**:
- Pagination (50 rows per page)
- Column filters
- Hierarchical display (Region → Customer → Product)
- Summary totals
- Export capability

**Database View**: `Sales.vw_RevenueCube_Source`

**Columns** (31 total):
```
YearNumber, QuarterName, MonthName, DateID,
CustomerID, CustomerCode, CustomerName, Industry, CustomerSegment, RevenueBand,
ProductID, ProductCode, ProductName, ProductCategory, ProductFamily, ProductLine,
RegionID, RegionCode, RegionName,
EntityID, EntityCode, EntityName,
VersionID, VersionCode, VersionName,
Quantity, Revenue, Cost, Margin, MarginPercent, AverageSellingPrice
```

**API Calls Needed**:
```typescript
// Load cube data
const cubeData = await getRevenueCube({ 
  year: 2025, 
  entity: 1,
  page: 1,
  page_size: 50 
});

// Load aggregations
const byRegion = await getRevenueByRegion({ year: 2025 });
const byProduct = await getRevenueByProduct({ year: 2025 });
const bySegment = await getRevenueByCustomerSegment({ year: 2025 });

// Load filters
const entities = await getEntities();
const products = await getProducts();
const customers = await getCustomers();
```

---

### Page 3: Workforce Planning

**File**: `frontend/src/pages/WorkforcePlanning.tsx`

**API Endpoint**: `/api/workforce/cube`

**Required Changes**:
1. Import `getWorkforceCube` from `api.ts`
2. Add state for workforce data
3. Add filters: year, entity, department, costCenter, jobLevel
4. Load metadata for dropdowns
5. Display data in table with expand/collapse by department
6. Add aggregation charts (by department, job level)

**Database View**: `HR.vw_WorkforceCube_Source`

**Columns** (27 total):
```
YearNumber, QuarterName, MonthName,
EmployeeID, EmployeeCode, EmployeeName, JobTitle, JobLevel, EmploymentStatus,
DepartmentID, DepartmentCode, DepartmentName,
CostCenterID, CostCenterCode, CostCenterName,
EntityID, EntityCode, EntityName,
VersionID, VersionCode, VersionName,
BaseSalary, Bonus, Benefits, TotalCompensation, BonusPercent, BenefitsPercent
```

---

### Page 4: CFO Budgeting

**File**: `frontend/src/pages/CFOBudgeting.tsx`

**API Endpoint**: `/api/budget/cube`

**Required Changes**:
1. Import `getBudget`, `getBudgetByAccount`, `getBudgetByDepartment` from `api.ts`
2. Add state for budget data
3. Add filters: year, entity, department, account, scenario
4. Load metadata for dropdowns
5. Display data in table grouped by account type
6. Add aggregation charts (by account, department)

**Database View**: `Planning.vw_BudgetCube_Source`

**Columns** (21 total):
```
YearNumber, QuarterName, MonthName,
EntityID, EntityCode, EntityName,
DepartmentID, DepartmentCode, DepartmentName,
AccountID, AccountCode, AccountName, AccountType, StatementType,
ScenarioID, ScenarioCode, ScenarioName,
VersionID, VersionCode, VersionName,
BudgetAmount
```

---

### Page 5: Forecasting Analysis

**File**: `frontend/src/pages/ForecastingAnalysis.tsx`

**API Endpoint**: `/api/forecast/cube`, `/api/variance`

**Required Changes**:
1. Import `getForecast`, `getVariance` from `api.ts`
2. Add state for forecast and variance data
3. Add filters: year, entity, department, account, scenario
4. Display forecast data in table
5. Display variance analysis (Budget vs Forecast)
6. Add trend charts
7. Add waterfall chart for variance

**Database Views**: 
- `Planning.vw_ForecastCube_Source`
- `Planning.vw_BudgetForecastVariance`

**Forecast Columns** (21 total):
```
YearNumber, QuarterName, MonthName,
EntityID, EntityCode, EntityName,
DepartmentID, DepartmentCode, DepartmentName,
AccountID, AccountCode, AccountName, AccountType, StatementType,
ScenarioID, ScenarioCode, ScenarioName,
VersionID, VersionCode, VersionName,
ForecastAmount
```

---

### Page 6: P&L Statement

**File**: `frontend/src/pages/PLStatement.tsx`

**API Endpoint**: `/api/finance/pl`

**Required Changes**:
1. Import `getPLStatement`, `getPLSummary` from `api.ts`
2. Add state for P&L data
3. Add filters: year, entity
4. Display hierarchical P&L structure
5. Show subtotals and totals
6. Add variance columns (vs Budget, vs Prior Year)
7. Add drill-down capability

**Database View**: `Finance.vw_PL_Statement`

**Expected Structure**:
```
Revenue
  - Product Revenue
  - Service Revenue
Cost of Goods Sold
  - Direct Materials
  - Direct Labor
Gross Profit
Operating Expenses
  - Sales & Marketing
  - R&D
  - General & Administrative
EBITDA
Depreciation & Amortization
EBIT
Interest Expense
EBT
Income Tax
Net Income
```

---

### Page 7: Balance Sheet

**File**: `frontend/src/pages/BalanceSheet.tsx`

**API Endpoint**: `/api/finance/balance-sheet`

**Required Changes**:
1. Import `getBalanceSheet` from `api.ts`
2. Add state for balance sheet data
3. Add filters: year, entity
4. Display three sections: Assets, Liabilities, Equity
5. Show subtotals and totals
6. Verify Assets = Liabilities + Equity
7. Add drill-down capability

**Database View**: `Finance.vw_BalanceSheet`

**Expected Structure**:
```
ASSETS
  Current Assets
    - Cash & Equivalents
    - Accounts Receivable
    - Inventory
  Non-Current Assets
    - Property, Plant & Equipment
    - Intangible Assets
Total Assets

LIABILITIES
  Current Liabilities
    - Accounts Payable
    - Short-term Debt
  Non-Current Liabilities
    - Long-term Debt
Total Liabilities

EQUITY
  - Share Capital
  - Retained Earnings
Total Equity

Total Liabilities & Equity
```

---

### Page 8: Financial Consolidation

**File**: `frontend/src/pages/FinancialConsolidation.tsx`

**API Endpoint**: `/api/finance/consolidation`

**Required Changes**:
1. Import `getConsolidation`, `getConsolidationSummary` from `api.ts`
2. Add state for consolidation data
3. Add filters: year, entity
4. Display entity tree hierarchy
5. Show eliminations
6. Display consolidated totals
7. Add drill-down by entity

**Database View**: `Finance.vw_EntityConsolidation`

**Expected Structure**:
```
Entity Hierarchy:
- Corporate (Parent)
  - North America
    - USA
    - Canada
  - Europe
    - UK
    - Germany
  - Asia Pacific
    - Japan
    - Australia

Consolidation:
- Entity totals
- Intercompany eliminations
- Consolidated total
```

---

### Page 9: Cube Explorer

**File**: `frontend/src/pages/CubeExplorer.tsx`

**API Endpoints**: All cube endpoints + metadata

**Required Changes**:
1. Add cube selector dropdown (Revenue, Workforce, Budget, Forecast)
2. Dynamic dimension selection
3. Pivot table display
4. Drill-down capability
5. Export to Excel
6. Save view configuration

**Features**:
- Swap rows/columns
- Filter dimensions
- Aggregate measures
- Grand totals
- Subtotals
- Conditional formatting

---

### Page 10: Dimension Explorer

**File**: `frontend/src/pages/DimensionExplorer.tsx`

**API Endpoints**: `/api/metadata/*`

**Required Changes**:
1. Import all metadata functions
2. Add dimension selector dropdown
3. Display hierarchy tree
4. Show dimension properties
5. Add search/filter
6. Show member count
7. Display parent-child relationships

**Dimensions to Display**:
- Customer (15,000 members)
- Product (5,000 members)
- Employee (20,000 members)
- Department
- Cost Center
- Entity
- Account
- Scenario
- Version
- Time (Years, Quarters, Months)

---

### Page 11: TM1 Architecture

**File**: `frontend/src/pages/TM1Architecture.tsx`

**API Endpoints**: None (static diagram)

**Required Changes**:
1. Create Mermaid diagram or use React Flow
2. Show data flow from sources to cubes
3. Display cube structure
4. Show dimension relationships
5. Explain TM1 concepts
6. Add interactive tooltips

**No Backend Integration Required** - This is a documentation/diagram page.

---

### Page 12: Admin Data Health

**File**: `frontend/src/pages/AdminDataHealth.tsx`

**API Endpoint**: `/health`

**Required Changes**:
1. Import `getHealth` from `api.ts`
2. Display database connection status
3. Show record counts per view
4. Display last refresh timestamps
5. Add system diagnostics
6. Show API endpoint status
7. Add refresh button

**Health Check Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-06-23T15:42:00Z",
  "database": {
    "connected": true,
    "server": "REAL_L001",
    "database": "TM1EnterpriseDB"
  },
  "record_counts": {
    "revenue": 500000,
    "workforce": 240000,
    "budget": 1000000,
    "forecast": 1000000
  }
}
```

---

## 🚀 Implementation Order (Recommended)

### Phase 1: Core Planning Pages (Week 1)
1. ✅ Executive Overview (Complete)
2. Revenue Planning
3. Workforce Planning
4. CFO Budgeting

### Phase 2: Analysis Pages (Week 2)
5. Forecasting Analysis
6. P&L Statement
7. Balance Sheet
8. Financial Consolidation

### Phase 3: Advanced Pages (Week 3)
9. Cube Explorer
10. Dimension Explorer
11. TM1 Architecture
12. Admin Data Health

---

## 📦 Reusable Components Created

### MetricCard.tsx
- Displays KPI with icon
- Handles null/undefined values
- Supports change indicators
- Used by: Executive Overview, all planning pages

### FinancialTable.tsx
- Displays financial data with formatting
- Supports subtotals and totals
- Variance columns
- Used by: P&L, Balance Sheet, Consolidation

### VarianceBadge.tsx
- Shows positive/negative variance
- Color-coded (green/red)
- Supports currency, percent, number
- Used by: All pages with variance analysis

---

## 🎨 UI Guidelines

### Colors
- Primary: Blue (#3b82f6)
- Success: Green (#10b981)
- Warning: Amber (#f59e0b)
- Danger: Red (#ef4444)
- Neutral: Gray (#6b7280)

### Typography
- Headings: Bold, dark text
- Body: Regular, gray text
- Numbers: Tabular figures for alignment

### Layout
- Responsive grid (1-2-3-4 columns based on screen size)
- Card-based design with shadows
- Dark mode support throughout

---

## ✅ Testing Checklist (For Each Page)

- [ ] API endpoint returns 200 status
- [ ] Data loads without console errors
- [ ] Loading spinner displays during fetch
- [ ] Error message displays on failure
- [ ] Retry button works after error
- [ ] Filters work and trigger reload
- [ ] Pagination works (if applicable)
- [ ] Charts render correctly
- [ ] Numbers formatted correctly (currency, percent, etc.)
- [ ] Null/undefined values handled gracefully
- [ ] Responsive layout works on mobile
- [ ] Dark mode works correctly
- [ ] Export functionality works (if applicable)
- [ ] Drill-down works (if applicable)

---

## 📚 Additional Resources

### Backend Documentation
- `backend/README.md` - Complete API documentation
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Database Documentation
- All views are in `TM1EnterpriseDB`
- Use `SELECT TOP 1 * FROM [view]` to check columns
- All views have 500K+ records

### Frontend Documentation
- Vite config: `vite.config.ts`
- Tailwind config: `tailwind.config.js`
- TypeScript config: `tsconfig.json`

---

## 🔧 Development Commands

### Backend
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

### Test API
```powershell
curl.exe http://localhost:8000/api/[endpoint] --silent | ConvertFrom-Json
```

### Check Columns
```powershell
cd backend
python check_columns.py
```

---

## 🎯 Success Metrics

- [x] Backend API returns real data from SQL Server
- [x] All 40+ endpoints working
- [x] Frontend displays real data (1 of 12 pages complete)
- [ ] All 12 pages connected to backend
- [ ] All filters working
- [ ] All charts displaying real data
- [ ] Pagination working on all pages
- [ ] Error handling on all pages
- [ ] Export functionality on all pages
- [ ] Production-ready code quality

---

## 📞 Support

**Backend Issues**: Check `backend/logs/application.log`  
**Frontend Issues**: Check browser console  
**Database Issues**: Check SQL Server connection

**Current Status**: 
- ✅ Backend: Fully operational
- ✅ Database: Connected (500K+ records)
- ⏳ Frontend: 1 of 12 pages complete

---

**Last Updated**: June 23, 2026  
**Next Step**: Implement Pages 2-4 (Revenue, Workforce, Budget Planning)
