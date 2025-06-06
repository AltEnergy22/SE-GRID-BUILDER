import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TopologyData, SearchResult } from '@/hooks/useTopology';
import { TopologyHeader } from './TopologyHeader';
import { TopologyDrawer } from './TopologyDrawer';
import { createTopologyNodes, createTopologyEdges } from './topologyUtils';

interface TopologyViewerProps {
  topology: TopologyData | null;
  isLoading: boolean;
  error: string | null;
  gridId: string;
  highlightElement?: string;
  searchResults: SearchResult[];
  onSearch: (query: string) => void;
  onClearSearch: () => void;
  onRefresh: () => void;
}

interface SelectedElement {
  id: string;
  type: 'bus' | 'branch';
  data: any;
}

function TopologyFlow({
  topology,
  highlightElement,
  searchResults,
  onElementSelect,
}: {
  topology: TopologyData;
  highlightElement?: string;
  searchResults: SearchResult[];
  onElementSelect: (element: SelectedElement | null) => void;
}) {
  const { fitView, getNode, getEdge } = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Update nodes and edges when topology changes
  useEffect(() => {
    if (topology) {
      const newNodes = createTopologyNodes(topology.buses, searchResults);
      const newEdges = createTopologyEdges(topology.branches, searchResults);
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [topology, searchResults]);

  // Handle element highlighting
  useEffect(() => {
    if (highlightElement) {
      const node = getNode(highlightElement);
      const edge = getEdge(highlightElement);
      
      if (node || edge) {
        // Flash animation for highlighted element
        const element = node || edge;
        if (element) {
          setTimeout(() => {
            fitView({ nodes: node ? [node] : undefined });
          }, 100);
        }
      }
    }
  }, [highlightElement, getNode, getEdge, fitView]);

  const handleNodeClick = useCallback((event: any, node: Node) => {
    const bus = topology.buses.find(b => b.id === node.id);
    if (bus) {
      onElementSelect({
        id: node.id,
        type: 'bus',
        data: bus,
      });
    }
  }, [topology.buses, onElementSelect]);

  const handleEdgeClick = useCallback((event: any, edge: Edge) => {
    const branch = topology.branches.find(b => b.id === edge.id);
    if (branch) {
      onElementSelect({
        id: edge.id,
        type: 'branch',
        data: branch,
      });
    }
  }, [topology.branches, onElementSelect]);

  const handlePaneClick = useCallback(() => {
    onElementSelect(null);
  }, [onElementSelect]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.1 });
  }, [fitView]);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-900"
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background color="#374151" />
        <Controls />
        <MiniMap 
          nodeColor={(node: any) => {
            if (node.data?.highlighted) return '#fbbf24';
            if (node.data?.voltageColor) return node.data.voltageColor;
            return '#6b7280';
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          style={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
          }}
        />
      </ReactFlow>
    </>
  );
}

export function TopologyViewer({
  topology,
  isLoading,
  error,
  gridId,
  highlightElement,
  searchResults,
  onSearch,
  onClearSearch,
  onRefresh,
}: TopologyViewerProps) {
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Handle element selection
  const handleElementSelect = useCallback((element: SelectedElement | null) => {
    setSelectedElement(element);
    setDrawerOpen(!!element);
  }, []);

  // Handle search result selection
  const handleSearchSelect = useCallback((result: SearchResult) => {
    if (!topology) return;
    
    if (result.type === 'bus') {
      const bus = topology.buses.find(b => b.id === result.id);
      if (bus) {
        handleElementSelect({
          id: result.id,
          type: 'bus',
          data: bus,
        });
      }
    } else {
      const branch = topology.branches.find(b => b.id === result.id);
      if (branch) {
        handleElementSelect({
          id: result.id,
          type: 'branch',
          data: branch,
        });
      }
    }
    onClearSearch();
  }, [topology, handleElementSelect, onClearSearch]);

  if (!topology && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-500">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">No Topology Available</h3>
          <p className="text-gray-400">
            Unable to load topology data for this grid
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* Header */}
      <TopologyHeader
        topology={topology}
        searchResults={searchResults}
        onSearch={onSearch}
        onClearSearch={onClearSearch}
        onSearchSelect={handleSearchSelect}
        onRefresh={onRefresh}
      />

      {/* ReactFlow Container */}
      <div className="h-full w-full">
        <ReactFlowProvider>
          {topology && (
            <TopologyFlow
              topology={topology}
              highlightElement={highlightElement}
              searchResults={searchResults}
              onElementSelect={handleElementSelect}
            />
          )}
        </ReactFlowProvider>
      </div>

      {/* Element Details Drawer */}
      <TopologyDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        selectedElement={selectedElement}
        gridId={gridId}
      />
    </div>
  );
} 