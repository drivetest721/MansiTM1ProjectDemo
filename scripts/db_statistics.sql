/*
=============================================================================
  db_statistics.sql
  Cross-Cutting DB Recommendation #5: Statistics update job

  WHY THIS MATTERS
  ----------------
  SQL Server's query optimiser uses statistics (column value histograms) to
  choose execution plans.  On large tables that grow every night, auto-stats
  can become stale — the optimiser thinks a table has 10k rows when it actually
  has 10M, producing terrible plans (full scans instead of seeks).

  RECOMMENDED SCHEDULE
  --------------------
  Run via SQL Server Agent job: weekly during off-hours (e.g. Sunday 01:00).
  After any bulk ETL load that inserts > 20% of the table's rows, run ad-hoc.

  OPTION (FULLSCAN) vs DEFAULT
  ----------------------------
  FULLSCAN reads every row — most accurate but slowest.
  DEFAULT (SAMPLE 20%) is fine for most tables.
  Use FULLSCAN on dimension tables and tables < 5M rows.
=============================================================================
*/

USE TM1EnterpriseDB;
GO

-- ============================================================================
-- OPTION A: Update ALL statistics in the database (simple, comprehensive)
-- ============================================================================
EXEC sp_updatestats;   -- updates stats that are out of date (default sample rate)
GO


-- ============================================================================
-- OPTION B: FULLSCAN on the tables that matter most for query performance
-- Run this if sp_updatestats alone doesn't fix slow query plans.
-- Fact tables confirmed from sys.dm_sql_referenced_entities.
-- ============================================================================

-- Sales / Revenue  (Sales.FactSales backs vw_RevenueCube_Source)
UPDATE STATISTICS Sales.FactSales                         WITH FULLSCAN;
GO

-- HR / Workforce  (HR.FactPayroll backs vw_WorkforceCube_Source)
UPDATE STATISTICS HR.FactPayroll                          WITH FULLSCAN;
GO

-- Planning / Budget + Forecast
UPDATE STATISTICS Planning.FactBudget                     WITH FULLSCAN;
GO
UPDATE STATISTICS Planning.FactForecast                   WITH FULLSCAN;
GO

-- Finance  (Finance.FactGL backs vw_PL_Statement + vw_BalanceSheet + vw_EntityConsolidation)
UPDATE STATISTICS Finance.FactGL                          WITH FULLSCAN;
GO

-- Dimensions
UPDATE STATISTICS MasterData.DimDate                      WITH FULLSCAN;
GO
UPDATE STATISTICS MasterData.DimEntity                    WITH FULLSCAN;
GO
UPDATE STATISTICS MasterData.DimDepartment                WITH FULLSCAN;
GO
UPDATE STATISTICS MasterData.DimAccount                   WITH FULLSCAN;
GO
UPDATE STATISTICS MasterData.DimProduct                   WITH FULLSCAN;
GO
UPDATE STATISTICS MasterData.DimCustomer                  WITH FULLSCAN;
GO
UPDATE STATISTICS MasterData.DimRegion                    WITH FULLSCAN;
GO
UPDATE STATISTICS MasterData.DimEmployee                  WITH FULLSCAN;
GO
UPDATE STATISTICS MasterData.DimCostCenter                WITH FULLSCAN;
GO
UPDATE STATISTICS MasterData.DimVersion                   WITH FULLSCAN;
GO
UPDATE STATISTICS MasterData.DimScenario                  WITH FULLSCAN;
GO


-- ============================================================================
-- OPTION C: SQL Server Agent Job definition (paste into Agent → New Job → Step)
-- This runs OPTION A every Sunday at 01:00 automatically.
-- ============================================================================
/*
USE msdb;
GO
EXEC sp_add_job
    @job_name = N'TM1Portal_Weekly_Stats_Update';

EXEC sp_add_jobstep
    @job_name   = N'TM1Portal_Weekly_Stats_Update',
    @step_name  = N'Update All Statistics',
    @command    = N'USE TM1EnterpriseDB; EXEC sp_updatestats;',
    @database_name = N'TM1EnterpriseDB';

EXEC sp_add_schedule
    @schedule_name     = N'Weekly_Sunday_0100',
    @freq_type         = 8,         -- weekly
    @freq_interval     = 1,         -- Sunday
    @freq_recurrence_factor = 1,
    @active_start_time = 010000;    -- 01:00:00

EXEC sp_attach_schedule
    @job_name      = N'TM1Portal_Weekly_Stats_Update',
    @schedule_name = N'Weekly_Sunday_0100';

EXEC sp_add_jobserver
    @job_name = N'TM1Portal_Weekly_Stats_Update';
GO
*/


-- ============================================================================
-- CHECK: See which statistics are most out of date
-- ============================================================================
SELECT
    OBJECT_SCHEMA_NAME(s.object_id) AS SchemaName,
    OBJECT_NAME(s.object_id)        AS TableName,
    s.name                          AS StatName,
    sp.rows                         AS RowCount,
    sp.rows_sampled                 AS RowsSampled,
    sp.modification_counter         AS ModificationsSinceLastUpdate,
    sp.last_updated                 AS LastUpdated
FROM sys.stats s
CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) sp
WHERE OBJECTPROPERTY(s.object_id, 'IsUserTable') = 1
  AND sp.modification_counter > 0
ORDER BY sp.modification_counter DESC;
GO
