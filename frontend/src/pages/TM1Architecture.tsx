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
    { title: 'Dimension', icon: Box, description: 'A category used to organize and structure data in a cube. Examples: Time, Product, Customer.', color: 'blue' },
    { title: 'Element', icon: Database, description: 'Individual member of a dimension. Can be a leaf element (base data) or consolidation (aggregate).', color: 'green' },
    { title: 'Consolidation', icon: Box, description: 'Parent element that aggregates child elements. Allows hierarchical roll-ups.', color: 'purple' },
    { title: 'Cube', icon: Box, description: 'Multi-dimensional data structure formed by intersecting dimensions. Stores numeric values.', color: 'orange' },
    { title: 'Rule', icon: Code, description: 'Formula that calculates cell values dynamically based on other cells. Enables complex calculations.', color: 'indigo' },
    { title: 'Feeder', icon: Zap, description: 'Statement that tells TM1 which cells depend on others. Required for rules to work correctly.', color: 'yellow' },
    { title: 'TurboIntegrator (TI)', icon: PlayCircle, description: 'ETL process that loads data from sources, transforms it, and updates cubes and dimensions.', color: 'cyan' },
    { title: 'Chore', icon: FileCode, description: 'Scheduled process that executes multiple TI processes in sequence. Used for automation.', color: 'pink' },
    { title: 'Security', icon: Shield, description: 'Access control at cube, dimension, and element level. Defines who can read/write data.', color: 'red' },
  ];

  const flowSteps = [
    {
      bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      border: 'border-blue-300 dark:border-blue-700',
      icon: <Database size={32} className="mx-auto mb-2 text-blue-600 dark:text-blue-400" />,
      title: 'SQL Server',
      subtitle: 'Instance: REAL_L001 | Database: TM1EnterpriseDB',
      exampleBg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
      exampleLabel: 'Connection Details',
      exampleLines: [
        { label: 'Server', value: 'REAL_L001' },
        { label: 'Database', value: 'TM1EnterpriseDB' },
        { label: 'Auth', value: 'Windows Auth' },
        { label: 'Port', value: '1433' },
      ],
    },
    {
      bg: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
      border: 'border-green-300 dark:border-green-700',
      icon: null,
      title: 'Source Tables & Views',
      subtitle: null,
      grid: [
        'Sales.vw_RevenueCube_Source',
        'HR.FactPayroll',
        'Planning.FactBudget',
        'Planning.FactForecast',
        'Finance.FactGL',
        'Finance.FactBalanceSheet',
      ],
      exampleBg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
      exampleLabel: 'Example: Revenue View',
      exampleCode: `SELECT\n  Year, Entity,\n  Product, Customer,\n  SUM(Revenue) AS Revenue\nFROM Sales.vw_RevenueCube_Source\nGROUP BY Year, Entity,\n  Product, Customer`,
    },
    {
      bg: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
      border: 'border-purple-300 dark:border-purple-700',
      icon: <PlayCircle size={32} className="mx-auto mb-2 text-purple-600 dark:text-purple-400" />,
      title: 'TurboIntegrator (ETL)',
      subtitle: 'Extract, Transform, Load processes',
      exampleBg: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700',
      exampleLabel: 'Example TI Process',
      exampleLines: [
        { label: 'Process', value: 'Load_Revenue_Cube' },
        { label: 'Source', value: 'SQL ODBC' },
       
        { label: 'Target', value: 'Revenue Cube' },
      ],
    },
    {
      bg: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20',
      border: 'border-orange-300 dark:border-orange-700',
      icon: <Box size={32} className="mx-auto mb-2 text-orange-600 dark:text-orange-400" />,
      title: 'Dimensions',
      subtitle: null,
      grid: ['Time', 'Product', 'Customer', 'Employee', 'Entity', 'Account', 'Department', 'Version', 'Measure'],
      exampleBg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700',
      exampleLabel: 'Example: Time Dimension',
      exampleTree: [
        { indent: 0, label: '▶ Total Time' },
        { indent: 1, label: '▶ 2024' },
        { indent: 2, label: '▶ Q1 2024' },
        { indent: 3, label: 'Jan 2024' },
        { indent: 3, label: 'Feb 2024' },
        { indent: 3, label: 'Mar 2024' },
        { indent: 2, label: '▶ Q2 2024' },
      ],
    },
    {
      bg: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20',
      border: 'border-indigo-300 dark:border-indigo-700',
      icon: <Database size={32} className="mx-auto mb-2 text-indigo-600 dark:text-indigo-400" />,
      title: 'Cubes (Multi-dimensional Data Structures)',
      subtitle: null,
      grid: cubes.slice(0, 6).map(c => c.name),
      exampleBg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700',
      exampleLabel: 'Example: Revenue Cube Cell',
      exampleLines: [
        { label: 'Year', value: '2024' },
        { label: 'Entity', value: 'USA' },
        { label: 'Product', value: 'Widget A' },
        { label: 'Customer', value: 'Acme Corp' },
        { label: 'Scenario', value: 'Actual' },
        { label: 'Value', value: '$1,240,000' },
      ],
    },
    {
      bg: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20',
      border: 'border-yellow-300 dark:border-yellow-700',
      icon: <Zap size={32} className="mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />,
      title: 'Rules & Feeders',
      subtitle: 'Calculations and dependencies',
      exampleBg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
      exampleLabel: 'Example Rule',
      exampleCode: `# Gross Margin Rule\n['Gross Margin'] =\n  ['Revenue'] -\n  ['Cost of Goods Sold'];\n\n# Feeder\n['Revenue'] =>\n  ['Gross Margin'];`,
    },
    {
      bg: 'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20',
      border: 'border-pink-300 dark:border-pink-700',
      icon: <FileCode size={32} className="mx-auto mb-2 text-pink-600 dark:text-pink-400" />,
      title: 'Reports / Dashboards',
      subtitle: 'User interface and analytics',
      exampleBg: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-700',
      exampleLabel: 'Outputs Available',
      exampleLines: [
        { label: 'P&L Statement', value: 'Monthly' },
        { label: 'Balance Sheet', value: 'Quarterly' },
        { label: 'Revenue Dashboard', value: 'Live' },
        { label: 'Workforce Report', value: 'Weekly' },
      ],
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

        <div className="flex flex-col items-center gap-0">
          {flowSteps.map((step, idx) => (
            <div key={idx} className="w-full flex flex-col items-center">

              {/* Row: main card + side example */}
              <div className="w-full max-w-4xl flex items-stretch gap-4">

                {/* Main flow card */}
                <div className={`flex-1 bg-gradient-to-r ${step.bg} border-2 ${step.border} rounded-lg p-6 text-center`}>
                  {step.icon}
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{step.title}</h3>
                  {step.subtitle && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{step.subtitle}</p>
                  )}
                  {step.grid && (
                    <div className="grid grid-cols-2 gap-2 text-sm mt-3 text-gray-700 dark:text-gray-300">
                      {step.grid.map((item, i) => (
                        <div key={i}>{item}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Side example panel */}
                <div className={`w-64 shrink-0 border rounded-lg p-4 ${step.exampleBg} flex flex-col justify-center`}>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {step.exampleLabel}
                  </p>

                  {/* Key-value lines */}
                  {'exampleLines' in step && step.exampleLines && (
                    <div className="space-y-2">
                      {step.exampleLines.map((line, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{line.label}</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">{line.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Code block */}
                  {'exampleCode' in step && step.exampleCode && (
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {step.exampleCode}
                    </pre>
                  )}

                  {/* Tree */}
                  {'exampleTree' in step && step.exampleTree && (
                    <div className="space-y-1">
                      {step.exampleTree.map((node, i) => (
                        <div
                          key={i}
                          className="text-sm text-gray-700 dark:text-gray-300 font-mono"
                          style={{ paddingLeft: `${node.indent * 12}px` }}
                        >
                          {node.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow — centered under main card only, not the full row */}
              {idx < flowSteps.length - 1 && (
                <div className="w-full max-w-4xl flex gap-4 my-2">
                  <div className="flex-1 flex justify-center text-2xl text-gray-400">↓</div>
                  <div className="w-64 shrink-0" /> {/* spacer matches side panel width */}
                </div>
              )}

            </div>
          ))}
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