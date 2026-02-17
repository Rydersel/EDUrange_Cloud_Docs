"use client";

import ELK from 'elkjs/lib/elk.bundled.js';
import { getThemeColors } from '../theme/ThemeSystem';
import { applyStrategicAliasRules } from './alias-table-engine.js';

// Schema color and category mapping functions
export const getSchemaColor = (modelName, colors) => {
  const name = modelName.toLowerCase();
  if (name.includes('user') || name.includes('account') || name.includes('session')) return colors.schemas.user;
  if (name.includes('competition') || name.includes('group') || name.includes('access')) return colors.schemas.competition;
  if (name.includes('challenge') || name.includes('instance') || name.includes('pack')) return colors.schemas.challenge;
  if (name.includes('activity') || name.includes('log')) return colors.schemas.activity;
  if (name.includes('verification') || name.includes('token')) return colors.schemas.auth;
  if (name.includes('question') || name.includes('attempt') || name.includes('completion')) return colors.schemas.question;
  return colors.schemas.system;
};

export const getSchemaCategory = (modelName) => {
  const name = modelName.toLowerCase();
  if (name.includes('user') || name.includes('account') || name.includes('session')) return 'user';
  if (name.includes('competition') || name.includes('group') || name.includes('access')) return 'competition';
  if (name.includes('challenge') || name.includes('instance') || name.includes('pack')) return 'challenge';
  if (name.includes('activity') || name.includes('log')) return 'activity';
  if (name.includes('verification') || name.includes('token')) return 'auth';
  if (name.includes('question') || name.includes('attempt') || name.includes('completion')) return 'question';
  return 'system';
};

// Create automatic layout using elkjs with category grouping
export const createElkLayout = async (models, relationships) => {
  const elk = new ELK();

  // Group models by category
  const modelsByCategory = {};
  models.forEach(model => {
    const category = getSchemaCategory(model.isShortcut ? model.originalTable : model.name);
    if (!modelsByCategory[category]) {
      modelsByCategory[category] = [];
    }
    modelsByCategory[category].push(model);
  });

  // Create category groups for ELK
  const categoryGroups = Object.entries(modelsByCategory).map(([category, categoryModels]) => {
    const categoryNodes = categoryModels.map(model => ({
      id: model.name,
      width: 280,
      height: Math.max(150, 80 + (model.fields.length * 25)),
      layoutOptions: {
        'elk.padding': '[top=20,left=15,bottom=15,right=15]'
      }
    }));
    return {
      id: `category-${category}`,
      children: categoryNodes,
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': '100', // Increased spacing between nodes
        'elk.spacing.edgeNode': '80', // Increased edge-to-node spacing
        'elk.spacing.edgeEdge': '60', // Increased edge-to-edge spacing
        'elk.edgeRouting': 'ORTHOGONAL', // Use orthogonal routing
        'elk.layered.spacing.nodeNodeBetweenLayers': '120', // Increased layer spacing
        'elk.padding': '[top=50,left=30,bottom=30,right=30]', // Increased padding
        'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP'
      }
    };
  });

  // Prepare edges for elkjs
  const elkEdges = relationships
    .filter(rel => {
      // Ensure both nodes exist
      return models.find(m => m.name === rel.from) && models.find(m => m.name === rel.to);
    })
    .map(rel => ({
      id: `${rel.from}-${rel.to}-${rel.fromField}-${rel.toField}`,
      sources: [rel.from],
      targets: [rel.to]
    }));

  // Define the main graph with category grouping
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.spacing.nodeNode': '120', // Increased node spacing
      'elk.layered.spacing.nodeNodeBetweenLayers': '150', // Increased layer spacing
      'elk.spacing.edgeNode': '80', // Increased edge-to-node spacing
      'elk.spacing.edgeEdge': '60', // Increased edge-to-edge spacing
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.edgeRouting': 'ORTHOGONAL', // Use orthogonal routing instead of polyline
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.separateConnectedComponents': 'false',
      // Additional settings for cleaner edge routing
      'elk.layered.wrapping.strategy': 'OFF',
      'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
      'elk.spacing.componentComponent': '100'
    },
    children: categoryGroups,
    edges: elkEdges
  };

  try {
    const layoutedGraph = await elk.layout(graph);

    // Extract positions from the hierarchical layout
    const positions = {};
    const categoryBounds = {};

    layoutedGraph.children?.forEach(categoryGroup => {
      const categoryId = categoryGroup.id.replace('category-', '');

      // Track category bounds for background positioning
      categoryBounds[categoryId] = {
        x: categoryGroup.x || 0,
        y: categoryGroup.y || 0,
        width: categoryGroup.width || 400,
        height: categoryGroup.height || 300
      };

      // Extract individual node positions within the category
      categoryGroup.children?.forEach(node => {
        positions[node.id] = {
          x: (categoryGroup.x || 0) + (node.x || 0),
          y: (categoryGroup.y || 0) + (node.y || 0)
        };
      });
    });

    return { positions, categoryBounds };
  } catch (error) {
    console.error('ELK layout failed:', error);
    // Fallback to simple grid layout with manual category grouping
    const positions = {};
    const categoryBounds = {};
    let categoryOffsetX = 0;

    Object.entries(modelsByCategory).forEach(([category, categoryModels]) => {
      const categoryWidth = Math.max(400, Math.ceil(Math.sqrt(categoryModels.length)) * 320);
      const categoryHeight = Math.max(300, Math.ceil(categoryModels.length / Math.ceil(Math.sqrt(categoryModels.length))) * 450);

      categoryBounds[category] = {
        x: categoryOffsetX,
        y: 50,
        width: categoryWidth,
        height: categoryHeight
      };

      categoryModels.forEach((model, index) => {
        const cols = Math.ceil(Math.sqrt(categoryModels.length));
        positions[model.name] = {
          x: categoryOffsetX + 50 + (index % cols) * 320,
          y: 100 + Math.floor(index / cols) * 450
        };
      });

      categoryOffsetX += categoryWidth + 100;
    });

    return { positions, categoryBounds };
  }
};

