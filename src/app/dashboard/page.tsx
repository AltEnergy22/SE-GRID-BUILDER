import React from 'react';
import { withRole } from '@/components/auth/withRole';
import KPIGrid from '@/components/dashboard/KPIGrid';
import MiniTopologyHeatmap from '@/components/dashboard/MiniTopologyHeatmap';
import SparklineRow from '@/components/dashboard/SparklineRow';
import EventFeed from '@/components/dashboard/EventFeed';
import { useRealtime } from '@/hooks/useRealtime';

const DashboardPage: React.FC = () => {
  const { data: realtimeData, isLoading, error } = useRealtime();

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error loading dashboard data</h3>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
        <p className="text-gray-600 text-sm mt-1">
          Real-time grid monitoring and control center
        </p>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-12 gap-6 h-full">
          
          {/* Row 1: KPI Grid (Full Width) */}
          <div className="col-span-12">
            <KPIGrid
              freq={realtimeData?.frequency || 50.0}
              ace={realtimeData?.ace || 0.0}
              load={realtimeData?.total_load || 0.0}
              renewablePct={realtimeData?.renewable_pct || 0.0}
              violations={realtimeData?.violations || 0}
              alarms={realtimeData?.active_alarms || 0}
              seConv={realtimeData?.se_convergence || true}
              rtcaJobs={realtimeData?.rtca_jobs || 0}
              isLoading={isLoading}
            />
          </div>

          {/* Row 2: Sparkline Row (Full Width) */}
          <div className="col-span-12">
            <SparklineRow
              freqData={realtimeData?.freq_history || []}
              aceData={realtimeData?.ace_history || []}
              loadData={realtimeData?.load_history || []}
              renewableData={realtimeData?.renewable_history || []}
              isLoading={isLoading}
            />
          </div>

          {/* Row 3: Mini Topology (8 cols) + Event Feed (4 cols) */}
          <div className="col-span-12 lg:col-span-8">
            <MiniTopologyHeatmap
              voltageData={realtimeData?.bus_voltages || {}}
              isLoading={isLoading}
            />
          </div>

          <div className="col-span-12 lg:col-span-4">
            <EventFeed
              events={realtimeData?.recent_events || []}
              isLoading={isLoading}
            />
          </div>

        </div>
      </div>
    </div>
  );
};

// Apply role-based access control - OPERATOR, ENGINEER, and ADMIN can access
export default withRole(["OPERATOR", "ENGINEER", "ADMIN"])(DashboardPage); 