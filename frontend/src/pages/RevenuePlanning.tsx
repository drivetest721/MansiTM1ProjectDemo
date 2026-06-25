import { useState, useEffect, useRef, useCallback } from 'react';
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
import { THEME_COLORS, formatCurrency2dp } from '../theme/colors';
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
    scenario: 'all',
  });

  const fetchingRef = useRef(false);

  // Pivot configuration state
  const [showPivotDialog, setShowPivotDialog] = useState(false);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>({
    rowDimensions: ['Product'],
    columnDimensions: ['Time'],
    measures: ['Revenue', 'Cost', 'Quantity', 'Gross Margin', 'Gross Margin %', 'Avg Selling Price'],
  });

  const filterOptions: FilterOption[] = [
  {
    id: 'year',
    label: 'Year',
    options: Array.from({ length: 13 }, (_, i) => 2018 + i).map(y => ({ value: String(y), label: String(y) })),
  },
  {
    id: 'quarter',
    label: 'Quarter',
    options: [
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
      { value: 'North America', label: 'North America' },
      { value: 'Europe Middle East Africa', label: 'Europe Middle East Africa' },
      { value: 'Asia Pacific', label: 'Asia Pacific' },
    ],
  },
  {
    id: 'scenario',
    label: 'Scenario',
    options: [
      { value: 'Actual', label: 'Actual' },
      { value: 'Budget', label: 'Budget' },
      { value: 'Forecast', label: 'Forecast' },
    ],
  },
];

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => { controller.abort(); fetchingRef.current = false; };
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      // Prepare filter params (only include non-'all' values)
      const params: any = { page: 1, page_size: 100 };
      if (filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.quarter !== 'all') params.quarter = filters.quarter;
      if (filters.region !== 'all') params.region = filters.region;
      if (filters.scenario !== 'all') params.scenario = filters.scenario;

      // Build shared filter params — pass every active filter to aggregation endpoints
      const aggParams: Record<string, any> = {};
      if (filters.year !== 'all') aggParams.year = parseInt(filters.year);
      if (filters.quarter !== 'all') aggParams.quarter = filters.quarter;
      if (filters.region !== 'all') aggParams.region = filters.region;
      if (filters.scenario !== 'all') aggParams.scenario = filters.scenario;
      if (filters.entity !== 'all') aggParams.entity = filters.entity;

      // Load aggregations in parallel — all filters applied
      const [byProduct, byRegion, bySegment] = await Promise.all([
        getRevenueByProduct(aggParams),
        getRevenueByRegionAgg(aggParams),
        getRevenueByCustomerSegment(aggParams),
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
      const colors = THEME_COLORS;
      
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
      fetchingRef.current = false;
    }
  }, []);

  const handleResetFilters = () => {
    setFilters({
      year: 'all',
      quarter: 'all',
      region: 'all',
      entity: 'all',
      scenario: 'all',
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
    
  };

  const handleDrillDown = async (row: CubeRow) => {
    try {
      // Determine hierarchy: category -> family -> product
      const level = row.level || 'category';
      const hierarchyMap: Record<string, string> = {
        'category': 'family',
        'family': 'product',
      };
      
      const nextLevel = hierarchyMap[level];
      if (!nextLevel) {
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
      
      const response = await getRevenueDrillDown(params);
      // The response might be in response.data or response.data.data
      const responseData = response.data?.data || response.data || [];
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
      
      return children;
    } catch (error) {
      console.error('❌ Drill-down failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      return [];
    }
  };

  const formatCurrency = formatCurrency2dp;

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
          onClick={() => loadData()}
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Product Financial Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">TM1-style Interactive cube for analyzing product revenue and profitability metrics.</p>          
          <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
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
        onApply={setFilters}
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
            <PieChart className="p-3.5">
              <Pie
                data={revenueByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const { name, percent } = props;
                  if (!percent || !name) return '';
                  return `${name} ${(percent * 100).toFixed(2)}%`;
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

        {/* Gross Margin % by Region */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gross Margin % by Region</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueByRegion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="region" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" />
                <Tooltip formatter={(value: any) => value ? `${Number(value).toFixed(2)}%` : ''} />
              
                <Bar dataKey="margin" fill={THEME_COLORS[0]}
                  label={{ position: 'top', formatter: (v: any) => `${Number(v).toFixed(1)}%`, fontSize: 14, fill: '#374151', fontWeight: 'bold' }}
                />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Customer Segment */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Segment</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueBySegment} layout="vertical" className="p-3" margin={{top: 0, right: 50, bottom: 0, left: 3}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" tickFormatter={formatCurrency} stroke="#6b7280" />
              <YAxis type="category" dataKey="segment" stroke="#6b7280" />
              <Tooltip formatter={(value: any) => value ? formatCurrency(Number(value)) : ''} />
              <Bar dataKey="value" fill={THEME_COLORS[3]} 
                label={{ position: 'right', formatter: (v: any) => v ? formatCurrency(Number(v)) : '', fontSize: 14, fill: '#374151', fontWeight: 'bold' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      

      {/* Pivot Dialog */}
      <PivotDialog
        isOpen={showPivotDialog}
        onClose={() => setShowPivotDialog(false)}
        availableDimensions={['Product', 'Time', 'Customer', 'Region', 'Entity', 'Version']}
        currentRowDimensions={pivotConfig.rowDimensions}
        currentColumnDimensions={pivotConfig.columnDimensions}
        availableMeasures={['Revenue', 'Cost', 'Quantity', 'Margin', 'Margin %']}
        selectedMeasures={pivotConfig.measures}
        onApply={handlePivotApply}
      />
    </div>
  );
}
