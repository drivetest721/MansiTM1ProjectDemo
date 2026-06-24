# TM1 Enterprise Performance Management API

Enterprise-grade FastAPI backend for financial planning, reporting, and analytics platform.

## Overview

This backend connects the React frontend to SQL Server database (TM1EnterpriseDB) and provides RESTful APIs for:
- Executive Dashboard
- Revenue Planning
- Workforce Planning  
- Budget & Forecast Management
- Financial Statements (P&L, Balance Sheet)
- Financial Consolidation
- Metadata Management

## Architecture

```
backend/
├── main.py                 # FastAPI application entry point
├── config.py               # Configuration and settings
├── database.py             # SQLAlchemy database connection
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (not in git)
├── .env.example            # Example environment file
│
├── routes/                 # API endpoint definitions
│   ├── dashboard.py
│   ├── metadata.py
│   ├── revenue.py
│   ├── workforce.py
│   ├── budget_forecast.py
│   ├── finance.py
│   └── health.py
│
├── services/               # Business logic layer
│   ├── dashboard_service.py
│   ├── metadata_service.py
│   ├── revenue_service.py
│   ├── workforce_service.py
│   ├── budget_forecast_service.py
│   └── finance_service.py
│
├── models/                 # Pydantic response models
│   └── response_models.py
│
└── logs/                   # Application logs
    └── application.log
```

## Database Connection

**SQL Server:** REAL_L001  
**Database:** TM1EnterpriseDB  
**Authentication:** Windows Authentication  
**Driver:** ODBC Driver 17 for SQL Server

### Required Database Views

- `Sales.vw_RevenueCube_Source`
- `HR.vw_WorkforceCube_Source`
- `Planning.vw_BudgetCube_Source`
- `Planning.vw_ForecastCube_Source`
- `Planning.vw_BudgetForecastVariance`
- `Finance.vw_PL_Statement`
- `Finance.vw_BalanceSheet`
- `Finance.vw_EntityConsolidation`

## Installation

### Prerequisites

- Python 3.9+
- ODBC Driver 17 for SQL Server
- Access to REAL_L001\\TM1EnterpriseDB

### Setup Steps

1. **Clone or navigate to backend directory:**
```bash
cd c:\\Mansi\\SSMStoPython\\backend
```

2. **Create virtual environment (if not exists):**
```bash
python -m venv venv
```

3. **Activate virtual environment:**
```bash
# Windows
.\\venv\\Scripts\\activate
```

4. **Install dependencies:**
```bash
pip install -r requirements.txt
```

5. **Configure environment:**
```bash
# Copy .env.example to .env and update values
copy .env.example .env
```

6. **Verify database connection:**
```bash
python -c "from database import engine; print(engine.connect())"
```

## Running the Application

### Development Mode

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Or simply:
```bash
python main.py
```

The API will be available at:
- **API Base:** http://localhost:8000
- **Swagger Docs:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/health

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Health Check

- `GET /health` - Basic health check
- `GET /health/database` - Database connectivity check
- `GET /health/views` - Validate all critical views

### Dashboard

- `GET /api/dashboard` - Complete dashboard with KPIs and charts
- `GET /api/dashboard/kpis` - Dashboard KPIs only
- `GET /api/dashboard/revenue-by-year` - Revenue by year chart
- `GET /api/dashboard/revenue-by-region` - Revenue by region chart
- `GET /api/dashboard/revenue-by-category` - Revenue by category chart
- `GET /api/dashboard/revenue-by-segment` - Revenue by segment chart

### Metadata (for filters)

- `GET /api/metadata/entities` - All entities
- `GET /api/metadata/departments` - All departments
- `GET /api/metadata/products` - All products
- `GET /api/metadata/customers` - All customers
- `GET /api/metadata/versions` - All versions
- `GET /api/metadata/scenarios` - All scenarios
- `GET /api/metadata/years` - All years
- `GET /api/metadata/accounts` - All accounts
- `GET /api/metadata/cost-centers` - All cost centers

### Revenue

- `GET /api/revenue` - Paginated revenue data (supports filters)
- `GET /api/revenue/by-region` - Revenue aggregated by region
- `GET /api/revenue/by-product` - Revenue aggregated by product
- `GET /api/revenue/by-customer-segment` - Revenue by customer segment

