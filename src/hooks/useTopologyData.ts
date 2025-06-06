import useSWR from 'swr';
import { TopologyData } from '@/utils/topologyUtils';

const fetcher = async (url: string): Promise<TopologyData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch topology: ${response.statusText}`);
  }
  return response.json();
};

export function useTopologyData(gridId: string) {
  const { data, error, isLoading, mutate } = useSWR<TopologyData>(
    `/api/grids/${gridId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 0, // Don't auto-refresh topology structure
      errorRetryCount: 3,
    }
  );

  return {
    topology: data,
    error: error?.message || null,
    isLoading,
    refetch: mutate,
  };
}
