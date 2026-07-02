# TM1 Interview Preparation Guide
## Comprehensive Q&A and Study Points

---

## 🎯 CORE TM1 CONCEPTS

### What is TM1?
**Answer:** TM1 (now IBM Planning Analytics) is an in-memory multidimensional OLAP (Online Analytical Processing) database designed specifically for:
- **Budgeting & Planning**: Multi-year budgeting with scenario analysis
- **Forecasting**: Rolling forecasts and predictive analytics
- **Analytics**: Real-time data analysis across multiple dimensions
- **Writeback Capabilities**: Users can input and modify data directly

**Key Points to Mention:**
- In-memory architecture = faster calculations
- Multidimensional = data organized by dimensions like Time, Account, Department
- Built for financial planning, not just reporting

---

### Why Do Companies Use TM1?

**Answer:** Companies choose TM1 over Excel/SQL for several critical reasons:

1. **Multi-user Collaboration**: Multiple users can work simultaneously without version conflicts
2. **Data Integrity**: Single source of truth with controlled access
3. **Complex Calculations**: Handles intricate business rules and allocations
4. **What-if Analysis**: Real-time scenario planning without breaking original data
5. **Audit Trail**: Tracks who changed what and when
6. **Scalability**: Handles millions of cells efficiently
7. **Integration**: Connects to SQL Server, Oracle, SAP, Excel, and more

**Excel Limitations TM1 Solves:**
- No version control (file_v1, file_final, file_final2)
- Breaks with large datasets
- Formula errors propagate
- No security at cell level
- Poor audit capabilities

---

### What is OLAP (Online Analytical Processing)?

**Answer:** OLAP is a technology for analyzing multi-dimensional data quickly. 

**Key Characteristics:**
- **Fast Query Response**: Pre-aggregated data for instant results
- **Multi-dimensional**: Data viewed across multiple business dimensions
- **Slice & Dice**: Filter and analyze data from different angles
- **Drill-down/Drill-up**: Navigate from summary to detail

**OLAP vs OLTP (Transaction Processing):**
- OLTP: SQL Server - optimized for INSERT/UPDATE (thousands of small transactions)
- OLAP: TM1 - optimized for SELECT/ANALYZE (complex analytical queries)

---

## 📊 DIMENSIONS & HIERARCHIES

### What is a Dimension?

**Answer:** A dimension is a collection of related business elements used to organize and analyze data in a TM1 Cube.

**Common Dimensions:**
- **Account**: Revenue, Expenses, Assets, Liabilities
- **Time**: Years, Quarters, Months, Days
- **Department**: Sales, Marketing, IT, HR
- **Version**: Actual, Budget, Forecast, Last Year
- **Scenario**: Best Case, Worst Case, Most Likely
- **Product**: Product lines, categories, SKUs
- **Geography**: Region, Country, State, City

**Think of it as:** Each dimension is like a column header in SQL, but with hierarchies built in.

---

### What is a Hierarchy?

**Answer:** A hierarchy is the parent-child structure within a dimension that defines how elements roll up.

**Example - Geography Hierarchy:**
```
All Geography (Top Consolidation)
├── North America
│   ├── USA
│   │   ├── California
│   │   └── Texas
│   └── Canada
│       ├── Ontario
│       └── Quebec
└── Europe
    ├── UK
    └── Germany
```

**Key Points:**
- TM1 supports **multiple hierarchies** in one dimension
- Same elements can exist in different hierarchies
- Rollups are automatic based on weights

---

### What is a Consolidation?

**Answer:** A consolidation is a parent element that aggregates values from its child elements.

**Example:**
```
Total Revenue (Consolidation)
├── Product Revenue (Consolidation)
│   ├── Product A Sales (Leaf)
│   └── Product B Sales (Leaf)
└── Service Revenue (Consolidation)
    ├── Consulting Revenue (Leaf)
    └── Support Revenue (Leaf)
```

**Consolidation Weights:**
- Positive weight (+1): Adds to parent
- Negative weight (-1): Subtracts from parent
- Example: `Profit = Revenue (+1) + Expenses (-1)`

---

### What is an Element?

**Answer:** An element is the smallest member inside a dimension. It's equivalent to a row in a SQL table.

**Types of Elements:**
1. **N-Level (Numeric/Leaf)**: Stores actual data values
2. **C-Level (Consolidated)**: Calculated by rolling up children
3. **S-Level (String)**: Stores text attributes

**SQL Analogy:**
- SQL Row = TM1 Element
- SQL Column = TM1 Dimension

---

### What is an Attribute?

**Answer:** Attributes are metadata properties attached to dimension elements for additional context.

**Example - Employee Dimension Attributes:**
```
Element: John Smith
├── Department: Sales
├── Region: West
├── Job Title: Manager
├── Salary: 85000
└── Hire Date: 2020-01-15
```

**Uses:**
- Filtering in reports
- Conditional logic in rules
- User security assignments
- Sorting and grouping

---

### What is a Multiple Hierarchy?

**Answer:** Multiple hierarchies allow the same dimension elements to be organized in different aggregation structures without duplicating data.

**Example - Employee Dimension:**

**Hierarchy 1 - By Department:**
```
All Employees
├── Sales
│   ├── John Smith
│   └── Mary Johnson
└── IT
    └── Bob Wilson
```

**Hierarchy 2 - By Region:**
```
All Employees
├── East Region
│   ├── John Smith
│   └── Bob Wilson
└── West Region
    └── Mary Johnson
```

**Same elements, different rollups - no data duplication!**

---

## 🧊 CUBES

### What is a Cube?

**Answer:** A cube is a multidimensional structure that combines dimensions to store business data.

**Think of it as:** A SQL table on steroids with built-in hierarchies and calculations.

**Example - P&L Cube:**
```
Dimensions:
1. Account (Revenue, Expenses, Profit)
2. Time (Years, Quarters, Months)
3. Department (Sales, IT, HR)
4. Version (Actual, Budget, Forecast)
5. Scenario (Base, Optimistic, Pessimistic)
```

**Cube Size = Dimension1 × Dimension2 × ... × DimensionN**

---

### What is a Cell?

**Answer:** A cell is the intersection point of elements from each dimension in a cube where actual data is stored.

**Example Cell Address:**
```
Account: Revenue
Time: Jan 2026
Department: Sales
Version: Actual
Scenario: Base
→ Cell Value: $500,000
```

**Key Concept:** TM1 is **sparse** - it only stores cells with data, not every possible combination.

---

### Difference Between SQL Table and Cube?

**SQL Table:**
- 2-dimensional (Rows × Columns)
- Requires JOINs for multi-dimensional analysis
- Each row is independent
- No built-in hierarchies
- No automatic calculations

**TM1 Cube:**
- N-dimensional (up to 256 dimensions)
- All relationships pre-defined
- Automatic hierarchical rollups
- Built-in calculations via Rules
- Sparse storage (only stores populated cells)

---

## 🔄 DATA LOADING & ETL

### What is Turbo Integrator (TI)?

**Answer:** Turbo Integrator is TM1's built-in ETL (Extract, Transform, Load) engine for:
- Loading data from external sources (SQL, Excel, CSV, ODBC)
- Creating and updating dimensions
- Populating cubes with data
- Automating data workflows

---

### TI Process Architecture (4 Tabs):

**1. PROLOG**
- Runs **first**, only **once**
- Use for: Database connections, variable initialization, parameter validation
- Example:
```
# Connect to SQL Server
vServer = 'localhost';
vDatabase = 'FinanceDB';
vQuery = 'SELECT * FROM Actuals';
```

