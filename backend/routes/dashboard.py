"""
Dashboard Routes
Handles dashboard API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.dashboard_service import DashboardService
from models.response_models import DashboardResponse, KPIMetric, ChartData
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=DashboardResponse, summary="Get Complete Dashboard")
async def get_dashboard(db: Session = Depends(get_db)):
    """
    Get complete dashboard with all KPIs and charts
    
    Returns:
    - All dashboard KPIs (revenue, cost, margin, employees, etc.)
    - Revenue by year chart
    - Revenue by region chart
    - Revenue by category chart
    - Revenue by segment chart
    """
    try:
        service = DashboardService(db)
        return service.get_complete_dashboard()
    except Exception as e:
        logger.error(f"Error in get_dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard: {str(e)}")


@router.get("/kpis", response_model=List[KPIMetric], summary="Get Dashboard KPIs Only")
async def get_dashboard_kpis(db: Session = Depends(get_db)):
    """
    Get dashboard KPIs only (without charts)
    
    Returns all key performance indicators:
    - Total Revenue
    - Total Cost
    - Total Margin
    - Margin Percent
    - Total Employees
    - Total Customers
    - Total Products
    - Total Budget
    - Total Forecast
    """
    try:
        service = DashboardService(db)
        return service.get_dashboard_kpis()
    except Exception as e:
        logger.error(f"Error in get_dashboard_kpis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching KPIs: {str(e)}")


@router.get("/revenue-by-year", response_model=ChartData, summary="Get Revenue by Year Chart")
async def get_revenue_by_year(db: Session = Depends(get_db)):
    """Get revenue aggregated by year for charting"""
    try:
        service = DashboardService(db)
        return service.get_revenue_by_year_chart()
    except Exception as e:
        logger.error(f"Error in get_revenue_by_year: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching revenue by year: {str(e)}")


@router.get("/revenue-by-region", response_model=ChartData, summary="Get Revenue by Region Chart")
async def get_revenue_by_region(db: Session = Depends(get_db)):
    """Get revenue aggregated by region for charting"""
    try:
        service = DashboardService(db)
        return service.get_revenue_by_region_chart()
    except Exception as e:
        logger.error(f"Error in get_revenue_by_region: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching revenue by region: {str(e)}")


@router.get("/revenue-by-category", response_model=ChartData, summary="Get Revenue by Category Chart")
async def get_revenue_by_category(db: Session = Depends(get_db)):
    """Get revenue aggregated by product category for charting"""
    try:
        service = DashboardService(db)
        return service.get_revenue_by_category_chart()
    except Exception as e:
        logger.error(f"Error in get_revenue_by_category: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching revenue by category: {str(e)}")


@router.get("/revenue-by-segment", response_model=ChartData, summary="Get Revenue by Segment Chart")
async def get_revenue_by_segment(db: Session = Depends(get_db)):
    """Get revenue aggregated by customer segment for charting"""
    try:
        service = DashboardService(db)
        return service.get_revenue_by_segment_chart()
    except Exception as e:
        logger.error(f"Error in get_revenue_by_segment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching revenue by segment: {str(e)}")
