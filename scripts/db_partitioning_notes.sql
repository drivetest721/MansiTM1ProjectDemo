/*
=============================================================================
  db_partitioning_notes.sql
  Cross-Cutting DB Recommendation #4: Partitioning Strategy

  This is a reference / planning document — NOT ready to run as-is.
  Partitioning requires careful planning and a maintenance window.
  Involve your DBA before applying to production.

  WHEN TO PARTITION
  -----------------
  Partition a table when:
    - It has > 5 million rows AND
    - Queries almost always filter on a range column (e.g. YearNumber, MonthID)
    - Load operations INSERT large batches by date (partition switching = instant)

  CANDIDATE TABLES
  ----------------
  Based on query patterns in the EPM Portal (confirmed real table names):
    - Sales.FactSales            — filter always includes YearNumber (via DimDate.DateID)
    - HR.FactPayroll             — filter always includes YearNumber (via DimDate.DateID)
    - Planning.FactBudget        — filter always includes YearNumber (via DimDate.DateID)
    - Planning.FactForecast      — filter always includes YearNumber (via DimDate.DateID)
    - Finance.FactGL             — filter always includes YearNumber (via DimDate.DateID)
                                   backs P&L, Balance Sheet, AND Consolidation — highest impact

  NOTE: Fact tables join to MasterData.DimDate via DateID (int).
  YearNumber lives on DimDate, not directly on the fact table.
  Partition on DateID with boundaries mapped to year-start DateIDs,
  OR add a computed/persisted YearNumber column to the fact table first.

  STEP 1: Create partition function (one boundary per year)
=============================================================================
*/

USE TM1EnterpriseDB;
GO

-- ============================================================================
-- STEP 1: Partition function — range RIGHT means 2020 boundary covers [2020, 2021)
-- Add one boundary per year of data; extend as new years arrive.
-- ============================================================================
CREATE PARTITION FUNCTION PF_YearNumber (INT)
AS RANGE RIGHT FOR VALUES (2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026);
GO


-- ============================================================================
-- STEP 2: Partition scheme — map each partition to a filegroup.
-- Using [PRIMARY] for all partitions is fine for a single-disk server.
-- For production, spread year partitions across separate filegroups / disks.
-- ============================================================================
CREATE PARTITION SCHEME PS_YearNumber
AS PARTITION PF_YearNumber
ALL TO ([PRIMARY]);
GO


-- ============================================================================
-- STEP 3: Rebuild the target table on the partition scheme.
-- This requires:
--   a) A brief maintenance window (or ONLINE = ON on Enterprise Edition)
--   b) Dropping and re-creating the clustered index on YearNumber

-- EXAMPLES using confirmed real table/column names:
-- All fact tables use DateID (FK to MasterData.DimDate) not YearNumber directly.
-- Two options:
--   Option A: Add a persisted computed YearNumber column to the fact table, then partition on it.
--   Option B: Partition on DateID using DateID boundaries corresponding to year starts.
-- Option A shown below (simpler for the query optimiser).
-- ============================================================================

/*
-- OPTION A: Sales.FactSales — add persisted YearNumber, partition on it

-- Step 1: Add computed column (persisted = stored on disk, not recomputed per row)
ALTER TABLE Sales.FactSales
    ADD YearNumber AS (
        (SELECT d.YearNumber FROM MasterData.DimDate d WHERE d.DateID = DateID)
    ) PERSISTED;
-- NOTE: If DimDate is small, a simpler approach is to just add YearNumber
-- as an INT column populated by the ETL, then partition on it.

-- Step 2: Drop existing clustered index (PK on SaleID)
DROP INDEX PK_FactSales ON Sales.FactSales;

-- Step 3: Re-create clustered index on partition scheme
CREATE CLUSTERED INDEX IX_FactSales_Year_PK
    ON Sales.FactSales (YearNumber, SaleID)
    ON PS_YearNumber (YearNumber);

-- Repeat pattern for:
--   HR.FactPayroll       (PayrollID)
--   Planning.FactBudget  (BudgetID)
--   Planning.FactForecast (ForecastID)
--   Finance.FactGL       (GLID)  -- highest priority: backs 3 pages
*/


-- ============================================================================
-- STEP 4: Verify partition row distribution
-- ============================================================================
SELECT
    pf.name                 AS PartitionFunction,
    p.partition_number,
    prv.value               AS BoundaryValue,
    fg.name                 AS Filegroup,
    p.rows                  AS RowCount
FROM sys.partitions p
JOIN sys.indexes       i  ON p.object_id = i.object_id AND p.index_id = i.index_id
JOIN sys.objects       o  ON i.object_id = o.object_id
JOIN sys.partition_schemes ps ON i.data_space_id = ps.data_space_id
JOIN sys.partition_functions pf ON ps.function_id = pf.function_id
JOIN sys.destination_data_spaces dds ON ps.data_space_id = dds.partition_scheme_id
    AND p.partition_number = dds.destination_id
JOIN sys.filegroups fg ON dds.data_space_id = fg.data_space_id
LEFT JOIN sys.partition_range_values prv ON pf.function_id = prv.function_id
    AND prv.boundary_id = p.partition_number - 1
WHERE o.name IN ('FactSales','FactPayroll','FactBudget','FactForecast','FactGL')
ORDER BY o.name, p.partition_number;
GO


-- ============================================================================
-- PARTITION SWITCHING (zero-downtime bulk load pattern)
-- Once partitioned, you can load a new year's data into a staging table,
-- then switch it in atomically — no blocking, no rebuilds.
-- ============================================================================
/*
-- Load new data into a staging table on the same partition scheme
CREATE TABLE Sales.FactSales_2025_Stage (
    SaleID      BIGINT NOT NULL,
    DateID      INT NOT NULL,
    CustomerID  INT,
    ProductID   INT,
    RegionID    INT,
    EntityID    INT,
    VersionID   INT,
    Quantity    INT,
    Revenue     DECIMAL(18,2),
    Cost        DECIMAL(18,2),
    YearNumber  INT NOT NULL  -- persisted computed column
) ON PS_YearNumber (YearNumber);

-- Bulk-load 2025 data here...
INSERT INTO Sales.FactSales_2025_Stage ...

-- Atomic switch: replaces partition 8 (2025) instantly
ALTER TABLE Sales.FactSales_2025_Stage
    SWITCH TO Sales.FactSales PARTITION 8;

DROP TABLE Sales.FactSales_2025_Stage;
-- Same pattern applies to HR.FactPayroll, Planning.FactBudget/FactForecast, Finance.FactGL
*/
GO


-- ============================================================================
-- MAINTENANCE: Add a new year boundary each January
-- ============================================================================
/*
ALTER PARTITION FUNCTION PF_YearNumber()
    SPLIT RANGE (2027);   -- adds a boundary for 2027 at year-end 2026
*/
GO