**2. METADATA**
- Runs **for each row** during dimension processing
- Use for: Creating dimension elements, building hierarchies
- Example:
```
# Create Account dimension elements
IF (vAccount @<> '');
  DimensionElementInsert('Account', '', vAccount, 'N');
ENDIF;
```

**3. DATA**
- Runs **for each row** during data loading
- Use for: Loading values into cubes
- Example:
```
# Load actuals into cube
CellPutN(vAmount, 'Financials', vAccount, vMonth, vDept, 'Actual');
```

**4. EPILOG**
- Runs **last**, only **once**
- Use for: Cleanup, logging, running next process, sending notifications
- Example:
```
# Log completion
TextOutput('LoadLog.txt', 'Process completed: ' | Now());
```

---

### How Would You Load Actuals from SQL Server into TM1?

**Answer - Step-by-Step Process:**

**Step 1: Create Data Source**
- Data Source Type: ODBC
- Connection String: SQL Server connection details
- Query: `SELECT AccountCode, Month, Department, Amount FROM ActualsTable`

**Step 2: Map Variables**
- AccountCode → vAccount
- Month → vMonth
- Department → vDept
- Amount → vAmount

**Step 3: PROLOG Tab**
```
# Initialize parameters
vCubeName = 'Financials';
vVersion = 'Actual';
vRowCount = 0;
```

**Step 4: DATA Tab**
```
# Load each row into cube
CellPutN(vAmount, vCubeName, vAccount, vMonth, vDept, vVersion);
vRowCount = vRowCount + 1;
```

**Step 5: EPILOG Tab**
```
# Log results
TextOutput('LoadLog.txt', 'Loaded ' | NumberToString(vRowCount) | ' records');
```

---

### Incremental Load vs Full Load?

**Answer:**

**FULL LOAD:**
- Deletes all existing data
- Loads complete dataset from source
- **Pros:** Ensures data accuracy, simple logic
- **Cons:** Slow for large datasets, overwrites manual adjustments
- **Use when:** Monthly close, dimension rebuild, initial setup

**INCREMENTAL LOAD:**
- Only loads changed/new records
- Keeps existing data intact
- **Pros:** Fast, preserves manual entries
- **Cons:** Complex logic, requires change tracking
- **Use when:** Daily actuals, real-time updates

**Implementation:**
```
# Incremental approach
IF (vLoadDate >= vLastLoadDate);
  CellPutN(vAmount, 'Cube', vAccount, vMonth);
ENDIF;
```

---

### Reconciliation Process?

**Answer:** Reconciliation ensures data loaded into TM1 matches the source system.

**Steps:**
1. **Count Records**: Source count vs TM1 loaded count
2. **Sum Totals**: Compare total amounts
3. **Key Figures**: Validate critical accounts (Total Revenue, Net Profit)
4. **Exception Report**: Identify mismatches

**TI Code Example:**
```
# EPILOG - Reconciliation
vTM1Total = CellGetN('Financials', 'Total', 'Jan', 'All Depts', 'Actual');
vSQLTotal = 1500000; # From SQL query
vVariance = vTM1Total - vSQLTotal;

IF (vVariance <> 0);
  TextOutput('Recon.txt', 'Variance: ' | NumberToString(vVariance));
ENDIF;
```

---

### Slowly Changing Dimensions?

**Answer:** Handles dimension attributes that change over time.

**Example:** Employee changes department from Sales to Marketing

**Type 1 (Overwrite):**
- Update attribute, lose history
- Simple, no history tracking

**Type 2 (Add New Row):**
- Create new element version: Employee_V1, Employee_V2
- Maintains full history
- More complex

**Type 3 (Add New Column):**
- Store current + previous value
- Limited history (usually 1 prior value)

**TM1 Approach:**
```
# Update attribute
AttrPutS('Marketing', 'Employee', 'John Smith', 'Department');
# Or create time-versioned dimension with effective dates
```

---

## 🔒 SECURITY & ACCESS CONTROL

### How Would You Restrict Department Managers?

**Answer:** Use TM1 Security to restrict data access by dimension element.

**Steps:**
1. **Create Security Group**: "Department_Sales_Managers"
2. **Assign Users**: Add sales managers to group
3. **Set Cube Security**: Read/Write access to Financials cube
4. **Set Dimension Security**:
   - Department: Read access to "Sales" only
   - Account: Read all
   - Time: Read all
   - Version: Read/Write "Budget", Read-only "Actual"

**Result:** Sales managers can only see and edit Sales department data.

---

### How Would You Restrict Users by Department?

**Answer:** 

**Method 1 - Element Security:**
```
Department Dimension Security:
├── All Departments (ADMIN: WRITE, Others: NONE)
├── Sales (Sales_Group: WRITE)
├── Marketing (Marketing_Group: WRITE)
└── IT (IT_Group: WRITE)
```

**Method 2 - Attribute-Based Security:**
- Create User attribute on Employee dimension
- Use attribute to filter accessible departments
- Dynamic security based on login

**Best Practice:** Use security groups, not individual users!

---

## 📐 RULES & CALCULATIONS

### Rules vs Feeders - Complete Comparison

| Aspect | **RULES** | **FEEDERS** |
|--------|-----------|-------------|
| **Purpose** | Define **HOW** to calculate values | Define **WHICH** cells to calculate |
| **Analogy** | The calculation formula | The trigger that activates the formula |
| **When Executed** | When cell is read/accessed | During data load/write operations |
| **Syntax Example** | `['Profit'] = N: ['Revenue'] - ['Expenses'];` | `['Revenue'] => ['Profit'];` |
| **Performance Impact** | Can slow down if complex | Improves performance by limiting calculations |
| **Required?** | Yes, for calculated values | Yes, or rules won't execute |
| **Storage** | Virtual (not stored) | Metadata (stored in memory map) |
| **User Visibility** | Users see calculated results | Users never see feeders (internal) |

---

### TM1 Rules vs Your Portal Implementation

| **TM1 Concept** | **TM1 Example** | **Your Portal Implementation** | **Your Code Example** |
|-----------------|-----------------|--------------------------------|----------------------|
| **Rules** | Calculate Profit from Revenue - Expenses | SQL Views, Calculated fields, Backend API logic | `SELECT Revenue - Expenses AS Profit` |
| **Feeders** | Tell TM1 which cells need calculation | Database triggers, Indexes, Materialized views | `CREATE INDEX idx_account ON financials(account)` |
| **Consolidations** | Automatic hierarchy rollups | SQL GROUP BY with hierarchical CTEs | `WITH RECURSIVE hierarchy AS (...)` |
| **Cell Calculations** | `['Gross Margin %'] = N: ['Profit'] / ['Revenue'] * 100;` | Backend service calculations | `gross_margin_pct = (profit / revenue) * 100 if revenue != 0 else 0` |
| **Conditional Rules** | `IF(['Version'] @= 'Forecast', ...);` | Python conditional logic | `if version == 'Forecast': calculate_forecast()` |
| **Cross-dimensional Calc** | `['Budget'] = ['Actual'] * 1.1;` | API endpoints with dimension filters | `budget_value = actual_value * 1.1` |

---

### What are Feeders?

**Answer:** Feeders tell TM1 which cells need calculation to optimize performance.

**Problem:** TM1 calculates only "fed" cells to save memory.

**Without Feeders:**
```
# Rule: Calculate Profit
['Profit'] = N: ['Revenue'] - ['Expenses'];
```
- If no feeder, Profit shows as ZERO even if Revenue/Expenses exist!

