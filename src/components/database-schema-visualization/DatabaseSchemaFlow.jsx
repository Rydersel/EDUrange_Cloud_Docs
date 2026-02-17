"use client";

import { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  useStoreApi,
  useReactFlow
} from 'reactflow';

// Import our modular components
import { useRobustTheme, getThemeColors } from './theme/ThemeSystem';
import { parsePrismaSchema, createPlaceholderData } from './parsing/SchemaParser';
import { nodeTypes } from './types';
import { edgeTypes } from './components/EdgeComponents';
import FlowSidebar from '../database-schema-visualization/FlowSidebar';

// Import utility functions
import {
  getNodesInFlow,
  getFilteredEdges,
  applyNodeDimming,
  getFlowStatistics,
  getConnectedNodes,
  getSuggestedFlow
} from './utils/erd-flow-helpers';
import { applyEdgeBundling } from './utils/edge-bundling';

export const DatabaseSchemaFlow = ({ config }) => {
  const [schemaData, setSchemaData] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(false); // Changed from true to false

  // Flow filtering state
  const [visibleFlow, setVisibleFlow] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [allEdges, setAllEdges] = useState([]); // Master edge list
  const [allNodes, setAllNodes] = useState([]); // Master node list
  const [legendVisible, setLegendVisible] = useState(false); // Legend hover state
  const [edgeBundling, setEdgeBundling] = useState(true); // Edge bundling enabled by default

  const store = useStoreApi();
  const { fitView, getNodes, getViewport, setViewport } = useReactFlow();

  // Use robust theme detection instead of next-themes
  const { mounted: themeResolved, isDark, resolvedTheme } = useRobustTheme();
  const colors = getThemeColors(isDark);

  // Load schema data on component mount and when shortcuts setting OR theme changes
  useEffect(() => {
    // Don't load until theme is resolved to avoid wrong colors
    if (!themeResolved) return;

    console.log('Schema loading effect triggered. Shortcuts enabled:', shortcutsEnabled, 'Theme:', resolvedTheme);

    const loadSchemaData = async () => {
      setIsLoading(true);
      console.log('Starting to load schema data with shortcuts:', shortcutsEnabled);
      try {
        // Use current theme colors for schema generation
        const currentColors = getThemeColors(isDark);
        const data = await parsePrismaSchema(shortcutsEnabled, currentColors, config);
        console.log('Schema data loaded successfully. Nodes:', data.nodes.length, 'Edges:', data.edges.length);
        setSchemaData(data);

        // Store master lists
        setAllNodes(data.nodes);
        setAllEdges(data.edges);

        // Initialize with all data
        setNodes(data.nodes);
        setEdges(data.edges);
      } catch (error) {
        console.error('Failed to load schema data:', error);
        // Fallback to placeholder
        const currentColors = getThemeColors(isDark);
        const fallbackData = await createPlaceholderData(shortcutsEnabled, currentColors);
        setSchemaData(fallbackData);
        setAllNodes(fallbackData.nodes);
        setAllEdges(fallbackData.edges);
        setNodes(fallbackData.nodes);
        setEdges(fallbackData.edges);
      }
      setIsLoading(false);
      console.log('Schema loading completed');
    };

    loadSchemaData();
  }, [setNodes, setEdges, shortcutsEnabled, resolvedTheme, themeResolved, config, isDark]);

  // Memoized flow statistics
  const flowStats = useMemo(() => {
    return getFlowStatistics(allEdges);
  }, [allEdges]);

  // Memoized filtered edges with edge bundling
  const filteredEdges = useMemo(() => {
    const baseFilteredEdges = getFilteredEdges(allEdges, visibleFlow);
    // Apply edge bundling - completely disable when edgeBundling is false
    return applyEdgeBundling(baseFilteredEdges, allNodes, edgeBundling, edgeBundling);
  }, [allEdges, allNodes, visibleFlow, edgeBundling]);

  // Memoized nodes in current flow
  const nodesInFlow = useMemo(() => {
    return getNodesInFlow(allEdges, allNodes, visibleFlow);
  }, [allEdges, allNodes, visibleFlow]);

  // Memoized dimmed nodes
  const displayNodes = useMemo(() => {
    return applyNodeDimming(allNodes, nodesInFlow, visibleFlow);
  }, [allNodes, nodesInFlow, visibleFlow]);

  // Update ReactFlow when filtered data changes
  useEffect(() => {
    setEdges(filteredEdges);
    setNodes(displayNodes);
  }, [filteredEdges, displayNodes, setEdges, setNodes]);

  // Handle edge bundling change
  const handleEdgeBundlingChange = useCallback((enabled) => {
    setEdgeBundling(enabled);
    console.log(`Edge bundling ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  // Auto-fit view to visible nodes when flow changes - ALWAYS centers and zooms
  const fitViewToFlow = useCallback(() => {
    try {
      if (visibleFlow === 'all') {
        // Show all nodes with standard view reset
        fitView({
          padding: 0.1,
          duration: 800,
          includeHiddenNodes: false
        });
        console.log('View reset to show all tables');
      } else {
        // Get current ReactFlow nodes and filter to visible ones only
        const currentNodes = getNodes();
        const visibleNodeIds = Array.from(nodesInFlow);

        // Filter to actual table nodes (exclude background and dimmed nodes)
        const visibleTableNodes = currentNodes.filter(node =>
          visibleNodeIds.includes(node.id) &&
          !node.id.startsWith('bg-') && // Exclude background category nodes
          node.type === 'table' // Only include actual table nodes
        );

        console.log(`Found ${visibleTableNodes.length} visible table nodes:`, visibleTableNodes.map(n => n.id));

        if (visibleTableNodes.length > 0) {
          // Find the ReactFlow viewport element specifically
          const reactFlowViewport = document.querySelector('.react-flow__viewport');
          const reactFlowWrapper = document.querySelector('.react-flow');

          if (!reactFlowViewport || !reactFlowWrapper) {
            console.log('ReactFlow viewport/wrapper not found, using fallback');
            fitView({ padding: 0.15, duration: 800 });
            return;
          }

          // Get ReactFlow component dimensions for our calculation space
          const flowRect = reactFlowWrapper.getBoundingClientRect();
          const currentViewport = getViewport();

          console.log('ReactFlow component dimensions:', {
            width: flowRect.width,
            height: flowRect.height,
            currentZoom: currentViewport.zoom,
            currentX: currentViewport.x,
            currentY: currentViewport.y
          });

          const visibleDOMNodes = [];
          visibleTableNodes.forEach(node => {
            const domElement = reactFlowViewport.querySelector(`[data-id="${node.id}"]`);
            if (domElement) {
              const rect = domElement.getBoundingClientRect();

              // Calculate position in ReactFlow's coordinate system
              // Convert from screen coordinates to ReactFlow coordinates
              const reactFlowX = (rect.left - flowRect.left - currentViewport.x) / currentViewport.zoom;
              const reactFlowY = (rect.top - flowRect.top - currentViewport.y) / currentViewport.zoom;

              const nodeInfo = {
                id: node.id,
                // Use ReactFlow coordinate system
                x: reactFlowX,
                y: reactFlowY,
                width: rect.width / currentViewport.zoom,
                height: rect.height / currentViewport.zoom,
                centerX: reactFlowX + (rect.width / currentViewport.zoom) / 2,
                centerY: reactFlowY + (rect.height / currentViewport.zoom) / 2
              };

              visibleDOMNodes.push(nodeInfo);
            }
          });

          if (visibleDOMNodes.length === 0) {
            console.log('No DOM elements found for visible nodes, using fallback');
            fitView({ padding: 0.15, duration: 800 });
            return;
          }

          // Calculate the center in ReactFlow coordinate space
          const totalCenterX = visibleDOMNodes.reduce((sum, node) => sum + node.centerX, 0);
          const totalCenterY = visibleDOMNodes.reduce((sum, node) => sum + node.centerY, 0);

          const groupCenterX = totalCenterX / visibleDOMNodes.length;
          const groupCenterY = totalCenterY / visibleDOMNodes.length;

          // Calculate bounding box in ReactFlow coordinates
          const padding = 120; // Increased padding for better margins
          const minX = Math.min(...visibleDOMNodes.map(node => node.x)) - padding;
          const maxX = Math.max(...visibleDOMNodes.map(node => node.x + node.width)) + padding;
          const minY = Math.min(...visibleDOMNodes.map(node => node.y)) - padding;
          const maxY = Math.max(...visibleDOMNodes.map(node => node.y + node.height)) + padding;

          const boundingWidth = maxX - minX;
          const boundingHeight = maxY - minY;

          // Calculate zoom to fit all nodes in the ReactFlow component
          const flowWidth = flowRect.width - (sidebarOpen ? 0 : 0); // Sidebar margin already accounted for
          const flowHeight = flowRect.height;

          const zoomX = (flowWidth * 0.7) / boundingWidth; // Reduced from 0.8 to 0.7 for more margin
          const zoomY = (flowHeight * 0.7) / boundingHeight; // Reduced from 0.8 to 0.7 for more margin
          const optimalZoom = Math.min(zoomX, zoomY, 1.2); // Reduced max zoom from 1.5 to 1.2
          const finalZoom = Math.max(optimalZoom, 0.2);

          // Calculate translation to center the group in ReactFlow component
          const targetX = (flowWidth / 2) - (groupCenterX * finalZoom) - 150;
          const targetY = (flowHeight / 2) - (groupCenterY * finalZoom);

          console.log(`ReactFlow centering:`, {
            groupCenter: `(${groupCenterX.toFixed(0)}, ${groupCenterY.toFixed(0)})`,
            zoom: finalZoom.toFixed(2),
            translation: `(${targetX.toFixed(0)}, ${targetY.toFixed(0)})`,
            nodesUsed: visibleDOMNodes.length,
            boundingBox: `${boundingWidth.toFixed(0)}x${boundingHeight.toFixed(0)}`
          });

          // Set the new viewport with animation
          setViewport(
            { x: targetX, y: targetY, zoom: finalZoom },
            { duration: 800 }
          );

        } else {
          console.log('No visible table nodes found, using fallback fitView');
          fitView({ padding: 0.15, duration: 800 });
        }
      }
    } catch (error) {
      console.error('Error fitting view:', error);
      // Fallback to standard fit view
      fitView({ padding: 0.1, duration: 800 });
    }
  }, [fitView, getNodes, getViewport, setViewport, nodesInFlow, visibleFlow, sidebarOpen]);

  // Handle flow change
  const handleFlowChange = useCallback((newFlow) => {
    setVisibleFlow(newFlow);
    console.log(`Flow filter changed to: ${newFlow}`);

    // Log flow change details
    if (newFlow !== 'all') {
      const flowEdges = allEdges.filter(edge => edge.metadata?.group === newFlow);
      const connectedNodes = getNodesInFlow(allEdges, allNodes, newFlow);
      console.log(`Showing ${flowEdges.length} edges and ${connectedNodes.size} nodes for ${newFlow} flow`);
    }
  }, [allEdges, allNodes]);

  // Trigger view fitting when flow changes (with a small delay to ensure nodes are updated)
  useEffect(() => {
    const timer = setTimeout(() => {
      fitViewToFlow();
    }, 400); // Slightly longer delay to ensure dimming transitions complete

    return () => clearTimeout(timer);
  }, [visibleFlow, fitViewToFlow]);

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Pro options to hide attribution
  const proOptions = { hideAttribution: true };

  // Handle table hover for connected relationships
  const handleTableHover = useCallback((nodeId, columnName, isHovering) => {
    if (isHovering) {
      setHoveredColumn({ nodeId, columnName });

      // Find edges connected to this table and involving this column (from filtered edges)
      const connectedEdges = [];

      filteredEdges.forEach(edge => {
        // Check regular (non-bundled) edges
        if (!edge.data?.isBundled) {
          const isSourceTable = edge.source === nodeId;
          const isTargetTable = edge.target === nodeId;
          const labelText = edge.label || '';
          const isColumnInvolved = labelText.includes(columnName);

          if ((isSourceTable || isTargetTable) && isColumnInvolved) {
            connectedEdges.push(edge);
          }
        } else {
          // Check bundled edges - look through their original edges
          const originalEdges = edge.data?.originalEdges || [];
          const hasMatchingOriginal = originalEdges.some(originalEdge => {
            const isSourceTable = originalEdge.source === nodeId;
            const isTargetTable = originalEdge.target === nodeId;
            const labelText = originalEdge.label || '';
            const isColumnInvolved = labelText.includes(columnName);

            return (isSourceTable || isTargetTable) && isColumnInvolved;
          });

          if (hasMatchingOriginal) {
            connectedEdges.push(edge);
          }
        }
      });

      if (connectedEdges.length > 0) {
        // Highlight the edges
        setEdges(eds => {
          return eds.map((ed) => {
            if (connectedEdges.find(e => e.id === ed.id)) {
              return {
                ...ed,
                style: {
                  ...ed.style,
                  stroke: colors.reactFlow.edgeHover,
                  strokeWidth: 3
                }
              };
            }
            return ed;
          });
        });

        // Highlight connected tables and related columns
        connectedEdges.forEach(edge => {
          let originalEdgesToProcess = [];

          // If it's a bundled edge, process all original edges
          if (edge.data?.isBundled && edge.data?.originalEdges) {
            originalEdgesToProcess = edge.data.originalEdges.filter(originalEdge => {
              const isSourceTable = originalEdge.source === nodeId;
              const isTargetTable = originalEdge.target === nodeId;
              const labelText = originalEdge.label || '';
              const isColumnInvolved = labelText.includes(columnName);
              return (isSourceTable || isTargetTable) && isColumnInvolved;
            });
          } else {
            // Regular edge
            originalEdgesToProcess = [edge];
          }

          originalEdgesToProcess.forEach(originalEdge => {
            const connectedTableId = originalEdge.source === nodeId ? originalEdge.target : originalEdge.source;

            // Extract the related column name from the edge label
            const labelText = originalEdge.label || '';
            const relatedColumnMatch = labelText.match(/(\w+)\s*→\s*(\w+)/);

            if (relatedColumnMatch && connectedTableId) {
              const [, fromField, toField] = relatedColumnMatch;
              const relatedColumnName = originalEdge.source === nodeId ? toField : fromField;

              // Find and highlight the connected table's related column
              const targetNode = document.querySelector(`[data-id="${connectedTableId}"]`);
              if (targetNode) {
                const columnRows = targetNode.querySelectorAll('[data-column-name]');
                columnRows.forEach(row => {
                  if (row.getAttribute('data-column-name') === relatedColumnName) {
                    row.style.backgroundColor = colors.columnHover;
                  }
                });
              }
            }
          });
        });
      }
    } else {
      setHoveredColumn(null);

      // Reset all edges to their original styling (considering flow filter)
      setEdges(filteredEdges);

      // Reset all column highlights by removing the inline style
      // This allows the component's own CSS to take over
      const allNodes = document.querySelectorAll('.react-flow__node');
      allNodes.forEach(node => {
        const columnRows = node.querySelectorAll('[data-column-name]');
        columnRows.forEach(row => {
          // Remove the inline background color style to let component CSS take over
          row.style.removeProperty('background-color');
        });
      });
    }
  }, [filteredEdges, setEdges, colors]);

  // Listen for table hover events
  useEffect(() => {
    const handleTableHoverEvent = (event) => {
      const { nodeId, columnName, isHovering } = event.detail;
      handleTableHover(nodeId, columnName, isHovering);
    };

    window.addEventListener('tableHover', handleTableHoverEvent);
    return () => {
      window.removeEventListener('tableHover', handleTableHoverEvent);
    };
  }, [handleTableHover]);

  return (
    <div
      style={{
        width: '100%',
        height: 'calc(90vh - 120px)',
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        backgroundColor: colors.background,
        position: 'relative',
        overflow: 'hidden' // Prevent sidebar from affecting layout
      }}
    >
      {/* Flow Sidebar */}
      <FlowSidebar
        visibleFlow={visibleFlow}
        onFlowChange={handleFlowChange}
        flowStats={flowStats}
        isOpen={sidebarOpen}
        onToggle={handleSidebarToggle}
        onFocusView={fitViewToFlow}
        edgeBundling={edgeBundling}
        onEdgeBundlingChange={handleEdgeBundlingChange}
      />

      {/* Strategic Aliases Toggle Button - repositioned to account for sidebar */}
      <button
        onClick={() => {
          console.log('Aliases button clicked. Current state:', shortcutsEnabled);
          setShortcutsEnabled(!shortcutsEnabled);
          console.log('Aliases button new state will be:', !shortcutsEnabled);
        }}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          backgroundColor: shortcutsEnabled ? colors.success : colors.textMuted,
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: isDark
            ? '0 2px 4px rgba(0, 0, 0, 0.3)'
            : '0 2px 4px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease'
        }}
        title={shortcutsEnabled ?
          'Strategic alias tables enabled. Reduces visual clutter by creating smart table references near related domains.' :
          'Strategic alias tables disabled. All relationships shown as direct connections.'
        }
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = isDark
            ? '0 4px 8px rgba(0, 0, 0, 0.4)'
            : '0 4px 8px rgba(0, 0, 0, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = isDark
            ? '0 2px 4px rgba(0, 0, 0, 0.3)'
            : '0 2px 4px rgba(0, 0, 0, 0.1)';
        }}
      >
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'inline-block'
        }}></span>
        {shortcutsEnabled ? 'Table Aliases ON' : 'Table Aliases OFF'}
      </button>

      {/* Flow Status Indicator */}
      {visibleFlow !== 'all' && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '12px',
          zIndex: 10,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          boxShadow: isDark
            ? '0 2px 4px rgba(0, 0, 0, 0.3)'
            : '0 2px 4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: colors.success
          }}></div>
          <span style={{ fontWeight: '500', color: colors.text }}>
            {flowStats[visibleFlow]?.label} ({flowStats[visibleFlow]?.count} connections)
          </span>
        </div>
      )}

      {/* Legend Help Button and Hover Panel */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        zIndex: 10
      }}>
        {/* Help Button */}
        <div
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: isDark
              ? '0 2px 4px rgba(0, 0, 0, 0.3)'
              : '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            fontSize: '16px',
            fontWeight: 'bold',
            color: colors.textSecondary
          }}
          onMouseEnter={() => setLegendVisible(true)}
          onMouseLeave={() => setLegendVisible(false)}
          title="Show connection legend"
        >
          ?
        </div>

        {/* Legend Panel - Only visible on hover */}
        {legendVisible && (
          <div
            style={{
              position: 'absolute',
              bottom: '50px',
              right: '0',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '12px',
              fontSize: '11px',
              boxShadow: isDark
                ? '0 4px 6px rgba(0, 0, 0, 0.3)'
                : '0 4px 6px rgba(0, 0, 0, 0.1)',
              maxWidth: '280px',
              minWidth: '240px',
              opacity: 1,
              animation: 'fadeIn 0.2s ease',
              pointerEvents: 'auto'
            }}
            onMouseEnter={() => setLegendVisible(true)}
            onMouseLeave={() => setLegendVisible(false)}
          >
            <div style={{
              fontWeight: '600',
              marginBottom: '8px',
              color: colors.text,
              fontSize: '12px'
            }}>
              Connection Types
            </div>

            {/* Legend items - Note: Since we reverted to uniform gray, these are now for reference */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: colors.isDark ? '#71717a' : '#6b7280',
                  borderRadius: '1px'
                }}></div>
                <span style={{ color: colors.text, fontSize: '10px' }}>
                  🔑 Primary Keys
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: colors.isDark ? '#71717a' : '#6b7280',
                  borderRadius: '1px'
                }}></div>
                <span style={{ color: colors.text, fontSize: '10px' }}>
                  🔗 Foreign Keys
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: colors.isDark ? '#71717a' : '#6b7280',
                  borderRadius: '1px'
                }}></div>
                <span style={{ color: colors.text, fontSize: '10px' }}>
                  1→∞ One-to-Many
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: colors.isDark ? '#71717a' : '#6b7280',
                  borderRadius: '1px'
                }}></div>
                <span style={{ color: colors.text, fontSize: '10px' }}>
                  ∞→∞ Many-to-Many
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: colors.isDark ? '#71717a' : '#6b7280',
                  borderRadius: '1px'
                }}></div>
                <span style={{ color: colors.text, fontSize: '10px' }}>
                  🛡️ Unique Constraints
                </span>
              </div>

              {/* Alias edge example */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '20px',
                  height: '2px',
                  backgroundColor: colors.isDark ? '#71717a' : '#6b7280',
                  borderRadius: '1px',
                  borderTop: `1px dashed ${colors.isDark ? '#71717a' : '#6b7280'}`,
                  borderBottom: `1px dashed ${colors.isDark ? '#71717a' : '#6b7280'}`,
                  opacity: 0.8
                }}></div>
                <span style={{ color: colors.text, fontSize: '10px' }}>
                  🔗 Alias Connections
                </span>
              </div>
            </div>

            <div style={{
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: `1px solid ${colors.borderLight}`,
              color: colors.textMuted,
              fontSize: '9px'
            }}>
              💡 Hover over columns to highlight connections
            </div>
          </div>
        )}
      </div>

      {/* Main ReactFlow Component */}
      <div style={{
        width: '100%',
        height: '100%',
        marginLeft: sidebarOpen ? '220px' : '0',
        transition: 'margin-left 0.3s ease'
      }}>
        {!themeResolved ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            fontSize: '16px',
            color: '#6b7280'
          }}>
            Initializing theme...
          </div>
        ) : isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            fontSize: '16px',
            color: colors.textSecondary
          }}>
            Generating optimal layout...
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            proOptions={proOptions}
            nodesDraggable={false}
            fitView
            fitViewOptions={{
              padding: 0.1,
              includeHiddenNodes: false,
              minZoom: 0.1,
              maxZoom: 1.5
            }}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
          >
            <Background
              variant="dots"
              gap={20}
              size={1}
              color={colors.reactFlow.dot}
              style={{ backgroundColor: colors.reactFlow.background }}
            />
            <Controls
              className={isDark ? "react-flow-controls-dark" : "react-flow-controls-light"}
              style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                boxShadow: isDark
                  ? '0 4px 6px rgba(0, 0, 0, 0.3)'
                  : '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
              showInteractive={false}
            />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};
