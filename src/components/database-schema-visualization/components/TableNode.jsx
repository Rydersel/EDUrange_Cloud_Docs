"use client";

import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { useRobustTheme, getThemeColors } from '../theme/ThemeSystem';
import { KeyIcon } from './UIComponents';

// Table Node Component with improved styling and shortcut support
export const TableNode = ({ data, selected, id }) => {
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const { isDark } = useRobustTheme();
  const colors = getThemeColors(isDark);

  const isShortcut = data.isShortcut || false;
  const displayName = isShortcut ? `${data.originalTable} (ref${data.shortcutIndex})` : data.name;

  return (
    <div style={{
      backgroundColor: colors.surface,
      boxShadow: isShortcut
        ? isDark
          ? '0 2px 4px -1px rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)'
          : '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.03)'
        : isDark
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      borderRadius: '4px',
      minWidth: '200px',
      border: isShortcut ? `2px dashed ${colors.border}` : `1px solid ${colors.border}`,
      opacity: isShortcut ? 0.85 : 1,
      position: 'relative'
    }}>
      {/* Table-level connection handles - positioned in center of each side */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: colors.reactFlow.handle,
          border: `2px solid ${colors.surface}`,
          top: '-4px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: colors.reactFlow.handle,
          border: `2px solid ${colors.surface}`,
          top: '-4px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: colors.reactFlow.handle,
          border: `2px solid ${colors.surface}`,
          bottom: '-4px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: colors.reactFlow.handle,
          border: `2px solid ${colors.surface}`,
          bottom: '-4px',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: colors.reactFlow.handle,
          border: `2px solid ${colors.surface}`,
          left: '-4px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: colors.reactFlow.handle,
          border: `2px solid ${colors.surface}`,
          left: '-4px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: colors.reactFlow.handle,
          border: `2px solid ${colors.surface}`,
          right: '-4px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={{
          width: '8px',
          height: '8px',
          backgroundColor: colors.reactFlow.handle,
          border: `2px solid ${colors.surface}`,
          right: '-4px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />

      {/* Table Header */}
      <div
        style={{
          backgroundColor: isShortcut
            ? `${data.schemaColor}99` // Add transparency to shortcut headers
            : data.schemaColor || colors.schemas.system,
          color: 'white',
          fontWeight: 'bold',
          textAlign: 'center',
          fontSize: '13px', // Slightly smaller for shortcuts
          padding: '8px',
          borderRadius: '4px 4px 0 0',
          position: 'relative'
        }}
        title={isShortcut ?
          `Alias of ${data.originalTable}. ${data.aliasReason || 'Used to reduce edge overlap and improve diagram readability.'}` :
          `${data.name} table`
        }
      >
        {/* Alias icon indicator */}
        {isShortcut && (
          <div style={{
            position: 'absolute',
            top: '4px',
            left: '6px',
            fontSize: '12px',
            opacity: 0.8
          }}>
            🔗
          </div>
        )}

        {displayName}

        {isShortcut && (
          <div style={{
            position: 'absolute',
            top: '2px',
            right: '4px',
            fontSize: '10px',
            backgroundColor: 'rgba(255, 255, 255, 0.25)',
            padding: '1px 4px',
            borderRadius: '2px',
            fontWeight: 'normal',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}>
            {data.aliasRule && (
              <span style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '0px 3px',
                borderRadius: '2px',
                fontSize: '9px',
                fontWeight: 'bold'
              }}>
                {data.aliasRule}
              </span>
            )}
            <span>ALIAS</span>
          </div>
        )}
      </div>

      {/* Table Columns */}
      <div style={{
        border: isShortcut ? `1px dashed ${colors.borderLight}` : `1px solid ${colors.borderLight}`,
        borderTop: '0',
        borderRadius: '0 0 4px 4px'
      }}>
        {data.columns.map((column, index) => (
          <div
            key={index}
            data-column-name={column.name}
            style={{
              position: 'relative',
              borderBottom: index === data.columns.length - 1 ? '0' : (isShortcut ? `1px dashed ${colors.borderLight}` : `1px solid ${colors.borderLight}`),
              fontSize: '12px',
              lineHeight: '1',
              cursor: 'pointer',
              backgroundColor: colors.surface,
              borderRadius: index === data.columns.length - 1 ? '0 0 4px 4px' : '0'
            }}
            onMouseEnter={(e) => {
              const rowElement = e.currentTarget;

              if (column.isRelated) {
                setHoveredColumn(column.name);
                rowElement.style.backgroundColor = colors.columnHover;

                // Find and highlight connected edges for this table
                const parentDiv = rowElement.closest('.react-flow__node');
                if (parentDiv) {
                  const nodeId = parentDiv.getAttribute('data-id');

                  // Dispatch custom event to trigger edge highlighting
                  window.dispatchEvent(new CustomEvent('tableHover', {
                    detail: { nodeId, columnName: column.name, isHovering: true }
                  }));
                }
              } else {
                rowElement.style.backgroundColor = colors.surfaceHover;
              }
            }}
            onMouseLeave={(e) => {
              const rowElement = e.currentTarget;
              setHoveredColumn(null);
              rowElement.style.removeProperty('background-color');

              if (column.isRelated) {
                // Dispatch custom event to reset edge highlighting
                window.dispatchEvent(new CustomEvent('tableHover', {
                  detail: { nodeId: null, columnName: null, isHovering: false }
                }));
              }
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px',
              position: 'relative',
              opacity: isShortcut ? 0.9 : 1 // Slightly faded content for shortcuts
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginRight: '16px',
                flex: 1
              }}>
                {column.key && <KeyIcon />}

                {/* Field name with mapped name tooltip */}
                <span
                  style={{
                  color: colors.text,
                  fontWeight: column.isRelated ? '600' : '500', // Bold for related fields
                  textDecoration: column.isRelated ? 'underline' : 'none' // Underline for related fields
                  }}
                  title={column.mappedName ? `Database column: ${column.mappedName}` : undefined}
                >
                  {column.name}
                </span>

                {/* Special field indicators */}
                {column.isUpdatedAt && (
                  <span style={{
                    marginLeft: '4px',
                    fontSize: '10px',
                    color: colors.textMuted
                  }}>⏰</span>
                )}

                {column.isCreatedAt && (
                  <span style={{
                    marginLeft: '4px',
                    fontSize: '10px',
                    color: colors.textMuted
                  }}>📅</span>
                )}

                {column.hasDefault && (
                  <span
                    style={{
                      marginLeft: '4px',
                      fontSize: '10px',
                      color: colors.textMuted
                    }}
                    title={column.defaultValue ? `Default: ${column.defaultValue}` : 'Has default value'}
                  >⚙️</span>
                )}

                {/* Relationship type indicator */}
                {column.relationshipType && (
                  <span style={{
                    marginLeft: '6px',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: (() => {
                      switch (column.relationshipType) {
                        case 'primary_key': return isDark ? '#60a5fa' : '#3b82f6';
                        case 'foreign_key': return isDark ? '#34d399' : '#10b981';
                        case 'one_to_many': return isDark ? '#a78bfa' : '#8b5cf6';
                        case 'many_to_many': return isDark ? '#fbbf24' : '#f59e0b';
                        case 'unique_constraint': return isDark ? '#f87171' : '#ef4444';
                        default: return colors.textMuted;
                      }
                    })()
                  }}>
                    {(() => {
                      switch (column.relationshipType) {
                        case 'primary_key': return 'PK';
                        case 'foreign_key': return 'FK';
                        case 'one_to_many': return '1:M';
                        case 'many_to_many': return 'M:M';
                        case 'unique_constraint': return 'UQ';
                        default: return '';
                      }
                    })()}
                  </span>
                )}

                {/* Connection line indicator for hover state */}
                {column.isRelated && (
                  <div style={{
                    position: 'absolute',
                    left: '0',
                    top: '50%',
                    width: '3px',
                    height: '60%',
                    transform: 'translateY(-50%)',
                    backgroundColor: (() => {
                      switch (column.relationshipType) {
                        case 'primary_key': return isDark ? '#60a5fa' : '#3b82f6';
                        case 'foreign_key': return isDark ? '#34d399' : '#10b981';
                        case 'one_to_many': return isDark ? '#a78bfa' : '#8b5cf6';
                        case 'many_to_many': return isDark ? '#fbbf24' : '#f59e0b';
                        case 'unique_constraint': return isDark ? '#f87171' : '#ef4444';
                        default: return colors.textMuted;
                      }
                    })(),
                    borderRadius: '0 2px 2px 0',
                    opacity: 0.6
                  }} />
                )}
              </div>

              {/* Type information with enhanced details */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                fontSize: '11px'
              }}>
              <span style={{
                color: colors.textSecondary,
                  fontWeight: column.isEnum ? '600' : 'normal'
              }}>
                {column.type}
                  {column.isArray && '[]'}
                  {column.optional && '?'}
              </span>

                {/* Additional type info */}
                {column.isEnum && (
                  <span style={{
                    fontSize: '9px',
                    color: colors.textMuted,
                    fontStyle: 'italic'
                  }}>enum</span>
                )}

                {column.isPrimitive === false && !column.isEnum && !column.isRelated && (
                  <span style={{
                    fontSize: '9px',
                    color: colors.textMuted,
                    fontStyle: 'italic'
                  }}>custom</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 