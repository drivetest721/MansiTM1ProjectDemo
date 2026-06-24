#  Enterprise Performance Management Portal

A comprehensive enterprise-grade web application for performance management, built with React, TypeScript, FastAPI, and SQL Server.

## 🚀 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **UI Library**: TailwindCSS + ShadCN UI
- **Charts**: Recharts
- **Routing**: React Router v6
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI
- **Database**: Microsoft SQL Server
- **ORM**: SQLAlchemy
- **Server**: Uvicorn
- **API Documentation**: Swagger/OpenAPI (auto-generated)

### Database
- **Instance**: REAL_L001
- **Database**: TM1EnterpriseDB

## 📁 Project Structure

```
SSMStoPython/
├── backend/
│   ├── api/
│   │   ├── __init__.py
│   │   ├── dashboard.py
│   │   ├── revenue_cube.py
│   │   ├── workforce.py
│   │   ├── budget_forecast.py
│   │   ├── financial.py
│   │   ├── dimensions.py
│   │   └── admin.py
│   ├── models/
│   │   └── __init__.py
│   ├── schemas/
│   │   └── __init__.py
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── KPICard.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── RevenueCube.tsx
│   │   │   ├── Workforce.tsx
│   │   │   ├── BudgetForecast.tsx
│   │   │   ├── Financial.tsx
│   │   │   ├── Dimensions.tsx
│   │   │   ├── TM1Architecture.tsx
│   │   │   └── Admin.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── lib/
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
└── connection.py
```

## 🛠️ Setup Instructions

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **SQL Server** with ODBC Driver 17
- **Database**: TM1EnterpriseDB on REAL_L001 instance

### Backend Setup

1. Navigate to the backend directory:
```powershell
cd c:\Mansi\SSMStoPython\backend
```

2. Create a virtual environment (optional but recommended):
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

3. Install dependencies:
```powershell
pip install -r requirements.txt
```

4. Configure environment variables in `.env`:
```env
DB_SERVER=REAL_L001
DB_NAME=TM1EnterpriseDB
DB_DRIVER={ODBC Driver 17 for SQL Server}
API_HOST=0.0.0.0
API_PORT=8000
API_RELOAD=True
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

5. Start the backend server:
```powershell
uvicorn main:app --reload
```

The API will be available at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```powershell
cd c:\Mansi\SSMStoPython\frontend
```

2. Install dependencies:
```powershell
npm install
```

3. Start the development server:
```powershell
npm run dev
```

The application will be available at: `http://localhost:5173`

## 📊 Features

### Dashboard Home
- 9 KPI cards showing key metrics
- Revenue trends by year, region, category, and segment
- Payroll analysis by department
- Budget vs Forecast comparison
- P&L trend visualization

### Module 1: Revenue Cube Explorer
- Multi-dimensional analysis of revenue, cost, margin, and quantity
- Filters: Year, Quarter, Month, Region, Entity, Product Category, Product Family, Customer Industry, Customer Segment
- Interactive pivot grid and charts
- Export capabilities

### Module 2: Workforce Planning Cube
- Payroll and compensation analysis
- Dimensions: Time, Department, Cost Center, Entity, Employee
- Measures: Base Salary, Bonus, Benefits, Total Compensation

### Module 3: Budget vs Forecast Cube
- Scenario planning and version comparison
- Variance analysis (Budget vs Forecast)
- Multi-dimensional filtering

### Module 4: Financial Consolidation Cube
- General Ledger analysis
- P&L Report generation
- Balance Sheet Report
- Entity consolidation
- Department profitability analysis

###  Architecture Section
- Educational content about  concepts
- Dimension, Element, Hierarchy explanations
- Turbo Integrator, Rules, and Feeders documentation

### Dimension Explorer
- Browse hierarchies for Product, Customer, Entity, and Time dimensions
- Tree view navigation

### Admin Section
- Database statistics and table information
- Cube metadata
- Row counts and storage metrics

## 🗄️ Database Schema

### Master Data Tables
- `MasterData.DimCustomer` - Customer dimension
- `MasterData.DimProduct` - Product dimension
- `MasterData.DimEmployee` - Employee dimension
- `MasterData.DimDate` - Time dimension
- `MasterData.DimAccount` - Account dimension
- `MasterData.DimEntity` - Entity dimension
- `MasterData.DimCostCenter` - Cost Center dimension
- `MasterData.DimDepartment` - Department dimension

### Fact Tables
- `Sales.FactSales` - Sales transactions
- `HR.FactPayroll` - Payroll data
- `Planning.FactBudget` - Budget data
- `Planning.FactForecast` - Forecast data
- `Finance.FactGL` - General Ledger

### Views
- `Sales.vw_RevenueCube_Source` - Pre-aggregated revenue cube view

## 🎨 UI Features

- **Dark/Light Mode**: Toggle between themes
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Clean, professional enterprise interface
- **Interactive Charts**: Bar charts, line charts, and data visualizations
- **Navigation**: Sidebar navigation with route highlighting

## 🔧 Development

### Running in Development Mode

**Backend:**
```powershell
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```powershell
cd frontend
npm run dev
```

### Building for Production

**Backend:**
```powershell
# Backend is ready to deploy as-is
# Use a production ASGI server like gunicorn with uvicorn workers
```

**Frontend:**
```powershell
cd frontend
npm run build
# Output will be in the 'dist' directory
```

## 🌐 API Endpoints

### Dashboard
- `GET /api/dashboard/dashboard` - Get dashboard data with KPIs and charts

### Revenue Cube
- `GET /api/revenue/revenue-cube` - Get revenue cube data
- `GET /api/revenue/revenue-cube/filters` - Get available filters

### Workforce
- `GET /api/workforce/workforce-cube` - Get workforce planning data
- `GET /api/workforce/workforce-cube/filters` - Get available filters

### Budget vs Forecast
- `GET /api/budget-forecast/budget-forecast` - Get budget vs forecast data
- `GET /api/budget-forecast/budget-forecast/filters` - Get available filters

### Financial Consolidation
- `GET /api/financial/financial-consolidation` - Get GL data
- `GET /api/financial/financial-consolidation/pl-report` - Get P&L report
- `GET /api/financial/financial-consolidation/balance-sheet` - Get balance sheet
- `GET /api/financial/financial-consolidation/filters` - Get available filters

### Dimensions
- `GET /api/dimensions/dimensions/product` - Get product hierarchy
- `GET /api/dimensions/dimensions/customer` - Get customer hierarchy
- `GET /api/dimensions/dimensions/entity` - Get entity hierarchy
- `GET /api/dimensions/dimensions/time` - Get time hierarchy

### Admin
- `GET /api/admin/admin/stats` - Get database statistics
- `GET /api/admin/admin/cube-metadata` - Get cube metadata

## 📝 License

This project is proprietary and confidential.

## 👥 Support

For support and questions, please contact the development team.
