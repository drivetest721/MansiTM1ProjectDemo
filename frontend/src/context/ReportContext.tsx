/**
 * ReportContext
 * Global parameter store that drives all PAX-style management reports.
 * Set parameters on the Parameters page → every report page reacts.
 */
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface ReportParams {
  entity:           string;
  year:             number;
  currentPeriod:    string;   // e.g. "Jun"
  actualMonths:     number;   // how many trailing months are Actual
  forecastMonths:   number;   // remaining months are Forecast
  budgetScenario:   string;
  actualScenario:   string;
  forecastScenario: string;
  // Comparison period
  compareYear:      number;
  comparePeriod:    string;
}

interface ReportContextValue {
  params:    ReportParams;
  setParams: (p: ReportParams) => void;
  /** Increment this to force all reports to re-fetch */
  refreshKey: number;
  refresh:    () => void;
}

const DEFAULTS: ReportParams = {
  entity:           '',
  year:             new Date().getFullYear(),
  currentPeriod:    'Jun',
  actualMonths:     3,
  forecastMonths:   9,
  budgetScenario:   'Budget',
  actualScenario:   'Actual',
  forecastScenario: 'Forecast',
  compareYear:      new Date().getFullYear() - 1,
  comparePeriod:    'Jun',
};

const ReportContext = createContext<ReportContextValue>({
  params:     DEFAULTS,
  setParams:  () => {},
  refreshKey: 0,
  refresh:    () => {},
});

export function ReportProvider({ children }: { children: ReactNode }) {
  const [params,     setParams]     = useState<ReportParams>(DEFAULTS);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <ReportContext.Provider value={{
      params,
      setParams,
      refreshKey,
      refresh: () => setRefreshKey(k => k + 1),
    }}>
      {children}
    </ReportContext.Provider>
  );
}

export const useReportContext = () => useContext(ReportContext);
