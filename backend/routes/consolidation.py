"""
Financial Consolidation API Routes
Provides entity hierarchy and consolidated financials
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.consolidation_service import ConsolidationService
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/hierarchy", summary="Get entity hierarchy")
async def get_entity_hierarchy(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get entity hierarchy with regional groupings
    
    Returns:
        Hierarchical structure: Global → Americas/APAC/EMEA → Individual Entities
    """
    try:
        service = ConsolidationService(db)
        hierarchy = service.get_entity_hierarchy()
        
        return {
            "success": True,
            "data": hierarchy
        }
    except Exception as e:
        logger.error(f"Error in get_entity_hierarchy: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching entity hierarchy: {str(e)}")


@router.get("/financial-data", summary="Get consolidated financial data by entity")
async def get_consolidated_financial_data(
    year: int = Query(2024, description="Year for consolidated financials"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get consolidated financial data by entity
    
    Returns entity-level data with:
    - Revenue
    - Expense
    - EBITDA
    - Net Income
    - Assets
    - Liabilities
    - Equity
    """
    try:
        service = ConsolidationService(db)
        data = service.get_consolidated_financial_data(year=year)
        
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        logger.error(f"Error in get_consolidated_financial_data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching consolidated financial data: {str(e)}")


@router.get("/cube-data", summary="Get hierarchical consolidated cube data")
async def get_consolidated_cube_data(
    year: int = Query(2024, description="Year for consolidated cube"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get consolidated financial data in hierarchical cube format
    
    Returns:
        Cube data with rows structured as:
        - Global (total)
          - Americas (subtotal)
            - Individual entities
          - APAC (subtotal)
            - Individual entities
          - EMEA (subtotal)
            - Individual entities
        
        Each row contains: Revenue, Expense, EBITDA, Net Income, Assets, Liabilities, Equity
    """
    try:
        service = ConsolidationService(db)
        cube_data = service.get_consolidated_cube_data(year=year)
        
        return {
            "success": True,
            "data": {
                "year": year,
                "rows": cube_data
            }
        }
    except Exception as e:
        logger.error(f"Error in get_consolidated_cube_data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching consolidated cube data: {str(e)}")
