import { useState } from 'react';
import FinancialTable, { type FinancialRow } from '../components/FinancialTable';
import GlobalFilters, { type FilterOption } from '../components/GlobalFilters';

// P&L Statement data with proper financial statement structure
const plStatementData: FinancialRow[] = [
  {
    id: 'revenue-header',
    label: 'Revenue',
    actual: undefined,
    budget: undefined,
    forecast: undefined,
    variance: undefined,
    variancePercent: undefined,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'product-revenue',
    label: 'Product Revenue',
    actual: 82500000,
    budget: 79200000,
    forecast: 84300000,
    variance: 3300000,
    variancePercent: 4.2,
    indent: 1,
  },
  {
    id: 'service-revenue',
    label: 'Service Revenue',
    actual: 42300000,
    budget: 40500000,
    forecast: 43200000,
    variance: 1800000,
    variancePercent: 4.4,
    indent: 1,
  },
  {
    id: 'subscription-revenue',
    label: 'Subscription Revenue',
    actual: 17700000,
    budget: 18500000,
    forecast: 18300000,
    variance: -800000,
    variancePercent: -4.3,
    indent: 1,
  },
  {
    id: 'total-revenue',
    label: 'Total Revenue',
    actual: 142500000,
    budget: 138200000,
    forecast: 145800000,
    variance: 4300000,
    variancePercent: 3.1,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'blank-1',
    label: '',
    actual: undefined,
    budget: undefined,
    forecast: undefined,
    indent: 0,
  },
  {
    id: 'cogs-header',
    label: 'Cost of Goods Sold',
    actual: undefined,
    budget: undefined,
    forecast: undefined,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'direct-cost',
    label: 'Direct Cost',
    actual: 72400000,
    budget: 69800000,
    forecast: 73100000,
    variance: 2600000,
    variancePercent: 3.7,
    indent: 1,
  },
  {
    id: 'delivery-cost',
    label: 'Delivery Cost',
    actual: 26300000,
    budget: 25300000,
    forecast: 26100000,
    variance: 1000000,
    variancePercent: 4.0,
    indent: 1,
  },
  {
    id: 'total-cogs',
    label: 'Total COGS',
    actual: 98700000,
    budget: 95100000,
    forecast: 99200000,
    variance: 3600000,
    variancePercent: 3.8,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'blank-2',
    label: '',
    actual: undefined,
    budget: undefined,
    forecast: undefined,
    indent: 0,
  },
  {
    id: 'gross-profit',
    label: 'Gross Profit',
    actual: 43800000,
    budget: 43100000,
    forecast: 46600000,
    variance: 700000,
    variancePercent: 1.6,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'blank-3',
    label: '',
    actual: undefined,
    budget: undefined,
    forecast: undefined,
    indent: 0,
  },
  {
    id: 'opex-header',
    label: 'Operating Expenses',
    actual: undefined,
    budget: undefined,
    forecast: undefined,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'salary-expense',
    label: 'Salary Expense',
    actual: 52300000,
    budget: 49800000,
    forecast: 53100000,
    variance: 2500000,
    variancePercent: 5.0,
    indent: 1,
  },
  {
    id: 'bonus-expense',
    label: 'Bonus Expense',
    actual: 8900000,
    budget: 8200000,
    forecast: 9100000,
    variance: 700000,
    variancePercent: 8.5,
    indent: 1,
  },
  {
    id: 'benefits-expense',
    label: 'Benefits Expense',
    actual: 9400000,
    budget: 8900000,
    forecast: 9600000,
    variance: 500000,
    variancePercent: 5.6,
    indent: 1,
  },
  {
    id: 'rent-expense',
    label: 'Rent Expense',
    actual: 12800000,
    budget: 12500000,
    forecast: 12900000,
    variance: 300000,
    variancePercent: 2.4,
    indent: 1,
  },
  {
    id: 'travel-expense',
    label: 'Travel Expense',
    actual: 8400000,
    budget: 7200000,
    forecast: 8600000,
    variance: 1200000,
    variancePercent: 16.7,
    indent: 1,
  },
  {
    id: 'marketing-expense',
    label: 'Marketing Expense',
    actual: 18900000,
    budget: 16800000,
    forecast: 19500000,
    variance: 2100000,
    variancePercent: 12.5,
    indent: 1,
  },
  {
    id: 'software-expense',
    label: 'Software Expense',
    actual: 6700000,
    budget: 6200000,
    forecast: 6900000,
    variance: 500000,
    variancePercent: 8.1,
    indent: 1,
  },
  {
    id: 'total-opex',
    label: 'Total Operating Expenses',
    actual: 117400000,
    budget: 109600000,
    forecast: 119700000,
    variance: 7800000,
    variancePercent: 7.1,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'blank-4',
    label: '',
    actual: undefined,
    budget: undefined,
    forecast: undefined,
    indent: 0,
  },
  {
    id: 'ebitda',
    label: 'EBITDA',
    actual: -73600000,
    budget: -66500000,
    forecast: -73100000,
    variance: -7100000,
    variancePercent: -10.7,
    indent: 0,
    isSubtotal: true,
  },
  {
    id: 'blank-5',
    label: '',
    actual: undefined,
    budget: undefined,
    forecast: undefined,
    indent: 0,
  },
  {
    id: 'depreciation',
    label: 'Depreciation & Amortization',
    actual: 5200000,
    budget: 5100000,
    forecast: 5200000,
    variance: 100000,
    variancePercent: 2.0,
    indent: 0,
  },
  {
    id: 'blank-6',
    label: '',
    actual: undefined,
    budget: undefined,
    forecast: undefined,
    indent: 0,
  },
  
 
  {
    id: 'tax-expense',
    label: 'Tax Expense',
    actual: 2800000,
    budget: 2600000,
    forecast: 2900000,
    variance: 200000,
    variancePercent: 7.7,
    indent: 0,
  },
  {
    id: 'blank-8',
    label: '',
    actual: undefined,
    budget: undefined,
    forecast: undefined,
    indent: 0,
  },
  {
    id: 'net-income',
    label: 'Net Income',
    actual: -81600000,
    budget: -74200000,
    forecast: -81200000,
    variance: -7400000,
    variancePercent: -10.0,
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
      { value: '2023', label: '2023' },
    ],
  },
  {
    id: 'month',
    label: 'Month',
    options: [
      { value: 'ytd', label: 'Year to Date' },
      { value: '01', label: 'January' },
      { value: '02', label: 'February' },
      { value: '03', label: 'March' },
      { value: '04', label: 'April' },
      { value: '05', label: 'May' },
      { value: '06', label: 'June' },
      { value: '07', label: 'July' },
      { value: '08', label: 'August' },
      { value: '09', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' },
    ],
  },
  {
    id: 'entity',
    label: 'Entity',
    options: [
      { value: 'global', label: 'Global Consolidated' },
      { value: 'usa', label: 'RiverEdge USA' },
      { value: 'uk', label: 'RiverEdge UK' },
      { value: 'india', label: 'RiverEdge India' },
    ],
  },
  {
    id: 'version',
    label: 'Version',
    options: [
      { value: 'v1', label: 'Version 1.0' },
      { value: 'v2', label: 'Version 2.0' },
      { value: 'final', label: 'Final' },
    ],
  },
];

