import { PlayIcon, CogIcon } from '@heroicons/react/24/outline';

interface ActionBarProps {
  algorithm: 'WLS' | 'Huber';
  epsilon: number;
  onAlgorithmChange: (algorithm: 'WLS' | 'Huber') => void;
  onEpsilonChange: (epsilon: number) => void;
  onRunSE: () => void;
  isRunning: boolean;
}

export function ActionBar({
  algorithm,
  epsilon,
  onAlgorithmChange,
  onEpsilonChange,
  onRunSE,
  isRunning,
}: ActionBarProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Algorithm Selection */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Algorithm
            </label>
            <select
              value={algorithm}
              onChange={(e) => onAlgorithmChange(e.target.value as 'WLS' | 'Huber')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isRunning}
            >
              <option value="WLS">Weighted Least Squares</option>
              <option value="Huber">Huber M-Estimator</option>
            </select>
          </div>

          {/* Epsilon Input */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Convergence Tolerance (ε)
            </label>
            <input
              type="number"
              value={epsilon}
              onChange={(e) => onEpsilonChange(parseFloat(e.target.value) || 1e-6)}
              step="1e-6"
              min="1e-12"
              max="1e-3"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="1e-6"
              disabled={isRunning}
            />
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={onRunSE}
          disabled={isRunning}
          className={`inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
          }`}
        >
          {isRunning ? (
            <>
              <CogIcon className="w-4 h-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <PlayIcon className="w-4 h-4 mr-2" />
              Run SE
            </>
          )}
        </button>
      </div>
    </div>
  );
} 