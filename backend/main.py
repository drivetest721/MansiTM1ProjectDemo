"""
TM1 Enterprise Performance Management API
FastAPI application for enterprise financial planning and reporting
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
import logging
import logging.handlers
import os
from datetime import datetime

# Import all routers
from routes import dashboard, metadata, revenue, workforce, budget_forecast, finance, health

# Configure logging
log_dir = "logs"
os.makedirs(log_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.handlers.RotatingFileHandler(
            os.path.join(log_dir, 'application.log'),
            maxBytes=10485760,  # 10MB
            backupCount=5
        ),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="TM1 Enterprise Performance Management API",
    description="Enterprise-grade API for TM1 Performance Management Portal - Financial Planning, Reporting, and Analytics",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(health.router, prefix="/health", tags=["Health Check"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(metadata.router, prefix="/api/metadata", tags=["Metadata"])
app.include_router(revenue.router, prefix="/api/revenue", tags=["Revenue"])
app.include_router(workforce.router, prefix="/api/workforce", tags=["Workforce"])
app.include_router(budget_forecast.router, prefix="/api/budget-forecast", tags=["Budget & Forecast"])
app.include_router(finance.router, prefix="/api/finance", tags=["Financial Statements"])

@app.on_event("startup")
async def startup_event():
    """Log startup event"""
    logger.info("="*80)
    logger.info("TM1 Enterprise Performance Management API Starting")
    logger.info(f"Version: 1.0.0")
    logger.info(f"Time: {datetime.now().isoformat()}")
    logger.info(f"Database Server: {settings.DB_SERVER}")
    logger.info(f"Database: {settings.DB_NAME}")
    logger.info(f"API Host: {settings.API_HOST}:{settings.API_PORT}")
    logger.info("="*80)

@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown event"""
    logger.info("TM1 Enterprise Performance Management API Shutting Down")

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "TM1 Enterprise Performance Management API",
        "version": "1.0.0",
        "description": "Enterprise financial planning, reporting, and analytics platform",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "database": {
            "server": settings.DB_SERVER,
            "database": settings.DB_NAME
        }
    }

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting uvicorn server on {settings.API_HOST}:{settings.API_PORT}")
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD,
        log_level="info"
    )
