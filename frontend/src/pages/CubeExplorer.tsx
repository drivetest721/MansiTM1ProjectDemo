import { useState } from 'react';
import CubeGrid from '../components/CubeGrid';
import type { CubeRow } from '../components/CubeGrid';

// Mock cube metadata
const availableCubes = [
  { id: 'revenue', name: 'Revenue Cube', dimensions: ['Time', 'Customer', 'Product', 'Region', 'Entity', 'Version', 'Measure'] },
  { id: 'workforce', name: 'Workforce Cube', dimensions: ['Time', 'Employee', 'Department', 'Cost Center', 'Entity', 'Version', 'Measure'] },
  { id: 'budget', name: 'Budget Cube', dimensions: ['Time', 'Account', 'Department', 'Entity', 'Scenario', 'Version', 'Measure'] },
  { id: 'forecast', name: 'Forecast Cube', dimensions: ['Time', 'Account', 'Department', 'Entity', 'Scenario', 'Version', 'Measure'] },
  { id: 'pl', name: 'P&L Cube', dimensions: ['Time', 'Account', 'Department', 'Entity', 'Version', 'Measure'] },
  { id: 'balance-sheet', name: 'Balance Sheet Cube', dimensions: ['Time', 'Account', 'Entity', 'Version', 'Measure'] },
];

// Sample cube data (Revenue Cube)
const revenueCubeSampleData: CubeRow[] = [
  {
    id: 'software',
    rowLabel: 'Software',
    indent: 0,
    hasChildren: true,
    Revenue: 58400000,
    Cost: 36200000,
    Margin: 22200000,
    Quantity: 12450,
  },
  {
    id: 'services',
    rowLabel: 'Services',
    indent: 0,
    hasChildren: true,
    Revenue: 42300000,
    Cost: 28100000,
    Margin: 14200000,
    Quantity: 8900,
  },
  {
    id: 'hardware',
    rowLabel: 'Hardware',
    indent: 0,
    hasChildren: false,
    Revenue: 24100000,
    Cost: 18900000,
    Margin: 5200000,
    Quantity: 5600,
  },
  {
    id: 'training',
    rowLabel: 'Training',
    indent: 0,
    hasChildren: false,
    Revenue: 17700000,
    Cost: 13200000,
    Margin: 4500000,
    Quantity: 4300,
  },
  {
    id: 'total',
    rowLabel: 'Total',
    indent: 0,
    isTotal: true,
    Revenue: 142500000,
    Cost: 96400000,
    Margin: 46100000,
    Quantity: 31250,
  },
];

export default function CubeExplorer() {
  const [selectedCube, setSelectedCube] = useState(availableCubes[0]);
  const [rowDimension, setRowDimension] = useState('Product');
  const [columnMeasures] = useState(['Revenue', 'Cost', 'Margin', 'Quantity']);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cube Explorer</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">TM1-style cube viewer with pivot capabilities</p>
      </div>

      {/* Cube Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Cube</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availableCubes.map((cube) => (
            <button
              key={cube.id}
              onClick={() => setSelectedCube(cube)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedCube.id === cube.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{cube.name}</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">{cube.dimensions.length} dimensions</p>
            </button>
          ))}
        </div>
      </div>

      {/* Cube Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cube Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dimensions */}
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Dimensions</h4>
            <div className="space-y-2">
              {selectedCube.dimensions.map((dim) => (
                <div key={dim} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{dim}</span>
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {dim === 'Measure' ? 'Column' : 'Filter'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Measures */}
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Measures</h4>
            <div className="space-y-2">
              {columnMeasures.map((measure) => (
                <div key={measure} className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{measure}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pivot Options */}
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Pivot Options</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Row Dimension</label>
                <select
                  value={rowDimension}
                  onChange={(e) => setRowDimension(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                >
                  {selectedCube.dimensions.filter(d => d !== 'Measure').map((dim) => (
                    <option key={dim} value={dim}>{dim}</option>
                  ))}
                </select>
              </div>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                Apply Pivot
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cube Data Grid */}
      <CubeGrid
        data={revenueCubeSampleData}
        measures={columnMeasures}
        title={`${selectedCube.name} - ${rowDimension} View`}
        showExport={true}
        onExport={() => console.log('Export cube')}
      />

      {/* Cube Info */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
        <p className="text-sm text-purple-800 dark:text-purple-200">
          <strong>Cube Viewer:</strong> Select a cube to explore its data. 
          Choose dimensions for rows and columns to create custom views. 
          Apply filters to slice data by specific dimension elements. 
          Export views to Excel for further analysis.
        </p>
      </div>
    </div>
  );
}