**With Feeders:**
```
# Feeder section
['Revenue'] => ['Profit'];
['Expenses'] => ['Profit'];
```
- This "feeds" the Profit cell so TM1 knows to calculate it

**Simple Rule:** For every rule calculation, create a corresponding feeder.

---

### Detailed Comparison: Rules vs Feeders

Think of it like a restaurant:

| Restaurant Analogy | TM1 Equivalent |
|-------------------|----------------|
| **Recipe** (how to make a dish) | **Rule** (how to calculate) |
| **Order** (triggers the kitchen) | **Feeder** (triggers the rule) |
| **Cooked Food** | **Calculated Value** |

**Without Feeder:** You have a recipe, but the kitchen doesn't know to cook it!  
**With Feeder:** Order placed → Kitchen triggered → Food prepared

---

### Rules vs Feeders - Practical Examples

**Example 1: Simple Profit Calculation**

```
# RULE (Defines the calculation)
['Profit'] = N: ['Revenue'] - ['Expenses'];

# FEEDERS (Tells TM1 when to calculate)
['Revenue'] => ['Profit'];
['Expenses'] => ['Profit'];
```

**What This Means:**
- If Revenue is entered → Feeder triggers → Profit calculates
- If Expenses is entered → Feeder triggers → Profit calculates
- Without feeders → Profit shows 0, even if Revenue/Expenses have values!

---

**Example 2: Multi-Level Calculation**

```
# RULES
['Gross Profit'] = N: ['Revenue'] - ['COGS'];
['Net Profit'] = N: ['Gross Profit'] - ['Operating Expenses'];
['Profit Margin %'] = N: ['Net Profit'] / ['Revenue'] * 100;

# FEEDERS
['Revenue'] => ['Gross Profit'], ['Profit Margin %'];
['COGS'] => ['Gross Profit'];
['Gross Profit'] => ['Net Profit'];
['Operating Expenses'] => ['Net Profit'];
['Net Profit'] => ['Profit Margin %'];
```

**Feeder Chain:** Revenue changes → Feeds Gross Profit → Feeds Net Profit → Feeds Margin %

---

**Example 3: Conditional Calculation**

```
# RULE (Only forecast gets uplift)
['Forecast'] = N: 
  IF(['Month'] @= 'Jan' % ['Month'] @= 'Feb',
    ['Actual'] * 1.2,
    ['Actual'] * 1.1
  );

# FEEDER
['Actual'] => DB('CubeName', 'Forecast', !Time, !Department);
```

**Explanation:**
- Rule: Forecast = Actual * growth factor (20% for Jan/Feb, 10% others)
- Feeder: When Actual changes, recalculate Forecast for all Time/Department combinations

---

### How Your Portal Achieves Similar Results

**Your Tech Stack vs TM1:**

| **TM1 Feature** | **Your Portal Equivalent** | **Benefits in Your Approach** |
|----------------|----------------------------|-------------------------------|
| **Rules Engine** | FastAPI backend services + SQL views | More flexible, easier to debug |
| **Feeders** | Database indexes + cached queries | Standard SQL optimization |
| **Cell Calculations** | Python functions in services | Full programming language power |
| **Real-time Calc** | API endpoints with computed fields | RESTful, modern architecture |
| **Security** | JWT tokens + role-based access | Industry-standard security |
| **Multi-user** | Async FastAPI + connection pooling | Scalable web architecture |

**Example from Your Code:**

```python
# Your Portal: backend/services/finance_service.py
def calculate_profit(revenue: float, expenses: float) -> float:
    """
    TM1 Rule Equivalent: ['Profit'] = N: ['Revenue'] - ['Expenses'];
    """
    return revenue - expenses

def get_financial_data(filters: dict):
    """
    TM1 Feeder Equivalent: Determines which data to calculate
    """
    # SQL with calculated columns (like rules)
    query = """
    SELECT 
        account,
        time_period,
        department,
        amount,
        CASE 
            WHEN account = 'Profit' THEN 
                (SELECT SUM(amount) WHERE account = 'Revenue') -
                (SELECT SUM(amount) WHERE account = 'Expenses')
            ELSE amount
        END as calculated_amount
    FROM financials
    WHERE ...
    """
    return execute_query(query)
```

**Your Portal's "Feeder" Equivalent:**
- **Database Indexes**: Make queries fast (like feeders optimize TM1)
- **Materialized Views**: Pre-calculated aggregations
- **Caching**: Store frequently accessed calculations
- **Lazy Loading**: Only calculate what's displayed (like sparse TM1 cubes)

---

### Interview Talking Points

**When Asked:** "Explain Rules and Feeders"

**Your Answer:**
"Rules define calculation logic, like 'Profit = Revenue - Expenses'. Feeders tell TM1 which cells need those calculations to run. Without feeders, rules won't execute and you'll see zeros.

In my portal project, I implemented similar concepts using:
- **Rules → SQL calculated columns and Python service functions** for business logic
- **Feeders → Database indexes and query optimization** to ensure calculations run efficiently

For example, when a user views P&L data, my backend service:
1. Queries base data (like TM1 accessing fed cells)
2. Applies calculation logic (like TM1 rules)
3. Returns computed results (like TM1 calculated cells)

The key difference is TM1 does this in-memory with its specialized engine, while I use standard SQL/Python, but the conceptual approach is the same."

---

Without TI, TM1 can still work as a planning and reporting cube, but data refresh becomes manual or dependent on external tools.

### Common Interview Questions

**Q: Why do feeders exist? Why not just calculate everything?**

**A:** Memory and performance! If TM1 calculated every possible cell combination:
- A 5-dimension cube with 1000 elements each = 1 trillion cells
- Even if 99.99% are zero (sparse), calculating all would be impossible
- Feeders create a "calculation map" - only compute what's needed
- Like Google Maps: it doesn't calculate every possible route, only when you search

**Your Portal Equivalent:** You don't pre-calculate every aggregation - you compute on-demand based on user filters (like feeders triggering rules).

---

**Q: What happens if you forget a feeder?**

**A:** The rule exists but won't execute - cell shows as 0 or empty.

**Example:**
```
# Rule exists
['Profit'] = N: ['Revenue'] - ['Expenses'];

# But feeder missing!
# ['Revenue'] => ['Profit'];  ← FORGOT THIS!

# Result: Profit shows 0, even when Revenue/Expenses have data
```

**How to Debug:**
1. Check if feeder exists for the rule
2. Use TM1 trace/logging
3. Test with FEEDERS ON vs FEEDERS OFF

**Your Portal Equivalent:** Missing index on filtered column → slow queries (like missing feeder → wrong results)

---

### Visual: How Rules and Feeders Work Together

```
USER ENTERS DATA
      ↓
[Revenue Cell] = $1000
      ↓
FEEDER FIRES: ['Revenue'] => ['Profit'];
      ↓
TM1 MARKS: "Profit cell needs calculation"
      ↓
USER OPENS REPORT (reads Profit cell)
      ↓
RULE EXECUTES: ['Profit'] = N: ['Revenue'] - ['Expenses'];
      ↓
TM1 CALCULATES: $1000 - $500 = $500
      ↓
DISPLAY: Profit = $500
```

**Without Feeder:**
```
USER ENTERS DATA
      ↓
[Revenue Cell] = $1000
      ↓
NO FEEDER ❌
      ↓
TM1 DOESN'T KNOW: "Profit needs calculation"
      ↓
USER OPENS REPORT
      ↓
RULE NEVER EXECUTES
      ↓
DISPLAY: Profit = 0 ❌ WRONG!
```

