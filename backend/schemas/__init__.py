from pydantic import BaseModel, Field
from typing import Optional
from datetime import date
from decimal import Decimal

# Dashboard Schemas
class KPICard(BaseModel):
    title: str
    value: float
    format: str = "number"  # number, currency, percentage
    trend: Optional[float] = None
    
class ChartData(BaseModel):
    labels: list[str]
    datasets: list[dict]
    
class DashboardResponse(BaseModel):
    kpis: list[KPICard]
    revenue_by_year: ChartData
    revenue_by_region: ChartData
    revenue_by_category: ChartData
    revenue_by_segment: ChartData
    payroll_by_department: ChartData
    budget_forecast_trend: ChartData
    pl_trend: ChartData

# Revenue Cube Schemas
class RevenueCubeFilters(BaseModel):
    year: Optional[list[int]] = None
    quarter: Optional[list[str]] = None
    month: Optional[list[int]] = None
    region: Optional[list[str]] = None
    entity: Optional[list[str]] = None
    product_category: Optional[list[str]] = None
    product_family: Optional[list[str]] = None
    customer_industry: Optional[list[str]] = None
    customer_segment: Optional[list[str]] = None
    version: Optional[list[str]] = None

class RevenueCubeMeasures(BaseModel):
    revenue: Decimal
    cost: Decimal
    quantity: Decimal
    margin: Decimal
    margin_pct: float

class RevenueCubeRow(BaseModel):
    year: int
    quarter: str
    month: int
    region: str
    entity: str
    product_category: str
    product_family: str
    customer_industry: str
    customer_segment: str
    revenue: Decimal
    cost: Decimal
    quantity: Decimal
    margin: Decimal
    margin_pct: float

class RevenueCubeResponse(BaseModel):
    data: list[RevenueCubeRow]
    total: RevenueCubeMeasures
    count: int

# Workforce Planning Schemas
class WorkforceCubeFilters(BaseModel):
    year: Optional[list[int]] = None
    department: Optional[list[str]] = None
    cost_center: Optional[list[str]] = None
    entity: Optional[list[str]] = None

class WorkforceCubeRow(BaseModel):
    year: int
    month: int
    department: str
    cost_center: str
    entity: str
    employee_name: str
    base_salary: Decimal
    bonus: Decimal
    benefits: Decimal
    total_compensation: Decimal

class WorkforceCubeResponse(BaseModel):
    data: list[WorkforceCubeRow]
    count: int

# Budget vs Forecast Schemas
class BudgetForecastFilters(BaseModel):
    year: Optional[list[int]] = None
    entity: Optional[list[str]] = None
    department: Optional[list[str]] = None
    account: Optional[list[str]] = None
    scenario: Optional[list[str]] = None
    version: Optional[list[str]] = None

class BudgetForecastRow(BaseModel):
    year: int
    month: int
    entity: str
    department: str
    account: str
    scenario: str
    version: str
    budget: Decimal
    forecast: Decimal
    variance: Decimal
    variance_pct: float

class BudgetForecastResponse(BaseModel):
    data: list[BudgetForecastRow]
    count: int

# Financial Consolidation Schemas
class FinancialConsolidationFilters(BaseModel):
    year: Optional[list[int]] = None
    entity: Optional[list[str]] = None
    department: Optional[list[str]] = None
    cost_center: Optional[list[str]] = None
    account: Optional[list[str]] = None

class FinancialConsolidationRow(BaseModel):
    year: int
    month: int
    entity: str
    department: str
    cost_center: str
    account: str
    account_type: str
    amount: Decimal

class FinancialConsolidationResponse(BaseModel):
    data: list[FinancialConsolidationRow]
    count: int

# Dimension Schemas
class DimensionHierarchyNode(BaseModel):
    code: str
    name: str
    level: int
    parent: Optional[str] = None
    children: list['DimensionHierarchyNode'] = []

class DimensionHierarchyResponse(BaseModel):
    dimension: str
    hierarchy: list[DimensionHierarchyNode]

# Admin Schemas
class TableStats(BaseModel):
    table_name: str
    schema_name: str
    row_count: int
    size_kb: int

class AdminStatsResponse(BaseModel):
    tables: list[TableStats]
    total_size_kb: int
    last_refresh: Optional[str] = None