### Workforce

- `GET /api/workforce` - Paginated workforce data (supports filters)
- `GET /api/workforce/by-department` - Workforce aggregated by department
- `GET /api/workforce/by-joblevel` - Workforce aggregated by job level

### Budget & Forecast

- `GET /api/budget` - Paginated budget data (supports filters)
- `GET /api/budget/by-account` - Budget aggregated by account
- `GET /api/budget/by-department` - Budget aggregated by department
- `GET /api/forecast` - Paginated forecast data (supports filters)
- `GET /api/variance` - Budget vs Forecast variance

### Financial Statements

- `GET /api/finance/pl` - P&L Statement
- `GET /api/finance/pl/summary` - P&L Summary (faster)
- `GET /api/finance/balancesheet` - Balance Sheet
- `GET /api/finance/consolidation` - Financial Consolidation
- `GET /api/finance/consolidation/summary` - Consolidation Summary by Region

## Query Parameters

### Pagination
- `page` (default: 1) - Page number
- `page_size` (default: 50, max: 1000) - Records per page

### Common Filters
- `year` - Filter by year
- `entity` - Filter by entity name
- `department` - Filter by department
- `version` - Filter by version
- `scenario` - Filter by scenario

### Revenue-specific Filters
- `quarter` - Filter by quarter (Q1, Q2, Q3, Q4)
- `month` - Filter by month
- `region` - Filter by region
- `customer_segment` - Filter by customer segment
- `product_category` - Filter by product category

### Workforce-specific Filters
- `cost_center` - Filter by cost center
- `job_level` - Filter by job level
- `employment_status` - Filter by employment status

## Response Format

### Success Response
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total_records": 1000,
    "total_pages": 20,
    "has_next": true,
    "has_previous": false
  }
}
```

### Error Response
```json
{
  "detail": "Error message here"
}
```

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `DB_SERVER` - SQL Server instance name
- `DB_NAME` - Database name
- `DB_DRIVER` - ODBC driver name
- `API_HOST` - API host (0.0.0.0 for all interfaces)
- `API_PORT` - API port (default: 8000)
- `CORS_ORIGINS` - Allowed CORS origins (comma-separated)

## Logging

Logs are written to:
- **File:** `logs/application.log` (rotating, max 10MB per file, 5 backups)
- **Console:** Standard output

Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL

## Performance Considerations

- All endpoints use pagination by default
- Aggregation queries are performed in SQL, not Python
- Connection pooling enabled via SQLAlchemy
- Parameterized queries prevent SQL injection

## Security

- CORS configured for specific origins only
- SQL injection prevention via parameterized queries
- Prepared for future JWT authentication
- Windows Authentication for database access

## Troubleshooting

### Database Connection Issues

1. Verify SQL Server is running:
```bash
sqlcmd -S REAL_L001 -E -Q "SELECT @@VERSION"
```

2. Check ODBC Driver:
```bash
python -c "import pyodbc; print(pyodbc.drivers())"
```

3. Test database access:
```bash
python -c "from database import engine; conn = engine.connect(); print('Success')"
```

### API Not Starting

1. Check port 8000 is not in use:
```bash
netstat -ano | findstr :8000
```

2. Verify all dependencies installed:
```bash
pip list
```

3. Check logs:
```bash
type logs\\application.log
```

## Development

### Adding New Endpoints

1. Create service method in `services/[feature]_service.py`
2. Add route in `routes/[feature].py`
3. Include router in `main.py`
4. Update this README

### Testing with Swagger

Navigate to http://localhost:8000/docs and test endpoints interactively.

## Deployment

For production deployment:
1. Set `API_RELOAD=False` in `.env`
2. Use production-grade WSGI server (uvicorn with workers)
3. Configure reverse proxy (nginx/IIS)
4. Set up SSL/TLS certificates
5. Configure monitoring and alerting
6. Set up log aggregation

## Support

For issues or questions:
- Check Swagger documentation at `/docs`
- Review application logs in `logs/application.log`
- Verify database views exist and contain data
- Test health endpoints: `/health`, `/health/database`, `/health/views`

## Version

**Version:** 1.0.0  
**Last Updated:** 2026-06-23
