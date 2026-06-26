# Interview Q&A Preparation
### TM1 / OLAP Developer Role — Finance + Technical + Project Questions

> **Who asks what:**
> - 💼 **CFO / Finance Manager** → Finance domain questions
> - 🔧 **Technical Architect** → OLAP, database, architecture questions
> - 📋 **Project Manager / Client** → Delivery, value, decision questions
>
> Read each answer aloud twice before the interview. These are your words, not a textbook.

---

## PART 1 — TM1 & OLAP (Technical Architect will ask these)

---

**Q: What is OLAP and how is TM1 an OLAP system?**

OLAP stands for Online Analytical Processing. It's a category of database technology designed for analysis rather than transactions. Where a regular relational database (like SQL Server) stores data in rows and tables, OLAP stores data in multi-dimensional cubes — each cell is the intersection of multiple dimensions like Time, Product, Customer, and Entity.

TM1 is an in-memory OLAP engine. It loads cube data into RAM, which makes consolidations — summing up hierarchies — happen in milliseconds. When you add up all products under a category, or all months in a quarter, TM1 does that instantly because the data is already in memory. The tradeoff is that cube size is limited by available RAM on the TM1 server.

---

**Q: Explain the difference between a dimension, an element, and a consolidation in TM1.**

A dimension is a category — like Time, or Product, or Entity. It's the axis of the cube.

An element is a member within that dimension. In the Time dimension, 'January 2024' is an element. 'Q1 2024' is also an element. '2024' is also an element.

A consolidation is a parent element that aggregates its children. 'Q1 2024' is a consolidation of January, February, and March. '2024' consolidates all four quarters. You can define the consolidation weight — normally +1 for regular aggregation, or −1 for eliminations like in intercompany accounting.

Leaf elements are the base-level elements with no children. All actual data is stored at the leaf level. Consolidations are calculated on the fly.

---

**Q: What is a TurboIntegrator process and what does it do?**

TurboIntegrator — TI — is TM1's ETL tool. It's a scripting environment inside TM1 where you write processes to extract data from a source (a SQL database, a flat file, another cube), transform it, and load it into a cube or dimension.

A TI process has four sections: Prolog (runs once at the start), Metadata (defines dimension elements), Data (loads fact data cell by cell), and Epilog (runs once at the end for cleanup or logging).

In our project, the equivalent is the data loading scripts that pull from `Sales.vw_RevenueCube_Source` and insert into the SQL fact tables. The TI logic is replicated in Python — same extract, transform, load pattern.

---

**Q: What are Rules and Feeders in TM1? Why do you need Feeders?**

Rules are formulas attached to a cube that calculate cell values dynamically. For example: `['Gross Margin'] = ['Revenue'] - ['Cost of Goods Sold'];`. Every time TM1 accesses a Gross Margin cell, it runs this calculation.

The problem is that TM1 is a sparse cube — most intersections have no data. Without Feeders, TM1 wouldn't know which cells have a Rule result waiting, so it would skip them and return zero. Feeders tell TM1: "if there is a value in Revenue, then the Gross Margin cell at the same intersection is also populated." Without Feeders, your Rules produce incorrect zeros.

Writing good Feeders is one of the hardest parts of TM1 development. Too few and you get zeros. Too many and you slow down the cube because TM1 marks too many cells as non-sparse.

---

**Q: What is a Chore in TM1?**

A Chore is a scheduled job that runs one or more TI processes in sequence. Think of it as a cron job for TM1. A typical nightly chore might run five processes in order: clear the Revenue Cube, reload data from the source, rebuild dimension hierarchies, run consolidation calculations, send a completion email.

Chores have scheduling, error handling (stop on error or continue), and logging. In our Python architecture, the equivalent is a scheduled task or a Windows Task Scheduler job that runs the data loading scripts.

---

**Q: What is the difference between TM1's in-memory approach and a SQL star schema?**

TM1 keeps the entire cube in RAM. Aggregations are computed dynamically using the hierarchy. This gives you sub-second consolidation even for complex hierarchies, but the server needs enough RAM to hold all active cubes.

A SQL star schema stores data on disk in normalised tables. Aggregations are computed by the database engine using GROUP BY queries. This scales to much larger data volumes but consolidation queries can be slow without good indexing. We use indexed views and query caching in our Python layer to compensate.

The key insight is that the logical model is the same — dimensions, hierarchies, measures. Only the execution engine differs.

---

**Q: How did you handle slowly changing dimensions (SCD) in your data model?**

In our current implementation, dimension tables are Type 1 SCD — we overwrite. If a product changes its category, we update the row and historical reporting reflects the new category. For a production TM1 migration, you would typically implement Type 2 SCD — adding a new row with a new effective date — so that historical reports show the product under its original category.

