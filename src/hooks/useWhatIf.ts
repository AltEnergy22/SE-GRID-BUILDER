import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';

export interface Generator {
  id: string;
  name: string;
  current_mw: number;
  min_mw: number;
  max_mw: number;
  is_online: boolean;
}

export interface OutageItem {
  id: string;
  type: 'line' | 'transformer' | 'generator';
  name: string;
  is_selected: boolean;
}

export interface Scenario {
  name: string;
  preset: string;
  load_scale: number;
  generators: Generator[];
  outages: OutageItem[];
}

export interface PowerFlowResult {
  converged: boolean;
  iterations: number;
  buses: Array<{
    id: string;
    name: string;
    voltage_pu: number;
    angle_deg: number;
    p_mw: number;
    q_mvar: number;
  }>;
  branches: Array<{
    id: string;
    from_bus: string;
    to_bus: string;
    p_from_mw: number;
    p_to_mw: number;
    loading_percent: number;
  }>;
}

export interface WhatIfState {
  scenario: Scenario;
  baseCase: PowerFlowResult | null;
  scenarioResult: PowerFlowResult | null;
  isLoading: boolean;
  error: string | null;
  updateScenario: (updates: Partial<Scenario>) => void;
  applyScenario: () => Promise<void>;
  resetScenario: () => void;
}

// Fetcher function for SWR
const fetcher = async (url: string): Promise<any> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  return response.json();
};

// Default scenario
const createDefaultScenario = (): Scenario => ({
  name: 'New Scenario',
  preset: 'current',
  load_scale: 1.0,
  generators: [],
  outages: [],
});

export function useWhatIf(gridId: string): WhatIfState {
  const [scenario, setScenario] = useState<Scenario>(createDefaultScenario());
  const [scenarioResult, setScenarioResult] = useState<PowerFlowResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch base case power flow
  const { data: baseCase, error: baseCaseError } = useSWR<PowerFlowResult>(
    `/api/sim/${gridId}/powerflow/base`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Fetch grid elements for scenario building
  const { data: gridElements } = useSWR(
    `/api/sim/${gridId}/elements`,
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        // Initialize generators and outages from grid data
        if (data && scenario.generators.length === 0) {
          const generators: Generator[] = (data.generators || []).map((gen: any) => ({
            id: gen.id,
            name: gen.name,
            current_mw: gen.p_mw || 0,
            min_mw: gen.min_p_mw || 0,
            max_mw: gen.max_p_mw || 100,
            is_online: gen.in_service !== false,
          }));

          const outages: OutageItem[] = [
            ...(data.lines || []).map((line: any) => ({
              id: line.id,
              type: 'line' as const,
              name: line.name || `Line ${line.id}`,
              is_selected: false,
            })),
            ...(data.transformers || []).map((trafo: any) => ({
              id: trafo.id,
              type: 'transformer' as const,
              name: trafo.name || `Transformer ${trafo.id}`,
              is_selected: false,
            })),
            ...(data.generators || []).map((gen: any) => ({
              id: gen.id,
              type: 'generator' as const,
              name: gen.name || `Generator ${gen.id}`,
              is_selected: false,
            })),
          ];

          setScenario(prev => ({
            ...prev,
            generators,
            outages,
          }));
        }
      }
    }
  );

  // Update error state from base case
  useEffect(() => {
    if (baseCaseError) {
      setError(`Failed to load base case: ${baseCaseError.message}`);
    } else {
      setError(null);
    }
  }, [baseCaseError]);

  // Update scenario
  const updateScenario = useCallback((updates: Partial<Scenario>) => {
    setScenario(prev => ({ ...prev, ...updates }));
  }, []);

  // Apply scenario to get new power flow results
  const applyScenario = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sim/${gridId}/whatif`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario: {
            name: scenario.name,
            preset: scenario.preset,
            load_scale: scenario.load_scale,
            generator_dispatch: scenario.generators.reduce((acc, gen) => {
              acc[gen.id] = {
                p_mw: gen.current_mw,
                in_service: gen.is_online,
              };
              return acc;
            }, {} as Record<string, any>),
            outages: scenario.outages
              .filter(outage => outage.is_selected)
              .map(outage => ({
                type: outage.type,
                id: outage.id,
              })),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to run scenario: ${response.statusText}`);
      }

      const result = await response.json();
      setScenarioResult(result);

    } catch (err) {
      console.error('Error applying scenario:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply scenario');
      setScenarioResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [gridId, scenario]);

  // Reset scenario to default
  const resetScenario = useCallback(() => {
    setScenario(createDefaultScenario());
    setScenarioResult(null);
    setError(null);
  }, []);

  return {
    scenario,
    baseCase: baseCase || null,
    scenarioResult,
    isLoading,
    error,
    updateScenario,
    applyScenario,
    resetScenario,
  };
} 