---

### Your Portal Architecture - Side by Side

**TM1 Data Flow:**
```
SQL Database (Actuals)
      ↓
Turbo Integrator Process
      ↓
TM1 Cube (in-memory)
      ↓
Rules Calculate Values
      ↓
Feeders Optimize Performance
      ↓
PAW/PAX Display Results
```

**Your Portal Data Flow:**
```
SQL Database (Actuals)
      ↓
FastAPI Backend Services
      ↓
SQL Views + Python Functions
      ↓
Computed Fields (like Rules)
      ↓
Indexes/Caching (like Feeders)
      ↓
React Frontend Display
```

**Key Insight for Interview:**
"My portal demonstrates that I understand the **conceptual architecture** of TM1, even though I'm implementing it with modern web technologies. The business logic is the same - only the technical implementation differs."

---

### Code Example: Your Portal vs TM1

**TM1 Implementation:**
```
# TM1 Rule
['Gross Profit'] = N: ['Revenue'] - ['COGS'];
['Gross Margin %'] = N: (['Gross Profit'] / ['Revenue']) * 100;

# TM1 Feeders
['Revenue'] => ['Gross Profit'], ['Gross Margin %'];
['COGS'] => ['Gross Profit'];
['Gross Profit'] => ['Gross Margin %'];
```

**Your Portal Implementation:**
```python
# backend/services/finance_service.py

def get_financial_metrics(filters: dict) -> dict:
    """
    Equivalent to TM1 Rules + Feeders working together
    """
    # Base query (like TM1 cube data)
    query = """
    SELECT 
        account,
        SUM(amount) as amount
    FROM financials
    WHERE department = :dept
      AND time_period = :period
    GROUP BY account
    """
    
    results = execute_query(query, filters)
    
    # Apply business rules (equivalent to TM1 Rules)
    revenue = results.get('Revenue', 0)
    cogs = results.get('COGS', 0)
    
    # Calculate derived metrics
    gross_profit = revenue - cogs  # Rule #1
    gross_margin_pct = (gross_profit / revenue * 100) if revenue != 0 else 0  # Rule #2
    
    # Return calculated data (like TM1 displaying fed+calculated cells)
    return {
        'Revenue': revenue,
        'COGS': cogs,
        'Gross Profit': gross_profit,  # Calculated
        'Gross Margin %': gross_margin_pct  # Calculated
    }
```

**What You Can Say in Interview:**
"In TM1, feeders ensure the rules execute efficiently. In my portal, I achieve the same outcome using:
- **Database indexes** (fast data retrieval, like feeders marking cells)
- **Computed fields** (calculation logic, like rules)
- **Lazy evaluation** (calculate only what's requested, like TM1's sparse calculation)

Both approaches solve the same problem: **efficiently calculating derived metrics from base data**."

---

### What is SKIPCHECK?

**Answer:** SKIPCHECK mode disables feeder checking for faster calculations during bulk loads.

**Usage:**
```
# Turn off feeder checking
CellPutN(1000, 'Cube', 'Revenue', 'Jan');
CellSkipCheck;
# Load thousands of cells...
CellCheckSet;
```

**When to Use:**
- Large data loads
- Batch processing
- Initial cube population

**Warning:** Can cause incorrect results if used improperly!

---

### Quick Reference: Rules vs Feeders Cheat Sheet

| **Question** | **Rules** | **Feeders** |
|-------------|-----------|-------------|
| What is it? | Calculation formula | Calculation trigger |
| Example syntax | `['Profit'] = ['Rev'] - ['Exp'];` | `['Rev'] => ['Profit'];` |
| Runs when? | When cell is read | When data is written |
| Visible to users? | Yes (see results) | No (internal only) |
| Forget to add? | No calculation logic | Calculation never runs = 0 |
| Debugging tip | Check syntax, test logic | Trace feeder chains |
| Performance | Complex rules slow reads | Missing feeders = wrong results |
| Your portal equivalent | Python functions, SQL views | Database indexes, caching |

**Remember:** Rules = **WHAT** to calculate | Feeders = **WHEN** to calculate

---

## 🔧 YOUR PORTAL: ACTUAL IMPLEMENTATION

### What Rules Are Implemented in Your Portal?

Your portal has implemented **multiple types of business rules** that are equivalent to TM1 Rules:

#### **1. Financial Statement Calculations (P&L Rules)**

**Location:** `backend/services/finance_service.py`

```python
# TM1 Rule Equivalent: ['Gross Profit'] = ['Revenue'] - ['Expenses']
summary = {
    "total_revenue": revenue,
    "total_expenses": expenses,
    "gross_profit": revenue - expenses,                              # RULE #1
    "net_income": net_income,
    "net_margin_percent": (net_income / revenue * 100) if revenue > 0 else 0  # RULE #2
}
```

**TM1 Equivalent:**
```
['Gross Profit'] = N: ['Revenue'] - ['Expenses'];
['Net Margin %'] = N: ['Net Income'] / ['Revenue'] * 100;
```

---

#### **2. Dashboard Aggregation Rules**

**Location:** `backend/services/dashboard_service.py`

```python
# TM1 Rule Equivalent: Multi-cube aggregations
total_revenue = float(rev.TotalRevenue) if rev else 0
total_cost    = float(rev.TotalCost)    if rev else 0
total_margin  = float(rev.TotalMargin)  if rev else 0
margin_pct    = (total_margin / total_revenue * 100) if total_revenue > 0 else 0  # RULE
```

**TM1 Equivalent:**
```
['Gross Margin %'] = N: (['Revenue'] - ['COGS']) / ['Revenue'] * 100;
```

**SQL View Rule (Database-level):**
```sql
-- In Finance.vw_PL_Statement
SELECT 
    Account,
    ISNULL(CurrentYear, 0) as CurrentYear,
    ISNULL(PriorYear, 0) as PriorYear,
    CurrentYear - PriorYear AS Variance,                                    -- RULE #1
    CASE 
        WHEN PriorYear <> 0 
        THEN (CurrentYear - PriorYear) / PriorYear * 100 
        ELSE 0 
    END AS VariancePercent                                                  -- RULE #2
FROM Finance.FactGL
```

---

#### **3. Consolidation Rules (Hierarchy Rollups)**

**Location:** `backend/services/consolidation_service.py`

```python
# TM1 Consolidation Equivalent: Regional hierarchy rollups
ENTITY_HIERARCHY = {
    "Global": {                                          # C-Level (Top consolidation)
        "children": {
            "Americas": [                                # C-Level (Regional consolidation)
                "RiverEdge USA",                         # N-Level (Leaf element)
                "RiverEdge Canada",                      # N-Level
                "RiverEdge Mexico",                      # N-Level
            ],
            "APAC": [...],                               # C-Level
            "EMEA": [...]                                # C-Level
        }
    }
}
```

**TM1 Equivalent:**
```
Global (Consolidation)
├── Americas (Consolidation, weight: +1)
│   ├── USA (Element)
│   ├── Canada (Element)
│   └── Mexico (Element)
└── APAC (Consolidation, weight: +1)
```

---

#### **4. Database View Rules (Pre-calculated Aggregations)**

**Location:** SQL Views (referenced in services)

**Views Acting as Rules:**
- `Finance.vw_PL_Statement` - P&L with variance calculations
- `Sales.vw_RevenueCube_Source` - Revenue with margin calculations
- `HR.vw_WorkforceCube_Source` - Headcount aggregations
- `Planning.vw_BudgetForecast` - Budget vs Actual comparisons
- `Finance.vw_EntityConsolidation` - Multi-entity rollups

