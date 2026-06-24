from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from schemas import *
from typing import Optional

router = APIRouter()

@router.get("/", response_model=RevenueCubeResponse)
async def get_revenue_cube(
    year: Optional[str] = Query(None),
    quarter: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    entity: Optional[str] = Query(None),
    product_category: Optional[str] = Query(None),
    product_family: Optional[str] = Query(None),
    customer_industry: Optional[str] = Query(None),
    customer_segment: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get Revenue Cube data with filters"""
    
    where_clauses = []
    if year:
        where_clauses.append(f"d.Year IN ({year})")
    if quarter:
        where_clauses.append(f"d.Quarter IN ('{quarter}')")
    if month:
        where_clauses.append(f"d.Month IN ({month})")
    if region:
        where_clauses.append(f"e.Region IN ('{region}')")
    if entity:
        where_clauses.append(f"e.EntityName IN ('{entity}')")
    if product_category:
        where_clauses.append(f"p.Category IN ('{product_category}')")
    if product_family:
        where_clauses.append(f"p.Family IN ('{product_family}')")
    if customer_industry:
        where_clauses.append(f"c.Industry IN ('{customer_industry}')")
    if customer_segment:
        where_clauses.append(f"c.Segment IN ('{customer_segment}')")
    
    where_sql = " AND " + " AND ".join(where_clauses) if where_clauses else ""
    
    query = f"""
    SELECT 
        d.Year,
        d.Quarter,
        d.Month,
        e.Region,
        e.EntityName as Entity,
        p.Category as ProductCategory,
        p.Family as ProductFamily,
        c.Industry as CustomerIndustry,
        c.Segment as CustomerSegment,
        SUM(f.Revenue) as Revenue,
        SUM(f.Cost) as Cost,
        SUM(f.Quantity) as Quantity,
        SUM(f.Margin) as Margin,
        CASE WHEN SUM(f.Revenue) > 0 THEN (SUM(f.Margin) / SUM(f.Revenue)) * 100 ELSE 0 END as MarginPct
    FROM Sales.vw_RevenueCube_Source f
    JOIN MasterData.DimDate d ON f.DateKey = d.DateKey
    JOIN MasterData.DimEntity e ON f.EntityKey = e.EntityKey
    JOIN MasterData.DimProduct p ON f.ProductKey = p.ProductKey
    JOIN MasterData.DimCustomer c ON f.CustomerKey = c.CustomerKey
    {where_sql}
    GROUP BY d.Year, d.Quarter, d.Month, e.Region, e.EntityName, p.Category, p.Family, c.Industry, c.Segment
    ORDER BY d.Year, d.Month
    """
    
    results = db.execute(text(query)).fetchall()
    
    data = [
        RevenueCubeRow(
            year=r.Year,
            quarter=r.Quarter,
            month=r.Month,
            region=r.Region,
            entity=r.Entity,
            product_category=r.ProductCategory,
            product_family=r.ProductFamily,
            customer_industry=r.CustomerIndustry,
            customer_segment=r.CustomerSegment,
            revenue=r.Revenue,
            cost=r.Cost,
            quantity=r.Quantity,
            margin=r.Margin,
            margin_pct=r.MarginPct
        )
        for r in results
    ]
    
    # Calculate totals
    total_revenue = sum(r.revenue for r in data)
    total_cost = sum(r.cost for r in data)
    total_quantity = sum(r.quantity for r in data)
    total_margin = sum(r.margin for r in data)
    total_margin_pct = (total_margin / total_revenue * 100) if total_revenue > 0 else 0
    
    total = RevenueCubeMeasures(
        revenue=total_revenue,
        cost=total_cost,
        quantity=total_quantity,
        margin=total_margin,
        margin_pct=total_margin_pct
    )
    
    return RevenueCubeResponse(data=data, total=total, count=len(data))


@router.get("/filters")
async def get_revenue_cube_filters(db: Session = Depends(get_db)):
    """Get available filter values for Revenue Cube"""
    
    filters = {}
    
    # Years
    query = "SELECT DISTINCT Year FROM MasterData.DimDate ORDER BY Year"
    results = db.execute(text(query)).fetchall()
    filters['years'] = [r.Year for r in results]
    
    # Quarters
    query = "SELECT DISTINCT Quarter FROM MasterData.DimDate ORDER BY Quarter"
    results = db.execute(text(query)).fetchall()
    filters['quarters'] = [r.Quarter for r in results]
    
    # Regions
    query = "SELECT DISTINCT Region FROM MasterData.DimEntity WHERE Region IS NOT NULL ORDER BY Region"
    results = db.execute(text(query)).fetchall()
    filters['regions'] = [r.Region for r in results]
    
    # Entities
    query = "SELECT DISTINCT EntityName FROM MasterData.DimEntity ORDER BY EntityName"
    results = db.execute(text(query)).fetchall()
    filters['entities'] = [r.EntityName for r in results]
    
    # Product Categories
    query = "SELECT DISTINCT Category FROM MasterData.DimProduct WHERE Category IS NOT NULL ORDER BY Category"
    results = db.execute(text(query)).fetchall()
    filters['product_categories'] = [r.Category for r in results]
    
    # Product Families
    query = "SELECT DISTINCT Family FROM MasterData.DimProduct WHERE Family IS NOT NULL ORDER BY Family"
    results = db.execute(text(query)).fetchall()
    filters['product_families'] = [r.Family for r in results]
    
    # Customer Industries
    query = "SELECT DISTINCT Industry FROM MasterData.DimCustomer WHERE Industry IS NOT NULL ORDER BY Industry"
    results = db.execute(text(query)).fetchall()
    filters['customer_industries'] = [r.Industry for r in results]
    
    # Customer Segments
    query = "SELECT DISTINCT Segment FROM MasterData.DimCustomer WHERE Segment IS NOT NULL ORDER BY Segment"
    results = db.execute(text(query)).fetchall()
    filters['customer_segments'] = [r.Segment for r in results]
    
    return filters
