'use client';

import { useState } from 'react';
import { withRole } from '@/components/auth/withRole';
import { ScenarioPanel } from '@/components/what-if/ScenarioPanel';
import { PowerFlowCanvas } from '@/components/what-if/PowerFlowCanvas';
import { useWhatIf } from '@/hooks/useWhatIf';

interface WhatIfPageProps {}

function WhatIfPage({}: WhatIfPageProps) {
  const [gridId] = useState('alberta-test'); // In real app, this would come from context
  
  const {
    scenario,
    baseCase,
    scenarioResult,
    isLoading,
    error,
    updateScenario,
    applyScenario,
    resetScenario,
  } = useWhatIf(gridId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Power Flow What-If Analysis
          </h1>
          <p className="mt-2 text-gray-600">
            Create scenarios and analyze their impact on the power system
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Analysis Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          {/* Left Panel - Scenario Controls */}
          <div className="lg:h-[calc(100vh-200px)] lg:overflow-y-auto">
            <ScenarioPanel
              scenario={scenario}
              onUpdateScenario={updateScenario}
              onApplyScenario={applyScenario}
              onResetScenario={resetScenario}
              isLoading={isLoading}
              gridId={gridId}
            />
          </div>

          {/* Right Panel - Power Flow Canvas */}
          <div className="lg:h-[calc(100vh-200px)]">
            <PowerFlowCanvas
              baseCase={baseCase}
              scenarioResult={scenarioResult}
              isLoading={isLoading}
              gridId={gridId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Export with role-based access control
export default withRole(['ENGINEER', 'OPERATOR', 'ADMIN'])(WhatIfPage); 