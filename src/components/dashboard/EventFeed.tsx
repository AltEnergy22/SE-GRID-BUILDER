'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  Bell, 
  Info, 
  Zap, 
  Database,
  Settings,
  Wifi,
  TrendingDown,
  Clock
} from 'lucide-react';
import { useEventFeed, EventItem } from '@/hooks/useEventFeed';

interface EventFeedProps {
  events?: EventItem[];
  isLoading?: boolean;
}

const EventFeed: React.FC<EventFeedProps> = ({
  events: externalEvents,
  isLoading = false
}) => {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { events: hookEvents, isConnected, acknowledgeEvent } = useEventFeed();
  
  // Use hook events if available, otherwise fall back to props
  const events = hookEvents.length > 0 ? hookEvents : (externalEvents || []);

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (scrollRef.current && events.length > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events]);

  const getEventIcon = (event: EventItem) => {
    const iconProps = { className: "h-4 w-4", strokeWidth: 2 };
    
    switch (event.category) {
      case 'protection':
        return <AlertTriangle {...iconProps} />;
      case 'measurement':
        return <Database {...iconProps} />;
      case 'control':
        return <Settings {...iconProps} />;
      case 'communication':
        return <Wifi {...iconProps} />;
      case 'bad-data':
        return <TrendingDown {...iconProps} />;
      default:
        switch (event.type) {
          case 'alarm':
            return <Bell {...iconProps} />;
          case 'warning':
            return <AlertTriangle {...iconProps} />;
          case 'info':
            return <Info {...iconProps} />;
          default:
            return <Zap {...iconProps} />;
        }
    }
  };

  const getEventStyles = (event: EventItem) => {
    const isAcknowledged = event.acknowledged;
    
    const baseStyles = isAcknowledged 
      ? "opacity-50 border-slate-200" 
      : "border-l-4";

    switch (event.severity) {
      case 'critical':
        return `${baseStyles} ${!isAcknowledged ? 'border-l-red-500 bg-red-50' : 'bg-slate-50'}`;
      case 'high':
        return `${baseStyles} ${!isAcknowledged ? 'border-l-orange-500 bg-orange-50' : 'bg-slate-50'}`;
      case 'medium':
        return `${baseStyles} ${!isAcknowledged ? 'border-l-yellow-500 bg-yellow-50' : 'bg-slate-50'}`;
      case 'low':
        return `${baseStyles} ${!isAcknowledged ? 'border-l-blue-500 bg-blue-50' : 'bg-slate-50'}`;
      default:
        return `${baseStyles} ${!isAcknowledged ? 'border-l-slate-500 bg-slate-50' : 'bg-slate-50'}`;
    }
  };

  const getEventTextColor = (event: EventItem) => {
    if (event.acknowledged) return 'text-slate-500';
    
    switch (event.severity) {
      case 'critical':
        return 'text-red-800';
      case 'high':
        return 'text-orange-800';
      case 'medium':
        return 'text-yellow-800';
      case 'low':
        return 'text-blue-800';
      default:
        return 'text-slate-800';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const handleEventClick = (event: EventItem) => {
    if (!event.acknowledged) {
      acknowledgeEvent(event.id);
    }

    // Navigate to relevant page for bad-data alarms
    if (event.category === 'bad-data') {
      router.push('/calibration');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Event Feed</h3>
          </div>
        </div>
        <div className="p-6 flex items-center justify-center h-48">
          <div className="space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-slate-500">Loading events...</p>
          </div>
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
            <Bell className="h-5 w-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Event Feed</h3>
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

        {/* Summary bar */}
        {events.length > 0 && (
          <div className="mt-3 flex items-center space-x-4 text-sm">
            {events.filter(e => e.severity === 'critical' && !e.acknowledged).length > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-red-700 font-medium">
                  {events.filter(e => e.severity === 'critical' && !e.acknowledged).length} Critical
                </span>
              </div>
            )}
            {events.filter(e => e.severity === 'high' && !e.acknowledged).length > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="text-orange-700 font-medium">
                  {events.filter(e => e.severity === 'high' && !e.acknowledged).length} High
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-hidden">
        {events.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-slate-400 mb-2">
              <Bell className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-sm text-slate-500">No recent events</p>
            <p className="text-xs text-slate-400 mt-1">System operating normally</p>
          </div>
        ) : (
          <div 
            ref={scrollRef}
            className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
          >
            <div className="space-y-1 p-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`
                    px-3 py-2 rounded-lg cursor-pointer transition-all duration-200
                    hover:shadow-sm border
                    ${getEventStyles(event)}
                  `}
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-start space-x-2">
                    <div className={`
                      mt-0.5 p-1 rounded-full
                      ${event.acknowledged ? 'bg-slate-200 text-slate-500' : 
                        event.severity === 'critical' ? 'bg-red-200 text-red-600' :
                        event.severity === 'high' ? 'bg-orange-200 text-orange-600' :
                        event.severity === 'medium' ? 'bg-yellow-200 text-yellow-600' :
                        'bg-blue-200 text-blue-600'}
                    `}>
                      {getEventIcon(event)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`
                          text-xs font-medium uppercase tracking-wide
                          ${getEventTextColor(event)}
                        `}>
                          {event.category || event.type}
                        </span>
                        <div className="flex items-center space-x-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(event.timestamp)}</span>
                        </div>
                      </div>
                      
                      <p className={`
                        text-sm leading-5 mt-1
                        ${getEventTextColor(event)}
                      `}>
                        {event.message}
                      </p>
                      
                      {event.source && (
                        <p className="text-xs text-slate-500 mt-1">
                          Source: {event.source}
                        </p>
                      )}

                      {event.category === 'bad-data' && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Click to open Calibration
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing latest {Math.min(events.length, 10)} events
          </span>
          <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
            View All Events →
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventFeed; 