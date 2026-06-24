"""
Budget and Forecast Routes
Handles budget, forecast, and variance API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.budget_forecast_service import BudgetForecastService
from models.response_models import (
    BudgetListResponse, BudgetAggregationResponse,
    ForecastListResponse, ForecastAggregationResponse, VarianceListResponse
)
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== BUDGET ENDPOINTS ====================

@router.get("/budget", response_model=BudgetListResponse, summary="Get Budget Data")
async def get_budget(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=1000, description="Page size"),
    year: Optional[int] = Query(None, description="Filter by year"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    department: Optional[str] = Query(None, description="Filter by department"),
    account: Optional[str] = Query(None, description="Filter by account"),
    scenario: Optional[str] = Query(None, description="Filter by scenario"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get paginated budget data from Planning.vw_BudgetCube_Source
    
    Supports multiple filters and pagination for large datasets.
    Returns budget amounts by account, department, entity, etc.
    """
    try:
        service = BudgetForecastService(db)
        return service.get_budget_data(
            page=page,
            page_size=page_size,
            year=year,
            entity=entity,
            department=department,
            account=account,
            scenario=scenario,
            version=version
        )
    except Exception as e:
        logger.error(f"Error in get_budget: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching budget: {str(e)}")


@router.get("/budget/by-account", response_model=BudgetAggregationResponse, summary="Get Budget by Account")
async def get_budget_by_account(
    year: Optional[int] = Query(None, description="Filter by year"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get budget aggregated by account
    
    Returns summary statistics for each account:
    - Total budget amount
    - Record count
    """
    try:
        service = BudgetForecastService(db)
        return service.get_budget_by_account(year=year, version=version)
    except Exception as e:
        logger.error(f"Error in get_budget_by_account: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching budget by account: {str(e)}")


@router.get("/budget/by-department", response_model=BudgetAggregationResponse, summary="Get Budget by Department")
async def get_budget_by_department(
    year: Optional[int] = Query(None, description="Filter by year"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get budget aggregated by department
    
    Returns summary statistics for each department:
    - Total budget amount
    - Record count
    """
    try:
        service = BudgetForecastService(db)
        return service.get_budget_by_department(year=year, version=version)
    except Exception as e:
        logger.error(f"Error in get_budget_by_department: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching budget by department: {str(e)}")


@router.get("/budget/by-entity", response_model=BudgetAggregationResponse, summary="Get Budget by Entity")
async def get_budget_by_entity(
    year: Optional[int] = Query(None, description="Filter by year"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get budget aggregated by entity
    
    Returns summary statistics for each entity:
    - Total budget amount
    - Record count
    """
    try:
        service = BudgetForecastService(db)
        return service.get_budget_by_entity(year=year, version=version)
    except Exception as e:
        logger.error(f"Error in get_budget_by_entity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching budget by entity: {str(e)}")


# ==================== FORECAST ENDPOINTS ====================

@router.get("/forecast", response_model=ForecastListResponse, summary="Get Forecast Data")
async def get_forecast(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=1000, description="Page size"),
    year: Optional[int] = Query(None, description="Filter by year"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    department: Optional[str] = Query(None, description="Filter by department"),
    account: Optional[str] = Query(None, description="Filter by account"),
    scenario: Optional[str] = Query(None, description="Filter by scenario"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get paginated forecast data from Planning.vw_ForecastCube_Source
    
    Supports multiple filters and pagination for large datasets.
    Returns forecast amounts by account, department, entity, etc.
    """
    try:
        service = BudgetForecastService(db)
        return service.get_forecast_data(
            page=page,
            page_size=page_size,
            year=year,
            entity=entity,
            department=department,
            account=account,
            scenario=scenario,
            version=version
        )
    except Exception as e:
        logger.error(f"Error in get_forecast: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching forecast: {str(e)}")


@router.get("/forecast/by-account", response_model=ForecastAggregationResponse, summary="Get Forecast by Account")
async def get_forecast_by_account(
    year: Optional[int] = Query(None, description="Filter by year"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get forecast aggregated by account
    
    Returns summary statistics for each account:
    - Total forecast amount
    - Record count
    """
    try:
        service = BudgetForecastService(db)
        return service.get_forecast_by_account(year=year, version=version)
    except Exception as e:
        logger.error(f"Error in get_forecast_by_account: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching forecast by account: {str(e)}")


@router.get("/forecast/by-department", response_model=ForecastAggregationResponse, summary="Get Forecast by Department")
async def get_forecast_by_department(
    year: Optional[int] = Query(None, description="Filter by year"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get forecast aggregated by department
    
    Returns summary statistics for each department:
    - Total forecast amount
    - Record count
    """
    try:
        service = BudgetForecastService(db)
        return service.get_forecast_by_department(year=year, version=version)
    except Exception as e:
        logger.error(f"Error in get_forecast_by_department: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching forecast by department: {str(e)}")


# ==================== VARIANCE ENDPOINTS ====================

@router.get("/variance", response_model=VarianceListResponse, summary="Get Budget vs Forecast Variance")
async def get_variance(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=1000, description="Page size"),
    year: Optional[int] = Query(None, description="Filter by year"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    department: Optional[str] = Query(None, description="Filter by department"),
    account: Optional[str] = Query(None, description="Filter by account"),
    db: Session = Depends(get_db)
):
    """
    Get budget vs forecast variance from Planning.vw_BudgetForecastVariance
    
    Returns variance analysis:
    - Budget amount
    - Forecast amount
    - Variance amount (Forecast - Budget)
    - Variance percentage
    """
    try:
        service = BudgetForecastService(db)
        return service.get_variance_data(
            page=page,
            page_size=page_size,
            year=year,
            entity=entity,
            department=department,
            account=account
        )
    except Exception as e:
        logger.error(f"Error in get_variance: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching variance: {str(e)}")


@router.get("/budget/drill-down", summary="Get Budget Drill-Down Data")
async def get_budget_drill_down(
    level: str = Query(..., description="Target level: statement, account_type, or account"),
    parent_value: Optional[str] = Query(None, description="Parent dimension value"),
    year: Optional[int] = Query(None, description="Filter by year"),
    entity: Optional[str] = Query(None, description="Filter by entity"),
    scenario: Optional[str] = Query(None, description="Filter by scenario"),
    db: Session = Depends(get_db)
):
    """
    Get drill-down data for hierarchical navigation in budget cube
    
    Hierarchy: StatementType -> AccountType -> AccountName
    
    - **level**: Target level (statement, account_type, account)
    - **parent_value**: Parent dimension value to drill down from
    - **year**: Optional year filter
    - **entity**: Optional entity filter
    - **scenario**: Optional scenario filter
    
    Returns aggregated budget metrics at the requested level.
    """
    try:
        service = BudgetForecastService(db)
        return service.get_budget_drill_down(
            level=level,
            parent_value=parent_value,
            year=year,
            entity=entity,
            scenario=scenario
        )
    except ValueError as e:
        logger.error(f"Invalid drill-down parameters: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting budget drill-down: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
