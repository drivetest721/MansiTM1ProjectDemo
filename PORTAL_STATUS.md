# EPM Portal — Status & Enhancement Roadmap

> Last updated: 2026-06-25  
> Analyst perspective: TM1 / IBM Planning Analytics + Finance

---

## Quick Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Working — live DB data |
| ⚠️ | Partially working — some sections use hardcoded fallback data |
| 🔴 | Not connected — all data is static / mock |
| 🔧 | Recently fixed in this session |

---

## 1. Executive Overview (`/`)

**DB Connection:** ✅ Live via `getDashboard → Sales.vw_RevenueCube_Source + HR.vw_WorkforceCube_Source`

### Functions Present
- KPI cards: Total Revenue, Total Cost, Gross Margin, Total Customers, Total Products, Total Employees
- Revenue by Year bar chart
- Revenue by Region bar chart
- Revenue by Product Category bar chart
- Revenue by Customer Segment donut chart

### What's Working
All six KPI cards pull from two optimised backend queries (post-session fix: 7 queries → 2). Revenue and employee counts are live.

### What's Hardcoded
The four chart series (revenue by year, region, category, segment) use hardcoded fallback arrays when the API returns an unexpected shape. The `getDashboard` endpoint returns KPI scalars but not chart breakdowns — those need dedicated endpoints called separately. The page currently calls only `getDashboard`.

### Bugs / Gaps
- `getDashboard` is one monolithic endpoint; it returns KPIs but the four chart blocks each need their own call (`getRevenueByYear`, `getRevenueByRegion`, `getRevenueByCategory`, `getRevenueBySegment`) — these endpoints exist but are **not called** from the page.
- No period-over-period (YoY) variance shown on KPI cards.
- No year filter — always shows the full dataset aggregate.

### TM1 / Finance Enhancement Ideas
- Add YoY % change badge to every KPI card (e.g. Revenue +8.3% vs prior year). In TM1 this is a standard rule calculation; here it can be a second SQL column `SUM(...) WHERE YearNumber = :year`.
- Add a "waterfall" chart showing Revenue → Gross Margin → EBITDA → Net Income step-down. Classic CFO one-pager.
- Surface a Budget vs Actual variance KPI block ("Are we on budget?") by pulling from `Planning.vw_BudgetForecastVariance`.
- Rolling 12-month trend sparklines on each KPI card.
- Add entity/year filter so the C-suite can drill to a subsidiary.

---

## 2. Product Financial Analysis (`/revenue-planning`)

**DB Connection:** ✅ Live via `Sales.vw_RevenueCube_Source`

### Functions Present
- Revenue by Product bar chart (aggregated)
- Revenue by Region bar chart
- Revenue by Customer Segment pie chart
- Revenue drill-down table (click a bar → detail rows)
- Year and entity filters

### What's Working
All three aggregate charts call the backend. Drill-down fires `getRevenueDrillDown` on click. Data is live and filters are wired to re-fetch.

### What's Hardcoded
Two small fallback arrays used as initial state while loading — these disappear once the API responds. Functionally this is fine.

### Bugs / Gaps
- No month-level trend — only annual aggregates.
- Drill-down shows raw rows; no subtotal row.
- No export to CSV/Excel for the drill-down table.

### TM1 / Finance Enhancement Ideas
- **Price × Volume decomposition**: Split revenue variance into price effect vs volume effect. This is the most-used revenue analysis in TM1 (`Price Variance = (ActualPrice - BudgetPrice) × ActualVolume`).
- **Monthly trend with Budget overlay**: Compare monthly actual revenue against budget by product — wire up `Planning.vw_BudgetForecastVariance` filtered to Revenue accounts.
- **Customer concentration analysis**: Top 10 customers by revenue, % of total — flags key-account risk.
- **Margin by product**: Add `Margin` and `MarginPct` columns from the view (columns already exist in `vw_RevenueCube_Source`).
- **Seasonality index**: Highlight which months historically over/underperform the annual average.

---

## 3. Workforce Reporting (`/workforce-planning`)

**DB Connection:** ✅ Live via `HR.vw_WorkforceCube_Source`

