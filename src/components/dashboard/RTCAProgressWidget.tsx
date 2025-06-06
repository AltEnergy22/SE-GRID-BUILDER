'use client';

import React from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  XCircle,
  Timer,
  Zap
} from 'lucide-react';
import { useRTCAJobs } from '@/hooks/useRTCAJobs';

interface RTCAProgressWidgetProps {
  gridId?: string;
}

const RTCAProgressWidget: React.FC<RTCAProgressWidgetProps> = ({
  gridId = 'default'
}) => {
  const { registry, activeJob, runningJobs, isConnected, error, cancelJob } = useRTCAJobs(gridId);

  const getStatusIcon = (status: string) => {
    const iconProps = { className: "h-4 w-4", strokeWidth: 2 };
    
    switch (status) {
      case 'running':
        return <Play {...iconProps} className="text-blue-600" />;
      case 'queued':
        return <Clock {...iconProps} className="text-yellow-600" />;
      case 'completed':
        return <CheckCircle {...iconProps} className="text-green-600" />;
      case 'failed':
        return <XCircle {...iconProps} className="text-red-600" />;
      case 'cancelled':
        return <Square {...iconProps} className="text-slate-600" />;
      default:
        return <Timer {...iconProps} className="text-slate-600" />;
    }
  };

  const getViolationBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'alert':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatDuration = (startTime?: number) => {
    if (!startTime) return '--:--';
    
    const now = Date.now();
    const elapsed = now - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const CircularProgress: React.FC<{ progress: number; size?: number }> = ({ 
    progress, 
    size = 120 
  }) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative">
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#3b82f6"
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        
        {/* Progress text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">
            {Math.round(progress)}%
          </span>
          <span className="text-xs text-slate-500 font-medium">
            Complete
          </span>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 shadow-sm h-full">
        <div className="p-4 border-b border-red-200">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">RTCA Monitor</h3>
          </div>
        </div>
        <div className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">RTCA Monitor</h3>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`
              w-2 h-2 rounded-full
              ${isConnected ? 'bg-green-500' : 'bg-red-500'}
            `}></div>
            <span className="text-sm text-slate-500">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Registry Summary */}
        <div className="mt-3 flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-slate-600">{registry.running_jobs} Running</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="text-slate-600">{registry.queued_jobs} Queued</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-slate-400"></div>
            <span className="text-slate-600">{registry.total_jobs} Total</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        {!activeJob ? (
          /* No Active Job */
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Pause className="h-8 w-8 text-slate-400" />
            </div>
            <h4 className="text-lg font-medium text-slate-900 mb-2">No Active Jobs</h4>
            <p className="text-sm text-slate-500 mb-4">
              System is idle. Ready to process contingency analysis.
            </p>
            
            {registry.queued_jobs > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 font-medium">
                    {registry.queued_jobs} job{registry.queued_jobs > 1 ? 's' : ''} in queue
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Active Job */
          <div className="h-full">
            <div className="flex items-center justify-center mb-6">
              <CircularProgress progress={activeJob.progress} />
            </div>

            {/* Job Details */}
            <div className="space-y-4">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-slate-900 mb-1">
                  {activeJob.scenario_name || `Job ${activeJob.id.slice(-6)}`}
                </h4>
                <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
                  {getStatusIcon(activeJob.status)}
                  <span className="capitalize">{activeJob.status}</span>
                  {activeJob.started_at && (
                    <>
                      <span>•</span>
                      <span>{formatDuration(activeJob.started_at)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Worst Violation Badge */}
              {activeJob.worst_violation && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">
                      Worst Violation
                    </span>
                    <span className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
                      ${getViolationBadgeColor(activeJob.worst_violation.severity)}
                    `}>
                      {activeJob.worst_violation.severity}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Element:</span>
                      <span className="text-slate-900 font-mono">
                        {activeJob.worst_violation.element}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Type:</span>
                      <span className="text-slate-900 capitalize">
                        {activeJob.worst_violation.type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Value:</span>
                      <span className="text-slate-900 font-mono">
                        {activeJob.worst_violation.value.toFixed(2)} / {activeJob.worst_violation.limit.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Overload:</span>
                      <span className="text-slate-900 font-mono">
                        {((activeJob.worst_violation.value / activeJob.worst_violation.limit - 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Violations Summary */}
              {activeJob.violations_count !== undefined && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">
                    Total Violations
                  </span>
                  <span className={`
                    text-lg font-bold
                    ${activeJob.violations_count === 0 ? 'text-green-600' : 
                      activeJob.violations_count <= 5 ? 'text-yellow-600' : 'text-red-600'}
                  `}>
                    {activeJob.violations_count}
                  </span>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => cancelJob(activeJob.id)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors duration-200"
                >
                  <Square className="h-4 w-4" />
                  <span>Cancel Job</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Jobs Footer */}
      {registry.jobs.length > 0 && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Last job: {new Date(Math.max(...registry.jobs.map(j => j.started_at || 0))).toLocaleTimeString()}
            </span>
            <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
              View Job History →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RTCAProgressWidget; 