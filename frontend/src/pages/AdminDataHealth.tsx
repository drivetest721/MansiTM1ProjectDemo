import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
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

  // Track which component sections are expanded. Default: all expanded.
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
  loadAllData();
}, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusRes, tablesRes, cubesRes, qualityRes] =
        await Promise.allSettled([
          getSystemStatus(),
          getTableHealth(),
          getCubeHealth(),
          getDataQuality(),
        ]);

      if (statusRes.status === 'fulfilled' && statusRes.value.data.success) {
        const data = statusRes.value.data.data;
        setSystemStatus(data);
        // Initialize expanded state for any new components (default: expanded)
        setExpandedSections((prev) => {
          const next = { ...prev };
          data.components.forEach((c: SystemComponent) => {
            if (next[c.name] === undefined) next[c.name] = true;
          });
          return next;
        });
      }

      if (tablesRes.status === 'fulfilled' && tablesRes.value.data.success)
        setTableHealth(tablesRes.value.data.data.tables || []);

      if (cubesRes.status === 'fulfilled' && cubesRes.value.data.success)
        setCubeHealth(cubesRes.value.data.data.cubes || []);

      if (qualityRes.status === 'fulfilled' && qualityRes.value.data.success)
        setDataQuality(qualityRes.value.data.data);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setError('Failed to connect to backend. Please ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (name: string) => {
    setExpandedSections((prev) => ({ ...prev, [name]: !prev[name] }));
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

  // Turns a details object into [{label, value}] KPI entries
  const detailsToKpis = (details: any) => {
    if (!details) return [];
    return Object.entries(details).map(([key, value]: [string, any]) => ({
      label: key.replace(/_/g, ' '),
      value: typeof value === 'number' ? value.toLocaleString() : String(value),
    }));
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

      {/* System Status — collapsible sections per component */}
      {systemStatus && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
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

          <div className="space-y-3">
            {systemStatus.components.map((component, idx) => {
              const color = getStatusColor(component.status);
              const isOpen = expandedSections[component.name] ?? true;
              const kpis = detailsToKpis(component.details);

              return (
                <div
                  key={idx}
                  className={`border-l-4 border-${color}-500 rounded-lg bg-gray-50 dark:bg-gray-700 overflow-hidden`}
                >
                  {/* Section header — click to toggle */}
                  <button
                    type="button"
                    onClick={() => toggleSection(component.name)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                      )}
                      <p className="text-md font-semibold text-gray-900 dark:text-white">
                        {component.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold text-${color}-600`}>
                        {component.status}
                      </span>
                      <span className={`text-xl text-${color}-500`}>
                        {getStatusIcon(component.status)}
                      </span>
                    </div>
                  </button>

                  {/* Collapsible KPI grid */}
                  {isOpen && (
                    <div className="px-4 pb-4">
                      {component.error ? (
                        <p className="text-lg text-red-600 dark:text-red-400">{component.error}</p>
                      ) : kpis.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {kpis.map((kpi) => (
                            <div
                              key={kpi.label}
                              className="bg-white dark:bg-gray-800 rounded-md shadow-sm p-3 border border-gray-200 dark:border-gray-600"
                            >
                              <p className="text-sm uppercase tracking-wide text-black dark:text-gray-400">
                                {kpi.label}
                              </p>
                              <p className="text-md font-semibold text-gray-900 dark:text-white mt-1 break-all">
                                {kpi.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No details available.</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                        Last check: {component.last_check}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}