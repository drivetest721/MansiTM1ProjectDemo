"""
Budget and Forecast Service
Handles all business logic for budget and forecast endpoints
FIXED: Removed all JOINs, uses denormalized view columns directly
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from models.response_models import (
    BudgetRecord, BudgetListResponse, BudgetAggregation, BudgetAggregationResponse,
    ForecastRecord, ForecastListResponse, ForecastAggregation, ForecastAggregationResponse,
    VarianceRecord, VarianceListResponse, PaginationMetadata
)

logger = logging.getLogger(__name__)


class BudgetForecastService:
    """Service for budget and forecast operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ==================== BUDGET METHODS ====================
    
    def get_budget_data(
        self,
        page: int = 1,
        page_size: int = 50,
        year: Optional[int] = None,
        entity: Optional[str] = None,
        department: Optional[str] = None,
        account: Optional[str] = None,
        scenario: Optional[str] = None,
        version: Optional[str] = None
    ) -> BudgetListResponse:
        """Get paginated budget data with filters"""
        try:
            where_clauses = []
            params = {}
            
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            if department:
                where_clauses.append("DepartmentName = :department")
                params["department"] = department
            if account:
                where_clauses.append("AccountName = :account")
                params["account"] = account
            if scenario:
                where_clauses.append("ScenarioName = :scenario")
                params["scenario"] = scenario
            if version:
                where_clauses.append("VersionName = :version")
                params["version"] = version
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            count_query = f"""
            SELECT COUNT(*) as total
            FROM Planning.vw_BudgetCube_Source
            {where_clause}
            """
            
            total_result = self.db.execute(text(count_query), params).fetchone()
            total_records = total_result.total if total_result else 0
            total_pages = (total_records + page_size - 1) // page_size
            
            offset = (page - 1) * page_size
            
            data_query = f"""
            SELECT 
                YearNumber,
                QuarterName,
                MonthName,
                EntityName,
                DepartmentName,
                AccountName,
                AccountType,
                StatementType,
                ScenarioName,
                VersionName,
                ISNULL(BudgetAmount, 0) as BudgetAmount
            FROM Planning.vw_BudgetCube_Source
            {where_clause}
            ORDER BY YearNumber DESC, MonthName, EntityName, AccountName
            OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
            """
            
            params["offset"] = offset
            params["page_size"] = page_size
            
            results = self.db.execute(text(data_query), params).fetchall()
            
            records = [
                BudgetRecord(
                    year=r.YearNumber,
                    quarter=r.QuarterName,
                    month=r.MonthName,
                    entity=r.EntityName,
                    department=r.DepartmentName,
                    account=r.AccountName,
                    account_type=r.AccountType,
                    statement_type=r.StatementType,
                    scenario=r.ScenarioName,
                    version=r.VersionName,
                    amount=float(r.BudgetAmount)
                )
                for r in results
            ]
            
            pagination = PaginationMetadata(
                page=page,
                page_size=page_size,
                total_records=total_records,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1
            )
            
            logger.info(f"Retrieved {len(records)} budget records (page {page}/{total_pages})")
            return BudgetListResponse(data=records, pagination=pagination)
            
        except Exception as e:
            logger.error(f"Error fetching budget data: {str(e)}")
            raise
    
    def get_budget_by_account(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> BudgetAggregationResponse:
        """Get budget aggregated by account"""
        try:
            where_clauses = []
            params = {}
            
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if version:
                where_clauses.append("VersionName = :version")
                params["version"] = version
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            query = f"""
            SELECT 
                AccountName as DimensionValue,
                SUM(ISNULL(BudgetAmount, 0)) as Amount,
                COUNT(*) as Count
            FROM Planning.vw_BudgetCube_Source
            {where_clause}
            GROUP BY AccountName
            ORDER BY Amount DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                BudgetAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    amount=float(r.Amount),
                    count=r.Count
                )
                for r in results
            ]
            
            total = BudgetAggregation(
                dimension_value="Total",
                amount=sum(r.amount for r in data),
                count=sum(r.count for r in data)
            )
            
            logger.info(f"Retrieved budget by account: {len(data)} accounts")
            return BudgetAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching budget by account: {str(e)}")
            raise
    
    def get_budget_by_department(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> BudgetAggregationResponse:
        """Get budget aggregated by department"""
        try:
            where_clauses = []
            params = {}
            
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if version:
                where_clauses.append("VersionName = :version")
                params["version"] = version
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            query = f"""
            SELECT 
                DepartmentName as DimensionValue,
                SUM(ISNULL(BudgetAmount, 0)) as Amount,
                COUNT(*) as Count
            FROM Planning.vw_BudgetCube_Source
            {where_clause}
            GROUP BY DepartmentName
            ORDER BY Amount DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                BudgetAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    amount=float(r.Amount),
                    count=r.Count
                )
                for r in results
            ]
            
            total = BudgetAggregation(
                dimension_value="Total",
                amount=sum(r.amount for r in data),
                count=sum(r.count for r in data)
            )
            
            logger.info(f"Retrieved budget by department: {len(data)} departments")
            return BudgetAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching budget by department: {str(e)}")
            raise
    
    def get_budget_by_entity(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> BudgetAggregationResponse:
        """Get budget aggregated by entity"""
        try:
            where_clauses = []
            params = {}
            
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if version:
                where_clauses.append("VersionName = :version")
                params["version"] = version
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            query = f"""
            SELECT 
                EntityName as DimensionValue,
                SUM(ISNULL(BudgetAmount, 0)) as Amount,
                COUNT(*) as Count
            FROM Planning.vw_BudgetCube_Source
            {where_clause}
            GROUP BY EntityName
            ORDER BY Amount DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                BudgetAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    amount=float(r.Amount),
                    count=r.Count
                )
                for r in results
            ]
            
            total = BudgetAggregation(
                dimension_value="Total",
                amount=sum(r.amount for r in data),
                count=sum(r.count for r in data)
            )
            
            logger.info(f"Retrieved budget by entity: {len(data)} entities")
            return BudgetAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching budget by entity: {str(e)}")
            raise
    
    # ==================== FORECAST METHODS ====================
    
    def get_forecast_data(
        self,
        page: int = 1,
        page_size: int = 50,
        year: Optional[int] = None,
        entity: Optional[str] = None,
        department: Optional[str] = None,
        account: Optional[str] = None,
        scenario: Optional[str] = None,
        version: Optional[str] = None
    ) -> ForecastListResponse:
        """Get paginated forecast data with filters"""
        try:
            where_clauses = []
            params = {}
            
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            if department:
                where_clauses.append("DepartmentName = :department")
                params["department"] = department
            if account:
                where_clauses.append("AccountName = :account")
                params["account"] = account
            if scenario:
                where_clauses.append("ScenarioName = :scenario")
                params["scenario"] = scenario
            if version:
                where_clauses.append("VersionName = :version")
                params["version"] = version
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            count_query = f"""
            SELECT COUNT(*) as total
            FROM Planning.vw_ForecastCube_Source
            {where_clause}
            """
            
            total_result = self.db.execute(text(count_query), params).fetchone()
            total_records = total_result.total if total_result else 0
            total_pages = (total_records + page_size - 1) // page_size
            
            offset = (page - 1) * page_size
            
            data_query = f"""
            SELECT 
                YearNumber,
                QuarterName,
                MonthName,
                EntityName,
                DepartmentName,
                AccountName,
                AccountType,
                StatementType,
                ScenarioName,
                VersionName,
                ISNULL(ForecastAmount, 0) as ForecastAmount
            FROM Planning.vw_ForecastCube_Source
            {where_clause}
            ORDER BY YearNumber DESC, MonthName, EntityName, AccountName
            OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
            """
            
            params["offset"] = offset
            params["page_size"] = page_size
            
            results = self.db.execute(text(data_query), params).fetchall()
            
            records = [
                ForecastRecord(
                    year=r.YearNumber,
                    quarter=r.QuarterName,
                    month=r.MonthName,
                    entity=r.EntityName,
                    department=r.DepartmentName,
                    account=r.AccountName,
                    account_type=r.AccountType,
                    statement_type=r.StatementType,
                    scenario=r.ScenarioName,
                    version=r.VersionName,
                    amount=float(r.ForecastAmount)
                )
                for r in results
            ]
            
            pagination = PaginationMetadata(
                page=page,
                page_size=page_size,
                total_records=total_records,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1
            )
            
            logger.info(f"Retrieved {len(records)} forecast records (page {page}/{total_pages})")
            return ForecastListResponse(data=records, pagination=pagination)
            
        except Exception as e:
            logger.error(f"Error fetching forecast data: {str(e)}")
            raise
    
    def get_forecast_by_account(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> ForecastAggregationResponse:
        """Get forecast aggregated by account"""
        try:
            where_clauses = []
            params = {}
            
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if version:
                where_clauses.append("VersionName = :version")
                params["version"] = version
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            query = f"""
            SELECT 
                AccountName as DimensionValue,
                SUM(ISNULL(ForecastAmount, 0)) as Amount,
                COUNT(*) as Count
            FROM Planning.vw_ForecastCube_Source
            {where_clause}
            GROUP BY AccountName
            ORDER BY Amount DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                ForecastAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    amount=float(r.Amount),
                    count=r.Count
                )
                for r in results
            ]
            
            total = ForecastAggregation(
                dimension_value="Total",
                amount=sum(r.amount for r in data),
                count=sum(r.count for r in data)
            )
            
            logger.info(f"Retrieved forecast by account: {len(data)} accounts")
            return ForecastAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching forecast by account: {str(e)}")
            raise
    
    def get_forecast_by_department(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> ForecastAggregationResponse:
        """Get forecast aggregated by department"""
        try:
            where_clauses = []
            params = {}
            
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if version:
                where_clauses.append("VersionName = :version")
                params["version"] = version
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            query = f"""
            SELECT 
                DepartmentName as DimensionValue,
                SUM(ISNULL(ForecastAmount, 0)) as Amount,
                COUNT(*) as Count
            FROM Planning.vw_ForecastCube_Source
            {where_clause}
            GROUP BY DepartmentName
            ORDER BY Amount DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                ForecastAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    amount=float(r.Amount),
                    count=r.Count
                )
                for r in results
            ]
            
            total = ForecastAggregation(
                dimension_value="Total",
                amount=sum(r.amount for r in data),
                count=sum(r.count for r in data)
            )
            
            logger.info(f"Retrieved forecast by department: {len(data)} departments")
            return ForecastAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching forecast by department: {str(e)}")
            raise
    
    # ==================== VARIANCE METHODS ====================
    
    def get_variance_data(
        self,
        page: int = 1,
        page_size: int = 50,
        year: Optional[int] = None,
        entity: Optional[str] = None,
        department: Optional[str] = None,
        account: Optional[str] = None
    ) -> VarianceListResponse:
        """Get budget vs forecast variance"""
        try:
            where_clauses = []
            params = {}
            
            if year:
                where_clauses.append("Year = :year")
                params["year"] = year
            if entity:
                where_clauses.append("Entity = :entity")
                params["entity"] = entity
            if department:
                where_clauses.append("Department = :department")
                params["department"] = department
            if account:
                where_clauses.append("Account = :account")
                params["account"] = account
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            count_query = f"""
            SELECT COUNT(*) as total
            FROM Planning.vw_BudgetForecastVariance
            {where_clause}
            """
            
            total_result = self.db.execute(text(count_query), params).fetchone()
            total_records = total_result.total if total_result else 0
            total_pages = (total_records + page_size - 1) // page_size
            
            offset = (page - 1) * page_size
            
            data_query = f"""
            SELECT 
                Year,
                Month,
                Entity,
                Department,
                Account,
                AccountType,
                ISNULL(BudgetAmount, 0) as BudgetAmount,
                ISNULL(ForecastAmount, 0) as ForecastAmount,
                ISNULL(VarianceAmount, 0) as VarianceAmount,
                ISNULL(VariancePercent, 0) as VariancePercent
            FROM Planning.vw_BudgetForecastVariance
            {where_clause}
            ORDER BY Year DESC, Month, Entity, Account
            OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
            """
            
            params["offset"] = offset
            params["page_size"] = page_size
            
            results = self.db.execute(text(data_query), params).fetchall()
            
            records = [
                VarianceRecord(
                    year=r.Year,
                    month=r.Month,
                    entity=r.Entity,
                    department=r.Department,
                    account=r.Account,
                    account_type=r.AccountType,
                    budget_amount=float(r.BudgetAmount),
                    forecast_amount=float(r.ForecastAmount),
                    variance_amount=float(r.VarianceAmount),
                    variance_percent=float(r.VariancePercent)
                )
                for r in results
            ]
            
            pagination = PaginationMetadata(
                page=page,
                page_size=page_size,
                total_records=total_records,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1
            )
            
            logger.info(f"Retrieved {len(records)} variance records (page {page}/{total_pages})")
            return VarianceListResponse(data=records, pagination=pagination)
            
        except Exception as e:
            logger.error(f"Error fetching variance data: {str(e)}")
            raise
