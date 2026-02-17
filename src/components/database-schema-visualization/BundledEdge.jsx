import React from 'react';
import { getStraightPath, getMarkerEnd } from 'reactflow';
import bundlingConfig from '../../components/database-schema-visualization/config/edge-bundling-config.json';
const BundledEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  selected,
  markerEnd,
  label
}) => {
  const { isBundled, bundleSegment, bundlePoint, bundleSize, originalEdge } = data || {};

  if (!isBundled || !bundlePoint) {
    // Fallback to straight line if not bundled
    const [edgePath] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY
    });

    return (
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={style}
        markerEnd={markerEnd}
      />
    );
  }

  // Create optimized path routing for bundled edges
  let pathCommands;

  if (bundleSegment === 'single') {
    // Get the target handle from the original edge data
    const originalEdge = data?.originalEdge || data?.originalEdges?.[0];
    const targetHandle = originalEdge?.targetHandle;

    let actualTargetX = targetX;
    let actualTargetY = targetY;

    // Use the target handle to determine exact connection point
    if (targetHandle) {
      switch (targetHandle) {
        case 'left':
          actualTargetX = targetX - 100; // Connect to left side center
          actualTargetY = targetY;
          break;
        case 'right':
          actualTargetX = targetX + 100; // Connect to right side center
          actualTargetY = targetY;
          break;
        case 'top':
          actualTargetX = targetX;
          actualTargetY = targetY - 75; // Connect to top side center
          break;
        case 'bottom':
          actualTargetX = targetX;
          actualTargetY = targetY + 75; // Connect to bottom side center
          break;
        default:
          // Fallback to calculating based on position
          const deltaX = targetX - bundlePoint.x;
          const deltaY = targetY - bundlePoint.y;

          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal connection
            if (deltaX > 0) {
              actualTargetX = targetX - 100;
              actualTargetY = targetY;
            } else {
              actualTargetX = targetX + 100;
              actualTargetY = targetY;
            }
          } else {
            // Vertical connection
            if (deltaY > 0) {
              actualTargetX = targetX;
              actualTargetY = targetY - 75;
            } else {
              actualTargetX = targetX;
              actualTargetY = targetY + 75;
            }
          }
      }
    }

    // Always use orthogonal routing with right angles - no diagonal lines
    const midX = bundlePoint.x + (actualTargetX - bundlePoint.x) * 0.6; // 60% of the way

    pathCommands = [
      `M ${bundlePoint.x} ${bundlePoint.y}`,    // Start at bundle centroid
      `L ${midX} ${bundlePoint.y}`,             // Horizontal line from centroid
      `L ${midX} ${actualTargetY}`,             // Vertical line to target Y
      `L ${actualTargetX} ${actualTargetY}`     // Horizontal line to target handle center
    ].join(' ');

  } else if (bundleSegment === 'first') {
    // Legacy first segment handling (if still used)
    const midX = sourceX + (bundlePoint.x - sourceX) * 0.7;

    pathCommands = [
      `M ${sourceX} ${sourceY}`,
      `L ${midX} ${sourceY}`,
      `L ${midX} ${bundlePoint.y}`,
      `L ${bundlePoint.x} ${bundlePoint.y}`
    ].join(' ');

  } else if (bundleSegment === 'second') {
    // Legacy second segment handling (if still used)
    const midX = bundlePoint.x + (targetX - bundlePoint.x) * 0.3;

    pathCommands = [
      `M ${bundlePoint.x} ${bundlePoint.y}`,
      `L ${midX} ${bundlePoint.y}`,
      `L ${midX} ${targetY}`,
      `L ${targetX} ${targetY}`
    ].join(' ');
  } else {
    // Fallback for unknown segment
    pathCommands = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }

  // Enhanced styling for bundled lines with visual weight
  const bundledStyle = {
    ...style,
    stroke: data?.color || style.stroke || '#71717a',
    strokeWidth: bundleSegment === 'single' ?
      Math.min(
        bundlingConfig.visual.minBundleStrokeWidth + (bundleSize - 1) * bundlingConfig.visual.bundleStrokeMultiplier,
        bundlingConfig.visual.maxBundleStrokeWidth
      ) : style.strokeWidth || 2,
    strokeOpacity: bundleSize > bundlingConfig.visual.bundleOpacityThreshold ?
      bundlingConfig.visual.bundleOpacity : 1,
    strokeDasharray: undefined // Clean solid lines
  };

  // Calculate label position (midpoint of the path)
  const labelX = bundlePoint.x + (targetX - bundlePoint.x) * 0.5;
  const labelY = bundlePoint.y + (targetY - bundlePoint.y) * 0.5;

  return (
    <g>
      <path
        id={id}
        className="react-flow__edge-path"
        d={pathCommands}
        style={bundledStyle}
        markerEnd={bundleSegment === 'single' ? markerEnd : undefined}
      />

      {/* Enhanced bundle point indicator with scaling */}
      {bundleSegment === 'single' && bundleSize > 1 && (
        <circle
          cx={bundlePoint.x}
          cy={bundlePoint.y}
          r={Math.min(2 + bundleSize * 0.3, 5)} // Scale with bundle size
          fill={data?.color || '#71717a'}
          opacity="0.8"
          stroke="white"
          strokeWidth="1"
        />
      )}

      {/* Bundle count label for large bundles */}
      {bundleSegment === 'single' && bundleSize > bundlingConfig.visual.labelCountThreshold && (
        <text
          x={bundlePoint.x}
          y={bundlePoint.y - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            fill: data?.color || '#71717a',
            pointerEvents: 'none'
          }}
        >
          {bundleSize}
        </text>
      )}

      {/* Bundled edge label showing multiple connections */}
      {bundleSegment === 'single' && bundleSize > 1 && label && (
        <g>
          <rect
            x={labelX - (label.length * 3.5)}
            y={labelY - 10}
            width={label.length * 7}
            height={16}
            fill="rgba(255, 255, 255, 0.9)"
            stroke="#71717a"
            strokeWidth="1"
            rx="3"
            ry="3"
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))'
            }}
          />
          <text
            x={labelX}
            y={labelY - 2}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: '11px',
              fontWeight: '600',
              fill: '#374151',
              pointerEvents: 'none'
            }}
          >
            {label}
          </text>
        </g>
      )}
    </g>
  );
};

export default BundledEdge;
