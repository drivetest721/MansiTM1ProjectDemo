"""
Finance Routes
Handles financial statement API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.finance_service import FinanceService
from models.response_models import (
    PLStatementResponse, BalanceSheetResponse, ConsolidationResponse
)
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== P&L ENDPOINTS ====================

@router.get("/pl", response_model=PLStatementResponse, summary="Get P&L Statement")
async def get_pl_statement(
    year: int = Query(..., description="Year for P&L statement"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
):
    """
    Get Profit & Loss Statement from Finance.vw_PL_Statement
    
    Returns complete P&L with:
    - Line items (revenue, expenses, net income)
    - Current year and prior year values
    - Variance amounts and percentages
    - Summary metrics
    """
    try:
        service = FinanceService(db)
        return service.get_pl_statement(year=year, entity=entity)
    except Exception as e:
        logger.error(f"Error in get_pl_statement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching P&L statement: {str(e)}")


@router.get("/pl/summary", summary="Get P&L Summary")
async def get_pl_summary(
    year: int = Query(..., description="Year for P&L summary"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get P&L summary metrics only (faster than full statement)
    
    Returns:
    - Total revenue
    - Total expenses
    - Net income
    - Net margin percentage
    """
    try:
        service = FinanceService(db)
        return service.get_pl_summary(year=year, entity=entity)
    except Exception as e:
        logger.error(f"Error in get_pl_summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching P&L summary: {str(e)}")


# ==================== BALANCE SHEET ENDPOINTS ====================

@router.get("/balancesheet", response_model=BalanceSheetResponse, summary="Get Balance Sheet")
async def get_balance_sheet(
    year: int = Query(..., description="Year for balance sheet"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
):
    """
    Get Balance Sheet from Finance.vw_BalanceSheet
    
    Returns complete balance sheet with:
    - Assets, liabilities, equity line items
    - Current and prior period values
    - Variance amounts and percentages
    - Balance validation (Assets = Liabilities + Equity)
    """
    try:
        service = FinanceService(db)
        return service.get_balance_sheet(year=year, entity=entity)
    except Exception as e:
        logger.error(f"Error in get_balance_sheet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching balance sheet: {str(e)}")


# ==================== CONSOLIDATION ENDPOINTS ====================

@router.get("/consolidation", response_model=ConsolidationResponse, summary="Get Financial Consolidation")
async def get_consolidation(
    year: int = Query(..., description="Year for consolidation"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
):
    """
    Get financial consolidation data from Finance.vw_EntityConsolidation
    
    Returns entity-level financial data:
    - Revenue, expenses, net income
    - Assets, liabilities, equity
    - Entity hierarchy information
    - Consolidated summary
    """
    try:
        service = FinanceService(db)
        return service.get_consolidation(year=year, entity=entity)
    except Exception as e:
        logger.error(f"Error in get_consolidation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching consolidation: {str(e)}")


@router.get("/consolidation/summary", summary="Get Consolidation Summary")
async def get_consolidation_summary(
    year: int = Query(..., description="Year for consolidation summary"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get consolidation summary by region
    
    Returns aggregated financial data by region:
    - Revenue, expenses, net income by region
    - Assets, liabilities, equity by region
    - Entity count by region
    - Grand total
    """
    try:
        service = FinanceService(db)
        return service.get_consolidation_summary(year=year)
    except Exception as e:
        logger.error(f"Error in get_consolidation_summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching consolidation summary: {str(e)}")