**Example View Rule:**
```sql
CREATE VIEW Finance.vw_PL_Statement AS
SELECT 
    Account,
    SUM(CASE WHEN Year = @CurrentYear THEN Amount ELSE 0 END) AS CurrentYear,
    SUM(CASE WHEN Year = @PriorYear THEN Amount ELSE 0 END) AS PriorYear,
    -- RULE: Calculate variance
    SUM(CASE WHEN Year = @CurrentYear THEN Amount ELSE 0 END) - 
    SUM(CASE WHEN Year = @PriorYear THEN Amount ELSE 0 END) AS Variance
FROM Finance.FactGL
GROUP BY Account
```

---

### What Feeders Are Implemented in Your Portal?

Your portal uses **database optimization techniques** that serve the same purpose as TM1 Feeders:

#### **1. Database Indexes (Primary Feeders)**

**Location:** `scripts/db_indexes.sql`

**Purpose:** Tell the database which queries to optimize (like feeders tell TM1 which cells to calculate)

```sql
-- FEEDER EQUIVALENT: Speed up year-based queries
CREATE NONCLUSTERED INDEX IX_DimDate_YearNumber
    ON MasterData.DimDate (YearNumber)
    INCLUDE (MonthName, QuarterName, DateID);

-- FEEDER EQUIVALENT: Speed up entity-based queries
CREATE NONCLUSTERED INDEX IX_DimEntity_EntityName
    ON MasterData.DimEntity (EntityName)
    INCLUDE (EntityID);

-- FEEDER EQUIVALENT: Speed up revenue cube queries (most common filter)
CREATE NONCLUSTERED INDEX IX_FactSales_Date_Entity
    ON Sales.FactSales (DateID, EntityID)
    INCLUDE (Revenue, Cost, VersionID);
```

**How This Maps to TM1 Feeders:**

| TM1 Feeder | Your Portal Index | Purpose |
|------------|-------------------|---------|
| `['Revenue'] => ['Profit'];` | `INDEX on (Account, Year)` | Fast lookup of Revenue to calculate Profit |
| `['Actual'] => ['Budget Variance'];` | `INDEX on (Version, Entity)` | Fast comparison of Actual vs Budget |
| `DB('Cube', !Dim1, !Dim2) => ...` | `INDEX on (Dim1, Dim2)` | Multi-dimensional lookups |

---

#### **2. Query Result Caching (In-Memory Feeders)**

**Location:** `backend/cache.py`

**Purpose:** Store frequently accessed aggregations (like TM1 stores fed cell calculations)

```python
# TTL Cache - like TM1 keeping calculated cells in memory
@ttl_cache(ttl=300)  # Cache for 5 minutes
def get_dashboard_kpis():
    """
    FEEDER EQUIVALENT: Only recalculate if data changed
    Like TM1 only recalculating fed cells when source data updates
    """
    # Expensive aggregation query
    return expensive_calculation()
```

**Module-Level Aggregation Cache:**
```python
# backend/services/dashboard_service.py
_AGG_CACHE = {}  # Like TM1's in-memory fed cell cache
_AGG_TTL = 300   # Recalculate after 5 minutes

def _agg_cached(key, fn):
    """
    FEEDER EQUIVALENT: Check if calculation is still valid
    Only recompute if cache expired (data changed)
    """
    if entry and now - entry["ts"] < _AGG_TTL:
        return entry["value"]  # Return cached (like TM1 returning fed cell)
    return fn()  # Recalculate (like TM1 rule executing)
```

---

#### **3. Materialized Views (Pre-computed Feeders)**

**Location:** `scripts/db_materialized_views.sql`

**Purpose:** Pre-calculate heavy aggregations (like TM1 pre-computing fed consolidations)

```sql
-- FEEDER EQUIVALENT: Pre-aggregate revenue by year/region
-- Like TM1 feeding consolidation cells to avoid runtime calculation
CREATE VIEW Sales.vw_RevenueByYearRegion
WITH SCHEMABINDING  -- Materializes the view (stores results)
AS
    SELECT
        f.YearNumber,
        e.EntityName,
        SUM(f.Revenue) AS Revenue,      -- Pre-calculated (like fed consolidation)
        SUM(f.Cost) AS Cost,
        SUM(f.Margin) AS Margin,
        COUNT_BIG(*) AS RowCount
    FROM Sales.FactRevenue f
    JOIN MasterData.DimEntity e ON f.EntityID = e.EntityID
    GROUP BY f.YearNumber, e.EntityName;

-- Create clustered index to materialize
CREATE UNIQUE CLUSTERED INDEX UIX_vw_RevenueByYearRegion
    ON Sales.vw_RevenueByYearRegion (YearNumber, EntityName);
```

**TM1 Equivalent:**
```
# Feeder that pre-calculates regional rollup
['USA Revenue'] => DB('RegionCube', 'Americas', !Time);
['Canada Revenue'] => DB('RegionCube', 'Americas', !Time);
```

---

#### **4. Database Statistics (Query Optimizer Feeders)**

**Location:** `scripts/db_statistics.sql`

**Purpose:** Keep query optimizer informed (like TM1 maintaining feeder index)

```sql
-- FEEDER EQUIVALENT: Tell SQL Server which data patterns exist
-- Like TM1 maintaining feeder map for efficient rule execution
UPDATE STATISTICS MasterData.DimDate WITH FULLSCAN;
UPDATE STATISTICS Sales.FactSales WITH FULLSCAN;
UPDATE STATISTICS Finance.FactGL WITH FULLSCAN;
```

---

### Is Your Portal Using Turbo Integrator (TI)?

**Yes!** You're using **modern ETL equivalents** that serve the same purpose as TM1 Turbo Integrator:

#### **TI Architecture vs Your Portal**

| TM1 TI Component | Your Portal Equivalent | Purpose |
|------------------|------------------------|---------|
| **PROLOG** | Database connection pool (`database.py`) | Initialize connections, set parameters |
| **METADATA** | Dimension tables (DimEntity, DimAccount, etc.) | Store dimension elements |
| **DATA** | FastAPI POST/PUT endpoints | Load/update cube data |
| **EPILOG** | Logging, cache invalidation | Cleanup, notifications, next steps |

---

#### **1. PROLOG Equivalent: Database Connection Setup**

**Location:** `backend/database.py`

```python
# TI PROLOG EQUIVALENT: Connect to data source
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=10,           # Like TI maintaining connection pool
    max_overflow=20,
    pool_timeout=30,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    TI PROLOG: Initialize database session for each request
    Like TI connecting to SQL Server in Prolog tab
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()  # TI EPILOG: Clean up connection
```

**TM1 TI Prolog Equivalent:**
```
# TI Prolog Tab
vServer = 'localhost';
vDatabase = 'FinanceDB';
vQuery = 'SELECT * FROM Actuals';
# Connect to SQL Server
```

---

#### **2. METADATA Equivalent: Dimension Management**

**Location:** API endpoints loading dimension data

