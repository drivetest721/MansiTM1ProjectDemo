import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
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

function App() {
  return (
    <BrowserRouter>
      <DrillProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<ExecutiveOverview />} />
          <Route path="/revenue-planning" element={<RevenuePlanning />} />
          <Route path="/revenue-planning/pivot" element={<PivotTableView />} />
          <Route path="/workforce-planning" element={<WorkforcePlanning />} />
          <Route path="/workforce-planning/pivot" element={<PivotTableView />} />
          <Route path="/cfo-budgeting" element={<CFOBudgeting />} />
          <Route path="/forecasting-analysis" element={<ForecastingAnalysis />} />
          <Route path="/pl-statement" element={<PLStatement />} />
          <Route path="/balance-sheet" element={<BalanceSheet />} />
          <Route path="/financial-consolidation" element={<FinancialConsolidation />} />
          <Route path="/cube-explorer" element={<CubeExplorer />} />
          <Route path="/dimension-explorer" element={<DimensionExplorer />} />
          <Route path="/tm1-architecture" element={<TM1Architecture />} />
          <Route path="/admin-data-health" element={<AdminDataHealth />} />
        </Routes>
      </Layout>
      </DrillProvider>
    </BrowserRouter>
  );
}

export default App;
