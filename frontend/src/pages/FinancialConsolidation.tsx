import { useState } from 'react';
import CubeGrid from '../components/CubeGrid';
import type { CubeRow } from '../components/CubeGrid';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import HierarchyTree from '../components/HierarchyTree';
import type { HierarchyNode } from '../components/HierarchyTree';

// Financial consolidation hierarchy data
const entityHierarchyData: HierarchyNode[] = [
  {
    id: 'global',
    name: 'Global',
    type: 'consolidation',
    children: [
      {
        id: 'americas',
        name: 'Americas',
        type: 'consolidation',
        children: [
          { id: 'usa', name: 'RiverEdge USA', type: 'element' },
          { id: 'canada', name: 'RiverEdge Canada', type: 'element' },
          { id: 'mexico', name: 'RiverEdge Mexico', type: 'element' },
          { id: 'brazil', name: 'RiverEdge Brazil', type: 'element' },
        ],
      },
      {
        id: 'apac',
        name: 'APAC',
        type: 'consolidation',
        children: [
          { id: 'india', name: 'RiverEdge India', type: 'element' },
          { id: 'australia', name: 'RiverEdge Australia', type: 'element' },
          { id: 'singapore', name: 'RiverEdge Singapore', type: 'element' },
          { id: 'japan', name: 'RiverEdge Japan', type: 'element' },
          { id: 'china', name: 'RiverEdge China', type: 'element' },
        ],
      },
      {
        id: 'emea',
        name: 'EMEA',
        type: 'consolidation',
        children: [
          { id: 'uk', name: 'RiverEdge UK', type: 'element' },
          { id: 'germany', name: 'RiverEdge Germany', type: 'element' },
          { id: 'france', name: 'RiverEdge France', type: 'element' },
          { id: 'spain', name: 'RiverEdge Spain', type: 'element' },
          { id: 'italy', name: 'RiverEdge Italy', type: 'element' },
          { id: 'netherlands', name: 'RiverEdge Netherlands', type: 'element' },
          { id: 'belgium', name: 'RiverEdge Belgium', type: 'element' },
          { id: 'switzerland', name: 'RiverEdge Switzerland', type: 'element' },
          { id: 'ireland', name: 'RiverEdge Ireland', type: 'element' },
          { id: 'uae', name: 'RiverEdge UAE', type: 'element' },
          { id: 'south-africa', name: 'RiverEdge South Africa', type: 'element' },
        ],
      },
    ],
  },
];