**Your Portal's "Metadata Tab":**
```python
# backend/services/consolidation_service.py
def get_entity_hierarchy(self):
    """
    TI METADATA TAB EQUIVALENT: Build dimension hierarchy
    Like TI creating dimension elements and consolidations
    """
    # Query dimension source (like TI reading dimension data)
    query = text("SELECT EntityName FROM TM1.vw_Dim_Entity")
    db_entities = {row[0] for row in result.fetchall()}
    
    # Build hierarchy (like TI DimensionElementInsert)
    for region, entities in ENTITY_HIERARCHY["Global"]["children"].items():
        region_node = {
            "id": region.lower(),
            "name": region,
            "type": "consolidation",  # C-Level element
            "children": []
        }
        
        for entity_name in entities:
            # Add leaf elements (like TI DimensionElementInsert)
            region_node["children"].append({
                "id": entity_id,
                "name": entity_name,
                "type": "element"  # N-Level element
            })
    
    return hierarchy
```

**TM1 TI Metadata Tab Equivalent:**
```
# TI Metadata Tab
IF (vEntity @<> '');
    DimensionElementInsert('Entity', '', vEntity, 'N');
    DimensionElementComponentAdd('Entity', 'Global', vEntity, 1);
ENDIF;
```

---

#### **3. DATA Equivalent: Cube Data Loading**

**Location:** API endpoints and SQL INSERT/UPDATE operations

**Your Portal's "Data Tab":**
```python
# backend/services/finance_service.py
def get_pl_statement(self, year: int, entity: str):
    """
    TI DATA TAB EQUIVALENT: Load cube data
    Like TI's CellPutN function populating cells
    """
    # Query source data (like TI reading from SQL)
    query = f"""
    SELECT Account, CurrentYear, PriorYear
    FROM Finance.vw_PL_Statement
    WHERE Year = :year AND Entity = :entity
    """
    
    results = self.db.execute(text(query), params).fetchall()
    
    # Transform data (like TI Data tab processing)
    lines = []
    for r in results:
        # CellPutN equivalent - storing cube values
        lines.append(PLStatementLine(
            account=r.Account,
            current_year=float(r.CurrentYear),
            prior_year=float(r.PriorYear),
            variance=float(r.Variance)  # Calculated in view (like Rule)
        ))
    
    return PLStatementResponse(lines=lines)
```

**TM1 TI Data Tab Equivalent:**
```
# TI Data Tab
CellPutN(vAmount, 'Financials', vAccount, vMonth, vDept, 'Actual');
vRowCount = vRowCount + 1;
```

---

#### **4. EPILOG Equivalent: Logging & Cleanup**

**Location:** FastAPI logging and cache invalidation

**Your Portal's "Epilog Tab":**
```python
# backend/services/finance_service.py
def get_pl_statement(self, year, entity):
    try:
        # DATA TAB: Load and process
        results = self.db.execute(query).fetchall()
        lines = process_results(results)
        
        # EPILOG: Log completion (like TI Epilog logging)
        logger.info(f"Retrieved P&L for year {year}, {len(lines)} lines")
        
        return PLStatementResponse(lines=lines)
    
    except Exception as e:
        # EPILOG: Error handling (like TI ProcessBreak)
        logger.error(f"Error fetching P&L: {str(e)}")
        raise
    finally:
        # EPILOG: Cleanup (like TI closing connections)
        # Connection auto-closed by get_db() context manager
        pass
```

**TM1 TI Epilog Tab Equivalent:**
```
# TI Epilog Tab
TextOutput('LoadLog.txt', 'Process completed: ' | Now());
TextOutput('LoadLog.txt', 'Loaded ' | NumberToString(vRowCount) | ' records');

IF (vErrorCount > 0);
    ProcessBreak;
ENDIF;
```

---

### Complete Mapping: TM1 vs Your Portal

| **TM1 Feature** | **Your Portal Implementation** | **File Location** |
|----------------|--------------------------------|-------------------|
| **Rules** | Python business logic + SQL computed columns | `services/finance_service.py`, `services/dashboard_service.py` |
| **Feeders** | Database indexes + query caching | `scripts/db_indexes.sql`, `cache.py` |
| **TI Prolog** | Database connection pooling | `database.py` |
| **TI Metadata** | Dimension hierarchy API | `services/consolidation_service.py` |
| **TI Data** | FastAPI data endpoints + SQL INSERTs | `routes/*.py`, `services/*.py` |
| **TI Epilog** | Logging + error handling | Logger calls in services |
| **Consolidations** | Entity hierarchy + recursive aggregations | `services/consolidation_service.py` |
| **Views** | SQL Views (vw_PL_Statement, etc.) | Database views |
| **Cubes** | Fact tables (FactGL, FactSales, etc.) | SQL Server tables |
| **Sparse Storage** | NULL handling + indexed queries | Database design |
| **Multi-user** | FastAPI async + connection pooling | `main.py`, `database.py` |
| **Security** | JWT + role-based access control | Auth middleware |

---

### Interview Talking Point: "How Your Portal Uses Rules, Feeders, and TI"

**When Asked:** "Tell me about your project and how it relates to TM1"

**Your Answer:**
"I built a financial planning portal that implements TM1's core concepts using modern web technologies:

**Rules (Calculation Logic):**
- Implemented P&L calculations like 'Gross Profit = Revenue - Expenses' using Python service functions
- Created SQL views with computed columns for variance analysis and margin calculations
- Built aggregation logic in my dashboard service that calculates KPIs on-demand

**Feeders (Performance Optimization):**
- Created database indexes on key dimensions (Year, Entity, Account) to speed up queries - just like TM1 feeders mark which cells need calculation
- Implemented TTL caching for frequently accessed aggregations - similar to TM1's in-memory fed cell cache
- Used materialized views for pre-computed aggregations - like TM1 pre-calculating fed consolidations

**Turbo Integrator (ETL/Data Processing):**
- My database connection pooling acts like TI's Prolog - initializing connections
- API endpoints load and transform data like TI's Data tab
- Logging and error handling mirror TI's Epilog cleanup

The result is a system that demonstrates I understand **how TM1 works conceptually** - separating calculation logic from optimization, maintaining dimensional hierarchies, and efficiently loading data - even though I'm using SQL/Python/FastAPI instead of TM1's native engine."

---

**Remember:** Rules = **WHAT** to calculate | Feeders = **WHEN** to calculate

---

### What is N-Level vs C-Level?

**N-Level (Numeric/Leaf):**
- Holds actual data values
- Can be written to
- Bottom of hierarchy
- Example: "California", "Product A"

**C-Level (Consolidated):**
- Calculated from children
- Read-only (cannot write directly)
- Parent in hierarchy
- Example: "USA", "Total Products"

**Key Point:** You can only input data at N-Level elements!

---

## 🎨 USER INTERFACE

### What is a View?

**Answer:** A View is a customized slice of cube data showing specific elements from each dimension.

**Types:**
1. **Public Views**: Shared across all users
2. **Private Views**: Personal to one user

**Example:**
```
Cube: Financials
View: "Sales_Q1_Budget"
├── Account: Revenue, Expenses, Profit (3 elements)
├── Time: Jan, Feb, Mar (3 elements)
├── Department: Sales (1 element)
├── Version: Budget (1 element)
└── Scenario: Base (1 element)
```

**Views can:**
- Filter dimensions
- Suppress zeros
- Apply formatting
- Include calculations

---

### What is PAW (Planning Analytics Workspace)?

**Answer:** PAW is TM1's modern **web-based** interface for:
- Building interactive dashboards
- Creating visualizations (charts, graphs, heatmaps)
- Self-service analytics
- Mobile access

**Features:**
- Drag-and-drop interface
- No Excel required
- Responsive design
- Embedded in web portals

---

### What is PAX (Planning Analytics for Excel)?

**Answer:** PAX is TM1's **Excel add-in** that connects Excel to TM1 cubes.

