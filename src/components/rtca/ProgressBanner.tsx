import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { RTCAProgress } from '@/hooks/useRTCAStream';

interface ProgressBannerProps {
  progress: RTCAProgress | null;
  isRunning: boolean;
  isComplete: boolean;
}

export function ProgressBanner({ progress, isRunning, isComplete }: ProgressBannerProps) {
  if (!progress && !isComplete) return null;

  const progressPercent = progress ? Math.round((progress.completed / progress.total) * 100) : 100;
  
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = () => {
    if (isComplete) return 'bg-green-500';
    if (isRunning) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getBackgroundColor = () => {
    if (isComplete) return 'bg-green-50 border-green-200';
    if (isRunning) return 'bg-blue-50 border-blue-200';
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className={`rounded-lg border p-4 mb-6 ${getBackgroundColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Status Icon */}
          <div className="flex-shrink-0">
            {isComplete ? (
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            ) : (
              <div className="relative">
                <ClockIcon className="h-8 w-8 text-blue-500" />
                {isRunning && (
                  <div className="absolute inset-0 animate-spin">
                    <div className="h-8 w-8 rounded-full border-2 border-transparent border-t-blue-500"></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-6">
              {/* Progress Bar */}
              <div className="flex-1 max-w-md">
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span className={isComplete ? 'text-green-700' : 'text-blue-700'}>
                    {isComplete ? 'Analysis Complete' : 'Running Analysis'}
                  </span>
                  <span className={isComplete ? 'text-green-600' : 'text-blue-600'}>
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Statistics */}
              <div className="flex space-x-6 text-sm">
                {progress && (
                  <>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {progress.completed.toLocaleString()}
                      </div>
                      <div className="text-gray-500">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {progress.total.toLocaleString()}
                      </div>
                      <div className="text-gray-500">Total</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Current Status */}
            {progress && (
              <div className="mt-2 text-sm text-gray-600">
                {isRunning && (
                  <div className="flex items-center justify-between">
                    <span>
                      Current: <span className="font-medium">{progress.current_contingency}</span>
                    </span>
                    <div className="flex items-center space-x-4">
                      <span>
                        Elapsed: <span className="font-medium">{formatTime(progress.elapsed_time)}</span>
                      </span>
                      {progress.estimated_completion && (
                        <span>
                          ETA: <span className="font-medium">{progress.estimated_completion}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 