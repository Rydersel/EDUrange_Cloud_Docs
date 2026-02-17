// Edge Bundling Utility
// Groups nearby edges going to the same destination and creates bundled paths

// Import configuration
import bundlingConfig from '../config/edge-bundling-config.json';

/**
 * Calculate distance between two points
 */
const calculateDistance = (pos1, pos2) => {
  if (!pos1 || !pos2 || typeof pos1.x !== 'number' || typeof pos1.y !== 'number' ||
      typeof pos2.x !== 'number' || typeof pos2.y !== 'number') {
    return Infinity;
  }
  return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
};

/**
 * Calculate the minimum distance between two line segments (edges)
 */
const calculateLineDistance = (edge1, edge2, nodes) => {
  const source1 = nodes.find(n => n.id === edge1.source);
  const target1 = nodes.find(n => n.id === edge1.target);
  const source2 = nodes.find(n => n.id === edge2.source);
  const target2 = nodes.find(n => n.id === edge2.target);

  if (!source1 || !target1 || !source2 || !target2) {
    return Infinity;
  }

  // If edges are identical (same source and target), check if they represent different relationships
  if (edge1.source === edge2.source && edge1.target === edge2.target) {
    // If they have different field relationships, give them some distance to avoid over-bundling
    const edge1Fields = `${edge1.data?.fromField || edge1.metadata?.fromField || ''}-${edge1.data?.toField || edge1.metadata?.toField || ''}`;
    const edge2Fields = `${edge2.data?.fromField || edge2.metadata?.fromField || ''}-${edge2.data?.toField || edge2.metadata?.toField || ''}`;
    
    if (edge1Fields !== edge2Fields) {
      // Different field relationships - give them artificial distance to prevent bundling
      return 50; // Increased from 25 to prevent over-bundling
    }
    // Same relationship - true duplicates can be bundled
    return 0;
  }

  // Simple approach: Calculate distance between the midpoints of the two line segments
  const mid1 = {
    x: (source1.position.x + target1.position.x) / 2,
    y: (source1.position.y + target1.position.y) / 2
  };

  const mid2 = {
    x: (source2.position.x + target2.position.x) / 2,
    y: (source2.position.y + target2.position.y) / 2
  };

  const distance = Math.sqrt(
    Math.pow(mid2.x - mid1.x, 2) + Math.pow(mid2.y - mid1.y, 2)
  );

  // Debug: Log the calculation
  if (bundlingConfig.safety.enableDetailedLogging) {
    console.log(`📏 Line distance: ${Math.round(distance)}px between ${edge1.source}→${edge1.target} and ${edge2.source}→${edge2.target}`);
  }

  return distance;
};

/**
 * Calculate centroid of a group of positions
 */
const calculateCentroid = (positions) => {
  const validPositions = positions.filter(pos =>
    pos && typeof pos.x === 'number' && typeof pos.y === 'number'
  );

  if (validPositions.length === 0) return { x: 0, y: 0 };

  const totalX = validPositions.reduce((sum, pos) => sum + pos.x, 0);
  const totalY = validPositions.reduce((sum, pos) => sum + pos.y, 0);

  return {
    x: totalX / validPositions.length,
    y: totalY / validPositions.length
  };
};

/**
 * Get category for a table name
 */
const getTableCategory = (tableName) => {
  const name = tableName.toLowerCase();
  if (name.includes('user') || name.includes('account') || name.includes('session')) return 'user';
  if (name.includes('competition') || name.includes('group')) return 'competition';
  if (name.includes('challenge') || name.includes('instance') || name.includes('pack')) return 'challenge';
  if (name.includes('activity') || name.includes('log')) return 'activity';
  if (name.includes('verification') || name.includes('token')) return 'auth';
  if (name.includes('question') || name.includes('attempt') || name.includes('completion')) return 'question';
  return 'system';
};

/**
 * Calculate direction vector between two points
 */
