"""
Management Report Routes
PAX-style monthly management reports with account hierarchy,
mixed Actual/Forecast columns, MTD & YTD.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.report_service import ReportService
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/metadata", summary="Report parameter dropdowns")
async def get_report_metadata(db: Session = Depends(get_db)):
    """Return entities, years, scenarios and months for the Parameters page."""
    try:
        return ReportService(db).get_report_metadata()
    except Exception as e:
        logger.error(f"Error in get_report_metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/management-report", summary="PAX-style monthly management report")
async def get_management_report(
    year:              int            = Query(...,   description="Fiscal year"),
    current_period:    str            = Query(...,   description="Current month (e.g. Jun)"),
    entity:            Optional[str]  = Query(None,  description="Entity name filter"),
    actual_months:     int            = Query(3,     ge=1, le=12, description="Number of Actual months"),
    forecast_months:   int            = Query(9,     ge=0, le=12, description="Number of Forecast months"),
    budget_scenario:   str            = Query("Budget",   description="Budget scenario name"),
    actual_scenario:   str            = Query("Actual",   description="Actual scenario name"),
    forecast_scenario: str            = Query("Forecast", description="Forecast scenario name"),
    db: Session = Depends(get_db),
):
    """
    Returns a full management report payload:
    - account hierarchy rows
    - ordered month columns (actual then forecast)
    - cell matrix [account][month] = {value, budget, variance, variance_pct}
    - MTD summary per account
    - YTD summary per account
    """
    try:
        svc = ReportService(db)
        return svc.get_management_report(
            year=year,
            current_period=current_period,
            entity=entity,
            actual_months=actual_months,
            forecast_months=forecast_months,
            budget_scenario=budget_scenario,
            actual_scenario=actual_scenario,
            forecast_scenario=forecast_scenario,
        )
    except Exception as e:
        logger.error(f"Error in get_management_report: {e}")
        raise HTTPException(status_code=500, detail=str(e))
