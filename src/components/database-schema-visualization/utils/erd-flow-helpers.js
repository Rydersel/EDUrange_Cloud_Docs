// ERD Flow Helper Functions
// Utilities for filtering edges, calculating connected nodes, and managing flow visibility

/**
 * Get all nodes connected to the given flow group
 * @param {Array} edges - All edges in the diagram
 * @param {Array} nodes - All nodes in the diagram
 * @param {string} flowGroup - The flow group to filter by
 * @returns {Set} Set of node IDs that are part of the flow
 */
export const getNodesInFlow = (edges, nodes, flowGroup) => {
  const connectedNodes = new Set();
  
  if (flowGroup === 'all') {
    // All nodes are connected in 'all' view
    nodes.forEach(node => connectedNodes.add(node.id));
    return connectedNodes;
  }
  
  // Find all edges in the selected flow
  const flowEdges = edges.filter(edge => edge.metadata?.group === flowGroup);
  
  // Add source and target nodes from flow edges
  flowEdges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });
  
  return connectedNodes;
};

/**
 * Get filtered edges based on selected flow
 * @param {Array} allEdges - All edges in the diagram
 * @param {string} visibleFlow - Currently selected flow
 * @returns {Array} Filtered edges
 */
export const getFilteredEdges = (allEdges, visibleFlow) => {
  if (visibleFlow === 'all') return allEdges;
  return allEdges.filter(edge => edge.metadata?.group === visibleFlow);
};

/**
 * Apply dimming styles to nodes not in the current flow
 * @param {Array} nodes - All nodes
 * @param {Set} nodesInFlow - Set of node IDs in the current flow
 * @param {string} visibleFlow - Currently selected flow
 * @returns {Array} Nodes with updated styles
 */
export const applyNodeDimming = (nodes, nodesInFlow, visibleFlow) => {
  if (visibleFlow === 'all') {
    // Reset all nodes to full opacity
    return nodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        opacity: 1,
        filter: 'none'
      }
    }));
  }
  
  // Apply dimming to nodes not in flow
  return nodes.map(node => {
    const isInFlow = nodesInFlow.has(node.id);
    return {
      ...node,
      style: {
        ...node.style,
        opacity: isInFlow ? 1 : 0.3,
        filter: isInFlow ? 'none' : 'grayscale(50%)',
        transition: 'opacity 0.3s ease, filter 0.3s ease'
      }
    };
  });
};

/**
 * Get connected nodes for focus mode (recursive traversal)
 * @param {string} nodeId - The node to focus on
 * @param {Array} edges - All edges
 * @param {number} depth - How many levels to traverse (default: 2)
 * @returns {Set} Set of connected node IDs
 */
export const getConnectedNodes = (nodeId, edges, depth = 2) => {
  const connected = new Set([nodeId]);
  const visited = new Set();
  
  const traverse = (currentId, currentDepth) => {
    if (currentDepth <= 0 || visited.has(currentId)) return;
    visited.add(currentId);
    
    // Find edges connected to current node
    edges.forEach(edge => {
      if (edge.source === currentId) {
        connected.add(edge.target);
        traverse(edge.target, currentDepth - 1);
      } else if (edge.target === currentId) {
        connected.add(edge.source);
        traverse(edge.source, currentDepth - 1);
      }
    });
  };
  
  traverse(nodeId, depth);
  return connected;
};

/**
 * Get flow statistics for display
 * @param {Array} edges - All edges
 * @returns {Object} Statistics for each flow group
 */
export const getFlowStatistics = (edges) => {
  const stats = {
    all: { count: edges.length, label: 'All Relationships' },
    auth: { count: 0, label: 'Authentication Flow' },
    challenge: { count: 0, label: 'Challenge Lifecycle' },
    competition: { count: 0, label: 'Competition Management' },
    scoring: { count: 0, label: 'Scoring & Progress' },
    activity: { count: 0, label: 'Activity Tracking' },
    general: { count: 0, label: 'General Relationships' }
  };
  
  edges.forEach(edge => {
    const group = edge.metadata?.group || 'general';
    if (stats[group]) {
      stats[group].count++;
    }
  });
  
  return stats;
};

/**
 * Flow group color mapping for visual consistency
 */
export const flowGroupColors = {
  auth: '#EF4444',        // Red
  challenge: '#8B5CF6',   // Purple
  competition: '#10B981', // Green
  scoring: '#F59E0B',     // Orange
  activity: '#06B6D4',    // Cyan
  general: '#6B7280'      // Gray
};

/**
 * Get suggested flow based on selected node
 * @param {string} nodeId - The selected node ID
 * @param {Array} edges - All edges
 * @returns {string} Suggested flow group
 */
export const getSuggestedFlow = (nodeId, edges) => {
  const connectedEdges = edges.filter(edge => 
    edge.source === nodeId || edge.target === nodeId
  );
  
  if (connectedEdges.length === 0) return 'all';
  
  // Count occurrences of each flow group
  const flowCounts = {};
  connectedEdges.forEach(edge => {
    const group = edge.metadata?.group || 'general';
    flowCounts[group] = (flowCounts[group] || 0) + 1;
  });
  
  // Return the most common flow group
  return Object.entries(flowCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
}; 