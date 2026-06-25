import { useEffect, useState } from 'react';
import { Loader2, Network } from 'lucide-react';
import { getDimensions, getDimensionDetails, getDimensionHierarchy, getDimensionElements } from '../services/api';
import HierarchyTree from '../components/HierarchyTree';

interface Dimension {
  dimension_id: string;
  dimension_name: string;
  description: string;
  element_count: number;
  has_hierarchy: boolean;
}

interface DimensionDetails {
  dimension_id: string;
  dimension_name: string;
  description: string;
  element_count: number;
  has_hierarchy: boolean;
  hierarchy_levels: number;
  attributes: string[];
}

export default function DimensionExplorer() {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [dimensionDetails, setDimensionDetails] = useState<DimensionDetails | null>(null);
  const [hierarchy, setHierarchy] = useState<any | null>(null);
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDimensions();
  }, []);

  useEffect(() => {
    if (selectedDimension) {
      loadDimensionDetails(selectedDimension);
      loadDimensionHierarchy(selectedDimension);
      loadDimensionElements(selectedDimension);
    }
  }, [selectedDimension]);

  const loadDimensions = async () => {
    try {
      setLoading(true);
      const res = await getDimensions();
      if (res.data.success) {
        setDimensions(res.data.data.dimensions || []);
        if (res.data.data.dimensions && res.data.data.dimensions.length > 0) {
          setSelectedDimension(res.data.data.dimensions[0].dimension_id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load dimensions:', err);
      setError('Failed to load dimensions from backend');
    } finally {
      setLoading(false);
    }
  };

  const loadDimensionDetails = async (dimensionId: string) => {
    try {
      const res = await getDimensionDetails(dimensionId);
      if (res.data.success) {
        setDimensionDetails(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load dimension details:', err);
    }
  };

  const loadDimensionHierarchy = async (dimensionId: string) => {
    try {
      const res = await getDimensionHierarchy(dimensionId);
      if (res.data.success) {
        setHierarchy(res.data.data.hierarchy);
      }
    } catch (err: any) {
      console.error('Failed to load hierarchy:', err);
    }
  };

  const loadDimensionElements = async (dimensionId: string) => {
    try {
      const res = await getDimensionElements(dimensionId, 100);
      if (res.data.success) {
        setElements(res.data.data.elements || []);
      }
    } catch (err: any) {
      console.error('Failed to load elements:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading dimensions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dimension Explorer</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">✅ Browse TM1 dimensions with real hierarchy from SQL Server</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dimension List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Dimensions</h2>
            <div className="space-y-2">
              {dimensions.map((dim) => (
                <button
                  key={dim.dimension_id}
                  onClick={() => setSelectedDimension(dim.dimension_id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedDimension === dim.dimension_id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center">
                    <Network className="w-4 h-4 mr-2 text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{dim.dimension_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{dim.element_count} elements</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dimension Details */}
        <div className="lg:col-span-3">
          {dimensionDetails && (
            <div className="space-y-6">
              {/* Metadata Card */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{dimensionDetails.dimension_name}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{dimensionDetails.description}</p>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Elements</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dimensionDetails.element_count}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Hierarchy</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dimensionDetails.has_hierarchy ? `${dimensionDetails.hierarchy_levels} levels` : 'Flat'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Attributes</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dimensionDetails.attributes.length}</p>
                  </div>
                </div>

                {dimensionDetails.attributes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Attributes</h3>
                    <div className="flex flex-wrap gap-2">
                      {dimensionDetails.attributes.map((attr, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm">
                          {attr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hierarchy Tree */}
              {hierarchy && dimensionDetails.has_hierarchy && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Hierarchy Structure</h3>
                  <HierarchyTree data={hierarchy} />
                </div>
              )}

              {/* Element List */}
              {elements.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Elements (Showing {elements.length} of {dimensionDetails.element_count})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          {Object.keys(elements[0]).map((key, idx) => (
                            <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {elements.map((element, idx) => (
                          <tr key={idx}>
                            {Object.values(element).map((value: any, vidx) => (
                              <td key={vidx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
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
    </div>
  );
}
