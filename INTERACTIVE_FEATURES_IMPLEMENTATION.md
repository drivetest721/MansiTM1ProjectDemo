# Interactive Features Implementation Plan

## Overview
This document outlines all missing interactive features across Pages 1-4 (Executive Overview, Revenue Planning, Workforce Planning, CFO Budgeting) and provides a structured implementation plan.

---

## Current State Analysis

### ✅ **Completed Features:**
- ✅ Backend API integration with real SQL Server data
- ✅ Data loading and display in grids/tables
- ✅ Global filters (Year, Entity, Department, etc.)
- ✅ KPI metrics display
- ✅ Charts and visualizations
- ✅ Refresh button functionality
- ✅ Basic expand/collapse UI (buttons display but don't fetch child data)

### ❌ **Missing Features:**

#### 1. **Export to Excel Functionality**
**Current State:** All pages have Export button with `console.log('Export to Excel')`
**Required Functionality:**
- Export current grid/table data to Excel (.xlsx) format
- Include all visible columns and rows
- Preserve formatting (currency, numbers, percentages)
- Add sheet name and timestamp
- Support filtering (export only filtered/visible data)

**Pages Affected:**
- Page 1: Executive Overview (FinancialTable)
- Page 2: Revenue Planning (CubeGrid)
- Page 3: Workforce Planning (CubeGrid)
- Page 4: CFO Budgeting (FinancialTable)

---

#### 2. **Pivot Functionality**
**Current State:** Pivot button exists with `console.log('Pivot options')`
**Required Functionality:**
- Dialog to swap dimensions (rows ↔ columns)
- Select which dimensions to display on rows vs columns
- Reorder dimensions
- Show/hide specific measures
- Apply pivot configuration and refresh grid

**Pages Affected:**
- Page 2: Revenue Planning (CubeGrid)
- Page 3: Workforce Planning (CubeGrid)

---

#### 3. **Drill-Down Functionality (Expand/Collapse with Data Fetch)**
**Current State:** 
- Expand icons (▶) exist in UI
- `toggleExpand()` function updates state but doesn't fetch child data
- No actual hierarchical data shown when expanding

**Required Functionality:**
- Single-click expand icon (▶) → fetch child elements from backend
- Display child rows indented beneath parent
- Collapse (▼) → hide child rows
- Support multi-level hierarchy (Category → Family → Line Item)
- Backend API endpoints for hierarchical drill-down

**Described in Instructions:**
- **Revenue Planning:** "Click expand icons (▶) to drill down from Product Category → Product Family → Product Line"
- **Workforce Planning:** "Use filters to drill down by time period and department"
- **CFO Budgeting:** "Use filters to drill down by time period and scenario"

**Pages Affected:**
- Page 2: Revenue Planning (CubeGrid with Product hierarchy)
- Page 3: Workforce Planning (CubeGrid with Department/Employee hierarchy)
- Page 4: CFO Budgeting (FinancialTable with Account hierarchy)

---

#### 4. **Double-Click Drill-Down**
**Current State:** Not implemented
**Required Functionality:**
- Double-click on any row → drill down to next level
- Alternative to clicking expand icon
- Smooth user experience for quick navigation

**Pages Affected:**
- Page 2: Revenue Planning
- Page 3: Workforce Planning
- Page 4: CFO Budgeting

---

## Implementation Plan

### **Phase 1: Create Reusable Components** (Do First)

#### Component 1: `ExportToExcel.tsx`
**Purpose:** Export grid/table data to Excel file
**Location:** `frontend/src/components/ExportToExcel.tsx`

**Features:**
- Accept data array as input
- Generate .xlsx file using `xlsx` library
- Format numbers, currency, percentages
- Add sheet name and timestamp
- Download file to browser

**Dependencies:**
```bash
npm install xlsx
npm install @types/xlsx --save-dev
```

**Interface:**
```typescript
interface ExportToExcelProps {
  data: any[];
  fileName: string;
  sheetName: string;
  columnHeaders?: string[];
}
```

**Usage:**
```typescript
import ExportToExcel from '../components/ExportToExcel';

<button onClick={() => ExportToExcel({ 
  data: cubeData, 
  fileName: 'Revenue_Planning', 
  sheetName: 'Revenue Cube' 
})}>
  <Download size={18} />
  Export to Excel
</button>
```

---

#### Component 2: `PivotDialog.tsx`
**Purpose:** Dialog for configuring pivot options
**Location:** `frontend/src/components/PivotDialog.tsx`

**Features:**
- Modal dialog with dimension selection
- Drag-and-drop to reorder dimensions
- Row dimensions vs Column dimensions selection
- Measure selection (show/hide specific measures)
- Apply/Cancel buttons
- Persist pivot configuration in state

**Interface:**
```typescript
interface PivotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableDimensions: string[];
  currentRowDimensions: string[];
  currentColumnDimensions: string[];
  availableMeasures: string[];
  selectedMeasures: string[];
  onApply: (config: PivotConfig) => void;
}

interface PivotConfig {
  rowDimensions: string[];
  columnDimensions: string[];
  measures: string[];
}
```

**Usage:**
```typescript
const [showPivot, setShowPivot] = useState(false);

<button onClick={() => setShowPivot(true)}>
  <Settings2 size={18} />
  Pivot
</button>

<PivotDialog
  isOpen={showPivot}
  onClose={() => setShowPivot(false)}
  availableDimensions={['Time', 'Product', 'Customer', 'Region']}
  onApply={(config) => applyPivotConfig(config)}
/>
```

---

#### Component 3: Enhanced `CubeGrid.tsx` (Update Existing)
**Purpose:** Add drill-down functionality to existing CubeGrid component
**Location:** `frontend/src/components/CubeGrid.tsx` (modify existing)

**New Features to Add:**
1. **Single-Click Expand:**
   - Fetch child data from backend when expand icon clicked
   - Show loading spinner while fetching
   - Insert child rows beneath parent with increased indent
   - Track expanded state per row

2. **Double-Click Drill-Down:**
   - Add `onDoubleClick` event to row
   - Trigger same expand logic as single-click icon
   - Provide visual feedback

3. **Lazy Loading:**
   - Only fetch child data when expanding (not all at once)
   - Cache expanded data to avoid re-fetching

**New Props:**
```typescript
interface CubeGridProps {
  data: CubeRow[];
  measureColumns: string[];
  title?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  onPivot?: () => void;
  onDrillDown?: (parentId: string) => Promise<CubeRow[]>; // NEW
  hierarchyLevel?: string; // NEW - 'category' | 'family' | 'line'
}
```

**Implementation Changes:**
```typescript
// Add to existing CubeGrid component:
const [childDataCache, setChildDataCache] = useState<Map<string, CubeRow[]>>(new Map());
const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set());

const handleExpand = async (rowId: string) => {
  if (expandedRows.has(rowId)) {
    // Collapse: just remove from expanded set
    const newExpanded = new Set(expandedRows);
    newExpanded.delete(rowId);
    setExpandedRows(newExpanded);
  } else {
    // Expand: fetch child data if not cached
    if (!childDataCache.has(rowId) && onDrillDown) {
      setLoadingRows(new Set([...loadingRows, rowId]));
      try {
        const children = await onDrillDown(rowId);
        setChildDataCache(new Map(childDataCache.set(rowId, children)));
      } catch (error) {
        console.error('Failed to fetch child data:', error);
      } finally {
        setLoadingRows(new Set([...loadingRows].filter(id => id !== rowId)));
      }
    }
    const newExpanded = new Set(expandedRows);
    newExpanded.add(rowId);
    setExpandedRows(newExpanded);
  }
};

const handleDoubleClick = (row: CubeRow) => {
  if (row.hasChildren) {
    handleExpand(row.id);
  }
};
```

---

#### Component 4: Enhanced `FinancialTable.tsx` (Update Existing)
**Purpose:** Add drill-down to Budget/P&L tables
**Location:** `frontend/src/components/FinancialTable.tsx` (modify existing)

**New Features:**
- Similar drill-down as CubeGrid
- Fetch child accounts when expanding
- Double-click support

**New Props:**
```typescript
interface FinancialTableProps {
  data: FinancialRow[];
  title?: string;
  showExport?: boolean;
  columns?: ColumnDef<FinancialRow>[];
  onDrillDown?: (parentId: string) => Promise<FinancialRow[]>; // NEW
}
```

---

### **Phase 2: Backend API Support for Drill-Down**

#### New Backend Endpoints Needed:

**1. Revenue Hierarchy Drill-Down:**
```python
# backend/api/revenue_cube.py
@router.get("/revenue/drill-down")
async def get_revenue_drill_down(
    parent_id: str,
    level: str,  # 'category' | 'family' | 'line'
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get child elements for hierarchical drill-down
    """
    # Query child products/customers based on parent_id
    # Return child records with next level of detail
```

**2. Workforce Hierarchy Drill-Down:**
```python
# backend/api/workforce.py
@router.get("/workforce/drill-down")
async def get_workforce_drill_down(
    parent_id: str,
    level: str,  # 'department' | 'cost_center' | 'employee'
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get child elements for department/employee hierarchy
    """
```

**3. Budget Account Hierarchy Drill-Down:**
```python
# backend/api/budget_forecast.py
@router.get("/budget/accounts/drill-down")
async def get_budget_account_drill_down(
    parent_account_id: str,
    year: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Get child accounts for account hierarchy
    Example: Revenue → Operating Revenue → Product Revenue
    """
```

---

### **Phase 3: Page-by-Page Integration**

#### **Page 1: Executive Overview** (Dashboard)
**Changes Required:**
1. ✅ Add Export to Excel for FinancialTable
2. ❌ No pivot needed (dashboard page)
3. ❌ No drill-down needed (summary KPIs only)

**Implementation:**
```typescript
// Update ExecutiveOverview.tsx:
import { exportToExcel } from '../utils/exportToExcel';

const handleExport = () => {
  exportToExcel({
    data: financialTableData,
    fileName: 'Executive_Overview',
    sheetName: 'Summary'
  });
};

<FinancialTable 
  data={financialTableData} 
  showExport={true}
  onExport={handleExport}
/>
```

**Estimated Changes:** 1 file, ~10 lines

---

#### **Page 2: Revenue Planning**
**Changes Required:**
1. ✅ Add Export to Excel for CubeGrid
2. ✅ Add Pivot Dialog functionality
3. ✅ Add drill-down from Product Category → Family → Line
4. ✅ Add double-click drill-down

**Implementation:**
```typescript
// Update RevenuePlanning.tsx:

// 1. Add state for pivot configuration
const [pivotConfig, setPivotConfig] = useState<PivotConfig>({
  rowDimensions: ['Product'],
  columnDimensions: ['Time'],
  measures: ['Revenue', 'Cost', 'Margin']
});
const [showPivotDialog, setShowPivotDialog] = useState(false);

// 2. Export handler
const handleExport = () => {
  exportToExcel({
    data: cubeData,
    fileName: 'Revenue_Planning',
    sheetName: 'Revenue Cube',
    columnHeaders: ['Dimension', ...measureColumns]
  });
};

// 3. Pivot handler
const handlePivotApply = (config: PivotConfig) => {
  setPivotConfig(config);
  setShowPivotDialog(false);
  // Re-fetch data with new pivot configuration
  loadData();
};

// 4. Drill-down handler
const handleDrillDown = async (parentId: string): Promise<CubeRow[]> => {
  try {
    // Determine current level and fetch next level
    const response = await api.get('/api/revenue/drill-down', {
      params: { parent_id: parentId, level: 'family', year: filters.year }
    });
    return response.data.data.map((record: any) => ({
      id: record.id,
      rowLabel: record.name,
      indent: 1,
      hasChildren: record.has_children,
      Revenue: record.revenue,
      Cost: record.cost,
      Margin: record.margin,
    }));
  } catch (error) {
    console.error('Drill-down failed:', error);
    return [];
  }
};

// 5. Update CubeGrid props
<CubeGrid
  data={cubeData}
  measureColumns={['Revenue', 'Cost', 'Quantity', 'Margin', 'Margin %']}
  title="Revenue Cube View"
  onRefresh={loadData}
  onExport={handleExport}
  onPivot={() => setShowPivotDialog(true)}
  onDrillDown={handleDrillDown}
/>

// 6. Add PivotDialog
<PivotDialog
  isOpen={showPivotDialog}
  onClose={() => setShowPivotDialog(false)}
  availableDimensions={['Time', 'Product', 'Customer', 'Region', 'Entity']}
  currentRowDimensions={pivotConfig.rowDimensions}
  currentColumnDimensions={pivotConfig.columnDimensions}
  availableMeasures={['Revenue', 'Cost', 'Quantity', 'Margin', 'Margin %']}
  selectedMeasures={pivotConfig.measures}
  onApply={handlePivotApply}
/>
```

**Estimated Changes:** 1 file, ~80 lines

---

#### **Page 3: Workforce Planning**
**Changes Required:**
1. ✅ Add Export to Excel for CubeGrid
2. ✅ Add Pivot Dialog functionality
3. ✅ Add drill-down from Department → Cost Center → Employee
4. ✅ Add double-click drill-down

**Implementation:**
```typescript
// Similar to Revenue Planning but with workforce hierarchy
const handleDrillDown = async (parentId: string): Promise<CubeRow[]> => {
  const response = await api.get('/api/workforce/drill-down', {
    params: { parent_id: parentId, level: 'cost_center', year: filters.year }
  });
  return response.data.data.map((record: any) => ({
    id: record.id,
    rowLabel: record.name,
    indent: 1,
    hasChildren: record.has_children,
    Headcount: record.headcount,
    'Base Salary': record.base_salary,
    Bonus: record.bonus,
    'Total Compensation': record.total_compensation,
  }));
};
```

**Estimated Changes:** 1 file, ~80 lines

---

#### **Page 4: CFO Budgeting**
**Changes Required:**
1. ✅ Add Export to Excel for FinancialTable
2. ❌ No pivot needed (financial statement format)
3. ✅ Add drill-down from Account Category → Account Type → Account Line
4. ✅ Add double-click drill-down

**Implementation:**
```typescript
// Update CFOBudgeting.tsx:

const handleExport = () => {
  exportToExcel({
    data: budgetData,
    fileName: 'CFO_Budgeting',
    sheetName: 'Budget',
    columnHeaders: ['Account', 'Actual', 'Budget', 'Forecast', 'Variance', 'Variance %']
  });
};

const handleDrillDown = async (parentId: string): Promise<FinancialRow[]> => {
  const response = await api.get('/api/budget/accounts/drill-down', {
    params: { parent_account_id: parentId, year: filters.year }
  });
  return response.data.data.map((record: any) => ({
    id: record.account_id,
    label: record.account_name,
    actual: record.actual,
    budget: record.budget,
    forecast: record.forecast,
    variance: record.variance,
    variancePercent: record.variance_percent,
    indent: 1,
    hasChildren: record.has_children,
  }));
};

<FinancialTable
  data={budgetData}
  title="Budget Overview"
  showExport={true}
  onExport={handleExport}
  onDrillDown={handleDrillDown}
/>
```

**Estimated Changes:** 1 file, ~50 lines

---

## Implementation Order (Step-by-Step)

### **Step 1: Install Dependencies**
```bash
cd frontend
npm install xlsx @types/xlsx
```

### **Step 2: Create Export Component**
1. Create `frontend/src/utils/exportToExcel.ts` (utility function)
2. Test export with sample data
3. Integrate into all 4 pages

### **Step 3: Create Pivot Dialog Component**
1. Create `frontend/src/components/PivotDialog.tsx`
2. Add drag-and-drop functionality
3. Test with mock data
4. Integrate into Revenue Planning & Workforce Planning

### **Step 4: Enhance CubeGrid Component**
1. Update `CubeGrid.tsx` with drill-down props
2. Add `onDrillDown` async function handler
3. Implement expand/collapse with data fetching
4. Add double-click support
5. Add loading state for drill-down

### **Step 5: Enhance FinancialTable Component**
1. Update `FinancialTable.tsx` with drill-down props
2. Similar drill-down logic as CubeGrid
3. Add double-click support

### **Step 6: Create Backend Drill-Down Endpoints**
1. Revenue drill-down endpoint
2. Workforce drill-down endpoint
3. Budget account drill-down endpoint
4. Test with Swagger UI

### **Step 7: Integrate Page 2 (Revenue Planning)**
1. Add export handler
2. Add pivot dialog
3. Add drill-down handler
4. Test all features

### **Step 8: Integrate Page 3 (Workforce Planning)**
1. Add export handler
2. Add pivot dialog
3. Add drill-down handler
4. Test all features

### **Step 9: Integrate Page 4 (CFO Budgeting)**
1. Add export handler
2. Add drill-down handler
3. Test all features

### **Step 10: Integrate Page 1 (Executive Overview)**
1. Add export handler for FinancialTable
2. Test export

---

## Testing Checklist

After implementation, verify these features on each page:

### **Revenue Planning (Page 2):**
- [ ] Click Export → Downloads Excel file with revenue data
- [ ] Click Pivot → Opens dialog with dimension selection
- [ ] Apply pivot → Data rearranges correctly
- [ ] Click expand icon → Fetches child products
- [ ] Double-click row → Expands to show children
- [ ] Collapse icon → Hides children
- [ ] Multi-level expand (Category → Family → Line)

### **Workforce Planning (Page 3):**
- [ ] Click Export → Downloads Excel file with workforce data
- [ ] Click Pivot → Opens dialog
- [ ] Apply pivot → Data rearranges
- [ ] Expand Department → Shows Cost Centers
- [ ] Expand Cost Center → Shows Employees
- [ ] Double-click drill-down works
- [ ] Collapse works

### **CFO Budgeting (Page 4):**
- [ ] Click Export → Downloads Excel file with budget data
- [ ] Expand account category → Shows account types
- [ ] Expand account type → Shows line items
- [ ] Double-click drill-down works
- [ ] Collapse works

### **Executive Overview (Page 1):**
- [ ] Click Export on FinancialTable → Downloads Excel file

---

## Estimated Effort

| Task | Files | Lines of Code | Effort |
|------|-------|---------------|--------|
| Export component | 1 | ~100 | 2 hours |
| Pivot dialog component | 1 | ~200 | 4 hours |
| Enhance CubeGrid | 1 | ~150 | 3 hours |
| Enhance FinancialTable | 1 | ~100 | 2 hours |
| Backend drill-down APIs | 3 | ~300 | 4 hours |
| Page 2 integration | 1 | ~80 | 2 hours |
| Page 3 integration | 1 | ~80 | 2 hours |
| Page 4 integration | 1 | ~50 | 1 hour |
| Page 1 integration | 1 | ~10 | 0.5 hours |
| Testing & bug fixes | - | - | 4 hours |
| **TOTAL** | **11 files** | **~1,070 lines** | **24.5 hours** |

---

## Summary

This document provides a complete implementation plan for all missing interactive features across Pages 1-4. The approach is:

1. **Build reusable components first** (Export, Pivot Dialog)
2. **Enhance existing components** (CubeGrid, FinancialTable) with drill-down
3. **Create backend API endpoints** for hierarchical data
4. **Integrate page-by-page** starting with most complex (Revenue Planning)
5. **Test thoroughly** using checklist

Once completed, all buttons and features described in the page instructions will be fully functional! 🎉