// Determine flow group based on table names and relationships
export const getFlowGroup = (from, to) => {
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  // Auth flow: User → Session → Account → VerificationToken
  if ((fromLower.includes('user') || fromLower.includes('session') ||
       fromLower.includes('account') || fromLower.includes('verification')) &&
      (toLower.includes('user') || toLower.includes('session') ||
       toLower.includes('account') || toLower.includes('verification'))) {
    return 'auth';
  }

  // Challenge flow: Challenge → ChallengeInstance → GroupChallenge → ChallengePack
  if ((fromLower.includes('challenge') || fromLower.includes('instance') ||
       fromLower.includes('pack')) &&
      (toLower.includes('challenge') || toLower.includes('instance') ||
       toLower.includes('pack'))) {
    return 'challenge';
  }

  // Competition flow: Competition → CompetitionGroup → UserCompetitionGroup
  if ((fromLower.includes('competition') || fromLower.includes('group')) &&
      (toLower.includes('competition') || toLower.includes('group'))) {
    return 'competition';
  }

  // Scoring flow: GroupPoints → CompletedChallenge → CompletedGroup → QuestionsAttempted
  if ((fromLower.includes('point') || fromLower.includes('completed') ||
       fromLower.includes('attempt') || fromLower.includes('question')) &&
      (toLower.includes('point') || toLower.includes('completed') ||
       toLower.includes('attempt') || toLower.includes('question'))) {
    return 'scoring';
  }

  // Activity flow: ActivityLog connections and tracking-related relationships
  if ((fromLower.includes('activity') || fromLower.includes('log') ||
       fromLower.includes('tracking')) ||
      (toLower.includes('activity') || toLower.includes('log') ||
       toLower.includes('tracking'))) {
    return 'activity';
  }

  // Default to general flow
  return 'general';
};

