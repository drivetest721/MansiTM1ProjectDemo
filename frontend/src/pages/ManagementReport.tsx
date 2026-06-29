/**
 * ManagementReport.tsx
 *
 * PAX / SpotlightXL-style monthly management report.
 *
 * Layout (mirrors the screenshots):
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  [Parameters summary bar]                          [Export] [+ New Tab]│
 * ├────────────────────────────────────────────────────────────────────────┤
 * │  [Saved report tabs: ACT vs BUD | PL NSW | PL WHP | … ]               │
 * ├──────────────┬─────────────────────────────────────────────────────────┤
 * │  Account     │  MTD (Act|Bud|Var|Var%)  │  YTD (…)  │  Jul│Aug│…│Jun  │
 * │  ▶ Revenue   │                          │           │                  │
 * │    Line 1    │                          │           │                  │
 * │    Total Rev │                          │           │                  │
 * │  ▶ COGS      │  …                                                      │
 * └──────────────┴─────────────────────────────────────────────────────────┘
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, Download, Plus, ChevronRight, ChevronDown,
  Loader2, FileSpreadsheet, Settings, X, BookOpen,
} from 'lucide-react';
import axios from 'axios';
// @ts-ignore
import XLSXStyle from 'xlsx-js-style';
import { useReportContext } from '../context/ReportContext';

const API = 'http://localhost:8000';

// ─── Types ────────────────────────────────────────────────────────────────

interface AccountRow {
  account_key:  number;
  account_code: string;
  account_name: string;
  account_type: string;
  parent:       string;
  sort_order:   number;
  is_total:     boolean;
  level:        number;
}

interface MonthCol {
  month_name:    string;
  month_num:     number;
  scenario_type: 'actual' | 'forecast';
}

interface CellData {
  value:        number;
  budget:       number;
  variance:     number;
  variance_pct: number;
}

interface SummaryData {
  actual:       number;
  budget:       number;
  variance:     number;
  variance_pct: number;
}

interface ReportData {
  parameters:    Record<string, any>;
  accounts:      AccountRow[];
  month_columns: MonthCol[];
  cells:         Record<string, Record<string, CellData>>;
  mtd:           Record<string, SummaryData>;
  ytd:           Record<string, SummaryData>;
}

interface SavedTab {
  id:    string;
  label: string;
  data:  ReportData | null;
}

// ─── Format helpers ───────────────────────────────────────────────────────

function fmtNum(v: number): string {
  if (v === undefined || v === null || isNaN(v)) return '–';
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString('en-AU', { maximumFractionDigits: 0 });
}

function fmtPct(v: number): string {
  if (v === undefined || v === null || isNaN(v)) return '–';
  return `${v.toFixed(1)}%`;
}

// ─── Cell components ──────────────────────────────────────────────────────

function NumCell({ v, isTotal, red }: { v: number; isTotal?: boolean; red?: boolean }) {
  const base = `px-2 py-1.5 text-right tabular-nums text-xs whitespace-nowrap border-r border-gray-100 dark:border-gray-700`;
  const color = red && v < 0 ? 'text-red-600 dark:text-red-400'
              : isTotal ? 'font-bold text-gray-900 dark:text-white'
              : 'text-gray-700 dark:text-gray-300';
  return <td className={`${base} ${color}`}>{fmtNum(v)}</td>;
}

function PctCell({ v, isTotal }: { v: number; isTotal?: boolean }) {
  const base = `px-2 py-1.5 text-right tabular-nums text-xs whitespace-nowrap border-r border-gray-100 dark:border-gray-700`;
  const color = v < 0 ? 'text-red-600 dark:text-red-400'
              : v > 0 ? 'text-green-700 dark:text-green-400'
              : 'text-gray-400';
  return <td className={`${base} ${color} ${isTotal ? 'font-bold' : ''}`}>{fmtPct(v)}</td>;
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function ManagementReport() {
  const { params, refreshKey } = useReportContext();

  const [data,        setData]        = useState<ReportData | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [collapsed,   setCollapsed]   = useState<Set<string>>(new Set());
  const [tabs,        setTabs]        = useState<SavedTab[]>([
    { id: 'act-vs-bud', label: 'ACT vs BUD', data: null },
  ]);
  const [activeTab,   setActiveTab]   = useState('act-vs-bud');
  const [showMonthly, setShowMonthly] = useState(true);
  const [showMTD,     setShowMTD]     = useState(true);
  const [showYTD,     setShowYTD]     = useState(true);

  // ── Fetch ──
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API}/api/reports/management-report`, {
        params: {
          year:              params.year,
          current_period:    params.currentPeriod,
          entity:            params.entity || undefined,
          actual_months:     params.actualMonths,
          forecast_months:   params.forecastMonths,
          budget_scenario:   params.budgetScenario,
          actual_scenario:   params.actualScenario,
          forecast_scenario: params.forecastScenario,
        },
      });
      const d: ReportData = res.data;
      setData(d);
      // save into the active tab
      setTabs(prev => prev.map(t => t.id === activeTab ? { ...t, data: d } : t));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e?.message ?? 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [params, activeTab, refreshKey]); // eslint-disable-line

  useEffect(() => { fetchReport(); }, [refreshKey]); // re-fetch on Refresh All

  // ── Collapse toggle ──
  const toggleCollapse = (type: string) => {
    setCollapsed(prev => {
      const n = new Set(prev);
      n.has(type) ? n.delete(type) : n.add(type);
      return n;
    });
  };

  // ── Add new tab ──
  const addTab = () => {
    const id = `tab-${Date.now()}`;
    setTabs(prev => [...prev, { id, label: `Report ${prev.length + 1}`, data }]);
    setActiveTab(id);
  };

  // ── Remove tab ──
  const removeTab = (id: string) => {
    if (tabs.length === 1) return;
    setTabs(prev => prev.filter(t => t.id !== id));
    if (activeTab === id) setActiveTab(tabs[0].id);
  };

  // ── Export ──
  const handleExport = (withFormulas: boolean) => {
    if (!data) return;
    const ws: any = {};
    let R = 0;
    const enc = (r: number, c: number) => XLSXStyle.utils.encode_cell({ r, c });
    const hdr  = { s: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: '1E3A5F' } }, border: { bottom: { style: 'medium', color: { rgb: '1D4ED8' } } } } };
    const tot  = { s: { font: { bold: true }, fill: { patternType: 'solid', fgColor: { rgb: 'DBEAFE' } } } };
    const mkC  = (v: any, extra?: any) => ({ v: v ?? '', t: typeof v === 'number' ? 'n' : 's', ...extra });

    const cols: string[] = ['Account'];
    if (showMTD) cols.push('MTD Act', 'MTD Bud', 'MTD Var', 'MTD Var%');
    if (showYTD) cols.push('YTD Act', 'YTD Bud', 'YTD Var', 'YTD Var%');
    if (showMonthly) data.month_columns.forEach(m => cols.push(m.month_name));

    cols.forEach((h, c) => { ws[enc(R, c)] = { ...mkC(h), ...hdr }; });
    R++;
    const dataStartR = R;

    data.accounts.forEach(acc => {
      let c = 0;
      ws[enc(R, c++)] = mkC('  '.repeat(acc.level - 1) + acc.account_name, acc.is_total ? tot : {});
      if (showMTD) {
        const m = data.mtd[acc.account_name] ?? {} as any;
        ws[enc(R, c++)] = mkC(m.actual       ?? 0);
        ws[enc(R, c++)] = mkC(m.budget       ?? 0);
        if (withFormulas) { ws[enc(R, c)] = { f: `=${XLSXStyle.utils.encode_col(c-2)}${R+1}-${XLSXStyle.utils.encode_col(c-1)}${R+1}`, t: 'f', v: m.variance ?? 0 }; c++; }
        else { ws[enc(R, c++)] = mkC(m.variance ?? 0); }
        ws[enc(R, c++)] = mkC(m.variance_pct ?? 0);
      }
      if (showYTD) {
        const y = data.ytd[acc.account_name] ?? {} as any;
        ws[enc(R, c++)] = mkC(y.actual       ?? 0);
        ws[enc(R, c++)] = mkC(y.budget       ?? 0);
        ws[enc(R, c++)] = mkC(y.variance     ?? 0);
        ws[enc(R, c++)] = mkC(y.variance_pct ?? 0);
      }
      if (showMonthly) {
        data.month_columns.forEach(m => {
          ws[enc(R, c++)] = mkC(data.cells[acc.account_name]?.[m.month_name]?.value ?? 0);
        });
      }
      R++;
    });

    ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R - 1, c: cols.length - 1 } });
    ws['!freeze'] = { xSplit: 1, ySplit: 1 };
    ws['!cols'] = [{ wch: 32 }, ...Array(cols.length - 1).fill({ wch: 14 })];

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, activeTab);
    const suffix = withFormulas ? '_Formulas' : '_Values';
    XLSXStyle.writeFile(wb, `ManagementReport_${params.year}_${params.currentPeriod}${suffix}.xlsx`);
  };

  // ── Derive row groups ──
  const accountTypes = data
    ? [...new Set(data.accounts.map(a => a.account_type).filter(Boolean))]
    : [];

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full space-y-3">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-indigo-600" size={24} />
            Management Report
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {params.entity || 'All Entities'} · {params.year} · {params.currentPeriod} ·&nbsp;
            <span className="text-indigo-500">{params.actualMonths}m Actual</span> +&nbsp;
            <span className="text-blue-500">{params.forecastMonths}m Forecast</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Column toggles */}
          {(['MTD','YTD','Monthly'] as const).map(label => {
            const on = label === 'MTD' ? showMTD : label === 'YTD' ? showYTD : showMonthly;
            const toggle = label === 'MTD' ? setShowMTD : label === 'YTD' ? setShowYTD : setShowMonthly;
            return (
              <button key={label} onClick={() => toggle(!on)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  on ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 text-indigo-700 dark:text-indigo-300'
                     : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'}`}>
                {label}
              </button>
            );
          })}
          <button onClick={fetchReport} title="Refresh"
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-indigo-600 hover:border-indigo-400 transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => handleExport(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Download size={14} /> Export
          </button>
          <button onClick={() => handleExport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm">
            <FileSpreadsheet size={14} /> Export + Formulas
          </button>
          <a href="/report-parameters" onClick={e => { e.preventDefault(); window.location.href='/report-parameters'; }}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-indigo-600 hover:border-indigo-400 transition-colors" title="Parameters">
            <Settings size={15} />
          </a>
        </div>
      </div>

      {/* ── Report tabs ── */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <div key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium cursor-pointer border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}>
            {tab.label}
            {tabs.length > 1 && (
              <button onClick={e => { e.stopPropagation(); removeTab(tab.id); }}
                className="opacity-40 hover:opacity-100 ml-1"><X size={11} /></button>
            )}
          </div>
        ))}
        <button onClick={addTab}
          className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-indigo-600 transition-colors">
          <Plus size={13} /> New Tab
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center h-48 gap-2 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Loading management report…</span>
        </div>
      )}

      {/* ── Report grid ── */}
      {!loading && data && (
        <div className="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>

            {/* ══ Header rows ══ */}
            <thead className="sticky top-0 z-20">
              {/* Row 1: Column group headers */}
              <tr className="bg-[#1E3A5F] text-white">
                <th className="px-3 py-2 text-left font-semibold border-r border-blue-700 w-52 sticky left-0 bg-[#1E3A5F] z-30">
                  {params.entity || 'All Entities'}
                </th>
                {showMTD && (
                  <th colSpan={4} className="px-2 py-2 text-center font-semibold border-r border-blue-700 bg-[#243B5F]">
                    {params.currentPeriod}-{String(params.year).slice(2)} MTD
                  </th>
                )}
                {showYTD && (
                  <th colSpan={4} className="px-2 py-2 text-center font-semibold border-r border-blue-700 bg-[#1a335a]">
                    {params.currentPeriod}-{String(params.year).slice(2)} YTD
                  </th>
                )}
                {showMonthly && data.month_columns.map(col => (
                  <th key={col.month_name}
                    className={`px-2 py-2 text-center font-semibold border-r border-blue-700 ${
                      col.scenario_type === 'actual' ? 'bg-[#243B5F]' : 'bg-[#1a3560]'
                    }`}>
                    {col.month_name}
                    <span className="block text-[9px] opacity-60 font-normal">
                      {col.scenario_type === 'actual' ? 'Act' : 'Fct'}
                    </span>
                  </th>
                ))}
              </tr>

              {/* Row 2: Sub-column headers */}
              <tr className="bg-[#2D4E7A] text-white text-[10px]">
                <th className="px-3 py-1.5 text-left sticky left-0 bg-[#2D4E7A] z-30 border-r border-blue-700" />
                {showMTD && <>
                  <th className="px-2 py-1.5 text-right border-r border-blue-800">Actual</th>
                  <th className="px-2 py-1.5 text-right border-r border-blue-800">Budget</th>
                  <th className="px-2 py-1.5 text-right border-r border-blue-800">Variance</th>
                  <th className="px-2 py-1.5 text-right border-r border-blue-700">Var %</th>
                </>}
                {showYTD && <>
                  <th className="px-2 py-1.5 text-right border-r border-blue-800">Actual</th>
                  <th className="px-2 py-1.5 text-right border-r border-blue-800">Budget</th>
                  <th className="px-2 py-1.5 text-right border-r border-blue-800">Variance</th>
                  <th className="px-2 py-1.5 text-right border-r border-blue-700">Var %</th>
                </>}
                {showMonthly && data.month_columns.map(col => (
                  <th key={col.month_name} className="px-2 py-1.5 text-right border-r border-blue-800">
                    {col.month_name}
                  </th>
                ))}
              </tr>
            </thead>

            {/* ══ Body ══ */}
            <tbody>
              {accountTypes.map(accType => {
                const rows = data.accounts.filter(a => a.account_type === accType);
                if (!rows.length) return null;
                const isCollapsed = collapsed.has(accType);

                return [
                  /* Section header row */
                  <tr key={`hdr-${accType}`}
                    onClick={() => toggleCollapse(accType)}
                    className="bg-gray-100 dark:bg-gray-800 cursor-pointer select-none hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-3 py-2 font-bold text-gray-800 dark:text-gray-100 sticky left-0 bg-gray-100 dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-700">
                      <span className="flex items-center gap-1.5">
                        {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        {accType}
                      </span>
                    </td>
                    {/* Empty cells for section row */}
                    {showMTD  && <td colSpan={4} className="border-r border-gray-200 dark:border-gray-700" />}
                    {showYTD  && <td colSpan={4} className="border-r border-gray-200 dark:border-gray-700" />}
                    {showMonthly && data.month_columns.map(c => (
                      <td key={c.month_name} className="border-r border-gray-100 dark:border-gray-700" />
                    ))}
                  </tr>,

                  /* Account rows */
                  ...(!isCollapsed ? rows.map((acc, ri) => {
                    const mtd  = data.mtd[acc.account_name]  ?? {} as any;
                    const ytd  = data.ytd[acc.account_name]  ?? {} as any;
                    const isTot = acc.is_total;
                    const bg = isTot
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ri % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/60 dark:bg-gray-850';

                    return (
                      <tr key={acc.account_key} className={`${bg} hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors`}>
                        {/* Account name — sticky */}
                        <td className={`px-3 py-1.5 sticky left-0 z-10 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap ${bg}
                          ${isTot ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                          style={{ paddingLeft: `${(acc.level - 1) * 12 + 12}px` }}>
                          {isTot && <span className="mr-1 opacity-40">▶</span>}
                          {acc.account_name}
                        </td>

                        {/* MTD */}
                        {showMTD && <>
                          <NumCell v={mtd.actual       ?? 0} isTotal={isTot} />
                          <NumCell v={mtd.budget       ?? 0} isTotal={isTot} />
                          <NumCell v={mtd.variance     ?? 0} isTotal={isTot} red />
                          <PctCell v={mtd.variance_pct ?? 0} isTotal={isTot} />
                        </>}

                        {/* YTD */}
                        {showYTD && <>
                          <NumCell v={ytd.actual       ?? 0} isTotal={isTot} />
                          <NumCell v={ytd.budget       ?? 0} isTotal={isTot} />
                          <NumCell v={ytd.variance     ?? 0} isTotal={isTot} red />
                          <PctCell v={ytd.variance_pct ?? 0} isTotal={isTot} />
                        </>}

                        {/* Monthly */}
                        {showMonthly && data.month_columns.map(col => {
                          const cell = data.cells[acc.account_name]?.[col.month_name];
                          return (
                            <td key={col.month_name}
                              className={`px-2 py-1.5 text-right tabular-nums border-r border-gray-100 dark:border-gray-700 whitespace-nowrap
                                ${col.scenario_type === 'forecast' ? 'text-blue-600 dark:text-blue-400 italic' : ''}
                                ${isTot ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {cell ? fmtNum(cell.value) : '–'}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }) : []),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !data && !error && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
          <BookOpen size={36} />
          <p className="text-sm">Go to <strong>Report Parameters</strong> and click <strong>Refresh All Reports</strong></p>
          <a href="/report-parameters"
            onClick={e => { e.preventDefault(); window.location.href = '/report-parameters'; }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors">
            Open Parameters →
          </a>
        </div>
      )}
    </div>
  );
}
