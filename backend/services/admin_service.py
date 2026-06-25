"""
Admin Service - System Health Monitoring
Provides real-time system health, table statistics, and data quality metrics
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List
from datetime import datetime, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)


class AdminService:
    """Service for system administration and health monitoring"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get real-time system health status"""
        try:
            status = {
                "timestamp": datetime.now().isoformat(),
                "components": []
            }
            
            # Check SQL Server connectivity and version
            sql_status = self._check_sql_server()
            status["components"].append(sql_status)
            
            # Check database size and space
            db_status = self._check_database_status()
            status["components"].append(db_status)
            
            # Check active connections
            conn_status = self._check_connections()
            status["components"].append(conn_status)
            
            # Overall health
            all_healthy = all(c["status"] == "healthy" for c in status["components"])
            status["overall_status"] = "healthy" if all_healthy else "warning"
            
            return status
            
        except Exception as e:
            logger.error(f"Failed to get system status: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "overall_status": "error",
                "error": str(e),
                "components": []
            }
    
    def _check_sql_server(self) -> Dict[str, Any]:
        """Check SQL Server status and version"""
        try:
            query = text("""
                SELECT 
                    @@VERSION as Version,
                    @@SERVERNAME as ServerName,
                    GETDATE() as ServerTime
            """)
            
            result = self.db.execute(query).fetchone()
            
            return {
                "name": "SQL Server",
                "status": "healthy",
                "details": {
                    "server_name": result[1],
                    "server_time": result[2].isoformat(),
                    "version": result[0].split('\n')[0] if result[0] else "Unknown"
                },
                "last_check": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"SQL Server check failed: {e}")
            return {
                "name": "SQL Server",
                "status": "error",
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }
    
    def _check_database_status(self) -> Dict[str, Any]:
        """Check database size and status"""
        try:
            query = text("""
                SELECT 
                    DB_NAME() as DatabaseName,
                    SUM(size) * 8.0 / 1024 as SizeMB,
                    SUM(CASE WHEN type = 0 THEN size END) * 8.0 / 1024 as DataSizeMB,
                    SUM(CASE WHEN type = 1 THEN size END) * 8.0 / 1024 as LogSizeMB
                FROM sys.database_files
            """)
            
            result = self.db.execute(query).fetchone()
            
            return {
                "name": "Database",
                "status": "healthy",
                "details": {
                    "database_name": result[0],
                    "total_size_mb": round(float(result[1] or 0), 2),
                    "data_size_mb": round(float(result[2] or 0), 2),
                    "log_size_mb": round(float(result[3] or 0), 2)
                },
                "last_check": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Database check failed: {e}")
            return {
                "name": "Database",
                "status": "error",
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }
    
    def _check_connections(self) -> Dict[str, Any]:
        """Check active database connections"""
        try:
            query = text("""
                SELECT 
                    COUNT(*) as TotalConnections,
                    SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as ActiveConnections,
                    SUM(CASE WHEN status = 'sleeping' THEN 1 ELSE 0 END) as IdleConnections
                FROM sys.dm_exec_sessions
                WHERE is_user_process = 1
            """)
            
            result = self.db.execute(query).fetchone()
            
            total_conn = result[0] or 0
            status = "healthy" if total_conn < 100 else "warning"
            
            return {
                "name": "Connections",
                "status": status,
                "details": {
                    "total_connections": total_conn,
                    "active_connections": result[1] or 0,
                    "idle_connections": result[2] or 0
                },
                "last_check": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Connection check failed: {e}")
            return {
                "name": "Connections",
                "status": "error",
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }
    
    def get_table_health(self) -> List[Dict[str, Any]]:
        """Get health statistics for all major tables"""
        try:
            query = text("""
                SELECT 
                    s.name as SchemaName,
                    t.name as TableName,
                    p.rows as RowCount,
                    SUM(a.total_pages) * 8 / 1024.0 as TotalSizeMB,
                    SUM(a.used_pages) * 8 / 1024.0 as UsedSizeMB,
                    (SUM(a.total_pages) - SUM(a.used_pages)) * 8 / 1024.0 as UnusedSizeMB,
                    MAX(i.last_user_update) as LastUpdate
                FROM sys.tables t
                INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
                INNER JOIN sys.indexes i ON t.object_id = i.object_id
                INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
                INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
                LEFT OUTER JOIN sys.dm_db_index_usage_stats ius ON i.object_id = ius.object_id AND i.index_id = ius.index_id
                WHERE t.is_ms_shipped = 0
                    AND i.index_id <= 1
                    AND s.name IN ('Finance', 'Planning', 'TM1', 'Dimensions')
                GROUP BY s.name, t.name, p.rows
                ORDER BY p.rows DESC
            """)
            
            results = self.db.execute(query).fetchall()
            
            tables = []
            for row in results:
                health_status = "healthy"
                if row[2] == 0:  # No rows
                    health_status = "warning"
                elif row[6] and (datetime.now() - row[6]) > timedelta(days=30):
                    health_status = "stale"
                
                tables.append({
                    "schema_name": row[0],
                    "table_name": row[1],
                    "full_name": f"{row[0]}.{row[1]}",
                    "row_count": row[2] or 0,
                    "total_size_mb": round(float(row[3] or 0), 2),
                    "used_size_mb": round(float(row[4] or 0), 2),
                    "unused_size_mb": round(float(row[5] or 0), 2),
                    "last_update": row[6].isoformat() if row[6] else None,
                    "status": health_status
                })
            
            return tables
            
        except Exception as e:
            logger.error(f"Failed to get table health: {e}")
            return []
    
    def get_cube_health(self) -> List[Dict[str, Any]]:
        """Get health statistics for TM1 cubes"""
        try:
            # Get cube metadata from views
            query = text("""
                SELECT 
                    'Revenue' as CubeName,
                    COUNT(DISTINCT AccountName) as DimensionCount,
                    COUNT(*) as CellCount,
                    MAX(YearNumber) as LastYear,
                    'Active' as Status
                FROM Planning.vw_ForecastCube_Source
                
                UNION ALL
                
                SELECT 
                    'Workforce' as CubeName,
                    5 as DimensionCount,
                    COUNT(*) as CellCount,
                    MAX(YearNumber) as LastYear,
                    'Active' as Status
                FROM Workforce.FactWorkforcePlanning
                
                UNION ALL
                
                SELECT 
                    'Budget' as CubeName,
                    6 as DimensionCount,
                    COUNT(*) as CellCount,
                    MAX(YearNumber) as LastYear,
                    'Active' as Status
                FROM Planning.vw_BudgetForecastVariance
                
                UNION ALL
                
                SELECT 
                    'P&L' as CubeName,
                    4 as DimensionCount,
                    COUNT(*) as CellCount,
                    MAX(YearNumber) as LastYear,
                    'Active' as Status
                FROM Finance.vw_PL_Statement
                
                UNION ALL
                
                SELECT 
                    'Balance Sheet' as CubeName,
                    4 as DimensionCount,
                    COUNT(*) as CellCount,
                    MAX(YearNumber) as LastYear,
                    'Active' as Status
                FROM Finance.vw_BalanceSheet
            """)
            
            results = self.db.execute(query).fetchall()
            
            cubes = []
            for row in results:
                cubes.append({
                    "cube_name": row[0],
                    "dimension_count": row[1],
                    "cell_count": row[2],
                    "last_year": row[3],
                    "status": row[4],
                    "health": "healthy" if row[2] > 0 else "warning"
                })
            
            return cubes
            
        except Exception as e:
            logger.error(f"Failed to get cube health: {e}")
            return []
    
    def get_refresh_history(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get data refresh history (simulated for now)"""
        try:
            # Check actual data freshness from tables
            query = text("""
                SELECT 
                    'P&L Statement' as DataSource,
                    MAX(YearNumber) as LastYear,
                    COUNT(*) as RecordCount,
                    GETDATE() as LastCheck
                FROM Finance.vw_PL_Statement
                
                UNION ALL
                
                SELECT 
                    'Balance Sheet' as DataSource,
                    MAX(YearNumber) as LastYear,
                    COUNT(*) as RecordCount,
                    GETDATE() as LastCheck
                FROM Finance.vw_BalanceSheet
                
                UNION ALL
                
                SELECT 
                    'Forecast Cube' as DataSource,
                    MAX(YearNumber) as LastYear,
                    COUNT(*) as RecordCount,
                    GETDATE() as LastCheck
                FROM Planning.vw_ForecastCube_Source
                
                UNION ALL
                
                SELECT 
                    'Workforce' as DataSource,
                    MAX(YearNumber) as LastYear,
                    COUNT(*) as RecordCount,
                    GETDATE() as LastCheck
                FROM Workforce.FactWorkforcePlanning
            """)
            
            results = self.db.execute(query).fetchall()
            
            history = []
            for row in results:
                history.append({
                    "data_source": row[0],
                    "last_year": row[1],
                    "record_count": row[2],
                    "last_check": row[3].isoformat(),
                    "status": "success" if row[2] > 0 else "warning"
                })
            
            return history
            
        except Exception as e:
            logger.error(f"Failed to get refresh history: {e}")
            return []
    
    def get_data_quality_summary(self) -> Dict[str, Any]:
        """Get data quality summary across all major views"""
        try:
            quality = {
                "timestamp": datetime.now().isoformat(),
                "checks": []
            }
            
            # Check for NULL values in critical columns
            null_check_query = text("""
                SELECT 
                    'P&L Statement' as ViewName,
                    COUNT(*) as TotalRows,
                    SUM(CASE WHEN AccountName IS NULL THEN 1 ELSE 0 END) as NullAccountNames,
                    SUM(CASE WHEN ActualAmount IS NULL THEN 1 ELSE 0 END) as NullAmounts
                FROM Finance.vw_PL_Statement
                
                UNION ALL
                
                SELECT 
                    'Balance Sheet' as ViewName,
                    COUNT(*) as TotalRows,
                    SUM(CASE WHEN AccountName IS NULL THEN 1 ELSE 0 END) as NullAccountNames,
                    SUM(CASE WHEN BalanceAmount IS NULL THEN 1 ELSE 0 END) as NullAmounts
                FROM Finance.vw_BalanceSheet
            """)
            
            results = self.db.execute(null_check_query).fetchall()
            
            for row in results:
                total_rows = row[1]
                null_accounts = row[2]
                null_amounts = row[3]
                
                quality_score = 100
                if total_rows > 0:
                    quality_score -= (null_accounts / total_rows) * 50
                    quality_score -= (null_amounts / total_rows) * 50
                
                status = "excellent" if quality_score >= 95 else "good" if quality_score >= 80 else "warning"
                
                quality["checks"].append({
                    "view_name": row[0],
                    "total_rows": total_rows,
                    "null_accounts": null_accounts,
                    "null_amounts": null_amounts,
                    "quality_score": round(quality_score, 1),
                    "status": status
                })
            
            # Overall quality
            if quality["checks"]:
                avg_score = sum(c["quality_score"] for c in quality["checks"]) / len(quality["checks"])
                quality["overall_quality"] = round(avg_score, 1)
                quality["overall_status"] = "excellent" if avg_score >= 95 else "good" if avg_score >= 80 else "warning"
            else:
                quality["overall_quality"] = 0
                quality["overall_status"] = "error"
            
            return quality
            
        except Exception as e:
            logger.error(f"Failed to get data quality summary: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "overall_quality": 0,
                "overall_status": "error",
                "error": str(e),
                "checks": []
            }
