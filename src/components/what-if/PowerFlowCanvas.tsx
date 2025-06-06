import { useState } from 'react';
import { PowerFlowResult } from '@/hooks/useWhatIf';
import { PowerFlowDiagram } from './PowerFlowDiagram';
import { DeltaTable } from './DeltaTable';

interface PowerFlowCanvasProps {
  baseCase: PowerFlowResult | null;
  scenarioResult: PowerFlowResult | null;
  isLoading: boolean;
  gridId: string;
}

export function PowerFlowCanvas({
  baseCase,
  scenarioResult,
  isLoading,
  gridId,
}: PowerFlowCanvasProps) {
  const [activeTab, setActiveTab] = useState<'diagram' | 'table'>('diagram');

  const hasResults = baseCase && scenarioResult;

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header with Tabs */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Power Flow Analysis
            {hasResults && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                Base vs Scenario
              </span>
            )}
          </h2>
          
          {hasResults && (
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('diagram')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'diagram'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Diagram
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'table'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                ΔTable
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Running power flow analysis...</p>
            </div>
          </div>
        ) : !baseCase ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Base Case Available</h3>
              <p className="text-gray-600">
                Load the base power flow case to start scenario analysis
              </p>
            </div>
          </div>
        ) : !scenarioResult ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Scenario Analysis</h3>
              <p className="text-gray-600">
                Configure your scenario parameters and click "Apply Scenario" to see the analysis
              </p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'diagram' && (
              <PowerFlowDiagram
                baseCase={baseCase}
                scenarioResult={scenarioResult}
                gridId={gridId}
              />
            )}
            {activeTab === 'table' && (
              <DeltaTable
                baseCase={baseCase}
                scenarioResult={scenarioResult}
              />
            )}
          </>
        )}
      </div>

      {/* Status Bar */}
      {hasResults && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                Base Case: 
                <span className={`ml-1 font-medium ${
                  baseCase.converged ? 'text-green-600' : 'text-red-600'
                }`}>
                  {baseCase.converged ? 'Converged' : 'Failed'}
                </span>
              </span>
              <span className="text-gray-600">
                Scenario: 
                <span className={`ml-1 font-medium ${
                  scenarioResult.converged ? 'text-green-600' : 'text-red-600'
                }`}>
                  {scenarioResult.converged ? 'Converged' : 'Failed'}
                </span>
              </span>
            </div>
            <div className="text-gray-500">
              {baseCase.buses.length} buses, {baseCase.branches.length} branches
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 