"""
Revenue Service
Handles all business logic for revenue endpoints
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from models.response_models import (
    RevenueRecord, RevenueListResponse, RevenueAggregation,
    RevenueAggregationResponse, PaginationMetadata
)

logger = logging.getLogger(__name__)


class RevenueService:
    """Service for revenue operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_revenue_data(
        self,
        page: int = 1,
        page_size: int = 50,
        year: Optional[int] = None,
        quarter: Optional[str] = None,
        month: Optional[str] = None,
        entity: Optional[str] = None,
        region: Optional[str] = None,
        customer_segment: Optional[str] = None,
        product_category: Optional[str] = None,
        version: Optional[str] = None
    ) -> RevenueListResponse:
        """Get paginated revenue data with filters"""
        try:
            # Build WHERE clause using actual column names from view
            where_clauses = []
            params = {}
            
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if quarter:
                where_clauses.append("QuarterName = :quarter")
                params["quarter"] = quarter
            if month:
                where_clauses.append("MonthName = :month")
                params["month"] = month
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            if region:
                where_clauses.append("RegionName = :region")
                params["region"] = region
            if customer_segment:
                where_clauses.append("CustomerSegment = :customer_segment")
                params["customer_segment"] = customer_segment
            if product_category:
                where_clauses.append("ProductCategory = :product_category")
                params["product_category"] = product_category
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
                DateID,
                YearNumber,
                QuarterName,
                MonthName,
                EntityName,
                RegionName,
                CustomerName,
                CustomerSegment,
                ProductName,
                ProductCategory,
                ProductFamily,
                VersionName,
                ISNULL(Revenue, 0)      AS Revenue,
                ISNULL(Cost, 0)         AS Cost,
                ISNULL(Margin, 0)       AS Margin,
                ISNULL(MarginPercent, 0) AS MarginPercent,
                ISNULL(Quantity, 0)     AS Quantity,
                COUNT(*) OVER()         AS TotalCount
            FROM Sales.vw_RevenueCube_Source
            {where_clause}
            ORDER BY DateID DESC, EntityName, ProductName
            OFFSET :offset ROWS FETCH NEXT :page_size ROWS ONLY
            """

            rows = self.db.execute(text(data_query), params).fetchall()

            total_records = rows[0].TotalCount if rows else 0
            total_pages   = (total_records + page_size - 1) // page_size if total_records else 0

            records = [
                RevenueRecord(
                    date_key=r.DateID,
                    year=r.YearNumber,
                    quarter=r.QuarterName,
                    month=r.MonthName,
                    entity=r.EntityName,
                    region=r.RegionName,
                    customer=r.CustomerName,
                    customer_segment=r.CustomerSegment,
                    product=r.ProductName,
                    product_category=r.ProductCategory,
                    product_family=r.ProductFamily,
                    version=r.VersionName,
                    revenue=float(r.Revenue),
                    cost=float(r.Cost),
                    margin=float(r.Margin),
                    margin_percent=float(r.MarginPercent),
                    quantity=int(r.Quantity)
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
            
            logger.info(f"Retrieved {len(records)} revenue records (page {page}/{total_pages})")
            return RevenueListResponse(data=records, pagination=pagination)
            
        except Exception as e:
            logger.error(f"Error fetching revenue data: {str(e)}")
            raise
    
    def get_revenue_by_region(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> RevenueAggregationResponse:
        """Get revenue aggregated by region"""
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
                RegionName as DimensionValue,
                ISNULL(SUM(Revenue), 0) as Revenue,
                ISNULL(SUM(Cost), 0) as Cost,
                ISNULL(SUM(Margin), 0) as Margin,
                CASE WHEN SUM(Revenue) > 0 THEN (SUM(Margin) / SUM(Revenue) * 100) ELSE 0 END as MarginPercent,
                COUNT(*) as Count
            FROM Sales.vw_RevenueCube_Source
            {where_clause}
            GROUP BY RegionName
            ORDER BY Revenue DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                RevenueAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    revenue=float(r.Revenue),
                    cost=float(r.Cost),
                    margin=float(r.Margin),
                    margin_percent=float(r.MarginPercent),
                    count=r.Count
                )
                for r in results
            ]
            
            # Calculate total
            total = RevenueAggregation(
                dimension_value="Total",
                revenue=sum(r.revenue for r in data),
                cost=sum(r.cost for r in data),
                margin=sum(r.margin for r in data),
                margin_percent=(sum(r.margin for r in data) / sum(r.revenue for r in data) * 100) if sum(r.revenue for r in data) > 0 else 0,
                count=sum(r.count for r in data)
            )
            
            logger.info(f"Retrieved revenue by region: {len(data)} regions")
            return RevenueAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching revenue by region: {str(e)}")
            raise
    
    def get_revenue_by_product(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> RevenueAggregationResponse:
        """Get revenue aggregated by product category"""
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
                ProductCategory as DimensionValue,
                ISNULL(SUM(Revenue), 0) as Revenue,
                ISNULL(SUM(Cost), 0) as Cost,
                ISNULL(SUM(Margin), 0) as Margin,
                CASE WHEN SUM(Revenue) > 0 THEN (SUM(Margin) / SUM(Revenue) * 100) ELSE 0 END as MarginPercent,
                COUNT(*) as Count
            FROM Sales.vw_RevenueCube_Source
            {where_clause}
            GROUP BY ProductCategory
            ORDER BY Revenue DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                RevenueAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    revenue=float(r.Revenue),
                    cost=float(r.Cost),
                    margin=float(r.Margin),
                    margin_percent=float(r.MarginPercent),
                    count=r.Count
                )
                for r in results
            ]
            
            # Calculate total
            total = RevenueAggregation(
                dimension_value="Total",
                revenue=sum(r.revenue for r in data),
                cost=sum(r.cost for r in data),
                margin=sum(r.margin for r in data),
                margin_percent=(sum(r.margin for r in data) / sum(r.revenue for r in data) * 100) if sum(r.revenue for r in data) > 0 else 0,
                count=sum(r.count for r in data)
            )
            
            logger.info(f"Retrieved revenue by product: {len(data)} categories")
            return RevenueAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching revenue by product: {str(e)}")
            raise
    
    def get_revenue_by_customer_segment(
        self,
        year: Optional[int] = None,
        version: Optional[str] = None
    ) -> RevenueAggregationResponse:
        """Get revenue aggregated by customer segment"""
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
                CustomerSegment as DimensionValue,
                ISNULL(SUM(Revenue), 0) as Revenue,
                ISNULL(SUM(Cost), 0) as Cost,
                ISNULL(SUM(Margin), 0) as Margin,
                CASE WHEN SUM(Revenue) > 0 THEN (SUM(Margin) / SUM(Revenue) * 100) ELSE 0 END as MarginPercent,
                COUNT(*) as Count
            FROM Sales.vw_RevenueCube_Source
            {where_clause}
            GROUP BY CustomerSegment
            ORDER BY Revenue DESC
            """
            
            results = self.db.execute(text(query), params).fetchall()
            
            data = [
                RevenueAggregation(
                    dimension_value=r.DimensionValue or "Unknown",
                    revenue=float(r.Revenue),
                    cost=float(r.Cost),
                    margin=float(r.Margin),
                    margin_percent=float(r.MarginPercent),
                    count=r.Count
                )
                for r in results
            ]
            
            # Calculate total
            total = RevenueAggregation(
                dimension_value="Total",
                revenue=sum(r.revenue for r in data),
                cost=sum(r.cost for r in data),
                margin=sum(r.margin for r in data),
                margin_percent=(sum(r.margin for r in data) / sum(r.revenue for r in data) * 100) if sum(r.revenue for r in data) > 0 else 0,
                count=sum(r.count for r in data)
            )
            
            logger.info(f"Retrieved revenue by customer segment: {len(data)} segments")
            return RevenueAggregationResponse(data=data, total=total)
            
        except Exception as e:
            logger.error(f"Error fetching revenue by customer segment: {str(e)}")
            raise    
    def get_drill_down(
        self,
        level: str,
        parent_value: Optional[str] = None,
        year: Optional[int] = None,
        region: Optional[str] = None,
        entity: Optional[str] = None
    ) -> List[dict]:
        """
        Get drill-down data for hierarchical navigation
        
        Hierarchy: ProductCategory -> ProductFamily -> ProductName
        
        Args:
            level: Target level ('category', 'family', 'product')
            parent_value: Parent dimension value to filter by
            year: Optional year filter
            region: Optional region filter
            entity: Optional entity filter
            
        Returns:
            List of aggregated records at target level
        """
        try:
            print(f"   📊 Service: Processing drill-down for level='{level}', parent='{parent_value}'")
            
            # Define hierarchy mapping
            level_columns = {
                'category': 'ProductCategory',
                'family': 'ProductFamily',
                'product': 'ProductName'
            }
            
            if level not in level_columns:
                raise ValueError(f"Invalid level: {level}")
            
            target_column = level_columns[level]
            print(f"   📊 Service: Target column = {target_column}")
            
            # Build WHERE clause
            where_clauses = []
            params = {}
            
            # Add parent filter
            if parent_value:
                if level == 'family':
                    where_clauses.append("ProductCategory = :parent_value")
                elif level == 'product':
                    where_clauses.append("ProductFamily = :parent_value")
                params["parent_value"] = parent_value
            
            # Add additional filters
            if year:
                where_clauses.append("YearNumber = :year")
                params["year"] = year
            if region:
                where_clauses.append("RegionName = :region")
                params["region"] = region
            if entity:
                where_clauses.append("EntityName = :entity")
                params["entity"] = entity
            
            where_clause = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""
            print(f"   📊 Service: WHERE clause = {where_clause}")
            print(f"   📊 Service: Params = {params}")
            
            # Build query
            query = f"""
            SELECT 
                {target_column} as dimension_value,
                COUNT(DISTINCT CustomerName) as customer_count,
                SUM(ISNULL(Revenue, 0)) as total_revenue,
                SUM(ISNULL(Cost, 0)) as total_cost,
                SUM(ISNULL(Margin, 0)) as total_margin,
                CASE 
                    WHEN SUM(ISNULL(Revenue, 0)) > 0 
                    THEN (SUM(ISNULL(Margin, 0)) / SUM(ISNULL(Revenue, 0))) * 100 
                    ELSE 0 
                END as margin_percent,
                SUM(ISNULL(Quantity, 0)) as total_quantity
            FROM Sales.vw_RevenueCube_Source
            {where_clause}
            GROUP BY {target_column}
            HAVING {target_column} IS NOT NULL
            ORDER BY total_revenue DESC
            """
            
            print(f"   📊 Service: Executing SQL query...")
            results = self.db.execute(text(query), params).fetchall()
            print(f"   📊 Service: Query returned {len(results)} rows")
            
            return [
                {
                    "dimension_value": r.dimension_value,
                    "customer_count": r.customer_count,
                    "revenue": float(r.total_revenue),
                    "cost": float(r.total_cost),
                    "margin": float(r.total_margin),
                    "margin_percent": float(r.margin_percent),
                    "quantity": float(r.total_quantity),
                    "level": level
                }
                for r in results
            ]
        except Exception as e:
            print(f"   ❌ Service ERROR: {str(e)}")
            logger.error(f"Error getting drill-down data: {str(e)}")
            raise            
        except Exception as e:
            logger.error(f"Error fetching revenue by customer segment: {str(e)}")
            raise