const calculateDirection = (pos1, pos2) => {
  if (!pos1 || !pos2 || typeof pos1.x !== 'number' || typeof pos1.y !== 'number' ||
      typeof pos2.x !== 'number' || typeof pos2.y !== 'number') {
    return { dx: 0, dy: 0, angle: 0 };
  }

  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const angle = Math.atan2(dy, dx);

  return { dx, dy, angle };
};

/**
 * Check if two directions are similar (within configured tolerance)
 */
const isSimilarDirection = (dir1, dir2, tolerance = bundlingConfig.aggressiveBundling.directionalBundling.directionToleranceRadians) => {
  const angleDiff = Math.abs(dir1.angle - dir2.angle);
  const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);
  return normalizedDiff <= tolerance;
};

/**
 * Group edges by their target destination AND similar directions
 */
const groupEdgesByTargetAndDirection = (edges, nodes) => {
  const edgeGroups = {};

  // First pass: group by target (existing logic)
  edges.forEach(edge => {
    const targetId = edge.target;
    if (!edgeGroups[targetId]) {
      edgeGroups[targetId] = [];
    }
    edgeGroups[targetId].push(edge);
  });

  // Second pass: create directional bundles for edges going in similar directions
  const directionalGroups = {};
  const processedEdges = new Set();

  edges.forEach((edge, index) => {
    if (processedEdges.has(edge.id)) return;

    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) return;

    const direction = calculateDirection(sourceNode.position, targetNode.position);
    const groupKey = `dir-${Math.round(direction.angle * 10)}`;

    if (!directionalGroups[groupKey]) {
      directionalGroups[groupKey] = [];
    }

    // Find all edges going in similar direction
    const similarEdges = [edge];
    processedEdges.add(edge.id);

    edges.forEach((otherEdge, otherIndex) => {
      if (processedEdges.has(otherEdge.id) || edge.id === otherEdge.id) return;

      const otherSourceNode = nodes.find(n => n.id === otherEdge.source);
      const otherTargetNode = nodes.find(n => n.id === otherEdge.target);

      if (!otherSourceNode || !otherTargetNode) return;

      const otherDirection = calculateDirection(otherSourceNode.position, otherTargetNode.position);
      const distance = calculateLineDistance(edge, otherEdge, nodes);

      // Bundle if: similar direction AND nearby sources (within configured distance)
      if (isSimilarDirection(direction, otherDirection) && distance <= bundlingConfig.aggressiveBundling.directionalBundling.proximityThreshold) {
        similarEdges.push(otherEdge);
        processedEdges.add(otherEdge.id);
      }
    });

    if (similarEdges.length > 1) {
      directionalGroups[groupKey] = similarEdges;
      console.log(`🧭 Directional bundle: ${similarEdges.length} edges going ${Math.round(direction.angle * 180 / Math.PI)}°`);
    }
  });

  // Combine target-based and direction-based groups, prioritizing larger bundles
  const combinedGroups = {};

  // Add directional groups first (they catch loops and similar paths)
  Object.values(directionalGroups).forEach((dirGroup, index) => {
    if (dirGroup.length > 1) {
      combinedGroups[`directional-${index}`] = dirGroup;
    }
  });

  // Add target-based groups for remaining edges
  Object.entries(edgeGroups).forEach(([targetId, targetGroup]) => {
    const unprocessedEdges = targetGroup.filter(edge =>
      !Object.values(directionalGroups).some(dirGroup =>
        dirGroup.some(dirEdge => dirEdge.id === edge.id)
      )
    );

    if (unprocessedEdges.length > 0) {
      combinedGroups[targetId] = unprocessedEdges;
    }
  });

  return combinedGroups;
};

/**
 * Group edges by their target destination
 */
const groupEdgesByTarget = (edges, nodes) => {
  return groupEdgesByTargetAndDirection(edges, nodes);
};

/**
 * Find edges that are close enough to bundle together with configurable strategies
 */
