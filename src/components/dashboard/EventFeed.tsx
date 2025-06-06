import React from 'react';
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  ExclamationCircleIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface Event {
  id: string;
  timestamp: number;
  type: 'alarm' | 'event' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source?: string;
}

interface EventFeedProps {
  events: Event[];
  isLoading?: boolean;
}

interface EventItemProps {
  event: Event;
}

const EventItem: React.FC<EventItemProps> = ({ event }) => {
  const getEventIcon = () => {
    switch (event.severity) {
      case 'critical':
        return <FireIcon className="h-4 w-4 text-red-500" />;
      case 'high':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-400" />;
      case 'medium':
        return <ExclamationCircleIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (event.severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-red-400 bg-red-25';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`p-3 border-l-4 ${getSeverityColor()} mb-2 last:mb-0`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {getEventIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              {event.type}
            </span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(event.timestamp)}
            </span>
          </div>
          <p className="text-sm text-gray-900 leading-snug mb-1">
            {event.message}
          </p>
          {event.source && (
            <p className="text-xs text-gray-600">
              Source: {event.source}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const EventFeed: React.FC<EventFeedProps> = ({ events, isLoading = false }) => {
  const getSeverityCount = () => {
    return events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  };

  const severityCount = getSeverityCount();

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm h-full flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
          <p className="text-sm text-gray-600">Last 10 alarms & system events</p>
        </div>
        <div className="text-xs text-gray-500">
          {events.length} events
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-1 text-xs">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>Critical: {severityCount.critical || 0}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
          <span>High: {severityCount.high || 0}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
          <span>Medium: {severityCount.medium || 0}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>Low: {severityCount.low || 0}</span>
        </div>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="p-3 border-l-4 border-l-gray-200 bg-gray-50">
                <div className="animate-pulse">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-3 w-16 bg-gray-300 rounded"></div>
                    <div className="h-3 w-12 bg-gray-300 rounded"></div>
                  </div>
                  <div className="h-4 w-full bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 w-3/4 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No recent events
          </div>
        ) : (
          <div className="space-y-0">
            {events.slice(0, 10).map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {events.length > 10 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium">
            View All Events ({events.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default EventFeed; 