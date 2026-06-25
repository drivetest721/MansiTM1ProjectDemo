import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { DrillProvider } from './context/DrillContext';
import ExecutiveOverview from './pages/ExecutiveOverview';
import RevenuePlanning from './pages/RevenuePlanning';
import WorkforcePlanning from './pages/WorkforcePlanning';
import CFOBudgeting from './pages/CFOBudgeting';
import ForecastingAnalysis from './pages/ForecastingAnalysis';
import PLStatement from './pages/PLStatement';
import BalanceSheet from './pages/BalanceSheet';
import FinancialConsolidation from './pages/FinancialConsolidation';
import CubeExplorer from './pages/CubeExplorer';
import DimensionExplorer from './pages/DimensionExplorer';
import TM1Architecture from './pages/TM1Architecture';
import AdminDataHealth from './pages/AdminDataHealth';
import PivotTableView from './pages/PivotTableView';
import './index.css';

// Pre-define route elements outside JSX — workaround for Vite 8/rolldown
// nested-JSX-in-attribute parsing bug.
const el = {
  overview:        <ErrorBoundary label="Executive Overview"><ExecutiveOverview /></ErrorBoundary>,
  revenue:         <ErrorBoundary label="Revenue Planning"><RevenuePlanning /></ErrorBoundary>,
  revenuePivot:    <ErrorBoundary label="Pivot Table"><PivotTableView /></ErrorBoundary>,
  workforce:       <ErrorBoundary label="Workforce Planning"><WorkforcePlanning /></ErrorBoundary>,
  workforcePivot:  <ErrorBoundary label="Pivot Table"><PivotTableView /></ErrorBoundary>,
  budgeting:       <ErrorBoundary label="CFO Budgeting"><CFOBudgeting /></ErrorBoundary>,
  forecasting:     <ErrorBoundary label="Forecasting Analysis"><ForecastingAnalysis /></ErrorBoundary>,
  plStatement:     <ErrorBoundary label="P&L Statement"><PLStatement /></ErrorBoundary>,
  balanceSheet:    <ErrorBoundary label="Balance Sheet"><BalanceSheet /></ErrorBoundary>,
  consolidation:   <ErrorBoundary label="Financial Consolidation"><FinancialConsolidation /></ErrorBoundary>,
  cubeExplorer:    <ErrorBoundary label="Cube Explorer"><CubeExplorer /></ErrorBoundary>,
  dimExplorer:     <ErrorBoundary label="Dimension Explorer"><DimensionExplorer /></ErrorBoundary>,
  architecture:    <ErrorBoundary label="TM1 Architecture"><TM1Architecture /></ErrorBoundary>,
  adminHealth:     <ErrorBoundary label="Admin Data Health"><AdminDataHealth /></ErrorBoundary>,
};

function App() {
  return (
    <BrowserRouter>
      <DrillProvider>
        <Layout>
          <Routes>
            <Route path="/" element={el.overview} />
            <Route path="/revenue-planning" element={el.revenue} />
            <Route path="/revenue-planning/pivot" element={el.revenuePivot} />
            <Route path="/workforce-planning" element={el.workforce} />
            <Route path="/workforce-planning/pivot" element={el.workforcePivot} />
            <Route path="/cfo-budgeting" element={el.budgeting} />
            <Route path="/forecasting-analysis" element={el.forecasting} />
            <Route path="/pl-statement" element={el.plStatement} />
            <Route path="/balance-sheet" element={el.balanceSheet} />
            <Route path="/financial-consolidation" element={el.consolidation} />
            <Route path="/cube-explorer" element={el.cubeExplorer} />
            <Route path="/dimension-explorer" element={el.dimExplorer} />
            <Route path="/tm1-architecture" element={el.architecture} />
            <Route path="/admin-data-health" element={el.adminHealth} />
          </Routes>
        </Layout>
      </DrillProvider>
    </BrowserRouter>
  );
}

export default App;
