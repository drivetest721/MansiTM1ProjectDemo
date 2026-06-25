"""
Finance Routes with Mapped Data
Uses intelligent aggregation to map real data to frontend labels
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from services.finance_service_mapped import FinanceServiceMapped
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/pl-statement-mapped", summary="Get P&L Statement with mapped real data")
async def get_pl_statement_mapped(
    year: int = Query(..., description="Year for P&L statement"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get Profit & Loss Statement with REAL DATA mapped to frontend labels
    
    - Aggregates multiple database accounts into single frontend labels
    - Example: "Inventory" aggregates Inventory, Stock, Raw Materials, Finished Goods, WIP
    - Maintains exact frontend structure and terminology
    
    Returns real actual amounts with simulated budget/forecast/variance
    """
    try:
        service = FinanceServiceMapped(db)
        lines = service.get_pl_statement_with_real_data(year=year, entity=entity)
        
        # Calculate summary
        revenue_line = next((l for l in lines if l['id'] == 'total-revenue'), None)
        net_income_line = next((l for l in lines if l['id'] == 'net-income'), None)
        gross_profit_line = next((l for l in lines if l['id'] == 'gross-profit'), None)
        
        summary = {
            "total_revenue": revenue_line['actual'] if revenue_line else 0,
            "net_income": net_income_line['actual'] if net_income_line else 0,
            "gross_profit": gross_profit_line['actual'] if gross_profit_line else 0
        }
        
        return {
            "success": True,
            "data": {
                "year": year,
                "entity": entity or "All Entities",
                "lines": lines,
                "summary": summary
            }
        }
    except Exception as e:
        logger.error(f"Error in get_pl_statement_mapped: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching mapped P&L statement: {str(e)}")


@router.get("/balance-sheet-mapped", summary="Get Balance Sheet with mapped real data")
async def get_balance_sheet_mapped(
    year: int = Query(..., description="Year for balance sheet"),
    entity: Optional[str] = Query(None, description="Filter by entity name"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get Balance Sheet with REAL DATA mapped to frontend labels
    
    - Aggregates multiple database accounts into single frontend labels
    - Example: "Cash & Cash Equivalents" aggregates Cash, Bank, Cash Equivalents, Money Market
    - Maintains exact frontend structure and terminology
    - Validates Assets = Liabilities + Equity
    
    Returns real actual amounts with simulated budget/variance
    """
    try:
        service = FinanceServiceMapped(db)
        result = service.get_balance_sheet_with_real_data(year=year, entity=entity)
        
        return {
            "success": True,
            "data": {
                "year": year,
                "entity": entity or "All Entities",
                "lines": result["lines"],
                "validation": result["validation"]
            }
        }
    except Exception as e:
        logger.error(f"Error in get_balance_sheet_mapped: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching mapped balance sheet: {str(e)}")
