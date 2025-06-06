import { useState, useEffect, useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import { 
  TopologyData, 
  LiveData, 
  createTopologyNodes, 
  createTopologyEdges, 
  getLayoutedElements 
} from '@/utils/topologyUtils';

export function useTopologyLayout(topology: TopologyData | undefined, liveData: LiveData | undefined) {
  const [isLayouting, setIsLayouting] = useState(false);
  const [layoutedNodes, setLayoutedNodes] = useState<Node[]>([]);
  const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>([]);

  // Create initial nodes and edges from topology data
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!topology) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes = createTopologyNodes(topology.buses, liveData);
    const edges = createTopologyEdges(topology.branches, liveData);
    
    return { initialNodes: nodes, initialEdges: edges };
  }, [topology, liveData]);

  // Compute layout when topology changes (but not on live data updates)
  useEffect(() => {
    if (!topology || initialNodes.length === 0) {
      setLayoutedNodes([]);
      setLayoutedEdges([]);
      return;
    }

    setIsLayouting(true);

    // Use setTimeout to avoid blocking UI
    const timeoutId = setTimeout(() => {
      try {
        const { nodes: newNodes, edges: newEdges } = getLayoutedElements(initialNodes, initialEdges);
        setLayoutedNodes(newNodes);
        setLayoutedEdges(newEdges);
      } catch (error) {
        console.error('Layout computation failed:', error);
        setLayoutedNodes(initialNodes);
        setLayoutedEdges(initialEdges);
      } finally {
        setIsLayouting(false);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      setIsLayouting(false);
    };
  }, [topology?.id, initialNodes.length, initialEdges.length]); // Only layout when topology structure changes

  // Update colors/widths on live data changes without re-layout
  const nodes = useMemo(() => {
    if (!liveData || layoutedNodes.length === 0) {
      return layoutedNodes;
    }

    return layoutedNodes.map(node => {
      const vmPu = liveData.vm_pu_by_bus[node.id];
      if (!vmPu) return node;

      // Update node colors based on live voltage data
      const deviation = Math.abs(vmPu - 1.0);
      let backgroundColor;
      if (deviation <= 0.02) {
        backgroundColor = 'hsl(var(--success))';
      } else if (deviation <= 0.05) {
        backgroundColor = 'hsl(var(--warning))';
      } else {
        backgroundColor = 'hsl(var(--destructive))';
      }

      return {
        ...node,
        style: {
          ...node.style,
          backgroundColor,
        },
        data: {
          ...node.data,
          vmPu,
        },
      };
    });
  }, [layoutedNodes, liveData]);

  const edges = useMemo(() => {
    if (!liveData || layoutedEdges.length === 0) {
      return layoutedEdges;
    }

    return layoutedEdges.map(edge => {
      const loadingPercent = liveData.loading_by_branch[edge.id];
      if (!loadingPercent && loadingPercent !== 0) return edge;

      // Update edge colors and widths based on live loading data
      let stroke;
      if (loadingPercent <= 50) {
        stroke = 'hsl(var(--success))';
      } else if (loadingPercent <= 80) {
        stroke = 'hsl(var(--warning))';
      } else {
        stroke = 'hsl(var(--destructive))';
      }

      const strokeWidth = Math.max(1, 1 + loadingPercent / 25);

      return {
        ...edge,
        style: {
          ...edge.style,
          stroke,
          strokeWidth,
        },
        data: {
          ...edge.data,
          loadingPercent,
        },
        label: `${Math.round(loadingPercent)}%`,
      };
    });
  }, [layoutedEdges, liveData]);

  return {
    nodes,
    edges,
    isLayouting,
  };
}
