import * as XLSX from 'xlsx';

interface ExportToExcelOptions {
  data: any[];
  fileName: string;
  sheetName?: string;
  columnHeaders?: string[];
}

/**
 * Export data to Excel (.xlsx) file
 * Supports currency formatting, number formatting, and preserves data types
 */
export const exportToExcel = ({
  data,
  fileName,
  sheetName = 'Sheet1',
  columnHeaders,
}: ExportToExcelOptions) => {
  try {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    // Prepare data for export
    let exportData: any[] = [];

    // If custom column headers provided, create header row
    if (columnHeaders && columnHeaders.length > 0) {
      const headerRow: any = {};
      columnHeaders.forEach((header) => {
        headerRow[header] = header;
      });
      exportData.push(headerRow);
    }

    // Add data rows
    exportData = exportData.concat(data);

    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(exportData, {
      skipHeader: columnHeaders ? true : false,
    });

    // Apply column widths (auto-size based on content)
    const columnWidths: any[] = [];
    if (data.length > 0) {
      const sampleRow = data[0];
      Object.keys(sampleRow).forEach((key) => {
        const maxLength = Math.max(
          key.length,
          ...data.map((row) => {
            const value = row[key];
            if (value === null || value === undefined) return 0;
            return String(value).length;
          })
        );
        columnWidths.push({ wch: Math.min(maxLength + 2, 50) });
      });
    }
    worksheet['!cols'] = columnWidths;

    // Apply number formatting for currency and percentages
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[cellAddress];
        
        if (!cell || !cell.v) continue;

        // Format currency columns (contains dollar values)
        if (typeof cell.v === 'number') {
          const colKey = Object.keys(data[0] || {})[C] || '';
          const colName = colKey.toLowerCase();
          
          // Check if it's a currency column
          if (
            colName.includes('revenue') ||
            colName.includes('cost') ||
            colName.includes('salary') ||
            colName.includes('compensation') ||
            colName.includes('budget') ||
            colName.includes('amount') ||
            colName.includes('margin') ||
            colName.includes('variance')
          ) {
            // Apply currency format
            cell.z = '$#,##0';
            cell.t = 'n';
          }
          // Check if it's a percentage column
          else if (
            colName.includes('percent') ||
            colName.includes('%') ||
            colName.includes('pct')
          ) {
            // Apply percentage format
            cell.z = '0.00%';
            cell.t = 'n';
          }
          // Regular numbers
          else {
            cell.z = '#,##0.00';
            cell.t = 'n';
          }
        }
      }
    }

    // Create workbook and add worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Add metadata
    workbook.Props = {
      Title: fileName,
      Subject: 'TM1 Enterprise Performance Management Portal Export',
      Author: 'TM1 EPM Portal',
      CreatedDate: new Date(),
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fullFileName = `${fileName}_${timestamp}.xlsx`;

    // Write file and trigger download
    XLSX.writeFile(workbook, fullFileName);

    console.log(`Export successful: ${fullFileName}`);
  } catch (error) {
    console.error('Export to Excel failed:', error);
    throw new Error('Failed to export data to Excel');
  }
};

/**
 * Export CubeGrid data to Excel
 * Specialized function for cube grid format with proper column handling
 */
export const exportCubeToExcel = (
  data: any[],
  measureColumns: string[],
  fileName: string
) => {
  try {
    // Transform cube data to flat structure for Excel
    const exportData = data.map((row) => {
      const rowData: any = {
        Dimension: row.rowLabel || row.label || '',
      };

      // Add all measure columns
      measureColumns.forEach((measure) => {
        rowData[measure] = row[measure] ?? null;
      });

      return rowData;
    });

    exportToExcel({
      data: exportData,
      fileName,
      sheetName: 'Cube Data',
      columnHeaders: ['Dimension', ...measureColumns],
    });
  } catch (error) {
    console.error('Cube export failed:', error);
    throw error;
  }
};

/**
 * Export FinancialTable data to Excel
 * Specialized function for financial statement format
 */
export const exportFinancialTableToExcel = (
  data: any[],
  fileName: string
) => {
  try {
    // Transform financial table data
    const exportData = data.map((row) => ({
      'Line Item': row.label || row.rowLabel || '',
      'Actual': row.actual ?? null,
      'Budget': row.budget ?? null,
      'Forecast': row.forecast ?? null,
      'Variance': row.variance ?? null,
      'Variance %': row.variancePercent ?? null,
    }));

    exportToExcel({
      data: exportData,
      fileName,
      sheetName: 'Financial Data',
      columnHeaders: ['Line Item', 'Actual', 'Budget', 'Forecast', 'Variance', 'Variance %'],
    });
  } catch (error) {
    console.error('Financial table export failed:', error);
    throw error;
  }
};

export default exportToExcel;
