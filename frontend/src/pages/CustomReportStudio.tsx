/**
 * CustomReportStudio.tsx
 *
 * PAX-style web exploration tool.
 * Pick a cube → assign dimensions to Rows / Column / Filters → see live pivot → export.
 *
 * Export modes:
 *   "With formulas"    → .xlsx where grand-total cells use =SUM(...) formulas
 *   "Without formulas" → .xlsx with plain computed values only
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Database, ChevronRight, ChevronDown, X, Plus, Download,
  FileSpreadsheet, Loader2, RefreshCw, Filter, LayoutGrid,
  Rows, Columns, SlidersHorizontal, Info, Save, CheckCircle
} from 'lucide-react';
// @ts-ignore
import XLSXStyle from 'xlsx-js-style';
import {
  getRevenueCube,
  getWorkforceCube,
  getVariance,
} from '../services/api';
import { useReportContext } from '../context/ReportContext';

// ─── Types ─────────────────────────────────────────────────────────────────

type DataSource = 'revenue' | 'workforce' | 'budget';

interface FieldDef {
  key: string;
  label: string;
  type: 'dimension' | 'measure';
}

interface CubeDef {
  id: DataSource;
  label: string;
  description: string;
  fields: FieldDef[];
  defaultRows: string[];
  defaultCol: string;
  defaultMeasures: string[];
}

interface StudioConfig {
  dataSource: DataSource;
  rowDimensions: string[];
  columnDimension: string | null;
  filters: Record<string, string[]>;   // dim key → selected member values
  measures: string[];
}

// ─── Cube definitions ──────────────────────────────────────────────────────

const CUBES: CubeDef[] = [
  {
    id: 'revenue',
    label: 'Revenue Cube',
    description: 'Sales revenue, cost, margin & quantity by product, region, time',
    fields: [
      { key: 'year',             label: 'Year',             type: 'dimension' },
      { key: 'quarter',          label: 'Quarter',          type: 'dimension' },
      { key: 'month',            label: 'Month',            type: 'dimension' },
      { key: 'region',           label: 'Region',           type: 'dimension' },
      { key: 'entity',           label: 'Entity',           type: 'dimension' },
      { key: 'product_category', label: 'Product Category', type: 'dimension' },
      { key: 'customer_segment', label: 'Customer Segment', type: 'dimension' },
      { key: 'revenue',          label: 'Revenue',          type: 'measure'   },
      { key: 'cost',             label: 'COGS',             type: 'measure'   },
      { key: 'margin',           label: 'Margin',           type: 'measure'   },
      { key: 'quantity',         label: 'Quantity',         type: 'measure'   },
    ],
    defaultRows:    ['product_category'],
    defaultCol:     'region',
    defaultMeasures:['revenue', 'margin'],
  },
  {
    id: 'workforce',
    label: 'Workforce Cube',
    description: 'Headcount, compensation & payroll by department, entity, time',
    fields: [
      { key: 'year',               label: 'Year',               type: 'dimension' },
      { key: 'month',              label: 'Month',              type: 'dimension' },
      { key: 'entity',             label: 'Entity',             type: 'dimension' },
      { key: 'department',         label: 'Department',         type: 'dimension' },
      { key: 'cost_center',        label: 'Cost Center',        type: 'dimension' },
      { key: 'job_level',          label: 'Job Level',          type: 'dimension' },
      { key: 'base_salary',        label: 'Base Salary',        type: 'measure'   },
      { key: 'bonus',              label: 'Bonus',              type: 'measure'   },
      { key: 'benefits',           label: 'Benefits',           type: 'measure'   },
      { key: 'total_compensation', label: 'Total Compensation', type: 'measure'   },
    ],
    defaultRows:    ['department'],
    defaultCol:     'entity',
    defaultMeasures:['total_compensation'],
  },
];

// ─── Suggested report templates per cube ──────────────────────────────────

interface SuggestedReport {
  label:    string;
  desc:     string;
  rows:     string[];
  col:      string | null;
  measures: string[];
}

const CUBE_SUGGESTIONS: Record<DataSource, SuggestedReport[]> = {
  revenue: [
    {
      label: 'Revenue by Region',
      desc: 'Product categories × regions — Revenue & Margin',
      rows: ['product_category'], col: 'region', measures: ['revenue', 'margin'],
    },
    {
      label: 'Monthly Revenue Trend',
      desc: 'Product categories × months — Revenue',
      rows: ['product_category'], col: 'month', measures: ['revenue'],
    },
    {
      label: 'Customer Segment Analysis',
      desc: 'Products × customer segments — Revenue & Cost',
      rows: ['product_category'], col: 'customer_segment', measures: ['revenue', 'cost'],
    },
  ],
  workforce: [
    {
      label: 'Payroll by Entity',
      desc: 'Departments × entities — Total Compensation',
      rows: ['department'], col: 'entity', measures: ['total_compensation'],
    },
    {
      label: 'Compensation Breakdown',
      desc: 'Job levels — Base Salary, Bonus & Benefits',
      rows: ['job_level'], col: null, measures: ['base_salary', 'bonus', 'benefits'],
    },
    {
      label: 'Annual Payroll Trend',
      desc: 'Departments × years — Total Compensation',
      rows: ['department'], col: 'year', measures: ['total_compensation'],
    },
  ],
  budget: [],
};

// ─── API fetcher ───────────────────────────────────────────────────────────

async function fetchCubeData(
  source: DataSource,
  year?: number,
  entity?: string,
): Promise<any[]> {
  try {
    const params: Record<string, any> = { page_size: 2000 };
    if (year)   params.year   = year;
    if (entity) params.entity = entity;

    let res: any;
    if (source === 'revenue')        res = await getRevenueCube(params);
    else if (source === 'workforce') res = await getWorkforceCube(params);
    else                             res = await getVariance(params);

    const payload = res?.data;
    if (!payload) return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.success && Array.isArray(payload.data?.data)) return payload.data.data;
    return [];
  } catch (err) {
    console.error('CustomReportStudio fetchCubeData error:', err);
    return [];
  }
}

// ─── Pivot engine ──────────────────────────────────────────────────────────

interface PivotResult {
  rowKeys:    string[];        // unique row labels (joined)
  colValues:  string[];        // unique column dimension values
  measures:   string[];
  cells:      Record<string, Record<string, Record<string, number>>>;
  // cells[rowKey][colValue][measure] = aggregated value
  rowTotals:  Record<string, Record<string, number>>;
  // rowTotals[rowKey][measure] = row grand total
  colTotals:  Record<string, Record<string, number>>;
  // colTotals[colValue][measure] = col grand total
  grandTotal: Record<string, number>;
}

function buildPivot(
  rawData: any[],
  config: StudioConfig,
  cubeDef: CubeDef,
): PivotResult {
  const { rowDimensions, columnDimension, filters, measures } = config;

  // 1. Apply filters
  let data = rawData;
  for (const [dimKey, selectedVals] of Object.entries(filters)) {
    if (selectedVals.length > 0) {
      data = data.filter((r) => selectedVals.includes(String(r[dimKey] ?? '')));
    }
  }

  // 2. Collect unique col values
  const colValSet = new Set<string>();
  if (columnDimension) {
    data.forEach((r) => colValSet.add(String(r[columnDimension] ?? 'Unknown')));
  }
  const colValues = Array.from(colValSet).sort();

  // 3. Group by row key
  const rowKeySet = new Set<string>();
  const cells: Record<string, Record<string, Record<string, number>>> = {};
  const rowTotals: Record<string, Record<string, number>> = {};
  const colTotals: Record<string, Record<string, number>> = {};
  const grandTotal: Record<string, number> = {};

  measures.forEach((m) => (grandTotal[m] = 0));

  data.forEach((row) => {
    const rowKey = rowDimensions.map((d) => String(row[d] ?? 'Unknown')).join(' › ');
    const colVal = columnDimension ? String(row[columnDimension] ?? 'Unknown') : '__total__';

    rowKeySet.add(rowKey);

    if (!cells[rowKey]) cells[rowKey] = {};
    if (!cells[rowKey][colVal]) cells[rowKey][colVal] = {};
    if (!rowTotals[rowKey]) { rowTotals[rowKey] = {}; measures.forEach((m) => (rowTotals[rowKey][m] = 0)); }
    if (!colTotals[colVal]) { colTotals[colVal] = {}; measures.forEach((m) => (colTotals[colVal][m] = 0)); }

    measures.forEach((m) => {
      const v = Number(row[m]) || 0;
      cells[rowKey][colVal][m] = (cells[rowKey][colVal][m] ?? 0) + v;
      rowTotals[rowKey][m] += v;
      colTotals[colVal][m] += v;
      grandTotal[m] += v;
    });
  });

  return {
    rowKeys: Array.from(rowKeySet).sort(),
    colValues,
    measures,
    cells,
    rowTotals,
    colTotals,
    grandTotal,
  };
}

// ─── Formatters ────────────────────────────────────────────────────────────

function fmt(value: number, measure: string): string {
  if (value === undefined || value === null || isNaN(value)) return '–';
  const l = measure.toLowerCase();
  if (l.includes('quantity') || l.includes('count') || l.includes('headcount')) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000)     return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function isNegative(value: number, measure: string) {
  return (measure.toLowerCase().includes('variance') || measure.toLowerCase().includes('margin')) && value < 0;
}

// ─── Export helpers ────────────────────────────────────────────────────────

const STYLES = {
  headerFill: { patternType: 'solid', fgColor: { rgb: '2563EB' } },
  totalFill:  { patternType: 'solid', fgColor: { rgb: 'DBEAFE' } },
  subFill:    { patternType: 'solid', fgColor: { rgb: 'F3F4F6' } },
  whiteBold:  { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 },
  bold:       { bold: true },
  red:        { color: { rgb: 'DC2626' }, bold: true },
  green:      { color: { rgb: '16A34A' }, bold: true },
  border: {
    top:    { style: 'thin', color: { rgb: 'D1D5DB' } },
    bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
    left:   { style: 'thin', color: { rgb: 'D1D5DB' } },
    right:  { style: 'thin', color: { rgb: 'D1D5DB' } },
  },
};

function xlCell(v: any, opts: { header?: boolean; total?: boolean; formula?: string; measure?: string } = {}) {
  const isNum = typeof v === 'number' && !isNaN(v);
  const fill  = opts.header ? STYLES.headerFill : opts.total ? STYLES.totalFill : undefined;
  const font  = opts.header ? STYLES.whiteBold
              : opts.total  ? STYLES.bold
              : isNum && opts.measure?.toLowerCase().includes('variance') && v < 0 ? STYLES.red
              : isNum && opts.measure?.toLowerCase().includes('variance') && v > 0 ? STYLES.green
              : undefined;

  const c: any = {
    v: opts.formula ? 0 : (v ?? ''),
    t: opts.formula ? 'f' : isNum ? 'n' : 's',
    s: {
      ...(fill ? { fill } : {}),
      ...(font ? { font } : {}),
      border: STYLES.border,
      alignment: { horizontal: isNum || opts.formula ? 'right' : 'left', vertical: 'center' },
    },
  };
  if (opts.formula) { c.f = opts.formula; c.t = 'f'; }
  if (isNum && !opts.formula) {
    c.z = opts.measure?.toLowerCase().includes('quantity') ? '#,##0' : '"$"#,##0';
  }
  return c;
}

function exportPivot(pivot: PivotResult, config: StudioConfig, cubeDef: CubeDef, withFormulas: boolean) {
  const { rowKeys, colValues, measures } = pivot;
  const colDim = config.columnDimension;
  const ws: any = {};
  let R = 0;

  // Build column header list
  // Row label column(s) + [colVal x measure] columns + Grand Total x measure
  const rowColCount = config.rowDimensions.length;
  const dataColCount = (colValues.length > 0 ? colValues.length : 1) * measures.length;
  const totalColCount = measures.length;
  const totalCols = rowColCount + dataColCount + totalColCount;

  const enc = (r: number, c: number) => XLSXStyle.utils.encode_cell({ r, c });

  // === Row 0: Title ===
  ws[enc(R, 0)] = {
    v: `${cubeDef.label} — Custom Report`, t: 's',
    s: { font: { bold: true, sz: 13, color: { rgb: '1E3A5F' } },
         fill: { patternType: 'solid', fgColor: { rgb: 'EFF6FF' } },
         alignment: { horizontal: 'center', vertical: 'center' } },
  };
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
  R++;

  // === Row 1: Column group headers (colValues) ===
  let C = rowColCount;
  if (colValues.length > 0) {
    colValues.forEach((cv) => {
      ws[enc(R, C)] = xlCell(cv, { header: true });
      if (measures.length > 1) {
        ws['!merges'].push({ s: { r: R, c: C }, e: { r: R, c: C + measures.length - 1 } });
      }
      C += measures.length;
    });
  }
  ws[enc(R, C)] = xlCell('Grand Total', { header: true });
  if (measures.length > 1) {
    ws['!merges'].push({ s: { r: R, c: C }, e: { r: R, c: C + measures.length - 1 } });
  }
  R++;

  // === Row 2: Sub-headers (row dim labels + measure names) ===
  config.rowDimensions.forEach((d, i) => {
    const label = cubeDef.fields.find((f) => f.key === d)?.label ?? d;
    ws[enc(R, i)] = xlCell(label, { header: true });
  });
  C = rowColCount;
  const measureDataStartRow = R + 1; // first data row
  if (colValues.length > 0) {
    colValues.forEach(() => {
      measures.forEach((m) => {
        const label = cubeDef.fields.find((f) => f.key === m)?.label ?? m;
        ws[enc(R, C++)] = xlCell(label, { header: true });
      });
    });
  } else {
    measures.forEach((m) => {
      const label = cubeDef.fields.find((f) => f.key === m)?.label ?? m;
      ws[enc(R, C++)] = xlCell(label, { header: true });
    });
  }
  measures.forEach((m) => {
    const label = cubeDef.fields.find((f) => f.key === m)?.label ?? m;
    ws[enc(R, C++)] = xlCell(label, { header: true });
  });
  R++;

  // Track data start row and column map for formulas
  const dataStartR = R;
  const measureColMap: Record<string, number[]> = {}; // measure → col indices of data cols (for grand total formula)

  // === Data rows ===
  rowKeys.forEach((rowKey) => {
    const parts = rowKey.split(' › ');
    config.rowDimensions.forEach((_, i) => {
      ws[enc(R, i)] = xlCell(parts[i] ?? rowKey);
    });

    C = rowColCount;
    if (colValues.length > 0) {
      colValues.forEach((cv) => {
        measures.forEach((m) => {
          const v = pivot.cells[rowKey]?.[cv]?.[m] ?? 0;
          ws[enc(R, C)] = xlCell(v, { measure: m });
          if (!measureColMap[m]) measureColMap[m] = [];
          measureColMap[m].push(C);
          C++;
        });
      });
    } else {
      measures.forEach((m) => {
        const v = pivot.rowTotals[rowKey]?.[m] ?? 0;
        ws[enc(R, C)] = xlCell(v, { measure: m });
        if (!measureColMap[m]) measureColMap[m] = [];
        measureColMap[m].push(C);
        C++;
      });
    }

    // Grand total column(s) for this row
    measures.forEach((m) => {
      const v = pivot.rowTotals[rowKey]?.[m] ?? 0;
      if (withFormulas && measureColMap[m]?.length > 0) {
        // Build SUM formula across all data cols for this measure in this row
        const colLetters = measureColMap[m].map((cc) => XLSXStyle.utils.encode_col(cc));
        const formula = colLetters.map((cl) => `${cl}${R + 1}`).join('+');
        ws[enc(R, C)] = xlCell(v, { total: true, formula: `=${formula}`, measure: m });
      } else {
        ws[enc(R, C)] = xlCell(v, { total: true, measure: m });
      }
      C++;
    });
    R++;
  });

  const dataEndR = R - 1;

  // === Grand total row ===
  ws[enc(R, 0)] = xlCell('Grand Total', { total: true });
  if (config.rowDimensions.length > 1) {
    ws['!merges'].push({ s: { r: R, c: 0 }, e: { r: R, c: rowColCount - 1 } });
  }

  C = rowColCount;
  const gtColStart = C;
  if (colValues.length > 0) {
    colValues.forEach((cv) => {
      measures.forEach((m) => {
        const v = pivot.colTotals[cv]?.[m] ?? 0;
        if (withFormulas && dataEndR >= dataStartR) {
          const colLetter = XLSXStyle.utils.encode_col(C);
          ws[enc(R, C)] = xlCell(v, { total: true, formula: `=SUM(${colLetter}${dataStartR + 1}:${colLetter}${dataEndR + 1})`, measure: m });
        } else {
          ws[enc(R, C)] = xlCell(v, { total: true, measure: m });
        }
        C++;
      });
    });
  } else {
    measures.forEach((m) => {
      const v = pivot.grandTotal[m] ?? 0;
      if (withFormulas && dataEndR >= dataStartR) {
        const colLetter = XLSXStyle.utils.encode_col(C);
        ws[enc(R, C)] = xlCell(v, { total: true, formula: `=SUM(${colLetter}${dataStartR + 1}:${colLetter}${dataEndR + 1})`, measure: m });
      } else {
        ws[enc(R, C)] = xlCell(v, { total: true, measure: m });
      }
      C++;
    });
  }

  measures.forEach((m) => {
    const v = pivot.grandTotal[m] ?? 0;
    if (withFormulas && dataEndR >= dataStartR) {
      const colLetter = XLSXStyle.utils.encode_col(C);
      ws[enc(R, C)] = xlCell(v, { total: true, formula: `=SUM(${colLetter}${dataStartR + 1}:${colLetter}${dataEndR + 1})`, measure: m });
    } else {
      ws[enc(R, C)] = xlCell(v, { total: true, measure: m });
    }
    C++;
  });
  R++;

  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R - 1, c: totalCols - 1 } });
  ws['!freeze'] = { xSplit: rowColCount, ySplit: 3 };
  ws['!cols'] = Array.from({ length: totalCols }, (_, i) => ({ wch: i < rowColCount ? 22 : 16 }));

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Report');

  const date = new Date().toISOString().slice(0, 10);
  const suffix = withFormulas ? 'WithFormulas' : 'Values';
  XLSXStyle.writeFile(wb, `CustomReport_${cubeDef.id}_${suffix}_${date}.xlsx`);
}

// ─── Zone Badge ────────────────────────────────────────────────────────────

function ZoneBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-red-600 dark:hover:text-red-400 ml-0.5">
        <X size={11} />
      </button>
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function CustomReportStudio() {
  const { params: reportParams } = useReportContext();

  const [sourceId, setSourceId]   = useState<DataSource>('revenue');
  const [rawData, setRawData]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const [config, setConfig]       = useState<StudioConfig>(() => {
    const cube = CUBES[0];
    const suggestion = CUBE_SUGGESTIONS[cube.id][0];
    return {
      dataSource:      cube.id,
      rowDimensions:   suggestion?.rows    ?? cube.defaultRows,
      columnDimension: suggestion?.col     ?? cube.defaultCol,
      filters:         {},
      measures:        suggestion?.measures ?? cube.defaultMeasures,
    };
  });
  const [filterOpen, setFilterOpen]     = useState<string | null>(null);
  const [saveOpen,   setSaveOpen]       = useState(false);
  const [saveName,   setSaveName]       = useState('');
  const [saving,     setSaving]         = useState(false);
  const [saveOk,     setSaveOk]         = useState(false);
  // editingReport: set when launched from Management Reports "Edit" link
  const [editingReport, setEditingReport] = useState<{ id: string; name: string } | null>(null);

  const cubeDef = CUBES.find((c) => c.id === sourceId)!;
  const dimensions = cubeDef.fields.filter((f) => f.type === 'dimension');
  const measures   = cubeDef.fields.filter((f) => f.type === 'measure');

  // ── On mount: check if we were launched from "Edit in Custom Report Studio" ──
  useEffect(() => {
    const raw = localStorage.getItem('studioEditReport');
    if (!raw) return;
    localStorage.removeItem('studioEditReport');
    try {
      const saved = JSON.parse(raw) as { id: string; name: string; config: StudioConfig };
      const src = saved.config.dataSource as DataSource;
      setSourceId(src);
      setConfig({ ...saved.config, dataSource: src });
      setEditingReport({ id: saved.id, name: saved.name });
      setSaveName(saved.name);
    } catch { /* malformed — ignore */ }
  }, []);

  // ── Load data — filtered by current Report Parameters (year + entity) ──
  const loadData = useCallback(async (src: DataSource) => {
    setLoading(true);
    setRawData([]);
    const data = await fetchCubeData(
      src,
      reportParams.year   || undefined,
      reportParams.entity || undefined,
    );
    setRawData(data);
    setLoading(false);
  }, [reportParams.year, reportParams.entity]);

  useEffect(() => { loadData(sourceId); }, [sourceId, loadData]);

  // ── Switch cube — auto-apply first suggestion ──
  const switchCube = (id: DataSource) => {
    const cube = CUBES.find((c) => c.id === id)!;
    const suggestion = CUBE_SUGGESTIONS[id][0];
    setSourceId(id);
    setConfig({
      dataSource:      id,
      rowDimensions:   suggestion?.rows    ?? cube.defaultRows,
      columnDimension: suggestion?.col     ?? cube.defaultCol,
      filters:         {},
      measures:        suggestion?.measures ?? cube.defaultMeasures,
    });
  };

  // ── Apply a suggested report template ──
  const applySuggestion = (s: SuggestedReport) => {
    setConfig({
      dataSource:      sourceId,
      rowDimensions:   s.rows,
      columnDimension: s.col,
      filters:         {},
      measures:        s.measures,
    });
  };

  // ── Dimension zone helpers ──
  const addToRows = (key: string) => {
    if (config.rowDimensions.includes(key)) return;
    setConfig((c) => ({ ...c, rowDimensions: [...c.rowDimensions, key] }));
  };
  const removeFromRows = (key: string) =>
    setConfig((c) => ({ ...c, rowDimensions: c.rowDimensions.filter((d) => d !== key) }));

  const setColDim = (key: string | null) =>
    setConfig((c) => ({ ...c, columnDimension: key }));

  const toggleMeasure = (key: string) =>
    setConfig((c) => ({
      ...c,
      measures: c.measures.includes(key) ? c.measures.filter((m) => m !== key) : [...c.measures, key],
    }));

  // ── Filter helpers ──
  const dimMembers = useCallback((dimKey: string): string[] => {
    const vals = new Set<string>();
    rawData.forEach((r) => vals.add(String(r[dimKey] ?? '')));
    return Array.from(vals).filter(Boolean).sort();
  }, [rawData]);

  const toggleFilter = (dimKey: string, val: string) => {
    setConfig((c) => {
      const current = c.filters[dimKey] ?? [];
      const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val];
      return { ...c, filters: { ...c.filters, [dimKey]: next } };
    });
  };

  const clearFilter = (dimKey: string) =>
    setConfig((c) => { const f = { ...c.filters }; delete f[dimKey]; return { ...c, filters: f }; });

  // ── Save / update report ──
  const handleSaveReport = async () => {
    if (!saveName.trim()) return;
    setSaving(true);
    try {
      const isUpdate = !!editingReport;
      const url = isUpdate
        ? `http://localhost:8000/api/reports/saved/${editingReport!.id}`
        : 'http://localhost:8000/api/reports/saved';
      await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName.trim(), config }),
      });
      setSaveOk(true);
      setSaveOpen(false);
      setSaveName('');
      if (isUpdate) setEditingReport(null);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      console.error('Save report failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Pivot ──
  const pivot = useMemo(() => {
    if (!rawData.length || !config.rowDimensions.length || !config.measures.length) return null;
    return buildPivot(rawData, config, cubeDef);
  }, [rawData, config, cubeDef]);

  const activeFilters = Object.entries(config.filters).filter(([, vals]) => vals.length > 0);

  // ── Field in zone? ──
  const fieldZone = (key: string): 'row' | 'col' | 'filter' | null => {
    if (config.rowDimensions.includes(key))   return 'row';
    if (config.columnDimension === key)        return 'col';
    if ((config.filters[key]?.length ?? 0) > 0) return 'filter';
    return null;
  };

  return (
    <div className="flex flex-col h-full space-y-4">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="text-indigo-600" size={28} />
            Custom Report Studio
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            PAX-style web exploration — pick dimensions, build your pivot, export to Excel
          </p>
          <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
            Showing: <strong>{reportParams.entity || 'All Entities'}</strong> · <strong>{reportParams.year}</strong>
            &nbsp;— change in{' '}
            <a href="/report-parameters" onClick={e => { e.preventDefault(); window.location.href='/report-parameters'; }}
              className="underline hover:text-indigo-700">Report Parameters</a>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">

          {/* Save / Update Report — opens inline modal */}
          <div className="relative">
            {editingReport && (
              <span className="absolute -top-5 left-0 text-[10px] text-amber-600 dark:text-amber-400 whitespace-nowrap font-medium">
                Editing: {editingReport.name}
              </span>
            )}
            <button
              disabled={!pivot}
              onClick={() => { setSaveOpen(o => !o); if (!saveOpen) setSaveName(editingReport?.name ?? ''); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-40 transition-colors shadow-sm ${
                editingReport ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {saveOk ? <CheckCircle size={15} /> : <Save size={15} />}
              {saveOk ? 'Saved!' : editingReport ? 'Update Report' : 'Save as Report'}
            </button>

            {saveOpen && (
              <div className="absolute right-0 top-11 z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  {editingReport ? 'Update Report' : 'Save to Management Reports'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  {editingReport
                    ? 'Save changes to the existing report. It will update in Management Reports immediately.'
                    : 'This report will appear as a new tab in Management Reports, controlled by Report Parameters.'}
                </p>
                <input
                  type="text"
                  autoFocus
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveReport(); if (e.key === 'Escape') setSaveOpen(false); }}
                  placeholder="e.g. Revenue by Region"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-3"
                />
                <div className="flex gap-2">
                  <button
                    disabled={!saveName.trim() || saving}
                    onClick={handleSaveReport}
                    className={`flex-1 px-3 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40 transition-colors ${
                      editingReport ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {saving ? 'Saving…' : editingReport ? 'Update' : 'Save'}
                  </button>
                  <button
                    onClick={() => setSaveOpen(false)}
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  {editingReport && (
                    <button
                      onClick={() => { setEditingReport(null); setSaveName(''); setSaveOpen(false); }}
                      className="px-3 py-2 rounded-lg text-gray-400 text-xs hover:text-gray-600 transition-colors"
                      title="Discard edits, save as new report instead"
                    >
                      Save as new
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            disabled={!pivot}
            onClick={() => pivot && exportPivot(pivot, config, cubeDef, false)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            <Download size={15} />
            Export
          </button>
          <button
            disabled={!pivot}
            onClick={() => pivot && exportPivot(pivot, config, cubeDef, true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-colors shadow-sm"
          >
            <FileSpreadsheet size={15} />
            Export + Formulas
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ═══ LEFT PANEL ═══ */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4">

          {/* Cube selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Database size={13} /> Data Source
            </h3>
            <div className="space-y-1.5">
              {CUBES.map((cube) => (
                <button
                  key={cube.id}
                  onClick={() => switchCube(cube.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    sourceId === cube.id
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500 text-indigo-800 dark:text-indigo-200'
                      : 'border-2 border-transparent bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <p className="font-semibold">{cube.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{cube.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Suggested report templates */}
          {CUBE_SUGGESTIONS[sourceId].length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Plus size={13} className="text-emerald-500" /> Suggested Reports
              </h3>
              <div className="space-y-2">
                {CUBE_SUGGESTIONS[sourceId].map((s, i) => {
                  const isActive =
                    JSON.stringify(config.rowDimensions) === JSON.stringify(s.rows) &&
                    config.columnDimension === s.col &&
                    JSON.stringify(config.measures) === JSON.stringify(s.measures);
                  return (
                    <button
                      key={i}
                      onClick={() => applySuggestion(s)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                        isActive
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${isActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-200'}`}>
                        {s.label}
                        {isActive && <span className="ml-1.5 text-[10px] font-normal opacity-70">✓ active</span>}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{s.desc}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300">
                          Row: {s.rows.join(', ')}
                        </span>
                        {s.col && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300">
                            Col: {s.col}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Field list */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex-1 overflow-y-auto">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <SlidersHorizontal size={13} /> Fields
            </h3>

            {loading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm py-4 justify-center">
                <Loader2 size={16} className="animate-spin" /> Loading…
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium">Dimensions</p>
                <div className="space-y-1 mb-4">
                  {dimensions.map((f) => {
                    const zone = fieldZone(f.key);
                    return (
                      <div key={f.key} className="flex items-center justify-between group">
                        <span className={`text-sm ${zone ? 'text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                          {f.label}
                          {zone && (
                            <span className="ml-1.5 text-xs text-indigo-400">
                              ({zone === 'row' ? 'Row' : zone === 'col' ? 'Col' : 'Filter'})
                            </span>
                          )}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button title="Add to Rows" onClick={() => addToRows(f.key)}
                            className="p-1 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600">
                            <Rows size={12} />
                          </button>
                          <button title="Set as Column" onClick={() => setColDim(f.key)}
                            className="p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600">
                            <Columns size={12} />
                          </button>
                          <button title="Open Filter" onClick={() => setFilterOpen(filterOpen === f.key ? null : f.key)}
                            className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-600">
                            <Filter size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className={`text-xs mb-2 font-medium ${config.measures.length === 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  Measures {config.measures.length === 0 && '← select at least one'}
                </p>
                <div className="space-y-1">
                  {measures.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.measures.includes(f.key)}
                        onChange={() => toggleMeasure(f.key)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{f.label}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Zone builder */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-3 gap-4">

              {/* Rows zone */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Rows size={12} className="text-indigo-500" /> Rows
                </p>
                <div className="min-h-[36px] flex flex-wrap gap-1.5 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700">
                  {config.rowDimensions.map((key) => {
                    const label = cubeDef.fields.find((f) => f.key === key)?.label ?? key;
                    return <ZoneBadge key={key} label={label} onRemove={() => removeFromRows(key)} />;
                  })}
                  {config.rowDimensions.length === 0 && (
                    <span className="text-xs text-indigo-300 dark:text-indigo-600 self-center">Click ⊞ on a dimension</span>
                  )}
                </div>
              </div>

              {/* Columns zone */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Columns size={12} className="text-purple-500" /> Column
                </p>
                <div className="min-h-[36px] flex flex-wrap gap-1.5 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-dashed border-purple-300 dark:border-purple-700">
                  {config.columnDimension ? (
                    <ZoneBadge
                      label={cubeDef.fields.find((f) => f.key === config.columnDimension)?.label ?? config.columnDimension}
                      onRemove={() => setColDim(null)}
                    />
                  ) : (
                    <span className="text-xs text-purple-300 dark:text-purple-600 self-center">Click ⊟ on a dimension</span>
                  )}
                </div>
              </div>

              {/* Filters zone */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Filter size={12} className="text-amber-500" /> Filters
                </p>
                <div className="min-h-[36px] flex flex-wrap gap-1.5 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-dashed border-amber-300 dark:border-amber-700">
                  {activeFilters.length > 0 ? activeFilters.map(([key, vals]) => {
                    const label = cubeDef.fields.find((f) => f.key === key)?.label ?? key;
                    return (
                      <ZoneBadge
                        key={key}
                        label={`${label}: ${vals.length > 2 ? `${vals.slice(0,2).join(', ')}…` : vals.join(', ')}`}
                        onRemove={() => clearFilter(key)}
                      />
                    );
                  }) : (
                    <span className="text-xs text-amber-300 dark:text-amber-600 self-center">Click ⊛ on a dimension</span>
                  )}
                </div>
              </div>
            </div>

            {/* Filter dropdown */}
            {filterOpen && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                    Filter: {cubeDef.fields.find((f) => f.key === filterOpen)?.label}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => clearFilter(filterOpen)} className="text-xs text-amber-600 dark:text-amber-400 hover:underline">Clear</button>
                    <button onClick={() => setFilterOpen(null)} className="text-xs text-gray-500 hover:text-gray-700"><X size={12} /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {dimMembers(filterOpen).map((val) => {
                    const selected = (config.filters[filterOpen] ?? []).includes(val);
                    return (
                      <button
                        key={val}
                        onClick={() => toggleFilter(filterOpen, val)}
                        className={`px-2 py-0.5 rounded text-xs transition-colors ${
                          selected
                            ? 'bg-amber-500 text-white'
                            : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-amber-400'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Pivot grid */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                <LayoutGrid size={14} className="text-indigo-500" />
                Report Preview
                {pivot && (
                  <span className="ml-1.5 text-xs text-gray-400">
                    {pivot.rowKeys.length} rows × {pivot.colValues.length || 1} columns
                  </span>
                )}
              </h3>
              <button onClick={() => loadData(sourceId)} className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48 gap-2 text-gray-400">
                  <Loader2 size={20} className="animate-spin" /> Loading data…
                </div>
              ) : !pivot || pivot.rowKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <Info size={28} className="text-gray-300" />
                  {config.rowDimensions.length === 0 ? (
                    <p className="text-sm text-gray-400">Add at least one dimension to <strong>Rows</strong></p>
                  ) : config.measures.length === 0 ? (
                    <p className="text-sm text-red-500 font-medium">✓ Rows & column set — now <strong>check a measure</strong> in the Fields panel on the left</p>
                  ) : (
                    <p className="text-sm text-gray-400">No data returned for the current filter selection</p>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    {/* Col group header */}
                    {pivot.colValues.length > 0 && (
                      <tr className="bg-indigo-600 text-white">
                        {config.rowDimensions.map((d, i) => (
                          <th key={i} className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide border border-indigo-500" rowSpan={2}>
                            {cubeDef.fields.find((f) => f.key === d)?.label ?? d}
                          </th>
                        ))}
                        {pivot.colValues.map((cv) => (
                          <th key={cv} colSpan={pivot.measures.length}
                            className="px-3 py-2 text-center font-semibold border border-indigo-500 text-xs uppercase tracking-wide">
                            {cv}
                          </th>
                        ))}
                        <th colSpan={pivot.measures.length} className="px-3 py-2 text-center font-semibold border border-indigo-500 text-xs uppercase tracking-wide">
                          Grand Total
                        </th>
                      </tr>
                    )}
                    <tr className={pivot.colValues.length === 0 ? 'bg-indigo-600 text-white' : 'bg-indigo-700 text-white'}>
                      {pivot.colValues.length === 0 && config.rowDimensions.map((d, i) => (
                        <th key={i} className="px-3 py-2 text-left font-semibold text-xs uppercase tracking-wide border border-indigo-500">
                          {cubeDef.fields.find((f) => f.key === d)?.label ?? d}
                        </th>
                      ))}
                      {(pivot.colValues.length > 0 ? pivot.colValues : [null]).map((cv, ci) =>
                        pivot.measures.map((m) => (
                          <th key={`${ci}-${m}`} className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wide border border-indigo-500">
                            {cubeDef.fields.find((f) => f.key === m)?.label ?? m}
                          </th>
                        ))
                      )}
                      {pivot.colValues.length > 0 && pivot.measures.map((m) => (
                        <th key={`total-${m}`} className="px-3 py-2 text-right font-semibold text-xs uppercase tracking-wide border border-indigo-500 bg-indigo-800">
                          {cubeDef.fields.find((f) => f.key === m)?.label ?? m}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pivot.rowKeys.map((rowKey, ri) => (
                      <tr key={rowKey} className={ri % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                        {rowKey.split(' › ').map((part, pi) => (
                          <td key={pi} className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 whitespace-nowrap">
                            {part}
                          </td>
                        ))}
                        {pivot.colValues.length > 0
                          ? pivot.colValues.flatMap((cv) =>
                              pivot.measures.map((m) => {
                                const v = pivot.cells[rowKey]?.[cv]?.[m];
                                const missing = v === undefined;
                                const display = missing ? '–' : fmt(v, m);
                                return (
                                  <td key={`${cv}-${m}`}
                                    className={`px-3 py-2 text-right border border-gray-100 dark:border-gray-700 tabular-nums ${
                                      missing ? 'text-gray-300 dark:text-gray-600'
                                      : isNegative(v!, m) ? 'text-red-600 dark:text-red-400'
                                      : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                    {display}
                                  </td>
                                );
                              })
                            )
                          : pivot.measures.map((m) => {
                              const v = pivot.rowTotals[rowKey]?.[m] ?? 0;
                              return (
                                <td key={m}
                                  className={`px-3 py-2 text-right border border-gray-100 dark:border-gray-700 tabular-nums ${isNegative(v, m) ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {fmt(v, m)}
                                </td>
                              );
                            })
                        }
                        {pivot.colValues.length > 0 && pivot.measures.map((m) => {
                          const v = pivot.rowTotals[rowKey]?.[m] ?? 0;
                          return (
                            <td key={`rowtotal-${m}`}
                              className={`px-3 py-2 text-right border border-gray-100 dark:border-gray-700 font-semibold bg-blue-50 dark:bg-blue-900/20 tabular-nums ${isNegative(v, m) ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}`}>
                              {fmt(v, m)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Grand total row */}
                    <tr className="bg-blue-100 dark:bg-blue-900/30 font-bold border-t-2 border-blue-400">
                      <td colSpan={config.rowDimensions.length}
                        className="px-3 py-2 text-gray-900 dark:text-white border border-blue-200 dark:border-blue-700 text-xs uppercase tracking-wide">
                        Grand Total
                      </td>
                      {pivot.colValues.length > 0
                        ? pivot.colValues.flatMap((cv) =>
                            pivot.measures.map((m) => {
                              const v = pivot.colTotals[cv]?.[m] ?? 0;
                              return (
                                <td key={`coltotal-${cv}-${m}`}
                                  className={`px-3 py-2 text-right border border-blue-200 dark:border-blue-700 tabular-nums ${isNegative(v, m) ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                  {fmt(v, m)}
                                </td>
                              );
                            })
                          )
                        : pivot.measures.map((m) => {
                            const v = pivot.grandTotal[m] ?? 0;
                            return (
                              <td key={`gt-${m}`}
                                className={`px-3 py-2 text-right border border-blue-200 dark:border-blue-700 tabular-nums ${isNegative(v, m) ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                {fmt(v, m)}
                              </td>
                            );
                          })
                      }
                      {pivot.colValues.length > 0 && pivot.measures.map((m) => {
                        const v = pivot.grandTotal[m] ?? 0;
                        return (
                          <td key={`gg-${m}`}
                            className={`px-3 py-2 text-right border border-blue-200 dark:border-blue-700 bg-blue-200 dark:bg-blue-800/40 tabular-nums ${isNegative(v, m) ? 'text-red-700' : 'text-gray-900 dark:text-white'}`}>
                            {fmt(v, m)}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
