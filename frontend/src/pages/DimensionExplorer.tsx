import { useState } from 'react';
import HierarchyTree from '../components/HierarchyTree';
import type { HierarchyNode } from '../components/HierarchyTree';

// Sample dimension hierarchies
const dimensions = [
  {
    id: 'product',
    name: 'Product',
    description: 'Product hierarchy with categories, families, and SKUs',
  },
  {
    id: 'customer',
    name: 'Customer',
    description: 'Customer hierarchy by industry and segment',
  },
  {
    id: 'time',
    name: 'Time',
    description: 'Calendar hierarchy with years, quarters, months',
  },
  {
    id: 'entity',
    name: 'Entity',
    description: 'Legal entity hierarchy by region',
  },
  {
    id: 'account',
    name: 'Account',
    description: 'Chart of accounts with financial categories',
  },
  {
    id: 'department',
    name: 'Department',
    description: 'Organizational department structure',
  },
];

// Product hierarchy
const productHierarchy: HierarchyNode[] = [
  {
    id: 'all-products',
    name: 'All Products',
    type: 'consolidation',
    children: [
      {
        id: 'software',
        name: 'Software',
        type: 'consolidation',
        children: [
          {
            id: 'planning-analytics',
            name: 'Planning Analytics',
            type: 'consolidation',
            children: [
              { id: 'pa-cloud', name: 'PA Cloud Edition', type: 'element', attributes: { Code: 'PA-001', Price: 5362 } },
              { id: 'pa-onprem', name: 'PA On-Premise', type: 'element', attributes: { Code: 'PA-002', Price: 4945 } },
            ],
          },
          { id: 'forecasting', name: 'Forecasting Suite', type: 'element', attributes: { Code: 'FS-001', Price: 3951 } },
          { id: 'reporting', name: 'Reporting Tools', type: 'element', attributes: { Code: 'RT-001', Price: 4698 } },
        ],
      },
      {
        id: 'services',
        name: 'Services',
        type: 'consolidation',
        children: [
          { id: 'consulting', name: 'Consulting', type: 'element', attributes: { Code: 'SV-001' } },
          { id: 'implementation', name: 'Implementation', type: 'element', attributes: { Code: 'SV-002' } },
          { id: 'support', name: 'Support', type: 'element', attributes: { Code: 'SV-003' } },
        ],
      },
    ],
  },
];

// Customer hierarchy
const customerHierarchy: HierarchyNode[] = [
  {
    id: 'all-customers',
    name: 'All Customers',
    type: 'consolidation',
    children: [
      {
        id: 'healthcare',
        name: 'Healthcare',
        type: 'consolidation',
        children: [
          {
            id: 'strategic',
            name: 'Strategic',
            type: 'consolidation',
            children: [
              { id: 'cust-001', name: 'Customer 001', type: 'element', attributes: { Segment: 'Strategic', Industry: 'Healthcare' } },
            ],
          },
        ],
      },
      {
        id: 'financial',
        name: 'Financial Services',
        type: 'consolidation',
        children: [
          { id: 'cust-002', name: 'Customer 002', type: 'element', attributes: { Segment: 'Enterprise', Industry: 'Financial' } },
        ],
      },
      {
        id: 'manufacturing',
        name: 'Manufacturing',
        type: 'consolidation',
        children: [
          { id: 'cust-003', name: 'Customer 003', type: 'element', attributes: { Segment: 'Mid-Market', Industry: 'Manufacturing' } },
        ],
      },
    ],
  },
];

// Time hierarchy
const timeHierarchy: HierarchyNode[] = [
  {
    id: 'all-years',
    name: 'All Years',
    type: 'consolidation',
    children: [
      {
        id: '2025',
        name: '2025',
        type: 'consolidation',
        children: [
          {
            id: '2025-q1',
            name: '2025-Q1',
            type: 'consolidation',
            children: [
              { id: '2025-01', name: '2025-January', type: 'element' },
              { id: '2025-02', name: '2025-February', type: 'element' },
              { id: '2025-03', name: '2025-March', type: 'element' },
            ],
          },
          {
            id: '2025-q2',
            name: '2025-Q2',
            type: 'consolidation',
            children: [
              { id: '2025-04', name: '2025-April', type: 'element' },
              { id: '2025-05', name: '2025-May', type: 'element' },
              { id: '2025-06', name: '2025-June', type: 'element' },
            ],
          },
        ],
      },
    ],
  },
];