const findBundleCandidates = (edgeGroup, nodes, proximityThreshold = 500, bundlingMode = 'aggressive') => {
  if (edgeGroup.length < 2) return [edgeGroup]; // Can't bundle single edge

  const bundles = [];
  const processed = new Set();

  // Get appropriate config based on bundling mode
  const isLightMode = bundlingMode === 'light';
  const categoryMinimum = isLightMode 
    ? bundlingConfig.lightBundling.minimumEdges 
    : bundlingConfig.aggressiveBundling.categoryBundling.minimumEdges;

  // First pass: Category-based bundling (only for aggressive mode)
  if (!isLightMode) {
    const edgesBySourceCategory = {};
    edgeGroup.forEach((edge, index) => {
      if (processed.has(index)) return;

      const sourceNode = nodes.find(n => n.id === edge.source);
      if (!sourceNode) return;

      const sourceCategory = getTableCategory(edge.source);
      if (!edgesBySourceCategory[sourceCategory]) {
        edgesBySourceCategory[sourceCategory] = [];
      }
      edgesBySourceCategory[sourceCategory].push({ edge, index });
    });

    // Bundle all edges from the same category to the same target/direction
    Object.values(edgesBySourceCategory).forEach(categoryEdges => {
      if (categoryEdges.length >= categoryMinimum) {
        // Bundle all edges from this category together
        const bundle = categoryEdges.map(item => item.edge);
        categoryEdges.forEach(item => processed.add(item.index));
        bundles.push(bundle);
        
        if (bundlingConfig.safety.enableDetailedLogging) {
          console.log(`📦 Category bundle: ${categoryEdges.length} edges from ${getTableCategory(categoryEdges[0].edge.source)} category`);
        }
        return;
      }
    });
  }

  // Second pass: Distance-based bundling for remaining edges
  edgeGroup.forEach((edge, index) => {
    if (processed.has(index)) return;

    const sourceNode = nodes.find(n => n.id === edge.source);
    if (!sourceNode) return;

    const bundle = [edge];
    processed.add(index);

    // Find nearby edges within proximity threshold
    edgeGroup.forEach((otherEdge, otherIndex) => {
      if (processed.has(otherIndex) || index === otherIndex) return;

      const otherSourceNode = nodes.find(n => n.id === otherEdge.source);
      if (!otherSourceNode) return;

      const distance = calculateLineDistance(edge, otherEdge, nodes);

      // Debug: Log actual distance values to understand the scale
      if (bundlingConfig.safety.enableDetailedLogging && distance <= proximityThreshold) {
        console.log(`📏 Line distance: ${Math.round(distance)}px between ${edge.source}→${edge.target} and ${otherEdge.source}→${otherEdge.target} (${bundlingMode} mode)`);
      }

      // Use configured proximity threshold for distance-based bundling
      if (distance <= proximityThreshold) {
        bundle.push(otherEdge);
        processed.add(otherIndex);
      }
    });

    if (bundle.length > 1 && bundlingConfig.safety.enableDetailedLogging) {
      console.log(`📦 Distance bundle (${bundlingMode}): ${bundle.length} edges within ${proximityThreshold}px`);
    }
    bundles.push(bundle);
  });

  return bundles;
};

/**
 * Create bundled edge path with simple single-line representation
 */
