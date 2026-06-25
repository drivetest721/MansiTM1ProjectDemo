/*
=============================================================================
  db_indexes.sql
  Verified index recommendations for TM1EnterpriseDB on REAL_L001

  Fact tables confirmed from sys.dm_sql_referenced_entities:
    Sales.FactSales         -- Revenue cube
    HR.FactPayroll          -- Workforce cube
    Planning.FactBudget     -- Budget cube
    Planning.FactForecast   -- Forecast cube
    Finance.FactGL          -- P&L Statement + Balance Sheet + Consolidation

  All fact tables join to DimDate via DateID (YearNumber lives on DimDate,
  not on the fact table itself).  Indexes on DateID + EntityID are therefore
  the most important — they cover the WHERE clause of almost every API query.

  HOW TO RUN
  ----------
  1. Run in SSMS against TM1EnterpriseDB.
  2. Execute each CREATE INDEX statement individually.
  3. ONLINE = ON requires Enterprise Edition.
     On Standard Edition, remove "ONLINE = ON" — a brief lock will occur.
  4. Run db_statistics.sql afterwards to refresh query plan cache.
=============================================================================
*/

USE TM1EnterpriseDB;
GO


-- ============================================================================
-- DIMENSION TABLES
-- These are looked up on every query via JOINs.  Indexes on the filter columns
-- eliminate full scans of the dimension tables.
-- ============================================================================

-- DimDate: YearNumber is the most-filtered column across the entire portal.
-- A single index here benefits ALL five fact tables simultaneously.
CREATE NONCLUSTERED INDEX IX_DimDate_YearNumber
    ON MasterData.DimDate (YearNumber)
    INCLUDE (MonthName, QuarterName, DateID)
    WITH (FILLFACTOR = 90, ONLINE = ON);
GO

-- DimDate: monthly trend queries also filter on YearNumber + MonthName
CREATE NONCLUSTERED INDEX IX_DimDate_Year_Month
    ON MasterData.DimDate (YearNumber, MonthName)
    WITH (FILLFACTOR = 90, ONLINE = ON);
GO

-- DimEntity: EntityName is used as a filter on every page
CREATE NONCLUSTERED INDEX IX_DimEntity_EntityName
    ON MasterData.DimEntity (EntityName)
    INCLUDE (EntityID)
    WITH (FILLFACTOR = 90, ONLINE = ON);
GO

-- DimAccount: AccountType drives Revenue vs Expense filtering in forecasting
CREATE NONCLUSTERED INDEX IX_DimAccount_Type
    ON MasterData.DimAccount (AccountType)
    INCLUDE (AccountID, AccountName, AccountCode)
    WITH (FILLFACTOR = 90, ONLINE = ON);
GO

-- DimDepartment: filtered on CFO Budgeting and Workforce pages
CREATE NONCLUSTERED INDEX IX_DimDepartment_Name
    ON MasterData.DimDepartment (DepartmentName)
    INCLUDE (DepartmentID)
    WITH (FILLFACTOR = 90, ONLINE = ON);
GO

-- DimProduct: ProductCategory used on Revenue Planning page
CREATE NONCLUSTERED INDEX IX_DimProduct_Category
    ON MasterData.DimProduct (ProductCategory)
    INCLUDE (ProductID, ProductName)
    WITH (FILLFACTOR = 90, ONLINE = ON);
GO

-- DimRegion: RegionName used on Revenue Planning drill-down
CREATE NONCLUSTERED INDEX IX_DimRegion_Name
    ON MasterData.DimRegion (RegionName)
    INCLUDE (RegionID)
    WITH (FILLFACTOR = 90, ONLINE = ON);
GO


-- ============================================================================
-- Sales.FactSales  (Revenue cube — vw_RevenueCube_Source)
-- Common filters: Year → DateID, Entity → EntityID, Region → RegionID,
--                 Product → ProductID, Customer → CustomerID, Version → VersionID
-- Measures: Revenue, Cost  (Margin is computed in the view as Revenue - Cost)
-- ============================================================================

