import { useState, useCallback, useMemo } from 'react';
import { TopologyData, BusData, BranchData } from '@/utils/topologyUtils';

export interface SearchResult {
  id: string;
  type: 'bus' | 'branch';
  name: string;
  match_score: number;
  description?: string;
}

export function useTopologySearch(topology: TopologyData | undefined) {
  const [searchQuery, setSearchQuery] = useState('');
  const [focusElement, setFocusElement] = useState<string | null>(null);

  // Compute search results
  const searchResults = useMemo(() => {
    if (!topology || !searchQuery.trim() || searchQuery.length < 2) {
      return [];
    }

    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search buses
    topology.buses.forEach((bus) => {
      const nameMatch = bus.name.toLowerCase().includes(query);
      const idMatch = bus.id.toLowerCase().includes(query);
      
      if (nameMatch || idMatch) {
        let score = 0;
        
        // Exact matches get higher scores
        if (bus.name.toLowerCase() === query || bus.id.toLowerCase() === query) {
          score = 1.0;
        } else if (bus.name.toLowerCase().startsWith(query) || bus.id.toLowerCase().startsWith(query)) {
          score = 0.9;
        } else if (nameMatch) {
          score = 0.8;
        } else {
          score = 0.7;
        }

        results.push({
          id: bus.id,
          type: 'bus',
          name: bus.name,
          match_score: score,
          description: `${bus.voltage_kv} kV ${bus.type.toUpperCase()} Bus`,
        });
      }
    });

    // Search branches
    topology.branches.forEach((branch) => {
      const nameMatch = branch.name?.toLowerCase().includes(query);
      const idMatch = branch.id.toLowerCase().includes(query);
      const fromBusMatch = branch.from_bus.toLowerCase().includes(query);
      const toBusMatch = branch.to_bus.toLowerCase().includes(query);
      
      if (nameMatch || idMatch || fromBusMatch || toBusMatch) {
        let score = 0;
        
        if (branch.name?.toLowerCase() === query || branch.id.toLowerCase() === query) {
          score = 1.0;
        } else if (branch.name?.toLowerCase().startsWith(query) || branch.id.toLowerCase().startsWith(query)) {
          score = 0.9;
        } else if (nameMatch) {
          score = 0.8;
        } else if (fromBusMatch || toBusMatch) {
          score = 0.6;
        } else {
          score = 0.5;
        }

        results.push({
          id: branch.id,
          type: 'branch',
          name: branch.name || `${branch.from_bus} → ${branch.to_bus}`,
          match_score: score,
          description: `${branch.type} (${branch.from_bus} → ${branch.to_bus})`,
        });
      }
    });

    // Sort by match score and limit results
    return results
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 10);
  }, [topology, searchQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setFocusElement(null);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setFocusElement(null);
  }, []);

  const selectResult = useCallback((result: SearchResult) => {
    setFocusElement(result.id);
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    searchResults,
    focusElement,
    handleSearch,
    clearSearch,
    selectResult,
  };
} 