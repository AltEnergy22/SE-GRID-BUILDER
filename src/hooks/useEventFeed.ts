import { useState, useEffect, useRef } from 'react';

export interface EventItem {
  id: string;
  timestamp: number;
  type: 'alarm' | 'event' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  source?: string;
  acknowledged?: boolean;
  category?: 'protection' | 'measurement' | 'control' | 'communication' | 'bad-data';
}

export const useEventFeed = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    try {
      // Use appropriate websocket URL based on environment
      const wsUrl = process.env.NODE_ENV === 'development' 
        ? 'ws://localhost:8001/ws/events'
        : `ws://${window.location.host}/ws/events`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('Event feed WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const eventData: EventItem = JSON.parse(event.data);
          setEvents(prev => {
            // Add new event and keep only last 50 events
            const updated = [eventData, ...prev].slice(0, 50);
            return updated;
          });
        } catch (err) {
          console.error('Failed to parse event data:', err);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('Event feed WebSocket disconnected');
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            connect();
          }
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('Event feed WebSocket error:', error);
        setError('WebSocket connection failed');
      };

    } catch (err) {
      setError('Failed to establish WebSocket connection');
      console.error('WebSocket connection error:', err);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const acknowledgeEvent = (eventId: string) => {
    setEvents(prev => 
      prev.map(event => 
        event.id === eventId 
          ? { ...event, acknowledged: true }
          : event
      )
    );

    // Send acknowledgment to backend if WebSocket is connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'acknowledge',
        eventId
      }));
    }
  };

  const clearAcknowledged = () => {
    setEvents(prev => prev.filter(event => !event.acknowledged));
  };

  return {
    events: events.slice(0, 10), // Return only last 10 events for display
    allEvents: events,
    isConnected,
    error,
    acknowledgeEvent,
    clearAcknowledged
  };
}; 