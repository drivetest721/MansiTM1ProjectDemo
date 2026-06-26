# TM1 Enterprise Portal — 30-Minute Demo Script
### *Website-Only Walkthrough for Non-Technical Audience*

> **Audience in the room:**
> - 💼 Finance Manager / CFO — understands numbers, not code
> - 🔧 Technical Architect — will ask deep questions, watch for depth
> - 📋 Project Manager / Client — cares about delivery and business value
>
> **Rule:** Never open a code file. Everything happens on the website.  
> **Your goal:** Prove you understand OLAP systems and can translate them into a real product.

---

## OPENING (Before you click anything) — *2 min*

> *Stand / sit confidently. Don't touch the mouse yet.*

"What we built here is a modern web portal for enterprise financial planning — specifically designed to replace the traditional TM1 way of working, where every report lives inside an Excel workbook connected to a TM1 server.


It talks to a SQL Server database built on the exact same dimensional model that TM1 uses —  cubes,  dimensions,  hierarchy logic. The finance team doesn't need to learn anything new. But now they have a dashboard they can open from anywhere."

---

## STOP 1 — TM1 Architecture Page *(2 min)*

**[CLICK] → 'TM1 Architecture' in the sidebar**

> *This is your credibility page. Spend time here. It shows you understand TM1 deeply.*

"I want to start with the architecture page because it sets the context for everything else you'll see.

**[POINT to the flow diagram — top to bottom]**

This is the TM1 data pipeline visualised. At the top is the SQL Server database — our data source. Below that are the source tables and views — the Sales view, the Payroll table, the Budget and Forecast tables, the General Ledger. These are the raw data stores.

The next layer is TurboIntegrator — TM1's ETL engine. TI processes extract data from these sources, transform it, and load it into cubes. In our architecture, a TI process called `Load_Revenue_Cube` runs every night at 2 AM and refreshes the Revenue Cube from the Sales view.

**[POINT to the Dimensions step]**

Below TI are the dimensions — Time, Product, Customer, Employee, Entity, Account, Department, Version, Measure. In TM1, every dimension has a hierarchy. The Time dimension rolls up from individual days to months, months to quarters, quarters to years. That hierarchy is what gives you drill-down in reports.

**[POINT to the Cubes step and the side panel example]**

Then the cubes. A cube is where data actually lives in TM1. Each cell in a cube is the intersection of one element from every dimension. This example on the right shows a single Revenue Cube cell: Year 2024 × Entity USA × Product Widget A × Customer Acme Corp × Scenario Actual = $1,240,000. That is one number. A cube can hold hundreds of millions of these intersections.

**[POINT to Rules & Feeders]**

Rules calculate derived measures automatically. For example, Gross Margin = Revenue minus Cost of Goods Sold. You write the rule once, and TM1 calculates it for every intersection. Feeders tell TM1 which cells trigger which calculations so it only computes what it needs to.

**[POINT to the bottom — TM1 Core Concepts grid]**

At the bottom are the nine TM1 concepts — Dimension, Element, Consolidation, Cube, Rule, Feeder, TurboIntegrator, Chore, and Security. If someone in the room asks me about any of these, I can explain each one in detail."

> **💡 For the Technical Architect:** If they ask "how does this compare to Cognos or Hyperion?" — say: "TM1 is an in-memory OLAP engine, which means consolidations happen instantly in RAM rather than being pre-computed like Essbase. The tradeoff is memory footprint vs query speed."

---

## STOP 2 — Executive Overview *(3 min)*

**[CLICK] → 'Executive Overview'**

> *This is the CFO's page. Speak directly to them here.*

"This is where the CFO or Finance Director would start their morning. Seven KPI cards at the top — Total Revenue, Total Cost, Gross Margin, Margin Percentage, Total Headcount, Total Customers, Total Products. These are live numbers pulled from the database in real time.


**[SCROLL DOWN to the Revenue by Year chart]**

This is the Revenue by Year bar chart. But it's not static.

**[CLICK on a year bar]**

Watch what happens when I click a year — it drills into quarters. Click a quarter — it drills into months. This is the OLAP drill-down operation: Total → Year → Quarter → Month. In TM1, this is the consolidation hierarchy in the Time dimension. Here it works live in the browser.

**[SCROLL to Budget vs Forecast Trend chart]**

This chart shows three lines — Actual in blue, Forecast in orange, Budget in green. Finance can see at a glance where actuals are running above or below both the budget and the forecast. 

**[POINT to Annotation panel if visible]**

Finance teams need to leave comments on data — 'this spike was due to the Q2 contract close', 'this dip reflects the factory shutdown'. The annotation panel lets them add notes to any view and they persist for the whole team to see."

> **💡 For the CFO:** "Every number here is traceable. If you click through, you can see the underlying rows — which entity, which product, which month contributed to any total."

