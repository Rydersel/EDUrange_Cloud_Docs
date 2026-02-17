"use client";

import { useState, useMemo } from 'react';
import { Position } from 'reactflow';
import { useRobustTheme, getThemeColors } from '../theme/ThemeSystem';
import BundledEdge from '../BundledEdge';

// Custom Edge Component with enhanced visuals
export const CustomConnectionEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  selected
}) => {
  const { isDark } = useRobustTheme();
  const colors = getThemeColors(isDark);

  const [isHovered, setIsHovered] = useState(false);

  // Calculate edge path using Bezier curves for smooth connections
  const edgePath = useMemo(() => {
    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    // Create smooth curves based on positions
    if (sourcePosition === Position.Right && targetPosition === Position.Left) {
      const offset = Math.abs(sourceX - targetX) * 0.5;
      return `M ${sourceX},${sourceY} C ${sourceX + offset},${sourceY} ${targetX - offset},${targetY} ${targetX},${targetY}`;
    } else if (sourcePosition === Position.Bottom && targetPosition === Position.Top) {
      const offset = Math.abs(sourceY - targetY) * 0.5;
      return `M ${sourceX},${sourceY} C ${sourceX},${sourceY + offset} ${targetX},${targetY - offset} ${targetX},${targetY}`;
    } else {
      // Default curved path
      return `M ${sourceX},${sourceY} Q ${midX},${midY} ${targetX},${targetY}`;
    }
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);

  // Determine relationship type and color
  const getRelationshipColor = () => {
    const relationshipType = data?.relationshipType || 'foreign_key';

    switch (relationshipType) {
      case 'primary_key':
        return isDark ? '#60a5fa' : '#3b82f6'; // Blue
      case 'foreign_key':
        return isDark ? '#34d399' : '#10b981'; // Green
      case 'one_to_many':
        return isDark ? '#a78bfa' : '#8b5cf6'; // Purple
      case 'many_to_many':
        return isDark ? '#fbbf24' : '#f59e0b'; // Orange
      case 'unique_constraint':
        return isDark ? '#f87171' : '#ef4444'; // Red
      default:
        return colors.reactFlow.edge;
    }
  };

  // Get appropriate marker end
  const getMarkerEnd = () => {
    const relationshipType = data?.relationshipType || 'foreign_key';
    return `url(#${relationshipType}-arrow)`;
  };

  const relationshipColor = getRelationshipColor();
  const strokeWidth = isHovered ? 4 : (data?.relationshipType === 'primary_key' ? 3 : 2);
  const markerEnd = getMarkerEnd();

  return (
    <g>
      {/* Invisible thick path for easier hovering */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth="12"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer' }}
      />

      {/* Main edge path */}
      <path
        d={edgePath}
        fill="none"
        stroke={isHovered ? colors.reactFlow.edgeHover : relationshipColor}
        strokeWidth={strokeWidth}
        strokeDasharray={data?.relationshipType === 'weak_relationship' ? '5,5' : 'none'}
        style={{
          ...style,
          transition: 'all 0.2s ease',
          filter: isHovered ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))' : 'none'
        }}
        markerEnd={markerEnd}
      />

      {/* Animated flow indicator for active connections */}
      {isHovered && (
        <circle
          r="3"
          fill={colors.reactFlow.edgeHover}
          style={{
            filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.8))'
          }}
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}

      {/* Connection strength indicator */}
      {data?.isImportantConnection && (
        <circle
          cx={sourceX + (targetX - sourceX) * 0.2}
          cy={sourceY + (targetY - sourceY) * 0.2}
          r="4"
          fill={relationshipColor}
          stroke={colors.surface}
          strokeWidth="2"
        />
      )}
    </g>
  );
};

// Enhanced Edge Label Component
export const CustomEdgeLabel = ({
  label,
  labelX,
  labelY,
  labelBgPadding = [2, 4],
  labelBgBorderRadius = 4,
  data
}) => {
  const { isDark } = useRobustTheme();
  const colors = getThemeColors(isDark);

  const relationshipType = data?.relationshipType || 'foreign_key';

  // Get relationship type icon
  const getRelationshipIcon = () => {
    switch (relationshipType) {
      case 'primary_key': return '🔑';
      case 'foreign_key': return '🔗';
      case 'one_to_many': return '1→∞';
      case 'many_to_many': return '∞→∞';
      case 'unique_constraint': return '🛡️';
      default: return '→';
    }
  };

  return (
    <g>
      <rect
        x={labelX - label.length * 3 - labelBgPadding[1]}
        y={labelY - 8 - labelBgPadding[0]}
        width={label.length * 6 + labelBgPadding[1] * 2 + 20}
        height={16 + labelBgPadding[0] * 2}
        fill={colors.surface}
        stroke={colors.border}
        strokeWidth="1"
        rx={labelBgBorderRadius}
        ry={labelBgBorderRadius}
        style={{
          filter: isDark
            ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
            : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
        }}
      />
      <text
        x={labelX - 8}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: '11px',
          fontWeight: '500',
          fill: colors.text,
          userSelect: 'none'
        }}
      >
        {getRelationshipIcon()} {label}
      </text>
    </g>
  );
};

// Define edge types
export const edgeTypes = {
  // Using built-in step edges for cleaner, non-overlapping connections
  bundledEdge: BundledEdge,
};
