'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { withRole } from '@/components/auth/withRole';
import { TopologyViewer } from '@/components/topology/TopologyViewer';
import { useTopology } from '@/hooks/useTopology';

interface TopologyPageProps {}

function TopologyPage({}: TopologyPageProps) {
  const searchParams = useSearchParams();
  const [gridId] = useState('alberta-test'); // In real app, this would come from context
  const highlightElement = searchParams?.get('highlight') || undefined;
  
  const {
    topology,
    isLoading,
    error,
    searchNodes,
    searchResults,
    clearSearch,
    refreshTopology,
  } = useTopology(gridId);

  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden">
      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Topology Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-40">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg">Loading topology...</p>
            <p className="text-sm text-gray-300">Fetching grid data and computing layout</p>
          </div>
        </div>
      )}

      {/* Main Topology Viewer */}
      <TopologyViewer
        topology={topology}
        isLoading={isLoading}
        error={error}
        gridId={gridId}
        highlightElement={highlightElement}
        searchResults={searchResults}
        onSearch={searchNodes}
        onClearSearch={clearSearch}
        onRefresh={refreshTopology}
      />
    </div>
  );
}

// Export with role-based access control
export default withRole(['ENGINEER', 'OPERATOR', 'ADMIN'])(TopologyPage); 