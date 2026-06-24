"""
Metadata Routes
Handles metadata API endpoints for filter dropdowns
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.metadata_service import MetadataService
from models.response_models import MetadataResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/entities", response_model=MetadataResponse, summary="Get All Entities")
async def get_entities(db: Session = Depends(get_db)):
    """
    Get all entities for filter dropdowns
    
    Returns entity information including:
    - Entity code and name
    - Entity type
    - Parent entity
    - Region and country
    """
    try:
        service = MetadataService(db)
        data = service.get_entities()
        return MetadataResponse(data=data, count=len(data))
    except Exception as e:
        logger.error(f"Error in get_entities: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching entities: {str(e)}")


@router.get("/departments", response_model=MetadataResponse, summary="Get All Departments")
async def get_departments(db: Session = Depends(get_db)):
    """
    Get all departments for filter dropdowns
    
    Returns department information including:
    - Department code and name
    - Parent department
    """
    try:
        service = MetadataService(db)
        data = service.get_departments()
        return MetadataResponse(data=data, count=len(data))
    except Exception as e:
        logger.error(f"Error in get_departments: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching departments: {str(e)}")


@router.get("/products", response_model=MetadataResponse, summary="Get All Products")
async def get_products(db: Session = Depends(get_db)):
    """
    Get all products for filter dropdowns
    
    Returns product information including:
    - Product code and name
    - Category, family, and brand
    """
    try:
        service = MetadataService(db)
        data = service.get_products()
        return MetadataResponse(data=data, count=len(data))
    except Exception as e:
        logger.error(f"Error in get_products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")


@router.get("/customers", response_model=MetadataResponse, summary="Get All Customers")
async def get_customers(db: Session = Depends(get_db)):
    """
    Get all customers for filter dropdowns
    
    Returns customer information including:
    - Customer code and name
    - Segment and region
    """
    try:
        service = MetadataService(db)
        data = service.get_customers()
        return MetadataResponse(data=data, count=len(data))
    except Exception as e:
        logger.error(f"Error in get_customers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching customers: {str(e)}")


@router.get("/versions", response_model=MetadataResponse, summary="Get All Versions")
async def get_versions(db: Session = Depends(get_db)):
    """
    Get all versions for filter dropdowns
    
    Returns version information including:
    - Version code and name
    - Is active flag
    """
    try:
        service = MetadataService(db)
        data = service.get_versions()
        return MetadataResponse(data=data, count=len(data))
    except Exception as e:
        logger.error(f"Error in get_versions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching versions: {str(e)}")


@router.get("/scenarios", response_model=MetadataResponse, summary="Get All Scenarios")
async def get_scenarios(db: Session = Depends(get_db)):
    """
    Get all scenarios for filter dropdowns
    
    Returns scenario information including:
    - Scenario code and name
    - Scenario type
    """
    try:
        service = MetadataService(db)
        data = service.get_scenarios()
        return MetadataResponse(data=data, count=len(data))
    except Exception as e:
        logger.error(f"Error in get_scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching scenarios: {str(e)}")


@router.get("/years", response_model=MetadataResponse, summary="Get All Years")
async def get_years(db: Session = Depends(get_db)):
    """
    Get all available years for filter dropdowns
    
    Returns year information including:
    - Year
    - Fiscal year
    """
    try:
        service = MetadataService(db)
        data = service.get_years()
        return MetadataResponse(data=data, count=len(data))
    except Exception as e:
        logger.error(f"Error in get_years: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching years: {str(e)}")


@router.get("/accounts", response_model=MetadataResponse, summary="Get All Accounts")
async def get_accounts(db: Session = Depends(get_db)):
    """
    Get all accounts for filter dropdowns
    
    Returns account information including:
    - Account code and name
    - Account type
    - Parent account
    """
    try:
        service = MetadataService(db)
        data = service.get_accounts()
        return MetadataResponse(data=data, count=len(data))
    except Exception as e:
        logger.error(f"Error in get_accounts: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching accounts: {str(e)}")


@router.get("/cost-centers", response_model=MetadataResponse, summary="Get All Cost Centers")
async def get_cost_centers(db: Session = Depends(get_db)):
    """
    Get all cost centers for filter dropdowns
    
    Returns cost center information including:
    - Cost center code and name
    - Department key
    """
    try:
        service = MetadataService(db)
        data = service.get_cost_centers()
        return MetadataResponse(data=data, count=len(data))
    except Exception as e:
        logger.error(f"Error in get_cost_centers: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching cost centers: {str(e)}")