**Features:**
- Excel formulas pull TM1 data: `=DBRW("Cube", "Revenue", "Jan")`
- Users enter data in Excel, writes back to TM1
- Familiar Excel interface
- Advanced Excel features (pivot tables, charts)

**Use Case:** Power users who prefer Excel but need TM1's multi-user capabilities.

---

## 📈 BUSINESS PROCESSES

### How Does Data Flow from SQL → TM1 Cube → Report?

**Answer:**

**Step 1: Source Data (SQL Server)**
```sql
SELECT AccountCode, Month, Amount 
FROM ActualsTable
WHERE Year = 2026;
```

**Step 2: TI Process (Load into TM1)**
```
PROLOG: Connect to SQL
METADATA: Create Account dimension elements
DATA: Load amounts into Financials cube
EPILOG: Log completion
```

**Step 3: TM1 Cube Storage**
- Data stored in-memory
- Aggregations calculated automatically
- Rules apply business logic

**Step 4: Reporting**
- PAW: Web dashboard
- PAX: Excel report
- Custom: Your React portal!

---

### How Would You Design a P&L (Profit & Loss) Cube?

**Answer:**

**Dimensions:**
1. **Account** (with hierarchy):
```
Net Profit
├── Revenue
│   ├── Product Revenue
│   └── Service Revenue
├── Cost of Goods Sold
│   ├── Materials
│   └── Labor
├── Gross Profit (Calc: Revenue - COGS)
├── Operating Expenses
│   ├── Salaries
│   ├── Rent
│   └── Marketing
└── Net Profit (Calc: Gross Profit - OpEx)
```

2. **Time**: Years → Quarters → Months
3. **Department**: Sales, IT, HR, Finance
4. **Version**: Actual, Budget, Forecast, Prior Year
5. **Scenario**: Base, Best Case, Worst Case
6. **Entity**: If multi-company

**Rules:**
```
# Gross Profit calculation
['Gross Profit'] = N: ['Revenue'] - ['COGS'];

# Net Profit calculation
['Net Profit'] = N: ['Gross Profit'] - ['Operating Expenses'];
```

---

### How Would You Build an Account Hierarchy?

**Answer:**

**Steps:**
1. **Identify Leaf Accounts** (N-Level):
   - Revenue accounts: 4000, 4100, 4200
   - Expense accounts: 5000, 5100, 5200

2. **Create Consolidations** (C-Level):
   - Total Revenue (rollup of 4000-4299)
   - Total Expenses (rollup of 5000-5999)

3. **Set Weights**:
   - Revenue: +1 (adds)
   - Expenses: -1 (subtracts from profit)

4. **Build in TI Process**:
```
# METADATA tab
DimensionElementInsert('Account', '', '4000-Revenue', 'N');
DimensionElementInsert('Account', '', '4100-ServiceRevenue', 'N');
DimensionElementInsert('Account', '', 'Total Revenue', 'C');
DimensionElementComponentAdd('Account', 'Total Revenue', '4000-Revenue', 1);
DimensionElementComponentAdd('Account', 'Total Revenue', '4100-ServiceRevenue', 1);
```

---

### Difference Between Actual, Budget, and Forecast?

**Answer:**

**ACTUAL:**
- What **actually happened**
- Loaded from source systems (ERP, SQL)
- Historical data
- Cannot be changed (except corrections)
- Example: January actual revenue = $500K

**BUDGET:**
- Annual financial plan
- Created once per year
- Set at beginning of fiscal year
- Target to achieve
- Example: January budget revenue = $550K

**FORECAST:**
- **Future projection** based on current trends
- Updated monthly/quarterly
- Actuals (Jan-Jun) + Forecast (Jul-Dec)
- More accurate than budget
- Example: January forecast revenue = $520K (revised from budget)

**Rolling Forecast:**
- Always looks ahead 12 months
- Example in June: Jun Actual + Jul-May Forecast

---

### What Problem Does TM1 Solve?

**Answer:**

**Problems in Traditional Approach (Excel/SQL):**
1. **Version Control Nightmare**: Budget_v1.xlsx, Budget_v2_final.xlsx
2. **No Collaboration**: Users wait for others to finish
3. **Broken Links**: Formulas break when files move
4. **No Audit Trail**: Can't see who changed what
5. **Slow Performance**: Large Excel files crash
6. **No Security**: Anyone can see all data
7. **Manual Consolidation**: Copy-paste across departments

**TM1 Solution:**
✅ Single source of truth  
✅ Multi-user simultaneous access  
✅ Cell-level security  
✅ Automatic consolidation  
✅ Full audit trail  
✅ In-memory speed  
✅ Scenario planning  
✅ What-if analysis without breaking data  

---

## 💾 SQL INTEGRATION

### Why Not Just Use SQL?

**Answer:**

**SQL is Great For:**
- Storing transactional data
- Recording historical events
- Data integrity with ACID properties
- Relational data

