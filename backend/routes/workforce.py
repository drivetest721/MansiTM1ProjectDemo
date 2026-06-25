"""
Workforce Routes
Handles workforce API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.workforce_service import WorkforceService
from models.response_models import WorkforceListResponse, WorkforceAggregationResponse
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=WorkforceListResponse, summary="Get Workforce Data")
async def get_workforce(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=500, description="Page size"),
    year: Optional[int] = Query(None, description="Filter by year"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    department: Optional[str] = Query(None, description="Filter by department"),
    cost_center: Optional[str] = Query(None, description="Filter by cost center"),
    job_level: Optional[str] = Query(None, description="Filter by job level"),
    employment_status: Optional[str] = Query(None, description="Filter by employment status"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get paginated workforce data from HR.vw_WorkforceCube_Source
    
    Supports multiple filters and pagination for large datasets.
    Returns headcount, FTE, compensation details, and related metrics.
    """
    try:
        service = WorkforceService(db)
        return service.get_workforce_data(
            page=page,
            page_size=page_size,
            year=year,
            entity=entity,
            department=department,
            cost_center=cost_center,
            job_level=job_level,
            employment_status=employment_status,
            version=version
        )
    except Exception as e:
        logger.error(f"Error in get_workforce: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching workforce: {str(e)}")

@router.get("/by-department", response_model=WorkforceAggregationResponse, summary="Get Workforce by Department")
async def get_workforce_by_department(
    year: Optional[int] = Query(None, description="Filter by year"),
    entity: Optional[str] = Query(None, description="Filter by entity"),
    department: Optional[str] = Query(None, description="Filter by department"),
    job_level: Optional[str] = Query(None, description="Filter by job level"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """Get workforce aggregated by department"""
    try:
        service = WorkforceService(db)
        return service.get_workforce_by_department(year=year, entity=entity, department=department, job_level=job_level, version=version)
    except Exception as e:
        logger.error(f"Error in get_workforce_by_department: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching workforce by department: {str(e)}")


@router.get("/by-job-level", response_model=WorkforceAggregationResponse, summary="Get Workforce by Job Level")
async def get_workforce_by_job_level(
    year: Optional[int] = Query(None, description="Filter by year"),
    entity: Optional[str] = Query(None, description="Filter by entity"),
    department: Optional[str] = Query(None, description="Filter by department"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """Get workforce aggregated by job level"""
    try:
        service = WorkforceService(db)
        return service.get_workforce_by_job_level(year=year, entity=entity, department=department, version=version)
    except Exception as e:
        logger.error(f"Error in get_workforce_by_job_level: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching workforce by job level: {str(e)}")


@router.get("/drill-down", summary="Get Workforce Drill-Down Data")
async def get_workforce_drill_down(
    level: str = Query(..., description="Target level: department, cost_center, or employee"),
    parent_value: Optional[str] = Query(None, description="Parent dimension value"),
    year: Optional[int] = Query(None, description="Filter by year"),
    entity: Optional[str] = Query(None, description="Filter by entity"),
    db: Session = Depends(get_db)
):
    """
    Get drill-down data for hierarchical navigation in workforce cube
    
    Hierarchy: DepartmentName -> CostCenterName -> EmployeeName
    
    - **level**: Target level (department, cost_center, employee)
    - **parent_value**: Parent dimension value to drill down from
    - **year**: Optional year filter
    - **entity**: Optional entity filter
    
    Returns aggregated workforce metrics at the requested level.
    """
    try:
        service = WorkforceService(db)
        return service.get_drill_down(
            level=level,
            parent_value=parent_value,
            year=year,
            entity=entity
        )
    except ValueError as e:
        logger.error(f"Invalid drill-down parameters: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting workforce drill-down: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/by-entity", response_model=WorkforceAggregationResponse, summary="Get Workforce by Entity")
async def get_workforce_by_entity(
    year: Optional[int] = Query(None, description="Filter by year"),
    department: Optional[str] = Query(None, description="Filter by department"),
    job_level: Optional[str] = Query(None, description="Filter by job level"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """Get workforce aggregated by entity"""
    try:
        service = WorkforceService(db)
        return service.get_workforce_by_entity(year=year, department=department, job_level=job_level, version=version)
    except Exception as e:
        logger.error(f"Error in get_workforce_by_entity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching workforce by entity: {str(e)}")

@router.get("/by-department", response_model=WorkforceAggregationResponse, summary="Get Workforce by Department")
async def get_workforce_by_department_v2(
    year: Optional[int] = Query(None, description="Filter by year"),
    entity: Optional[str] = Query(None, description="Filter by entity"),
    department: Optional[str] = Query(None, description="Filter by department"),
    job_level: Optional[str] = Query(None, description="Filter by job level"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get workforce aggregated by department
    
    Returns summary statistics for each department:
    - Headcount and FTE
    - Total and average compensation
    - Base salary, bonus, benefits breakdown
    """
    try:
        service = WorkforceService(db)
        return service.get_workforce_by_department(year=year, entity=entity, department=department, job_level=job_level, version=version)
    except Exception as e:
        logger.error(f"Error in get_workforce_by_department: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching workforce by department: {str(e)}")


@router.get("/by-joblevel", response_model=WorkforceAggregationResponse, summary="Get Workforce by Job Level")
async def get_workforce_by_joblevel(
    year: Optional[int] = Query(None, description="Filter by year"),
    version: Optional[str] = Query(None, description="Filter by version"),
    db: Session = Depends(get_db)
):
    """
    Get workforce aggregated by job level
    
    Returns summary statistics for each job level:
    - Headcount and FTE
    - Total and average compensation
    - Base salary, bonus, benefits breakdown
    """
    try:
        service = WorkforceService(db)
        return service.get_workforce_by_job_level(year=year, version=version)  # kept for backward compat
    except Exception as e:
        logger.error(f"Error in get_workforce_by_joblevel: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching workforce by job level: {str(e)}")
