'use client';

import { useState } from 'react';
import { withRole } from '@/components/auth/withRole';
import { ActionBar } from '@/components/state-estimator/ActionBar';
import { SolverPanel } from '@/components/state-estimator/SolverPanel';
import { ResidualHeatmap } from '@/components/state-estimator/ResidualHeatmap';
import { OutlierTable } from '@/components/state-estimator/OutlierTable';
import { useStateEstimator } from '@/hooks/useStateEstimator';

interface StateEstimatorPageProps {}

function StateEstimatorPage({}: StateEstimatorPageProps) {
  const [algorithm, setAlgorithm] = useState<'WLS' | 'Huber'>('WLS');
  const [epsilon, setEpsilon] = useState<number>(1e-6);
  const [gridId] = useState('alberta-test'); // In real app, this would come from context or routing
  
  const {
    data,
    isLoading,
    error,
    runStateEstimator,
    isRunning
  } = useStateEstimator(gridId);

  const handleRunSE = async () => {
    await runStateEstimator(algorithm, epsilon);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">State Estimator</h1>
          <p className="mt-2 text-gray-600">
            Weighted Least Squares state estimation with residual analysis
          </p>
        </div>

        {/* Action Bar */}
        <ActionBar
          algorithm={algorithm}
          epsilon={epsilon}
          onAlgorithmChange={setAlgorithm}
          onEpsilonChange={setEpsilon}
          onRunSE={handleRunSE}
          isRunning={isRunning}
        />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error.message || 'An error occurred while running state estimation'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Solver Panel */}
        <SolverPanel
          data={data}
          isLoading={isLoading}
          isRunning={isRunning}
        />

        {/* Results Grid */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Residual Heatmap */}
            <div className="lg:col-span-2">
              <ResidualHeatmap residuals={data.residuals} />
            </div>

            {/* Outlier Table */}
            <div className="lg:col-span-1">
              <OutlierTable residuals={data.residuals} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export with role-based access control - ENGINEER, OPERATOR, and ADMIN can access
export default withRole(StateEstimatorPage, ['ENGINEER', 'OPERATOR', 'ADMIN']); 