const createBundledEdges = (edgeBundle, nodes) => {
  if (edgeBundle.length === 1) {
    return edgeBundle; // Return original edge if no bundling needed
  }

  const targetNode = nodes.find(n => n.id === edgeBundle[0].target);
  if (!targetNode) return edgeBundle;

  // Get source nodes and calculate bundle centroid
  const sourceNodes = edgeBundle
    .map(edge => nodes.find(n => n.id === edge.source))
    .filter(node => node);

  if (sourceNodes.length === 0) return edgeBundle;

  const sourcePositions = sourceNodes.map(node => node.position);
  const bundleCentroid = calculateCentroid(sourcePositions);

  // Create a single representative edge that represents the entire bundle
  const representativeEdge = edgeBundle[0]; // Use first edge as template

  // Collect all the source and target information for the label
  const allSourceTables = edgeBundle.map(edge => edge.source).join(', ');
  const connectionCount = edgeBundle.length;

  // Create ONE clean bundled edge WITH preserved original edge data
  const bundledEdge = {
    ...representativeEdge,
    id: `bundle-${representativeEdge.target}-${Date.now()}`,
    type: 'bundledEdge',
    source: 'bundle-source', // Virtual source for bundle centroid
    target: representativeEdge.target,
    sourceHandle: undefined, // Bundle doesn't use source handle
    targetHandle: representativeEdge.targetHandle, // Preserve target handle for proper connection
    data: {
      ...representativeEdge.data,
      isBundled: true,
      bundleSegment: 'single', // New: single line mode
      bundlePoint: bundleCentroid, // Source is the centroid
      bundleIndex: 0,
      bundleSize: connectionCount,
      bundledTables: allSourceTables,
      originalEdge: representativeEdge,
      // CRITICAL: Preserve all original edges for hover system
      originalEdges: edgeBundle.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        metadata: edge.metadata,
        data: edge.data
      }))
    },
    // Override source coordinates to use centroid
    sourceX: bundleCentroid.x,
    sourceY: bundleCentroid.y,
    targetX: targetNode.position.x,
    targetY: targetNode.position.y,
    label: `${connectionCount} connections → ${representativeEdge.target}`,
    style: {
      ...representativeEdge.style,
      strokeWidth: Math.min(
        bundlingConfig.visual.minBundleStrokeWidth + connectionCount * bundlingConfig.visual.bundleStrokeMultiplier,
        bundlingConfig.visual.maxBundleStrokeWidth
      ),
      stroke: representativeEdge.style?.stroke || '#71717a'
    }
  };

  // Return just ONE edge instead of multiple segments
  return [bundledEdge];
};

/**
 * Apply light bundling to prevent weird loops - always enabled
 * This catches the most egregious routing issues without being too aggressive
 */
const applyLightBundling = (edges, nodes) => {
  if (bundlingConfig.safety.enableDetailedLogging) {
    console.log('🔗 Applying light bundling to prevent weird loops...');
  }

  // For light bundling, use simple distance-based approach across ALL edges
  // Don't pre-group by target - let distance thresholds control everything
  const bundles = findBundleCandidates(edges, nodes, bundlingConfig.lightBundling.distanceBundling.proximityThreshold, 'light');
  
  const lightBundledEdges = [];
  let totalBundles = 0;

  bundles.forEach(bundle => {
    if (bundle.length >= bundlingConfig.lightBundling.minimumEdges) {
      if (bundlingConfig.safety.enableDetailedLogging) {
        console.log(`🎯 Light bundle: ${bundle.length} → 1 line`);
      }
      const bundled = createBundledEdges(bundle, nodes);
      lightBundledEdges.push(...bundled);
      totalBundles++;
    } else {
      // Keep individual edges
      lightBundledEdges.push(...bundle);
    }
  });

  if (bundlingConfig.safety.enableDetailedLogging) {
    console.log(`✅ Light bundling: ${lightBundledEdges.length} edges (was ${edges.length})`);
    console.log(`📦 Created ${totalBundles} light bundles`);
  }
  return lightBundledEdges;
};

/**
 * Main function to apply edge bundling with light mode always enabled
 */
