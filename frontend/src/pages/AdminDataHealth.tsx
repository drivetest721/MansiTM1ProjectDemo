import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { getSystemStatus, getTableHealth, getCubeHealth, getDataQuality } from '../services/api';

interface SystemComponent {
  name: string;
  status: string;
  details?: any;
  last_check: string;
  error?: string;
}

interface SystemStatus {
  timestamp: string;
  overall_status: string;
  components: SystemComponent[];
}

interface TableHealthItem {
  schema_name: string;
  table_name: string;
  full_name: string;
  row_count: number;
  total_size_mb: number;
  last_update: string | null;
  status: string;
}

interface CubeHealthItem {
  cube_name: string;
  dimension_count: number;
  cell_count: number;
  last_year: number;
  status: string;
  health: string;
}

interface DataQualityCheck {
  view_name: string;
  total_rows: number;
  null_accounts: number;
  null_amounts: number;
  quality_score: number;
  status: string;
}

interface DataQuality {
  timestamp: string;
  overall_quality: number;
  overall_status: string;
  checks: DataQualityCheck[];
}

export default function AdminDataHealth() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [tableHealth, setTableHealth] = useState<TableHealthItem[]>([]);
  const [cubeHealth, setCubeHealth] = useState<CubeHealthItem[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
    // Refresh every 30 seconds
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [statusRes, tablesRes, cubesRes, qualityRes] = await Promise.all([
        getSystemStatus(),
        getTableHealth(),
        getCubeHealth(),
        getDataQuality()
      ]);

      if (statusRes.data.success) {
        setSystemStatus(statusRes.data.data);
      }

      if (tablesRes.data.success) {
        setTableHealth(tablesRes.data.data.tables || []);
      }

      if (cubesRes.data.success) {
        setCubeHealth(cubesRes.data.data.cubes || []);
      }

      if (qualityRes.data.success) {
        setDataQuality(qualityRes.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setError('Failed to connect to backend. Please ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !systemStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading system health...</span>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'success':
      case 'excellent':
        return 'green';
      case 'warning':
      case 'good':
      case 'stale':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'blue';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'success':
      case 'excellent':
        return '✓';
      case 'warning':
      case 'good':
      case 'stale':
        return '⚠';
      case 'error':
        return '✕';
      default:
        return 'ℹ';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin / Data Health</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">✅ Real-time system health monitoring from SQL Server</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            <AlertTriangle className="inline w-4 h-4 mr-2" />
            {error}
          </p>
        </div>
      )}

      {/* System Status Cards */}
      {systemStatus && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              System Status
              <span className={`ml-3 text-sm px-3 py-1 rounded-full ${
                systemStatus.overall_status === 'healthy' 
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                  : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
              }`}>
                {systemStatus.overall_status.toUpperCase()}
              </span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {systemStatus.components.map((component, idx) => {
                const color = getStatusColor(component.status);
                return (
                  <div
                    key={idx}
                    className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-${color}-500`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{component.name}</p>
                        <p className={`text-lg font-semibold mt-1 text-${color}-600`}>
                          {component.status}
                        </p>
                        {component.details && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {Object.entries(component.details).map(([key, value]: [string, any]) => (
                              <div key={key}>
                                {key.replace(/_/g, ' ')}: {typeof value === 'number' ? value.toLocaleString() : value}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`text-2xl text-${color}-500`}>{getStatusIcon(component.status)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Quality Summary */}
          {dataQuality && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Data Quality
                <span className={`ml-3 text-sm px-3 py-1 rounded-full ${
                  dataQuality.overall_quality >= 95 
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : dataQuality.overall_quality >= 80
                    ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                }`}>
                  Score: {dataQuality.overall_quality.toFixed(1)}%
                </span>
              </h2>
              
              <div className="space-y-3">
                {dataQuality.checks.map((check, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{check.view_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {check.total_rows.toLocaleString()} rows
                          {check.null_accounts > 0 && ` • ${check.null_accounts} null accounts`}
                          {check.null_amounts > 0 && ` • ${check.null_amounts} null amounts`}
                        </p>
                      </div>
                      <span className={`text-lg font-bold ${
                        check.quality_score >= 95 ? 'text-green-600' :
                        check.quality_score >= 80 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {check.quality_score.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Table Health */}
      {tableHealth.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Table Health</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {tableHealth.length} tables monitored • Total: {tableHealth.reduce((sum, t) => sum + t.total_size_mb, 0).toFixed(2)} MB
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Table Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Schema
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Row Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Size (MB)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Update
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tableHealth.map((table, idx) => {
                  const color = getStatusColor(table.status);
                  return (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {table.table_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {table.schema_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {table.row_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {table.total_size_mb.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {table.last_update ? new Date(table.last_update).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-${color}-100 text-${color}-800`}>
                          {table.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cube Health */}
      {cubeHealth.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cube Health</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {cubeHealth.length} cubes monitored • Total: {cubeHealth.reduce((sum, c) => sum + c.cell_count, 0).toLocaleString()} cells
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cube Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Dimensions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cell Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Health
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {cubeHealth.map((cube, idx) => {
                  const color = getStatusColor(cube.health);
                  return (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {cube.cube_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cube.dimension_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {cube.cell_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {cube.last_year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-${color}-100 text-${color}-800`}>
                          {cube.health}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Real-time indicator */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Last updated: {systemStatus ? new Date(systemStatus.timestamp).toLocaleString() : 'Loading...'}
        <br />
        Auto-refresh every 30 seconds
      </div>
    </div>
  );
}
