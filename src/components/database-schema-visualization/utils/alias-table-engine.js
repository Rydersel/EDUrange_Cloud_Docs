/**
 * Alias Table Engine for Clean and Readable ER Diagrams
 * Implements 10 strategic rules for optimal alias table placement and management
 */

/**
 * Calculate distance between two points
 */
const calculateDistance = (pos1, pos2) => {
  // Add null/undefined checks
  if (!pos1 || !pos2 || typeof pos1.x !== 'number' || typeof pos1.y !== 'number' || 
      typeof pos2.x !== 'number' || typeof pos2.y !== 'number') {
    return Infinity; // Return infinity for invalid positions to avoid using them
  }
  
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate centroid (center point) of a group of positions
 */
const calculateCentroid = (positions) => {
  if (!positions || positions.length === 0) return { x: 0, y: 0 };
  
  // Filter out invalid positions
  const validPositions = positions.filter(pos => 
    pos && typeof pos.x === 'number' && typeof pos.y === 'number'
  );
  
  if (validPositions.length === 0) return { x: 0, y: 0 };
  
  const sum = validPositions.reduce((acc, pos) => ({
    x: acc.x + pos.x,
    y: acc.y + pos.y
  }), { x: 0, y: 0 });
  
  return {
    x: sum.x / validPositions.length,
    y: sum.y / validPositions.length
  };
};

/**
 * Get schema category for a model
 */
const getSchemaCategory = (modelName) => {
  const name = modelName.toLowerCase();
  if (name.includes('user') || name.includes('account') || name.includes('session')) return 'user';
  if (name.includes('competition') || name.includes('group') || name.includes('access')) return 'competition';
  if (name.includes('challenge') || name.includes('instance') || name.includes('pack')) return 'challenge';
  if (name.includes('activity') || name.includes('log')) return 'activity';
  if (name.includes('verification') || name.includes('token')) return 'auth';
  if (name.includes('question') || name.includes('attempt') || name.includes('completion')) return 'question';
  return 'system';
};

/**
 * Analyze relationships to identify alias candidates
 */
const analyzeAliasRequirements = (models, relationships, positions, categoryBounds) => {
  // Count connections per table
  const connectionCounts = {};
  const connectionsByTable = {};
  
  relationships.forEach(rel => {
    // Count total connections
    connectionCounts[rel.from] = (connectionCounts[rel.from] || 0) + 1;
    connectionCounts[rel.to] = (connectionCounts[rel.to] || 0) + 1;
    
    // Track specific connections
    if (!connectionsByTable[rel.from]) connectionsByTable[rel.from] = [];
    if (!connectionsByTable[rel.to]) connectionsByTable[rel.to] = [];
    
    connectionsByTable[rel.from].push({ target: rel.to, type: 'outgoing', field: rel.fromField });
    connectionsByTable[rel.to].push({ target: rel.from, type: 'incoming', field: rel.toField });
  });

  // Identify high-connectivity tables (3+ connections)
  const aliasRequirements = {};
  
  Object.entries(connectionCounts).forEach(([tableName, count]) => {
    if (count >= 3) {
      const connections = connectionsByTable[tableName] || [];
      
      // Group connections by target category
      const connectionsByCategory = {};
      connections.forEach(conn => {
        const targetCategory = getSchemaCategory(conn.target);
        if (!connectionsByCategory[targetCategory]) {
          connectionsByCategory[targetCategory] = [];
        }
        connectionsByCategory[targetCategory].push(conn);
      });

      // Analyze each category for alias requirements
      Object.entries(connectionsByCategory).forEach(([category, categoryConnections]) => {
        if (categoryConnections.length >= 2) { // R2: Only create alias for categories with 2+ connections
          
          // Calculate distances and domain boundaries
          const sourcePosition = positions[tableName];
          const targetPositions = categoryConnections
            .map(conn => positions[conn.target])
            .filter(pos => pos && typeof pos.x === 'number' && typeof pos.y === 'number'); // Filter valid positions

          if (targetPositions.length >= 2 && sourcePosition && 
              typeof sourcePosition.x === 'number' && typeof sourcePosition.y === 'number') {
            const centroid = calculateCentroid(targetPositions);
            const avgDistance = targetPositions.reduce((sum, pos) => 
              sum + calculateDistance(sourcePosition, pos), 0) / targetPositions.length;

            // R1: Check if alias is needed (distance > 300px or cross-domain)
            const sourceCategory = getSchemaCategory(tableName);
            const needsAlias = avgDistance > 300 || sourceCategory !== category;

            if (needsAlias) {
              if (!aliasRequirements[tableName]) {
                aliasRequirements[tableName] = [];
              }

              aliasRequirements[tableName].push({
                category,
                connections: categoryConnections,
                centroid,
                avgDistance,
                priority: categoryConnections.length > 3 ? 'high' : 'medium',
                reason: avgDistance > 300 ? 'distance' : 'cross-domain'
              });
            }
          }
        }
      });
    }
  });

  return aliasRequirements;
};

/**
 * R1: Check if alias is too close to existing instances
 */
const checkNearbyDuplicates = (proposedPosition, existingPositions, minDistance = 300) => {
  if (!proposedPosition || typeof proposedPosition.x !== 'number' || typeof proposedPosition.y !== 'number') {
    return false; // Invalid proposed position
  }
  
  if (!existingPositions || existingPositions.length === 0) {
    return true; // No existing positions to check against
  }
  
  return existingPositions
    .filter(pos => pos && typeof pos.x === 'number' && typeof pos.y === 'number') // Filter valid positions
    .every(pos => calculateDistance(proposedPosition, pos) >= minDistance);
};

/**
 * R7: Calculate optimal alias position based on referencing group centroid
 */
const calculateAliasPosition = (referencingPositions, categoryBounds, category) => {
  const centroid = calculateCentroid(referencingPositions);
  const bounds = categoryBounds[category];
  
  if (!bounds) return centroid;

  // R8: Keep aliases inside domain borders with padding
  const padding = 30;
  const constrainedPosition = {
    x: Math.max(bounds.x + padding, Math.min(bounds.x + bounds.width - padding, centroid.x)),
    y: Math.max(bounds.y + padding, Math.min(bounds.y + bounds.height - padding, centroid.y))
  };

  return constrainedPosition;
};

/**
 * R6: Filter out low-value aliases
 */
const filterLowValueAliases = (aliasRequirements, positions) => {
  const filteredRequirements = {};

  Object.entries(aliasRequirements).forEach(([tableName, requirements]) => {
    const highValueRequirements = requirements.filter(req => {
      // Skip if only serves one nearby reference
      if (req.connections.length === 1) {
        const targetPos = positions[req.connections[0].target];
        const sourcePos = positions[tableName];
        if (targetPos && sourcePos && calculateDistance(sourcePos, targetPos) < 250) {
          return false; // R6: Remove low-value alias
        }
      }
      return true;
    });

    if (highValueRequirements.length > 0) {
      filteredRequirements[tableName] = highValueRequirements;
    }
  });

  return filteredRequirements;
};

/**
 * Create alias tables based on strategic rules
 */
const createStrategicAliases = (models, relationships, positions, categoryBounds) => {
  console.log('🔄 Starting strategic alias analysis...');
  
  // Step 1: Analyze requirements
  let aliasRequirements = analyzeAliasRequirements(models, relationships, positions, categoryBounds);
  console.log('📊 Initial alias requirements:', Object.keys(aliasRequirements).length);

  // Step 2: R6 - Filter low-value aliases
  aliasRequirements = filterLowValueAliases(aliasRequirements, positions);
  console.log('✂️  After filtering low-value aliases:', Object.keys(aliasRequirements).length);

  const aliases = [];
  const aliasPositions = {};
  const globalAliasesByDomain = {}; // R2: Track one alias per domain

  // Step 3: Create aliases following all rules
  Object.entries(aliasRequirements).forEach(([tableName, requirements]) => {
    const originalModel = models.find(m => m.name === tableName);
    if (!originalModel) return;

    // Sort by priority (high first)
    requirements.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    requirements.forEach((req, index) => {
      // R2: Check if domain already has alias for this table
      const domainKey = `${tableName}-${req.category}`;
      if (globalAliasesByDomain[domainKey]) {
        console.log(`🚫 R2: Skipping duplicate alias for ${tableName} in ${req.category}`);
        return;
      }

      // R7: Calculate optimal position
      const referencingPositions = req.connections
        .map(conn => positions[conn.target])
        .filter(pos => pos && typeof pos.x === 'number' && typeof pos.y === 'number'); // Filter valid positions
      
      if (referencingPositions.length === 0) {
        console.log(`🚫 No valid positions found for ${tableName} alias in ${req.category}`);
        return;
      }
      
      const proposedPosition = calculateAliasPosition(referencingPositions, categoryBounds, req.category);

      // R1: Check for nearby duplicates
      const existingPositions = [
        positions[tableName], // Original table
        ...Object.values(aliasPositions) // Existing aliases
      ].filter(pos => pos);

      if (!checkNearbyDuplicates(proposedPosition, existingPositions, 300)) {
        console.log(`🚫 R1: Skipping alias for ${tableName} - too close to existing`);
        return;
      }

      // R5: Ensure top-down flow (alias below referencing nodes)
      const avgReferencingY = referencingPositions.reduce((sum, pos) => sum + pos.y, 0) / referencingPositions.length;
      const adjustedPosition = {
        ...proposedPosition,
        y: Math.max(proposedPosition.y, avgReferencingY + 100) // R5: Place below
      };

      // Create alias
      const aliasName = `${tableName}_${req.category}_alias`;
      const aliasModel = {
        ...originalModel,
        name: aliasName,
        isShortcut: true,
        originalTable: tableName,
        shortcutIndex: aliases.length + 1,
        aliasRule: req.reason === 'distance' ? 'R1' : 'R2',
        aliasReason: `${req.reason === 'distance' ? 'Long distance' : 'Cross-domain'} alias for ${req.category} (${req.connections.length} connections)`,
        targetCategory: req.category,
        priority: req.priority
      };

      aliases.push(aliasModel);
      aliasPositions[aliasName] = adjustedPosition;
      globalAliasesByDomain[domainKey] = aliasName;

      console.log(`✅ Created alias: ${aliasName} (${req.priority} priority, rule ${aliasModel.aliasRule})`);
    });
  });

  console.log(`🎯 Strategic alias creation complete: ${aliases.length} aliases created`);
  return { aliases, aliasPositions };
};

/**
 * R4 & R9: Redirect edges to optimal aliases while preserving original connections
 */
const optimizeEdgeRouting = (relationships, aliases, positions, aliasPositions) => {
  console.log('🔄 Optimizing edge routing...');
  
  const modifiedRelationships = [...relationships];
  const originalConnections = new Set(); // R9: Track original connections to preserve

  // First pass: Identify which relationships to preserve as original connections
  const connectionsByOriginal = {};
  relationships.forEach(rel => {
    if (!connectionsByOriginal[rel.from]) connectionsByOriginal[rel.from] = [];
    if (!connectionsByOriginal[rel.to]) connectionsByOriginal[rel.to] = [];
    
    connectionsByOriginal[rel.from].push(rel);
    connectionsByOriginal[rel.to].push(rel);
  });

  // R9: Ensure each original table keeps at least one direct connection
  Object.keys(connectionsByOriginal).forEach(tableName => {
    const tableAliases = aliases.filter(alias => alias.originalTable === tableName);
    if (tableAliases.length > 0) {
      // Keep the shortest connection as original
      const connections = connectionsByOriginal[tableName];
      if (connections.length > 0) {
        const sourcePos = positions[tableName];
        let shortestConnection = connections[0];
        let shortestDistance = Infinity;

        connections.forEach(conn => {
          const targetPos = positions[conn.from === tableName ? conn.to : conn.from];
          if (targetPos && sourcePos && 
              typeof targetPos.x === 'number' && typeof targetPos.y === 'number' &&
              typeof sourcePos.x === 'number' && typeof sourcePos.y === 'number') {
            const distance = calculateDistance(sourcePos, targetPos);
            if (distance < shortestDistance) {
              shortestDistance = distance;
              shortestConnection = conn;
            }
          }
        });

        originalConnections.add(`${shortestConnection.from}-${shortestConnection.to}-${shortestConnection.fromField}-${shortestConnection.toField}`);
      }
    }
  });

  // Second pass: R4 - Redirect other edges to nearest aliases
  const edgesToAdd = [];
  const edgesToRemove = [];

  relationships.forEach(rel => {
    const relKey = `${rel.from}-${rel.to}-${rel.fromField}-${rel.toField}`;
    
    // R9: Skip if this is a preserved original connection
    if (originalConnections.has(relKey)) {
      console.log(`🔒 R9: Preserving original connection: ${rel.from} -> ${rel.to}`);
      return;
    }

    // R4: Check if we can redirect to a closer alias
    const sourcePos = positions[rel.from];
    const targetPos = positions[rel.to];
    
    if (!sourcePos || !targetPos) return;

    // Find potential alias redirections
    const sourceAliases = aliases.filter(alias => alias.originalTable === rel.from);
    const targetAliases = aliases.filter(alias => alias.originalTable === rel.to);

    let bestSourceAlias = null;
    let bestTargetAlias = null;
    let bestImprovement = 0;

    // Check source aliases
    sourceAliases.forEach(alias => {
      const aliasPos = aliasPositions[alias.name];
      if (aliasPos) {
        const originalDistance = calculateDistance(sourcePos, targetPos);
        const aliasDistance = calculateDistance(aliasPos, targetPos);
        const improvement = (originalDistance - aliasDistance) / originalDistance;
        
        if (improvement > 0.2 && improvement > bestImprovement) { // 20% improvement threshold
          bestSourceAlias = alias;
          bestImprovement = improvement;
        }
      }
    });

    // Check target aliases
    targetAliases.forEach(alias => {
      const aliasPos = aliasPositions[alias.name];
      if (aliasPos) {
        const originalDistance = calculateDistance(sourcePos, targetPos);
        const aliasDistance = calculateDistance(sourcePos, aliasPos);
        const improvement = (originalDistance - aliasDistance) / originalDistance;
        
        if (improvement > 0.2 && improvement > bestImprovement) { // 20% improvement threshold
          bestTargetAlias = alias;
          bestImprovement = improvement;
        }
      }
    });

    // Apply best redirection
    if (bestSourceAlias && bestImprovement > 0.25) {
      edgesToRemove.push(rel);
      edgesToAdd.push({
        ...rel,
        from: bestSourceAlias.name,
        isAliasEdge: true,
        originalFrom: rel.from
      });
      console.log(`🔀 R4: Redirecting edge from ${bestSourceAlias.name} instead of ${rel.from}`);
    } else if (bestTargetAlias && bestImprovement > 0.25) {
      edgesToRemove.push(rel);
      edgesToAdd.push({
        ...rel,
        to: bestTargetAlias.name,
        isAliasEdge: true,
        originalTo: rel.to
      });
      console.log(`🔀 R4: Redirecting edge to ${bestTargetAlias.name} instead of ${rel.to}`);
    }
  });

  // Apply edge modifications
  edgesToRemove.forEach(edge => {
    const index = modifiedRelationships.findIndex(rel => 
      rel.from === edge.from && rel.to === edge.to && 
      rel.fromField === edge.fromField && rel.toField === edge.toField
    );
    if (index > -1) {
      modifiedRelationships.splice(index, 1);
    }
  });

  modifiedRelationships.push(...edgesToAdd);

  console.log(`🎯 Edge routing optimization complete: ${edgesToRemove.length} redirected, ${originalConnections.size} preserved`);
  return modifiedRelationships;
};

/**
 * Main function to apply all strategic alias rules
 */
export const applyStrategicAliasRules = (models, relationships, positions, categoryBounds, enableShortcuts = true) => {
  if (!enableShortcuts) {
    console.log('📴 Shortcuts disabled - returning original data');
    return {
      allModels: models,
      modifiedRelationships: relationships,
      shortcuts: [],
      aliasPositions: {}
    };
  }

  // Safety check for positions
  if (!positions || Object.keys(positions).length === 0) {
    console.log('⚠️  No positions available - returning original data');
    return {
      allModels: models,
      modifiedRelationships: relationships,
      shortcuts: [],
      aliasPositions: {}
    };
  }

  console.log('🚀 Applying strategic alias rules...');
  console.log(`📈 Input: ${models.length} models, ${relationships.length} relationships`);

  // Apply all strategic rules
  const { aliases, aliasPositions } = createStrategicAliases(models, relationships, positions, categoryBounds);
  const modifiedRelationships = optimizeEdgeRouting(relationships, aliases, positions, aliasPositions);
  const allModels = [...models, ...aliases];

  console.log('📊 Results:');
  console.log(`  • ${aliases.length} strategic aliases created`);
  console.log(`  • ${modifiedRelationships.length} optimized relationships`);
  console.log(`  • ${allModels.length} total models`);

  return {
    allModels,
    modifiedRelationships,
    shortcuts: aliases,
    aliasPositions
  };
};

export default applyStrategicAliasRules; 