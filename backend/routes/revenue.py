"""
Revenue Routes
Handles revenue API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.revenue_service import RevenueService
from models.response_models import RevenueListResponse, RevenueAggregationResponse
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=RevenueListResponse, summary="Get Revenue Data")
async def get_revenue(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Page size"),
    year: Optional[int] = Query(None, description="Filter by year"),
    quarter: Optional[str] = Query(None, description="Filter by quarter (Q1, Q2, Q3, Q4)"),
    month: Optional[str] = Query(None, description="Filter by month"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    region: Optional[str] = Query(None, description="Filter by region"),
    customer_segment: Optional[str] = Query(None, description="Filter by customer segment"),
    product_category: Optional[str] = Query(None, description="Filter by product category"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get paginated revenue data from Sales.vw_RevenueCube_Source
    
    Supports multiple filters and pagination for large datasets.
    Returns revenue, cost, margin, and related metrics.
    """
    try:
        service = RevenueService(db)
        return service.get_revenue_data(
            page=page,
            page_size=page_size,
            year=year,
            quarter=quarter,
            month=month,
            entity=entity,
            region=region,
            customer_segment=customer_segment,
            product_category=product_category,
            version=version
        )
    except Exception as e:
        logger.error(f"Error in get_revenue: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching revenue: {str(e)}")


@router.get("/by-region", response_model=RevenueAggregationResponse, summary="Get Revenue by Region")
async def get_revenue_by_region(
    year: Optional[int] = Query(None, description="Filter by year"),
    quarter: Optional[str] = Query(None, description="Filter by quarter"),
    entity: Optional[str] = Query(None, description="Filter by entity"),
    scenario: Optional[str] = Query(None, description="Filter by scenario"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get revenue aggregated by region
    
    Returns summary statistics for each region:
    - Total revenue, cost, margin
    - Margin percentage
    - Record count
    """
    try:
        service = RevenueService(db)
        return service.get_revenue_by_region(year=year, quarter=quarter, entity=entity, scenario=scenario, version=version)
    except Exception as e:
        logger.error(f"Error in get_revenue_by_region: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching revenue by region: {str(e)}")


@router.get("/by-product", response_model=RevenueAggregationResponse, summary="Get Revenue by Product")
async def get_revenue_by_product(
    year: Optional[int] = Query(None, description="Filter by year"),
    quarter: Optional[str] = Query(None, description="Filter by quarter"),
    region: Optional[str] = Query(None, description="Filter by region"),
    entity: Optional[str] = Query(None, description="Filter by entity"),
    scenario: Optional[str] = Query(None, description="Filter by scenario"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get revenue aggregated by product category
    
    Returns summary statistics for each product category:
    - Total revenue, cost, margin
    - Margin percentage
    - Record count
    """
    try:
        service = RevenueService(db)
        return service.get_revenue_by_product(year=year, quarter=quarter, region=region, entity=entity, scenario=scenario, version=version)
    except Exception as e:
        logger.error(f"Error in get_revenue_by_product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching revenue by product: {str(e)}")


@router.get("/by-customer-segment", response_model=RevenueAggregationResponse, summary="Get Revenue by Customer Segment")
async def get_revenue_by_customer_segment(
    year: Optional[int] = Query(None, description="Filter by year"),
    quarter: Optional[str] = Query(None, description="Filter by quarter"),
    region: Optional[str] = Query(None, description="Filter by region"),
    entity: Optional[str] = Query(None, description="Filter by entity"),
    scenario: Optional[str] = Query(None, description="Filter by scenario"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get revenue aggregated by customer segment
    
    Returns summary statistics for each customer segment:
    - Total revenue, cost, margin
    - Margin percentage
    - Record count
    """
    try:
        service = RevenueService(db)
        return service.get_revenue_by_customer_segment(year=year, quarter=quarter, region=region, entity=entity, scenario=scenario, version=version)
    except Exception as e:
        logger.error(f"Error in get_revenue_by_customer_segment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching revenue by customer segment: {str(e)}")


@router.get("/drill-down", summary="Get Revenue Drill-Down Data")
async def get_revenue_drill_down(
    level: str = Query(..., description="Target level: category, family, or product"),
    parent_value: Optional[str] = Query(None, description="Parent dimension value"),
    year: Optional[int] = Query(None, description="Filter by year"),
    quarter: Optional[str] = Query(None, description="Filter by quarter (Q1, Q2, Q3, Q4)"),
    region: Optional[str] = Query(None, description="Filter by region"),
    entity: Optional[str] = Query(None, description="Filter by entity"),
    scenario: Optional[str] = Query(None, description="Filter by scenario"),
    db: Session = Depends(get_db)
):
    """
    Get drill-down data for hierarchical navigation in revenue cube

    Hierarchy: ProductCategory -> ProductFamily -> ProductName

    - **level**: Target level (category, family, product)
    - **parent_value**: Parent dimension value to drill down from
    - **year**: Optional year filter
    - **quarter**: Optional quarter filter
    - **region**: Optional region filter
    - **entity**: Optional entity filter
    - **scenario**: Optional scenario filter

    Returns aggregated revenue metrics at the requested level.
    """
    try:

        service = RevenueService(db)
        result = service.get_drill_down(
            level=level,
            parent_value=parent_value,
            year=year,
            quarter=quarter,
            region=region,
            entity=entity,
            scenario=scenario
        )
        
        
        return result
    except ValueError as e:
        logger.error(f"Invalid drill-down parameters: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting revenue drill-down: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
