import { useState } from 'react';
import { PlayIcon, StopIcon, CogIcon } from '@heroicons/react/24/outline';

interface RTCAHeaderProps {
  onRunRTCA: (scope: 'N-1' | 'N-2' | 'custom', customContingencies?: string[]) => void;
  isRunning: boolean;
  isComplete: boolean;
}

export function RTCAHeader({ onRunRTCA, isRunning, isComplete }: RTCAHeaderProps) {
  const [scope, setScope] = useState<'N-1' | 'N-2' | 'custom'>('N-1');
  const [customContingencies, setCustomContingencies] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleRunRTCA = () => {
    if (isRunning) return;
    
    const contingencies = scope === 'custom' 
      ? customContingencies.split(',').map(c => c.trim()).filter(c => c)
      : undefined;
    
    onRunRTCA(scope, contingencies);
  };

  const handleScopeChange = (newScope: 'N-1' | 'N-2' | 'custom') => {
    setScope(newScope);
    setShowCustomInput(newScope === 'custom');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Scope Selection */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">
              Analysis Scope
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => handleScopeChange('N-1')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  scope === 'N-1'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                N-1
              </button>
              <button
                onClick={() => handleScopeChange('N-2')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  scope === 'N-2'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                N-2
              </button>
              <button
                onClick={() => handleScopeChange('custom')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  scope === 'custom'
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Custom Contingencies Input */}
          {showCustomInput && (
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-2">
                Custom Contingencies
              </label>
              <input
                type="text"
                value={customContingencies}
                onChange={(e) => setCustomContingencies(e.target.value)}
                placeholder="LINE_1, LINE_2, XFMR_3"
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isRunning}
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated list of contingency IDs
              </p>
            </div>
          )}
        </div>

        {/* Run Button */}
        <div className="flex items-center gap-3">
          {isComplete && (
            <span className="text-sm text-green-600 font-medium">
              Analysis Complete
            </span>
          )}
          
          <button
            onClick={handleRunRTCA}
            disabled={isRunning || (scope === 'custom' && !customContingencies.trim())}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors ${
              isRunning
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {isRunning ? (
              <>
                <StopIcon className="w-4 h-4 mr-2" />
                Running...
              </>
            ) : (
              <>
                <PlayIcon className="w-4 h-4 mr-2" />
                Run RTCA
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scope Description */}
      <div className="mt-4 text-sm text-gray-600">
        {scope === 'N-1' && (
          <p>
            <strong>N-1 Analysis:</strong> Tests system security under single-element outages (lines, transformers, generators).
          </p>
        )}
        {scope === 'N-2' && (
          <p>
            <strong>N-2 Analysis:</strong> Tests system security under double-element outages. More comprehensive but slower.
          </p>
        )}
        {scope === 'custom' && (
          <p>
            <strong>Custom Analysis:</strong> Tests specific contingencies you define. Use element IDs from your grid model.
          </p>
        )}
      </div>
    </div>
  );
} 