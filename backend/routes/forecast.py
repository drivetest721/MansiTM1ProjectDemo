"""
Forecast Routes
Handles forecasting and scenario analysis API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.forecast_service import ForecastService
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== SCENARIO ENDPOINTS ====================

@router.get("/scenarios", summary="Get all forecast scenarios")
async def get_scenarios(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get list of all available forecast scenarios
    
    Returns:
    - Base Case, Best Case, Worst Case scenarios
    - Scenario IDs and codes
    """
    try:
        service = ForecastService(db)
        scenarios = service.get_scenarios()
        return {
            "success": True,
            "data": scenarios
        }
    except Exception as e:
        logger.error(f"Error in get_scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching scenarios: {str(e)}")


@router.get("/scenarios/summary", summary="Get scenario summary for comparison")
async def get_scenario_summary(
    year: int = Query(..., description="Year for forecast"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get summary of all scenarios (Base, Best, Worst)
    
    Returns:
    - Revenue, expenses, net income, EBITDA for each scenario
    - Probability and color coding
    - Comparison metrics
    """
    try:
        service = ForecastService(db)
        summary = service.get_scenario_summary(year=year, entity=entity)
        return {
            "success": True,
            "data": summary
        }
    except Exception as e:
        logger.error(f"Error in get_scenario_summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching scenario summary: {str(e)}")


@router.get("/scenarios/{scenario_id}", summary="Get specific scenario data")
async def get_scenario_data(
    scenario_id: int,
    year: int = Query(..., description="Year for forecast"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed data for a specific scenario
    
    Returns:
    - Breakdown by account type
    - Revenue and expense details
    - Aggregated amounts
    """
    try:
        service = ForecastService(db)
        data = service.get_scenario_data(
            year=year,
            scenario_id=scenario_id,
            entity=entity
        )
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        logger.error(f"Error in get_scenario_data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching scenario data: {str(e)}")


# ==================== FORECAST TABLE ENDPOINTS ====================

@router.get("/table", summary="Get forecast table data")
async def get_forecast_table(
    year: int = Query(..., description="Year for forecast"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get forecast table with Budget, Forecast, and Variance
    
    Returns:
    - Budget amounts
    - Forecast amounts
    - Variance (amount and percentage)
    - Top variance accounts
    """
    try:
        service = ForecastService(db)
        table_data = service.get_forecast_table_data(year=year, entity=entity)
        return {
            "success": True,
            "data": table_data
        }
    except Exception as e:
        logger.error(f"Error in get_forecast_table: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching forecast table: {str(e)}")


# ==================== COMPARISON ENDPOINTS ====================

@router.post("/comparison", summary="Compare multiple scenarios")
async def compare_scenarios(
    year: int = Query(..., description="Year for comparison"),
    scenario_ids: List[int] = Query(..., description="List of scenario IDs to compare"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Compare multiple scenarios side-by-side
    
    Request body:
    - scenario_ids: Array of scenario IDs [1, 2, 3]
    
    Returns:
    - Revenue, expenses, net income for each scenario
    - Margin percentages
    - Comparison metrics
    """
    try:
        service = ForecastService(db)
        comparison = service.get_forecast_comparison(
            year=year,
            scenario_ids=scenario_ids,
            entity=entity
        )
        return {
            "success": True,
            "data": comparison
        }
    except Exception as e:
        logger.error(f"Error in compare_scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error comparing scenarios: {str(e)}")


# ==================== ASSUMPTIONS ENDPOINTS ====================

@router.get("/assumptions/{scenario_id}", summary="Get scenario assumptions")
async def get_scenario_assumptions(
    scenario_id: int,
    year: int = Query(..., description="Year for assumptions"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get planning assumptions for a specific scenario
    
    Returns:
    - Revenue growth assumptions
    - Cost inflation rates
    - Headcount growth
    - Currency exchange rates
    - Other planning parameters
    """
    try:
        service = ForecastService(db)
        assumptions = service.get_forecast_assumptions(
            year=year,
            scenario_id=scenario_id
        )
        return {
            "success": True,
            "data": assumptions
        }
    except Exception as e:
        logger.error(f"Error in get_scenario_assumptions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching assumptions: {str(e)}")
