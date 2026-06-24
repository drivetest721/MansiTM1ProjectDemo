You are building the backend integration layer for an Enterprise Performance Management (EPM) platform inspired by IBM Planning Analytics (TM1), Anaplan, and Envisage.

IMPORTANT:
The SQL Server database is already fully built and populated.
Do NOT create database tables.
Do NOT generate mock data.
Do NOT create seed scripts.
Do NOT modify the database schema.

Your job is ONLY to create a production-ready FastAPI backend that connects the existing React frontend to SQL Server.

====================================================================
DATABASE INFORMATION
====================================================================

SQL Server Instance:
REAL_L001

Database:
TM1EnterpriseDB

Connection Method:
Windows Authentication

Driver:
ODBC Driver 17 for SQL Server

====================================================================
TECH STACK
====================================================================

Backend:
- FastAPI
- SQLAlchemy
- pyodbc
- pandas
- pydantic

Frontend:
- Existing React + TypeScript + Vite application
- Existing pages already created
- Existing UI already designed

Goal:
Replace all mock JSON data with live SQL Server data.

====================================================================
PROJECT STRUCTURE TO CREATE
====================================================================

backend/

├── app.py
├── database.py
├── requirements.txt
│
├── routes/
│   ├── dashboard.py
│   ├── revenue.py
│   ├── workforce.py
│   ├── budget.py
│   ├── forecast.py
│   ├── finance.py
│   ├── consolidation.py
│   └── metadata.py
│
├── services/
│   ├── dashboard_service.py
│   ├── revenue_service.py
│   ├── workforce_service.py
│   ├── budget_service.py
│   ├── forecast_service.py
│   ├── finance_service.py
│   └── metadata_service.py
│
└── models/
    └── response_models.py

====================================================================
DATABASE OBJECTS ALREADY AVAILABLE
====================================================================

MASTER DATA

MasterData.DimCustomer
MasterData.DimProduct
MasterData.DimEmployee
MasterData.DimDepartment
MasterData.DimCostCenter
MasterData.DimEntity
MasterData.DimAccount
MasterData.DimVersion
MasterData.DimScenario
MasterData.DimDate

FACT TABLES

Sales.FactSales
HR.FactPayroll
Planning.FactBudget
Planning.FactForecast
Finance.FactGL

TM1 STRUCTURES

TM1.ProductHierarchy
TM1.CustomerHierarchy
TM1.TimeHierarchy
TM1.EntityHierarchy
TM1.EmployeeHierarchy
TM1.DepartmentHierarchy
TM1.CostCenterHierarchy

SEMANTIC VIEWS

Sales.vw_RevenueCube_Source

HR.vw_WorkforceCube_Source

Planning.vw_BudgetCube_Source

Planning.vw_ForecastCube_Source

Planning.vw_BudgetForecastVariance

Finance.vw_PL_Statement

Finance.vw_BalanceSheet

Finance.vw_EntityConsolidation

====================================================================
REQUIRED API ENDPOINTS
====================================================================

Dashboard

GET /api/dashboard

Return:

{
  totalRevenue,
  totalCost,
  totalMargin,
  marginPercent,
  totalEmployees,
  totalCustomers,
  totalProducts,
  totalBudget,
  totalForecast
}

====================================================================

Revenue Planning

GET /api/revenue

Uses:

Sales.vw_RevenueCube_Source

Support filters:

year
quarter
month
entity
region
customerSegment
productCategory
version

====================================================================

Workforce Planning

GET /api/workforce

Uses:

HR.vw_WorkforceCube_Source

Support filters:

year
entity
department
costCenter
jobLevel
employmentStatus
version

====================================================================

Budget Planning

GET /api/budget

Uses:

Planning.vw_BudgetCube_Source

Support filters:

year
entity
department
account
scenario
version

====================================================================

Forecast Planning

GET /api/forecast

Uses:

Planning.vw_ForecastCube_Source

Support filters:

year
entity
department
account
scenario
version

====================================================================

Variance Analysis

GET /api/variance

Uses:

Planning.vw_BudgetForecastVariance

Return:

BudgetAmount
ForecastAmount
VarianceAmount
VariancePercent

====================================================================

Profit & Loss

GET /api/pl

Uses:

Finance.vw_PL_Statement

Support filters:

year
entity

====================================================================

Balance Sheet

GET /api/balancesheet

Uses:

Finance.vw_BalanceSheet

Support filters:

year
entity

====================================================================

Financial Consolidation

GET /api/consolidation

Uses:

Finance.vw_EntityConsolidation

Support filters:

year
entity

====================================================================

Metadata APIs
====================================================================

GET /api/metadata/entities

GET /api/metadata/departments

GET /api/metadata/products

GET /api/metadata/customers

GET /api/metadata/versions

GET /api/metadata/scenarios

GET /api/metadata/years

These endpoints will populate frontend dropdown filters.

====================================================================
BACKEND REQUIREMENTS
====================================================================

1. Use SQLAlchemy engine.

2. Use parameterized queries.

3. No hardcoded values.

4. Use pagination for large datasets.

5. Enable CORS.

6. Add health endpoint:

