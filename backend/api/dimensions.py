from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from schemas import *
from typing import List

router = APIRouter()

@router.get("/product", response_model=DimensionHierarchyResponse)
async def get_product_hierarchy(db: Session = Depends(get_db)):
    """Get Product dimension hierarchy"""
    
    query = """
    SELECT 
        ProductCode as Code,
        ProductName as Name,
        Category,
        Family,
        Brand
    FROM MasterData.DimProduct
    ORDER BY Category, Family, Brand, ProductName
    """
    
    results = db.execute(text(query)).fetchall()
    
    # Build hierarchy: Category -> Family -> Brand -> Product
    categories = {}
    
    for r in results:
        cat_code = r.Category or "Uncategorized"
        fam_code = r.Family or "Uncategorized"
        brand_code = r.Brand or "No Brand"
        
        if cat_code not in categories:
            categories[cat_code] = {
                "code": cat_code,
                "name": cat_code,
                "level": 1,
                "children": {}
            }
        
        if fam_code not in categories[cat_code]["children"]:
            categories[cat_code]["children"][fam_code] = {
                "code": fam_code,
                "name": fam_code,
                "level": 2,
                "parent": cat_code,
                "children": {}
            }
        
        if brand_code not in categories[cat_code]["children"][fam_code]["children"]:
            categories[cat_code]["children"][fam_code]["children"][brand_code] = {
                "code": brand_code,
                "name": brand_code,
                "level": 3,
                "parent": fam_code,
                "children": []
            }
        
        categories[cat_code]["children"][fam_code]["children"][brand_code]["children"].append({
            "code": r.Code,
            "name": r.Name,
            "level": 4,
            "parent": brand_code,
            "children": []
        })
    
    # Convert to list format
    hierarchy = []
    for cat in categories.values():
        cat_node = DimensionHierarchyNode(
            code=cat["code"],
            name=cat["name"],
            level=cat["level"],
            children=[]
        )
        
        for fam in cat["children"].values():
            fam_node = DimensionHierarchyNode(
                code=fam["code"],
                name=fam["name"],
                level=fam["level"],
                parent=fam["parent"],
                children=[]
            )
            
            for brand in fam["children"].values():
                brand_node = DimensionHierarchyNode(
                    code=brand["code"],
                    name=brand["name"],
                    level=brand["level"],
                    parent=brand["parent"],
                    children=[
                        DimensionHierarchyNode(**prod)
                        for prod in brand["children"]
                    ]
                )
                fam_node.children.append(brand_node)
            
            cat_node.children.append(fam_node)
        
        hierarchy.append(cat_node)
    
    return DimensionHierarchyResponse(dimension="Product", hierarchy=hierarchy)


@router.get("/customer", response_model=DimensionHierarchyResponse)
async def get_customer_hierarchy(db: Session = Depends(get_db)):
    """Get Customer dimension hierarchy"""
    
    query = """
    SELECT 
        CustomerCode as Code,
        CustomerName as Name,
        Region,
        Country,
        Industry,
        Segment
    FROM MasterData.DimCustomer
    ORDER BY Region, Country, Industry, Segment, CustomerName
    """
    
    results = db.execute(text(query)).fetchall()
    
    # Build hierarchy: Region -> Country -> Industry -> Segment -> Customer
    regions = {}
    
    for r in results:
        reg_code = r.Region or "Unknown"
        country_code = r.Country or "Unknown"
        ind_code = r.Industry or "Unknown"
        seg_code = r.Segment or "Unknown"
        
        if reg_code not in regions:
            regions[reg_code] = {
                "code": reg_code,
                "name": reg_code,
                "level": 1,
                "children": {}
            }
        
        if country_code not in regions[reg_code]["children"]:
            regions[reg_code]["children"][country_code] = {
                "code": country_code,
                "name": country_code,
                "level": 2,
                "parent": reg_code,
                "children": {}
            }
        
        if ind_code not in regions[reg_code]["children"][country_code]["children"]:
            regions[reg_code]["children"][country_code]["children"][ind_code] = {
                "code": ind_code,
                "name": ind_code,
                "level": 3,
                "parent": country_code,
                "children": {}
            }
        
        if seg_code not in regions[reg_code]["children"][country_code]["children"][ind_code]["children"]:
            regions[reg_code]["children"][country_code]["children"][ind_code]["children"][seg_code] = {
                "code": seg_code,
                "name": seg_code,
                "level": 4,
                "parent": ind_code,
                "children": []
            }
        
        regions[reg_code]["children"][country_code]["children"][ind_code]["children"][seg_code]["children"].append({
            "code": r.Code,
            "name": r.Name,
            "level": 5,
            "parent": seg_code,
            "children": []
        })
    
    # Convert to list format (similar to product hierarchy)
    hierarchy = []
    for reg in regions.values():
        reg_node = DimensionHierarchyNode(code=reg["code"], name=reg["name"], level=reg["level"], children=[])
        
        for country in reg["children"].values():
            country_node = DimensionHierarchyNode(
                code=country["code"], name=country["name"], level=country["level"], 
                parent=country["parent"], children=[]
            )
            
            for ind in country["children"].values():
                ind_node = DimensionHierarchyNode(
                    code=ind["code"], name=ind["name"], level=ind["level"],
                    parent=ind["parent"], children=[]
                )
                
                for seg in ind["children"].values():
                    seg_node = DimensionHierarchyNode(
                        code=seg["code"], name=seg["name"], level=seg["level"],
                        parent=seg["parent"], 
                        children=[DimensionHierarchyNode(**cust) for cust in seg["children"]]
                    )
                    ind_node.children.append(seg_node)
                
                country_node.children.append(ind_node)
            
            reg_node.children.append(country_node)
        
        hierarchy.append(reg_node)
    
    return DimensionHierarchyResponse(dimension="Customer", hierarchy=hierarchy)