-- Primary filter: Year + Entity — used by every revenue query
CREATE NONCLUSTERED INDEX IX_FactSales_Date_Entity
    ON Sales.FactSales (DateID, EntityID)
    INCLUDE (Revenue, Cost, VersionID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO

-- Revenue by Region chart
CREATE NONCLUSTERED INDEX IX_FactSales_Date_Region
    ON Sales.FactSales (DateID, RegionID)
    INCLUDE (Revenue, Cost, EntityID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO

-- Revenue by Product chart
CREATE NONCLUSTERED INDEX IX_FactSales_Date_Product
    ON Sales.FactSales (DateID, ProductID)
    INCLUDE (Revenue, Cost, EntityID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO

-- Revenue by Customer Segment chart
CREATE NONCLUSTERED INDEX IX_FactSales_Date_Customer
    ON Sales.FactSales (DateID, CustomerID)
    INCLUDE (Revenue, Cost, EntityID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO


-- ============================================================================
-- HR.FactPayroll  (Workforce cube — vw_WorkforceCube_Source)
-- Common filters: Year → DateID, Entity → EntityID, Department → DepartmentID
-- Measures: BaseSalary, Bonus, Benefits
-- (TotalCompensation = BaseSalary + Bonus + Benefits — computed in the view)
-- ============================================================================

-- Primary filter: Year + Entity
CREATE NONCLUSTERED INDEX IX_FactPayroll_Date_Entity
    ON HR.FactPayroll (DateID, EntityID)
    INCLUDE (BaseSalary, Bonus, Benefits, DepartmentID, VersionID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO

-- Headcount / compensation by Department
CREATE NONCLUSTERED INDEX IX_FactPayroll_Date_Dept
    ON HR.FactPayroll (DateID, DepartmentID)
    INCLUDE (BaseSalary, Bonus, Benefits, EntityID, EmployeeID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO

-- Employee-level drill-down
CREATE NONCLUSTERED INDEX IX_FactPayroll_Date_Employee
    ON HR.FactPayroll (DateID, EmployeeID)
    INCLUDE (BaseSalary, Bonus, Benefits, EntityID, DepartmentID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO


-- ============================================================================
-- Planning.FactBudget  (Budget cube — vw_BudgetCube_Source)
-- Common filters: Year → DateID, Entity → EntityID, Version → VersionID,
--                 Department → DepartmentID, Account → AccountID
-- ============================================================================

-- Primary filter: Year + Entity + Version (CFO Budgeting page default)
CREATE NONCLUSTERED INDEX IX_FactBudget_Date_Entity_Version
    ON Planning.FactBudget (DateID, EntityID, VersionID)
    INCLUDE (BudgetAmount, DepartmentID, AccountID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO

-- Budget by Account chart
CREATE NONCLUSTERED INDEX IX_FactBudget_Date_Account
    ON Planning.FactBudget (DateID, AccountID)
    INCLUDE (BudgetAmount, EntityID, VersionID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO

-- Budget by Department chart
CREATE NONCLUSTERED INDEX IX_FactBudget_Date_Dept
    ON Planning.FactBudget (DateID, DepartmentID)
    INCLUDE (BudgetAmount, EntityID, VersionID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO


-- ============================================================================
-- Planning.FactForecast  (Forecast cube — vw_ForecastCube_Source)
-- Common filters: Year → DateID, Entity → EntityID, Scenario → ScenarioID
-- Note: ScenarioID is critical — monthly trend query filters ScenarioName = 'Base Case'
-- ============================================================================

-- Primary filter: Year + Entity + Scenario (Forecasting Analysis page)
CREATE NONCLUSTERED INDEX IX_FactForecast_Date_Entity_Scenario
    ON Planning.FactForecast (DateID, EntityID, ScenarioID)
    INCLUDE (ForecastAmount, AccountID, VersionID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO

-- Monthly trend: Year + Scenario + Account (AccountType filter via DimAccount join)
CREATE NONCLUSTERED INDEX IX_FactForecast_Date_Scenario_Account
    ON Planning.FactForecast (DateID, ScenarioID, AccountID)
    INCLUDE (ForecastAmount, EntityID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO


-- ============================================================================
-- Finance.FactGL  (P&L Statement + Balance Sheet + Financial Consolidation)
-- This single table powers THREE pages via three different views.
-- Common filters: Year → DateID, Entity → EntityID, Account → AccountID
-- ============================================================================

-- Primary filter: Year + Entity — used by all three finance views
CREATE NONCLUSTERED INDEX IX_FactGL_Date_Entity
    ON Finance.FactGL (DateID, EntityID)
    INCLUDE (Amount, AccountID, DepartmentID, VersionID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO

-- P&L / Balance Sheet: filtered by Account (AccountType lives on DimAccount)
CREATE NONCLUSTERED INDEX IX_FactGL_Date_Entity_Account
    ON Finance.FactGL (DateID, EntityID, AccountID)
    INCLUDE (Amount, VersionID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO

-- Consolidation: filtered by Entity + Version
CREATE NONCLUSTERED INDEX IX_FactGL_Date_Entity_Version
    ON Finance.FactGL (DateID, EntityID, VersionID)
    INCLUDE (Amount, AccountID)
    WITH (FILLFACTOR = 85, ONLINE = ON);
GO


-- ============================================================================
-- VERIFY: Check which indexes are being used after 1-2 weeks
-- Drop any index with 0 seeks + 0 scans (unused = wasted write overhead)
-- ============================================================================
SELECT
    OBJECT_SCHEMA_NAME(i.object_id) AS SchemaName,
    OBJECT_NAME(i.object_id)        AS TableName,
    i.name                          AS IndexName,
    ISNULL(u.user_seeks,   0)       AS Seeks,
    ISNULL(u.user_scans,   0)       AS Scans,
    ISNULL(u.user_updates, 0)       AS Writes,
    u.last_user_seek,
    u.last_user_scan
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats u
    ON i.object_id   = u.object_id
    AND i.index_id   = u.index_id
    AND u.database_id = DB_ID()
WHERE OBJECTPROPERTY(i.object_id, 'IsUserTable') = 1
  AND i.name LIKE 'IX_%'
ORDER BY (ISNULL(u.user_seeks, 0) + ISNULL(u.user_scans, 0)) ASC;
GO