**SQL is NOT Great For:**
- Budgeting (future data that doesn't exist yet)
- What-if scenarios (need to preserve original)
- Multi-dimensional analysis (requires complex JOINs)
- User data input (not designed for mass user writes)
- Hierarchical rollups (requires recursive queries)

**TM1 Complements SQL:**
- SQL stores the actuals
- TM1 loads actuals and adds budgets/forecasts
- TM1 provides planning layer on top of SQL

---

### Performance Optimization Techniques

**Answer:**

**1. Feeder Optimization:**
- Use conditional feeders to reduce fed cells
- Avoid feeding at top consolidations

**2. Cube Design:**
- Keep dimensions small (< 100K elements)
- Avoid overly sparse cubes
- Use subsets for large dimensions

**3. Rule Optimization:**
- Use SKIPCHECK for bulk loads
- Minimize rule complexity
- Use IF statements to reduce calculations

**4. Views:**
- Use zero suppression
- Create focused views (not entire cube)
- Subset dimensions

**5. Dimension Order:**
- Put smallest dimension last
- Put most queried dimension first

**6. Process Scheduling:**
- Run heavy processes during off-hours
- Use parallel TI processes when possible

**7. Memory Management:**
- Archive old data
- Clear unused cubes
- Monitor memory usage

---

## 📚 SQL CONCEPTS (Quick Reference)

### JOINs

**INNER JOIN:**
```sql
-- Only matching records from both tables
SELECT e.Name, d.DepartmentName
FROM Employees e
INNER JOIN Departments d ON e.DeptID = d.DeptID;
```

**LEFT JOIN:**
```sql
-- All from left table + matches from right
SELECT e.Name, d.DepartmentName
FROM Employees e
LEFT JOIN Departments d ON e.DeptID = d.DeptID;
-- Returns all employees, NULL for department if no match
```

---

### Aggregate Functions

```sql
-- SUM: Total of all values
SELECT SUM(Revenue) FROM Sales;

-- COUNT: Number of records
SELECT COUNT(*) FROM Employees;

-- AVG: Average value
SELECT AVG(Salary) FROM Employees;

-- MIN/MAX: Minimum and maximum
SELECT MIN(Salary), MAX(Salary) FROM Employees;
```

---

### Window Functions

**ROW_NUMBER():**
```sql
-- Assign sequential number to each row
SELECT Name, Salary,
       ROW_NUMBER() OVER (ORDER BY Salary DESC) AS RowNum
FROM Employees;
```

**RANK():**
```sql
-- Rank with gaps for ties
SELECT Name, Salary,
       RANK() OVER (ORDER BY Salary DESC) AS Rank
FROM Employees;
-- If two people have same salary, next rank skips (1,2,2,4)
```

**LAG() / LEAD():**
```sql
-- Access previous/next row value
SELECT Month, Revenue,
       LAG(Revenue) OVER (ORDER BY Month) AS PreviousMonth,
       LEAD(Revenue) OVER (ORDER BY Month) AS NextMonth
FROM MonthlySales;
```

---

### Date Functions

**DATEADD():**
```sql
-- Add time interval to date
SELECT DATEADD(MONTH, 1, '2026-01-15'); -- 2026-02-15
SELECT DATEADD(YEAR, -1, GETDATE()); -- 1 year ago
```

**DATEDIFF():**
```sql
-- Difference between two dates
SELECT DATEDIFF(DAY, '2026-01-01', '2026-01-31'); -- 30 days
SELECT DATEDIFF(YEAR, HireDate, GETDATE()) AS YearsEmployed
FROM Employees;
```

**EOMONTH():**
```sql
-- Last day of month
SELECT EOMONTH('2026-02-15'); -- 2026-02-28
SELECT EOMONTH('2026-02-15', 1); -- Last day of next month: 2026-03-31
```

---

## 🎯 ADDITIONAL INTERVIEW PREPARATION POINTS

### 1. **Understand Your Portal Project**

Be ready to explain:
- **Architecture**: React frontend + FastAPI backend + SQL database
- **Purpose**: Demonstrating TM1 concepts in a web application
- **Key Features**: 
  - Financial statement reporting
  - Budgeting and forecasting
  - Cube-like data structures
  - Drill-down capabilities
  - Multi-dimensional filtering

**Practice Explaining:**
"I built a financial planning portal to demonstrate TM1 concepts using modern web technologies. It simulates TM1 cubes using SQL tables and implements features like hierarchical rollups, scenario planning, and drill-down analysis. This helped me understand how TM1 works under the hood."

---

### 2. **Real-World Scenarios**

**Be Ready For:**
- "Walk me through how you'd implement a rolling 12-month forecast"
- "A user reports incorrect data - how do you troubleshoot?"
- "How would you handle a TI process that's running slow?"
- "Explain how you'd set up security for a multi-company environment"

---

### 3. **MDX Queries (Might Be Asked)**

**MDX** = Multi-Dimensional eXpressions (like SQL for OLAP)

**Basic Syntax:**
```
SELECT
  {[Account].[Revenue], [Account].[Expenses]} ON ROWS,
  {[Time].[2026].[Q1]} ON COLUMNS
FROM [Financials]
WHERE ([Version].[Budget], [Department].[Sales])
```

**Key Concepts:**
- Tuples: `([Account].[Revenue], [Time].[Jan])`
- Sets: `{[Time].[Jan], [Time].[Feb], [Time].[Mar]}`
- Axes: ROWS, COLUMNS, WHERE clause

---

### 4. **Common TI Functions**

**Dimension Functions:**
```
DimensionCreate('Account');
DimensionElementInsert('Account', '', 'Revenue', 'N');
DimensionElementComponentAdd('Account', 'Total', 'Revenue', 1);
DimensionElementDelete('Account', 'OldElement');
```

**Cube Functions:**
```
CubeCellPutN(Value, Cube, Elem1, Elem2, ...);
CellGetN(Cube, Elem1, Elem2, ...);
CellIncrementN(Amount, Cube, Elem1, ...);
```

**Utility Functions:**
```
ATTRPUTS / ATTRPUTN - Set attribute values
SUBSETCREATE - Create element subset
CUBESETLOGCHANGES - Enable change logging
```

---

### 5. **Performance Tuning Red Flags**

**Interviewer might ask:** "What causes slow TM1 performance?"

**Your Answer:**
1. **Missing Feeders**: Calculations won't work
2. **Over-feeding**: Too many unnecessary feeders
3. **Large Dimensions**: > 100K elements without subsets
4. **Complex Rules**: Nested IF statements, recursive rules
5. **Memory Issues**: Too many cubes loaded
6. **Network Latency**: Slow connection to server
7. **Missing Indexes**: In source SQL database

---

### 6. **Best Practices**

Show you understand professional standards:

**Naming Conventions:**
- Prefix system objects: `sys_`, `}Stats`
- Use descriptive names: `Load_Actuals_Daily` not `Process1`
- Version control TI processes

**Error Handling:**
```
# In TI Prolog
IF (vParameter = '');
  ProcessBreak;
ENDIF;

# Log errors
ITEMSKIP;  # Skip bad record, continue processing
```

**Documentation:**
- Comment complex rules
- Document process dependencies
- Keep runbook for processes

---

### 7. **Integration Knowledge**

**Data Sources TM1 Can Connect To:**
- SQL Server, Oracle, DB2
- Excel, CSV, Text files
- ODBC/JDBC sources
- REST APIs (via HTTP calls in TI)
- SAP, Salesforce (with adapters)

**Output Destinations:**
- Cognos Analytics for reporting
- Excel via PAX
- Web portals via REST API
- File exports (CSV, text)

---

### 8. **Common Pitfalls & How You'd Avoid Them**

1. **Not Testing in Dev First**: Always have Dev → Test → Prod environments
2. **Hardcoding Values**: Use parameters and variables
3. **Ignoring Logging**: Log every process run for audit
4. **No Backup Strategy**: Regular TM1 backups before major changes
5. **Poor Documentation**: Document assumptions and business rules

---

### 9. **Questions to Ask the Interviewer**

Show genuine interest:
- "What version of TM1/Planning Analytics does your company use?"
- "What's the typical size of your cubes and dimensions?"
- "Do you use PAW, PAX, or both?"
- "What source systems do you integrate with?"
- "What's the most complex TI process you've built?"
- "How do you handle version control for TM1 objects?"

---

### 10. **Honesty About Experience Level**

**When Asked About Experience:**

"I'm early in my TM1 journey, but I've invested significant time understanding the core concepts by:
- Building a web portal that simulates TM1 functionality
- Studying TM1 architecture and best practices
- Learning SQL deeply as the foundation for ETL
- Understanding multidimensional modeling

What I lack in years of experience, I make up for with:
- Strong problem-solving skills
- Quick learning ability
- Solid technical foundation (SQL, Python, web development)
- Genuine enthusiasm for financial planning systems

I'm looking for an opportunity where I can learn from experienced professionals while contributing my technical skills."

---

## 🔥 FINAL PREP CHECKLIST

**Day Before Interview:**
- [ ] Review this entire document
- [ ] Be able to explain every feature in your portal
- [ ] Practice drawing cube structure on whiteboard
- [ ] Review your SQL queries in the backend code
- [ ] Prepare 2-3 questions for interviewer
- [ ] Have examples ready of problem-solving from your portal project

**During Interview:**
- [ ] Speak confidently about concepts you know
- [ ] Say "I don't know that yet, but here's my understanding of related concepts" for gaps
- [ ] Use your portal project as examples
- [ ] Draw diagrams (cubes, hierarchies, data flow)
- [ ] Show enthusiasm for learning

**Key Mindset:**
You're not expected to know everything - you're expected to show:
1. Solid conceptual understanding
2. Problem-solving ability
3. Willingness to learn
4. Technical foundation (SQL, programming)
5. Practical application (your portal)

---

## 🚀 YOU'VE GOT THIS!

Remember: The interviewer knows you're early career. They're looking for:
- **Potential** over perfection
- **Learning ability** over current knowledge
- **Problem-solving** over memorization
- **Passion** over years of experience

Your portal project is HUGE - it shows initiative, technical skills, and genuine interest!

Good luck! 🎉
