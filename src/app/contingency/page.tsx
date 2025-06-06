'use client';

import { useState } from 'react';
import { withRole } from '@/components/auth/withRole';
import { RTCAHeader } from '@/components/rtca/RTCAHeader';
import { ProgressBanner } from '@/components/rtca/ProgressBanner';
import { ViolationsTable } from '@/components/rtca/ViolationsTable';
import { WaterfallChart } from '@/components/rtca/WaterfallChart';
import { DetailDrawer } from '@/components/rtca/DetailDrawer';
import { useRTCAStream } from '@/hooks/useRTCAStream';

interface ContingencyPageProps {}

function ContingencyPage({}: ContingencyPageProps) {
  const [gridId] = useState('alberta-test'); // In real app, this would come from context
  const [selectedViolation, setSelectedViolation] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    violations,
    progress,
    isRunning,
    isComplete,
    topLoadings,
    startRTCA,
    error,
  } = useRTCAStream(gridId);

  const handleRowClick = (violation: any) => {
    setSelectedViolation(violation);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedViolation(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Real-Time Contingency Analysis
          </h1>
          <p className="mt-2 text-gray-600">
            Analyze system security under contingency scenarios
          </p>
        </div>

        {/* RTCA Controls */}
        <RTCAHeader
          onRunRTCA={startRTCA}
          isRunning={isRunning}
          isComplete={isComplete}
        />

        {/* Progress Banner */}
        {(isRunning || isComplete) && (
          <ProgressBanner
            progress={progress}
            isRunning={isRunning}
            isComplete={isComplete}
          />
        )}

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
                  RTCA Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Violations Table */}
          <div className="lg:col-span-2">
            <ViolationsTable
              violations={violations}
              onRowClick={handleRowClick}
              isLoading={isRunning && violations.length === 0}
            />
          </div>

          {/* Waterfall Chart */}
          <div className="lg:col-span-1">
            <WaterfallChart
              loadings={topLoadings}
              isLoading={isRunning && topLoadings.length === 0}
            />
          </div>
        </div>

        {/* Detail Drawer */}
        <DetailDrawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          violation={selectedViolation}
          gridId={gridId}
        />
      </div>
    </div>
  );
}

// Export with role-based access control
export default withRole(['ENGINEER', 'OPERATOR', 'ADMIN'])(ContingencyPage); 