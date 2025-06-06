import { useState, useEffect, useRef } from 'react';

export interface RTCAJob {
  id: string;
  grid_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  started_at?: number;
  completed_at?: number;
  scenario_name?: string;
  worst_violation?: {
    type: 'voltage' | 'thermal' | 'stability';
    value: number;
    limit: number;
    element: string;
    severity: 'warning' | 'alert' | 'critical';
  };
  violations_count?: number;
  error_message?: string;
}

export interface RTCARegistry {
  total_jobs: number;
  running_jobs: number;
  queued_jobs: number;
  jobs: RTCAJob[];
}

export const useRTCAJobs = (gridId: string = 'default') => {
  const [registry, setRegistry] = useState<RTCARegistry>({
    total_jobs: 0,
    running_jobs: 0,
    queued_jobs: 0,
    jobs: []
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = () => {
    try {
      // Use appropriate SSE URL based on environment
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8001'
        : '';
      
      const sseUrl = `${baseUrl}/sim/${gridId}/rtca/stream`;
      eventSourceRef.current = new EventSource(sseUrl);

      eventSourceRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('RTCA SSE connected');
      };

      eventSourceRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'registry_update') {
            setRegistry(data.registry);
          } else if (data.type === 'job_update') {
            setRegistry(prev => ({
              ...prev,
              jobs: prev.jobs.map(job => 
                job.id === data.job.id ? { ...job, ...data.job } : job
              )
            }));
          } else if (data.type === 'job_added') {
            setRegistry(prev => ({
              ...prev,
              total_jobs: prev.total_jobs + 1,
              queued_jobs: prev.queued_jobs + 1,
              jobs: [...prev.jobs, data.job]
            }));
          } else if (data.type === 'job_completed') {
            setRegistry(prev => ({
              ...prev,
              running_jobs: Math.max(0, prev.running_jobs - 1),
              jobs: prev.jobs.map(job => 
                job.id === data.job.id ? { ...job, ...data.job } : job
              )
            }));
          }
        } catch (err) {
          console.error('Failed to parse RTCA SSE data:', err);
        }
      };

      eventSourceRef.current.onerror = (error) => {
        console.error('RTCA SSE error:', error);
        setIsConnected(false);
        setError('SSE connection failed');
        
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connect();
          }
        }, 5000);
      };

    } catch (err) {
      setError('Failed to establish SSE connection');
      console.error('SSE connection error:', err);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [gridId]);

  const cancelJob = async (jobId: string) => {
    try {
      const baseUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:8001'
        : '';
      
      const response = await fetch(`${baseUrl}/sim/${gridId}/rtca/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel job: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      console.error('Failed to cancel RTCA job:', err);
      return false;
    }
  };

  const runningJobs = registry.jobs.filter(job => job.status === 'running');
  const activeJob = runningJobs[0]; // Most recent running job
  
  return {
    registry,
    jobs: registry.jobs,
    runningJobs,
    activeJob,
    isConnected,
    error,
    cancelJob
  };
}; 