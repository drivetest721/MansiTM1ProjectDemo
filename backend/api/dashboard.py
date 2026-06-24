from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from schemas import *
from typing import List

router = APIRouter()

@router.get("/", response_model=DashboardResponse)
async def get_dashboard(db: Session = Depends(get_db)):
    """Get dashboard KPIs and charts"""
    
    # Get KPIs
    kpis = []
    
    # Total Revenue
    result = db.execute(text("SELECT SUM(Revenue) as total FROM Sales.FactSales")).fetchone()
    kpis.append(KPICard(title="Total Revenue", value=float(result.total or 0), format="currency"))
    
    # Total Cost
    result = db.execute(text("SELECT SUM(Cost) as total FROM Sales.FactSales")).fetchone()
    kpis.append(KPICard(title="Total Cost", value=float(result.total or 0), format="currency"))
    
    # Total Margin
    result = db.execute(text("SELECT SUM(Margin) as total FROM Sales.FactSales")).fetchone()
    kpis.append(KPICard(title="Total Margin", value=float(result.total or 0), format="currency"))
    
    # Total Customers
    result = db.execute(text("SELECT COUNT(DISTINCT CustomerKey) as total FROM MasterData.DimCustomer")).fetchone()
    kpis.append(KPICard(title="Total Customers", value=float(result.total or 0), format="number"))
    
    # Total Products
    result = db.execute(text("SELECT COUNT(DISTINCT ProductKey) as total FROM MasterData.DimProduct")).fetchone()
    kpis.append(KPICard(title="Total Products", value=float(result.total or 0), format="number"))
    
    # Total Employees
    result = db.execute(text("SELECT COUNT(DISTINCT EmployeeKey) as total FROM MasterData.DimEmployee")).fetchone()
    kpis.append(KPICard(title="Total Employees", value=float(result.total or 0), format="number"))
    
    # Total Budget
    result = db.execute(text("SELECT SUM(Amount) as total FROM Planning.FactBudget")).fetchone()
    kpis.append(KPICard(title="Total Budget", value=float(result.total or 0), format="currency"))
    
    # Total Forecast
    result = db.execute(text("SELECT SUM(Amount) as total FROM Planning.FactForecast")).fetchone()
    kpis.append(KPICard(title="Total Forecast", value=float(result.total or 0), format="currency"))
    
    # Total GL Transactions
    result = db.execute(text("SELECT SUM(Amount) as total FROM Finance.FactGL")).fetchone()
    kpis.append(KPICard(title="Total GL Transactions", value=float(result.total or 0), format="currency"))
    
    # Revenue by Year
    query = """
    SELECT d.Year, SUM(f.Revenue) as Revenue
    FROM Sales.FactSales f
    JOIN MasterData.DimDate d ON f.DateKey = d.DateKey
    GROUP BY d.Year
    ORDER BY d.Year
    """
    results = db.execute(text(query)).fetchall()
    revenue_by_year = ChartData(
        labels=[str(r.Year) for r in results],
        datasets=[{"label": "Revenue", "data": [float(r.Revenue or 0) for r in results]}]
    )
    
    # Revenue by Region
    query = """
    SELECT e.Region, SUM(f.Revenue) as Revenue
    FROM Sales.FactSales f
    JOIN MasterData.DimEntity e ON f.EntityKey = e.EntityKey
    WHERE e.Region IS NOT NULL
    GROUP BY e.Region
    ORDER BY Revenue DESC
    """
    results = db.execute(text(query)).fetchall()
    revenue_by_region = ChartData(
        labels=[r.Region for r in results],
        datasets=[{"label": "Revenue", "data": [float(r.Revenue or 0) for r in results]}]
    )
    
    # Revenue by Product Category
    query = """
    SELECT p.Category, SUM(f.Revenue) as Revenue
    FROM Sales.FactSales f
    JOIN MasterData.DimProduct p ON f.ProductKey = p.ProductKey
    WHERE p.Category IS NOT NULL
    GROUP BY p.Category
    ORDER BY Revenue DESC
    """
    results = db.execute(text(query)).fetchall()
    revenue_by_category = ChartData(
        labels=[r.Category for r in results],
        datasets=[{"label": "Revenue", "data": [float(r.Revenue or 0) for r in results]}]
    )
    
    # Revenue by Customer Segment
    query = """
    SELECT c.Segment, SUM(f.Revenue) as Revenue
    FROM Sales.FactSales f
    JOIN MasterData.DimCustomer c ON f.CustomerKey = c.CustomerKey
    WHERE c.Segment IS NOT NULL
    GROUP BY c.Segment
    ORDER BY Revenue DESC
    """
    results = db.execute(text(query)).fetchall()
    revenue_by_segment = ChartData(
        labels=[r.Segment for r in results],
        datasets=[{"label": "Revenue", "data": [float(r.Revenue or 0) for r in results]}]
    )
    
    # Payroll by Department
    query = """
    SELECT dep.DepartmentName, SUM(f.TotalCompensation) as TotalComp
    FROM HR.FactPayroll f
    JOIN MasterData.DimDepartment dep ON f.DepartmentKey = dep.DepartmentKey
    WHERE dep.DepartmentName IS NOT NULL
    GROUP BY dep.DepartmentName
    ORDER BY TotalComp DESC
    """
    results = db.execute(text(query)).fetchall()
    payroll_by_department = ChartData(
        labels=[r.DepartmentName for r in results],
        datasets=[{"label": "Total Compensation", "data": [float(r.TotalComp or 0) for r in results]}]
    )
    
    # Budget vs Forecast Trend
    query = """
    SELECT d.Year, d.Month,
           SUM(b.Amount) as Budget,
           SUM(fc.Amount) as Forecast
    FROM Planning.FactBudget b
    JOIN MasterData.DimDate d ON b.DateKey = d.DateKey
    FULL OUTER JOIN Planning.FactForecast fc ON b.DateKey = fc.DateKey
    GROUP BY d.Year, d.Month
    ORDER BY d.Year, d.Month
    """
    results = db.execute(text(query)).fetchall()
    budget_forecast_trend = ChartData(
        labels=[f"{r.Year}-{r.Month:02d}" for r in results],
        datasets=[
            {"label": "Budget", "data": [float(r.Budget or 0) for r in results]},
            {"label": "Forecast", "data": [float(r.Forecast or 0) for r in results]}
        ]
    )
    
    # P&L Trend
    query = """
    SELECT d.Year, d.Month,
           SUM(CASE WHEN a.AccountType = 'Revenue' THEN f.Amount ELSE 0 END) as Revenue,
           SUM(CASE WHEN a.AccountType = 'Expense' THEN f.Amount ELSE 0 END) as Expense
    FROM Finance.FactGL f
    JOIN MasterData.DimDate d ON f.DateKey = d.DateKey
    JOIN MasterData.DimAccount a ON f.AccountKey = a.AccountKey
    GROUP BY d.Year, d.Month
    ORDER BY d.Year, d.Month
    """
    results = db.execute(text(query)).fetchall()
    pl_trend = ChartData(
        labels=[f"{r.Year}-{r.Month:02d}" for r in results],
        datasets=[
            {"label": "Revenue", "data": [float(r.Revenue or 0) for r in results]},
            {"label": "Expense", "data": [float(r.Expense or 0) for r in results]}
        ]
    )
    
    return DashboardResponse(
        kpis=kpis,
        revenue_by_year=revenue_by_year,
        revenue_by_region=revenue_by_region,
        revenue_by_category=revenue_by_category,
        revenue_by_segment=revenue_by_segment,
        payroll_by_department=payroll_by_department,
        budget_forecast_trend=budget_forecast_trend,
        pl_trend=pl_trend
    )