---

## STOP 3 — Product Financial Analysis *(2 min)*

**[CLICK] → 'Product Financial Analysis'**

"This is the Revenue Cube in its full detail. Think of this as the TM1 Revenue Cube opened as a web view.

**[POINT to the filter bar at the top]**

These filters — Year, Quarter, Region, Entity, Product Category, Customer Industry — are the dimensions of the Revenue Cube. When I select a filter, I'm slicing the cube along that dimension. This is the OLAP 'slice and dice' operation.

**[SELECT a filter — e.g. pick a specific Year or Region]**

The table updates instantly with the filtered data. Revenue, Cost, Margin, and Margin % for every combination visible.

**[POINT to the totals row at the bottom]**

The totals bar aggregates whatever is in the current view — same as a TM1 consolidation element, but driven by the filter selections.

**[POINT to the Export button]**

And for the finance team that still wants Excel — one click exports the current slice to an Excel file. The file is built client-side, no server round-trip. They get exactly what they see on screen."

> **💡 For the Technical Architect:** "The filter selections are sent as a POST request body to the API. The backend translates them into SQL WHERE clauses against the fact and dimension tables. Aggregation happens in SQL, not in the browser."

---

## STOP 4 — Workforce Reporting *(2 min)*

**[CLICK] → 'Workforce Reporting'**

"This page is the Workforce Cube — payroll data structured by Time, Employee, Department, Cost Center, and Entity.

**[POINT to the bar chart at top]**

The chart shows total compensation by department — immediately you can see which departments are the largest cost centres. Engineering, Sales, Operations — the breakdown is instant.

**[POINT to the table]**

The table gives you the employee-level detail: Base Salary, Bonus, Benefits, and Total Compensation per person per month. HR or Finance can filter by cost centre or entity to see exactly what they're spending on people in a specific part of the business.

This is exactly the kind of analysis that used to require a TM1 Architect to build a custom view and an Excel report. Now it's available to anyone on the team in a browser."

---

## STOP 5 — CFO Budgeting *(2 min)*

**[CLICK] → 'CFO Budgeting'**

"The Budget Cube. This page is where the CFO reviews budget vs actuals by department and account.

**[POINT to the Scenario and Version filters]**

In TM1, you always maintain multiple budget versions — the original approved budget, a revised mid-year budget, an internal stretch target. These are the Scenario and Version dimensions. Selecting 'Revised Budget' here switches the entire view to that version.

**[POINT to the variance column — red/green badges]**

The variance column shows where each department is over or under budget. Green means under budget — good. Red means over — needs attention. A CFO in a budget review meeting can go through this list and immediately know which conversations to have.

The variance percentages are calculated live — budget amount minus actual amount divided by budget — same logic as a TM1 rule, but running in the database query."

---

## STOP 6 — Forecasting Analysis *(2 min)*

**[CLICK] → 'Forecasting Analysis'**

"Forecasting is different from budgeting because it's a rolling process. As months close, actuals replace the forecast for past periods. The forecast for future months gets updated based on current trends.

**[POINT to the three-line chart]**

This chart shows the full year: the solid green line is actuals for months that have closed, the orange line is the updated forecast for open months, and the blue reference line is the original budget. A CFO can see in one view: where we were, where we are, and where we're going.

**[POINT to the Rolling Forecast panel]**

The rolling forecast panel on the right lets finance lock closed periods and push new numbers for open periods. Each update creates a new version — so the history is preserved and you can always go back to see what the forecast was at any point in time."

---

## STOP 7 — P&L Statement *(2 min)*

**[CLICK] → 'P&L Statement'**

"The Profit and Loss statement — built from the General Ledger data, which has over one million transaction rows in our database.

**[POINT to the structure — Revenue at top, Net Profit at bottom]**

The account hierarchy drives the structure: Revenue rolls up from individual product accounts, Cost of Goods Sold from cost accounts, Gross Margin is calculated, Operating Expenses below that, and Net Profit at the bottom. This is exactly how the P&L Cube in TM1 is structured — the account dimension hierarchy determines what rolls into what.

**[EXPAND a line item if possible]**

Each line is expandable — click on Revenue and you see the underlying accounts that contribute to it. This is the TM1 drill-down from a consolidation element to its leaf elements.

**[POINT to the period filter]**

The period filter at the top lets you switch between months — Jan, Feb, Mar — or view the full year. Every selection re-queries the database and rebuilds the statement."

> **💡 For the CFO:** "The account classification — what counts as Revenue versus Cost versus Expense — is driven by the Account Type field in the dimension table. Changing the hierarchy in TM1 would automatically change what appears in each section here."

---

## STOP 8 — Balance Sheet *(1 min)*

**[CLICK] → 'Balance Sheet'**

