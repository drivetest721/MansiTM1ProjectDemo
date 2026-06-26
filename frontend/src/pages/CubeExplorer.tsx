import { useEffect, useState } from 'react';
import { Loader2, Database } from 'lucide-react';
import { getCubes, getCubeDetails, getCubeSampleData } from '../services/api';
import AnnotationPanel from '../components/AnnotationPanel';

interface Cube {
  cube_id: string;
  cube_name: string;
  description: string;
  dimensions: string[];
  measures: string[];
  dimension_count: number;
  measure_count: number;
}

interface CubeDetails {
  cube_id: string;
  cube_name: string;
  description: string;
  dimensions: Array<{ name: string; type: string; count: number }>;
  measures: string[];
  cell_count: number;
  last_update: string;
}

export default function CubeExplorer() {
  const [cubes, setCubes] = useState<Cube[]>([]);
  const [selectedCube, setSelectedCube] = useState<string | null>(null);
  const [cubeDetails, setCubeDetails] = useState<CubeDetails | null>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCubes();
  }, []);

  useEffect(() => {
    if (selectedCube) {
      loadCubeDetails(selectedCube);
      loadSampleData(selectedCube);
    }
  }, [selectedCube]);

  const loadCubes = async () => {
    try {
      setLoading(true);
      const res = await getCubes();
      if (res.data.success) {
        setCubes(res.data.data || []);
        if (res.data.data && res.data.data.length > 0) {
          setSelectedCube(res.data.data[0].cube_id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load cubes:', err);
      setError('Failed to load cubes from backend');
    } finally {
      setLoading(false);
    }
  };

  const loadCubeDetails = async (cubeId: string) => {
    try {
      const res = await getCubeDetails(cubeId);
      if (res.data.success) {
        setCubeDetails(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load cube details:', err);
    }
  };

  const loadSampleData = async (cubeId: string) => {
    try {
      const res = await getCubeSampleData(cubeId, 20);
      if (res.data.success) {
        setSampleData(res.data.data.sample_data || []);
      }
    } catch (err: any) {
      console.error('Failed to load sample data:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading cubes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cube Explorer</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">✅ Explore TM1 cubes with real metadata from SQL Server</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Cube List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Available Cubes</h2>
            <div className="space-y-2">
              {cubes.map((cube) => (
                <button
                  key={cube.cube_id}
                  onClick={() => setSelectedCube(cube.cube_id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedCube === cube.cube_id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center">
                    <Database className="w-4 h-4 mr-2 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{cube.cube_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cube.dimension_count}D</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cube Details */}
        <div className="lg:col-span-3">
          {cubeDetails && (
            <div className="space-y-6">
              {/* Metadata Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{cubeDetails.cube_name}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{cubeDetails.description}</p>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Dimensions</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{cubeDetails.dimensions.length}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Measures</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{cubeDetails.measures.length}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Cell Count</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{cubeDetails.cell_count.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Dimensions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {cubeDetails.dimensions.map((dim, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{dim.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{dim.count} elements</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Measures</h3>
                  <div className="flex flex-wrap gap-2">
                    {cubeDetails.measures.map((measure, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                        {measure}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sample Data */}
              {sampleData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sample Data (First 20 rows)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          {Object.keys(sampleData[0]).map((key, idx) => (
                            <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sampleData.map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).map((value: any, vidx) => (
                              <td key={vidx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {typeof value === 'number' ? value.toLocaleString() : value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* <AnnotationPanel pageKey="cfo-cube-explorer" /> */}
    </div>
  );
}