export default function PLStatement() {
  const [filters, setFilters] = useState<Record<string, string>>({
    year: '2025',
    month: 'ytd',
    entity: 'global',
    version: 'final',
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profit & Loss Statement</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive income statement</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">Period: FY {filters.year}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Entity: {filters.entity === 'global' ? 'Global Consolidated' : filters.entity}</p>
        </div>
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filterOptions}
        values={filters}
        onChange={(id, val) => setFilters({ ...filters, [id]: val })}
        onReset={() => setFilters({ year: '2025', month: 'ytd', entity: 'global', version: 'final' })}
      />

      {/* P&L Statement Table */}
      <FinancialTable
        data={plStatementData}
        title={`Profit & Loss Statement - ${filters.year}`}
        showExport={true}
      />

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Gross Margin %</p>
          <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">30.7%</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">Operating Margin %</p>
          <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">-55.3%</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <p className="text-sm font-medium text-purple-700 dark:text-purple-300">EBITDA Margin %</p>
          <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">-51.6%</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Net Margin %</p>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100 mt-1">-57.3%</p>
        </div>
      </div>

      {/* Statement Notes */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Statement Notes:</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>All amounts shown in USD</li>
          <li>Financial statement follows GAAP accounting principles</li>
          <li>Variance calculated as Actual vs Budget</li>
          <li>Negative values indicate losses or expenses</li>
          <li>Expand sections to view detailed line items</li>
        </ul>
      </div>
    </div>
  );
}
