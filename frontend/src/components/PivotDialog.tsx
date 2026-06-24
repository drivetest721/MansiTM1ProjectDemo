import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Settings2 } from 'lucide-react';

export interface PivotConfig {
  rowDimensions: string[];
  columnDimensions: string[];
  measures: string[];
}

interface PivotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableDimensions: string[];
  currentRowDimensions: string[];
  currentColumnDimensions: string[];
  availableMeasures: string[];
  selectedMeasures: string[];
  onApply: (config: PivotConfig) => void;
}

export default function PivotDialog({
  isOpen,
  onClose,
  availableDimensions,
  currentRowDimensions,
  currentColumnDimensions,
  availableMeasures,
  selectedMeasures,
  onApply,
}: PivotDialogProps) {
  const [rowDimensions, setRowDimensions] = useState<string[]>(currentRowDimensions);
  const [columnDimensions, setColumnDimensions] = useState<string[]>(currentColumnDimensions);
  const [measures, setMeasures] = useState<string[]>(selectedMeasures);
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRowDimensions(currentRowDimensions);
      setColumnDimensions(currentColumnDimensions);
      setMeasures(selectedMeasures);
      setSelectedAvailable([]);
      setSelectedRow([]);
      setSelectedColumn([]);
    }
  }, [isOpen, currentRowDimensions, currentColumnDimensions, selectedMeasures]);

  if (!isOpen) return null;

  const usedDimensions = [...rowDimensions, ...columnDimensions];
  const availableForSelection = availableDimensions.filter(
    (dim) => !usedDimensions.includes(dim)
  );

  const handleMoveToRows = () => {
    const toMove = selectedAvailable.filter((dim) => !rowDimensions.includes(dim));
    setRowDimensions([...rowDimensions, ...toMove]);
    setSelectedAvailable([]);
  };

  const handleMoveToColumns = () => {
    const toMove = selectedAvailable.filter((dim) => !columnDimensions.includes(dim));
    setColumnDimensions([...columnDimensions, ...toMove]);
    setSelectedAvailable([]);
  };

  const handleRemoveFromRows = () => {
    setRowDimensions(rowDimensions.filter((dim) => !selectedRow.includes(dim)));
    setSelectedRow([]);
  };

  const handleRemoveFromColumns = () => {
    setColumnDimensions(columnDimensions.filter((dim) => !selectedColumn.includes(dim)));
    setSelectedColumn([]);
  };

  const handleSwapRowColumn = () => {
    const temp = rowDimensions;
    setRowDimensions(columnDimensions);
    setColumnDimensions(temp);
  };

  const handleMeasureToggle = (measure: string) => {
    if (measures.includes(measure)) {
      setMeasures(measures.filter((m) => m !== measure));
    } else {
      setMeasures([...measures, measure]);
    }
  };

  const handleApply = () => {
    onApply({
      rowDimensions,
      columnDimensions,
      measures,
    });
    onClose();
  };

  const handleReset = () => {
    setRowDimensions(currentRowDimensions);
    setColumnDimensions(currentColumnDimensions);
    setMeasures(selectedMeasures);
    setSelectedAvailable([]);
    setSelectedRow([]);
    setSelectedColumn([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Settings2 size={24} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pivot Configuration
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Dimensions Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Configure Dimensions
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {/* Available Dimensions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Available Dimensions
                  </label>
                  <select
                    multiple
                    value={selectedAvailable}
                    onChange={(e) =>
                      setSelectedAvailable(
                        Array.from(e.target.selectedOptions, (option) => option.value)
                      )
                    }
                    className="w-full h-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {availableForSelection.map((dim) => (
                      <option key={dim} value={dim}>
                        {dim}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Hold Ctrl/Cmd to select multiple
                  </p>
                </div>

                {/* Control Buttons */}
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="space-y-2">
                    <button
                      onClick={handleMoveToRows}
                      disabled={selectedAvailable.length === 0}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                      title="Move to Rows"
                    >
                      <ArrowRight size={16} />
                      To Rows
                    </button>
                    <button
                      onClick={handleMoveToColumns}
                      disabled={selectedAvailable.length === 0}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
                      title="Move to Columns"
                    >
                      <ArrowRight size={16} />
                      To Columns
                    </button>
                  </div>

                  <div className="border-t border-gray-300 dark:border-gray-600 w-full my-2"></div>

                  <button
                    onClick={handleSwapRowColumn}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                    title="Swap Rows ↔ Columns"
                  >
                    ↔ Swap
                  </button>
                </div>

                {/* Row/Column Dimensions */}
                <div className="space-y-4">
                  {/* Row Dimensions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Row Dimensions
                    </label>
                    <select
                      multiple
                      value={selectedRow}
                      onChange={(e) =>
                        setSelectedRow(
                          Array.from(e.target.selectedOptions, (option) => option.value)
                        )
                      }
                      className="w-full h-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {rowDimensions.map((dim) => (
                        <option key={dim} value={dim}>
                          {dim}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleRemoveFromRows}
                      disabled={selectedRow.length === 0}
                      className="mt-1 w-full px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      <ArrowLeft size={12} className="inline mr-1" />
                      Remove
                    </button>
                  </div>

                  {/* Column Dimensions */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Column Dimensions
                    </label>
                    <select
                      multiple
                      value={selectedColumn}
                      onChange={(e) =>
                        setSelectedColumn(
                          Array.from(e.target.selectedOptions, (option) => option.value)
                        )
                      }
                      className="w-full h-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {columnDimensions.map((dim) => (
                        <option key={dim} value={dim}>
                          {dim}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleRemoveFromColumns}
                      disabled={selectedColumn.length === 0}
                      className="mt-1 w-full px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
                    >
                      <ArrowLeft size={12} className="inline mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Measures Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Measures
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableMeasures.map((measure) => (
                  <label
                    key={measure}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={measures.includes(measure)}
                      onChange={() => handleMeasureToggle(measure)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{measure}</span>
                  </label>
                ))}
              </div>
              {measures.length === 0 && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  ⚠️ At least one measure must be selected
                </p>
              )}
            </div>

            {/* Preview Section */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                Configuration Preview
              </h4>
              <div className="text-sm text-indigo-800 dark:text-indigo-200 space-y-1">
                <p>
                  <strong>Rows:</strong>{' '}
                  {rowDimensions.length > 0 ? rowDimensions.join(', ') : 'None'}
                </p>
                <p>
                  <strong>Columns:</strong>{' '}
                  {columnDimensions.length > 0 ? columnDimensions.join(', ') : 'None'}
                </p>
                <p>
                  <strong>Measures:</strong>{' '}
                  {measures.length > 0 ? measures.join(', ') : 'None'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Reset
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={measures.length === 0}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
