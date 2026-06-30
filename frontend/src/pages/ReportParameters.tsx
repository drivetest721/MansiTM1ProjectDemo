/**
 * ReportParameters.tsx
 *
 * PAX-style "Parameters" sheet.
 * User sets Entity, Year, Current Period, Scenarios, and the
 * Actual/Forecast month split.  One "Refresh All Reports" button
 * pushes the values into ReportContext, which all report pages subscribe to.
 */
import { useEffect, useState } from 'react';
import { SlidersHorizontal, RefreshCw, CheckCircle, Info } from 'lucide-react';
import axios from 'axios';
import { useReportContext, type ReportParams } from '../context/ReportContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const API    = 'http://localhost:8000';

interface Meta {
  entities:  string[];
  years:     number[];
  scenarios: { name: string; type: string }[];
  months:    string[];
}

interface SavedReport {
  id:   string;
  name: string;
}

// ── small helper ──
function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</p>
        {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function Select({ value, onChange, options, placeholder = 'Select…' }: {
  value: string | number;
  onChange: (v: string) => void;
  options: (string | number)[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
        bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100
        focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function ReportParameters() {
  const { params, setParams, refresh } = useReportContext();

  const [meta,         setMeta]         = useState<Meta>({ entities: [], years: [], scenarios: [], months: MONTHS });
  const [local,        setLocal]        = useState<ReportParams>(params);
  const [saved,        setSaved]        = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Load dropdown metadata + saved reports
  useEffect(() => {
    axios.get(`${API}/api/reports/metadata`)
      .then(r => setMeta(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    axios.get(`${API}/api/reports/saved`)
      .then(r => setSavedReports(r.data))
      .catch(() => {});
  }, []);

  const set = (key: keyof ReportParams, value: string | number) =>
    setLocal(prev => ({ ...prev, [key]: value }));

  const handleRefresh = () => {
    setParams(local);
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // Group scenarios by their financial type (Budget, Actual, Forecast)
  const budgetScenarios  = meta.scenarios.filter(s => /budget/i.test(s.type || '')).map(s => s.name).filter(Boolean);
  const actualScenarios  = meta.scenarios.filter(s => /actual/i.test(s.type || '')).map(s => s.name).filter(Boolean);
  const forecastScenarios= meta.scenarios.filter(s => /forecast/i.test(s.type || '')).map(s => s.name).filter(Boolean);

  // Fallbacks when DB has no scenario data or no type differentiation
  const budgetOpts  = budgetScenarios.length  ? budgetScenarios  : ['Budget'];
  const actualOpts  = actualScenarios.length  ? actualScenarios  : ['Actual'];
  const forecastOpts= forecastScenarios.length? forecastScenarios: ['Forecast'];

  const years = meta.years.length ? meta.years : [new Date().getFullYear(), new Date().getFullYear() - 1];

  return (
    <div className="max-w-8xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <SlidersHorizontal className="text-indigo-600" size={28} />
            Report Parameters
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Set parameters once — all report pages update on Refresh
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700
            text-white font-semibold text-sm shadow transition-colors"
        >
          {saved
            ? <><CheckCircle size={16} /> Applied!</>
            : <><RefreshCw size={16} /> Refresh All Reports</>}
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Change any parameter below and click <strong>Refresh All Reports</strong> — all saved report tabs in Management Report will reload with the new values.
        </p>
      </div>

      {/* Section: Company & Entity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-md font-bold uppercase tracking-wider text-black-400 dark:text-black-500 mb-4">
          Company &amp; Entity
        </h2>
        <div className="grid grid-cols-2 gap-x-4">
          <Row label="Entity" hint="Leave blank for all entities">
            {loading
              ? <div className="h-9 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              : (
                <select
                  value={local.entity}
                  onChange={e => set('entity', e.target.value)}
                  className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-100
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Entities</option>
                  {meta.entities.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              )}
          </Row>

          <Row label="Available Reports" hint="Select a report to open in Management Report">
            {savedReports.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
                No saved reports yet.{' '}
                <a
                  href="/custom-report-studio"
                  onClick={e => { e.preventDefault(); window.location.href = '/custom-report-studio'; }}
                  className="text-indigo-500 hover:underline">
                  Build one in Custom Report Studio →
                </a>
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {savedReports.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { window.location.href = '/management-report'; }}
                    className="px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700
                      bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300
                      text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-800/40 transition-colors"
                  >
                    {r.name}
                  </button>
                ))}
                <a
                  href="/management-report"
                  onClick={e => { e.preventDefault(); window.location.href = '/management-report'; }}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                    text-gray-500 dark:text-gray-400 text-xs hover:text-indigo-600 hover:border-indigo-400 transition-colors">
                  View All →
                </a>
              </div>
            )}
          </Row>
        </div>
      </div>

       {/* Section: Time Period */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-md font-bold uppercase tracking-wider text-black-400 dark:text-black-500 mb-4">
              Time Period
            </h2>

            <div className="grid grid-cols-2 gap-x-4">
              <Row label="Fiscal Year" hint="All reports and cube data will be loaded for this year">
                <Select value={local.year} onChange={v => set('year', Number(v))} options={years} placeholder="" />
              </Row>

              <Row label="Current Period" hint="The most recent closed month">
                <Select value={local.currentPeriod} onChange={v => set('currentPeriod', v)} options={MONTHS} placeholder="" />
              </Row>

              <Row label="Comparison Year" hint="Prior year shown alongside current">
                <Select value={local.compareYear} onChange={v => set('compareYear', Number(v))} options={years} placeholder="" />
              </Row>

              <Row label="Comparison Period">
                <Select value={local.comparePeriod} onChange={v => set('comparePeriod', v)} options={MONTHS} placeholder="" />
              </Row>
            </div>
          </div>

      {/* Section: Scenarios */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-md font-bold uppercase tracking-wider text-black-400 dark:text-black-500 mb-4">
          Scenarios
        </h2>
        <div className="grid grid-cols-2 gap-x-4">
        <Row label="Budget Scenario" hint="e.g. Budget, Budget v2.0, Revised Budget">
          <Select
            value={local.budgetScenario}
            onChange={v => set('budgetScenario', v)}
            options={budgetOpts}
            placeholder=""
          />
        </Row>

        <Row label="Actual Scenario" hint="Historical closed months (e.g. Actual, Actuals YTD)">
          <Select
            value={local.actualScenario}
            onChange={v => set('actualScenario', v)}
            options={actualOpts}
            placeholder=""
          />
        </Row>

        <Row label="Forecast Scenario" hint="e.g. Forecast, Rolling Forecast, Reforecast Q3">
          <Select
            value={local.forecastScenario}
            onChange={v => set('forecastScenario', v)}
            options={forecastOpts}
            placeholder=""
          />
        </Row>
        </div>
      </div>

      {/* Section: Column Layout */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-md font-bold uppercase tracking-wider text-black-400 dark:text-black-500 mb-4">
          Monthly Column Layout
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          The report shows a rolling 12 months. Choose how many are Actual vs Forecast.
        </p>
        <div className="grid grid-cols-2 gap-x-4">
        <Row label="Actual Months" hint="Trailing months using Actual scenario">
          <div className="flex items-center gap-3">
            <input
              type="range" min={1} max={12} step={1}
              value={local.actualMonths}
              onChange={e => {
                const v = Number(e.target.value);
                set('actualMonths', v);
                set('forecastMonths', Math.max(0, 12 - v));
              }}
              className="w-40 accent-indigo-600"
            />
            <span className="text-sm font-semibold text-indigo-600 w-8">{local.actualMonths}</span>
          </div>
        </Row>

        <Row label="Forecast Months" hint="Remaining months using Forecast scenario">
          <div className="flex items-center gap-3">
            <input
              type="range" min={0} max={12} step={1}
              value={local.forecastMonths}
              onChange={e => {
                const v = Number(e.target.value);
                set('forecastMonths', v);
                set('actualMonths', Math.max(0, 12 - v));
              }}
              className="w-40 accent-blue-500"
            />
            <span className="text-sm font-semibold text-blue-500 w-8">{local.forecastMonths}</span>
          </div>
        </Row>
        </div>
        {/* Visual month strip */}
        <div className="mt-4 flex gap-1 flex-wrap">
          {MONTHS.map((m, i) => {
            const curIdx  = MONTHS.indexOf(local.currentPeriod);
            const start   = curIdx - local.actualMonths + 1;
            const end     = curIdx + local.forecastMonths;
            const relIdx  = i;
            const isActual   = relIdx >= start && relIdx <= curIdx;
            const isForecast = relIdx >  curIdx && relIdx <= end;
            return (
              <div
                key={m}
                className={`flex flex-col items-center px-2 py-1 rounded text-xs font-medium ${
                  isActual   ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' :
                  isForecast ? 'bg-blue-100   dark:bg-blue-900/40   text-blue-700   dark:text-blue-300'   :
                               'bg-gray-100   dark:bg-gray-700       text-gray-400'
                }`}
              >
                {m}
                <span className="text-[9px] mt-0.5 opacity-70">
                  {isActual ? 'Act' : isForecast ? 'Fct' : ''}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1 text-xs text-indigo-600"><span className="w-3 h-3 rounded bg-indigo-200 inline-block"/> Actual</span>
          <span className="flex items-center gap-1 text-xs text-blue-600"><span className="w-3 h-3 rounded bg-blue-200 inline-block"/> Forecast</span>
          <span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-3 h-3 rounded bg-gray-200 inline-block"/> Out of range</span>
        </div>
      </div>

    </div>
  );
}