### Functions Present
- Headcount by Department bar chart
- Headcount by Job Level donut chart
- Headcount by Entity bar chart
- Total compensation KPIs (Base Salary, Bonus, Benefits, Total Comp)
- Workforce drill-down table
- Filters: year, entity, department, version

### What's Working
All aggregate charts and KPIs are live. Drill-down fires `getWorkforceDrillDown`. Filters re-fetch the backend.

### What's Hardcoded
Two fallback arrays — loading state only; replaced once API responds.

### Bugs / Gaps
- No month-level trend for headcount changes.
- No FTE vs Headcount distinction (view has headcount, FTE could be derived).
- No attrition or turnover metric.

### TM1 / Finance Enhancement Ideas
- **Compensation-to-Revenue ratio**: Overlay Total Comp against Revenue on a dual-axis chart — the classic "people cost as % of revenue" metric.
- **Budget vs Actual headcount**: Compare planned headcount (from `Planning.vw_BudgetCube_Source` HR accounts) against actuals — shows hiring plan adherence.
- **Attrition rate**: If the view has hire/termination dates, calculate rolling 12-month attrition. High-value HR metric for boards.
- **Job level pyramid chart**: Visualise the ratio of Analyst:Manager:Director:VP — quickly surfaces org health.
- **Average comp by level trend**: Track salary inflation per level year-over-year.
- **Open position budget**: Compare budgeted headcount vs filled — shows burn rate risk if vacancies won't be filled.

---

## 4. CFO Budgeting (`/cfo-budgeting`)

**DB Connection:** ✅ Live via `Planning.vw_BudgetCube_Source`

### Functions Present
- Budget by Account bar chart
- Budget by Department bar chart
- Budget by Entity bar chart
- Budget drill-down table
- Filters: year, entity, department, version

### What's Working
All three aggregate views and drill-down are live. Parallel API calls (`Promise.all`) keep page load fast.

### What's Hardcoded
Two fallback arrays (loading state).

