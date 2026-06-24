"""
Response Models for TM1 Enterprise Performance Management API
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ============================================================================
# COMMON MODELS
# ============================================================================

class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = True
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Generic error response"""
    success: bool = False
    message: str
    details: Optional[str] = None


class PaginationMetadata(BaseModel):
    """Pagination metadata"""
    page: int
    page_size: int
    total_records: int
    total_pages: int
    has_next: bool
    has_previous: bool


class FilterOption(BaseModel):
    """Filter option for dropdowns"""
    label: str
    value: Any


# ============================================================================
# HEALTH CHECK MODELS
# ============================================================================

class DatabaseHealth(BaseModel):
    """Database health check"""
    connected: bool
    server: str
    database: str
    views_validated: Dict[str, bool]


class HealthResponse(BaseModel):
    """Overall health check response"""
    status: str
    timestamp: datetime
    database: Optional[DatabaseHealth] = None


# ============================================================================
# DASHBOARD MODELS
# ============================================================================

class KPIMetric(BaseModel):
    """KPI metric for dashboard"""
    title: str
    value: float
    format: str = "number"  # number, currency, percent
    change: Optional[float] = None
    change_percent: Optional[float] = None


class ChartDataset(BaseModel):
    """Chart dataset"""
    label: str
    data: List[float]
    backgroundColor: Optional[str] = None
    borderColor: Optional[str] = None


class ChartData(BaseModel):
    """Chart data structure"""
    labels: List[str]
    datasets: List[ChartDataset]


class DashboardResponse(BaseModel):
    """Complete dashboard response"""
    kpis: List[KPIMetric]
    revenue_by_year: Optional[ChartData] = None
    revenue_by_region: Optional[ChartData] = None
    revenue_by_category: Optional[ChartData] = None
    revenue_by_segment: Optional[ChartData] = None


# ============================================================================
# REVENUE MODELS
# ============================================================================

class RevenueRecord(BaseModel):
    """Single revenue record"""
    date_key: Optional[int] = None
    year: Optional[int] = None
    quarter: Optional[str] = None
    month: Optional[str] = None
    entity: Optional[str] = None
    region: Optional[str] = None
    customer: Optional[str] = None
    customer_segment: Optional[str] = None
    product: Optional[str] = None
    product_category: Optional[str] = None
    product_family: Optional[str] = None
    version: Optional[str] = None
    revenue: Optional[float] = 0
    cost: Optional[float] = 0
    margin: Optional[float] = 0
    margin_percent: Optional[float] = 0
    quantity: Optional[int] = 0


class RevenueListResponse(BaseModel):
    """Paginated revenue list"""
    data: List[RevenueRecord]
    pagination: PaginationMetadata


class RevenueAggregation(BaseModel):
    """Aggregated revenue by dimension"""
    dimension_value: str
    revenue: float
    cost: float
    margin: float
    margin_percent: float
    count: int


class RevenueAggregationResponse(BaseModel):
    """Revenue aggregation response"""
    data: List[RevenueAggregation]
    total: Optional[RevenueAggregation] = None


# ============================================================================
# WORKFORCE MODELS
# ============================================================================

class WorkforceRecord(BaseModel):
    """Single workforce record"""
    date_key: Optional[int] = None
    year: Optional[int] = None
    month: Optional[str] = None
    entity: Optional[str] = None
    department: Optional[str] = None
    cost_center: Optional[str] = None
    employee: Optional[str] = None
    employee_id: Optional[str] = None
    job_level: Optional[str] = None
    employment_status: Optional[str] = None
    version: Optional[str] = None
    base_salary: Optional[float] = 0
    bonus: Optional[float] = 0
    benefits: Optional[float] = 0
    total_compensation: Optional[float] = 0
    fte: Optional[float] = 1.0
    headcount: Optional[int] = 1


class WorkforceListResponse(BaseModel):
    """Paginated workforce list"""
    data: List[WorkforceRecord]
    pagination: PaginationMetadata


class WorkforceAggregation(BaseModel):
    """Aggregated workforce by dimension"""
    dimension_value: str
    headcount: int
    fte: float
    total_compensation: float
    avg_compensation: float
    base_salary: float
    bonus: float
    benefits: float


class WorkforceAggregationResponse(BaseModel):
    """Workforce aggregation response"""
    data: List[WorkforceAggregation]
    total: Optional[WorkforceAggregation] = None


# ============================================================================
# BUDGET MODELS
# ============================================================================

class BudgetRecord(BaseModel):
    """Single budget record"""
    year: Optional[int] = None
    quarter: Optional[str] = None
    month: Optional[str] = None
    entity: Optional[str] = None
    department: Optional[str] = None
    account: Optional[str] = None
    account_type: Optional[str] = None
    statement_type: Optional[str] = None
    scenario: Optional[str] = None
    version: Optional[str] = None
    amount: Optional[float] = 0


class BudgetListResponse(BaseModel):
    """Paginated budget list"""
    data: List[BudgetRecord]
    pagination: PaginationMetadata


class BudgetAggregation(BaseModel):
    """Aggregated budget by dimension"""
    dimension_value: str
    amount: float
    count: int