GET /health

Returns:

{
  status: "healthy",
  database: "connected"
}

7. Add error handling.

8. Add logging.

9. Add response models.

10. Use clean service layer architecture.

11. Make code production-ready.

====================================================================
FRONTEND INTEGRATION
====================================================================

Create:

src/services/api.ts

Axios configuration:

baseURL:
http://localhost:8000/api

Create service methods:

getDashboard()
getRevenue()
getWorkforce()
getBudget()
getForecast()
getVariance()
getPL()
getBalanceSheet()
getConsolidation()

getEntities()
getDepartments()
getProducts()
getCustomers()
getVersions()
getScenarios()
getYears()

====================================================================
IMPORTANT
====================================================================

Do not generate sample data.

Do not generate SQL DDL.

Do not generate SQL INSERT statements.

The SQL Server database already exists and contains millions of rows.

Focus only on:

- FastAPI backend
- API routes
- Service layer
- Database connection
- React integration layer
- Production-ready architecture

Generate complete source code for all files.

# Additional Enterprise Requirements

## 1. Do Not Return Entire Tables

The database contains millions of records.

Never return full datasets to the frontend.

Always implement:

* Pagination
* Filtering
* Sorting
* Search

Example:

GET /api/revenue?page=1&pageSize=50

GET /api/workforce?page=1&pageSize=50

---

## 2. Build Aggregated Endpoints

Create additional endpoints specifically for dashboards.

Examples:

GET /api/dashboard/kpis

GET /api/revenue/by-region

GET /api/revenue/by-product

GET /api/revenue/by-customer-segment

GET /api/workforce/by-department

GET /api/workforce/by-joblevel

GET /api/budget/by-account

GET /api/budget/by-department

GET /api/pl/summary

GET /api/consolidation/summary

These endpoints should return already aggregated SQL results.

Do not send 500,000 records to React and aggregate in JavaScript.

---

## 3. Create Executive Dashboard View

Create Finance.vw_ExecutiveDashboard.

Return:

* Total Revenue
* Total Cost
* Total Margin
* Margin %
* Employee Count
* Customer Count
* Product Count
* Budget Total
* Forecast Total

Use this for Executive Overview.

---

## 4. Dynamic Filters

All filters must come from metadata APIs.

Never hardcode:

* Years
* Entities
* Departments
* Versions
* Scenarios
* Products
* Customers

Populate all dropdowns from API calls.

---

## 5. API Documentation

Enable:

/docs

and

/redoc

using FastAPI Swagger.

Every endpoint must include:

* Request parameters
* Response schema
* Example response

---

## 6. Environment Variables

Use .env

Never hardcode:

* SQL Server name
* Database name
* API URLs

Example:

SQL_SERVER=REAL_L001
DATABASE=TM1EnterpriseDB

---

## 7. Loading Performance

Target:

* Dashboard APIs under 2 seconds
* Aggregation APIs under 5 seconds

Use SQL aggregation instead of Python loops whenever possible.

---

## 8. Error Handling

Return structured errors:

{
"success": false,
"message": "Unable to retrieve revenue data",
"details": "..."
}

---

## 9. Logging

Create logs:

logs/application.log

Log:

* API requests
* SQL errors
* Connection failures

---

## 10. Health Monitoring

Endpoints:

GET /health

GET /health/database

GET /health/views

Verify:

* SQL Server connection
* Revenue View
* Workforce View
* Budget View
* Forecast View

---

## 11. Security

Prepare for future authentication.

Create middleware structure for:

* JWT
* Role-based access

Roles:

Admin
Finance
Manager
Viewer

Do not fully implement authentication yet.

Just prepare architecture.

---

## 12. Frontend Requirements

The frontend must NEVER contain mock JSON.

Every page must fetch data from APIs.

All KPIs, charts, tables, and filters must come from SQL Server through FastAPI.

---

## 13. Production Readiness

Generate:

* README.md
* requirements.txt
* .env.example
* startup instructions
* folder structure documentation

The project should run after:

pip install -r requirements.txt

uvicorn app:app --reload

npm install

npm run dev

with no additional manual coding required.


ANSWERS
Implementation Scope

Build all backend endpoints at once.

The database layer is already complete and validated.

Available views:

* Sales.vw_RevenueCube_Source
* HR.vw_WorkforceCube_Source
* Planning.vw_BudgetCube_Source
* Planning.vw_ForecastCube_Source
* Planning.vw_BudgetForecastVariance
* Finance.vw_PL_Statement
* Finance.vw_BalanceSheet
* Finance.vw_EntityConsolidation

Create all APIs first and ensure they are working through Swagger (/docs).

After backend validation, connect the frontend pages.

Do not build one feature at a time.

The goal is to have the complete API layer available before frontend integration.

---

Database Connection Testing

Yes, include a database connection test first.

Requirements:

1. Create /health endpoint
2. Create /health/database endpoint
3. Verify SQL Server connectivity
4. Verify access to TM1EnterpriseDB
5. Verify all critical views exist

Required view validation:

