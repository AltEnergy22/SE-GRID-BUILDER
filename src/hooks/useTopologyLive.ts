import useSWR from 'swr';
import { LiveData } from '@/utils/topologyUtils';

const fetcher = async (url: string): Promise<LiveData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch live data: ${response.statusText}`);
  }
  return response.json();
};

export function useTopologyLive(gridId: string) {
  const { data, error, isLoading } = useSWR<LiveData>(
    `/api/realtime/topology?grid=${gridId}`,
    fetcher,
    {
      refreshInterval: 3000, // Update every 3 seconds
      revalidateOnFocus: false,
      errorRetryCount: 2,
      // Don't throw errors for live data - just log them
      onError: (error) => {
        console.warn('Live topology data fetch failed:', error);
      },
    }
  );

  return {
    liveData: data,
    error: error?.message || null,
    isLoading,
  };
}