export const applyEdgeBundling = (edges, nodes, enableAggressiveBundling = false, enableBundling = true) => {
  if (bundlingConfig.safety.enableDetailedLogging) {
    console.log('🔗 Starting edge bundling process...');
    console.log(`📊 Input: ${edges.length} edges, ${nodes.length} nodes`);
  }

  // Step 1: ALWAYS apply light bundling to prevent weird loops (regardless of enableBundling toggle)
  const lightBundledEdges = applyLightBundling(edges, nodes);

  // Step 2: Check if aggressive bundling should be applied
  // enableBundling=false means "Bundle Edges" toggle is OFF, so no aggressive bundling
  // enableAggressiveBundling=true means the advanced aggressive mode is requested
  const shouldApplyAggressive = enableBundling && enableAggressiveBundling;

  if (!shouldApplyAggressive) {
    if (bundlingConfig.safety.enableDetailedLogging) {
      console.log('📝 Using light bundling only (aggressive bundling disabled)');
    }
    return lightBundledEdges;
  }

  // Step 3: Apply aggressive bundling on top of light bundling
  if (bundlingConfig.safety.enableDetailedLogging) {
    console.log('🔗 Applying AGGRESSIVE edge bundling on top of light bundling...');
  }

  // Track original connections per table to ensure no table loses ALL connections
  const originalConnections = {};
  lightBundledEdges.forEach(edge => {
    if (!originalConnections[edge.source]) originalConnections[edge.source] = 0;
    if (!originalConnections[edge.target]) originalConnections[edge.target] = 0;
    originalConnections[edge.source]++;
    originalConnections[edge.target]++;
  });

  // Group edges by target
  const edgeGroups = groupEdgesByTarget(lightBundledEdges, nodes);
  const bundledEdges = [];
  let totalBundles = 0;

  Object.entries(edgeGroups).forEach(([targetId, edgeGroup]) => {
    // Use configured distance bundling threshold
    const bundles = findBundleCandidates(edgeGroup, nodes, bundlingConfig.aggressiveBundling.distanceBundling.proximityThreshold, 'aggressive');

    bundles.forEach(bundle => {
      if (bundle.length > 1) {
        if (bundlingConfig.safety.enableDetailedLogging) {
          console.log(`📦 Creating SINGLE LINE bundle for ${targetId}: ${bundle.length} → 1 line`);
        }
        const bundled = createBundledEdges(bundle, nodes);
        bundledEdges.push(...bundled);
        totalBundles++;
      } else {
        // Single edge, keep as is
        bundledEdges.push(...bundle);
      }
    });
  });

  // CRITICAL SAFETY CHECK: Ensure no table loses ALL connections (if enabled)
  if (bundlingConfig.safety.preserveIsolatedTables) {
    const finalConnections = {};
    bundledEdges.forEach(edge => {
      if (!finalConnections[edge.source]) finalConnections[edge.source] = 0;
      if (!finalConnections[edge.target]) finalConnections[edge.target] = 0;
      finalConnections[edge.source]++;
      finalConnections[edge.target]++;
    });

    // Check for tables that lost all connections and add them back
    let fixedTables = 0;
    Object.keys(originalConnections).forEach(tableId => {
      if (originalConnections[tableId] > 0 && (!finalConnections[tableId] || finalConnections[tableId] === 0)) {
        if (bundlingConfig.safety.enableDetailedLogging) {
          console.warn(`⚠️ Table ${tableId} lost all connections! Finding closest edge to preserve.`);
        }

        // Find ALL original edges involving this table
        const candidateEdges = lightBundledEdges.filter(edge => edge.source === tableId || edge.target === tableId);

        if (candidateEdges.length > 0) {
          // Calculate distances and find the shortest one
          let closestEdge = null;
          let shortestDistance = Infinity;

          candidateEdges.forEach(edge => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);

            if (sourceNode && targetNode) {
              // Use simple distance between source and target for edge selection
              const distance = calculateDistance(sourceNode.position, targetNode.position);
              if (distance < shortestDistance) {
                shortestDistance = distance;
                closestEdge = edge;
              }
            }
          });

          if (closestEdge) {
            bundledEdges.push(closestEdge);
            fixedTables++;
            if (bundlingConfig.safety.enableDetailedLogging) {
              console.log(`🔧 Preserved closest edge for ${tableId}: ${closestEdge.source} → ${closestEdge.target} (${Math.round(shortestDistance)}px)`);
            }
          }
        }
      }
    });

    if (fixedTables > 0 && bundlingConfig.safety.enableDetailedLogging) {
      console.log(`🔧 Fixed ${fixedTables} tables that lost all connections`);
    }
  }

  if (bundlingConfig.safety.enableDetailedLogging) {
    console.log(`✅ AGGRESSIVE bundling result: ${bundledEdges.length} edges (was ${lightBundledEdges.length})`);
    console.log(`📦 Created ${totalBundles} bundles, reduced visual lines by ${lightBundledEdges.length - bundledEdges.length} connections`);
    console.log(`🎯 Visual complexity reduced by ${Math.round(((lightBundledEdges.length - bundledEdges.length) / lightBundledEdges.length) * 100)}%`);
  }
  return bundledEdges;
};
