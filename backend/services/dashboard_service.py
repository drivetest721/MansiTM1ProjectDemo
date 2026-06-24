"""
Dashboard Service
Handles all business logic for dashboard endpoints
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, List, Any
from models.response_models import (
    KPIMetric, ChartData, ChartDataset, DashboardResponse
)

logger = logging.getLogger(__name__)


class DashboardService:
    """Service for dashboard operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_dashboard_kpis(self) -> List[KPIMetric]:
        """Get all dashboard KPIs using validated views"""
        try:
            kpis = []
            
            # Total Revenue from Revenue Cube
            query = "SELECT ISNULL(SUM(Revenue), 0) as total FROM Sales.vw_RevenueCube_Source"
            result = self.db.execute(text(query)).fetchone()
            kpis.append(KPIMetric(
                title="Total Revenue",
                value=float(result.total) if result else 0,
                format="currency"
            ))
            
            # Total Cost from Revenue Cube
            query = "SELECT ISNULL(SUM(Cost), 0) as total FROM Sales.vw_RevenueCube_Source"
            result = self.db.execute(text(query)).fetchone()
            kpis.append(KPIMetric(
                title="Total Cost",
                value=float(result.total) if result else 0,
                format="currency"
            ))
            
            # Total Margin from Revenue Cube
            query = "SELECT ISNULL(SUM(Margin), 0) as total FROM Sales.vw_RevenueCube_Source"
            result = self.db.execute(text(query)).fetchone()
            total_margin = float(result.total) if result else 0
            kpis.append(KPIMetric(
                title="Total Margin",
                value=total_margin,
                format="currency"
            ))
            
            # Margin Percent
            total_revenue_query = "SELECT ISNULL(SUM(Revenue), 0) as total FROM Sales.vw_RevenueCube_Source"
            revenue_result = self.db.execute(text(total_revenue_query)).fetchone()
            total_revenue = float(revenue_result.total) if revenue_result and revenue_result.total else 1
            margin_percent = (total_margin / total_revenue * 100) if total_revenue > 0 else 0
            kpis.append(KPIMetric(
                title="Margin %",
                value=margin_percent,
                format="percent"
            ))
            
            # Total Employees from Workforce Cube
            query = "SELECT COUNT(DISTINCT EmployeeID) as total FROM HR.vw_WorkforceCube_Source"
            result = self.db.execute(text(query)).fetchone()
            kpis.append(KPIMetric(
                title="Total Employees",
                value=float(result.total) if result else 0,
                format="number"
            ))
            
            # Total Customers from Revenue Cube
            query = "SELECT COUNT(DISTINCT CustomerID) as total FROM Sales.vw_RevenueCube_Source"
            result = self.db.execute(text(query)).fetchone()
            kpis.append(KPIMetric(
                title="Total Customers",
                value=float(result.total) if result else 0,
                format="number"
            ))
            
            # Total Products from Revenue Cube
            query = "SELECT COUNT(DISTINCT ProductID) as total FROM Sales.vw_RevenueCube_Source"
            result = self.db.execute(text(query)).fetchone()
            kpis.append(KPIMetric(
                title="Total Products",
                value=float(result.total) if result else 0,
                format="number"
            ))
            
            # Total Budget from Budget Cube
            query = "SELECT ISNULL(SUM(BudgetAmount), 0) as total FROM Planning.vw_BudgetCube_Source"
            result = self.db.execute(text(query)).fetchone()
            kpis.append(KPIMetric(
                title="Total Budget",
                value=float(result.total) if result else 0,
                format="currency"
            ))
            
            # Total Forecast from Forecast Cube
            query = "SELECT ISNULL(SUM(ForecastAmount), 0) as total FROM Planning.vw_ForecastCube_Source"
            result = self.db.execute(text(query)).fetchone()
            kpis.append(KPIMetric(
                title="Total Forecast",
                value=float(result.total) if result else 0,
                format="currency"
            ))
            
            logger.info(f"Retrieved {len(kpis)} dashboard KPIs")
            return kpis
            
        except Exception as e:
            logger.error(f"Error fetching dashboard KPIs: {str(e)}")
            raise
    
    def get_revenue_by_year_chart(self) -> ChartData:
        """Get revenue by year for charts"""
        try:
            query = """
            SELECT 
                YearNumber,
                ISNULL(SUM(Revenue), 0) as Revenue
            FROM Sales.vw_RevenueCube_Source
            GROUP BY YearNumber
            ORDER BY YearNumber
            """
            results = self.db.execute(text(query)).fetchall()
            
            return ChartData(
                labels=[str(r.YearNumber) for r in results],
                datasets=[ChartDataset(
                    label="Revenue",
                    data=[float(r.Revenue) for r in results]
                )]
            )
        except Exception as e:
            logger.error(f"Error fetching revenue by year chart: {str(e)}")
            raise
    
    def get_revenue_by_region_chart(self) -> ChartData:
        """Get revenue by region for charts"""
        try:
            query = """
            SELECT TOP 10
                RegionName,
                ISNULL(SUM(Revenue), 0) as Revenue
            FROM Sales.vw_RevenueCube_Source
            WHERE RegionName IS NOT NULL
            GROUP BY RegionName
            ORDER BY Revenue DESC
            """
            results = self.db.execute(text(query)).fetchall()
            
            return ChartData(
                labels=[r.RegionName for r in results],
                datasets=[ChartDataset(
                    label="Revenue",
                    data=[float(r.Revenue) for r in results]
                )]
            )
        except Exception as e:
            logger.error(f"Error fetching revenue by region chart: {str(e)}")
            raise
    
    def get_revenue_by_category_chart(self) -> ChartData:
        """Get revenue by product category for charts"""
        try:
            query = """
            SELECT TOP 10
                ProductCategory,
                ISNULL(SUM(Revenue), 0) as Revenue
            FROM Sales.vw_RevenueCube_Source
            WHERE ProductCategory IS NOT NULL
            GROUP BY ProductCategory
            ORDER BY Revenue DESC
            """
            results = self.db.execute(text(query)).fetchall()
            
            return ChartData(
                labels=[r.ProductCategory for r in results],
                datasets=[ChartDataset(
                    label="Revenue",
                    data=[float(r.Revenue) for r in results]
                )]
            )
        except Exception as e:
            logger.error(f"Error fetching revenue by category chart: {str(e)}")
            raise
    
    def get_revenue_by_segment_chart(self) -> ChartData:
        """Get revenue by customer segment for charts"""
        try:
            query = """
            SELECT TOP 10
                CustomerSegment,
                ISNULL(SUM(Revenue), 0) as Revenue
            FROM Sales.vw_RevenueCube_Source
            WHERE CustomerSegment IS NOT NULL
            GROUP BY CustomerSegment
            ORDER BY Revenue DESC
            """
            results = self.db.execute(text(query)).fetchall()
            
            return ChartData(
                labels=[r.CustomerSegment for r in results],
                datasets=[ChartDataset(
                    label="Revenue",
                    data=[float(r.Revenue) for r in results]
                )]
            )
        except Exception as e:
            logger.error(f"Error fetching revenue by segment chart: {str(e)}")
            raise
    
    def get_complete_dashboard(self) -> DashboardResponse:
        """Get complete dashboard with all KPIs and charts"""
        try:
            return DashboardResponse(
                kpis=self.get_dashboard_kpis(),
                revenue_by_year=self.get_revenue_by_year_chart(),
                revenue_by_region=self.get_revenue_by_region_chart(),
                revenue_by_category=self.get_revenue_by_category_chart(),
                revenue_by_segment=self.get_revenue_by_segment_chart()
            )
        except Exception as e:
            logger.error(f"Error fetching complete dashboard: {str(e)}")
            raise
