import useSWR from 'swr';

export interface DataPoint {
  timestamp: number;
  value: number;
}

export interface BusVoltageData {
  voltage: number;
  angle: number;
  delta_v: number;
}

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

export interface RealtimeData {
  // Current Values
  frequency: number;
  ace: number;
  total_load: number;
  renewable_pct: number;
  se_convergence: boolean;
  active_alarms: number;
  violations: number;
  rtca_jobs: number;
  
  // Historical Data for Sparklines (30 min window)
  freq_history: DataPoint[];
  ace_history: DataPoint[];
  load_history: DataPoint[];
  renewable_history: DataPoint[];
  
  // Bus voltage data for topology heatmap
  bus_voltages: Record<string, BusVoltageData>;
  
  // Recent events for event feed
  recent_events: EventItem[];
  
  // Metadata
  timestamp: number;
  grid_id: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
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
    mutate, // Allow manual refresh
  };
}; 