// Main function to convert parsed models to ReactFlow format
export const convertToReactFlowFormat = async (models, relationships, enableShortcuts = true, colors = null, enums = []) => {
  // If no colors provided, use light mode defaults
  if (!colors) {
    colors = getThemeColors(false);
  }

  let shortcuts = [];
  let modifiedRelationships = relationships;
  let allModels = models;

  // Get layout first to have positions for alias analysis
  const { positions, categoryBounds } = await createElkLayout(models, relationships);

  // Apply comprehensive strategic alias rules
  const aliasResult = applyStrategicAliasRules(models, relationships, positions, categoryBounds, enableShortcuts);

  allModels = aliasResult.allModels;
  modifiedRelationships = aliasResult.modifiedRelationships;
  shortcuts = aliasResult.shortcuts;

  // Update positions with alias positions
  const finalPositions = { ...positions, ...aliasResult.aliasPositions };

  // Re-run layout with all models (including aliases) for final positioning
  const { positions: layoutPositions, categoryBounds: finalCategoryBounds } = await createElkLayout(allModels, modifiedRelationships);

  // Create category background nodes
  const categoryBackgroundNodes = Object.entries(finalCategoryBounds).map(([category, bounds]) => {
    const categoryInfo = {
      user: { label: 'User Management', color: '#3B82F6' },
      competition: { label: 'Competition & Groups', color: '#10B981' },
      challenge: { label: 'Challenges', color: '#8B5CF6' },
      activity: { label: 'Activity & Logging', color: '#F59E0B' },
      auth: { label: 'Authentication', color: '#EF4444' },
      question: { label: 'Questions & Quizzes', color: '#06B6D4' },
      system: { label: 'System & Config', color: '#6B7280' }
    };

    return {
      id: `bg-${category}`,
      type: 'categoryBackground',
      position: { x: bounds.x - 10, y: bounds.y - 10 },
      style: {
        width: bounds.width + 20,
        height: bounds.height + 20,
        zIndex: -1
      },
      data: {
        label: categoryInfo[category]?.label || category,
        color: categoryInfo[category]?.color || '#6B7280'
      },
      selectable: false,
      draggable: false
    };
  });

  // Convert models to nodes with smart positioning (including shortcuts)
  const tableNodes = allModels.map((model) => {
    const columns = model.fields.map(field => {
      return {
        name: field.name,
        type: field.type,
        mappedName: field.mappedName,
        defaultValue: field.defaultValue,
        key: field.key,
        optional: field.optional,
        isArray: field.isArray,
        unique: field.unique,
        hasDefault: field.hasDefault,
        isUpdatedAt: field.isUpdatedAt,
        isCreatedAt: field.isCreatedAt,
        isIgnored: field.isIgnored,
        isPrimitive: field.isPrimitive,
        isEnum: field.isEnum,
        isRelated: field.isRelated, // Mark related fields for visual styling
        relationshipType: field.relationshipType,
        relationName: field.relationName,
        onDelete: field.onDelete,
        onUpdate: field.onUpdate
      };
    });

    return {
      id: model.name,
      type: 'table',
      position: layoutPositions[model.name] || finalPositions[model.name] || { x: 100, y: 100 },
      data: {
        name: model.name,
        mappedName: model.mappedName,
        schemaColor: getSchemaColor(model.isShortcut ? model.originalTable : model.name, colors),
        columns,
        indexes: model.indexes || [],
        uniqueConstraints: model.uniqueConstraints || [],
        compositeId: model.compositeId,
        isShortcut: model.isShortcut || false,
        originalTable: model.originalTable,
        shortcutIndex: model.shortcutIndex,
        aliasRule: model.aliasRule,
        aliasReason: model.aliasReason
      }
    };
  });

  // Convert relationships to edges using table-level connections
  const edges = modifiedRelationships
    .filter(rel => {
      // Ensure both source and target nodes exist
      const sourceNode = tableNodes.find(n => n.id === rel.from);
      const targetNode = tableNodes.find(n => n.id === rel.to);
      if (!sourceNode || !targetNode) {
        console.log(`Skipping edge: missing node for ${rel.from} -> ${rel.to}`);
        return false;
      }
      return true;
    })
    .map((rel, index) => {
      // Determine optimal connection points based on table positions
      const sourceNode = tableNodes.find(n => n.id === rel.from);
      const targetNode = tableNodes.find(n => n.id === rel.to);

      // Calculate relative positions to determine best connection handles
      const deltaX = targetNode.position.x - sourceNode.position.x;
      const deltaY = targetNode.position.y - sourceNode.position.y;

      let sourceHandle, targetHandle;

      // Choose connection points based on relative positions
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal connection
        if (deltaX > 0) {
          sourceHandle = 'right-source';
          targetHandle = 'left';
        } else {
          sourceHandle = 'left-source';
          targetHandle = 'right';
        }
      } else {
        // Vertical connection
        if (deltaY > 0) {
          sourceHandle = 'bottom-source';
          targetHandle = 'top';
        } else {
          sourceHandle = 'top-source';
          targetHandle = 'bottom';
        }
      }

      const flowGroup = getFlowGroup(rel.from, rel.to);
      const relationshipType = rel.relationshipType || 'foreign_key';

      return {
        id: `${rel.from}-${rel.to}-${index}`,
        source: rel.from,
        target: rel.to,
        sourceHandle,
        targetHandle,
        type: 'step', // Use step edges instead of custom curved edges
        animated: false,
        data: {
          relationshipType,
          fromField: rel.fromField,
          toField: rel.toField,
          isAliasEdge: rel.isAliasEdge
        },
        metadata: {
          group: flowGroup,
          fromField: rel.fromField,
          toField: rel.toField,
          relationshipType
        },
        style: {
          strokeWidth: 2,
          strokeDasharray: rel.isAliasEdge ? '5,5' : '0', // R10: Dashed lines for alias edges
          opacity: rel.isAliasEdge ? 0.8 : 1, // Slightly transparent alias edges
          // Simplified uniform color scheme - reverted from colorful relationship types
          stroke: colors.isDark ? '#71717a' : '#6b7280' // Simple gray for all connections
        },
        label: rel.isAliasEdge ?
          `${rel.fromField} → ${rel.toField} (via ${rel.originalFrom || rel.originalTo})` : // R10: Enhanced alias edge labels
          `${rel.fromField} → ${rel.toField}`,
        labelStyle: {
          fontSize: '10px',
          fontWeight: '500',
          fill: colors.isDark ? '#fafafa' : '#1f2933'
        },
        labelShowBg: true,
        labelBgStyle: {
          fill: colors.isDark ? '#1a1a1a' : '#ffffff',
          stroke: colors.isDark ? '#404040' : '#e5e7eb',
          strokeWidth: 1,
          rx: 3,
          ry: 3
        }
      };
    });

  console.log('Generated edges:', edges);
  console.log('Generated relationships:', modifiedRelationships);
  console.log('Enhanced field information available:', tableNodes[0]?.data?.columns[0]);

  return { nodes: [...tableNodes, ...categoryBackgroundNodes], edges, enums };
};
