"""
Enhanced Finance Service - Realistic implementation based on actual DB views
Handles P&L Statement and Balance Sheet with drill-down capability
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from decimal import Decimal

logger = logging.getLogger(__name__)


class FinanceServiceEnhanced:
    """Enhanced service for financial statement operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ============================================================================
    # P&L STATEMENT
    # ============================================================================
    
    def get_pl_statement_data(
        self,
        year: int,
        entity: Optional[str] = None,
        account_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get P&L statement data with aggregation by AccountType and AccountName
        
        Database view: Finance.vw_PL_Statement WITH (NOLOCK)
        Columns: YearNumber, EntityName, AccountType, AccountName, ActualAmount
        """
        try:
            where_clauses = ["YearNumber = :year"]
            params = {"year": year}
            
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            
            if account_type:
                where_clauses.append("AccountType = :account_type")
                params["account_type"] = account_type
            
            where_clause = " AND ".join(where_clauses)
            
            # Aggregate by AccountType and AccountName
            query = f"""
            SELECT 
                AccountType,
                AccountName,
                SUM(ISNULL(ActualAmount, 0)) as Actual
            FROM Finance.vw_PL_Statement WITH (NOLOCK)
            WHERE {where_clause}
            GROUP BY AccountType, AccountName
            ORDER BY 
                CASE AccountType 
                    WHEN 'Revenue' THEN 1 
                    WHEN 'Expense' THEN 2 
                    ELSE 3 
                END,
                AccountName
            """
            
            result = self.db.execute(text(query), params)
            rows = result.fetchall()
            result.close()
            
            return [
                {
                    "account_type": row.AccountType,
                    "account_name": row.AccountName,
                    "actual": float(row.Actual) if row.Actual else 0.0
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Error fetching P&L statement data: {str(e)}")
            raise
    
    def get_pl_statement_hierarchical(
        self,
        year: int,
        entity: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get P&L statement in hierarchical format for frontend
        Returns structured data with totals and subtotals
        """
        try:
            data = self.get_pl_statement_data(year=year, entity=entity)
            
            # Group by account type
            revenue_items = [d for d in data if d['account_type'] == 'Revenue']
            expense_items = [d for d in data if d['account_type'] == 'Expense']
            
            # Calculate totals
            total_revenue = sum(item['actual'] for item in revenue_items)
            total_expenses = sum(item['actual'] for item in expense_items)
            gross_profit = total_revenue - total_expenses
            net_income = gross_profit  # Simplified
            
            # Build hierarchical structure for frontend
            lines = []
            
            # Revenue section
            lines.append({
                "id": "revenue-header",
                "label": "Revenue",
                "actual": None,
                "budget": None,
                "forecast": None,
                "variance": None,
                "variancePercent": None,
                "indent": 0,
                "isSubtotal": True,
                "expandable": True,
                "level": "revenue"
            })
            
            for idx, item in enumerate(revenue_items[:5]):  # Limit for display
                lines.append({
                    "id": f"revenue-{idx}",
                    "label": item['account_name'],
                    "actual": item['actual'],
                    "budget": item['actual'] * 0.95,  # Simulated
                    "forecast": item['actual'] * 1.02,  # Simulated
                    "variance": item['actual'] - (item['actual'] * 0.95),
                    "variancePercent": 5.0,
                    "indent": 1,
                    "expandable": False
                })
            
            lines.append({
                "id": "total-revenue",
                "label": "Total Revenue",
                "actual": total_revenue,
                "budget": total_revenue * 0.95,
                "forecast": total_revenue * 1.02,
                "variance": total_revenue - (total_revenue * 0.95),
                "variancePercent": 5.0,
                "indent": 0,
                "isTotal": True
            })
            
            # Expense section
            lines.append({
                "id": "expense-header",
                "label": "Operating Expenses",
                "actual": None,
                "budget": None,
                "forecast": None,
                "variance": None,
                "variancePercent": None,
                "indent": 0,
                "isSubtotal": True,
                "expandable": True,
                "level": "expense"
            })
            
            for idx, item in enumerate(expense_items[:5]):  # Limit for display
                lines.append({
                    "id": f"expense-{idx}",
                    "label": item['account_name'],
                    "actual": item['actual'],
                    "budget": item['actual'] * 1.05,  # Simulated
                    "forecast": item['actual'] * 0.98,  # Simulated
                    "variance": item['actual'] - (item['actual'] * 1.05),
                    "variancePercent": -5.0,
                    "indent": 1,
                    "expandable": False
                })
            
            lines.append({
                "id": "total-expenses",
                "label": "Total Operating Expenses",
                "actual": total_expenses,
                "budget": total_expenses * 1.05,
                "forecast": total_expenses * 0.98,
                "variance": total_expenses - (total_expenses * 1.05),
                "variancePercent": -5.0,
                "indent": 0,
                "isTotal": True
            })
            
            # Net Income
            lines.append({
                "id": "net-income",
                "label": "Net Income",
                "actual": net_income,
                "budget": net_income * 0.90,
                "forecast": net_income * 1.05,
                "variance": net_income - (net_income * 0.90),
                "variancePercent": 10.0,
                "indent": 0,
                "isTotal": True
            })
            
            return {
                "year": year,
                "entity": entity or "All Entities",
                "lines": lines,
                "summary": {
                    "total_revenue": total_revenue,
                    "total_expenses": total_expenses,
                    "gross_profit": gross_profit,
                    "net_income": net_income,
                    "net_margin_percent": (net_income / total_revenue * 100) if total_revenue > 0 else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error building hierarchical P&L: {str(e)}")
            raise
    
    def get_pl_drill_down(
        self,
        year: int,
        account_type: str,
        entity: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get detailed drill-down for specific account type"""
        try:
            return self.get_pl_statement_data(
                year=year,
                entity=entity,
                account_type=account_type
            )
        except Exception as e:
            logger.error(f"Error in P&L drill-down: {str(e)}")
            raise
    
    # ============================================================================
    # BALANCE SHEET
    # ============================================================================
    
    def get_balance_sheet_data(
        self,
        year: int,
        entity: Optional[str] = None,
        account_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get Balance Sheet data with aggregation
        
        Database view: Finance.vw_BalanceSheet WITH (NOLOCK)
        Columns: YearNumber, EntityName, AccountType, AccountName, BalanceAmount
        """
        try:
            where_clauses = ["YearNumber = :year"]
            params = {"year": year}
            
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            
            if account_type:
                where_clauses.append("AccountType = :account_type")
                params["account_type"] = account_type
            
            where_clause = " AND ".join(where_clauses)
            
            query = f"""
            SELECT 
                AccountType,
                AccountName,
                SUM(ISNULL(BalanceAmount, 0)) as Balance
            FROM Finance.vw_BalanceSheet WITH (NOLOCK)
            WHERE {where_clause}
            GROUP BY AccountType, AccountName
            ORDER BY 
                CASE AccountType 
                    WHEN 'Asset' THEN 1 
                    WHEN 'Liability' THEN 2 
                    WHEN 'Equity' THEN 3
                    ELSE 4 
                END,
                AccountName
            """
            
            result = self.db.execute(text(query), params)
            rows = result.fetchall()
            result.close()
            
            return [
                {
                    "account_type": row.AccountType,
                    "account_name": row.AccountName,
                    "balance": float(row.Balance) if row.Balance else 0.0
                }
                for row in rows
            ]
            
        except Exception as e:
            logger.error(f"Error fetching balance sheet data: {str(e)}")
            raise
    
    def get_balance_sheet_hierarchical(
        self,
        year: int,
        entity: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get Balance Sheet in hierarchical format for frontend"""
        try:
            data = self.get_balance_sheet_data(year=year, entity=entity)
            
            # Group by account type
            asset_items = [d for d in data if d['account_type'] == 'Asset']
            liability_items = [d for d in data if d['account_type'] == 'Liability']
            equity_items = [d for d in data if d['account_type'] == 'Equity']
            
            # Calculate totals
            total_assets = sum(item['balance'] for item in asset_items)
            total_liabilities = sum(item['balance'] for item in liability_items)
            total_equity = sum(item['balance'] for item in equity_items)
            
            # Build hierarchical structure
            lines = []
            
            # Assets section
            lines.append({
                "id": "assets-header",
                "label": "ASSETS",
                "actual": None,
                "budget": None,
                "forecast": None,
                "indent": 0,
                "isTotal": True
            })
            
            for idx, item in enumerate(asset_items[:5]):
                lines.append({
                    "id": f"asset-{idx}",
                    "label": item['account_name'],
                    "actual": item['balance'],
                    "budget": item['balance'] * 1.02,
                    "forecast": item['balance'] * 1.05,
                    "variance": item['balance'] - (item['balance'] * 1.02),
                    "variancePercent": -2.0,
                    "indent": 1
                })
            
            lines.append({
                "id": "total-assets",
                "label": "Total Assets",
                "actual": total_assets,
                "budget": total_assets * 1.02,
                "forecast": total_assets * 1.05,
                "variance": total_assets - (total_assets * 1.02),
                "variancePercent": -2.0,
                "indent": 0,
                "isTotal": True
            })
            
            # Liabilities section
            lines.append({
                "id": "liabilities-header",
                "label": "LIABILITIES",
                "actual": None,
                "budget": None,
                "forecast": None,
                "indent": 0,
                "isTotal": True
            })
            
            for idx, item in enumerate(liability_items[:5]):
                lines.append({
                    "id": f"liability-{idx}",
                    "label": item['account_name'],
                    "actual": item['balance'],
                    "budget": item['balance'] * 0.98,
                    "forecast": item['balance'] * 0.95,
                    "variance": item['balance'] - (item['balance'] * 0.98),
                    "variancePercent": 2.0,
                    "indent": 1
                })
            
            lines.append({
                "id": "total-liabilities",
                "label": "Total Liabilities",
                "actual": total_liabilities,
                "budget": total_liabilities * 0.98,
                "forecast": total_liabilities * 0.95,
                "variance": total_liabilities - (total_liabilities * 0.98),
                "variancePercent": 2.0,
                "indent": 0,
                "isTotal": True
            })
            
            # Equity section
            lines.append({
                "id": "equity-header",
                "label": "EQUITY",
                "actual": None,
                "budget": None,
                "forecast": None,
                "indent": 0,
                "isTotal": True
            })
            
            for idx, item in enumerate(equity_items[:5]):
                lines.append({
                    "id": f"equity-{idx}",
                    "label": item['account_name'],
                    "actual": item['balance'],
                    "budget": item['balance'] * 1.01,
                    "forecast": item['balance'] * 1.03,
                    "variance": item['balance'] - (item['balance'] * 1.01),
                    "variancePercent": -1.0,
                    "indent": 1
                })
            
            lines.append({
                "id": "total-equity",
                "label": "Total Equity",
                "actual": total_equity,
                "budget": total_equity * 1.01,
                "forecast": total_equity * 1.03,
                "variance": total_equity - (total_equity * 1.01),
                "variancePercent": -1.0,
                "indent": 0,
                "isTotal": True
            })
            
            liabilities_equity = total_liabilities + total_equity
            balanced = abs(total_assets - liabilities_equity) < 1.0
            
            return {
                "year": year,
                "entity": entity or "All Entities",
                "lines": lines,
                "validation": {
                    "total_assets": total_assets,
                    "total_liabilities": total_liabilities,
                    "total_equity": total_equity,
                    "liabilities_and_equity": liabilities_equity,
                    "balanced": balanced,
                    "difference": total_assets - liabilities_equity
                }
            }
            
        except Exception as e:
            logger.error(f"Error building hierarchical balance sheet: {str(e)}")
            raise
    
    def get_balance_sheet_drill_down(
        self,
        year: int,
        account_type: str,
        entity: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get detailed drill-down for specific account type"""
        try:
            return self.get_balance_sheet_data(
                year=year,
                entity=entity,
                account_type=account_type
            )
        except Exception as e:
            logger.error(f"Error in balance sheet drill-down: {str(e)}")
            raise
