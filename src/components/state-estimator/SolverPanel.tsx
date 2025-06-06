import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { SEResult } from '@/hooks/useStateEstimator';

interface SolverPanelProps {
  data: SEResult | null;
  isLoading: boolean;
  isRunning: boolean;
}

export function SolverPanel({ data, isLoading, isRunning }: SolverPanelProps) {
  const getStatusBadge = () => {
    if (isRunning) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ClockIcon className="w-3 h-3 mr-1" />
          Running
        </span>
      );
    }
    
    if (!data) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          No Results
        </span>
      );
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        data.converged 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {data.converged ? (
          <>
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Converged
          </>
        ) : (
          <>
            <XCircleIcon className="w-3 h-3 mr-1" />
            Failed
          </>
        )}
      </span>
    );
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Solver Status</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-500 mb-1">Status</span>
          {getStatusBadge()}
        </div>

        {/* Iterations */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-500 mb-1">Iterations</span>
          <span className="text-lg font-semibold text-gray-900">
            {isLoading || isRunning ? '-' : data?.iterations ?? '-'}
          </span>
        </div>

        {/* Elapsed Time */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-500 mb-1">Elapsed Time</span>
          <span className="text-lg font-semibold text-gray-900">
            {isLoading || isRunning ? '-' : data ? `${data.elapsed_ms.toFixed(1)} ms` : '-'}
          </span>
        </div>

        {/* Timestamp */}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-500 mb-1">Last Run</span>
          <span className="text-sm text-gray-900">
            {isRunning ? 'Running...' : formatTimestamp(Date.now())}
          </span>
        </div>
      </div>

      {/* Additional Info */}
      {data && !isRunning && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-500">Bus Voltages:</span>
              <span className="ml-2 text-gray-900">{data.bus_vm_pu.length} buses</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Measurements:</span>
              <span className="ml-2 text-gray-900">{data.residuals.length} points</span>
            </div>
            <div>
              <span className="font-medium text-gray-500">Outliers:</span>
              <span className="ml-2 text-gray-900">
                {data.residuals.filter(r => Math.abs(r.residual / r.std_dev) > 3).length} suspect
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 