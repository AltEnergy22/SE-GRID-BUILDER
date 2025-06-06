import { useState, useEffect, useCallback, useRef } from 'react';

export interface RTCAViolation {
  id: string;
  outage: string;
  contingency_id: string;
  pre_loading: number;
  post_loading: number;
  loading_percent: number;
  voltage_violations: number;
  angle_margin: number;
  worst_bus: string;
  worst_bus_voltage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface RTCAProgress {
  completed: number;
  total: number;
  current_contingency: string;
  estimated_completion: string;
  elapsed_time: number;
}

export interface RTCALoading {
  element_id: string;
  element_type: 'line' | 'transformer';
  loading_percent: number;
  rating_mva: number;
  current_mva: number;
}

export interface RTCAStreamData {
  type: 'progress' | 'violation' | 'loading' | 'complete' | 'error';
  data: any;
  timestamp: string;
}

interface RTCAStreamState {
  violations: RTCAViolation[];
  progress: RTCAProgress | null;
  topLoadings: RTCALoading[];
  isRunning: boolean;
  isComplete: boolean;
  error: string | null;
  jobId: string | null;
  startRTCA: (scope: 'N-1' | 'N-2' | 'custom', customContingencies?: string[]) => void;
}

export function useRTCAStream(gridId: string): RTCAStreamState {
  const [violations, setViolations] = useState<RTCAViolation[]>([]);
  const [progress, setProgress] = useState<RTCAProgress | null>(null);
  const [topLoadings, setTopLoadings] = useState<RTCALoading[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Fetch complete results when analysis is done
  const fetchCompleteResults = useCallback(async (completedJobId: string) => {
    try {
      const response = await fetch(`/api/sim/rtca/jobs/${completedJobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch complete RTCA results');
      }
      
      const data = await response.json();
      
      // Update with complete dataset
      setViolations(data.violations || []);
      setTopLoadings(data.top_loadings || []);
      setProgress(data.progress || null);
      
    } catch (err) {
      console.error('Error fetching complete RTCA results:', err);
      setError('Failed to fetch complete results');
    }
  }, []);

  // Start RTCA analysis
  const startRTCA = useCallback(async (
    scope: 'N-1' | 'N-2' | 'custom',
    customContingencies?: string[]
  ) => {
    // Reset state
    setViolations([]);
    setProgress(null);
    setTopLoadings([]);
    setError(null);
    setIsComplete(false);
    setIsRunning(true);
    setJobId(null);

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Start RTCA stream
      const params = new URLSearchParams({
        scope,
        ...(customContingencies && { contingencies: customContingencies.join(',') })
      });
      
      const streamUrl = `/api/sim/${gridId}/rtca/stream?${params}`;
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('RTCA EventSource connection opened');
      };

      eventSource.onmessage = (event) => {
        try {
          const streamData: RTCAStreamData = JSON.parse(event.data);
          
          switch (streamData.type) {
            case 'progress':
              setProgress(streamData.data);
              break;
              
            case 'violation':
              setViolations(prev => [...prev, streamData.data]);
              break;
              
            case 'loading':
              setTopLoadings(streamData.data);
              break;
              
            case 'complete':
              setIsRunning(false);
              setIsComplete(true);
              setJobId(streamData.data.job_id);
              
              // Fetch complete results
              if (streamData.data.job_id) {
                fetchCompleteResults(streamData.data.job_id);
              }
              
              // Close the stream
              eventSource.close();
              break;
              
            case 'error':
              setError(streamData.data.message || 'Unknown error occurred');
              setIsRunning(false);
              eventSource.close();
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
          setError('Failed to parse streaming data');
        }
      };

      eventSource.onerror = (event) => {
        console.error('EventSource error:', event);
        setError('Connection lost. Please try again.');
        setIsRunning(false);
        eventSource.close();
      };

    } catch (err) {
      console.error('Error starting RTCA:', err);
      setError('Failed to start RTCA analysis');
      setIsRunning(false);
    }
  }, [gridId, fetchCompleteResults]);

  return {
    violations,
    progress,
    topLoadings,
    isRunning,
    isComplete,
    error,
    jobId,
    startRTCA,
  };
} 