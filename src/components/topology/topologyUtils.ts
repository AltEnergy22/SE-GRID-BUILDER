import { Node, Edge } from 'reactflow';
import { BusNode, BranchEdge, SearchResult } from '@/hooks/useTopology';

// Get voltage color based on per-unit voltage
export function getVoltageColor(voltagepu: number): string {
  if (voltagepu < 0.95) return '#ef4444'; // red-500 - low voltage
  if (voltagepu < 0.98) return '#f97316'; // orange-500 - warning
  if (voltagepu > 1.05) return '#ef4444'; // red-500 - high voltage  
  if (voltagepu > 1.02) return '#f59e0b'; // amber-500 - warning
  return '#10b981'; // green-500 - normal
}

// Get loading color based on loading percentage
export function getLoadingColor(loadingPercent: number): string {
  if (loadingPercent < 50) return '#10b981'; // green-500
  if (loadingPercent < 75) return '#f59e0b'; // amber-500
  if (loadingPercent < 90) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

// Create bus nodes for ReactFlow
export function createTopologyNodes(buses: BusNode[], searchResults: SearchResult[]): Node[] {
  const searchIds = new Set(searchResults.filter(r => r.type === 'bus').map(r => r.id));

  return buses.map((bus) => {
    const voltageColor = getVoltageColor(bus.voltage_pu);
    const isHighlighted = searchIds.has(bus.id);
    
    return {
      id: bus.id,
      type: 'default',
      position: bus.coordinates || { x: 0, y: 0 },
      data: {
        label: bus.name,
        voltage_pu: bus.voltage_pu,
        voltage_kv: bus.voltage_kv,
        bus_type: bus.bus_type,
        in_service: bus.in_service,
        voltageColor,
        highlighted: isHighlighted,
      },
      style: {
        background: voltageColor,
        border: isHighlighted ? '3px solid #fbbf24' : `2px solid ${voltageColor}`,
        borderRadius: '8px',
        width: 120,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '12px',
        fontWeight: 'bold',
        textAlign: 'center',
        opacity: bus.in_service ? 1 : 0.5,
        animation: isHighlighted ? 'pulse 2s infinite' : undefined,
      },
      className: isHighlighted ? 'animate-pulse' : '',
    };
  });
}

// Create branch edges for ReactFlow
export function createTopologyEdges(branches: BranchEdge[], searchResults: SearchResult[]): Edge[] {
  const searchIds = new Set(searchResults.filter(r => r.type === 'branch').map(r => r.id));

  return branches.map((branch) => {
    const loadingColor = getLoadingColor(branch.loading_percent);
    const strokeWidth = Math.max(2, Math.min(8, branch.loading_percent / 20 + 2));
    const isHighlighted = searchIds.has(branch.id);
    
    return {
      id: branch.id,
      source: branch.from_bus,
      target: branch.to_bus,
      type: 'default',
      style: {
        stroke: isHighlighted ? '#fbbf24' : loadingColor,
        strokeWidth: isHighlighted ? strokeWidth + 2 : strokeWidth,
        opacity: branch.in_service ? 1 : 0.3,
        strokeDasharray: branch.in_service ? undefined : '5,5',
      },
      label: branch.name || `${branch.loading_percent.toFixed(1)}%`,
      labelStyle: {
        fontSize: 10,
        fontWeight: 'bold',
        fill: isHighlighted ? '#fbbf24' : loadingColor,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '2px 4px',
        borderRadius: '4px',
      },
      labelBgStyle: {
        fill: 'rgba(0, 0, 0, 0.8)',
        fillOpacity: 0.8,
      },
      data: {
        type: branch.type,
        loading_percent: branch.loading_percent,
        p_from_mw: branch.p_from_mw,
        in_service: branch.in_service,
        highlighted: isHighlighted,
      },
      className: isHighlighted ? 'animate-pulse' : '',
    };
  });
}

// Utility to get bus type icon
export function getBusTypeIcon(busType: string): string {
  switch (busType) {
    case 'slack':
      return '⚡'; // Slack bus (reference)
    case 'pv':
      return '🔋'; // PV bus (generator)
    case 'pq':
      return '🏭'; // PQ bus (load)
    default:
      return '●';
  }
}

// Utility to get branch type icon
export function getBranchTypeIcon(branchType: string): string {
  switch (branchType) {
    case 'line':
      return '━';
    case 'transformer':
      return '🔄';
    default:
      return '━';
  }
}

// Format voltage deviation as percentage
export function formatVoltageDeviation(voltagepu: number): string {
  const deviation = ((voltagepu - 1.0) * 100);
  return `${deviation > 0 ? '+' : ''}${deviation.toFixed(2)}%`;
}

// Format power in appropriate units
export function formatPower(powerMW: number): string {
  if (Math.abs(powerMW) >= 1000) {
    return `${(powerMW / 1000).toFixed(1)} GW`;
  }
  return `${powerMW.toFixed(1)} MW`;
} 