* Sales.vw_RevenueCube_Source
* HR.vw_WorkforceCube_Source
* Planning.vw_BudgetCube_Source
* Planning.vw_ForecastCube_Source
* Finance.vw_PL_Statement
* Finance.vw_BalanceSheet
* Finance.vw_EntityConsolidation

Use Windows Authentication.

SQL Server Instance:

REAL_L001

Database:

TM1EnterpriseDB

---

Existing Backend Files

Do NOT replace existing files blindly.

First inspect:

* main.py
* database.py
* config.py

Then refactor and extend them into the new architecture.

Reuse existing connection logic where possible.

Only replace code if it conflicts with the new architecture.

Keep the project clean and production-ready.

---

Frontend Integration Timing

Backend first.

Order:

Step 1:
Build database connection

Step 2:
Build all API endpoints

Step 3:
Validate APIs using Swagger

Step 4:
Validate API responses

Step 5:
Connect frontend to APIs

Step 6:
Remove all mock JSON

Step 7:
Test filters, pagination, charts, tables

Do not connect frontend before backend APIs are verified.

---

Priority Order

Priority 1
Executive Dashboard

Endpoints:

* /api/dashboard
* /api/metadata/*

Priority 2
Revenue Planning

Endpoints:

* /api/revenue
* /api/revenue/by-region
* /api/revenue/by-product

Priority 3
Workforce Planning

Endpoints:

* /api/workforce
* /api/workforce/by-department
* /api/workforce/by-joblevel

Priority 4
Budget & Forecast

Endpoints:

* /api/budget
* /api/forecast
* /api/variance

Priority 5
Financial Statements

Endpoints:

* /api/pl
* /api/balancesheet
* /api/consolidation

---

Expected Deliverable

The final result should be:

SQL Server (TM1EnterpriseDB)
↓
FastAPI Backend
↓
Swagger Documentation
↓
React Frontend
↓
Live Data From SQL Server

No mock data.

No placeholder APIs.

No hardcoded datasets.

All pages should fetch live data from TM1EnterpriseDB.
Implementation Scope

Build all backend endpoints at once.

The database layer is already complete and validated.

Available views:

* Sales.vw_RevenueCube_Source
* HR.vw_WorkforceCube_Source
* Planning.vw_BudgetCube_Source
* Planning.vw_ForecastCube_Source
* Planning.vw_BudgetForecastVariance
* Finance.vw_PL_Statement
* Finance.vw_BalanceSheet
* Finance.vw_EntityConsolidation

Create all APIs first and ensure they are working through Swagger (/docs).

After backend validation, connect the frontend pages.

Do not build one feature at a time.

The goal is to have the complete API layer available before frontend integration.

---

Database Connection Testing

Yes, include a database connection test first.

Requirements:

1. Create /health endpoint
2. Create /health/database endpoint
3. Verify SQL Server connectivity
4. Verify access to TM1EnterpriseDB
5. Verify all critical views exist

Required view validation:

* Sales.vw_RevenueCube_Source
* HR.vw_WorkforceCube_Source
* Planning.vw_BudgetCube_Source
* Planning.vw_ForecastCube_Source
* Finance.vw_PL_Statement
* Finance.vw_BalanceSheet
* Finance.vw_EntityConsolidation

Use Windows Authentication.

SQL Server Instance:

REAL_L001

Database:

TM1EnterpriseDB

---

Existing Backend Files

Do NOT replace existing files blindly.

First inspect:

* main.py
* database.py
* config.py

Then refactor and extend them into the new architecture.

Reuse existing connection logic where possible.

Only replace code if it conflicts with the new architecture.

Keep the project clean and production-ready.

---

Frontend Integration Timing

Backend first.

Order:

Step 1:
Build database connection

Step 2:
Build all API endpoints

Step 3:
Validate APIs using Swagger

Step 4:
Validate API responses

Step 5:
Connect frontend to APIs

Step 6:
Remove all mock JSON

Step 7:
Test filters, pagination, charts, tables

Do not connect frontend before backend APIs are verified.

---

Priority Order

Priority 1
Executive Dashboard

Endpoints:

* /api/dashboard
* /api/metadata/*

Priority 2
Revenue Planning

Endpoints:

* /api/revenue
* /api/revenue/by-region
* /api/revenue/by-product

Priority 3
Workforce Planning

Endpoints:

* /api/workforce
* /api/workforce/by-department
* /api/workforce/by-joblevel

Priority 4
Budget & Forecast

Endpoints:

* /api/budget
* /api/forecast
* /api/variance

Priority 5
Financial Statements

Endpoints:

* /api/pl
* /api/balancesheet
* /api/consolidation

---

Expected Deliverable

The final result should be:

SQL Server (TM1EnterpriseDB)
↓
FastAPI Backend
↓
Swagger Documentation
↓
React Frontend
↓
Live Data From SQL Server

No mock data.

No placeholder APIs.

No hardcoded datasets.

All pages should fetch live data from TM1EnterpriseDB.
Create aggregation views/endpoints and don't expose raw 500k-row datasets to React. For example:

/api/dashboard/kpis
/api/revenue/by-region
/api/revenue/by-product
/api/workforce/summary
/api/pl/summary