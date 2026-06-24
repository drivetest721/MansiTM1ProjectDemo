from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from schemas import *
from typing import Optional

router = APIRouter()

@router.get("/", response_model=WorkforceCubeResponse)
async def get_workforce_cube(
    year: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    cost_center: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get Workforce Planning Cube data"""
    
    where_clauses = []
    if year:
        where_clauses.append(f"d.Year IN ({year})")
    if department:
        where_clauses.append(f"dep.DepartmentName IN ('{department}')")
    if cost_center:
        where_clauses.append(f"cc.CostCenterName IN ('{cost_center}')")
    if entity:
        where_clauses.append(f"e.EntityName IN ('{entity}')")
    
    where_sql = " AND " + " AND ".join(where_clauses) if where_clauses else ""
    
    query = f"""
    SELECT 
        d.Year,
        d.Month,
        dep.DepartmentName as Department,
        cc.CostCenterName as CostCenter,
        e.EntityName as Entity,
        emp.EmployeeName,
        f.BaseSalary,
        f.Bonus,
        f.Benefits,
        f.TotalCompensation
    FROM HR.FactPayroll f
    JOIN MasterData.DimDate d ON f.DateKey = d.DateKey
    JOIN MasterData.DimEmployee emp ON f.EmployeeKey = emp.EmployeeKey
    JOIN MasterData.DimEntity e ON f.EntityKey = e.EntityKey
    JOIN MasterData.DimDepartment dep ON f.DepartmentKey = dep.DepartmentKey
    JOIN MasterData.DimCostCenter cc ON f.CostCenterKey = cc.CostCenterKey
    {where_sql}
    ORDER BY d.Year, d.Month, dep.DepartmentName
    """
    
    results = db.execute(text(query)).fetchall()
    
    data = [
        WorkforceCubeRow(
            year=r.Year,
            month=r.Month,
            department=r.Department,
            cost_center=r.CostCenter,
            entity=r.Entity,
            employee_name=r.EmployeeName,
            base_salary=r.BaseSalary,
            bonus=r.Bonus,
            benefits=r.Benefits,
            total_compensation=r.TotalCompensation
        )
        for r in results
    ]
    
    return WorkforceCubeResponse(data=data, count=len(data))


@router.get("/filters")
async def get_workforce_cube_filters(db: Session = Depends(get_db)):
    """Get available filter values for Workforce Cube"""
    
    filters = {}
    
    # Years
    query = "SELECT DISTINCT Year FROM MasterData.DimDate ORDER BY Year"
    results = db.execute(text(query)).fetchall()
    filters['years'] = [r.Year for r in results]
    
    # Departments
    query = "SELECT DISTINCT DepartmentName FROM MasterData.DimDepartment ORDER BY DepartmentName"
    results = db.execute(text(query)).fetchall()
    filters['departments'] = [r.DepartmentName for r in results]
    
    # Cost Centers
    query = "SELECT DISTINCT CostCenterName FROM MasterData.DimCostCenter ORDER BY CostCenterName"
    results = db.execute(text(query)).fetchall()
    filters['cost_centers'] = [r.CostCenterName for r in results]
    
    # Entities
    query = "SELECT DISTINCT EntityName FROM MasterData.DimEntity ORDER BY EntityName"
    results = db.execute(text(query)).fetchall()
    filters['entities'] = [r.EntityName for r in results]
    
    return filters
