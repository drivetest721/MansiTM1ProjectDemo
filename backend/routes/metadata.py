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


# ========================================================================
# CUBE EXPLORER ENDPOINTS
# ========================================================================

@router.get("/cubes", summary="Get All Cubes")
async def get_cubes(db: Session = Depends(get_db)):
    """
    Get list of all available TM1 cubes
    
    Returns cube information including:
    - Cube ID and name
    - Description
    - Dimension count
    - Status and last update
    """
    try:
        service = MetadataService(db)
        data = service.get_cubes()
        return {"success": True, "data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Error in get_cubes: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching cubes: {str(e)}")


@router.get("/cubes/{cube_id}", summary="Get Cube Details")
async def get_cube_details(cube_id: str, db: Session = Depends(get_db)):
    """
    Get detailed information about a specific cube
    
    Args:
        cube_id: Cube identifier
    
    Returns detailed cube metadata including dimensions, measures, and cell count
    """
    try:
        service = MetadataService(db)
        data = service.get_cube_details(cube_id)
        return {"success": True, "data": data}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in get_cube_details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching cube details: {str(e)}")


@router.get("/cubes/{cube_id}/sample", summary="Get Cube Sample Data")
async def get_cube_sample_data(cube_id: str, limit: int = 10, db: Session = Depends(get_db)):
    """
    Get sample data from a cube
    
    Args:
        cube_id: Cube identifier
        limit: Maximum number of rows to return (default: 10)
    
    Returns sample data rows from the cube
    """
    try:
        service = MetadataService(db)
        data = service.get_cube_sample_data(cube_id, limit=limit)
        return {"success": True, "data": data, "count": len(data)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in get_cube_sample_data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching cube sample data: {str(e)}")


# ========================================================================
# DIMENSION EXPLORER ENDPOINTS
# ========================================================================

@router.get("/dimensions", summary="Get All Dimensions")
async def get_dimensions(db: Session = Depends(get_db)):
    """
    Get list of all dimensions
    
    Returns dimension information including:
    - Dimension ID and name
    - Description
    - Element count
    - Hierarchy information
    """
    try:
        service = MetadataService(db)
        data = service.get_dimensions()
        return {"success": True, "data": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Error in get_dimensions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching dimensions: {str(e)}")


@router.get("/dimensions/{dimension_id}", summary="Get Dimension Details")
async def get_dimension_details(dimension_id: str, db: Session = Depends(get_db)):
    """
    Get detailed information about a specific dimension
    
    Args:
        dimension_id: Dimension identifier
    
    Returns detailed dimension metadata including hierarchy levels and attributes
    """
    try:
        service = MetadataService(db)
        data = service.get_dimension_details(dimension_id)
        return {"success": True, "data": data}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in get_dimension_details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching dimension details: {str(e)}")


@router.get("/dimensions/{dimension_id}/hierarchy", summary="Get Dimension Hierarchy")
async def get_dimension_hierarchy(dimension_id: str, db: Session = Depends(get_db)):
    """
    Get hierarchy structure for a dimension
    
    Args:
        dimension_id: Dimension identifier
    
    Returns hierarchical tree structure of dimension elements
    """
    try:
        service = MetadataService(db)
        data = service.get_dimension_hierarchy(dimension_id)
        return {"success": True, "data": data}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in get_dimension_hierarchy: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching dimension hierarchy: {str(e)}")


@router.get("/dimensions/{dimension_id}/elements", summary="Get Dimension Elements")
async def get_dimension_elements(dimension_id: str, limit: int = 50, db: Session = Depends(get_db)):
    """
    Get list of elements in a dimension
    
    Args:
        dimension_id: Dimension identifier
        limit: Maximum number of elements to return (default: 50)
    
    Returns list of dimension elements with their attributes
    """
    try:
        service = MetadataService(db)
        data = service.get_dimension_elements(dimension_id, limit=limit)
        return {"success": True, "data": data, "count": len(data)}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error in get_dimension_elements: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching dimension elements: {str(e)}")