// Account hierarchy
const accountHierarchy: HierarchyNode[] = [
  {
    id: 'all-accounts',
    name: 'All Accounts',
    type: 'consolidation',
    children: [
      {
        id: 'revenue',
        name: 'Revenue',
        type: 'consolidation',
        children: [
          { id: '4000', name: '4000 - Product Revenue', type: 'element', attributes: { Type: 'Revenue', Category: 'Income Statement' } },
          { id: '4100', name: '4100 - Service Revenue', type: 'element', attributes: { Type: 'Revenue', Category: 'Income Statement' } },
        ],
      },
      {
        id: 'expenses',
        name: 'Expenses',
        type: 'consolidation',
        children: [
          { id: '5000', name: '5000 - Cost of Goods Sold', type: 'element', attributes: { Type: 'Expense', Category: 'Income Statement' } },
          { id: '6000', name: '6000 - Operating Expenses', type: 'element', attributes: { Type: 'Expense', Category: 'Income Statement' } },
        ],
      },
    ],
  },
];

const dimensionData: Record<string, HierarchyNode[]> = {
  product: productHierarchy,
  customer: customerHierarchy,
  time: timeHierarchy,
  entity: [], // Would use entityHierarchyData from FinancialConsolidation
  account: accountHierarchy,
  department: [],
};

export default function DimensionExplorer() {
  const [selectedDimension, setSelectedDimension] = useState(dimensions[0]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dimension Explorer</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Browse dimension hierarchies and element attributes</p>
      </div>

      {/* Dimension Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Dimension</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dimensions.map((dim) => (
            <button
              key={dim.id}
              onClick={() => setSelectedDimension(dim)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedDimension.id === dim.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{dim.name}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">{dim.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Dimension Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hierarchy Tree */}
        <div className="lg:col-span-2">
          {dimensionData[selectedDimension.id] && dimensionData[selectedDimension.id].length > 0 ? (
            <HierarchyTree
              data={dimensionData[selectedDimension.id]}
              title={`${selectedDimension.name} Hierarchy`}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Hierarchy data for {selectedDimension.name} dimension will be loaded here.
              </p>
            </div>
          )}
        </div>

        {/* Dimension Properties */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dimension Properties</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Name</p>
              <p className="text-base text-gray-900 dark:text-white font-semibold">{selectedDimension.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Type</p>
              <p className="text-base text-gray-900 dark:text-white">Standard Dimension</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Elements</p>
              <p className="text-base text-gray-900 dark:text-white">
                {selectedDimension.id === 'product' ? '12' : 
                 selectedDimension.id === 'customer' ? '1,247' :
                 selectedDimension.id === 'time' ? '240' :
                 selectedDimension.id === 'account' ? '185' : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Consolidations</p>
              <p className="text-base text-gray-900 dark:text-white">
                {selectedDimension.id === 'product' ? '4' : 
                 selectedDimension.id === 'customer' ? '8' :
                 selectedDimension.id === 'time' ? '20' :
                 selectedDimension.id === 'account' ? '12' : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attributes</p>
              <p className="text-base text-gray-900 dark:text-white">
                {selectedDimension.id === 'product' ? 'Code, Price, Category' : 
                 selectedDimension.id === 'customer' ? 'Segment, Industry, Region' :
                 selectedDimension.id === 'time' ? 'Year, Quarter, Month' :
                 selectedDimension.id === 'account' ? 'Type, Category, Class' : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dimension Info */}
      <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
        <p className="text-sm text-cyan-800 dark:text-cyan-200">
          <strong>Dimension Concepts:</strong> Dimensions organize data hierarchically. 
          Consolidations (folders) aggregate leaf elements. 
          Elements can have attributes for additional properties. 
          Multiple hierarchies allow different views of the same data.
        </p>
      </div>
    </div>
  );
}
