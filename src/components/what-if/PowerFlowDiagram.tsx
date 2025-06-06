import { useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { PowerFlowResult } from '@/hooks/useWhatIf';

interface PowerFlowDiagramProps {
  baseCase: PowerFlowResult;
  scenarioResult: PowerFlowResult;
  gridId: string;
}

interface BusNodeData {
  label: string;
  voltage_base: number;
  voltage_scenario: number;
  voltage_delta: number;
  voltage_delta_percent: number;
}

interface BranchEdgeData {
  label: string;
  power_base: number;
  power_scenario: number;
  power_delta: number;
}

function BusNode({ data }: { data: BusNodeData }) {
  const getVoltageColor = (deltaPercent: number) => {
    const abs = Math.abs(deltaPercent);
    if (abs <= 1) return '#10b981'; // green-500
    if (abs <= 3) return '#f59e0b'; // amber-500
    if (abs <= 5) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const color = getVoltageColor(data.voltage_delta_percent);

  return (
    <div
      className="px-3 py-2 shadow-md rounded-lg border-2 bg-white text-xs"
      style={{ borderColor: color }}
    >
      <div className="font-bold text-gray-900">{data.label}</div>
      <div className="text-gray-600">
        {data.voltage_scenario.toFixed(3)} p.u.
      </div>
      <div 
        className="font-medium"
        style={{ color }}
      >
        Δ{data.voltage_delta > 0 ? '+' : ''}{data.voltage_delta_percent.toFixed(1)}%
      </div>
    </div>
  );
}

const nodeTypes = {
  bus: BusNode,
};

export function PowerFlowDiagram({
  baseCase,
  scenarioResult,
  gridId,
}: PowerFlowDiagramProps) {
  const { nodes, edges } = useMemo(() => {
    // Create bus nodes with voltage differences
    const busNodes: Node[] = baseCase.buses.map((baseBus, index) => {
      const scenarioBus = scenarioResult.buses.find(b => b.id === baseBus.id);
      if (!scenarioBus) return null;

      const voltageDelta = scenarioBus.voltage_pu - baseBus.voltage_pu;
      const voltageDeltaPercent = (voltageDelta / baseBus.voltage_pu) * 100;

      return {
        id: baseBus.id,
        type: 'bus',
        position: {
          x: (index % 6) * 200 + 100,
          y: Math.floor(index / 6) * 150 + 100,
        },
        data: {
          label: baseBus.name || `Bus ${baseBus.id}`,
          voltage_base: baseBus.voltage_pu,
          voltage_scenario: scenarioBus.voltage_pu,
          voltage_delta: voltageDelta,
          voltage_delta_percent: voltageDeltaPercent,
        } as BusNodeData,
      };
    }).filter(Boolean) as Node[];

    // Create branch edges with power flow differences
    const branchEdges: Edge[] = baseCase.branches.map((baseBranch) => {
      const scenarioBranch = scenarioResult.branches.find(b => b.id === baseBranch.id);
      if (!scenarioBranch) return null;

      const powerDelta = scenarioBranch.p_from_mw - baseBranch.p_from_mw;
      const strokeWidth = Math.max(1, Math.min(8, Math.abs(powerDelta) / 10 + 1));

      return {
        id: baseBranch.id,
        source: baseBranch.from_bus,
        target: baseBranch.to_bus,
        type: 'default',
        style: {
          strokeWidth,
          stroke: powerDelta > 0 ? '#3b82f6' : '#6b7280',
        },
        label: `${powerDelta > 0 ? '+' : ''}${powerDelta.toFixed(1)} MW`,
        labelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          fill: powerDelta > 0 ? '#3b82f6' : '#6b7280',
        },
        data: {
          label: `Line ${baseBranch.id}`,
          power_base: baseBranch.p_from_mw,
          power_scenario: scenarioBranch.p_from_mw,
          power_delta: powerDelta,
        } as BranchEdgeData,
      };
    }).filter(Boolean) as Edge[];

    return {
      nodes: busNodes,
      edges: branchEdges,
    };
  }, [baseCase, scenarioResult]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">No diagram data available</p>
          <p className="text-sm">Unable to generate network diagram from power flow results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-gray-50"
        >
          <Background />
          <Controls />
          <MiniMap 
            nodeColor={(node: any) => {
              const data = node.data as BusNodeData;
              const abs = Math.abs(data.voltage_delta_percent);
              if (abs <= 1) return '#10b981';
              if (abs <= 3) return '#f59e0b';
              if (abs <= 5) return '#f97316';
              return '#ef4444';
            }}
            maskColor="rgb(240, 240, 240, 0.8)"
          />
        </ReactFlow>
      </ReactFlowProvider>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg border border-gray-200 p-3 shadow-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded border-2 border-green-500 mr-2"></div>
            <span>|ΔV| ≤ 1%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded border-2 border-amber-500 mr-2"></div>
            <span>1% &lt; |ΔV| ≤ 3%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded border-2 border-orange-500 mr-2"></div>
            <span>3% &lt; |ΔV| ≤ 5%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded border-2 border-red-500 mr-2"></div>
            <span>|ΔV| &gt; 5%</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex items-center">
              <div className="w-6 h-1 bg-blue-500 mr-2"></div>
              <span>Power Increase</span>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-1 bg-gray-500 mr-2"></div>
              <span>Power Decrease</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 