We could extend the dimension tables with `EffectiveFrom`, `EffectiveTo`, and `IsCurrent` columns to support Type 2 if the business required it.

---

**Q: Your project uses SQL Server with a star schema instead of a real TM1 server. What are the limitations?**

Honest answer: three main ones.

First, write-back. TM1 supports direct cell write-back — a budget planner can type a number into a cell and it saves immediately. Our SQL approach requires a form-based input flow, which is more steps.

Second, real-time consolidation depth. For a very deep hierarchy — say 8 levels — TM1's in-memory engine would outperform SQL GROUP BY queries, especially without pre-aggregation.

Third, TM1 Rules with complex cross-cube lookups — pulling a value from one cube into a calculation in another — are natively efficient in TM1. In SQL, that becomes a JOIN across tables which requires careful indexing.

But for reporting and read-heavy workloads — which is 90% of what finance teams do — the SQL approach performs comparably, scales to much larger data volumes, and is far easier to maintain.

---

**Q: How does the drill-down in your portal work technically?**

The Time dimension has a hierarchy: Year → Quarter → Month. When a user clicks a year bar in the chart, the frontend sends a new API request with `drill_level = 'quarter'` and `year = 2024` as parameters. The backend translates that into a SQL query that groups by Quarter instead of Year, filtered to that specific year. The chart re-renders with the quarter-level data.

It's not pre-computed — each drill level fires a fresh query. We cache the results at the API layer with a 5-minute TTL so repeated drills to the same level don't hit the database twice.

---

## PART 2 — FINANCE DOMAIN (CFO / Finance Manager will ask these)

---

**Q: What is the difference between a Budget and a Forecast?**

A Budget is fixed. It's the financial plan agreed at the start of the year — approved by the board, locked, used as the baseline for performance measurement. The budget doesn't change during the year.

A Forecast is dynamic. As the year progresses, the forecast is updated — usually monthly — to reflect what the business now expects to happen for the rest of the year. Actuals replace the forecast for past periods, and the forward-looking numbers are revised based on current trends.

In TM1, Budget and Forecast are typically separate cubes, or separate scenarios within the same cube. In our portal, we have them as separate fact tables: `Planning.FactBudget` and `Planning.FactForecast`, both with a Scenario and Version dimension.

---

**Q: What is a rolling forecast?**

A rolling forecast extends the planning horizon by one period every month. Instead of a fixed January-to-December budget, you always maintain a 12-month forward view. When January closes, you add the following January to the end of the forecast. Finance is always looking 12 months ahead regardless of where you are in the calendar year.

It's more work than a static budget but gives the business a more accurate picture of the future. Our portal has a Rolling Forecast panel where finance can lock closed periods and push new numbers for the open months.

---

**Q: What is an intercompany elimination and why does it matter in consolidation?**

When Company A sells something to Company B, and both A and B are subsidiaries of the same parent group, that transaction shows up as revenue in A's books and as a cost in B's books. At the individual entity level, that's correct. But when you consolidate A and B into the group P&L, that internal transaction needs to be removed — otherwise you're counting revenue that was never earned from an external customer.

The elimination is done by posting an offsetting entry — typically through a specific intercompany account — that nets to zero at the consolidated level. In TM1, this is usually handled in the consolidation cube rules using negative-weight consolidation elements or specific elimination dimensions.

---

**Q: What is a General Ledger and how does it relate to the P&L and Balance Sheet?**

The General Ledger is the master record of all financial transactions in a business — every debit and credit posted to every account. It's the source of truth for finance.

The P&L — Profit and Loss statement — is a view of the GL that shows all income and expense accounts for a period. Revenue minus costs equals profit or loss.

The Balance Sheet is a view of the GL that shows all asset, liability, and equity accounts at a point in time. It represents what the company owns, what it owes, and the shareholders' stake.

In our portal, both the P&L and Balance Sheet are built from the same `Finance.FactGL` table — just different account classifications from the `DimAccount` dimension.

---

**Q: What is margin and how is it calculated?**

Margin is the difference between revenue and cost. Gross Margin = Revenue minus Cost of Goods Sold. Gross Margin Percentage = (Revenue − Cost) ÷ Revenue × 100.

Operating Margin includes operating expenses below the gross margin line. Net Margin is the final profit after all costs, interest, and tax.

In our Revenue Cube, Margin is pre-calculated in the fact table as Revenue minus Cost and stored as a measure. Margin Percentage is calculated at query time.

---

**Q: What is variance analysis in the context of budgeting?**

