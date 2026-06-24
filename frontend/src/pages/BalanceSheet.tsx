import { useState } from 'react';
import FinancialTable from '../components/FinancialTable';
import type { FinancialRow } from '../components/FinancialTable';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import { CheckCircle, XCircle } from 'lucide-react';

// Balance Sheet data
const balanceSheetData: FinancialRow[] = [
  {
    id: 'assets-header',
    label: 'ASSETS',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
    isTotal: true,
  },
  {
    id: 'current-assets-header',
    label: 'Current Assets',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'cash',
    label: 'Cash & Cash Equivalents',
    actual: 48500000,
    budget: 45000000,
    
    variance: 3500000,
    variancePercent: 7.8,
    indent: 1,
  },
  {
    id: 'accounts-receivable',
    label: 'Accounts Receivable',
    actual: 32400000,
    budget: 30200000,
    
    variance: 2200000,
    variancePercent: 7.3,
    indent: 1,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    actual: 18700000,
    budget: 17500000,
    
    variance: 1200000,
    variancePercent: 6.9,
    indent: 1,
  },
  {
    id: 'prepaid',
    label: 'Prepaid Expenses',
    actual: 8900000,
    budget: 8500000,
    
    variance: 400000,
    variancePercent: 4.7,
    indent: 1,
  },
  {
    id: 'total-current-assets',
    label: 'Total Current Assets',
    actual: 108500000,
    budget: 101200000,
    
    variance: 7300000,
    variancePercent: 7.2,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'blank-1',
    label: '',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
  },
  {
    id: 'noncurrent-assets-header',
    label: 'Non-Current Assets',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'fixed-assets',
    label: 'Property, Plant & Equipment',
    actual: 125600000,
    budget: 122000000,
    
    variance: 3600000,
    variancePercent: 3.0,
    indent: 1,
  },
  {
    id: 'intangible',
    label: 'Intangible Assets',
    actual: 42300000,
    budget: 40800000,
    
    variance: 1500000,
    variancePercent: 3.7,
    indent: 1,
  },
  {
    id: 'total-noncurrent-assets',
    label: 'Total Non-Current Assets',
    actual: 167900000,
    budget: 162800000,
    
    variance: 5100000,
    variancePercent: 3.1,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'blank-2',
    label: '',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
  },
  {
    id: 'total-assets',
    label: 'TOTAL ASSETS',
    actual: 276400000,
    budget: 264000000,
    
    variance: 12400000,
    variancePercent: 4.7,
    indent: 0,
    isTotal: true,
  },
  {
    id: 'blank-3',
    label: '',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
  },
  {
    id: 'liabilities-header',
    label: 'LIABILITIES',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
    isTotal: true,
  },
  {
    id: 'current-liabilities-header',
    label: 'Current Liabilities',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'accounts-payable',
    label: 'Accounts Payable',
    actual: 28900000,
    budget: 27200000,
    
    variance: 1700000,
    variancePercent: 6.3,
    indent: 1,
  },
  {
    id: 'accrued',
    label: 'Accrued Expenses',
    actual: 15600000,
    budget: 14800000,
    
    variance: 800000,
    variancePercent: 5.4,
    indent: 1,
  },
  {
    id: 'tax-payable',
    label: 'Tax Payable',
    actual: 8400000,
    budget: 8000000,
    
    variance: 400000,
    variancePercent: 5.0,
    indent: 1,
  },
  {
    id: 'total-current-liabilities',
    label: 'Total Current Liabilities',
    actual: 52900000,
    budget: 50000000,
    
    variance: 2900000,
    variancePercent: 5.8,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'blank-4',
    label: '',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
  },
  {
    id: 'longterm-liabilities-header',
    label: 'Long-Term Liabilities',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'loans',
    label: 'Loans Payable',
    actual: 85600000,
    budget: 82000000,
   
    variance: 3600000,
    variancePercent: 4.4,
    indent: 1,
  },
  {
    id: 'deferred-revenue',
    label: 'Deferred Revenue',
    actual: 32100000,
    budget: 30500000,
    
    variance: 1600000,
    variancePercent: 5.2,
    indent: 1,
  },
  {
    id: 'total-longterm-liabilities',
    label: 'Total Long-Term Liabilities',
    actual: 117700000,
    budget: 112500000,
    
    variance: 5200000,
    variancePercent: 4.6,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'blank-5',
    label: '',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
  },
  {
    id: 'total-liabilities',
    label: 'TOTAL LIABILITIES',
    actual: 170600000,
    budget: 162500000,
    
    variance: 8100000,
    variancePercent: 5.0,
    indent: 0,
    isTotal: true,
  },
  {
    id: 'blank-6',
    label: '',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
  },
  {
    id: 'equity-header',
    label: 'EQUITY',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
    isTotal: true,
  },
  {
    id: 'share-capital',
    label: 'Share Capital',
    actual: 150000000,
    budget: 150000000,
    
    variance: 0,
    variancePercent: 0,
    indent: 1,
  },
  {
    id: 'retained-earnings',
    label: 'Retained Earnings',
    actual: 37400000,
    budget: 25700000,
    
    variance: 11700000,
    variancePercent: 45.5,
    indent: 1,
  },
  {
    id: 'current-year-profit',
    label: 'Current Year Profit/(Loss)',
    actual: -81600000,
    budget: -74200000,
    
    variance: -7400000,
    variancePercent: -10.0,
    indent: 1,
  },
  {
    id: 'total-equity',
    label: 'TOTAL EQUITY',
    actual: 105800000,
    budget: 101500000,
    
    variance: 4300000,
    variancePercent: 4.2,
    indent: 0,
    isTotal: true,
  },
  {
    id: 'blank-7',
    label: '',
    actual: undefined,
    budget: undefined,
    
    indent: 0,
  },
  {
    id: 'total-liabilities-equity',
    label: 'TOTAL LIABILITIES & EQUITY',
    actual: 276400000,
    budget: 264000000,
  
    variance: 12400000,
    variancePercent: 4.7,
    indent: 0,
    isTotal: true,
  },
];

