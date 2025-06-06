import { useState, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { SEResidual } from '@/hooks/useStateEstimator';

interface OutlierTableProps {
  residuals: SEResidual[];
}

type SortDirection = 'asc' | 'desc';

interface SortState {
  column: 'element' | 'type' | 'residual' | 'norm_res';
  direction: SortDirection;
}

export function OutlierTable({ residuals }: OutlierTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortState, setSortState] = useState<SortState>({
    column: 'norm_res',
    direction: 'desc',
  });

  // Calculate normalized residuals and sort
  const processedData = useMemo(() => {
    return residuals
      .map(residual => ({
        ...residual,
        norm_res: Math.abs(residual.residual / residual.std_dev),
        element_label: `${residual.element_type}_${residual.element_id}`,
        type_label: `${residual.element_type.toUpperCase()}_${residual.meas_type.toUpperCase()}`,
      }))
      .sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        switch (sortState.column) {
          case 'element':
            aVal = a.element_label;
            bVal = b.element_label;
            break;
          case 'type':
            aVal = a.type_label;
            bVal = b.type_label;
            break;
          case 'residual':
            aVal = Math.abs(a.residual);
            bVal = Math.abs(b.residual);
            break;
          case 'norm_res':
          default:
            aVal = a.norm_res;
            bVal = b.norm_res;
            break;
        }

        if (typeof aVal === 'string') {
          const comparison = aVal.localeCompare(bVal as string);
          return sortState.direction === 'asc' ? comparison : -comparison;
        } else {
          const comparison = aVal - (bVal as number);
          return sortState.direction === 'asc' ? comparison : -comparison;
        }
      });
  }, [residuals, sortState]);

  // Paginate data
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  const handleSort = (column: SortState['column']) => {
    setSortState(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const getSortIcon = (column: SortState['column']) => {
    if (sortState.column !== column) {
      return <ChevronUpIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortState.direction === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 text-gray-600" />
      : <ChevronDownIcon className="w-4 h-4 text-gray-600" />;
  };

  const getRowClassName = (normRes: number) => {
    if (normRes > 3) return 'bg-red-50 border-red-200';
    if (normRes > 2) return 'bg-yellow-50 border-yellow-200';
    return 'bg-white border-gray-200';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Outlier Analysis</h2>
      <p className="text-sm text-gray-600 mb-4">
        Measurements ranked by normalized residual. Red rows indicate outliers (&gt;3σ).
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('element')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>Element</span>
                  {getSortIcon('element')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>Type</span>
                  {getSortIcon('type')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('residual')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>Residual</span>
                  {getSortIcon('residual')}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('norm_res')}
                  className="flex items-center space-x-1 hover:text-gray-900"
                >
                  <span>|r/σ|</span>
                  {getSortIcon('norm_res')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, index) => (
              <tr
                key={`${row.element_type}_${row.element_id}_${row.meas_type}`}
                className={`${getRowClassName(row.norm_res)} border-l-4`}
              >
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {row.element_label}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.type_label}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {row.residual.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  <span className={row.norm_res > 3 ? 'text-red-600' : 'text-gray-900'}>
                    {row.norm_res.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, processedData.length)} of {processedData.length} measurements
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 text-sm border rounded ${
                  currentPage === page
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Total:</span>
            <span className="ml-1 text-gray-900">{processedData.length}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Suspect (&gt;3σ):</span>
            <span className="ml-1 text-red-600 font-medium">
              {processedData.filter(r => r.norm_res > 3).length}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Warning (&gt;2σ):</span>
            <span className="ml-1 text-yellow-600 font-medium">
              {processedData.filter(r => r.norm_res > 2 && r.norm_res <= 3).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 