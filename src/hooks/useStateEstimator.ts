import { useState, useCallback } from 'react';
import useSWR from 'swr';

export interface SEResidual {
  element_type: string;
  element_id: number;
  meas_type: string;
  residual: number;
  std_dev: number;
}

export interface SEResult {
  converged: boolean;
  iterations: number;
  elapsed_ms: number;
  bus_vm_pu: number[];
  bus_va_degree: number[];
  residuals: SEResidual[];
}

interface StateEstimatorState {
  data: SEResult | null;
  isLoading: boolean;
  error: Error | null;
  isRunning: boolean;
  runStateEstimator: (algorithm: 'WLS' | 'Huber', epsilon: number) => Promise<void>;
}

// Fetcher function for SWR
const fetcher = async (url: string): Promise<SEResult> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  return response.json();
};

export function useStateEstimator(gridId: string): StateEstimatorState {
  const [data, setData] = useState<SEResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Poll for latest state estimation results every 15 seconds when not running
  const { data: latestData, error: swrError, isLoading } = useSWR<SEResult>(
    !isRunning ? `/api/sim/${gridId}/state-estimator/latest` : null,
    fetcher,
    { 
      refreshInterval: 15000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      onSuccess: (result) => {
        if (result && !data) {
          setData(result);
        }
      }
    }
  );

  // Update error state from SWR
  if (swrError && !error) {
    setError(swrError);
  }

  const runStateEstimator = useCallback(async (algorithm: 'WLS' | 'Huber', epsilon: number) => {
    setIsRunning(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/sim/${gridId}/state-estimator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          algorithm,
          epsilon,
          // Use default measurements for now
          measurements: null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result: SEResult = await response.json();
      setData(result);
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      setError(error);
    } finally {
      setIsRunning(false);
    }
  }, [gridId]);

  return {
    data: data || latestData || null,
    isLoading: isLoading && !data,
    error: error || swrError || null,
    isRunning,
    runStateEstimator,
  };
} 