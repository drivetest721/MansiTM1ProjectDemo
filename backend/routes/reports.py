"""
Management Report Routes
PAX-style monthly management reports with account hierarchy,
mixed Actual/Forecast columns, MTD & YTD.
Also handles saved custom reports (JSON file storage).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from services.report_service import ReportService
from typing import Optional, Any, Dict
from datetime import datetime
import logging, json, os, uuid

logger = logging.getLogger(__name__)
router = APIRouter()

_SAVED_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'saved_reports.json')


def _load_saved() -> list:
    os.makedirs(os.path.dirname(_SAVED_FILE), exist_ok=True)
    if not os.path.exists(_SAVED_FILE):
        return []
    try:
        with open(_SAVED_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return []


def _write_saved(reports: list) -> None:
    os.makedirs(os.path.dirname(_SAVED_FILE), exist_ok=True)
    with open(_SAVED_FILE, 'w') as f:
        json.dump(reports, f, indent=2)


class SaveReportBody(BaseModel):
    name: str
    config: Dict[str, Any]


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


# ─── Saved Reports (Custom Report Studio → Management Reports) ──────────────

@router.get("/saved", summary="List all saved custom reports")
async def list_saved_reports():
    return _load_saved()


@router.post("/saved", summary="Save a custom report from Report Studio")
async def save_report(body: SaveReportBody):
    reports = _load_saved()
    entry = {
        "id":         str(uuid.uuid4()),
        "name":       body.name,
        "config":     body.config,
        "created_at": datetime.utcnow().isoformat(),
    }
    reports.append(entry)
    _write_saved(reports)
    return entry


@router.put("/saved/{report_id}", summary="Update a saved report's name and config")
async def update_saved_report(report_id: str, body: SaveReportBody):
    reports = _load_saved()
    for i, r in enumerate(reports):
        if r["id"] == report_id:
            reports[i] = {**r, "name": body.name, "config": body.config}
            _write_saved(reports)
            return reports[i]
    raise HTTPException(status_code=404, detail="Report not found")


@router.delete("/saved/{report_id}", summary="Delete a saved report")
async def delete_saved_report(report_id: str):
    reports = _load_saved()
    updated = [r for r in reports if r["id"] != report_id]
    if len(updated) == len(reports):
        raise HTTPException(status_code=404, detail="Report not found")
    _write_saved(updated)
    return {"ok": True}
