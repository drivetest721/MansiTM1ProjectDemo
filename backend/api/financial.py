from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from schemas import *
from typing import Optional

router = APIRouter()

@router.get("/", response_model=FinancialConsolidationResponse)
async def get_financial_consolidation(
    year: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    cost_center: Optional[str] = Query(None),
    account: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get Financial Consolidation Cube data"""
    
    where_clauses = []
    if year:
        where_clauses.append(f"d.Year IN ({year})")
    if entity:
        where_clauses.append(f"e.EntityName IN ('{entity}')")
    if department:
        where_clauses.append(f"dep.DepartmentName IN ('{department}')")
    if cost_center:
        where_clauses.append(f"cc.CostCenterName IN ('{cost_center}')")
    if account:
        where_clauses.append(f"a.AccountName IN ('{account}')")
    
    where_sql = " AND " + " AND ".join(where_clauses) if where_clauses else ""
    
    query = f"""
    SELECT 
        d.Year,
        d.Month,
        e.EntityName as Entity,
        dep.DepartmentName as Department,
        cc.CostCenterName as CostCenter,
        a.AccountName as Account,
        a.AccountType,
        SUM(f.Amount) as Amount
    FROM Finance.FactGL f
    JOIN MasterData.DimDate d ON f.DateKey = d.DateKey
    JOIN MasterData.DimEntity e ON f.EntityKey = e.EntityKey
    JOIN MasterData.DimDepartment dep ON f.DepartmentKey = dep.DepartmentKey
    JOIN MasterData.DimCostCenter cc ON f.CostCenterKey = cc.CostCenterKey
    JOIN MasterData.DimAccount a ON f.AccountKey = a.AccountKey
    {where_sql}
    GROUP BY d.Year, d.Month, e.EntityName, dep.DepartmentName, cc.CostCenterName, a.AccountName, a.AccountType
    ORDER BY d.Year, d.Month, e.EntityName
    """
    
    results = db.execute(text(query)).fetchall()
    
    data = [
        FinancialConsolidationRow(
            year=r.Year,
            month=r.Month,
            entity=r.Entity,
            department=r.Department,
            cost_center=r.CostCenter,
            account=r.Account,
            account_type=r.AccountType,
            amount=r.Amount
        )
        for r in results
    ]
    
    return FinancialConsolidationResponse(data=data, count=len(data))


@router.get("/pl-report")
async def get_pl_report(
    year: Optional[int] = Query(None),
    entity: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get P&L Report"""
    
    where_clauses = []
    if year:
        where_clauses.append(f"d.Year = {year}")
    if entity:
        where_clauses.append(f"e.EntityName = '{entity}'")
    
    where_sql = " AND " + " AND ".join(where_clauses) if where_clauses else ""
    
    query = f"""
    SELECT 
        a.AccountName,
        a.AccountType,
        a.Category,
        SUM(f.Amount) as Amount
    FROM Finance.FactGL f
    JOIN MasterData.DimDate d ON f.DateKey = d.DateKey
    JOIN MasterData.DimEntity e ON f.EntityKey = e.EntityKey
    JOIN MasterData.DimAccount a ON f.AccountKey = a.AccountKey
    WHERE a.AccountType IN ('Revenue', 'Expense')
    {where_sql}
    GROUP BY a.AccountName, a.AccountType, a.Category
    ORDER BY a.AccountType, a.Category, a.AccountName
    """
    
    results = db.execute(text(query)).fetchall()
    
    revenue = sum(r.Amount for r in results if r.AccountType == 'Revenue')
    expense = sum(r.Amount for r in results if r.AccountType == 'Expense')
    net_income = revenue - expense
    
    return {
        "revenue": float(revenue),
        "expense": float(expense),
        "net_income": float(net_income),
        "details": [
            {
                "account": r.AccountName,
                "type": r.AccountType,
                "category": r.Category,
                "amount": float(r.Amount)
            }
            for r in results
        ]
    }


@router.get("/balance-sheet")
async def get_balance_sheet(
    year: Optional[int] = Query(None),
    entity: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get Balance Sheet Report"""
    
    where_clauses = []
    if year:
        where_clauses.append(f"d.Year = {year}")
    if entity:
        where_clauses.append(f"e.EntityName = '{entity}'")
    
    where_sql = " AND " + " AND ".join(where_clauses) if where_clauses else ""
    
    query = f"""
    SELECT 
        a.AccountName,
        a.AccountType,
        a.Category,
        SUM(f.Amount) as Amount
    FROM Finance.FactGL f
    JOIN MasterData.DimDate d ON f.DateKey = d.DateKey
    JOIN MasterData.DimEntity e ON f.EntityKey = e.EntityKey
    JOIN MasterData.DimAccount a ON f.AccountKey = a.AccountKey
    WHERE a.AccountType IN ('Asset', 'Liability', 'Equity')
    {where_sql}
    GROUP BY a.AccountName, a.AccountType, a.Category
    ORDER BY a.AccountType, a.Category, a.AccountName
    """
    
    results = db.execute(text(query)).fetchall()
    
    assets = sum(r.Amount for r in results if r.AccountType == 'Asset')
    liabilities = sum(r.Amount for r in results if r.AccountType == 'Liability')
    equity = sum(r.Amount for r in results if r.AccountType == 'Equity')
    
    return {
        "assets": float(assets),
        "liabilities": float(liabilities),
        "equity": float(equity),
        "details": [
            {
                "account": r.AccountName,
                "type": r.AccountType,
                "category": r.Category,
                "amount": float(r.Amount)
            }
            for r in results
        ]
    }


@router.get("/filters")
async def get_financial_consolidation_filters(db: Session = Depends(get_db)):
    """Get available filter values for Financial Consolidation Cube"""
    
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
    
    # Cost Centers
    query = "SELECT DISTINCT CostCenterName FROM MasterData.DimCostCenter ORDER BY CostCenterName"
    results = db.execute(text(query)).fetchall()
    filters['cost_centers'] = [r.CostCenterName for r in results]
    
    # Accounts
    query = "SELECT DISTINCT AccountName FROM MasterData.DimAccount ORDER BY AccountName"
    results = db.execute(text(query)).fetchall()
    filters['accounts'] = [r.AccountName for r in results]
    
    return filters
