"""
Health Check Routes
Handles health check and system status endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models.response_models import HealthResponse, DatabaseHealth
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=HealthResponse, summary="Basic Health Check")
async def health_check():
    """
    Basic health check endpoint
    
    Returns:
    - Status: healthy
    - Timestamp: Current server time
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now()
    )


@router.get("/database", response_model=HealthResponse, summary="Database Health Check")
async def health_check_database(db: Session = Depends(get_db)):
    """
    Database health check endpoint
    
    Verifies:
    - SQL Server connection
    - Database accessibility
    - All critical views exist
    
    Returns detailed database health information
    """
    try:
        # Test basic connection
        db.execute(text("SELECT 1")).fetchone()
        
        # Verify critical views
        views_to_check = [
            "Sales.vw_RevenueCube_Source",
            "HR.vw_WorkforceCube_Source",
            "Planning.vw_BudgetCube_Source",
            "Planning.vw_ForecastCube_Source",
            "Finance.vw_PL_Statement",
            "Finance.vw_BalanceSheet",
            "Finance.vw_EntityConsolidation"
        ]
        
        view_status = {}
        for view in views_to_check:
            try:
                db.execute(text(f"SELECT TOP 1 * FROM {view}")).fetchone()
                view_status[view] = True
            except Exception as e:
                logger.warning(f"View {view} not accessible: {str(e)}")
                view_status[view] = False
        
        # Get server and database name
        server_result = db.execute(text("SELECT @@SERVERNAME as ServerName, DB_NAME() as DatabaseName")).fetchone()
        
        db_health = DatabaseHealth(
            connected=True,
            server=server_result.ServerName if server_result else "Unknown",
            database=server_result.DatabaseName if server_result else "Unknown",
            views_validated=view_status
        )
        
        all_views_valid = all(view_status.values())
        status = "healthy" if all_views_valid else "degraded"
        
        return HealthResponse(
            status=status,
            timestamp=datetime.now(),
            database=db_health
        )
        
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"Database health check failed: {str(e)}"
        )


@router.get("/views", summary="Check All Views")
async def health_check_views(db: Session = Depends(get_db)):
    """
    Check all critical database views
    
    Returns detailed status for each view including record counts
    """
    try:
        views_to_check = {
            "Sales.vw_RevenueCube_Source": "Revenue Cube",
            "HR.vw_WorkforceCube_Source": "Workforce Cube",
            "Planning.vw_BudgetCube_Source": "Budget Cube",
            "Planning.vw_ForecastCube_Source": "Forecast Cube",
            "Planning.vw_BudgetForecastVariance": "Budget vs Forecast Variance",
            "Finance.vw_PL_Statement": "P&L Statement",
            "Finance.vw_BalanceSheet": "Balance Sheet",
            "Finance.vw_EntityConsolidation": "Entity Consolidation"
        }
        
        view_details = []
        for view, description in views_to_check.items():
            try:
                count_result = db.execute(text(f"SELECT COUNT(*) as cnt FROM {view}")).fetchone()
                view_details.append({
                    "view": view,
                    "description": description,
                    "accessible": True,
                    "record_count": count_result.cnt if count_result else 0
                })
            except Exception as e:
                view_details.append({
                    "view": view,
                    "description": description,
                    "accessible": False,
                    "error": str(e)
                })
        
        all_accessible = all(v["accessible"] for v in view_details)
        
        return {
            "status": "healthy" if all_accessible else "degraded",
            "timestamp": datetime.now().isoformat(),
            "views": view_details
        }
        
    except Exception as e:
        logger.error(f"View health check failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"View health check failed: {str(e)}"
        )
