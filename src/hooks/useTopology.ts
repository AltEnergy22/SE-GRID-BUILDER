import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';

export interface BusNode {
  id: string;
  name: string;
  voltage_kv: number;
  voltage_pu: number;
  angle_deg: number;
  p_mw: number;
  q_mvar: number;
  bus_type: 'slack' | 'pv' | 'pq';
  in_service: boolean;
  coordinates?: {
    x: number;
    y: number;
  };
}

export interface BranchEdge {
  id: string;
  name?: string;
  type: 'line' | 'transformer';
  from_bus: string;
  to_bus: string;
  r_ohm: number;
  x_ohm: number;
  c_nf: number;
  max_i_ka: number;
  loading_percent: number;
  p_from_mw: number;
  p_to_mw: number;
  in_service: boolean;
  breaker_from?: {
    id: string;
    closed: boolean;
  };
  breaker_to?: {
    id: string;
    closed: boolean;
  };
}

export interface TopologyData {
  id: string;
  name: string;
  buses: BusNode[];
  branches: BranchEdge[];
  layout_computed: boolean;
  timestamp: string;
}

export interface SearchResult {
  id: string;
  type: 'bus' | 'branch';
  name: string;
  match_score: number;
}

export interface TopologyState {
  topology: TopologyData | null;
  isLoading: boolean;
  error: string | null;
  searchResults: SearchResult[];
  searchNodes: (query: string) => void;
  clearSearch: () => void;
  refreshTopology: () => void;
}

// Fetcher function for SWR
const fetcher = async (url: string): Promise<any> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`);
  }
  return response.json();
};

// Web Worker for layout computation (simplified - in real implementation would use dagre)
const computeLayout = (topology: TopologyData): Promise<TopologyData> => {
  return new Promise((resolve) => {
    // Simple grid layout algorithm (replace with dagre in real implementation)
    const busesWithLayout = topology.buses.map((bus, index) => {
      const cols = Math.ceil(Math.sqrt(topology.buses.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      return {
        ...bus,
        coordinates: {
          x: col * 200 + 100,
          y: row * 150 + 100,
        },
      };
    });

    setTimeout(() => {
      resolve({
        ...topology,
        buses: busesWithLayout,
        layout_computed: true,
      });
    }, 100); // Simulate layout computation time
  });
};

export function useTopology(gridId: string): TopologyState {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [layoutTopology, setLayoutTopology] = useState<TopologyData | null>(null);
  const [isComputingLayout, setIsComputingLayout] = useState(false);

  // Fetch topology data
  const { data: rawTopology, error: fetchError, mutate } = useSWR<TopologyData>(
    `/api/grids/${gridId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 5000, // Refresh every 5 seconds for live updates
    }
  );

  // Compute layout when raw topology changes
  useEffect(() => {
    if (rawTopology && !rawTopology.layout_computed) {
      setIsComputingLayout(true);
      computeLayout(rawTopology)
        .then((computed) => {
          setLayoutTopology(computed);
          setIsComputingLayout(false);
        })
        .catch((error) => {
          console.error('Layout computation failed:', error);
          setIsComputingLayout(false);
        });
    } else if (rawTopology?.layout_computed) {
      setLayoutTopology(rawTopology);
    }
  }, [rawTopology]);

  // Search functionality
  const searchNodes = useCallback((query: string) => {
    if (!layoutTopology || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search buses
    layoutTopology.buses.forEach((bus) => {
      const nameMatch = bus.name.toLowerCase().includes(lowerQuery);
      const idMatch = bus.id.toLowerCase().includes(lowerQuery);
      
      if (nameMatch || idMatch) {
        results.push({
          id: bus.id,
          type: 'bus',
          name: bus.name,
          match_score: nameMatch ? 1.0 : 0.8,
        });
      }
    });

    // Search branches
    layoutTopology.branches.forEach((branch) => {
      const nameMatch = branch.name?.toLowerCase().includes(lowerQuery);
      const idMatch = branch.id.toLowerCase().includes(lowerQuery);
      
      if (nameMatch || idMatch) {
        results.push({
          id: branch.id,
          type: 'branch',
          name: branch.name || `${branch.from_bus}-${branch.to_bus}`,
          match_score: nameMatch ? 1.0 : 0.8,
        });
      }
    });

    // Sort by match score
    results.sort((a, b) => b.match_score - a.match_score);
    setSearchResults(results.slice(0, 10)); // Limit to top 10 results
  }, [layoutTopology]);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
  }, []);

  const refreshTopology = useCallback(() => {
    mutate();
  }, [mutate]);

  const isLoading = !rawTopology || isComputingLayout;
  const error = fetchError ? fetchError.message : null;

  return {
    topology: layoutTopology,
    isLoading,
    error,
    searchResults,
    searchNodes,
    clearSearch,
    refreshTopology,
  };
} 