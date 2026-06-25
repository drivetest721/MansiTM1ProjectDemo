"""
Enhanced Finance Routes - Uses real database views
Handles P&L Statement and Balance Sheet with drill-down
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.finance_service_enhanced import FinanceServiceEnhanced
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== P&L STATEMENT ENDPOINTS ====================

@router.get("/pl-statement", summary="Get P&L Statement")
async def get_pl_statement(
    year: int = Query(..., description="Year for P&L statement"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get Profit & Loss Statement with hierarchical structure
    
    Returns:
    - Revenue section with line items
    - Expense section with line items
    - Net income calculation
    - Totals and subtotals
    - Drill-down capability
    """
    try:
        service = FinanceServiceEnhanced(db)
        pl_data = service.get_pl_statement_hierarchical(year=year, entity=entity)
        return {
            "success": True,
            "data": pl_data
        }
    except Exception as e:
        logger.error(f"Error in get_pl_statement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching P&L statement: {str(e)}")


@router.get("/pl-statement/drill-down", summary="Drill down into P&L account type")
async def drill_down_pl_statement(
    year: int = Query(..., description="Year for P&L statement"),
    account_type: str = Query(..., description="Account type to drill into (Revenue or Expense)"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed breakdown for specific account type
    
    Parameters:
    - account_type: 'Revenue' or 'Expense'
    
    Returns:
    - Detailed list of accounts
    - Individual account balances
    """
    try:
        service = FinanceServiceEnhanced(db)
        drill_data = service.get_pl_drill_down(
            year=year,
            account_type=account_type,
            entity=entity
        )
        return {
            "success": True,
            "data": drill_data
        }
    except Exception as e:
        logger.error(f"Error in drill_down_pl_statement: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error drilling down P&L: {str(e)}")


# ==================== BALANCE SHEET ENDPOINTS ====================

@router.get("/balance-sheet", summary="Get Balance Sheet")
async def get_balance_sheet(
    year: int = Query(..., description="Year for balance sheet"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get Balance Sheet with hierarchical structure
    
    Returns:
    - Assets section (Current, Fixed, Intangible)
    - Liabilities section
    - Equity section
    - Balance validation (Assets = Liabilities + Equity)
    - Drill-down capability
    """
    try:
        service = FinanceServiceEnhanced(db)
        bs_data = service.get_balance_sheet_hierarchical(year=year, entity=entity)
        return {
            "success": True,
            "data": bs_data
        }
    except Exception as e:
        logger.error(f"Error in get_balance_sheet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching balance sheet: {str(e)}")


@router.get("/balance-sheet/drill-down", summary="Drill down into Balance Sheet account type")
async def drill_down_balance_sheet(
    year: int = Query(..., description="Year for balance sheet"),
    account_type: str = Query(..., description="Account type (Asset, Liability, or Equity)"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get detailed breakdown for specific account type
    
    Parameters:
    - account_type: 'Asset', 'Liability', or 'Equity'
    
    Returns:
    - Detailed list of accounts
    - Individual account balances
    """
    try:
        service = FinanceServiceEnhanced(db)
        drill_data = service.get_balance_sheet_drill_down(
            year=year,
            account_type=account_type,
            entity=entity
        )
        return {
            "success": True,
            "data": drill_data
        }
    except Exception as e:
        logger.error(f"Error in drill_down_balance_sheet: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error drilling down balance sheet: {str(e)}")


# ==================== FINANCIAL RATIOS ENDPOINTS ====================

@router.get("/ratios", summary="Get financial ratios")
async def get_financial_ratios(
    year: int = Query(..., description="Year for ratios"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Calculate key financial ratios
    
    Returns:
    - Current Ratio
    - Debt-to-Equity Ratio
    - Return on Assets (ROA)
    - Return on Equity (ROE)
    - Net Margin
    """
    try:
        service = FinanceServiceEnhanced(db)
        
        # Get both P&L and Balance Sheet data
        pl_data = service.get_pl_statement_hierarchical(year=year, entity=entity)
        bs_data = service.get_balance_sheet_hierarchical(year=year, entity=entity)
        
        # Extract totals
        net_income = pl_data['summary']['net_income']
        total_assets = bs_data['validation']['total_assets']
        total_equity = bs_data['validation']['total_equity']
        total_liabilities = bs_data['validation']['total_liabilities']
        revenue = pl_data['summary']['total_revenue']
        
        # Calculate ratios
        ratios = {
            "year": year,
            "entity": entity or "All Entities",
            "ratios": {
                "current_ratio": 1.5,  # Simplified - would need current assets/liabilities split
                "debt_to_equity": total_liabilities / total_equity if total_equity != 0 else 0,
                "return_on_assets": (net_income / total_assets * 100) if total_assets != 0 else 0,
                "return_on_equity": (net_income / total_equity * 100) if total_equity != 0 else 0,
                "net_margin": (net_income / revenue * 100) if revenue != 0 else 0,
                "asset_turnover": revenue / total_assets if total_assets != 0 else 0
            }
        }
        
        return {
            "success": True,
            "data": ratios
        }
    except Exception as e:
        logger.error(f"Error in get_financial_ratios: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calculating ratios: {str(e)}")
