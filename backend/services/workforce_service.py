"""
Workforce Service
Handles all business logic for workforce endpoints  
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from models.response_models import (
    WorkforceRecord, WorkforceListResponse, WorkforceAggregation,
    WorkforceAggregationResponse, PaginationMetadata
)

logger = logging.getLogger(__name__)



import time as _time
from typing import Dict as _Dict

# ---------------------------------------------------------------------------
# Module-level TTL cache for aggregation results.
# A new service instance is created per FastAPI request, so caching must live
# at the module level — not on the instance.  TTL = 5 min (300 s).
# ---------------------------------------------------------------------------
_AGG_CACHE: _Dict[str, dict] = {}
_AGG_TTL = 300   # seconds


def _agg_cached(key: str, fn):
    """Return cached value if < _AGG_TTL seconds old; otherwise call fn()."""
    now = _time.monotonic()
    entry = _AGG_CACHE.get(key)
    if entry and now - entry["ts"] < _AGG_TTL:
        return entry["value"]
    result = fn()
    _AGG_CACHE[key] = {"value": result, "ts": _time.monotonic()}
    return result

class WorkforceService:
    """Service for workforce operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_workforce_data(
        self,
        page: int = 1,
        page_size: int = 50,
        year: Optional[int] = None,
        entity: Optional[str] = None,
        department: Optional[str] = None,
        cost_center: Optional[str] = None,
        job_level: Optional[str] = None,
        employment_status: Optional[str] = None,
        version: Optional[str] = None
    ) -> WorkforceListResponse:
        """Get paginated workforce data with filters"""
        try:
            # Build WHERE clause using actual column names from view
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
            if cost_center:
                where_clauses.append("CostCenterName = :cost_center")
                params["cost_center"] = cost_center
            if job_level:
                where_clauses.append("JobLevel = :job_level")
                params["job_level"] = job_level
            if employment_status:
                where_clauses.append("EmploymentStatus = :employment_status")
                params["employment_status"] = employment_status
            if version:
                where_clauses.append("VersionName = :version")
                params["version"] = version
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

            # Single query: COUNT(*) OVER() eliminates the separate COUNT round-trip
            offset = (page - 1) * page_size
            params["offset"] = offset
            params["page_size"] = page_size

            data_query = f"""
            SELECT
                YearNumber,
                MonthName,
                EntityName,
                DepartmentName,
                CostCenterName,
                EmployeeName,
                EmployeeID,
                JobLevel,
                EmploymentStatus,
                VersionName,
                ISNULL(BaseSalary, 0)         AS BaseSalary,
                ISNULL(Bonus, 0)              AS Bonus,
                ISNULL(Benefits, 0)           AS Benefits,
                ISNULL(TotalCompensation, 0)  AS TotalCompensation,
                COUNT(*) OVER()               AS TotalCount
            FROM HR.vw_WorkforceCube_Source WITH (NOLOCK)
            {where_clause}
            ORDER BY YearNumber DESC, EntityName, DepartmentName, EmployeeName
            OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
            """

            rows = self.db.execute(text(data_query), params).fetchall()

            total_records = rows[0].TotalCount if rows else 0
            total_pages   = (total_records + page_size - 1) // page_size if total_records else 0

            records = [
                WorkforceRecord(
                    year=r.YearNumber,
                    month=r.MonthName,
                    entity=r.EntityName,
                    department=r.DepartmentName,
                    cost_center=r.CostCenterName,
                    employee=r.EmployeeName,
                    employee_id=str(r.EmployeeID),
                    job_level=r.JobLevel,
                    employment_status=r.EmploymentStatus,
                    version=r.VersionName,
                    base_salary=float(r.BaseSalary),
                    bonus=float(r.Bonus),
                    benefits=float(r.Benefits),
                    total_compensation=float(r.TotalCompensation)
                )
                for r in rows
            ]

            pagination = PaginationMetadata(
                page=page,
                page_size=page_size,
                total_records=total_records,
                total_pages=total_pages,
                has_next=page < total_pages,
                has_previous=page > 1
            )
            
            logger.info(f"Retrieved {len(records)} workforce records (page {page}/{total_pages})")
            return WorkforceListResponse(data=records, pagination=pagination)
            
        except Exception as e:
            logger.error(f"Error fetching workforce data: {str(e)}")
            raise
    

    def get_workforce_by_department(self, year: Optional[int] = None, version: Optional[str] = None):
        """Cached — delegates to _fetch_get_workforce_by_department with a 300-second TTL."""
        key = f"wf:dept:{year}:{version}"
        return _agg_cached(key, lambda: self._fetch_get_workforce_by_department(year=year, version=version))

    def _fetch_get_workforce_by_department(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> WorkforceAggregationResponse:
        """Get workforce aggregated by department"""
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
                COUNT(DISTINCT EmployeeID) as EmployeeCount,
                ISNULL(SUM(BaseSalary), 0) as TotalBaseSalary,
                ISNULL(SUM(Bonus), 0) as TotalBonus,
                ISNULL(SUM(Benefits), 0) as TotalBenefits,
                ISNULL(SUM(TotalCompensation), 0) as TotalCompensation,
                CASE WHEN SUM(BaseSalary) > 0 THEN (SUM(TotalCompensation) / COUNT(DISTINCT EmployeeID)) ELSE 0 END as AvgCompensation
            FROM HR.vw_WorkforceCube_Source WITH (NOLOCK)
            {where_clause}
            GROUP BY DepartmentName
            ORDER BY TotalCompensation DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                WorkforceAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    headcount=r.EmployeeCount,
                    fte=float(r.EmployeeCount),
                    base_salary=float(r.TotalBaseSalary),
                    bonus=float(r.TotalBonus),
                    benefits=float(r.TotalBenefits),
                    total_compensation=float(r.TotalCompensation),
                    avg_compensation=float(r.AvgCompensation)
                )
                for r in results
            ]
            
            # Calculate total
            total = WorkforceAggregation(
                dimension_value="Total",
                headcount=sum(r.headcount for r in data),
                fte=sum(r.fte for r in data),
                base_salary=sum(r.base_salary for r in data),
                bonus=sum(r.bonus for r in data),
                benefits=sum(r.benefits for r in data),
                total_compensation=sum(r.total_compensation for r in data),
                avg_compensation=sum(r.total_compensation for r in data) / sum(r.headcount for r in data) if sum(r.headcount for r in data) > 0 else 0
            )
            
            logger.info(f"Retrieved workforce by department: {len(data)} departments")
            return WorkforceAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching workforce by department: {str(e)}")
            raise
    

    def get_workforce_by_job_level(self, year: Optional[int] = None, version: Optional[str] = None):
        """Cached — delegates to _fetch_get_workforce_by_job_level with a 300-second TTL."""
        key = f"wf:level:{year}:{version}"
        return _agg_cached(key, lambda: self._fetch_get_workforce_by_job_level(year=year, version=version))

    def _fetch_get_workforce_by_job_level(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> WorkforceAggregationResponse:
        """Get workforce aggregated by job level"""
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
                JobLevel as DimensionValue,
                COUNT(DISTINCT EmployeeID) as EmployeeCount,
                ISNULL(SUM(BaseSalary), 0) as TotalBaseSalary,
                ISNULL(SUM(Bonus), 0) as TotalBonus,
                ISNULL(SUM(Benefits), 0) as TotalBenefits,
                ISNULL(SUM(TotalCompensation), 0) as TotalCompensation,
                CASE WHEN COUNT(DISTINCT EmployeeID) > 0 THEN (SUM(TotalCompensation) / COUNT(DISTINCT EmployeeID)) ELSE 0 END as AvgCompensation
            FROM HR.vw_WorkforceCube_Source WITH (NOLOCK)
            {where_clause}
            GROUP BY JobLevel
            ORDER BY TotalCompensation DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                WorkforceAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    headcount=r.EmployeeCount,
                    fte=float(r.EmployeeCount),
                    base_salary=float(r.TotalBaseSalary),
                    bonus=float(r.TotalBonus),
                    benefits=float(r.TotalBenefits),
                    total_compensation=float(r.TotalCompensation),
                    avg_compensation=float(r.AvgCompensation)
                )
                for r in results
            ]
            
            # Calculate total
            total = WorkforceAggregation(
                dimension_value="Total",
                headcount=sum(r.headcount for r in data),
                fte=sum(r.fte for r in data),
                base_salary=sum(r.base_salary for r in data),
                bonus=sum(r.bonus for r in data),
                benefits=sum(r.benefits for r in data),
                total_compensation=sum(r.total_compensation for r in data),
                avg_compensation=sum(r.total_compensation for r in data) / sum(r.headcount for r in data) if sum(r.headcount for r in data) > 0 else 0
            )
            
            logger.info(f"Retrieved workforce by job level: {len(data)} levels")
            return WorkforceAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching workforce by job level: {str(e)}")
            raise    
    def get_drill_down(
        self,
        level: str,
        parent_value: Optional[str] = None,
        year: Optional[int] = None,
        entity: Optional[str] = None
    ) -> List[dict]:
        """
        Get drill-down data for hierarchical navigation
        
        Hierarchy: DepartmentName -> CostCenterName -> EmployeeName
        
        Args:
            level: Target level ('department', 'cost_center', 'employee')
            parent_value: Parent dimension value to filter by
            year: Optional year filter
            entity: Optional entity filter
            
        Returns:
            List of aggregated records at target level
        """
        try:
            # Define hierarchy mapping
            level_columns = {
                'department': 'DepartmentName',
                'cost_center': 'CostCenterName',
                'employee': 'EmployeeName'
            }
            
            if level not in level_columns:
                raise ValueError(f"Invalid level: {level}")
            
            target_column = level_columns[level]
            
            # Build WHERE clause
            where_clauses = []
            params = {}
            
            # Add parent filter
            if parent_value:
                if level == 'cost_center':
                    where_clauses.append("DepartmentName = :parent_value")
                elif level == 'employee':
                    where_clauses.append("CostCenterName = :parent_value")
                params["parent_value"] = parent_value
            
            # Add additional filters
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            
            # Build query
            if level == 'employee':
                # For employees, show individual records
                query = f"""
                SELECT 
                    {target_column} as dimension_value,
                    MAX(EmployeeID) as employee_id,
                    MAX(JobLevel) as job_level,
                    MAX(EmploymentStatus) as employment_status,
                    SUM(ISNULL(BaseSalary, 0)) as total_base_salary,
                    SUM(ISNULL(Bonus, 0)) as total_bonus,
                    SUM(ISNULL(Benefits, 0)) as total_benefits,
                    SUM(ISNULL(TotalCompensation, 0)) as total_compensation
                FROM HR.vw_WorkforceCube_Source WITH (NOLOCK)
                {where_clause}
                GROUP BY {target_column}
                HAVING {target_column} IS NOT NULL
                ORDER BY total_compensation DESC
                """
            else:
                # For departments and cost centers, show aggregates
                query = f"""
                SELECT 
                    {target_column} as dimension_value,
                    COUNT(DISTINCT EmployeeName) as employee_count,
                    SUM(ISNULL(BaseSalary, 0)) as total_base_salary,
                    SUM(ISNULL(Bonus, 0)) as total_bonus,
                    SUM(ISNULL(Benefits, 0)) as total_benefits,
                    SUM(ISNULL(TotalCompensation, 0)) as total_compensation
                FROM HR.vw_WorkforceCube_Source WITH (NOLOCK)
                {where_clause}
                GROUP BY {target_column}
                HAVING {target_column} IS NOT NULL
                ORDER BY total_compensation DESC
                """
            
            results = self.db.execute(text(query), params).fetchall()
            
            return [
                {
                    "dimension_value": r.dimension_value,
                    "employee_count": r.employee_count if hasattr(r, 'employee_count') else 1,
                    "employee_id": str(r.employee_id) if hasattr(r, 'employee_id') else None,
                    "job_level": r.job_level if hasattr(r, 'job_level') else None,
                    "employment_status": r.employment_status if hasattr(r, 'employment_status') else None,
                    "base_salary": float(r.total_base_salary),
                    "bonus": float(r.total_bonus),
                    "benefits": float(r.total_benefits),
                    "total_compensation": float(r.total_compensation),
                    "level": level
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error getting drill-down data: {str(e)}")
            raise    

    def get_workforce_by_entity(self, year: Optional[int] = None, version: Optional[str] = None):
        """Cached — delegates to _fetch_get_workforce_by_entity with a 300-second TTL."""
        key = f"wf:entity:{year}:{version}"
        return _agg_cached(key, lambda: self._fetch_get_workforce_by_entity(year=year, version=version))

    def _fetch_get_workforce_by_entity(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> WorkforceAggregationResponse:
        """Get workforce aggregated by entity"""
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
                COUNT(DISTINCT EmployeeID) as EmployeeCount,
                ISNULL(SUM(BaseSalary), 0) as TotalBaseSalary,
                ISNULL(SUM(Bonus), 0) as TotalBonus,
                ISNULL(SUM(Benefits), 0) as TotalBenefits,
                ISNULL(SUM(TotalCompensation), 0) as TotalCompensation,
                CASE WHEN COUNT(DISTINCT EmployeeID) > 0 THEN (SUM(TotalCompensation) / COUNT(DISTINCT EmployeeID)) ELSE 0 END as AvgCompensation
            FROM HR.vw_WorkforceCube_Source WITH (NOLOCK)
            {where_clause}
            GROUP BY EntityName
            ORDER BY TotalCompensation DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                WorkforceAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    headcount=r.EmployeeCount,
                    fte=float(r.EmployeeCount),
                    base_salary=float(r.TotalBaseSalary),
                    bonus=float(r.TotalBonus),
                    benefits=float(r.TotalBenefits),
                    total_compensation=float(r.TotalCompensation),
                    avg_compensation=float(r.AvgCompensation)
                )
                for r in results
            ]
            
            # Calculate total
            total = WorkforceAggregation(
                dimension_value="Total",
                headcount=sum(r.headcount for r in data),
                fte=sum(r.fte for r in data),
                base_salary=sum(r.base_salary for r in data),
                bonus=sum(r.bonus for r in data),
                benefits=sum(r.benefits for r in data),
                total_compensation=sum(r.total_compensation for r in data),
                avg_compensation=sum(r.total_compensation for r in data) / sum(r.headcount for r in data) if sum(r.headcount for r in data) > 0 else 0
            )
            
            logger.info(f"Retrieved workforce by entity: {len(data)} entities")
            return WorkforceAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching workforce by entity: {str(e)}")
            raise