@router.get("/entity", response_model=DimensionHierarchyResponse)
async def get_entity_hierarchy(db: Session = Depends(get_db)):
    """Get Entity dimension hierarchy"""
    
    query = """
    SELECT 
        EntityCode as Code,
        EntityName as Name,
        EntityType,
        ParentEntity,
        Region
    FROM MasterData.DimEntity
    ORDER BY Region, EntityType, EntityName
    """
    
    results = db.execute(text(query)).fetchall()
    
    # Build simple hierarchy: Region -> EntityType -> Entity
    regions = {}
    
    for r in results:
        reg_code = r.Region or "Unknown"
        type_code = r.EntityType or "Unknown"
        
        if reg_code not in regions:
            regions[reg_code] = {"code": reg_code, "name": reg_code, "level": 1, "children": {}}
        
        if type_code not in regions[reg_code]["children"]:
            regions[reg_code]["children"][type_code] = {
                "code": type_code, "name": type_code, "level": 2, "parent": reg_code, "children": []
            }
        
        regions[reg_code]["children"][type_code]["children"].append({
            "code": r.Code, "name": r.Name, "level": 3, "parent": type_code, "children": []
        })
    
    hierarchy = []
    for reg in regions.values():
        reg_node = DimensionHierarchyNode(code=reg["code"], name=reg["name"], level=reg["level"], children=[])
        
        for ent_type in reg["children"].values():
            type_node = DimensionHierarchyNode(
                code=ent_type["code"], name=ent_type["name"], level=ent_type["level"],
                parent=ent_type["parent"],
                children=[DimensionHierarchyNode(**ent) for ent in ent_type["children"]]
            )
            reg_node.children.append(type_node)
        
        hierarchy.append(reg_node)
    
    return DimensionHierarchyResponse(dimension="Entity", hierarchy=hierarchy)


@router.get("/time", response_model=DimensionHierarchyResponse)
async def get_time_hierarchy(db: Session = Depends(get_db)):
    """Get Time dimension hierarchy"""
    
    query = """
    SELECT DISTINCT
        Year,
        Quarter,
        Month,
        MonthName
    FROM MasterData.DimDate
    ORDER BY Year, Month
    """
    
    results = db.execute(text(query)).fetchall()
    
    # Build hierarchy: Year -> Quarter -> Month
    years = {}
    
    for r in results:
        year_code = str(r.Year)
        quarter_code = r.Quarter
        month_code = f"{r.Year}-{r.Month:02d}"
        month_name = r.MonthName
        
        if year_code not in years:
            years[year_code] = {"code": year_code, "name": year_code, "level": 1, "children": {}}
        
        if quarter_code not in years[year_code]["children"]:
            years[year_code]["children"][quarter_code] = {
                "code": quarter_code, "name": quarter_code, "level": 2, "parent": year_code, "children": []
            }
        
        years[year_code]["children"][quarter_code]["children"].append({
            "code": month_code, "name": month_name, "level": 3, "parent": quarter_code, "children": []
        })
    
    hierarchy = []
    for year in years.values():
        year_node = DimensionHierarchyNode(code=year["code"], name=year["name"], level=year["level"], children=[])
        
        for quarter in year["children"].values():
            quarter_node = DimensionHierarchyNode(
                code=quarter["code"], name=quarter["name"], level=quarter["level"],
                parent=quarter["parent"],
                children=[DimensionHierarchyNode(**month) for month in quarter["children"]]
            )
            year_node.children.append(quarter_node)
        
        hierarchy.append(year_node)
    
    return DimensionHierarchyResponse(dimension="Time", hierarchy=hierarchy)
