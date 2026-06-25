/**
 * exportToExcel.ts — Enhanced Excel export using xlsx-js-style
 *
 * Produces formatted .xlsx files with:
 *  - Bold blue header row with white text
 *  - Total rows highlighted in blue-100
 *  - Subtotal rows in gray-100
 *  - Variance columns colour-coded (red = negative, green = positive)
 *  - Currency number format on financial columns
 *  - Percentage format on percent columns
 *  - Freeze pane on header row
 *  - Auto column widths
 */

// @ts-ignore — xlsx-js-style ships its own types
import XLSXStyle from 'xlsx-js-style';

// ─────────────────────────────────────────────
// Style constants
// ─────────────────────────────────────────────

const HEADER_FILL   = { patternType: 'solid', fgColor: { rgb: '2563EB' } }; // blue-600
const TOTAL_FILL    = { patternType: 'solid', fgColor: { rgb: 'DBEAFE' } }; // blue-100
const SUBTOTAL_FILL = { patternType: 'solid', fgColor: { rgb: 'F3F4F6' } }; // gray-100
const WHITE_BOLD    = { color: { rgb: 'FFFFFF' }, bold: true };
const BOLD_FONT     = { bold: true };
const GREEN_FONT    = { color: { rgb: '16A34A' }, bold: true };
const RED_FONT      = { color: { rgb: 'DC2626' }, bold: true };

const BORDER = {
  top:    { style: 'thin',  color: { rgb: 'D1D5DB' } },
  bottom: { style: 'thin',  color: { rgb: 'D1D5DB' } },
  left:   { style: 'thin',  color: { rgb: 'D1D5DB' } },
  right:  { style: 'thin',  color: { rgb: 'D1D5DB' } },
};
const HEADER_BORDER = { ...BORDER, bottom: { style: 'medium', color: { rgb: '1D4ED8' } } };

function isCurrencyKey(k: string) {
  const l = k.toLowerCase();
  return (
    l.includes('actual') || l.includes('budget') || l.includes('forecast') ||
    l.includes('revenue') || l.includes('cost')  || l.includes('salary')   ||
    l.includes('amount')  || l.includes('margin') || l.includes('income')   ||
    l.includes('profit')  || l.includes('ebitda') || l.includes('compensation') ||
    (l.includes('variance') && !l.includes('percent') && !l.includes('pct') && !l.includes('%'))
  );
}

function isPercentKey(k: string) {
  const l = k.toLowerCase();
  return l.includes('percent') || l.includes('pct') || l.endsWith('%');
}

function isVarianceKey(k: string) {
  return k.toLowerCase().includes('variance');
}

// ─────────────────────────────────────────────
// Cell builder
// ─────────────────────────────────────────────

interface CellOpts {
  isHeader?:   boolean;
  isTotal?:    boolean;
  isSubtotal?: boolean;
  colKey?:     string;
}

function cell(value: any, opts: CellOpts = {}): any {
  const { isHeader, isTotal, isSubtotal, colKey = '' } = opts;
  const isNum = typeof value === 'number' && !isNaN(value);

  // Fill
  let fill: any = undefined;
  if      (isHeader)   fill = HEADER_FILL;
  else if (isTotal)    fill = TOTAL_FILL;
  else if (isSubtotal) fill = SUBTOTAL_FILL;

  // Font
  let font: any = isHeader ? WHITE_BOLD : (isTotal || isSubtotal) ? BOLD_FONT : undefined;
  if (!isHeader && isNum && isVarianceKey(colKey)) {
    const varFont = value < 0 ? RED_FONT : value > 0 ? GREEN_FONT : undefined;
    if (varFont) font = (isTotal || isSubtotal) ? { ...varFont, bold: true } : varFont;
  }

  // Number format
  let z: string | undefined;
  if (isNum) {
    if      (isPercentKey(colKey))  z = '0.0"%"';
    else if (isCurrencyKey(colKey)) z = '"$"#,##0';
    else                            z = '#,##0.##';
  }

  const c: any = {
    v: isNum ? value : (value ?? ''),
    t: isNum ? 'n' : 's',
    s: {
      ...(fill   ? { fill }   : {}),
      ...(font   ? { font }   : {}),
      border:    isHeader ? HEADER_BORDER : BORDER,
      alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center' },
    },
  };
  if (z) c.z = z;
  return c;
}

// ─────────────────────────────────────────────
// Core export function
// ─────────────────────────────────────────────

export interface ExportColumn { key: string; label: string; }
export interface ExportRow    { [key: string]: any; _isTotal?: boolean; _isSubtotal?: boolean; }

