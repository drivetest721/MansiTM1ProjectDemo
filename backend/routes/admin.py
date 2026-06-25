"""
Admin Routes - System Health and Monitoring Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import logging

from database import get_db
from services.admin_service import AdminService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/admin",
    tags=["Admin & Health"]
)


@router.get("/system-status")
def get_system_status(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get real-time system health status
    
    Returns SQL Server status, database size, active connections, and overall health
    """
    try:
        service = AdminService(db)
        status = service.get_system_status()
        
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/table-health")
def get_table_health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get health statistics for all major tables
    
    Returns table sizes, row counts, last update times, and health status
    """
    try:
        service = AdminService(db)
        tables = service.get_table_health()
        
        return {
            "success": True,
            "data": {
                "tables": tables,
                "total_tables": len(tables),
                "total_rows": sum(t["row_count"] for t in tables),
                "total_size_mb": round(sum(t["total_size_mb"] for t in tables), 2)
            }
        }
    except Exception as e:
        logger.error(f"Failed to get table health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cube-health")
def get_cube_health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get health statistics for TM1 cubes
    
    Returns cube metadata, dimension counts, cell counts, and status
    """
    try:
        service = AdminService(db)
        cubes = service.get_cube_health()
        
        return {
            "success": True,
            "data": {
                "cubes": cubes,
                "total_cubes": len(cubes),
                "total_cells": sum(c["cell_count"] for c in cubes)
            }
        }
    except Exception as e:
        logger.error(f"Failed to get cube health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/refresh-history")
def get_refresh_history(
    days: int = 30,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get data refresh history
    
    Args:
        days: Number of days to look back (default: 30)
    
    Returns refresh history for all data sources
    """
    try:
        service = AdminService(db)
        history = service.get_refresh_history(days=days)
        
        return {
            "success": True,
            "data": {
                "history": history,
                "days": days
            }
        }
    except Exception as e:
        logger.error(f"Failed to get refresh history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data-quality")
def get_data_quality(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get data quality summary
    
    Returns quality scores, null value counts, and overall data health
    """
    try:
        service = AdminService(db)
        quality = service.get_data_quality_summary()
        
        return {
            "success": True,
            "data": quality
        }
    except Exception as e:
        logger.error(f"Failed to get data quality: {e}")
        raise HTTPException(status_code=500, detail=str(e))