### Bugs / Gaps
- No Budget vs Prior Year comparison.
- No variance vs Forecast shown here (that's on Forecasting Analysis, but CFOs expect it on the budgeting screen too).
- No approval workflow status (submitted / approved / locked).
- Version filter dropdown not populated from DB — hardcoded options.

### TM1 / Finance Enhancement Ideas
- **Budget phasing view**: Show how the annual budget is distributed month-by-month. Flat monthly budgets ("thirteenthing") vs seasonally-phased budgets tell very different stories.
- **Budget utilisation**: Current spend as % of full-year budget — classic "traffic light" heat map by department.
- **Version comparison**: Side-by-side Budget v1 vs v2 vs Final — standard in TM1 where multiple budget rounds exist.
- **Top variances table**: Automatically surface the 10 biggest Budget vs Forecast variances from `Planning.vw_BudgetForecastVariance` directly on this page so the CFO sees red flags without navigating away.
- **Lock/Freeze indicator**: Show whether the budget version is locked (read-only) or open for input — critical workflow metadata.
- **What-if scenario**: Allow a simple % adjustment to a department's budget and preview the P&L impact — no DB write needed, pure front-end calculation.

---

## 5. Forecasting Analysis (`/forecasting-analysis`) 🔧

**DB Connection:** ✅ Live (just fixed)  
`Planning.vw_ForecastCube_Source` + `Planning.vw_BudgetForecastVariance`

### Functions Present
- Scenario cards: Base Case / Best Case / Worst Case with Revenue, EBITDA, Net Income
- Forecast Analysis Table (top accounts by variance magnitude)
- Monthly Budget vs Forecast trend line chart (new — live)
- Scenario Comparison bar chart

### What Was Fixed This Session
1. `MasterData.DimEntity` had invalid column names → entity dropdown returned 500. Fixed by querying `DISTINCT EntityName` from `Sales.vw_RevenueCube_Source`.
2. Entity field name mismatch (`e.EntityName` → `e.entity_name` snake_case).
3. Scenario fallback name was `'Most Likely Case'` — comparison chart looked for `'Base Case'` → all bars were zero. Fixed by aligning fallback names to API names.
4. Color safety: unknown scenario colors now fall back to `gray` instead of crashing.
5. All three API calls now fire in parallel via `Promise.allSettled` — page won't blank out if one call fails.
6. Added new `/api/forecast/monthly-trend` endpoint + wired up the trend line chart to live DB data.

### What's Hardcoded
Four static fallback arrays — only shown if the API is completely unreachable.

### Remaining Gaps
- `forecastTrendData` has no `actual` column (actuals not in `vw_BudgetForecastVariance` — would need a GL actuals view).
- Scenario assumptions panel (Revenue Growth %, Cost Inflation %) is still hardcoded in the backend service.
- No ability to select which two scenarios to compare (always Base/Best/Worst).

### TM1 / Finance Enhancement Ideas
- **Probability-weighted forecast**: Multiply each scenario's revenue by its probability weight → show expected value. Standard in FP&A ("probability-weighted revenue = $148.2M").
- **Rolling forecast**: Replace static year-end forecast with a running 3+9, 6+6, 9+3 view as months close.
- **Forecast accuracy tracking**: Compare last quarter's forecast vs the actual that came in — measures forecast quality, a KPI for the FP&A team itself.
- **Driver-based assumptions panel**: Surface the Revenue Growth %, Headcount Growth %, Cost Inflation % sliders from the backend `get_forecast_assumptions` endpoint. Allow the user to tweak and see real-time scenario impact.
- **Confidence interval band**: Shade the area between Worst and Best case on the trend chart — visually communicates uncertainty range to the board.

---

## 6. P&L Statement (`/pl-statement`)

**DB Connection:** ✅ Live via `Finance.vw_PL_Statement` (mapped service)

### Functions Present
- Full P&L with standard account hierarchy (Revenue → Gross Profit → EBITDA → Net Income)
- Year and entity filter
- Export functionality

### What's Working
Live data via `getPLStatementMapped`. Comment in code confirms ~280 lines of mock data were removed when this was connected.

### What's Hardcoded
One fallback array for the P&L structure when API is unavailable.

### Bugs / Gaps
- No prior-year comparison column.
- No Budget vs Actual column.
- No quarterly breakdown (only full-year).

### TM1 / Finance Enhancement Ideas
- **3-column P&L**: Actual | Budget | Variance — the gold standard for management reporting. Pull Budget from `vw_BudgetForecastVariance`.
- **Prior Year comparison column**: Actual vs PY Actual with YoY % — boards always ask "how do we compare to last year."
- **Quarterly view toggle**: Switch between Annual / Q1 / Q2 / Q3 / Q4 — useful mid-year. The views have `MonthName` so quarter grouping can be done in SQL.
- **Drillthrough on any line**: Click "Revenue" → see revenue by entity or by product. TM1's most-used feature.
- **Intercompany elimination line**: Relevant for consolidated entities — show pre-elimination and post-elimination totals.
- **IFRS vs Management view toggle**: Two different account mappings of the same underlying data. Very common in multi-GAAP environments.

---

## 7. Balance Sheet (`/balance-sheet`)

**DB Connection:** ✅ Live via `Finance.vw_BalanceSheet_Source` (mapped service)

### Functions Present
- Full balance sheet structure (Assets → Liabilities → Equity)
- Year and entity filter
- Account-level detail

### What's Working
Live data via `getBalanceSheetMapped`. ~350 lines of mock data removed when connected.

### What's Hardcoded
Two fallback arrays.

### Bugs / Gaps
- No comparative period (no prior year column).
- Balance check (Assets = Liabilities + Equity) not visually surfaced — if there's a data issue, the user won't notice.
- No movement analysis (opening → closing balance).

### TM1 / Finance Enhancement Ideas
- **Balance check indicator**: Compute `Assets - (Liabilities + Equity)` and show a red warning badge if it doesn't equal zero. Critical data quality check.
- **Period comparison**: Current Year vs Prior Year side by side with movement column.
- **Key ratios panel**: Current Ratio, Quick Ratio, Debt-to-Equity, Net Debt — auto-calculated from balance sheet lines. The Finance team needs these for covenant monitoring.
- **Working capital trend**: Chart Accounts Receivable, Inventory, Accounts Payable month-by-month — cash conversion cycle visibility.
- **Liquidity waterfall**: Cash + Near-cash positions visualised as a waterfall from gross to net liquidity.

---

## 8. Financial Consolidation (`/financial-consolidation`)

**DB Connection:** ✅ Live via consolidation service

### Functions Present
- Entity hierarchy tree
- Consolidated cube data by entity
- Intercompany elimination view

### What's Working
Live data from `getEntityHierarchy` and `getConsolidatedCubeData`. ~230 lines of mock data removed.

### What's Hardcoded
One fallback array.

### Bugs / Gaps
- Entity hierarchy is likely derived from `MasterData.DimEntity` — if that table has missing columns, hierarchy may be incomplete. (The `_fetch_entities` fix in this session helps but the hierarchy service may have its own query.)
- No consolidation journal / intercompany reconciliation workflow.
- No currency translation step.

### TM1 / Finance Enhancement Ideas
- **Currency translation**: Show each entity in local currency AND group currency. Requires a `vw_ExchangeRates` view or exchange rate table. Classic consolidation requirement.
- **Intercompany reconciliation**: Highlight entity pairs where one side has booked an intercompany transaction that the other side hasn't matched — in TM1 this is usually a dedicated cube rule.
- **Ownership percentage**: Show entity ownership % in the hierarchy (e.g. 100% subsidiary vs 60% JV) and apply proportional consolidation logic.
- **Consolidation status tracker**: Which entities have submitted, which are still open — workflow metadata.
- **Minority interest calculation**: Automatically calculate non-controlling interest for partially-owned entities.

---

## 9. Cube Explorer (`/cube-explorer`)

**DB Connection:** 🔴 Backend service returns hardcoded static cube metadata — not queried from DB

### Functions Present
- Cube list (Revenue, Workforce, Budget, Forecast, Finance)
- Cube details panel (dimension count, cell count, status)
- Sample data viewer (first 20 rows)

### What's Working
UI is functional — clicking a cube loads its "details" and sample data. The sample data rows DO hit the real DB via `SELECT TOP 20 * FROM <view>`.

### What's Hardcoded
The cube list and cube metadata (description, dimension count, last update) are hardcoded in `metadata_service.py → get_cubes()`. These are never queried from the DB.

### Enhancement Ideas (TM1 Analyst Perspective)
This page is the closest thing in the portal to TM1's **Cube Viewer**. To make it genuinely useful:
- **Query the `INFORMATION_SCHEMA.VIEWS`** for the actual list of cubes rather than hardcoding them.
- **Show actual row counts** from the view (via `SELECT COUNT(*) FROM <view>`) and last-modified date from `sys.objects`.
- **Add dimension selector**: Let the user choose which columns to show in the sample data — pivot-table style.
- **Export sample data** to CSV/Excel.
- **Column statistics**: For numeric columns show Min, Max, Avg, SUM — the "Explore" capability in PA.

---

## 10. Dimension Explorer (`/dimension-explorer`)

**DB Connection:** ⚠️ Partially live — dimension element queries hit the DB; hierarchy and detail metadata are partially hardcoded

### Functions Present
- Dimension list (Entity, Department, Account, Product, Customer, Year, etc.)
- Dimension element list with search
- Hierarchy tree view
- Element count stats

### What's Working
`getDimensionElements` fetches real rows from the relevant DB views/tables. `getDimensionHierarchy` attempts real queries.

### What's Hardcoded
`getDimensions` list and `getDimensionDetails` metadata are partially hardcoded in the service.

### Enhancement Ideas
- **Query `INFORMATION_SCHEMA.COLUMNS`** to auto-discover dimension attributes rather than hardcoding them.
- **Leaf vs consolidated member indicator**: In TM1, dimensions have a strict leaf/consolidation hierarchy. Surface which elements are base-level vs roll-up.
- **Attribute viewer**: Show element attributes (e.g. Entity's Region, Country) as a properties panel — connects back to fixing `MasterData.DimEntity` properly.
- **Alias management**: TM1 dimensions can have multiple aliases (display names in different languages). Surface these if they exist in the DB.

---

## 11. TM1 Architecture (`/tm1-architecture`)

**DB Connection:** 🔴 Static page — no DB connection needed

### Functions Present
- Architecture diagram (static SVG/HTML)
- Technology stack overview
- Data flow description

### What's Working
Purely informational — always renders correctly.

### Enhancement Ideas
- Add a **live connectivity status** section that pings `/health/database` and shows green/red indicators per data source — turns a static diagram into a live ops dashboard.
- Show **data freshness** for each view (last row inserted) — sourced from `sys.dm_db_index_usage_stats`.

---

## 12. Admin / Data Health (`/admin-data-health`)

**DB Connection:** ✅ Live — four real DB health queries

### Functions Present
- System status (SQL Server connectivity, DB size, connection pool health)
- Table health (row counts, size MB, last update per table from `sys.tables`)
- Cube health (view row counts and status)
- Data quality summary (NULL checks on critical columns)

### What's Working
All four backend methods (`get_system_status`, `get_table_health`, `get_cube_health`, `get_data_quality_summary`) run real SQL against `sys.tables`, `sys.partitions`, and the semantic views.

### Bugs / Gaps
- `get_data_quality` route name in frontend (`getDataQuality`) maps to `get_data_quality_summary` in service — verify the route path matches.
- No email/alert on threshold breach (e.g. row count drops below expected).

### Enhancement Ideas (DBA / Finance Perspective)
- **Row count delta alert**: Compare today's row count to yesterday's. A sudden drop signals a failed ETL load — a critical data ops check before the finance team runs month-end reports.
- **Query performance log**: Show the 10 slowest queries from `sys.dm_exec_query_stats` — surfaces queries that need index tuning.
- **Data freshness SLA**: Define expected refresh times per view (e.g. Revenue should refresh by 07:00 each morning) and show green/amber/red SLA status.
- **Index fragmentation check**: Query `sys.dm_db_index_physical_stats` — fragmented indexes on the large views are the most common cause of slow data fetches.
- **Connection pool meter**: Surface pool_size / active connections / overflow in real time — useful if the portal gets concurrent users.

---

## 13. Pivot Table View (`/pivot`) 

**DB Connection:** 🔴 Fully static — no API calls at all

### Functions Present
- Pivot-style table with hardcoded dimensions and measures
- Row/column swap control

### What's Working / Hardcoded
Everything is hardcoded. This page is a UI demo only.

### Priority to Connect
This is the highest-value unconnected page from a TM1 analyst perspective. TM1's core product is the cube viewer / pivot table. Connecting this to real data should be a priority.

### Enhancement Ideas
- **Connect to any semantic view**: Let the user select which cube (Revenue, Budget, Forecast, Workforce) and which dimensions go on rows vs columns — then fire a dynamic SQL GROUP BY against the selected view.
- **Cell-level drill-through**: Click any cell → see the underlying transaction rows. TM1's "drill to transaction" capability.
- **Asymmetric rows**: Allow different members to expand independently (e.g. show only EMEA region fully expanded, not APAC).
- **Calculated members**: Let users define simple row/column formulas (e.g. "Gross Margin = Revenue - COGS") without touching the DB.
- **Suppress zeros toggle**: Hide rows where all values are zero — essential for sparse cubes.

---

## Summary Table

| Page | DB Status | Biggest Gap | Priority Fix |
|------|-----------|-------------|--------------|
| Executive Overview | ⚠️ KPIs live, charts hardcoded | Wire 4 chart endpoints that already exist | Medium |
| Revenue Planning | ✅ Live | Price×Volume decomposition | Low |
| Workforce Reporting | ✅ Live | Budget vs Actual headcount | Low |
| CFO Budgeting | ✅ Live | Version filter from DB, budget phasing | Medium |
| Forecasting Analysis | ✅ Live 🔧 | Actuals column in trend, driver assumptions | Low |
| P&L Statement | ✅ Live | 3-column layout (Actual/Budget/Variance) | High |
| Balance Sheet | ✅ Live | Balance check indicator, key ratios | Medium |
| Financial Consolidation | ✅ Live | Currency translation | Medium |
| Cube Explorer | 🔴 Static meta | Query INFORMATION_SCHEMA for real cube list | Low |
| Dimension Explorer | ⚠️ Elements live | Real hierarchy from DB | Low |
| TM1 Architecture | 🔴 Static | Live health status widget | Low |
| Admin / Data Health | ✅ Live | Row count delta alert, index fragmentation | Medium |
| Pivot Table View | 🔴 Fully static | Connect to real cube data, dynamic pivot | **High** |

---

## Confirmed Database Schema (Verified via sys.dm_sql_referenced_entities)

| Semantic View | Base Fact Table | Key Measure Columns |
|---|---|---|
| `Sales.vw_RevenueCube_Source` | `Sales.FactSales` | Revenue, Cost (Margin computed in view) |
| `HR.vw_WorkforceCube_Source` | `HR.FactPayroll` | BaseSalary, Bonus, Benefits (TotalComp computed in view) |
| `Planning.vw_BudgetCube_Source` | `Planning.FactBudget` | BudgetAmount |
| `Planning.vw_ForecastCube_Source` | `Planning.FactForecast` | ForecastAmount |
| `Finance.vw_PL_Statement` | `Finance.FactGL` | Amount |
| `Finance.vw_BalanceSheet` | `Finance.FactGL` | Amount |
| `Finance.vw_EntityConsolidation` | `Finance.FactGL` | Amount |
| `Planning.vw_BudgetForecastVariance` | View-on-view (no direct fact table) | BudgetAmount, ForecastAmount, VarianceAmount, VariancePercent |

All fact tables join to `MasterData.DimDate` via `DateID` (int). `YearNumber` lives on `DimDate`, not on the fact tables themselves.

`Finance.FactGL` is a single table that backs **three different pages** (P&L, Balance Sheet, Consolidation). It is the highest-impact table for index and partition optimisation.

---

## Cross-Cutting DB Recommendations

These are backend improvements that benefit multiple pages simultaneously. SQL scripts are in `/scripts/`.

1. **Add indexes on frequently-filtered columns.** Every page filters on `YearNumber` (via DateID join), `EntityName` (via EntityID join), and `AccountType` (via AccountID join). Scripts with verified column names are in `scripts/db_indexes.sql`. Key indexes: `IX_FactSales_Date_Entity`, `IX_FactGL_Date_Entity_Account`, `IX_DimDate_YearNumber`. Run these in SSMS — each takes a few seconds on small tables.

2. **Materialise heavy aggregation views.** If `vw_RevenueCube_Source` joins 3+ tables and aggregates millions of rows, replace dashboard calls with an indexed view or nightly summary table. The semantic view stays for drill-through; the summary feeds charts.

3. **Add `LoadDate` / ETL timestamp column.** Every fact table should have a `LoadDate` or `LastModifiedDate` column so the Admin Data Health page can show true data freshness per table (vs the proxy `sys.dm_db_index_usage_stats` currently used).

4. **Partitioning strategy.** Partition large fact tables on `YearNumber`. Since `YearNumber` is on `DimDate` (not the fact table), either add a persisted computed column or partition on `DateID` boundaries. Reference script: `scripts/db_partitioning_notes.sql`. Highest priority: `Finance.FactGL` (backs 3 pages).

5. **Statistics update job.** A weekly `UPDATE STATISTICS WITH FULLSCAN` on all five fact tables and eleven dimension tables prevents query plan degradation after ETL loads. Script with verified table names: `scripts/db_statistics.sql`.

---

## Cross-Cutting Finance / FP&A Recommendations

These features appear on multiple TM1 deployments and are worth adding across the portal:

1. **Standardised 3-column format everywhere**: Every financial table should show `Actual | Budget | Variance | Variance%`. This is the single most requested change from finance users migrating from TM1.

2. **Drill-anywhere**: Any cell in any table should support click-to-drill. Implement a universal `DrillContext` React context that any page can push a drill request to, which opens a detail panel.

3. **Commentary / annotation layer**: In TM1, "sandbagging" and "stretch" narrative is stored alongside numbers. Add a simple notes field per page/period so the FP&A team can document assumptions next to the data.

4. **Workflow status badges**: For Budget and Forecast pages, show which entities are Draft / Submitted / Approved / Locked. This is table metadata, not financial data — a simple `PlanningStatus` table would power it.

5. **Export to Excel with formatting**: Not just raw CSV — formatted Excel with headers, subtotals, and colour coding. The `xlsx` skill is available in this environment to generate these.

6. **Rolling forecast automation**: Define a "lock date" per month. As each month closes, that month's actual replaces the forecast. The remaining months stay as forecast. This is the standard RF process in TM1.
