from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from schemas import AdminStatsResponse, TableStats
from datetime import datetime

router = APIRouter()

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(db: Session = Depends(get_db)):
    """Get database statistics and table information"""
    
    query = """
    SELECT 
        s.name AS schema_name,
        t.name AS table_name,
        p.rows AS row_count,
        SUM(a.total_pages) * 8 AS size_kb
    FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    INNER JOIN sys.indexes i ON t.object_id = i.object_id
    INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
    INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
    WHERE s.name IN ('MasterData', 'Sales', 'HR', 'Planning', 'Finance')
    GROUP BY s.name, t.name, p.rows
    ORDER BY s.name, t.name
    """
    
    results = db.execute(text(query)).fetchall()
    
    tables = [
        TableStats(
            schema_name=r.schema_name,
            table_name=r.table_name,
            row_count=r.row_count,
            size_kb=r.size_kb
        )
        for r in results
    ]
    
    total_size = sum(t.size_kb for t in tables)
    
    return AdminStatsResponse(
        tables=tables,
        total_size_kb=total_size,
        last_refresh=datetime.now().isoformat()
    )


@router.get("/cube-metadata")
async def get_cube_metadata(db: Session = Depends(get_db)):
    """Get metadata about available cubes"""
    
    cubes = [
        {
            "name": "Revenue Cube",
            "source": "Sales.vw_RevenueCube_Source",
            "dimensions": ["Time", "Customer", "Product", "Entity"],
            "measures": ["Revenue", "Cost", "Quantity", "Margin", "Margin %"]
        },
        {
            "name": "Workforce Planning Cube",
            "source": "HR.FactPayroll",
            "dimensions": ["Time", "Employee", "Department", "Cost Center", "Entity"],
            "measures": ["Base Salary", "Bonus", "Benefits", "Total Compensation"]
        },
        {
            "name": "Budget vs Forecast Cube",
            "source": "Planning.FactBudget, Planning.FactForecast",
            "dimensions": ["Time", "Entity", "Department", "Account", "Scenario", "Version"],
            "measures": ["Budget", "Forecast", "Variance", "Variance %"]
        },
        {
            "name": "Financial Consolidation Cube",
            "source": "Finance.FactGL",
            "dimensions": ["Time", "Entity", "Department", "Cost Center", "Account"],
            "measures": ["Amount"]
        }
    ]
    
    return {"cubes": cubes}
