import { Node, Edge, MarkerType } from 'reactflow';
import dagre from 'dagre';

export interface TopologyData {
  id: string;
  name: string;
  buses: BusData[];
  branches: BranchData[];
}

export interface BusData {
  id: string;
  name: string;
  voltage_kv: number;
  vm_pu?: number;
  va_degree?: number;
  type: 'slack' | 'pv' | 'pq';
  in_service: boolean;
}

export interface BranchData {
  id: string;
  name?: string;
  type: 'line' | 'transformer';
  from_bus: string;
  to_bus: string;
  loading_percent?: number;
  in_service: boolean;
}

export interface LiveData {
  vm_pu_by_bus: Record<string, number>;
  loading_by_branch: Record<string, number>;
  timestamp: string;
}

const nodeWidth = 100;
const nodeHeight = 60;

export const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 100, ranksep: 150 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export const getVoltageColor = (vmPu: number): string => {
  if (!vmPu) return 'hsl(var(--muted))';
  
  const deviation = Math.abs(vmPu - 1.0);
  
  if (deviation <= 0.02) {
    return 'hsl(var(--success))'; // Green for ≤ 2%
  } else if (deviation <= 0.05) {
    return 'hsl(var(--warning))'; // Yellow for ≤ 5%
  } else {
    return 'hsl(var(--destructive))'; // Red for > 5%
  }
};

export const getLoadingColor = (loadingPercent: number): string => {
  if (!loadingPercent) return 'hsl(var(--muted))';
  
  if (loadingPercent <= 50) {
    return 'hsl(var(--success))'; 
  } else if (loadingPercent <= 80) {
    return 'hsl(var(--warning))';
  } else {
    return 'hsl(var(--destructive))';
  }
};

export const getLoadingWidth = (loadingPercent: number): number => {
  return Math.max(1, 1 + (loadingPercent || 0) / 25);
};

export const createTopologyNodes = (buses: BusData[], liveData?: LiveData): Node[] => {
  return buses.map((bus) => {
    const vmPu = liveData?.vm_pu_by_bus[bus.id] || bus.vm_pu || 1.0;
    const color = getVoltageColor(vmPu);
    
    return {
      id: bus.id,
      type: 'default',
      position: { x: 0, y: 0 },
      data: {
        label: bus.name,
        bus,
        vmPu,
        voltageKv: bus.voltage_kv,
        inService: bus.in_service,
      },
      style: {
        backgroundColor: color,
        color: 'white',
        border: bus.in_service ? 'none' : '2px dashed hsl(var(--muted-foreground))',
        borderRadius: '8px',
        padding: '8px',
        fontSize: '12px',
        fontWeight: '500',
        opacity: bus.in_service ? 1 : 0.6,
      },
    };
  });
};

export const createTopologyEdges = (branches: BranchData[], liveData?: LiveData): Edge[] => {
  return branches.map((branch) => {
    const loadingPercent = liveData?.loading_by_branch[branch.id] || branch.loading_percent || 0;
    const color = getLoadingColor(loadingPercent);
    const width = getLoadingWidth(loadingPercent);
    
    return {
      id: branch.id,
      source: branch.from_bus,
      target: branch.to_bus,
      type: 'smoothstep',
      data: {
        branch,
        loadingPercent,
        inService: branch.in_service,
      },
      style: {
        stroke: color,
        strokeWidth: width,
        strokeDasharray: branch.in_service ? 'none' : '5,5',
        opacity: branch.in_service ? 1 : 0.6,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: color,
        width: 20,
        height: 20,
      },
      label: branch.name || `${Math.round(loadingPercent)}%`,
      labelStyle: {
        fontSize: '10px',
        fontWeight: '500',
        fill: 'hsl(var(--foreground))',
        backgroundColor: 'hsl(var(--background))',
        padding: '2px 4px',
        borderRadius: '4px',
      },
    };
  });
}; 