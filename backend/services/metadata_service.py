"""
Metadata Service
Handles all metadata queries for filter dropdowns.

All public getter methods are cached with a 5-minute TTL via the module-level
`ttl_cache` decorator.  Metadata (entities, departments, versions, scenarios …)
changes very rarely; re-querying it on every page load was unnecessary DB load.
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict, Any

# cache.py lives one level up (backend/)
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cache import ttl_cache  # noqa: F401 (imported for completeness; _cached helper below is used directly)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level cache store: keyed by (method_name, *args)
# TTL = 300 s (5 minutes).  Increase if metadata is very stable.
# ---------------------------------------------------------------------------
_METADATA_TTL = 300


import time as _time

# ---------------------------------------------------------------------------
# Module-level cache store — shared across all MetadataService instances.
# Each entry: {"value": <data>, "ts": <monotonic timestamp>}
# ---------------------------------------------------------------------------
_cache: Dict[str, dict] = {}


def _cached(key: str, ttl: int, fn):
    """Return cached value if fresh, otherwise call fn() and store result."""
    now = _time.monotonic()
    entry = _cache.get(key)
    if entry and now - entry["ts"] < ttl:
        logger.debug(f"Metadata cache HIT [{key}]")
        return entry["value"]
    result = fn()
    _cache[key] = {"value": result, "ts": _time.monotonic()}
    logger.debug(f"Metadata cache MISS [{key}] — cached for {ttl}s")
    return result


class MetadataService:
    """Service for metadata operations — all lookup methods are TTL-cached."""

    def __init__(self, db: Session):
        self.db = db

    def get_entities(self) -> List[Dict[str, Any]]:
        """Get all entities (cached)"""
        return _cached("entities", _METADATA_TTL, self._fetch_entities)

    def _fetch_entities(self) -> List[Dict[str, Any]]:
        """
        Fetch distinct entity names from Sales.vw_RevenueCube_Source WITH (NOLOCK).

        The original query against MasterData.DimEntity failed because columns
        EntityKey / EntityType / ParentEntity / Region / Country do not exist in
        the actual table schema.  Using the Revenue view guarantees we only return
        entities that have live data, and all columns are confirmed to exist.
        """
        try:
            query = """
            SELECT DISTINCT
                EntityName
            FROM Sales.vw_RevenueCube_Source WITH (NOLOCK)
            WHERE EntityName IS NOT NULL
            ORDER BY EntityName
            """
            results = self.db.execute(text(query)).fetchall()
            return [
                {
                    "entity_key": idx + 1,
                    "entity_code": r.EntityName,
                    "entity_name": r.EntityName,
                    "entity_type": None,
                    "parent_entity": None,
                    "region": None,
                    "country": None
                }
                for idx, r in enumerate(results)
            ]
        except Exception as e:
            logger.error(f"Error fetching entities: {str(e)}")
            raise
    
    def get_departments(self) -> List[Dict[str, Any]]:
        """Get all departments (cached)"""
        return _cached("departments", _METADATA_TTL, self._fetch_departments)

    def _fetch_departments(self) -> List[Dict[str, Any]]:
        try:
            query = """
            SELECT
                DepartmentKey,
                DepartmentCode,
                DepartmentName,
                ParentDepartment
            FROM MasterData.DimDepartment WITH (NOLOCK)
            WHERE IsActive = 1
            ORDER BY DepartmentName
            """
            results = self.db.execute(text(query)).fetchall()
            return [
                {
                    "department_key": r.DepartmentKey,
                    "department_code": r.DepartmentCode,
                    "department_name": r.DepartmentName,
                    "parent_department": r.ParentDepartment
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching departments: {str(e)}")
            raise
    
    def get_products(self) -> List[Dict[str, Any]]:
        """Get all products (cached)"""
        return _cached("products", _METADATA_TTL, self._fetch_products)

    def _fetch_products(self) -> List[Dict[str, Any]]:
        try:
            query = """
            SELECT
                ProductKey,
                ProductCode,
                ProductName,
                Category,
                Family,
                Brand
            FROM MasterData.DimProduct WITH (NOLOCK)
            WHERE IsActive = 1
            ORDER BY ProductName
            """
            results = self.db.execute(text(query)).fetchall()
            return [
                {
                    "product_key": r.ProductKey,
                    "product_code": r.ProductCode,
                    "product_name": r.ProductName,
                    "category": r.Category,
                    "family": r.Family,
                    "brand": r.Brand
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching products: {str(e)}")
            raise
    
    def get_customers(self) -> List[Dict[str, Any]]:
        """Get all customers (cached)"""
        return _cached("customers", _METADATA_TTL, self._fetch_customers)

    def _fetch_customers(self) -> List[Dict[str, Any]]:
        try:
            query = """
            SELECT
                CustomerKey,
                CustomerCode,
                CustomerName,
                Segment,
                Region
            FROM MasterData.DimCustomer WITH (NOLOCK)
            WHERE IsActive = 1
            ORDER BY CustomerName
            """
            results = self.db.execute(text(query)).fetchall()
            return [
                {
                    "customer_key": r.CustomerKey,
                    "customer_code": r.CustomerCode,
                    "customer_name": r.CustomerName,
                    "segment": r.Segment,
                    "region": r.Region
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching customers: {str(e)}")
            raise
    
    def get_versions(self) -> List[Dict[str, Any]]:
        """Get all versions (cached)"""
        return _cached("versions", _METADATA_TTL, self._fetch_versions)

    def _fetch_versions(self) -> List[Dict[str, Any]]:
        try:
            query = """
            SELECT
                VersionKey,
                VersionCode,
                VersionName,
                IsActive
            FROM MasterData.DimVersion WITH (NOLOCK)
            ORDER BY VersionName
            """
            results = self.db.execute(text(query)).fetchall()
            return [
                {
                    "version_key": r.VersionKey,
                    "version_code": r.VersionCode,
                    "version_name": r.VersionName,
                    "is_active": bool(r.IsActive)
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching versions: {str(e)}")
            raise

    def get_scenarios(self) -> List[Dict[str, Any]]:
        """Get all scenarios (cached)"""
        return _cached("scenarios", _METADATA_TTL, self._fetch_scenarios)

    def _fetch_scenarios(self) -> List[Dict[str, Any]]:
        try:
            query = """
            SELECT
                ScenarioKey,
                ScenarioCode,
                ScenarioName,
                ScenarioType
            FROM MasterData.DimScenario WITH (NOLOCK)
            WHERE IsActive = 1
            ORDER BY ScenarioName
            """
            results = self.db.execute(text(query)).fetchall()
            return [
                {
                    "scenario_key": r.ScenarioKey,
                    "scenario_code": r.ScenarioCode,
                    "scenario_name": r.ScenarioName,
                    "scenario_type": r.ScenarioType
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching scenarios: {str(e)}")
            raise

    def get_years(self) -> List[Dict[str, Any]]:
        """Get all available years (cached)"""
        return _cached("years", _METADATA_TTL, self._fetch_years)

    def _fetch_years(self) -> List[Dict[str, Any]]:
        try:
            query = """
            SELECT DISTINCT
                YearNumber,
                CAST(YearNumber AS VARCHAR) AS YearName
            FROM Finance.vw_PL_Statement WITH (NOLOCK)
            UNION
            SELECT DISTINCT
                YearNumber,
                CAST(YearNumber AS VARCHAR) AS YearName
            FROM HR.vw_WorkforceCube_Source WITH (NOLOCK)
            ORDER BY YearNumber DESC
            """
            results = self.db.execute(text(query)).fetchall()
            return [{"year": r[0], "year_name": r[1]} for r in results]
        except Exception as e:
            logger.error(f"Error fetching years: {str(e)}")
            raise
    
    # ========================================================================
    # CUBE EXPLORER METHODS
    # ========================================================================
    
    def get_cubes(self) -> List[Dict[str, Any]]:
        """Get list of all available cubes"""
        try:
            cubes = [
                {
                    "cube_id": "revenue",
                    "cube_name": "Revenue Planning",
                    "description": "Revenue forecasting and planning cube",
                    "dimension_count": 6,
                    "measure_count": 5,
                    "status": "active",
                    "last_update": "2024-06-24"
                },
                {
                    "cube_id": "workforce",
                    "cube_name": "Workforce Planning",
                    "description": "Headcount and compensation planning cube",
                    "dimension_count": 5,
                    "measure_count": 6,
                    "status": "active",
                    "last_update": "2024-06-24"
                },
                {
                    "cube_id": "budget",
                    "cube_name": "Budget & Forecast",
                    "description": "Budget vs Forecast variance analysis cube",
                    "dimension_count": 6,
                    "measure_count": 5,
                    "status": "active",
                    "last_update": "2024-06-24"
                },
                {
                    "cube_id": "pl_statement",
                    "cube_name": "P&L Statement",
                    "description": "Profit & Loss statement financial cube",
                    "dimension_count": 4,
                    "measure_count": 4,
                    "status": "active",
                    "last_update": "2024-06-24"
                },
                {
                    "cube_id": "balance_sheet",
                    "cube_name": "Balance Sheet",
                    "description": "Balance sheet financial cube",
                    "dimension_count": 4,
                    "measure_count": 3,
                    "status": "active",
                    "last_update": "2024-06-24"
                }
            ]
            
            return cubes
        except Exception as e:
            logger.error(f"Error fetching cubes: {str(e)}")
            raise
    
    def get_cube_details(self, cube_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific cube"""
        try:
            cube_configs = {
                "revenue": {
                    "cube_id": "revenue",
                    "cube_name": "Revenue Planning",
                    "description": "Revenue forecasting and planning cube",
                    "dimensions": [
                        {"name": "Year", "type": "Time", "count": 5},
                        {"name": "Entity", "type": "Entity", "count": 20},
                        {"name": "Department", "type": "Department", "count": 30},
                        {"name": "Account", "type": "Account", "count": 200},
                        {"name": "Scenario", "type": "Scenario", "count": 3},
                        {"name": "Version", "type": "Version", "count": 2},
                    ],
                    "measures": ["ForecastAmount"],
                    "view": "Planning.vw_ForecastCube_Source WITH (NOLOCK)",
                    "cell_count": 0,
                    "last_update": "2024-06-24"
                },
                "workforce": {
                    "cube_id": "workforce",
                    "cube_name": "Workforce Planning",
                    "description": "Headcount and compensation planning cube",
                    "dimensions": [
                        {"name": "Year", "type": "Time", "count": 5},
                        {"name": "Entity", "type": "Entity", "count": 20},
                        {"name": "Department", "type": "Department", "count": 30},
                        {"name": "Cost Center", "type": "CostCenter", "count": 30},
                        {"name": "Employee", "type": "Employee", "count": 0},
                        {"name": "Version", "type": "Version", "count": 2},
                    ],
                    "measures": ["BaseSalary", "Bonus", "Benefits", "TotalCompensation", "BonusPercent", "BenefitsPercent"],
                    "view": "HR.vw_WorkforceCube_Source WITH (NOLOCK)",
                    "cell_count": 0,
                    "last_update": "2024-06-24"
                },
                "budget": {
                    "cube_id": "budget",
                    "cube_name": "Budget & Forecast",
                    "description": "Budget vs Forecast variance analysis cube",
                    "dimensions": [
                        {"name": "Year", "type": "Time", "count": 5},
                        {"name": "Month", "type": "Time", "count": 12},
                        {"name": "Entity", "type": "Entity", "count": 20},
                        {"name": "Department", "type": "Department", "count": 30},
                        {"name": "Account", "type": "Account", "count": 200},
                    ],
                    "measures": ["BudgetAmount", "ForecastAmount", "ActualAmount", "VarianceAmount", "VariancePercent"],
                    "view": "Planning.vw_BudgetForecastVariance WITH (NOLOCK)",
                    "cell_count": 0,
                    "last_update": "2024-06-24"
                },
                "pl_statement": {
                    "cube_id": "pl_statement",
                    "cube_name": "P&L Statement",
                    "description": "Profit & Loss statement financial cube",
                    "dimensions": [
                        {"name": "Year", "type": "Time", "count": 5},
                        {"name": "Entity", "type": "Entity", "count": 20},
                        {"name": "Account Type", "type": "Category", "count": 2},
                        {"name": "Account", "type": "Account", "count": 220},
                    ],
                    "measures": ["ActualAmount"],
                    "view": "Finance.vw_PL_Statement WITH (NOLOCK)",
                    "cell_count": 0,
                    "last_update": "2024-06-24"
                },
                "balance_sheet": {
                    "cube_id": "balance_sheet",
                    "cube_name": "Balance Sheet",
                    "description": "Balance sheet financial cube",
                    "dimensions": [
                        {"name": "Year", "type": "Time", "count": 5},
                        {"name": "Entity", "type": "Entity", "count": 20},
                        {"name": "Account Type", "type": "Category", "count": 3},
                        {"name": "Account", "type": "Account", "count": 80},
                    ],
                    "measures": ["BalanceAmount"],
                    "view": "Finance.vw_BalanceSheet WITH (NOLOCK)",
                    "cell_count": 0,
                    "last_update": "2024-06-24"
                }
            }


            cube = cube_configs.get(cube_id)
            if not cube:
                raise ValueError(f"Cube not found: {cube_id}")
            
            # Get actual cell count from database
            try:
                query = text(f"SELECT COUNT(*) FROM {cube['view']}")
                result = self.db.execute(query).fetchone()
                cube["cell_count"] = result[0]
            except:
                pass
            
            return cube
        except Exception as e:
            logger.error(f"Error fetching cube details for {cube_id}: {str(e)}")
            raise
    
    def get_cube_sample_data(self, cube_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get sample data from a cube"""
        try:
            cube_queries = {
                "revenue": """
                    SELECT TOP {limit}
                        YearNumber   AS Year,
                        EntityName   AS Entity,
                        DepartmentName AS Department,
                        AccountName  AS Account,
                        ScenarioName AS Scenario,
                        VersionName  AS Version,
                        ForecastAmount AS ForecastAmount
                    FROM Planning.vw_ForecastCube_Source WITH (NOLOCK)
                    ORDER BY YearNumber DESC
                """,
                "workforce": """
                    SELECT TOP {limit}
                        YearNumber       AS Year,
                        EntityName       AS Entity,
                        DepartmentName   AS Department,
                        CostCenterName   AS "Cost Center",
                        EmployeeName     AS Employee,
                        VersionName      AS Version,
                        BaseSalary       AS BaseSalary,
                        Bonus            AS Bonus,
                        Benefits         AS Benefits,
                        TotalCompensation AS TotalCompensation,
                        BonusPercent     AS BonusPercent,
                        BenefitsPercent  AS BenefitsPercent
                    FROM HR.vw_WorkforceCube_Source WITH (NOLOCK)
                    ORDER BY YearNumber DESC
                """,
                "budget": """
                    SELECT TOP {limit}
                        YearNumber     AS Year,
                        MonthName      AS Month,
                        EntityName     AS Entity,
                        DepartmentName AS Department,
                        AccountName    AS Account,
                        BudgetAmount   AS BudgetAmount,
                        ForecastAmount AS ForecastAmount,
                        ActualAmount   AS ActualAmount,
                        VarianceAmount AS VarianceAmount,
                        VariancePercent AS VariancePercent
                    FROM Planning.vw_BudgetForecastVariance WITH (NOLOCK)
                    ORDER BY YearNumber DESC
                """,
                "pl_statement": """
                    SELECT TOP {limit}
                        YearNumber  AS Year,
                        EntityName  AS Entity,
                        AccountType AS "Account Type",
                        AccountName AS Account,
                        ActualAmount AS ActualAmount
                    FROM Finance.vw_PL_Statement WITH (NOLOCK)
                    ORDER BY YearNumber DESC
                """,
                "balance_sheet": """
                    SELECT TOP {limit}
                        YearNumber  AS Year,
                        EntityName  AS Entity,
                        AccountType AS "Account Type",
                        AccountName AS Account,
                        BalanceAmount AS BalanceAmount
                    FROM Finance.vw_BalanceSheet WITH (NOLOCK)
                    ORDER BY YearNumber DESC
                """
            }


            query_template = cube_queries.get(cube_id)
            if not query_template:
                raise ValueError(f"Cube not found: {cube_id}")
            
            query = text(query_template.format(limit=limit))
            results = self.db.execute(query).fetchall()
            
            # Convert results to list of dicts
            sample_data = []
            for row in results:
                row_dict = {}
                for i, col_name in enumerate(row._fields):
                    val = row[i]
                    # Convert Decimal to float
                    if hasattr(val, 'real'):
                        val = float(val)
                    row_dict[col_name] = val
                sample_data.append(row_dict)
            
            return sample_data
        except Exception as e:
            logger.error(f"Error fetching cube sample data for {cube_id}: {str(e)}")
            raise
    
    # ========================================================================
    # DIMENSION EXPLORER METHODS
    # ========================================================================
    
    def get_dimensions(self) -> List[Dict[str, Any]]:
        """Get list of all dimensions"""
        try:
            dimensions = [
                {
                    "dimension_id": "entity",
                    "dimension_name": "Entity",
                    "description": "Business entities (companies, subsidiaries)",
                    "count": 20,
                    "has_hierarchy": True,
                    "type": "Entity"
                },
                {
                    "dimension_id": "department",
                    "dimension_name": "Department",
                    "description": "Organizational departments",
                    "count": 30,
                    "has_hierarchy": True,
                    "type": "Department"
                },
                {
                    "dimension_id": "account",
                    "dimension_name": "Account",
                    "description": "Chart of accounts",
                    "count": 300,
                    "has_hierarchy": True,
                    "type": "Account"
                },
                {
                    "dimension_id": "product",
                    "dimension_name": "Product",
                    "description": "Products and services",
                    "count": 150,
                    "has_hierarchy": True,
                    "type": "Product"
                },
                {
                    "dimension_id": "customer",
                    "dimension_name": "Customer",
                    "description": "Customer accounts",
                    "count": 500,
                    "has_hierarchy": False,
                    "type": "Customer"
                },
                {
                    "dimension_id": "time",
                    "dimension_name": "Time",
                    "description": "Time periods (year, quarter, month)",
                    "count": 60,
                    "has_hierarchy": True,
                    "type": "Time"
                },
                {
                    "dimension_id": "scenario",
                    "dimension_name": "Scenario",
                    "description": "Planning scenarios (Actual, Budget, Forecast)",
                    "count": 3,
                    "has_hierarchy": False,
                    "type": "Scenario"
                },
                {
                    "dimension_id": "version",
                    "dimension_name": "Version",
                    "description": "Data versions (Working, Final)",
                    "count": 2,
                    "has_hierarchy": False,
                    "type": "Version"
                }
            ]
            
            return dimensions
        except Exception as e:
            logger.error(f"Error fetching dimensions: {str(e)}")
            raise
    
    def get_dimension_details(self, dimension_id: str) -> Dict[str, Any]:
        """Get detailed information about a specific dimension"""
        try:
            dimension_configs = {
                "entity": {
                    "dimension_id": "entity",
                    "dimension_name": "Entity",
                    "description": "Business entities organized by geographic regions",
                    "count": 20,
                    "has_hierarchy": True,
                    "hierarchy_levels": ["Global", "Region", "Entity"],
                    "type": "Entity",
                    "attributes": ["EntityCode", "EntityName", "Region", "Country", "Currency"]
                },
                "department": {
                    "dimension_id": "department",
                    "dimension_name": "Department",
                    "description": "Organizational departments with rollup structure",
                    "count": 30,
                    "has_hierarchy": True,
                    "hierarchy_levels": ["Total Company", "Division", "Department"],
                    "type": "Department",
                    "attributes": ["DepartmentCode", "DepartmentName", "Manager", "CostCenter"]
                },
                "account": {
                    "dimension_id": "account",
                    "dimension_name": "Account",
                    "description": "Chart of accounts with financial statement structure",
                    "count": 300,
                    "has_hierarchy": True,
                    "hierarchy_levels": ["Total", "Category", "Account Type", "Account"],
                    "type": "Account",
                    "attributes": ["AccountCode", "AccountName", "AccountType", "FinancialStatement"]
                },
                "product": {
                    "dimension_id": "product",
                    "dimension_name": "Product",
                    "description": "Products organized by brand, family, and category",
                    "count": 150,
                    "has_hierarchy": True,
                    "hierarchy_levels": ["Total Products", "Brand", "Family", "Category", "Product"],
                    "type": "Product",
                    "attributes": ["ProductCode", "ProductName", "Brand", "Family", "Category"]
                },
                "customer": {
                    "dimension_id": "customer",
                    "dimension_name": "Customer",
                    "description": "Customer accounts",
                    "count": 500,
                    "has_hierarchy": False,
                    "hierarchy_levels": [],
                    "type": "Customer",
                    "attributes": ["CustomerCode", "CustomerName", "Segment", "Region"]
                },
                "time": {
                    "dimension_id": "time",
                    "dimension_name": "Time",
                    "description": "Time periods with year-quarter-month hierarchy",
                    "count": 60,
                    "has_hierarchy": True,
                    "hierarchy_levels": ["Total", "Year", "Quarter", "Month"],
                    "type": "Time",
                    "attributes": ["Year", "Quarter", "Month", "Period"]
                },
                "scenario": {
                    "dimension_id": "scenario",
                    "dimension_name": "Scenario",
                    "description": "Planning scenarios",
                    "count": 3,
                    "has_hierarchy": False,
                    "hierarchy_levels": [],
                    "type": "Scenario",
                    "attributes": ["ScenarioCode", "ScenarioName", "ScenarioType"]
                },
                "version": {
                    "dimension_id": "version",
                    "dimension_name": "Version",
                    "description": "Data versions",
                    "count": 2,
                    "has_hierarchy": False,
                    "hierarchy_levels": [],
                    "type": "Version",
                    "attributes": ["VersionCode", "VersionName", "IsActive"]
                }
            }
            
            dimension = dimension_configs.get(dimension_id)
            if not dimension:
                raise ValueError(f"Dimension not found: {dimension_id}")
            
            return dimension
        except Exception as e:
            logger.error(f"Error fetching dimension details for {dimension_id}: {str(e)}")
            raise
    
    def get_dimension_hierarchy(self, dimension_id: str) -> List[Dict[str, Any]]:
        """Get hierarchy structure for a dimension"""
        try:
            if dimension_id == "entity":
                # Get real entity hierarchy
                query = text("""
                    SELECT 
                        EntityName,
                        EntityName as EntityCode
                    FROM TM1.vw_Dim_Entity WITH (NOLOCK)
                    ORDER BY EntityName
                """)
                results = self.db.execute(query).fetchall()
                
                # Build hierarchy (Global → Americas/APAC/EMEA → Entities)
                hierarchy = [
                    {
                        "id": "global",
                        "name": "Global",
                        "level": 0,
                        "parent_id": None,
                        "children": [
                            {
                                "id": "americas",
                                "name": "Americas",
                                "level": 1,
                                "parent_id": "global",
                                "children": [
                                    {"id": e[0], "name": e[0], "level": 2, "parent_id": "americas", "children": []}
                                    for e in results if e[0] in ["USA", "Canada", "Mexico", "Brazil"]
                                ]
                            },
                            {
                                "id": "apac",
                                "name": "APAC",
                                "level": 1,
                                "parent_id": "global",
                                "children": [
                                    {"id": e[0], "name": e[0], "level": 2, "parent_id": "apac", "children": []}
                                    for e in results if e[0] in ["India", "Australia", "Singapore", "Japan", "China"]
                                ]
                            },
                            {
                                "id": "emea",
                                "name": "EMEA",
                                "level": 1,
                                "parent_id": "global",
                                "children": [
                                    {"id": e[0], "name": e[0], "level": 2, "parent_id": "emea", "children": []}
                                    for e in results if e[0] in ["UK", "Germany", "France", "Spain", "Italy", "Netherlands", "Belgium", "Switzerland", "Ireland", "UAE", "South Africa"]
                                ]
                            }
                        ]
                    }
                ]
                return hierarchy
            elif dimension_id == "account":
                # Get account hierarchy from actual data
                query = text("""
                    SELECT DISTINCT
                        AccountType,
                        AccountName
                    FROM Finance.vw_PL_Statement WITH (NOLOCK)
                    UNION
                    SELECT DISTINCT
                        AccountType,
                        AccountName
                    FROM Finance.vw_BalanceSheet WITH (NOLOCK)
                    ORDER BY AccountType, AccountName
                """)
                results = self.db.execute(query).fetchall()
                
                # Group by account type
                hierarchy_dict = {}
                for row in results:
                    acc_type = row[0]
                    acc_name = row[1]
                    if acc_type not in hierarchy_dict:
                        hierarchy_dict[acc_type] = []
                    hierarchy_dict[acc_type].append(acc_name)
                
                # Build hierarchy
                hierarchy = [
                    {
                        "id": "total",
                        "name": "Total",
                        "level": 0,
                        "parent_id": None,
                        "children": [
                            {
                                "id": acc_type,
                                "name": acc_type,
                                "level": 1,
                                "parent_id": "total",
                                "children": [
                                    {"id": acc_name, "name": acc_name, "level": 2, "parent_id": acc_type, "children": []}
                                    for acc_name in accounts
                                ]
                            }
                            for acc_type, accounts in hierarchy_dict.items()
                        ]
                    }
                ]
                return hierarchy
            else:
                # Return simulated hierarchy for other dimensions
                return [
                    {
                        "id": "total",
                        "name": f"Total {dimension_id.title()}",
                        "level": 0,
                        "parent_id": None,
                        "children": [
                            {
                                "id": f"{dimension_id}_1",
                                "name": f"{dimension_id.title()} Group 1",
                                "level": 1,
                                "parent_id": "total",
                                "children": [
                                    {"id": f"{dimension_id}_1_1", "name": f"{dimension_id.title()} Item 1.1", "level": 2, "parent_id": f"{dimension_id}_1", "children": []},
                                    {"id": f"{dimension_id}_1_2", "name": f"{dimension_id.title()} Item 1.2", "level": 2, "parent_id": f"{dimension_id}_1", "children": []}
                                ]
                            },
                            {
                                "id": f"{dimension_id}_2",
                                "name": f"{dimension_id.title()} Group 2",
                                "level": 1,
                                "parent_id": "total",
                                "children": [
                                    {"id": f"{dimension_id}_2_1", "name": f"{dimension_id.title()} Item 2.1", "level": 2, "parent_id": f"{dimension_id}_2", "children": []}
                                ]
                            }
                        ]
                    }
                ]
        except Exception as e:
            logger.error(f"Error fetching dimension hierarchy for {dimension_id}: {str(e)}")
            raise
    
    def get_dimension_elements(self, dimension_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get list of elements in a dimension"""
        try:
            if dimension_id == "entity":
                query = text(f"""
                    SELECT TOP {limit}
                        EntityName as element_name,
                        EntityName as element_code
                    FROM TM1.vw_Dim_Entity WITH (NOLOCK)
                    ORDER BY EntityName
                """)
            elif dimension_id == "account":
                query = text(f"""
                    SELECT TOP {limit}
                        AccountName as element_name,
                        AccountName as element_code
                    FROM (
                        SELECT DISTINCT AccountName FROM Finance.vw_PL_Statement WITH (NOLOCK)
                        UNION
                        SELECT DISTINCT AccountName FROM Finance.vw_BalanceSheet WITH (NOLOCK)
                    ) accounts
                    ORDER BY element_name
                """)
            else:
                # Return empty list for other dimensions
                return []
            
            results = self.db.execute(query).fetchall()
            
            elements = []
            for row in results:
                elements.append({
                    "element_name": row[0],
                    "element_code": row[1],
                    "element_type": "N"  # Numeric
                })
            
            return elements
        except Exception as e:
            logger.error(f"Error fetching dimension elements for {dimension_id}: {str(e)}")
            raise
            query = """
            SELECT DISTINCT 
                Year,
                FiscalYear
            FROM MasterData.DimDate WITH (NOLOCK)
            ORDER BY Year DESC
            """
            results = self.db.execute(text(query)).fetchall()
            
            return [
                {
                    "year": r.Year,
                    "fiscal_year": r.FiscalYear
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching years: {str(e)}")
            raise
    
    def get_accounts(self) -> List[Dict[str, Any]]:
        """Get all accounts (cached)"""
        return _cached("accounts", _METADATA_TTL, self._fetch_accounts)

    def _fetch_accounts(self) -> List[Dict[str, Any]]:
        try:
            query = """
            SELECT
                AccountKey,
                AccountCode,
                AccountName,
                AccountType,
                ParentAccount
            FROM MasterData.DimAccount WITH (NOLOCK)
            WHERE IsActive = 1
            ORDER BY AccountName
            """
            results = self.db.execute(text(query)).fetchall()
            return [
                {
                    "account_key": r.AccountKey,
                    "account_code": r.AccountCode,
                    "account_name": r.AccountName,
                    "account_type": r.AccountType,
                    "parent_account": r.ParentAccount
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching accounts: {str(e)}")
            raise

    def get_cost_centers(self) -> List[Dict[str, Any]]:
        """Get all cost centers (cached)"""
        return _cached("cost_centers", _METADATA_TTL, self._fetch_cost_centers)

    def _fetch_cost_centers(self) -> List[Dict[str, Any]]:
        try:
            query = """
            SELECT
                CostCenterKey,
                CostCenterCode,
                CostCenterName,
                DepartmentKey
            FROM MasterData.DimCostCenter WITH (NOLOCK)
            WHERE IsActive = 1
            ORDER BY CostCenterName
            """
            results = self.db.execute(text(query)).fetchall()
            return [
                {
                    "cost_center_key": r.CostCenterKey,
                    "cost_center_code": r.CostCenterCode,
                    "cost_center_name": r.CostCenterName,
                    "department_key": r.DepartmentKey
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching cost centers: {str(e)}")
            raise
