// Simple layout worker for topology
self.onmessage = function(e) {
  const { nodes, edges } = e.data;
  
  try {
    // Simple grid layout as fallback
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const nodeWidth = 100;
    const nodeHeight = 60;
    const spacing = 150;
    
    const layoutedNodes = nodes.map((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      return {
        ...node,
        position: {
          x: col * spacing + 50,
          y: row * spacing + 50,
        },
      };
    });
    
    self.postMessage({ 
      nodes: layoutedNodes, 
      edges: edges 
    });
  } catch (error) {
    self.postMessage({ 
      error: error.message,
      nodes: nodes,
      edges: edges
    });
  }
}; 