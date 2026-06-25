"""
Finance Service
Handles all business logic for financial statements and consolidation
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from models.response_models import (
    PLStatementLine, PLStatementResponse,
    BalanceSheetLine, BalanceSheetResponse,
    ConsolidationRecord, ConsolidationResponse
)

logger = logging.getLogger(__name__)


class FinanceService:
    """Service for financial statement operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_pl_statement(
        self,
        year: int,
        entity: Optional[str] = None
    ) -> PLStatementResponse:
        """Get P&L statement"""
        try:
            where_clauses = ["Year = :year"]
            params = {"year": year}
            
            if entity:
                where_clauses.append("Entity = :entity")
                params["entity"] = entity
            
            where_clause = "WHERE " + " AND ".join(where_clauses)
            
            query = f"""
            SELECT 
                Account,
                AccountType,
                Level,
                IsTotal,
                ISNULL(CurrentYear, 0) as CurrentYear,
                ISNULL(PriorYear, 0) as PriorYear,
                ISNULL(Variance, 0) as Variance,
                ISNULL(VariancePercent, 0) as VariancePercent
            FROM Finance.vw_PL_Statement WITH (NOLOCK)
            {where_clause}
            ORDER BY SortOrder, Account
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            lines = [
                PLStatementLine(
                    account=r.Account,
                    account_type=r.AccountType,
                    level=r.Level,
                    is_total=bool(r.IsTotal),
                    current_year=float(r.CurrentYear),
                    prior_year=float(r.PriorYear),
                    variance=float(r.Variance),
                    variance_percent=float(r.VariancePercent)
                )
                for r in results
            ]
            
            # Calculate summary metrics
            revenue = sum(l.current_year for l in lines if l.account_type == "Revenue")
            expenses = sum(l.current_year for l in lines if l.account_type == "Expense")
            net_income = revenue - expenses
            
            summary = {
                "total_revenue": revenue,
                "total_expenses": expenses,
                "gross_profit": revenue - expenses,
                "net_income": net_income,
                "net_margin_percent": (net_income / revenue * 100) if revenue > 0 else 0
            }
            
            logger.info(f"Retrieved P&L statement for year {year}, {len(lines)} lines")
            return PLStatementResponse(
                year=year,
                entity=entity or "All Entities",
                lines=lines,
                summary=summary
            )
            
        except Exception as e:
            logger.error(f"Error fetching P&L statement: {str(e)}")
            raise
    
    def get_pl_summary(
        self,
        year: int,
        entity: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get P&L summary metrics only"""
        try:
            where_clauses = ["Year = :year", "IsTotal = 1"]
            params = {"year": year}
            
            if entity:
                where_clauses.append("Entity = :entity")
                params["entity"] = entity
            
            where_clause = "WHERE " + " AND ".join(where_clauses)
            
            query = f"""
            SELECT 
                AccountType,
                SUM(ISNULL(CurrentYear, 0)) as Amount
            FROM Finance.vw_PL_Statement WITH (NOLOCK)
            {where_clause}
            GROUP BY AccountType
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            summary = {}
            for r in results:
                summary[r.AccountType] = float(r.Amount)
            
            revenue = summary.get("Revenue", 0)
            expenses = summary.get("Expense", 0)
            net_income = revenue - expenses
            
            return {
                "year": year,
                "entity": entity or "All Entities",
                "total_revenue": revenue,
                "total_expenses": expenses,
                "net_income": net_income,
                "net_margin_percent": (net_income / revenue * 100) if revenue > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error fetching P&L summary: {str(e)}")
            raise
    
    def get_balance_sheet(
        self,
        year: int,
        entity: Optional[str] = None
    ) -> BalanceSheetResponse:
        """Get balance sheet"""
        try:
            where_clauses = ["Year = :year"]
            params = {"year": year}
            
            if entity:
                where_clauses.append("Entity = :entity")
                params["entity"] = entity
            
            where_clause = "WHERE " + " AND ".join(where_clauses)
            
            query = f"""
            SELECT 
                Account,
                AccountType,
                Level,
                IsTotal,
                ISNULL(CurrentPeriod, 0) as CurrentPeriod,
                ISNULL(PriorPeriod, 0) as PriorPeriod,
                ISNULL(Variance, 0) as Variance,
                ISNULL(VariancePercent, 0) as VariancePercent
            FROM Finance.vw_BalanceSheet WITH (NOLOCK)
            {where_clause}
            ORDER BY SortOrder, Account
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            lines = [
                BalanceSheetLine(
                    account=r.Account,
                    account_type=r.AccountType,
                    level=r.Level,
                    is_total=bool(r.IsTotal),
                    current_period=float(r.CurrentPeriod),
                    prior_period=float(r.PriorPeriod),
                    variance=float(r.Variance),
                    variance_percent=float(r.VariancePercent)
                )
                for r in results
            ]
            
            # Calculate validation
            total_assets = sum(l.current_period for l in lines if l.account_type == "Asset" and l.is_total)
            total_liabilities = sum(l.current_period for l in lines if l.account_type == "Liability" and l.is_total)
            total_equity = sum(l.current_period for l in lines if l.account_type == "Equity" and l.is_total)
            
            liabilities_equity = total_liabilities + total_equity
            balanced = abs(total_assets - liabilities_equity) < 0.01  # Allow for rounding
            
            validation = {
                "total_assets": total_assets,
                "total_liabilities": total_liabilities,
                "total_equity": total_equity,
                "liabilities_and_equity": liabilities_equity,
                "balanced": balanced,
                "difference": total_assets - liabilities_equity
            }
            
            logger.info(f"Retrieved balance sheet for year {year}, {len(lines)} lines, balanced={balanced}")
            return BalanceSheetResponse(
                year=year,
                entity=entity or "All Entities",
                lines=lines,
                validation=validation
            )
            
        except Exception as e:
            logger.error(f"Error fetching balance sheet: {str(e)}")
            raise
    
    def get_consolidation(
        self,
        year: int,
        entity: Optional[str] = None
    ) -> ConsolidationResponse:
        """Get financial consolidation data"""
        try:
            where_clauses = ["Year = :year"]
            params = {"year": year}
            
            if entity:
                where_clauses.append("Entity = :entity")
                params["entity"] = entity
            
            where_clause = "WHERE " + " AND ".join(where_clauses)
            
            query = f"""
            SELECT 
                Entity,
                EntityType,
                ParentEntity,
                Region,
                Year,
                ISNULL(Revenue, 0) as Revenue,
                ISNULL(Expenses, 0) as Expenses,
                ISNULL(NetIncome, 0) as NetIncome,
                ISNULL(Assets, 0) as Assets,
                ISNULL(Liabilities, 0) as Liabilities,
                ISNULL(Equity, 0) as Equity
            FROM Finance.vw_EntityConsolidation WITH (NOLOCK)
            {where_clause}
            ORDER BY ParentEntity, Entity
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            records = [
                ConsolidationRecord(
                    entity=r.Entity,
                    entity_type=r.EntityType,
                    parent_entity=r.ParentEntity,
                    region=r.Region,
                    year=r.Year,
                    revenue=float(r.Revenue),
                    expenses=float(r.Expenses),
                    net_income=float(r.NetIncome),
                    assets=float(r.Assets),
                    liabilities=float(r.Liabilities),
                    equity=float(r.Equity)
                )
                for r in results
            ]
            
            # Calculate summary
            summary = ConsolidationRecord(
                entity="Total",
                entity_type="Consolidated",
                parent_entity=None,
                region=None,
                year=year,
                revenue=sum(r.revenue for r in records),
                expenses=sum(r.expenses for r in records),
                net_income=sum(r.net_income for r in records),
                assets=sum(r.assets for r in records),
                liabilities=sum(r.liabilities for r in records),
                equity=sum(r.equity for r in records)
            )
            
            logger.info(f"Retrieved consolidation for year {year}, {len(records)} entities")
            return ConsolidationResponse(data=records, summary=summary)
            
        except Exception as e:
            logger.error(f"Error fetching consolidation: {str(e)}")
            raise
    
    def get_consolidation_summary(
        self,
        year: int
    ) -> Dict[str, Any]:
        """Get consolidation summary by region"""
        try:
            query = """
            SELECT 
                Region,
                SUM(ISNULL(Revenue, 0)) as Revenue,
                SUM(ISNULL(Expenses, 0)) as Expenses,
                SUM(ISNULL(NetIncome, 0)) as NetIncome,
                SUM(ISNULL(Assets, 0)) as Assets,
                SUM(ISNULL(Liabilities, 0)) as Liabilities,
                SUM(ISNULL(Equity, 0)) as Equity,
                COUNT(*) as EntityCount
            FROM Finance.vw_EntityConsolidation WITH (NOLOCK)
            WHERE Year = :year
            GROUP BY Region
            ORDER BY Revenue DESC
            """
            
            results = self.db.execute(text(query), {"year": year}).fetchall()
            
            regions = [
                {
                    "region": r.Region,
                    "revenue": float(r.Revenue),
                    "expenses": float(r.Expenses),
                    "net_income": float(r.NetIncome),
                    "assets": float(r.Assets),
                    "liabilities": float(r.Liabilities),
                    "equity": float(r.Equity),
                    "entity_count": r.EntityCount
                }
                for r in results
            ]
            
            return {
                "year": year,
                "regions": regions,
                "total": {
                    "revenue": sum(r["revenue"] for r in regions),
                    "expenses": sum(r["expenses"] for r in regions),
                    "net_income": sum(r["net_income"] for r in regions),
                    "assets": sum(r["assets"] for r in regions),
                    "liabilities": sum(r["liabilities"] for r in regions),
                    "equity": sum(r["equity"] for r in regions),
                    "entity_count": sum(r["entity_count"] for r in regions)
                }
            }
            
        except Exception as e:
            logger.error(f"Error fetching consolidation summary: {str(e)}")
            raise
