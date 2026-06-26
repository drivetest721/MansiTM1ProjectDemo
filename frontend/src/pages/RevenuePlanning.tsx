import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CubeGrid from '../components/CubeGrid';
import type { CubeRow } from '../components/CubeGrid';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import PivotDialog, { type PivotConfig } from '../components/PivotDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getRevenueByRegionAgg, getRevenueByProduct, getRevenueByCustomerSegment, getRevenueDrillDown, getEntities } from '../services/api';
import { exportCubeToExcel } from '../utils/exportToExcel';
import { Settings2 } from 'lucide-react';
import { THEME_COLORS, formatCurrency2dp } from '../theme/colors';
import AnnotationPanel from '../components/AnnotationPanel';


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
  });

  // Dynamic options loaded from backend — start as undefined (not yet fetched)
  // undefined  = still loading | [] = fetched but empty (will be hidden) | [...] = has options (shown)
  const [entityOptions, setEntityOptions] = useState<{ value: string; label: string }[] | undefined>(undefined);
  const [regionOptions, setRegionOptions] = useState<{ value: string; label: string }[] | undefined>(undefined);
  const [filtersLoading, setFiltersLoading] = useState(true);

  const fetchingRef = useRef(false);

  // Pivot configuration state
  // NOTE: measure labels here ("Gross Margin", "Gross Margin %") must match
  // the keys used on each CubeRow exactly, since CubeGrid looks up
  // row.original[measure] using these strings verbatim.
  const [showPivotDialog, setShowPivotDialog] = useState(false);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>({
    rowDimensions: ['Product'],
    columnDimensions: ['Time'],
    measures: ['Revenue', 'Cost', 'Quantity', 'Gross Margin', 'Gross Margin %', 'Avg Selling Price'],
  });

  // Load filter options from backend on mount.
  // Rules:
  // Load filter options using the same endpoints that power the table.
  // Promise.allSettled ensures one failing call cannot wipe out the others.
  useEffect(() => {
    setFiltersLoading(true);
    (async () => {
      const [entResult, regionResult] = await Promise.allSettled([
        getEntities(),
        getRevenueByRegionAgg({}),
      ]);

      if (entResult.status === 'fulfilled') {
        setEntityOptions(
          (entResult.value.data?.data ?? []).map((e: any) => ({ value: e.entity_name, label: e.entity_name }))
        );
      } else {
        console.error('Entity options failed:', entResult.reason);
        setEntityOptions([]);
      }

      if (regionResult.status === 'fulfilled') {
        setRegionOptions(
          (regionResult.value.data?.data ?? []).map((r: any) => ({ value: r.dimension_value, label: r.dimension_value }))
        );
      } else {
        console.error('Region options failed:', regionResult.reason);
        setRegionOptions([]);
      }

      setFiltersLoading(false);
    })();
  }, []);

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
      options: regionOptions ?? [],
    },
    {
      id: 'entity',
      label: 'Entity',
      options: entityOptions ?? [],
    },
  ];

  const loadData = useCallback(async (signal?: AbortSignal) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Build shared filter params (only include non-'all' values)
      const aggParams: Record<string, any> = {};
      if (filters.year !== 'all') aggParams.year = parseInt(filters.year);
      if (filters.quarter !== 'all') aggParams.quarter = filters.quarter;
      if (filters.region !== 'all') aggParams.region = filters.region;
      if (filters.entity !== 'all') aggParams.entity = filters.entity;

      // Load aggregations in parallel — all filters applied
      const [byProduct, byRegion, bySegment] = await Promise.all([
        getRevenueByProduct(aggParams),
        getRevenueByRegionAgg(aggParams),
        getRevenueByCustomerSegment(aggParams),
      ]);

      // Transform category data to CubeRow format (ROOT LEVEL - categories)
      // NOTE: keys must exactly match the `measures` array above
      // ("Gross Margin" / "Gross Margin %"), not the old "Margin" / "Margin %".
      const gridData: CubeRow[] = byProduct.data.data.map((category: any) => {
        const quantity = category.quantity;
        return {
          id: `category-${category.dimension_value}`,
          rowLabel: category.dimension_value,
          indent: 0,
          level: 'category',
          hasChildren: true,
          Revenue: category.revenue,
          Cost: category.cost,
          Quantity: quantity,
          'Gross Margin': category.margin,
          'Gross Margin %': category.margin_percent,
          'Avg Selling Price': quantity ? category.revenue / quantity : undefined,
        };
      });

      // Add grand total row — guarded against undefined/NaN propagation
      const totalRevenue = gridData.reduce((sum, row) => sum + (Number(row.Revenue) || 0), 0);
      const totalCost = gridData.reduce((sum, row) => sum + (Number(row.Cost) || 0), 0);
      const totalMargin = gridData.reduce((sum, row) => sum + (Number(row['Gross Margin']) || 0), 0);
      const totalQuantity = gridData.reduce((sum, row) => sum + (Number(row.Quantity) || 0), 0);

      gridData.push({
        id: 'total',
        rowLabel: 'Grand Total',
        indent: 0,
        hasChildren: false,
        isTotal: true,
        Revenue: totalRevenue,
        Cost: totalCost,
        Quantity: totalQuantity > 0 ? totalQuantity : undefined,
        'Gross Margin': totalMargin,
        'Gross Margin %': totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0,
        'Avg Selling Price': totalQuantity > 0 ? totalRevenue / totalQuantity : undefined,
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
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => { controller.abort(); fetchingRef.current = false; };
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResetFilters = () => {
    setFilters({
      year: 'all',
      quarter: 'all',
      region: 'all',
      entity: 'all',
    });
  };

  const handleExport = () => {
    try {
      exportCubeToExcel(
        cubeData,
        ['Revenue', 'Cost', 'Quantity', 'Gross Margin', 'Gross Margin %', 'Avg Selling Price'],
        'Revenue_Planning_Cube'
      );
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handlePivotApply = (config: PivotConfig) => {
    setPivotConfig(config);
    setShowPivotDialog(false);

    navigate('/revenue-planning/pivot', {
      state: {
        title: 'Revenue Planning',
        sourceData: cubeData,
        pivotConfig: config,
        sourcePage: '/revenue-planning',
      },
    });
  };

  // Pass all active filters through drill-down
  const handleDrillDown = async (row: CubeRow) => {
    const level = row.level || 'category';
    const hierarchyMap: Record<string, string> = {
      'category': 'family',
      'family': 'product',
    };
    const nextLevel = hierarchyMap[level];
    if (!nextLevel) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const params: any = { level: nextLevel, parent_value: row.rowLabel };
      if (filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.region !== 'all') params.region = filters.region;
      if (filters.entity !== 'all') params.entity = filters.entity;
      if (filters.quarter !== 'all') params.quarter = filters.quarter;

      const response = await getRevenueDrillDown(params);
      const responseData = response.data?.data || response.data || [];
      if (!Array.isArray(responseData) || responseData.length === 0) return [];

      return responseData.map((item: any) => ({
        id: `${row.id}-${item.dimension_value}`,
        rowLabel: item.dimension_value,
        level: nextLevel,
        hasChildren: nextLevel === 'family',
        Revenue: item.revenue || 0,
        Cost: item.cost || 0,
        Quantity: item.quantity || 0,
        'Gross Margin': item.margin || 0,
        'Gross Margin %': item.margin_percent || 0,
        'Avg Selling Price': (item.revenue || 0) / (item.quantity || 1),
      }));
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
        console.error('Drill-down timed out');
      } else {
        console.error('Drill-down failed:', error);
      }
      return [];
    } finally {
      clearTimeout(timeout);
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
          </div>
        </div>
      </div>

      {/* Global Filters — shown once at least the static filters are defined.
          Dynamic filters (Region, Entity, Scenario) appear only after their
          options have loaded from the backend. If an API returns no data for a
          dimension, that filter is simply omitted rather than showing an empty
          dropdown. A loading badge is shown while metadata is still fetching. */}
      <div className="relative">
        {filtersLoading && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <div className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-indigo-500" />
            Loading filters…
          </div>
        )}
        <GlobalFilters
          filters={filterOptions}
          values={filters}
          onApply={setFilters}
          onReset={handleResetFilters}
        />
      </div>

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
            <BarChart data={revenueBySegment} layout="vertical" className="p-3" margin={{ top: 0, right: 50, bottom: 0, left: 3 }}>
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
        availableMeasures={['Revenue', 'Cost', 'Quantity', 'Gross Margin', 'Gross Margin %']}
        selectedMeasures={pivotConfig.measures}
        onApply={handlePivotApply}
      />
    </div>
  );
}
