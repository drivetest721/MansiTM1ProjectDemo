/*
=============================================================================
  db_materialized_views.sql
  Cross-Cutting DB Recommendation #2: Materialise heavy aggregation views

  SQL Server uses the term "Indexed View" for materialised views.
  An indexed view pre-computes and stores the aggregation result on disk.
  Reads hit the pre-built result set directly — like a cache in the DB layer.

  WHEN TO USE AN INDEXED VIEW
  ---------------------------
  - The view aggregates (SUM, COUNT) millions of rows
  - The underlying data changes only during ETL windows (not real-time writes)
  - The query always uses the same GROUP BY dimensions

  CONSTRAINTS (SQL Server specific)
  -----------------------------------
  - Must use SCHEMABINDING
  - No subqueries, CTEs, UNION, or DISTINCT in the view definition
  - Aggregate functions: only SUM and COUNT_BIG allowed (not AVG — compute manually)
  - All columns must be deterministic (no GETDATE(), no ISNULL on non-bound cols)
  - GROUP BY columns MUST be included in the unique clustered index

  ALTERNATIVE: Summary Table (simpler, no constraints)
  ----------------------------------------------------
  If the indexed view constraints are too restrictive, create a normal summary
  table and refresh it nightly via a SQL Agent job.  This is the approach used
  by most TM1 deployments for "pre-aggregated" data.
=============================================================================
*/

USE TM1EnterpriseDB;
GO


-- ============================================================================
-- APPROACH A: Indexed View on Revenue aggregation by Year + Region
-- ============================================================================
/*
CREATE VIEW Sales.vw_RevenueByYearRegion
WITH SCHEMABINDING
AS
    SELECT
        f.YearNumber,
        e.EntityName,
        f.RegionID,
        SUM(f.Revenue)  AS Revenue,
        SUM(f.Cost)     AS Cost,
        SUM(f.Margin)   AS Margin,
        COUNT_BIG(*)    AS RowCount   -- required by SQL Server for indexed views
    FROM Sales.FactRevenue f
    JOIN MasterData.DimEntity e ON f.EntityID = e.EntityID
    GROUP BY f.YearNumber, e.EntityName, f.RegionID;
GO

-- Create the unique clustered index — this is what materialises the view
CREATE UNIQUE CLUSTERED INDEX UIX_vw_RevenueByYearRegion
    ON Sales.vw_RevenueByYearRegion (YearNumber, EntityName, RegionID)
    WITH (FILLFACTOR = 90);
GO
*/


-- ============================================================================
-- APPROACH B: Summary Table (recommended if indexed views are too restrictive)
-- The ETL job drops and reloads this table nightly after the main cube refresh.
-- ============================================================================
/*
-- Create summary table once
CREATE TABLE Sales.SummaryRevenueByYear (
    YearNumber      INT           NOT NULL,
    EntityName      NVARCHAR(100) NOT NULL,
    RegionName      NVARCHAR(100) NOT NULL,
    ProductCategory NVARCHAR(100) NOT NULL,
    Revenue         DECIMAL(18,2) NOT NULL DEFAULT 0,
    Cost            DECIMAL(18,2) NOT NULL DEFAULT 0,
    Margin          DECIMAL(18,2) NOT NULL DEFAULT 0,
    RowCount        INT           NOT NULL DEFAULT 0,
    RefreshedAt     DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_SummaryRevenue PRIMARY KEY CLUSTERED
        (YearNumber, EntityName, RegionName, ProductCategory)
);
CREATE NONCLUSTERED INDEX IX_Summary_Entity ON Sales.SummaryRevenueByYear (EntityName);
CREATE NONCLUSTERED INDEX IX_Summary_Region ON Sales.SummaryRevenueByYear (RegionName);


-- Nightly refresh job (run via SQL Agent after ETL completes)
TRUNCATE TABLE Sales.SummaryRevenueByYear;

INSERT INTO Sales.SummaryRevenueByYear
    (YearNumber, EntityName, RegionName, ProductCategory, Revenue, Cost, Margin, RowCount)
SELECT
    YearNumber,
    EntityName,
    RegionName,
    ProductCategory,
    SUM(ISNULL(Revenue, 0)),
    SUM(ISNULL(Cost, 0)),
    SUM(ISNULL(Margin, 0)),
    COUNT(*)
FROM Sales.vw_RevenueCube_Source WITH (NOLOCK)
GROUP BY YearNumber, EntityName, RegionName, ProductCategory;
*/


-- ============================================================================
-- APPLICATION-LEVEL NOTE
-- ============================================================================
-- The EPM Portal backend already implements the application-layer equivalent
-- of materialisation via the module-level TTL cache in each service file
-- (_AGG_CACHE / _agg_cached).  This caches aggregation results in Python
-- memory for 300 seconds (5 minutes) — zero extra DB queries for repeated
-- requests within that window.
--
-- The DB-level approaches above are for when:
--   a) Multiple application servers share the same DB (Python cache is per-process)
--   b) The query itself is slow even on first call (> 2 seconds)
--   c) You want freshness guarantees tied to ETL completion, not elapsed time
-- ============================================================================
GO
