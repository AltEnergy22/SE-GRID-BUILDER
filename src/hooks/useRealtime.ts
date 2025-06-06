import useSWR from 'swr';

export interface RealtimeData {
  frequency: number;
  ace: number;
  total_load: number;
  renewable_pct: number;
  violations: number;
  active_alarms: number;
  se_convergence: boolean;
  rtca_jobs: number;
  bus_voltages: Record<string, { voltage: number; angle: number; delta_v: number }>;
  freq_history: Array<{ timestamp: number; value: number }>;
  ace_history: Array<{ timestamp: number; value: number }>;
  load_history: Array<{ timestamp: number; value: number }>;
  renewable_history: Array<{ timestamp: number; value: number }>;
  recent_events: Array<{
    id: string;
    timestamp: number;
    type: 'alarm' | 'event' | 'warning';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    source?: string;
  }>;
}

const fetcher = async (url: string): Promise<RealtimeData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch realtime data: ${response.statusText}`);
  }
  return response.json();
};

export const useRealtime = () => {
  const { data, error, isLoading, mutate } = useSWR<RealtimeData>(
    '/api/realtime',
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 2000,
      // Keep previous data while revalidating
      keepPreviousData: true,
    }
  );

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
  };
}; 