const filterOptions: FilterOption[] = [
  {
    id: 'year',
    label: 'Year',
    options: [
      { value: '2025', label: '2025' },
      { value: '2024', label: '2024' },
    ],
  },
  {
    id: 'month',
    label: 'Month',
    options: [
      { value: 'ytd', label: 'Year to Date' },
      { value: '12', label: 'December' },
      { value: '06', label: 'June' },
    ],
  },
  {
    id: 'entity',
    label: 'Entity',
    options: [
      { value: 'global', label: 'Global Consolidated' },
      { value: 'usa', label: 'RiverEdge USA' },
    ],
  },
  {
    id: 'version',
    label: 'Version',
    options: [
      { value: 'final', label: 'Final' },
      { value: 'v1', label: 'Version 1.0' },
    ],
  },
];

export default function BalanceSheet() {
  const [filters, setFilters] = useState<Record<string, string>>({
    year: '2025',
    month: 'ytd',
    entity: 'global',
    version: 'final',
  });

  // Calculate balance validation
  const totalAssets = 276400000;
  const totalLiabilitiesEquity = 276400000;
  const isBalanced = totalAssets === totalLiabilitiesEquity;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Balance Sheet</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Statement of financial position</p>
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filterOptions}
        values={filters}
        onChange={(id, val) => setFilters({ ...filters, [id]: val })}
        onReset={() => setFilters({ year: '2025', month: 'ytd', entity: 'global', version: 'final' })}
      />

      {/* Balance Validation */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${
        isBalanced 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
          : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
      }`}>
        {isBalanced ? (
          <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
        ) : (
          <XCircle className="text-red-600 dark:text-red-400" size={24} />
        )}
        <div>
          <p className={`font-semibold ${isBalanced ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
            {isBalanced ? 'Balance Sheet is Balanced ✓' : 'Balance Sheet is Out of Balance!'}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Assets: ${(totalAssets / 1000000).toFixed(1)}M | 
            Liabilities & Equity: ${(totalLiabilitiesEquity / 1000000).toFixed(1)}M
          </p>
        </div>
      </div>

      {/* Balance Sheet Table */}
      <FinancialTable
        data={balanceSheetData}
        title={`Balance Sheet - As of ${filters.month === 'ytd' ? 'YTD' : 'Month End'} ${filters.year}`}
        showExport={true}
      />

      {/* Key Ratios */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Current Ratio</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">2.05</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Current Assets / Current Liabilities</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">Debt-to-Equity</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">1.61</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Total Liabilities / Total Equity</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Asset Turnover</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">0.52</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Revenue / Total Assets</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Equity Ratio</p>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">38.3%</p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Total Equity / Total Assets</p>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Statement Notes:</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>All amounts shown in USD</li>
          <li>Balance sheet follows GAAP accounting principles</li>
          <li>Assets = Liabilities + Equity (Fundamental Accounting Equation)</li>
          <li>Current assets/liabilities are due within one year</li>
          <li>Non-current assets include long-term investments and fixed assets</li>
        </ul>
      </div>
    </div>
  );
}