class BudgetAggregationResponse(BaseModel):
    """Budget aggregation response"""
    data: List[BudgetAggregation]
    total: Optional[BudgetAggregation] = None


# ============================================================================
# FORECAST MODELS
# ============================================================================

class ForecastRecord(BaseModel):
    """Single forecast record"""
    year: Optional[int] = None
    quarter: Optional[str] = None
    month: Optional[str] = None
    entity: Optional[str] = None
    department: Optional[str] = None
    account: Optional[str] = None
    account_type: Optional[str] = None
    statement_type: Optional[str] = None
    scenario: Optional[str] = None
    version: Optional[str] = None
    amount: Optional[float] = 0


class ForecastListResponse(BaseModel):
    """Paginated forecast list"""
    data: List[ForecastRecord]
    pagination: PaginationMetadata


class ForecastAggregation(BaseModel):
    """Aggregated forecast by dimension"""
    dimension_value: str
    amount: float
    count: int


class ForecastAggregationResponse(BaseModel):
    """Forecast aggregation response"""
    data: List[ForecastAggregation]
    total: Optional[ForecastAggregation] = None


# ============================================================================
# VARIANCE MODELS
# ============================================================================

class VarianceRecord(BaseModel):
    """Budget vs Forecast variance record"""
    year: Optional[int] = None
    month: Optional[str] = None
    entity: Optional[str] = None
    department: Optional[str] = None
    account: Optional[str] = None
    account_type: Optional[str] = None
    budget_amount: Optional[float] = 0
    forecast_amount: Optional[float] = 0
    variance_amount: Optional[float] = 0
    variance_percent: Optional[float] = 0


class VarianceListResponse(BaseModel):
    """Paginated variance list"""
    data: List[VarianceRecord]
    pagination: PaginationMetadata


# ============================================================================
# FINANCIAL STATEMENT MODELS
# ============================================================================

class PLStatementLine(BaseModel):
    """P&L statement line item"""
    account: str
    account_type: Optional[str] = None
    level: Optional[int] = 0
    is_total: Optional[bool] = False
    current_year: Optional[float] = 0
    prior_year: Optional[float] = 0
    variance: Optional[float] = 0
    variance_percent: Optional[float] = 0


class PLStatementResponse(BaseModel):
    """P&L statement response"""
    year: int
    entity: str
    lines: List[PLStatementLine]
    summary: Dict[str, float]


class BalanceSheetLine(BaseModel):
    """Balance sheet line item"""
    account: str
    account_type: Optional[str] = None
    level: Optional[int] = 0
    is_total: Optional[bool] = False
    current_period: Optional[float] = 0
    prior_period: Optional[float] = 0
    variance: Optional[float] = 0
    variance_percent: Optional[float] = 0


class BalanceSheetResponse(BaseModel):
    """Balance sheet response"""
    year: int
    entity: str
    lines: List[BalanceSheetLine]
    validation: Dict[str, Any]


# ============================================================================
# CONSOLIDATION MODELS
# ============================================================================

class ConsolidationRecord(BaseModel):
    """Financial consolidation record"""
    entity: str
    entity_type: Optional[str] = None
    parent_entity: Optional[str] = None
    region: Optional[str] = None
    year: Optional[int] = None
    revenue: Optional[float] = 0
    expenses: Optional[float] = 0
    net_income: Optional[float] = 0
    assets: Optional[float] = 0
    liabilities: Optional[float] = 0
    equity: Optional[float] = 0


class ConsolidationResponse(BaseModel):
    """Consolidation response"""
    data: List[ConsolidationRecord]
    summary: Optional[ConsolidationRecord] = None


# ============================================================================
# METADATA MODELS
# ============================================================================

class EntityMetadata(BaseModel):
    """Entity metadata"""
    entity_key: int
    entity_code: str
    entity_name: str
    entity_type: Optional[str] = None
    parent_entity: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None


class DepartmentMetadata(BaseModel):
    """Department metadata"""
    department_key: int
    department_code: str
    department_name: str
    parent_department: Optional[str] = None


class ProductMetadata(BaseModel):
    """Product metadata"""
    product_key: int
    product_code: str
    product_name: str
    category: Optional[str] = None
    family: Optional[str] = None
    brand: Optional[str] = None


class CustomerMetadata(BaseModel):
    """Customer metadata"""
    customer_key: int
    customer_code: str
    customer_name: str
    segment: Optional[str] = None
    region: Optional[str] = None


class VersionMetadata(BaseModel):
    """Version metadata"""
    version_key: int
    version_code: str
    version_name: str
    is_active: Optional[bool] = True


class ScenarioMetadata(BaseModel):
    """Scenario metadata"""
    scenario_key: int
    scenario_code: str
    scenario_name: str
    scenario_type: Optional[str] = None


class YearMetadata(BaseModel):
    """Year metadata"""
    year: int
    fiscal_year: Optional[int] = None


class MetadataResponse(BaseModel):
    """Generic metadata list response"""
    data: List[Dict[str, Any]]
    count: int