// Consolidation cube data
const consolidationCubeData: CubeRow[] = [
  {
    id: 'global',
    rowLabel: 'Global',
    indent: 0,
    hasChildren: true,
    isTotal: true,
    Revenue: 142500000,
    Expense: 179700000,
    EBITDA: -37200000,
    'Net Income': -81600000,
    Assets: 276400000,
    Liabilities: 170600000,
    Equity: 105800000,
  },
  {
    id: 'americas',
    rowLabel: 'Americas',
    indent: 1,
    hasChildren: true,
    Revenue: 72300000,
    Expense: 91200000,
    EBITDA: -18900000,
    'Net Income': -41400000,
    Assets: 140200000,
    Liabilities: 86500000,
    Equity: 53700000,
  },
  {
    id: 'usa',
    rowLabel: 'RiverEdge USA',
    indent: 2,
    hasChildren: false,
    Revenue: 58400000,
    Expense: 73600000,
    EBITDA: -15200000,
    'Net Income': -33400000,
    Assets: 113200000,
    Liabilities: 69800000,
    Equity: 43400000,
  },
  {
    id: 'canada',
    rowLabel: 'RiverEdge Canada',
    indent: 2,
    hasChildren: false,
    Revenue: 8500000,
    Expense: 10700000,
    EBITDA: -2200000,
    'Net Income': -4800000,
    Assets: 16400000,
    Liabilities: 10100000,
    Equity: 6300000,
  },
  {
    id: 'mexico',
    rowLabel: 'RiverEdge Mexico',
    indent: 2,
    hasChildren: false,
    Revenue: 3200000,
    Expense: 4000000,
    EBITDA: -800000,
    'Net Income': -1800000,
    Assets: 6200000,
    Liabilities: 3800000,
    Equity: 2400000,
  },
  {
    id: 'brazil',
    rowLabel: 'RiverEdge Brazil',
    indent: 2,
    hasChildren: false,
    Revenue: 2200000,
    Expense: 2900000,
    EBITDA: -700000,
    'Net Income': -1400000,
    Assets: 4400000,
    Liabilities: 2800000,
    Equity: 1600000,
  },
  {
    id: 'apac',
    rowLabel: 'APAC',
    indent: 1,
    hasChildren: true,
    Revenue: 32100000,
    Expense: 40500000,
    EBITDA: -8400000,
    'Net Income': -18400000,
    Assets: 62300000,
    Liabilities: 38400000,
    Equity: 23900000,
  },
  {
    id: 'india',
    rowLabel: 'RiverEdge India',
    indent: 2,
    hasChildren: false,
    Revenue: 12400000,
    Expense: 15600000,
    EBITDA: -3200000,
    'Net Income': -7000000,
    Assets: 24000000,
    Liabilities: 14800000,
    Equity: 9200000,
  },
  {
    id: 'australia',
    rowLabel: 'RiverEdge Australia',
    indent: 2,
    hasChildren: false,
    Revenue: 9200000,
    Expense: 11600000,
    EBITDA: -2400000,
    'Net Income': -5300000,
    Assets: 17800000,
    Liabilities: 11000000,
    Equity: 6800000,
  },
  {
    id: 'singapore',
    rowLabel: 'RiverEdge Singapore',
    indent: 2,
    hasChildren: false,
    Revenue: 5800000,
    Expense: 7300000,
    EBITDA: -1500000,
    'Net Income': -3300000,
    Assets: 11200000,
    Liabilities: 6900000,
    Equity: 4300000,
  },
  {
    id: 'japan',
    rowLabel: 'RiverEdge Japan',
    indent: 2,
    hasChildren: false,
    Revenue: 3100000,
    Expense: 3900000,
    EBITDA: -800000,
    'Net Income': -1800000,
    Assets: 6000000,
    Liabilities: 3700000,
    Equity: 2300000,
  },
  {
    id: 'china',
    rowLabel: 'RiverEdge China',
    indent: 2,
    hasChildren: false,
    Revenue: 1600000,
    Expense: 2100000,
    EBITDA: -500000,
    'Net Income': -1000000,
    Assets: 3300000,
    Liabilities: 2000000,
    Equity: 1300000,
  },
  {
    id: 'emea',
    rowLabel: 'EMEA',
    indent: 1,
    hasChildren: true,
    Revenue: 38100000,
    Expense: 48000000,
    EBITDA: -9900000,
    'Net Income': -21800000,
    Assets: 73900000,
    Liabilities: 45700000,
    Equity: 28200000,
  },
  {
    id: 'uk',
    rowLabel: 'RiverEdge UK',
    indent: 2,
    hasChildren: false,
    Revenue: 15200000,
    Expense: 19100000,
    EBITDA: -3900000,
    'Net Income': -8600000,
    Assets: 29500000,
    Liabilities: 18200000,
    Equity: 11300000,
  },
  {
    id: 'germany',
    rowLabel: 'RiverEdge Germany',
    indent: 2,
    hasChildren: false,
    Revenue: 12300000,
    Expense: 15500000,
    EBITDA: -3200000,
    'Net Income': -7000000,
    Assets: 23800000,
    Liabilities: 14700000,
    Equity: 9100000,
  },
  {
    id: 'france',
    rowLabel: 'RiverEdge France',
    indent: 2,
    hasChildren: false,
    Revenue: 6400000,
    Expense: 8100000,
    EBITDA: -1700000,
    'Net Income': -3700000,
    Assets: 12400000,
    Liabilities: 7700000,
    Equity: 4700000,
  },
  {
    id: 'other-emea',
    rowLabel: 'Other EMEA',
    indent: 2,
    hasChildren: false,
    Revenue: 4200000,
    Expense: 5300000,
    EBITDA: -1100000,
    'Net Income': -2500000,
    Assets: 8200000,
    Liabilities: 5100000,
    Equity: 3100000,
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
    ],
  },
  {
    id: 'currency',
    label: 'Currency',
    options: [
      { value: 'usd', label: 'USD' },
      { value: 'eur', label: 'EUR' },
      { value: 'local', label: 'Local Currency' },
    ],
  },
  {
    id: 'version',
    label: 'Version',
    options: [
      { value: 'actual', label: 'Actual' },
      { value: 'budget', label: 'Budget' },
    ],
  },
];

export default function FinancialConsolidation() {
  const [filters, setFilters] = useState<Record<string, string>>({
    year: '2025',
    month: 'ytd',
    currency: 'usd',
    version: 'actual',
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Consolidation</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Entity consolidation across regions</p>
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filterOptions}
        values={filters}
        onChange={(id, val) => setFilters({ ...filters, [id]: val })}
        onReset={() => setFilters({ year: '2025', month: 'ytd', currency: 'usd', version: 'actual' })}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity Hierarchy Tree */}
        <div className="lg:col-span-1">
          <HierarchyTree
            data={entityHierarchyData}
            title="Entity Hierarchy"
          />
        </div>

        {/* Consolidation Cube */}
        <div className="lg:col-span-2">
          <CubeGrid
            data={consolidationCubeData}
            measures={['Revenue', 'Expense', 'EBITDA', 'Net Income', 'Assets', 'Liabilities', 'Equity']}
            title="Consolidated Financial Data"
            showExport={true}
            onExport={() => console.log('Export')}
          />
        </div>
      </div>

      {/* FX Conversion Note */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
        <p className="text-sm text-indigo-800 dark:text-indigo-200">
          <strong>Currency Conversion:</strong> All amounts converted to {filters.currency.toUpperCase()} using month-end exchange rates. 
          Intercompany eliminations have been applied. Click entity names in hierarchy to drill down to subsidiary-level detail.
        </p>
      </div>
    </div>
  );
}
