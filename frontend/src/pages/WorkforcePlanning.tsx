import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CubeGrid from '../components/CubeGrid';
import type { CubeRow } from '../components/CubeGrid';
import GlobalFilters from '../components/GlobalFilters';
import type { FilterOption } from '../components/GlobalFilters';
import PivotDialog, { type PivotConfig } from '../components/PivotDialog';
import MetricCard from '../components/MetricCard';
import { Users, DollarSign, TrendingUp, Award, Building2, UserCheck, Settings2 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getWorkforceByDepartment, getWorkforceByJobLevel, getWorkforceByEntity, getWorkforceDrillDown } from '../services/api';
import { exportCubeToExcel } from '../utils/exportToExcel';
import { THEME_COLORS, formatCurrency2dp } from '../theme/colors';


export default function WorkforcePlanning() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cubeData, setCubeData] = useState<CubeRow[]>([]);
  const [kpiData, setKpiData] = useState<any[]>([]);
  const [byDepartment, setByDepartment] = useState<any[]>([]);
  const [byJobLevel, setByJobLevel] = useState<any[]>([]);
  const [byEntity, setByEntity] = useState<any[]>([]);
  
  const [filters, setFilters] = useState<Record<string, string>>({
    year: 'all',
    entity: 'all',
    department: 'all',
    jobLevel: 'all',
    version: 'all',
  });

  // Pivot configuration state
  const [showPivotDialog, setShowPivotDialog] = useState(false);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>({
    rowDimensions: ['Department'],
    columnDimensions: ['Time'],
    measures: ['Headcount', 'Base Salary', 'Bonus', 'Benefits', 'Total Compensation'],
  });

  const fetchingRef = useRef(false);

  const filterOptions: FilterOption[] = [
    {
      id: 'year',
      label: 'Year',
      options: [
        
        ...Array.from({length: 13}, (_, i) => 2018 + i).map(y => ({ value: String(y), label: String(y) })),
      ],
    },
    {
      id: 'department',
      label: 'Department',
      options: [
       
        { value: 'Sales', label: 'Sales' },
        { value: 'Engineering', label: 'Engineering' },
        { value: 'Marketing', label: 'Marketing' },
        { value: 'Operations', label: 'Operations' },
      ],
    },
    {
      id: 'jobPosition',
      label: 'Job Position',
      options: [
       
        { value: 'Executive', label: 'Executive' },
        { value: 'Senior', label: 'Senior' },
        { value: 'Mid', label: 'Mid' },
        { value: 'Junior', label: 'Junior' },
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
  }, [filters]);

  const loadData = useCallback(async (_signal?: AbortSignal) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    try {
      const params: any = { page: 1, page_size: 100 };
      if (filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.department !== 'all') params.department = filters.department;
      if (filters.jobLevel !== 'all') params.job_level = filters.jobLevel;
      if (filters.version !== 'all') params.version = filters.version;

      // Build shared filter params — pass every active filter
      const aggParams: Record<string, any> = {};
      if (filters.year !== 'all') aggParams.year = parseInt(filters.year);
      if (filters.department !== 'all') aggParams.department = filters.department;
      if (filters.entity !== 'all') aggParams.entity = filters.entity;
      if (filters.jobLevel !== 'all') aggParams.job_level = filters.jobLevel;
      if (filters.version !== 'all') aggParams.version = filters.version;

      const [byDept, byLevel, byEnt] = await Promise.all([
        getWorkforceByDepartment(aggParams),
        getWorkforceByJobLevel(aggParams),
        getWorkforceByEntity(aggParams),
      ]);

      // Transform department data to CubeRow format (ROOT LEVEL - departments)
      const gridData: CubeRow[] = byDept.data.data.map((dept: any) => ({
        id: `dept-${dept.dimension_value}`,
        rowLabel: dept.dimension_value,
        indent: 0,
        level: 'department',
        hasChildren: true, // Departments can drill down to cost centers
        Headcount: dept.headcount,
        'Base Salary': dept.base_salary,
        Bonus: dept.bonus,
        Benefits: dept.benefits,
        'Total Compensation': dept.total_compensation,
        'Avg Salary': dept.avg_compensation,
      }));

      const totalCompensation = gridData.reduce((sum, row) => sum + (row['Total Compensation'] as number), 0);
      const totalBaseSalary = gridData.reduce((sum, row) => sum + (row['Base Salary'] as number), 0);
      const totalBonus = gridData.reduce((sum, row) => sum + (row.Bonus as number), 0);
      const totalBenefits = gridData.reduce((sum, row) => sum + (row.Benefits as number), 0);
      
      gridData.push({
        id: 'total',
        rowLabel: 'Grand Total',
        indent: 0,
        hasChildren: false,
        isTotal: true,
        Headcount: gridData.length,
        'Base Salary': totalBaseSalary,
        Bonus: totalBonus,
        Benefits: totalBenefits,
        'Total Compensation': totalCompensation,
        'Avg Salary': totalCompensation / gridData.length,
      });

      setCubeData(gridData);

      // Calculate KPIs from aggregated data
      const totalHeadcount = byDept.data.data.reduce((sum: number, d: any) => sum + d.headcount, 0);
      const totalComp = byDept.data.data.reduce((sum: number, d: any) => sum + d.total_compensation, 0);
      const avgComp = totalComp / totalHeadcount;

      setKpiData([
        { title: 'Total Headcount', value: totalHeadcount.toLocaleString(), icon: Users, color: 'text-blue-600' },
        { title: 'Total Compensation', value: `$${(totalComp / 1000000).toFixed(1)}M`, icon: DollarSign, color: 'text-green-600' },
       
      ]);

      // Transform aggregations for charts
      const colors = THEME_COLORS;

      
      setByDepartment(
        byDept.data.data.slice(0, 10).map((item: any, idx: number) => ({
          name: item.dimension_value,
          value: item.headcount,
          fill: colors[idx % colors.length],
        }))
      );

      setByJobLevel(
        byLevel.data.data.map((item: any) => ({
          level: item.dimension_value,
          headcount: item.headcount,
          avgComp: item.avg_compensation,
        }))
      );

      setByEntity(
        byEnt.data.data.map((item: any) => ({
          entity: item.dimension_value,
          headcount: item.headcount,
          compensation: item.total_compensation,
        }))
      );

    } catch (err: any) {
      console.error('Error loading workforce data:', err);
      setError(err.message || 'Failed to load workforce data');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      year: 'all',
      entity: 'all',
      department: 'all',
      jobLevel: 'all',
      version: 'all',
    });
  };

  const handleExport = () => {
    try {
      exportCubeToExcel(
        cubeData,
        ['Headcount', 'Base Salary', 'Bonus', 'Benefits', 'Total Compensation', 'Avg Salary'],
        'Workforce_Planning_Cube'
      );
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handlePivotApply = (config: PivotConfig) => {
    setPivotConfig(config);
    setShowPivotDialog(false);
    
    // Navigate to pivot table view with data and configuration
    navigate('/workforce-planning/pivot', {
      state: {
        title: 'Workforce Planning',
        sourceData: cubeData,
        pivotConfig: config,
        sourcePage: '/workforce-planning',
      },
    });
    
  };

  const handleDrillDown = async (row: CubeRow) => {
    try {
      // Determine hierarchy: department -> cost_center -> employee
      const level = row.level || 'department';
      const hierarchyMap: Record<string, string> = {
        'department': 'cost_center',
        'cost_center': 'employee',
      };
      
      const nextLevel = hierarchyMap[level];
      if (!nextLevel) return []; // Leaf level, no children
      
      // Prepare drill-down parameters
      const params: any = {
        level: nextLevel,
        parent_value: row.rowLabel,
      };
      
      if (filters.year !== 'all') params.year = parseInt(filters.year);
      if (filters.entity !== 'all') params.entity = filters.entity;
      
      const response = await getWorkforceDrillDown(params);
      
      // Transform drill-down results to CubeRow format
      return response.data.map((item: any) => ({
        id: `${row.id}-${item.dimension_value}`,
        rowLabel: item.dimension_value,
        level: nextLevel,
        hasChildren: nextLevel === 'cost_center', // Cost centers have employees
        Headcount: item.employee_count || 1,
        'Base Salary': item.base_salary,
        Bonus: item.bonus,
        Benefits: item.benefits,
        'Total Compensation': item.total_compensation,
        'Avg Salary': item.total_compensation / (item.employee_count || 1),
      }));
    } catch (error) {
      console.error('Drill-down failed:', error);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Workforce Reporting</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Employee compensation and headcount analysis</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
            <span className="font-semibold">📊 Drill-Down Hierarchy:</span>
            <span className="bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">Department</span>
            <span>→</span>
            <span className="bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">Cost Center</span>
            <span>→</span>
            <span className="bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">Employee</span>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {kpiData.map((kpi, index) => (
          <MetricCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            iconColor={kpi.color}
          />
        ))}
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
        title="Workforce Cube View"
        showExport={true}
        onExport={handleExport}
        onDrillDown={handleDrillDown}
      />

      {/* Supporting Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Headcount by Department */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Headcount by Department</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={byDepartment}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(props: any) => {
                  const { name, percent } = props;
                  if (!percent || !name) return '';
                  return `${name.split(' ')[0]} ${(percent * 100).toFixed(2)}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {byDepartment.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Compensation by Job Level */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Avg Comp by Level</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byJobLevel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="level" stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6b7280" tickFormatter={(value: any) => `$${(value / 1000000).toFixed(2)}M`} />
              <Tooltip formatter={(value: any) => value ? formatCurrency(Number(value)) : ''} />
              <Bar dataKey="avgComp" fill={THEME_COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Compensation by Entity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Total Comp by Entity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={byEntity} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" tickFormatter={formatCurrency} stroke="#6b7280" />
              <YAxis type="category" dataKey="entity" stroke="#6b7280" width={100} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: any) => value ? `$${(Number(value) / 1000000).toFixed(2)}M` : ''} />
              <Bar dataKey="compensation" fill={THEME_COLORS[4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      
      {/* Pivot Dialog */}
      <PivotDialog
        isOpen={showPivotDialog}
        onClose={() => setShowPivotDialog(false)}
        availableDimensions={['Department', 'Time', 'Job Level', 'Entity', 'Employment Status', 'Version']}
        currentRowDimensions={pivotConfig.rowDimensions}
        currentColumnDimensions={pivotConfig.columnDimensions}
        availableMeasures={['Headcount', 'Base Salary', 'Bonus', 'Benefits', 'Total Compensation', 'Avg Salary']}
        selectedMeasures={pivotConfig.measures}
        onApply={handlePivotApply}
      />
    </div>
  );
}
