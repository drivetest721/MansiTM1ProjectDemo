"""
Budget and Forecast Service
Handles business logic for budget, forecast, and variance operations
"""
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from models.response_models import (
    BudgetRecord, BudgetListResponse, BudgetAggregation, BudgetAggregationResponse,
    ForecastRecord, ForecastListResponse, ForecastAggregation, ForecastAggregationResponse,
    VarianceRecord, VarianceListResponse, PaginationMetadata
)
from typing import Optional, List
import logging

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
        """
        Get paginated budget data from Planning.vw_BudgetCube_Source
        
        Args:
            page: Page number (1-indexed)
            page_size: Records per page
            year: Filter by year
            entity: Filter by entity name
            department: Filter by department name
            account: Filter by account name
            scenario: Filter by scenario name
            version: Filter by version name
            
        Returns:
            BudgetListResponse with data and pagination metadata
        """
        try:
            # Build WHERE clause dynamically
            where_conditions = []
            params = {}
            
            if year:
                where_conditions.append("YearNumber = :year")
                params['year'] = year
            if entity:
                where_conditions.append("EntityName = :entity")
                params['entity'] = entity
            if department:
                where_conditions.append("DepartmentName = :department")
                params['department'] = department
            if account:
                where_conditions.append("AccountName = :account")
                params['account'] = account
            if scenario:
                where_conditions.append("ScenarioName = :scenario")
                params['scenario'] = scenario
            if version:
                where_conditions.append("VersionName = :version")
                params['version'] = version
            
            where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
            
            # Count total records
            count_query = f"""
                SELECT COUNT(*) as total
                FROM Planning.vw_BudgetCube_Source
                {where_clause}
            """
            count_result = self.db.execute(text(count_query), params).fetchone()
            total_records = count_result.total if count_result else 0
            
            # Calculate pagination
            offset = (page - 1) * page_size
            total_pages = (total_records + page_size - 1) // page_size
            
            # Get paginated data
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
                    BudgetAmount
                FROM Planning.vw_BudgetCube_Source
                {where_clause}
                ORDER BY YearNumber DESC, MonthName, EntityName
                OFFSET :offset ROWS
                FETCH NEXT :page_size ROWS ONLY
            """
            params['offset'] = offset
            params['page_size'] = page_size
            
            result = self.db.execute(text(data_query), params)
            
            # Transform to response models
            records = []
            for r in result:
                records.append(BudgetRecord(
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
                    amount=float(r.BudgetAmount) if r.BudgetAmount else 0.0
                ))
            
            result.close()
            
            pagination = PaginationMetadata(
                page=page,
                page_size=page_size,
                total_records=total_records,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1
            )
            
            return BudgetListResponse(data=records, pagination=pagination)
            
        except Exception as e:
            logger.error(f"Error in get_budget_data: {str(e)}")
            raise

    def get_budget_by_account(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> BudgetAggregationResponse:
        """
        Get budget aggregated by account
        
        Args:
            year: Filter by year
            version: Filter by version
            
        Returns:
            BudgetAggregationResponse with aggregated data by account
        """
        try:
            where_conditions = []
            params = {}
            
            if year:
                where_conditions.append("YearNumber = :year")
                params['year'] = year
            if version:
                where_conditions.append("VersionName = :version")
                params['version'] = version
            
            where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
            
            query = f"""
                SELECT 
                    AccountName,
                    SUM(BudgetAmount) as total_amount,
                    COUNT(*) as record_count
                FROM Planning.vw_BudgetCube_Source
                {where_clause}
                GROUP BY AccountName
                ORDER BY SUM(BudgetAmount) DESC
            """
            
            result = self.db.execute(text(query), params)
            
            aggregations = []
            for r in result:
                aggregations.append(BudgetAggregation(
                    dimension_value=r.AccountName,
                    amount=float(r.total_amount) if r.total_amount else 0.0,
                    count=r.record_count
                ))
            
            result.close()
            
            return BudgetAggregationResponse(data=aggregations)
            
        except Exception as e:
            logger.error(f"Error in get_budget_by_account: {str(e)}")
            raise

    def get_budget_by_department(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> BudgetAggregationResponse:
        """
        Get budget aggregated by department
        
        Args:
            year: Filter by year
            version: Filter by version
            
        Returns:
            BudgetAggregationResponse with aggregated data by department
        """
        try:
            where_conditions = []
            params = {}
            
            if year:
                where_conditions.append("YearNumber = :year")
                params['year'] = year
            if version:
                where_conditions.append("VersionName = :version")
                params['version'] = version
            
            where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
            
            query = f"""
                SELECT 
                    DepartmentName,
                    SUM(BudgetAmount) as total_amount,
                    COUNT(*) as record_count
                FROM Planning.vw_BudgetCube_Source
                {where_clause}
                GROUP BY DepartmentName
                ORDER BY SUM(BudgetAmount) DESC
            """
            
            result = self.db.execute(text(query), params)
            
            aggregations = []
            for r in result:
                aggregations.append(BudgetAggregation(
                    dimension_value=r.DepartmentName,
                    amount=float(r.total_amount) if r.total_amount else 0.0,
                    count=r.record_count
                ))
            
            result.close()
            
            return BudgetAggregationResponse(data=aggregations)
            
        except Exception as e:
            logger.error(f"Error in get_budget_by_department: {str(e)}")
            raise

    def get_budget_by_entity(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> BudgetAggregationResponse:
        """
        Get budget aggregated by entity
        
        Args:
            year: Filter by year
            version: Filter by version
            
        Returns:
            BudgetAggregationResponse with aggregated data by entity
        """
        try:
            where_conditions = []
            params = {}
            
            if year:
                where_conditions.append("YearNumber = :year")
                params['year'] = year
            if version:
                where_conditions.append("VersionName = :version")
                params['version'] = version
            
            where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
            
            query = f"""
                SELECT 
                    EntityName,
                    SUM(BudgetAmount) as total_amount,
                    COUNT(*) as record_count
                FROM Planning.vw_BudgetCube_Source
                {where_clause}
                GROUP BY EntityName
                ORDER BY SUM(BudgetAmount) DESC
            """
            
            result = self.db.execute(text(query), params)
            
            aggregations = []
            for r in result:
                aggregations.append(BudgetAggregation(
                    dimension_value=r.EntityName,
                    amount=float(r.total_amount) if r.total_amount else 0.0,
                    count=r.record_count
                ))
            
            result.close()
            
            return BudgetAggregationResponse(data=aggregations)
            
        except Exception as e:
            logger.error(f"Error in get_budget_by_entity: {str(e)}")
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
        """
        Get paginated forecast data from Planning.vw_ForecastCube_Source
        
        Args:
            page: Page number (1-indexed)
            page_size: Records per page
            year: Filter by year
            entity: Filter by entity name
            department: Filter by department name
            account: Filter by account name
            scenario: Filter by scenario name
            version: Filter by version name
            
        Returns:
            ForecastListResponse with data and pagination metadata
        """
        try:
            # Build WHERE clause dynamically
            where_conditions = []
            params = {}
            
            if year:
                where_conditions.append("YearNumber = :year")
                params['year'] = year
            if entity:
                where_conditions.append("EntityName = :entity")
                params['entity'] = entity
            if department:
                where_conditions.append("DepartmentName = :department")
                params['department'] = department
            if account:
                where_conditions.append("AccountName = :account")
                params['account'] = account
            if scenario:
                where_conditions.append("ScenarioName = :scenario")
                params['scenario'] = scenario
            if version:
                where_conditions.append("VersionName = :version")
                params['version'] = version
            
            where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
            
            # Count total records
            count_query = f"""
                SELECT COUNT(*) as total
                FROM Planning.vw_ForecastCube_Source
                {where_clause}
            """
            count_result = self.db.execute(text(count_query), params).fetchone()
            total_records = count_result.total if count_result else 0
            
            # Calculate pagination
            offset = (page - 1) * page_size
            total_pages = (total_records + page_size - 1) // page_size
            
            # Get paginated data
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
                    ForecastAmount
                FROM Planning.vw_ForecastCube_Source
                {where_clause}
                ORDER BY YearNumber DESC, MonthName, EntityName
                OFFSET :offset ROWS
                FETCH NEXT :page_size ROWS ONLY
            """
            params['offset'] = offset
            params['page_size'] = page_size
            
            result = self.db.execute(text(data_query), params)
            
            # Transform to response models
            records = []
            for r in result:
                records.append(ForecastRecord(
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
                    amount=float(r.ForecastAmount) if r.ForecastAmount else 0.0
                ))
            
            result.close()
            
            pagination = PaginationMetadata(
                page=page,
                page_size=page_size,
                total_records=total_records,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1
            )
            
            return ForecastListResponse(data=records, pagination=pagination)
            
        except Exception as e:
            logger.error(f"Error in get_forecast_data: {str(e)}")
            raise

    def get_forecast_by_account(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> ForecastAggregationResponse:
        """
        Get forecast aggregated by account
        
        Args:
            year: Filter by year
            version: Filter by version
            
        Returns:
            ForecastAggregationResponse with aggregated data by account
        """
        try:
            where_conditions = []
            params = {}
            
            if year:
                where_conditions.append("YearNumber = :year")
                params['year'] = year
            if version:
                where_conditions.append("VersionName = :version")
                params['version'] = version
            
            where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
            
            query = f"""
                SELECT 
                    AccountName,
                    SUM(ForecastAmount) as total_amount,
                    COUNT(*) as record_count
                FROM Planning.vw_ForecastCube_Source
                {where_clause}
                GROUP BY AccountName
                ORDER BY SUM(ForecastAmount) DESC
            """
            
            result = self.db.execute(text(query), params)
            
            aggregations = []
            for r in result:
                aggregations.append(ForecastAggregation(
                    dimension_value=r.AccountName,
                    amount=float(r.total_amount) if r.total_amount else 0.0,
                    count=r.record_count
                ))
            
            result.close()
            
            return ForecastAggregationResponse(data=aggregations)
            
        except Exception as e:
            logger.error(f"Error in get_forecast_by_account: {str(e)}")
            raise

    def get_forecast_by_department(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> ForecastAggregationResponse:
        """
        Get forecast aggregated by department
        
        Args:
            year: Filter by year
            version: Filter by version
            
        Returns:
            ForecastAggregationResponse with aggregated data by department
        """
        try:
            where_conditions = []
            params = {}
            
            if year:
                where_conditions.append("YearNumber = :year")
                params['year'] = year
            if version:
                where_conditions.append("VersionName = :version")
                params['version'] = version
            
            where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
            
            query = f"""
                SELECT 
                    DepartmentName,
                    SUM(ForecastAmount) as total_amount,
                    COUNT(*) as record_count
                FROM Planning.vw_ForecastCube_Source
                {where_clause}
                GROUP BY DepartmentName
                ORDER BY SUM(ForecastAmount) DESC
            """
            
            result = self.db.execute(text(query), params)
            
            aggregations = []
            for r in result:
                aggregations.append(ForecastAggregation(
                    dimension_value=r.DepartmentName,
                    amount=float(r.total_amount) if r.total_amount else 0.0,
                    count=r.record_count
                ))
            
            result.close()
            
            return ForecastAggregationResponse(data=aggregations)
            
        except Exception as e:
            logger.error(f"Error in get_forecast_by_department: {str(e)}")
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
        """
        Get budget vs forecast variance
        
        Calculates variance by comparing budget and forecast amounts
        for matching dimensions.
        
        Args:
            page: Page number (1-indexed)
            page_size: Records per page
            year: Filter by year
            entity: Filter by entity name
            department: Filter by department name
            account: Filter by account name
            
        Returns:
            VarianceListResponse with data and pagination metadata
        """
        try:
            # Build WHERE clause dynamically
            where_conditions = []
            params = {}
            
            if year:
                where_conditions.append("b.YearNumber = :year")
                params['year'] = year
            if entity:
                where_conditions.append("b.EntityName = :entity")
                params['entity'] = entity
            if department:
                where_conditions.append("b.DepartmentName = :department")
                params['department'] = department
            if account:
                where_conditions.append("b.AccountName = :account")
                params['account'] = account
            
            where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""
            
            # Count total records
            count_query = f"""
                SELECT COUNT(*) as total
                FROM Planning.vw_BudgetCube_Source b
                INNER JOIN Planning.vw_ForecastCube_Source f
                    ON b.YearNumber = f.YearNumber
                    AND b.MonthName = f.MonthName
                    AND b.EntityName = f.EntityName
                    AND b.DepartmentName = f.DepartmentName
                    AND b.AccountName = f.AccountName
                {where_clause}
            """
            count_result = self.db.execute(text(count_query), params).fetchone()
            total_records = count_result.total if count_result else 0
            
            # Calculate pagination
            offset = (page - 1) * page_size
            total_pages = (total_records + page_size - 1) // page_size
            
            # Get paginated variance data
            data_query = f"""
                SELECT 
                    b.YearNumber,
                    b.MonthName,
                    b.EntityName,
                    b.DepartmentName,
                    b.AccountName,
                    b.AccountType,
                    b.BudgetAmount,
                    f.ForecastAmount,
                    (f.ForecastAmount - b.BudgetAmount) as VarianceAmount,
                    CASE 
                        WHEN b.BudgetAmount = 0 THEN 0
                        ELSE ((f.ForecastAmount - b.BudgetAmount) / b.BudgetAmount * 100)
                    END as VariancePercent
                FROM Planning.vw_BudgetCube_Source b
                INNER JOIN Planning.vw_ForecastCube_Source f
                    ON b.YearNumber = f.YearNumber
                    AND b.MonthName = f.MonthName
                    AND b.EntityName = f.EntityName
                    AND b.DepartmentName = f.DepartmentName
                    AND b.AccountName = f.AccountName
                {where_clause}
                ORDER BY b.YearNumber DESC, b.MonthName, b.EntityName
                OFFSET :offset ROWS
                FETCH NEXT :page_size ROWS ONLY
            """
            params['offset'] = offset
            params['page_size'] = page_size
            
            result = self.db.execute(text(data_query), params)
            
            # Transform to response models
            records = []
            for r in result:
                records.append(VarianceRecord(
                    year=r.YearNumber,
                    month=r.MonthName,
                    entity=r.EntityName,
                    department=r.DepartmentName,
                    account=r.AccountName,
                    account_type=r.AccountType,
                    budget_amount=float(r.BudgetAmount) if r.BudgetAmount else 0.0,
                    forecast_amount=float(r.ForecastAmount) if r.ForecastAmount else 0.0,
                    variance_amount=float(r.VarianceAmount) if r.VarianceAmount else 0.0,
                    variance_percent=float(r.VariancePercent) if r.VariancePercent else 0.0
                ))
            
            result.close()
            
            pagination = PaginationMetadata(
                page=page,
                page_size=page_size,
                total_records=total_records,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1
            )
            
            return VarianceListResponse(data=records, pagination=pagination)
            
        except Exception as e:
            logger.error(f"Error in get_variance_data: {str(e)}")
            raise
    
    def get_budget_drill_down(
        self,
        level: str,
        parent_value: Optional[str] = None,
        year: Optional[int] = None,
        entity: Optional[str] = None,
        scenario: Optional[str] = None
    ) -> List[dict]:
        """
        Get drill-down data for hierarchical navigation
        
        Hierarchy: StatementType -> AccountType -> AccountName
        
        Args:
            level: Target level ('statement', 'account_type', 'account')
            parent_value: Parent dimension value to filter by
            year: Optional year filter
            entity: Optional entity filter
            scenario: Optional scenario filter
            
        Returns:
            List of aggregated records at target level
        """
        try:
            # Define hierarchy mapping
            level_columns = {
                'statement': 'StatementType',
                'account_type': 'AccountType',
                'account': 'AccountName'
            }
            
            if level not in level_columns:
                raise ValueError(f"Invalid level: {level}")
            
            target_column = level_columns[level]
            
            # Build WHERE clause
            where_clauses = []
            params = {}
            
            # Add parent filter
            if parent_value:
                if level == 'account_type':
                    where_clauses.append("StatementType = :parent_value")
                elif level == 'account':
                    where_clauses.append("AccountType = :parent_value")
                params["parent_value"] = parent_value
            
            # Add additional filters
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            if scenario:
                where_clauses.append("ScenarioName = :scenario")
                params["scenario"] = scenario
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            # Build query
            query = f"""
            SELECT 
                {target_column} as dimension_value,
                COUNT(DISTINCT AccountName) as account_count,
                SUM(ISNULL(BudgetAmount, 0)) as total_budget
            FROM Planning.vw_BudgetCube_Source
            {where_clause}
            GROUP BY {target_column}
            HAVING {target_column} IS NOT NULL
            ORDER BY total_budget DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            return [
                {
                    "dimension_value": r.dimension_value,
                    "account_count": r.account_count,
                    "budget_amount": float(r.total_budget),
                    "level": level
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error getting budget drill-down data: {str(e)}")
            raise
