import { Database, Server, Clock, HardDrive, Activity, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDataHealth() {
  const systemStatus = [
    { label: 'SQL Server Status', value: 'Connected', status: 'success', icon: Server },
    { label: 'API Status', value: 'Online', status: 'success', icon: Activity },
    { label: 'Last Refresh', value: '2025-01-15 08:30 AM', status: 'success', icon: Clock },
    { label: 'Database Size', value: '47.3 GB', status: 'info', icon: HardDrive },
    { label: 'Total Fact Rows', value: '12.8M', status: 'info', icon: Database },
    { label: 'Total Dimension Rows', value: '284K', status: 'info', icon: Database },
  ];

  const tableHealth = [
    { table: 'Sales.vw_RevenueCube_Source', schema: 'Sales', rowCount: '2.4M', lastLoaded: '2025-01-15 08:15', businessArea: 'Revenue', status: 'success' },
    { table: 'HR.FactPayroll', schema: 'HR', rowCount: '1.8M', lastLoaded: '2025-01-15 08:18', businessArea: 'Workforce', status: 'success' },
    { table: 'Planning.FactBudget', schema: 'Planning', rowCount: '3.2M', lastLoaded: '2025-01-15 08:22', businessArea: 'Budget', status: 'success' },
    { table: 'Planning.FactForecast', schema: 'Planning', rowCount: '2.9M', lastLoaded: '2025-01-15 08:25', businessArea: 'Forecast', status: 'success' },
    { table: 'Finance.FactGL', schema: 'Finance', rowCount: '1.5M', lastLoaded: '2025-01-15 08:28', businessArea: 'P&L', status: 'success' },
    { table: 'Finance.FactBalanceSheet', schema: 'Finance', rowCount: '800K', lastLoaded: '2025-01-15 08:29', businessArea: 'Balance Sheet', status: 'success' },
    { table: 'Finance.FactConsolidation', schema: 'Finance', rowCount: '1.2M', lastLoaded: '2025-01-14 11:45', businessArea: 'Consolidation', status: 'warning' },
    { table: 'Dimensions.DimTime', schema: 'Dimensions', rowCount: '240', lastLoaded: '2025-01-01 00:00', businessArea: 'Master Data', status: 'success' },
    { table: 'Dimensions.DimProduct', schema: 'Dimensions', rowCount: '1.2K', lastLoaded: '2025-01-14 10:30', businessArea: 'Master Data', status: 'success' },
    { table: 'Dimensions.DimCustomer', schema: 'Dimensions', rowCount: '18.4K', lastLoaded: '2025-01-15 07:00', businessArea: 'Master Data', status: 'success' },
    { table: 'Dimensions.DimEmployee', schema: 'Dimensions', rowCount: '3.5K', lastLoaded: '2025-01-15 07:05', businessArea: 'Master Data', status: 'success' },
    { table: 'Dimensions.DimEntity', schema: 'Dimensions', rowCount: '42', lastLoaded: '2025-01-01 00:00', businessArea: 'Master Data', status: 'success' },
  ];

  const cubeHealth = [
    { cube: 'Revenue Cube', dimensions: 7, factRecords: '2.4M', cellCount: '856M', lastUpdate: '2025-01-15 08:15', status: 'success' },
    { cube: 'Workforce Cube', dimensions: 7, factRecords: '1.8M', cellCount: '642M', lastUpdate: '2025-01-15 08:18', status: 'success' },
    { cube: 'Budget Cube', dimensions: 7, factRecords: '3.2M', cellCount: '1.14B', lastUpdate: '2025-01-15 08:22', status: 'success' },
    { cube: 'Forecast Cube', dimensions: 7, factRecords: '2.9M', cellCount: '1.03B', lastUpdate: '2025-01-15 08:25', status: 'success' },
    { cube: 'P&L Cube', dimensions: 6, factRecords: '1.5M', cellCount: '534M', lastUpdate: '2025-01-15 08:28', status: 'success' },
    { cube: 'Balance Sheet Cube', dimensions: 5, factRecords: '800K', cellCount: '285M', lastUpdate: '2025-01-15 08:29', status: 'success' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin / Data Health</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Technical status and data quality monitoring</p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {systemStatus.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-l-4 ${
                stat.status === 'success'
                  ? 'border-green-500'
                  : stat.status === 'warning'
                  ? 'border-yellow-500'
                  : 'border-blue-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                </div>
                <Icon
                  size={32}
                  className={`${
                    stat.status === 'success'
                      ? 'text-green-500'
                      : stat.status === 'warning'
                      ? 'text-yellow-500'
                      : 'text-blue-500'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      

     
    </div>
  );
}