interface ExportFormattedOpts {
  rows:      ExportRow[];
  columns:   ExportColumn[];
  fileName:  string;
  sheetName?: string;
  title?:    string;
}

export function exportFormatted({ rows, columns, fileName, sheetName = 'Data', title }: ExportFormattedOpts) {
  const ws: any = {};
  const merges: any[] = [];
  let R = 0;

  // Optional title (spans all columns)
  if (title) {
    ws[XLSXStyle.utils.encode_cell({ r: 0, c: 0 })] = {
      v: title, t: 's',
      s: {
        font: { bold: true, sz: 13, color: { rgb: '1E3A5F' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: 'EFF6FF' } },
      },
    };
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } });
    R = 1;
  }

  // Header row
  const headerR = R;
  columns.forEach((col, C) => {
    ws[XLSXStyle.utils.encode_cell({ r: R, c: C })] = cell(col.label, { isHeader: true, colKey: col.key });
  });
  R++;

  // Data rows
  rows.forEach((row) => {
    columns.forEach((col, C) => {
      ws[XLSXStyle.utils.encode_cell({ r: R, c: C })] = cell(row[col.key], {
        isTotal:    !!row._isTotal,
        isSubtotal: !!row._isSubtotal,
        colKey:     col.key,
      });
    });
    R++;
  });

  // Range, merges, freeze, col widths
  ws['!ref'] = XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: R - 1, c: columns.length - 1 } });
  if (merges.length) ws['!merges'] = merges;
  ws['!freeze'] = { xSplit: 0, ySplit: headerR + 1 };

  ws['!cols'] = columns.map((col) => {
    const maxLen = Math.max(
      col.label.length + 2,
      ...rows.map((r) => String(r[col.key] ?? '').length)
    );
    return { wch: Math.min(Math.max(maxLen, 10), 50) };
  });

  const wb = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);

  const date = new Date().toISOString().slice(0, 10);
  XLSXStyle.writeFile(wb, `${fileName}_${date}.xlsx`);
}

// ─────────────────────────────────────────────
// Convenience wrappers (drop-in replacements)
// ─────────────────────────────────────────────

/** Generic: any data array with optional column headers */
export function exportToExcel({
  data, fileName, sheetName = 'Sheet1', columnHeaders,
}: {
  data: any[]; fileName: string; sheetName?: string; columnHeaders?: string[];
}) {
  if (!data?.length) return;
  const keys    = columnHeaders ?? Object.keys(data[0]);
  const columns = keys.map((k) => ({ key: k, label: k }));
  const rows    = data.map((d) => { const r: ExportRow = {}; keys.forEach((k) => (r[k] = d[k])); return r; });
  exportFormatted({ rows, columns, fileName, sheetName });
}

/** FinancialTable: honours isTotal / isSubtotal flags */
export function exportFinancialTableToExcel(data: any[], fileName: string) {
  const columns: ExportColumn[] = [
    { key: 'label',           label: 'Line Item'  },
    { key: 'actual',          label: 'Actual'     },
    { key: 'budget',          label: 'Budget'     },
    { key: 'forecast',        label: 'Forecast'   },
    { key: 'variance',        label: 'Variance'   },
    { key: 'variancePercent', label: 'Variance %' },
  ];
  const rows: ExportRow[] = data.map((r) => ({
    label:           r.label ?? r.rowLabel ?? '',
    actual:          r.actual          ?? null,
    budget:          r.budget          ?? null,
    forecast:        r.forecast        ?? null,
    variance:        r.variance        ?? null,
    variancePercent: r.variancePercent ?? null,
    _isTotal:        r.isTotal         ?? false,
    _isSubtotal:     r.isSubtotal      ?? false,
  }));
  exportFormatted({ rows, columns, fileName, sheetName: 'Financial Data', title: fileName.replace(/_/g, ' ') });
}

/** CubeGrid export */
export function exportCubeToExcel(data: any[], measureColumns: string[], fileName: string) {
  const columns: ExportColumn[] = [
    { key: 'Dimension', label: 'Dimension' },
    ...measureColumns.map((m) => ({ key: m, label: m })),
  ];
  const rows: ExportRow[] = data.map((row) => {
    const r: ExportRow = { Dimension: row.rowLabel ?? row.label ?? '' };
    measureColumns.forEach((m) => (r[m] = row[m] ?? null));
    return r;
  });
  exportFormatted({ rows, columns, fileName, sheetName: 'Cube Data' });
}

export default exportToExcel;