Variance analysis is the process of comparing actual results to the budget or forecast and explaining the differences. A positive variance in revenue means you earned more than planned — favourable. A negative variance in costs means you spent less than planned — also favourable, even though the number is negative.

In our CFO Budgeting page, the variance column shows each line in absolute terms and as a percentage. Red means an unfavourable variance — either revenue is below budget or costs are above budget. Green means favourable.

---

## PART 3 — PROJECT & DELIVERY (Project Manager / Client will ask these)

---

**Q: Why did you choose Python and React instead of building directly in TM1?**

Three reasons. First, accessibility — TM1's native reporting tools (TM1 Web, Perspectives, Planning Analytics) require either a desktop installation or a PAL licence. A React portal runs in any browser with no installation.

Second, maintainability — TM1 Rules and TI scripts are proprietary languages that require specialised knowledge to maintain. Python is widely understood, testable, and has a much larger developer community.

Third, extensibility — with a REST API in between, you can connect the data to any front-end: a web portal today, a Power BI dashboard tomorrow, a mobile app next year. TM1 is closed — you can only consume data the way IBM designed it.

---

**Q: How long did this take to build?**

The backend data model and API took approximately two to three weeks — designing the star schema, generating the seed data, building the FastAPI routes, and writing the service layer. The frontend — all twelve pages with charts, tables, filters, and drill-down — took another three to four weeks. Total: roughly six to seven weeks of focused development.

The architecture page and dimension explorer were the quickest. The Executive Overview drill-down and Financial Consolidation were the most complex.

---

**Q: What would need to happen to put this into production for a real client?**

Four things. One — connect to the real TM1 database or source systems instead of synthetic seed data. Two — implement authentication and role-based access control so a CFO sees all entities but a department head only sees their cost centre. Three — set up scheduled data refresh jobs to keep the portal current. Four — performance testing under concurrent user load.

The architecture is already production-ready in terms of structure — connection pooling, caching, GZip compression, error handling, and logging are all in place.

---

**Q: How would a real TM1 migration project use what you built here?**

This portal is the reporting and analytics layer — the consumer of TM1 data. In a real project, TM1 would still run as the planning engine. Finance teams write their budget in TM1, TI processes load the data into SQL Server, and this portal surfaces it to stakeholders who don't need TM1 access.

Alternatively, for a client moving away from TM1 entirely, this architecture replaces TM1 as both the data store and the planning interface — with web-based input forms replacing TM1 write-back.

---

**Q: What was the hardest part of this project?**

The Financial Consolidation page. Getting intercompany eliminations right requires understanding both the entity hierarchy and the account structure simultaneously. The query has to aggregate across entities, apply the consolidation weights, identify intercompany accounts, and net them to zero — all in a single result set. Writing that SQL correctly, with the right joins across the entity dimension's parent-child structure, took the most iteration.

The drill-down in the Executive Overview was also non-trivial — managing state for which drill level the user is on, passing the right parameters to the API, and ensuring the chart re-renders correctly without losing context.

---

**Q: If the Technical Architect asks you to extend this — what would you add next?**

Three things I'd prioritise. One — write-back: let finance enter budget numbers directly in the portal and save them to the Planning tables. Two — scenario comparison: a side-by-side view of Budget vs Forecast vs Actuals vs Prior Year in a single table. Three — alerting: if a KPI crosses a threshold — say Margin % drops below 20% — send an email or Teams notification automatically.

All three are architectural extensions, not rewrites. The data model already supports them.

---

## QUICK REFERENCE — Key TM1 Terms to Drop Naturally

| Term | What it means in plain English |
|---|---|
| Cube | A multi-dimensional data structure — like a spreadsheet but with more than two axes |
| Dimension | A category (Time, Product, Customer) — the axes of the cube |
| Element | A member of a dimension (January, Widget A, Acme Corp) |
| Consolidation | A parent element that sums its children (Q1 = Jan + Feb + Mar) |
| Measure | A numeric value stored in a cube cell (Revenue, Cost, Margin) |
| TurboIntegrator | TM1's ETL process — loads data from sources into cubes |
| Chore | A scheduled sequence of TI processes |
| Rule | A formula that calculates a cube cell value dynamically |
| Feeder | A statement that tells TM1 which cells are populated by a Rule |
| Slice | Fix one dimension value and view the rest (e.g. only Year = 2024) |
| Drill-down | Navigate from a consolidation to its children (Year → Quarter → Month) |
| Write-back | Entering data directly into a cube cell — used in budgeting |
| Sparse cube | A cube where most intersections have no value (real-world cubes are 99%+ sparse) |
| OLAP | Online Analytical Processing — technology built for analysis, not transactions |
| Star schema | SQL equivalent of a cube: fact table at centre, dimension tables around it |
