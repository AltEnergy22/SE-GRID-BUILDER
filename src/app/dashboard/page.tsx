'use client';

import React from 'react';
import { withRole } from '@/components/auth/withRole';
import KPIGrid from '@/components/dashboard/KPIGrid';
import MiniTopologyHeatmap from '@/components/dashboard/MiniTopologyHeatmap';
import SparklineRow from '@/components/dashboard/SparklineRow';
import EventFeed from '@/components/dashboard/EventFeed';
import RTCAProgressWidget from '@/components/dashboard/RTCAProgressWidget';
import { useRealtime } from '@/hooks/useRealtime';

const DashboardPage: React.FC = () => {
  const { data: realtimeData, isLoading, error } = useRealtime();

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900">Dashboard Connection Error</h3>
                <p className="text-red-700 mt-1">{error.message}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-3 inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Operator Overview</h1>
              <p className="text-slate-600 text-sm mt-1">
                Real-time grid monitoring and control center
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm text-slate-500">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                <span>{isLoading ? 'Updating...' : 'Live'}</span>
              </div>
              <span>
                Last updated: {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Row 1: KPI Grid (8 cols) + Mini Topology Heat-Map (4 cols) */}
          <div className="lg:col-span-8">
            <KPIGrid
              freq={realtimeData?.frequency || 50.0}
              ace={realtimeData?.ace || 0.0}
              load={realtimeData?.total_load || 0.0}
              renewablePct={realtimeData?.renewable_pct || 0.0}
              violations={realtimeData?.violations || 0}
              alarms={realtimeData?.active_alarms || 0}
              seConv={realtimeData?.se_convergence || true}
              rtcaJobs={realtimeData?.rtca_jobs || 0}
              maxLineLoading={85.4} // Example max line loading percentage
              isLoading={isLoading}
            />
          </div>

          <div className="lg:col-span-4">
            <MiniTopologyHeatmap
              voltageData={realtimeData?.bus_voltages || {}}
              isLoading={isLoading}
            />
          </div>

          {/* Row 2: Sparkline Row (12 cols) – 30 min trend strip */}
          <div className="lg:col-span-12">
            <SparklineRow
              freqData={realtimeData?.freq_history || []}
              aceData={realtimeData?.ace_history || []}
              loadData={realtimeData?.load_history || []}
              renewableData={realtimeData?.renewable_history || []}
              isLoading={isLoading}
            />
          </div>

          {/* Row 3: Event Feed (4 cols) + RTCA Progress Widget (8 cols) */}
          <div className="lg:col-span-4">
            <EventFeed
              events={realtimeData?.recent_events || []}
              isLoading={isLoading}
            />
          </div>

          <div className="lg:col-span-8">
            <RTCAProgressWidget gridId="default" />
          </div>

        </div>
      </div>
    </div>
  );
};

// Apply role-based access control - OPERATOR, ENGINEER, and ADMIN can access
export default withRole(["OPERATOR", "ENGINEER", "ADMIN"])(DashboardPage); 