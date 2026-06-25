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

class DashboardService:
    """Service for dashboard operations"""
    
    def __init__(self, db: Session):
        self.db = db
    

    def get_dashboard_kpis(self):
        """Cached — delegates to _fetch_get_dashboard_kpis with a 300-second TTL."""
        return _agg_cached("dash:kpis", lambda: self._fetch_get_dashboard_kpis())

    def _fetch_get_dashboard_kpis(self) -> List[KPIMetric]:
        """Get all dashboard KPIs — single query per source instead of 7 round trips"""
        try:
            kpis = []

            # --- Single query for all revenue-based KPIs (was 4 separate queries) ---
            revenue_query = """
            SELECT
                ISNULL(SUM(Revenue), 0)            AS TotalRevenue,
                ISNULL(SUM(Cost), 0)               AS TotalCost,
                ISNULL(SUM(Margin), 0)             AS TotalMargin,
                COUNT(DISTINCT CustomerID)         AS TotalCustomers,
                COUNT(DISTINCT ProductID)          AS TotalProducts
            FROM Sales.vw_RevenueCube_Source WITH (NOLOCK)
            """
            rev = self.db.execute(text(revenue_query)).fetchone()

            total_revenue = float(rev.TotalRevenue) if rev else 0
            total_cost    = float(rev.TotalCost)    if rev else 0
            total_margin  = float(rev.TotalMargin)  if rev else 0
            margin_pct    = (total_margin / total_revenue * 100) if total_revenue > 0 else 0

            kpis.append(KPIMetric(title="Total Revenue",      value=total_revenue, format="currency"))
            kpis.append(KPIMetric(title="Total Cost",         value=total_cost,    format="currency"))
            kpis.append(KPIMetric(title="Total Gross Margin", value=total_margin,  format="currency"))
            kpis.append(KPIMetric(title="GrossMargin %",      value=margin_pct,    format="percent"))
            kpis.append(KPIMetric(title="Total Customers",    value=float(rev.TotalCustomers if rev else 0), format="number"))
            kpis.append(KPIMetric(title="Total Products",     value=float(rev.TotalProducts  if rev else 0), format="number"))

            # --- Single query for workforce KPI (separate source, still one query) ---
            wf_query = "SELECT COUNT(DISTINCT EmployeeID) AS TotalEmployees FROM HR.vw_WorkforceCube_Source WITH (NOLOCK)"
            wf = self.db.execute(text(wf_query)).fetchone()
            kpis.append(KPIMetric(title="Total Employees", value=float(wf.TotalEmployees if wf else 0), format="number"))

            logger.info(f"Retrieved {len(kpis)} dashboard KPIs (2 DB queries instead of 7)")
            return kpis

        except Exception as e:
            logger.error(f"Error fetching dashboard KPIs: {str(e)}")
            raise
    

    def get_revenue_by_year_chart(self):
        """Cached — delegates to _fetch_get_revenue_by_year_chart with a 300-second TTL."""
        return _agg_cached("dash:yr", lambda: self._fetch_get_revenue_by_year_chart())

    def _fetch_get_revenue_by_year_chart(self) -> ChartData:
        """Get revenue by year for charts"""
        try:
            query = """
            SELECT 
                YearNumber,
                ISNULL(SUM(Revenue), 0) as Revenue
            FROM Sales.vw_RevenueCube_Source WITH (NOLOCK)
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
    

    def get_revenue_by_region_chart(self):
        """Cached — delegates to _fetch_get_revenue_by_region_chart with a 300-second TTL."""
        return _agg_cached("dash:region", lambda: self._fetch_get_revenue_by_region_chart())

    def _fetch_get_revenue_by_region_chart(self) -> ChartData:
        """Get revenue by region for charts"""
        try:
            query = """
            SELECT TOP 10
                RegionName,
                ISNULL(SUM(Revenue), 0) as Revenue
            FROM Sales.vw_RevenueCube_Source WITH (NOLOCK)
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
    

    def get_revenue_by_category_chart(self):
        """Cached — delegates to _fetch_get_revenue_by_category_chart with a 300-second TTL."""
        return _agg_cached("dash:cat", lambda: self._fetch_get_revenue_by_category_chart())

    def _fetch_get_revenue_by_category_chart(self) -> ChartData:
        """Get revenue by product category for charts"""
        try:
            query = """
            SELECT TOP 10
                ProductCategory,
                ISNULL(SUM(Revenue), 0) as Revenue
            FROM Sales.vw_RevenueCube_Source WITH (NOLOCK)
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
    

    def get_revenue_by_segment_chart(self):
        """Cached — delegates to _fetch_get_revenue_by_segment_chart with a 300-second TTL."""
        return _agg_cached("dash:seg", lambda: self._fetch_get_revenue_by_segment_chart())

    def _fetch_get_revenue_by_segment_chart(self) -> ChartData:
        """Get revenue by customer segment for charts"""
        try:
            query = """
            SELECT TOP 10
                CustomerSegment,
                ISNULL(SUM(Revenue), 0) as Revenue
            FROM Sales.vw_RevenueCube_Source WITH (NOLOCK)
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
