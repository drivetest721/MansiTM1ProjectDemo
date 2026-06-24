import { Database, Box, Zap, Code, FileCode, Shield, PlayCircle } from 'lucide-react';

export default function TM1Architecture() {
  const cubes = [
    { name: 'Revenue Cube', dimensions: ['Time', 'Customer', 'Product', 'Region', 'Entity', 'Version', 'Measure'], records: '2.4M' },
    { name: 'Workforce Cube', dimensions: ['Time', 'Employee', 'Department', 'Cost Center', 'Entity', 'Version', 'Measure'], records: '1.8M' },
    { name: 'Budget Cube', dimensions: ['Time', 'Account', 'Department', 'Entity', 'Scenario', 'Version', 'Measure'], records: '3.2M' },
    { name: 'Forecast Cube', dimensions: ['Time', 'Account', 'Department', 'Entity', 'Scenario', 'Version', 'Measure'], records: '2.9M' },
    { name: 'P&L Cube', dimensions: ['Time', 'Account', 'Department', 'Entity', 'Version', 'Measure'], records: '1.5M' },
    { name: 'Balance Sheet Cube', dimensions: ['Time', 'Account', 'Entity', 'Version', 'Measure'], records: '800K' },
    { name: 'Consolidation Cube', dimensions: ['Time', 'Entity', 'Account', 'Version', 'Measure'], records: '1.2M' },
  ];

  const concepts = [
    {
      title: 'Dimension',
      icon: Box,
      description: 'A category used to organize and structure data in a cube. Examples: Time, Product, Customer.',
      color: 'blue',
    },
    {
      title: 'Element',
      icon: Database,
      description: 'Individual member of a dimension. Can be a leaf element (base data) or consolidation (aggregate).',
      color: 'green',
    },
    {
      title: 'Consolidation',
      icon: Box,
      description: 'Parent element that aggregates child elements. Allows hierarchical roll-ups.',
      color: 'purple',
    },
    {
      title: 'Cube',
      icon: Box,
      description: 'Multi-dimensional data structure formed by intersecting dimensions. Stores numeric values.',
      color: 'orange',
    },
    {
      title: 'Rule',
      icon: Code,
      description: 'Formula that calculates cell values dynamically based on other cells. Enables complex calculations.',
      color: 'indigo',
    },
    {
      title: 'Feeder',
      icon: Zap,
      description: 'Statement that tells TM1 which cells depend on others. Required for rules to work correctly.',
      color: 'yellow',
    },
    {
      title: 'TurboIntegrator (TI)',
      icon: PlayCircle,
      description: 'ETL process that loads data from sources, transforms it, and updates cubes and dimensions.',
      color: 'cyan',
    },
    {
      title: 'Chore',
      icon: FileCode,
      description: 'Scheduled process that executes multiple TI processes in sequence. Used for automation.',
      color: 'pink',
    },
    {
      title: 'Security',
      icon: Shield,
      description: 'Access control at cube, dimension, and element level. Defines who can read/write data.',
      color: 'red',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">TM1 Architecture</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Understanding the TM1 solution architecture</p>
      </div>

      {/* Architecture Flow */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">Solution Architecture Flow</h2>
        <div className="flex flex-col items-center gap-6">
          {/* SQL Server */}
          <div className="w-full max-w-2xl bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-6 text-center">
            <Database size={32} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">SQL Server</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Instance: REAL_L001 | Database: TM1EnterpriseDB</p>
          </div>

          <div className="text-2xl text-gray-400">↓</div>

          {/* Source Tables */}
          <div className="w-full max-w-2xl bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-6 text-center">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Source Tables & Views</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Sales.vw_RevenueCube_Source</div>
              <div>HR.FactPayroll</div>
              <div>Planning.FactBudget</div>
              <div>Planning.FactForecast</div>
              <div>Finance.FactGL</div>
              <div>Finance.FactBalanceSheet</div>
            </div>
          </div>

          <div className="text-2xl text-gray-400">↓</div>

          {/* TurboIntegrator */}
          <div className="w-full max-w-2xl bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-6 text-center">
            <PlayCircle size={32} className="mx-auto mb-2 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">TurboIntegrator (ETL)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Extract, Transform, Load processes</p>
          </div>

          <div className="text-2xl text-gray-400">↓</div>

          {/* Dimensions */}
          <div className="w-full max-w-2xl bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg p-6 text-center">
            <Box size={32} className="mx-auto mb-2 text-orange-600 dark:text-orange-400" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Dimensions</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>Time</div>
              <div>Product</div>
              <div>Customer</div>
              <div>Employee</div>
              <div>Entity</div>
              <div>Account</div>
              <div>Department</div>
              <div>Version</div>
              <div>Measure</div>
            </div>
          </div>

          <div className="text-2xl text-gray-400">↓</div>

          {/* Cubes */}
          <div className="w-full max-w-2xl bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg p-6 text-center">
            <Database size={32} className="mx-auto mb-2 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">Cubes (Multi-dimensional Data Structures)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {cubes.slice(0, 6).map(cube => (
                <div key={cube.name}>{cube.name}</div>
              ))}
            </div>
          </div>

          <div className="text-2xl text-gray-400">↓</div>

          {/* Rules & Feeders */}
          <div className="w-full max-w-2xl bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-6 text-center">
            <Zap size={32} className="mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Rules & Feeders</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Calculations and dependencies</p>
          </div>

          <div className="text-2xl text-gray-400">↓</div>

          {/* Reports & Dashboards */}
          <div className="w-full max-w-2xl bg-gradient-to-r from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 border-2 border-pink-300 dark:border-pink-700 rounded-lg p-6 text-center">
            <FileCode size={32} className="mx-auto mb-2 text-pink-600 dark:text-pink-400" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Reports / Dashboards</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">User interface and analytics</p>
          </div>
        </div>
      </div>

      {/* TM1 Concepts */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">TM1 Core Concepts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {concepts.map((concept) => {
            const Icon = concept.icon;
            return (
              <div
                key={concept.title}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <Icon size={32} className={`mb-3 text-${concept.color}-600`} />
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{concept.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{concept.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      
    </div>
  );
}
