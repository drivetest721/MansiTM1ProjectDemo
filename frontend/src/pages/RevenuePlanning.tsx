import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CubeGrid from '../components/CubeGrid';
import type { CubeRow } from '../components/CubeGrid';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import PivotDialog, { type PivotConfig } from '../components/PivotDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getRevenueByRegionAgg, getRevenueByProduct, getRevenueByCustomerSegment, getRevenueDrillDown } from '../services/api';
import { exportCubeToExcel } from '../utils/exportToExcel';
import { Settings2 } from 'lucide-react';
export default function RevenuePlanning() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cubeData, setCubeData] = useState<CubeRow[]>([]);
  const [revenueByCategory, setRevenueByCategory] = useState<any[]>([]);
  const [revenueBySegment, setRevenueBySegment] = useState<any[]>([]);
  const [revenueByRegion, setRevenueByRegion] = useState<any[]>([]);
  
  const [filters, setFilters] = useState<Record<string, string>>({
    year: 'all',
    quarter: 'all',
    region: 'all',
    entity: 'all',
    version: 'all',
  });

  // Pivot configuration state
  const [showPivotDialog, setShowPivotDialog] = useState(false);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>({
    rowDimensions: ['Product'],
    columnDimensions: ['Time'],
    measures: ['Revenue', 'Cost', 'Quantity', 'Margin', 'Margin %', 'Avg Selling Price'],
  });

  const filterOptions: FilterOption[] = [
    {
      id: 'year',
      label: 'Year',
      options: [
        { value: 'all', label: 'All Years' },
        ...Array.from({length: 13}, (_, i) => 2018 + i).map(y => ({ value: String(y), label: String(y) })),
      ],
    },
    {
      id: 'quarter',
      label: 'Quarter',
      options: [
        { value: 'all', label: 'All Quarters' },
        { value: 'Q1', label: 'Q1' },
        { value: 'Q2', label: 'Q2' },
        { value: 'Q3', label: 'Q3' },
        { value: 'Q4', label: 'Q4' },
      ],
    },
    {
      id: 'region',
      label: 'Region',
      options: [
        { value: 'all', label: 'All Regions' },
        { value: 'North America', label: 'North America' },
        { value: 'Europe Middle East Africa', label: 'Europe Middle East Africa' },
        { value: 'Asia Pacific', label: 'Asia Pacific' },
      ],
    },
    {
      id: 'version',
      label: 'Version',
      options: [
        { value: 'all', label: 'All Versions' },
        { value: 'Actual', label: 'Actual' },
        { value: 'Budget', label: 'Budget' },
        { value: 'Forecast', label: 'Forecast' },
      ],
    },
  ];

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Prepare filter params (only include non-'all' values)
      const params: any = { page: 1, page_size: 100 };
      if (filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.quarter !== 'all') params.quarter = filters.quarter;
      if (filters.region !== 'all') params.region = filters.region;
      if (filters.version !== 'all') params.version = filters.version;

      // Load cube data and aggregations in parallel
      const [byProduct, byRegion, bySegment] = await Promise.all([
        getRevenueByProduct(filters.year !== 'all' ? { year: parseInt(filters.year) } : {}),
        getRevenueByRegionAgg(filters.year !== 'all' ? { year: parseInt(filters.year) } : {}),
        getRevenueByCustomerSegment(filters.year !== 'all' ? { year: parseInt(filters.year) } : {}),
      ]);

      // Transform category data to CubeRow format (ROOT LEVEL - categories)
      const gridData: CubeRow[] = byProduct.data.data.map((category: any) => ({
        id: `category-${category.dimension_value}`,
        rowLabel: category.dimension_value,
        indent: 0,
        level: 'category',
        hasChildren: true, // Categories can drill down to families
        Revenue: category.revenue,
        Cost: category.cost,
        Quantity: category.quantity,
        Margin: category.margin,
        'Margin %': category.margin_percent,
        'Avg Selling Price': category.revenue / (category.quantity || 1),
      }));

      // Add grand total row
      const totalRevenue = gridData.reduce((sum, row) => sum + (row.Revenue as number), 0);
      const totalCost = gridData.reduce((sum, row) => sum + (row.Cost as number), 0);
      const totalMargin = gridData.reduce((sum, row) => sum + (row.Margin as number), 0);
      const totalQuantity = gridData.reduce((sum, row) => sum + (row.Quantity as number), 0);
      
      gridData.push({
        id: 'total',
        rowLabel: 'Grand Total',
        indent: 0,
        hasChildren: false,
        isTotal: true,
        Revenue: totalRevenue,
        Cost: totalCost,
        Quantity: totalQuantity,
        Margin: totalMargin,
        'Margin %': totalMargin / totalRevenue * 100,
        'Avg Selling Price': totalRevenue / totalQuantity,
      });

      setCubeData(gridData);

      // Transform aggregations for charts
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];
      
      setRevenueByCategory(
        byProduct.data.data.map((item: any, idx: number) => ({
          name: item.dimension_value,
          value: item.revenue,
          fill: colors[idx % colors.length],
        }))
      );

      setRevenueBySegment(
        bySegment.data.data.map((item: any) => ({
          segment: item.dimension_value,
          value: item.revenue,
        }))
      );

      setRevenueByRegion(
        byRegion.data.data.map((item: any) => ({
          region: item.dimension_value,
          revenue: item.revenue,
          margin: item.margin_percent,
        }))
      );

    } catch (err: any) {
      console.error('Error loading revenue data:', err);
      setError(err.message || 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterId: string, value: string) => {
    setFilters({ ...filters, [filterId]: value });
  };

  const handleResetFilters = () => {
    setFilters({
      year: 'all',
      quarter: 'all',
      region: 'all',
      entity: 'all',
      version: 'all',
    });
  };

  const handleExport = () => {
    try {
      exportCubeToExcel(
        cubeData,
        ['Revenue', 'Cost', 'Quantity', 'Margin', 'Margin %', 'Avg Selling Price'],
        'Revenue_Planning_Cube'
      );
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handlePivotApply = (config: PivotConfig) => {
    console.log('📊 Applying pivot configuration:', config);
    setPivotConfig(config);
    setShowPivotDialog(false);
    
    // Navigate to pivot table view with data and configuration
    navigate('/revenue-planning/pivot', {
      state: {
        title: 'Revenue Planning',
        sourceData: cubeData,
        pivotConfig: config,
        sourcePage: '/revenue-planning',
      },
    });
    
    console.log('✅ Navigating to pivot table view...');
  };

  const handleDrillDown = async (row: CubeRow) => {
    console.log('🔽 handleDrillDown called for row:', row);
    
    try {
      // Determine hierarchy: category -> family -> product
      const level = row.level || 'category';
      const hierarchyMap: Record<string, string> = {
        'category': 'family',
        'family': 'product',
      };
      
      const nextLevel = hierarchyMap[level];
      console.log('📍 Current level:', level, '→ Next level:', nextLevel);
      
      if (!nextLevel) {
        console.log('🛑 Leaf level reached, no children');
        return []; // Leaf level, no children
      }
      
      // Prepare drill-down parameters
      const params: any = {
        level: nextLevel,
        parent_value: row.rowLabel,
      };
      
      if (filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.region !== 'all') params.region = filters.region;
      if (filters.entity !== 'all') params.entity = filters.entity;
      
      console.log('📡 Calling API with params:', params);
      const response = await getRevenueDrillDown(params);
      console.log('📦 API Response:', response);
      
      // The response might be in response.data or response.data.data
      const responseData = response.data?.data || response.data || [];
      console.log('📊 Extracted data:', responseData);
      
      if (!Array.isArray(responseData)) {
        console.error('❌ Response data is not an array:', responseData);
        return [];
      }
      
      if (responseData.length === 0) {
        console.warn('⚠️ No children found for:', row.rowLabel);
        return [];
      }
      
      // Transform drill-down results to CubeRow format
      const children = responseData.map((item: any) => ({
        id: `${row.id}-${item.dimension_value}`,
        rowLabel: item.dimension_value,
        level: nextLevel,
        hasChildren: nextLevel === 'family', // Family level has products
        Revenue: item.revenue || 0,
        Cost: item.cost || 0,
        Quantity: item.quantity || 0,
        Margin: item.margin || 0,
        'Margin %': item.margin_percent || 0,
        'Avg Selling Price': (item.revenue || 0) / (item.quantity || 1),
      }));
      
      console.log('✅ Transformed children:', children);
      return children;
    } catch (error) {
      console.error('❌ Drill-down failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      return [];
    }
  };

  const formatCurrency = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        <button
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Revenue Planning</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">TM1-style revenue cube with drill-down capabilities</p>          <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <span className="font-semibold">📊 Drill-Down Hierarchy:</span>
            <span className="bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">Product Category</span>
            <span>→</span>
            <span className="bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">Product Family</span>
            <span>→</span>
            <span className="bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">Product Name</span>
          </div>        </div>
      </div>

      {/* Global Filters */}
      <GlobalFilters
        filters={filterOptions}
        values={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 mb-4">
        <button
          onClick={() => setShowPivotDialog(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition-colors shadow-sm"
        >
          <Settings2 size={18} />
          Pivot Options
        </button>
      </div>

      {/* Main Cube Grid */}
      <CubeGrid
        data={cubeData}
        measures={pivotConfig.measures}
        title="Revenue Cube View"
        showExport={true}
        onExport={handleExport}
        onDrillDown={handleDrillDown}
      />
      {/* Supporting Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Product Category */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={revenueByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const { name, percent } = props;
                  if (!percent || !name) return '';
                  return `${name} ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => value ? formatCurrency(Number(value)) : ''} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Margin % by Region */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Margin % by Region</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByRegion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="region" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" />
              <Tooltip formatter={(value: any) => value ? `${Number(value).toFixed(1)}%` : ''} />
              <Bar dataKey="margin" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Customer Segment */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Segment</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueBySegment} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" tickFormatter={formatCurrency} stroke="#6b7280" />
              <YAxis type="category" dataKey="segment" stroke="#6b7280" />
              <Tooltip formatter={(value: any) => value ? formatCurrency(Number(value)) : ''} />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
        <p className="text-sm text-indigo-800 dark:text-indigo-200">
          <strong>Cube Navigation:</strong> Click expand icons (▶) to drill down from Product Category → Product Family → Product Line. 
          Use global filters to slice data by time, geography, and version. Export to Excel for further analysis.
        </p>
      </div>

      {/* Pivot Dialog */}
      <PivotDialog
        isOpen={showPivotDialog}
        onClose={() => setShowPivotDialog(false)}
        availableDimensions={['Product', 'Time', 'Customer', 'Region', 'Entity', 'Version']}
        currentRowDimensions={pivotConfig.rowDimensions}
        currentColumnDimensions={pivotConfig.columnDimensions}
        availableMeasures={['Revenue', 'Cost', 'Quantity', 'Margin', 'Margin %', 'Avg Selling Price']}
        selectedMeasures={pivotConfig.measures}
        onApply={handlePivotApply}
      />
    </div>
  );
}
