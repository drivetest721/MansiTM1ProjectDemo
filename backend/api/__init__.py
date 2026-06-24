from fastapi import APIRouter
from api import dashboard, revenue_cube, workforce, budget_forecast, financial, dimensions, admin

router = APIRouter()

# Include all module routers
router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
router.include_router(revenue_cube.router, prefix="/revenue", tags=["Revenue Cube"])
router.include_router(workforce.router, prefix="/workforce", tags=["Workforce Planning"])
router.include_router(budget_forecast.router, prefix="/budget-forecast", tags=["Budget vs Forecast"])
router.include_router(financial.router, prefix="/financial", tags=["Financial Consolidation"])
router.include_router(dimensions.router, prefix="/dimensions", tags=["Dimensions"])
router.include_router(admin.router, prefix="/admin", tags=["Admin"])