"Same underlying data — the General Ledger — but structured as a Balance Sheet. Assets on top, Liabilities and Equity below. The balance check at the bottom verifies that Assets = Liabilities + Equity. If the sheet doesn't balance, it shows a red warning — immediate signal to the finance team that something is wrong with the data or the account mapping."

---

## STOP 9 — Financial Consolidation *(2 min)*

**[CLICK] → 'Financial Consolidation'**

"This is the Consolidation Cube — the most complex piece of the system.

In TM1, consolidation means rolling up subsidiary entities into their parent. A company might have 20 legal entities — US operations, UK operations, Germany, Singapore — and the CFO needs a single consolidated view of the whole group.

**[POINT to the Entity selector]**

Selecting a parent entity here — say 'Global Group' — triggers a query that aggregates all subsidiaries beneath it. The hierarchy lives in the Entity dimension: Global Group → Region → Country → Legal Entity. That's three levels of consolidation happening in a single query.

**[POINT to the elimination column if visible]**

Intercompany eliminations — transactions between entities within the group that need to be removed from the consolidated view — are handled through specific account mappings. You see the elimination column here showing what gets removed before the consolidated total is calculated."

---

## STOP 10 — Cube Explorer *(2 min)*

**[CLICK] → 'Cube Explorer'**

> *This is the power-user / technical page. The Architect will appreciate this.*

"For analysts and power users, this is the free-form query interface — the equivalent of opening a TM1 View in TM1 Web or Perspectives.

**[SELECT a cube from the dropdown]**

Select the Revenue Cube. Now choose which dimensions go on rows and which go on columns.

**[CONFIGURE the view — e.g. Year on columns, Product Category on rows]**

The grid renders the intersection values — exactly like a TM1 Subset Editor and View combined. You're performing the OLAP 'pivot' operation: reorganising the dimensions to see the data from a different angle.

**[CLICK a cell value]**

Clicking a cell drills through to the underlying fact rows — the individual transactions that make up that intersection. In TM1 terms, this is cell drill-through to the source data."

> **💡 For the Technical Architect:** "Under the hood, the row/column selections are translated into a dynamic SQL GROUP BY. The API doesn't have hard-coded queries for each view combination — it builds the query from the dimension selections at runtime."

---

## STOP 11 — Dimension Explorer *(1 min)*

**[CLICK] → 'Dimension Explorer'**

"The Dimension Explorer is the TM1 Dimension Editor equivalent — but read-only for reporting users.

**[SELECT the Time dimension]**

You can see the full hierarchy as an interactive tree: Total Time → 2024 → Q1 2024 → January → February → March. Consolidation elements are shown with an expand arrow. Leaf elements are the base data.

Finance uses this to verify that hierarchy changes — like moving a department under a new division — have landed correctly before running reports. It's also useful for new team members to understand the dimension structure without needing access to TM1 Architect."

---

## STOP 12 — Admin Data Health *(1 min)*

**[CLICK] → 'Admin Data Health'**

"The operations page. Row counts and table sizes for every fact and dimension table — Revenue, Payroll, Budget, Forecast, GL. Last refresh timestamps. If a data load failed overnight, you'd see the row count stuck at yesterday's number — immediate signal that the ETL process didn't run.

The health check at the top polls the database connection every 30 seconds. Green dot means the system is healthy and connected."

---

## CLOSING — *1 min*

> *Step back. Speak to the whole room.*

"To summarise what you've seen:

**For the business** — a real-time web portal where finance can slice and drill into revenue, headcount, budget, and financial statements without opening Excel. Every view is filterable, exportable, and annotatable.

**For the technical team** — a system built on the same OLAP dimensional model that TM1 uses. Same cube logic, same hierarchy structure, same dimension-measure separation. We've just moved the compute from TM1's in-memory engine to a SQL Server star schema with a Python API in front of it.

**For the project** — this was built to prove that TM1 concepts can be modernised and delivered as a web application — maintaining the analytical depth that finance depends on while opening it up to a browser-based experience.

I'm happy to go deeper on any page, any dimension, or any technical decision."

---

## QUICK TIMING GUIDE

| Stop | Page | Time |
|---|---|---|
| Opening | (no screen) | 2 min |
| 1 | TM1 Architecture | 2 min |
| 2 | Executive Overview | 3 min |
| 3 | Product Financial Analysis | 2 min |
| 4 | Workforce Reporting | 2 min |
| 5 | CFO Budgeting | 2 min |
| 6 | Forecasting Analysis | 2 min |
| 7 | P&L Statement | 2 min |
| 8 | Balance Sheet | 1 min |
| 9 | Financial Consolidation | 2 min |
| 10 | Cube Explorer | 2 min |
| 11 | Dimension Explorer | 1 min |
| 12 | Admin Data Health | 1 min |
| Closing | (no screen) | 1 min |
| **Total** | | **~27 min + buffer** |
