'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  ConnectionMode,
  Panel,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { withRole } from '@/components/auth/withRole';
import { TopologyHeader } from '@/components/topology/TopologyHeader';
import { DetailsDrawer } from '@/components/topology/DetailsDrawer';
import { SearchInput } from '@/components/topology/SearchInput';
import { LegendPopover } from '@/components/topology/LegendPopover';
import { FitViewButton } from '@/components/topology/FitViewButton';
import { useTopologyData } from '@/hooks/useTopologyData';
import { useTopologyLive } from '@/hooks/useTopologyLive';
import { useTopologyLayout } from '@/hooks/useTopologyLayout';
import { useTopologySearch } from '@/hooks/useTopologySearch';
import { createTopologyNodes, createTopologyEdges } from '@/utils/topologyUtils';
import { cn } from '@/lib/utils';

interface SelectedElement {
  id: string;
  type: 'node' | 'edge';
  data: any;
}

const TopologyFlow = () => {
  const [gridId] = useState('alberta-test');
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  const searchParams = useSearchParams();
  const focusElement = searchParams?.get('focus');

  // Data hooks
  const { topology, isLoading: topologyLoading, error: topologyError } = useTopologyData(gridId);
  const { liveData, isLoading: liveLoading } = useTopologyLive(gridId);
  const { nodes, edges, isLayouting } = useTopologyLayout(topology, liveData);
  const { searchResults, searchQuery, handleSearch, clearSearch, focusElement: searchFocus } = useTopologySearch(topology);

  const { fitView, getNode, getEdge } = useReactFlow();

  // Handle element selection
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedElement({
      id: node.id,
      type: 'node',
      data: node.data,
    });
    setDrawerOpen(true);
  }, []);

  const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedElement({
      id: edge.id,
      type: 'edge',
      data: edge.data,
    });
    setDrawerOpen(true);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedElement(null);
    setDrawerOpen(false);
  }, []);

  // Handle search focus
  useEffect(() => {
    if (searchFocus && reactFlowInstance.current) {
      const node = getNode(searchFocus);
      const edge = getEdge(searchFocus);
      
      if (node || edge) {
        // Center on element and flash highlight
        reactFlowInstance.current.setCenter(
          node ? node.position.x : (edge?.source === searchFocus ? 0 : 0),
          node ? node.position.y : 0,
          { zoom: 1.5, duration: 800 }
        );

        // Flash highlight animation
        const element = document.querySelector(`[data-id="${searchFocus}"]`);
        if (element) {
          element.classList.add('topology-flash');
          setTimeout(() => element.classList.remove('topology-flash'), 2000);
        }
      }
    }
  }, [searchFocus, getNode, getEdge]);

  // Handle URL focus parameter
  useEffect(() => {
    if (focusElement && reactFlowInstance.current && nodes.length > 0) {
      const node = getNode(focusElement);
      if (node) {
        reactFlowInstance.current.setCenter(node.position.x, node.position.y, {
          zoom: 1.5,
          duration: 800,
        });
      }
    }
  }, [focusElement, nodes, getNode]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.1, duration: 800 });
  }, [fitView]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (event.target instanceof HTMLInputElement) return;

      switch (event.key) {
        case 'f':
        case 'F':
          handleFitView();
          break;
        case '/':
          event.preventDefault();
          const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
          searchInput?.focus();
          break;
        case 'Escape':
          setDrawerOpen(false);
          setSelectedElement(null);
          clearSearch();
          break;
        case '+':
        case '=':
          reactFlowInstance.current?.zoomIn();
          break;
        case '-':
          reactFlowInstance.current?.zoomOut();
          break;
      }
    };

    // Arrow key panning
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      
      const panAmount = 50;
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          reactFlowInstance.current?.setViewport({
            ...reactFlowInstance.current.getViewport(),
            y: reactFlowInstance.current.getViewport().y + panAmount,
          });
          break;
        case 'ArrowDown':
          event.preventDefault();
          reactFlowInstance.current?.setViewport({
            ...reactFlowInstance.current.getViewport(),
            y: reactFlowInstance.current.getViewport().y - panAmount,
          });
          break;
        case 'ArrowLeft':
          event.preventDefault();
          reactFlowInstance.current?.setViewport({
            ...reactFlowInstance.current.getViewport(),
            x: reactFlowInstance.current.getViewport().x + panAmount,
          });
          break;
        case 'ArrowRight':
          event.preventDefault();
          reactFlowInstance.current?.setViewport({
            ...reactFlowInstance.current.getViewport(),
            x: reactFlowInstance.current.getViewport().x - panAmount,
          });
          break;
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleFitView, clearSearch]);

  if (topologyError) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <div className="text-destructive text-6xl mb-4">⚠</div>
          <h2 className="text-2xl font-bold mb-2">Topology Error</h2>
          <p className="text-muted-foreground mb-4">{topologyError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Header Bar */}
      <div className="flex-none h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">Topology</h1>
            <SearchInput
              value={searchQuery}
              onChange={handleSearch}
              results={searchResults}
              onResultSelect={(result) => {
                setSelectedElement({
                  id: result.id,
                  type: result.type === 'bus' ? 'node' : 'edge',
                  data: result,
                });
                setDrawerOpen(true);
                clearSearch();
              }}
              placeholder="Search buses, lines, transformers..."
              className="w-64"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <LegendPopover />
            <FitViewButton onClick={handleFitView} />
            {/* Theme toggle would go here */}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {(topologyLoading || isLayouting) && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium">
              {topologyLoading ? 'Loading topology...' : 'Computing layout...'}
            </p>
            <p className="text-sm text-muted-foreground">
              {topologyLoading ? 'Fetching grid data' : 'Optimizing node positions'}
            </p>
          </div>
        </div>
      )}

      {/* Main Flow Area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onInit={onInit}
          fitView
          attributionPosition="bottom-left"
          connectionMode={ConnectionMode.Loose}
          minZoom={0.1}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          nodeExtent={[[-Infinity, -Infinity], [Infinity, Infinity]]}
          className="bg-background"
          role="img"
          aria-label="Grid one-line diagram"
        >
          <Background color="hsl(var(--muted))" />
          <Controls showInteractive={false} />
          
          {/* Status Panel */}
          <Panel position="bottom-right" className="bg-background/95 backdrop-blur border rounded-md p-2 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Buses:</span>
                <span className="font-mono">{topology?.buses?.length || 0}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Branches:</span>
                <span className="font-mono">{topology?.branches?.length || 0}</span>
              </div>
              {liveData && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Live:</span>
                  <span className="font-mono text-green-600">●</span>
                </div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Details Drawer */}
      <DetailsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        element={selectedElement}
        liveData={liveData}
      />

      {/* Flash animation styles */}
      <style jsx global>{`
        .topology-flash {
          animation: flash 2s ease-in-out;
        }
        
        @keyframes flash {
          0%, 100% { 
            outline: 2px solid transparent; 
            outline-offset: 2px;
          }
          25%, 75% { 
            outline: 2px solid hsl(var(--primary)); 
            outline-offset: 4px;
          }
          50% { 
            outline: 3px solid hsl(var(--primary)); 
            outline-offset: 6px;
          }
        }
      `}</style>
    </div>
  );
};

function TopologyPage() {
  return (
    <ReactFlowProvider>
      <TopologyFlow />
    </ReactFlowProvider>
  );
}

export default withRole(['ENGINEER', 'OPERATOR', 'ADMIN'])(TopologyPage); 