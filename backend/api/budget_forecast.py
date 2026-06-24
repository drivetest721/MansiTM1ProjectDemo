from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from schemas import *
from typing import Optional

router = APIRouter()

@router.get("/", response_model=BudgetForecastResponse)
async def get_budget_forecast(
    year: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    account: Optional[str] = Query(None),
    scenario: Optional[str] = Query(None),
    version: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get Budget vs Forecast Cube data"""
    
    where_clauses = []
    if year:
        where_clauses.append(f"d.Year IN ({year})")
    if entity:
        where_clauses.append(f"e.EntityName IN ('{entity}')")
    if department:
        where_clauses.append(f"dep.DepartmentName IN ('{department}')")
    if account:
        where_clauses.append(f"a.AccountName IN ('{account}')")
    if scenario:
        where_clauses.append(f"b.Scenario IN ('{scenario}')")
    if version:
        where_clauses.append(f"b.Version IN ('{version}')")
    
    where_sql = " AND " + " AND ".join(where_clauses) if where_clauses else ""
    
    query = f"""
    SELECT 
        d.Year,
        d.Month,
        e.EntityName as Entity,
        dep.DepartmentName as Department,
        a.AccountName as Account,
        COALESCE(b.Scenario, fc.Scenario) as Scenario,
        COALESCE(b.Version, fc.Version) as Version,
        COALESCE(SUM(b.Amount), 0) as Budget,
        COALESCE(SUM(fc.Amount), 0) as Forecast,
        COALESCE(SUM(fc.Amount), 0) - COALESCE(SUM(b.Amount), 0) as Variance,
        CASE 
            WHEN COALESCE(SUM(b.Amount), 0) > 0 
            THEN ((COALESCE(SUM(fc.Amount), 0) - COALESCE(SUM(b.Amount), 0)) / COALESCE(SUM(b.Amount), 0)) * 100 
            ELSE 0 
        END as VariancePct
    FROM MasterData.DimDate d
    CROSS JOIN MasterData.DimEntity e
    CROSS JOIN MasterData.DimDepartment dep
    CROSS JOIN MasterData.DimAccount a
    LEFT JOIN Planning.FactBudget b ON d.DateKey = b.DateKey AND e.EntityKey = b.EntityKey AND dep.DepartmentKey = b.DepartmentKey AND a.AccountKey = b.AccountKey
    LEFT JOIN Planning.FactForecast fc ON d.DateKey = fc.DateKey AND e.EntityKey = fc.EntityKey AND dep.DepartmentKey = fc.DepartmentKey AND a.AccountKey = fc.AccountKey
    WHERE 1=1 {where_sql}
    GROUP BY d.Year, d.Month, e.EntityName, dep.DepartmentName, a.AccountName, COALESCE(b.Scenario, fc.Scenario), COALESCE(b.Version, fc.Version)
    HAVING COALESCE(SUM(b.Amount), 0) > 0 OR COALESCE(SUM(fc.Amount), 0) > 0
    ORDER BY d.Year, d.Month
    """
    
    results = db.execute(text(query)).fetchall()
    
    data = [
        BudgetForecastRow(
            year=r.Year,
            month=r.Month,
            entity=r.Entity,
            department=r.Department,
            account=r.Account,
            scenario=r.Scenario,
            version=r.Version,
            budget=r.Budget,
            forecast=r.Forecast,
            variance=r.Variance,
            variance_pct=r.VariancePct
        )
        for r in results
    ]
    
    return BudgetForecastResponse(data=data, count=len(data))


@router.get("/filters")
async def get_budget_forecast_filters(db: Session = Depends(get_db)):
    """Get available filter values for Budget vs Forecast Cube"""
    
    filters = {}
    
    # Years
    query = "SELECT DISTINCT Year FROM MasterData.DimDate ORDER BY Year"
    results = db.execute(text(query)).fetchall()
    filters['years'] = [r.Year for r in results]
    
    # Entities
    query = "SELECT DISTINCT EntityName FROM MasterData.DimEntity ORDER BY EntityName"
    results = db.execute(text(query)).fetchall()
    filters['entities'] = [r.EntityName for r in results]
    
    # Departments
    query = "SELECT DISTINCT DepartmentName FROM MasterData.DimDepartment ORDER BY DepartmentName"
    results = db.execute(text(query)).fetchall()
    filters['departments'] = [r.DepartmentName for r in results]
    
    # Accounts
    query = "SELECT DISTINCT AccountName FROM MasterData.DimAccount ORDER BY AccountName"
    results = db.execute(text(query)).fetchall()
    filters['accounts'] = [r.AccountName for r in results]
    
    # Scenarios
    query = "SELECT DISTINCT Scenario FROM Planning.FactBudget WHERE Scenario IS NOT NULL UNION SELECT DISTINCT Scenario FROM Planning.FactForecast WHERE Scenario IS NOT NULL ORDER BY Scenario"
    results = db.execute(text(query)).fetchall()
    filters['scenarios'] = [r.Scenario for r in results]
    
    # Versions
    query = "SELECT DISTINCT Version FROM Planning.FactBudget WHERE Version IS NOT NULL UNION SELECT DISTINCT Version FROM Planning.FactForecast WHERE Version IS NOT NULL ORDER BY Version"
    results = db.execute(text(query)).fetchall()
    filters['versions'] = [r.Version for r in results]
    
    return filters
