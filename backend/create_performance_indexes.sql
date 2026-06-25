-- =============================================================================
-- Performance Indexes for TM1 Enterprise Portal
-- Run this script once against your SQL Server database.
-- All indexes use IF NOT EXISTS guards so they are safe to re-run.
-- =============================================================================

USE [$(DB_NAME)];   -- replace $(DB_NAME) with your actual database name, or remove this line
GO

-- ---------------------------------------------------------------------------
-- 1. Revenue cube — commonly filtered columns
--    Covers: year, quarter, entity, region, scenario, version
-- ---------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('Sales.vw_RevenueCube_Source')
      AND name = 'IX_Revenue_Year_Quarter_Entity'
)
BEGIN
    -- Note: indexes on views require the view to be schema-bound (WITH SCHEMABINDING).
    -- If your views are not schema-bound, create the index on the underlying base table instead.
    -- Example below targets the base table — adjust the table name to match your schema.
    PRINT 'Creating IX_Revenue_Year_Quarter_Entity...';
    -- CREATE INDEX IX_Revenue_Year_Quarter_Entity
    --   ON Sales.<BaseTableName> (YearNumber, QuarterName, EntityName, RegionName, ScenarioName, VersionName);
    PRINT 'ACTION REQUIRED: Uncomment the CREATE INDEX above and replace <BaseTableName> with your actual table.';
END
ELSE
    PRINT 'IX_Revenue_Year_Quarter_Entity already exists — skipped.';
GO

-- ---------------------------------------------------------------------------
-- 2. Budget cube — commonly filtered columns
--    Covers: year, entity, department, account, scenario, version
-- ---------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('Planning.vw_BudgetCube_Source')
      AND name = 'IX_Budget_Year_Entity_Dept'
)
BEGIN
    PRINT 'Creating IX_Budget_Year_Entity_Dept...';
    -- CREATE INDEX IX_Budget_Year_Entity_Dept
    --   ON Planning.<BaseTableName> (YearNumber, EntityName, DepartmentName, AccountName, ScenarioName, VersionName);
    PRINT 'ACTION REQUIRED: Uncomment the CREATE INDEX above and replace <BaseTableName> with your actual table.';
END
ELSE
    PRINT 'IX_Budget_Year_Entity_Dept already exists — skipped.';
GO

-- ---------------------------------------------------------------------------
-- 3. Workforce cube — commonly filtered columns
--    Covers: year, entity, department, job level, version
-- ---------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('HR.vw_WorkforceCube_Source')
      AND name = 'IX_Workforce_Year_Entity_Dept'
)
BEGIN
    PRINT 'Creating IX_Workforce_Year_Entity_Dept...';
    -- CREATE INDEX IX_Workforce_Year_Entity_Dept
    --   ON HR.<BaseTableName> (YearNumber, EntityName, DepartmentName, JobLevel, VersionName);
    PRINT 'ACTION REQUIRED: Uncomment the CREATE INDEX above and replace <BaseTableName> with your actual table.';
END
ELSE
    PRINT 'IX_Workforce_Year_Entity_Dept already exists — skipped.';
GO

-- ---------------------------------------------------------------------------
-- 4. How to find the underlying base table of a view
-- ---------------------------------------------------------------------------
-- Run this to identify which base tables your views query:
--
--   SELECT DISTINCT
--       v.name AS ViewName,
--       t.name AS TableName,
--       s.name AS SchemaName
--   FROM sys.views v
--   JOIN sys.sql_expression_dependencies d ON d.referencing_id = v.object_id
--   JOIN sys.tables t ON t.object_id = d.referenced_id
--   JOIN sys.schemas s ON s.schema_id = t.schema_id
--   WHERE v.name IN (
--       'vw_RevenueCube_Source',
--       'vw_BudgetCube_Source',
--       'vw_WorkforceCube_Source'
--   );

-- ---------------------------------------------------------------------------
-- 5. Check existing index fragmentation (run periodically)
-- ---------------------------------------------------------------------------
-- SELECT
--     OBJECT_NAME(i.object_id)    AS TableName,
--     i.name                      AS IndexName,
--     ips.avg_fragmentation_in_percent,
--     ips.page_count
-- FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ips
-- JOIN sys.indexes i ON i.object_id = ips.object_id AND i.index_id = ips.index_id
-- WHERE ips.avg_fragmentation_in_percent > 10
--   AND ips.page_count > 100
-- ORDER BY ips.avg_fragmentation_in_percent DESC;
