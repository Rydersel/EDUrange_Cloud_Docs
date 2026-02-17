import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { flowGroupColors } from './utils/erd-flow-helpers';

// Theme-aware color system matching Nextra's design (shared with DatabaseSchemaVisualization)
const getThemeColors = (isDark) => ({
  // Background colors
  background: isDark ? '#0f0f0f' : '#f9fafb',
  surface: isDark ? '#1a1a1a' : '#ffffff',
  surfaceHover: isDark ? '#262626' : '#f3f4f6',
  border: isDark ? '#404040' : '#e5e7eb',
  borderLight: isDark ? '#262626' : '#f3f4f6',

  // Text colors
  text: isDark ? '#fafafa' : '#111827',
  textSecondary: isDark ? '#a1a1aa' : '#6b7280',
  textMuted: isDark ? '#71717a' : '#6b7280',

  // Interactive elements
  primary: isDark ? '#3b82f6' : '#2563eb',
  primaryHover: isDark ? '#60a5fa' : '#1d4ed8'
});

// Robust theme detection that works without next-themes resolvedTheme
const useRobustTheme = () => {
  const [mounted, setMounted] = useState(false);
  const [detectedTheme, setDetectedTheme] = useState('light');

  // Always call useTheme (required by React Hooks rules)
  const themeHook = useTheme();

  useEffect(() => {
    setMounted(true);

    // Multiple fallback mechanisms for theme detection
    const detectTheme = () => {
      // Method 1: Try next-themes resolvedTheme
      if (themeHook?.resolvedTheme) {
        return themeHook.resolvedTheme;
      }

      // Method 2: Check Nextra's theme via data-theme attribute
      const htmlElement = document.documentElement;
      const nextraTheme = htmlElement.getAttribute('data-theme');
      if (nextraTheme && ['dark', 'light'].includes(nextraTheme)) {
        return nextraTheme;
      }

      // Method 3: Check class-based theme detection (Nextra style)
      if (htmlElement.classList.contains('dark')) {
        return 'dark';
      }
      if (htmlElement.classList.contains('light')) {
        return 'light';
      }

      // Method 4: Check localStorage for next-themes
      try {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme && ['dark', 'light'].includes(storedTheme)) {
          return storedTheme;
        }
      } catch (e) {
        // localStorage not available
      }

      // Method 5: Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }

      // Default fallback
      return 'light';
    };

    const updateTheme = () => {
      const newTheme = detectTheme();
      setDetectedTheme(newTheme);
    };

    // Initial detection
    updateTheme();

    // Set up listeners for theme changes
    const observers = [];

    // Watch for attribute changes (Nextra)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' &&
            (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme')) {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });
    observers.push(observer);

    // Listen for storage changes (next-themes)
    const handleStorage = (e) => {
      if (e.key === 'theme') {
        updateTheme();
      }
    };
    window.addEventListener('storage', handleStorage);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => updateTheme();
    mediaQuery.addEventListener('change', handleMediaChange);

    // Cleanup
    return () => {
      observers.forEach(obs => obs.disconnect());
      window.removeEventListener('storage', handleStorage);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [themeHook?.resolvedTheme, themeHook?.theme]);

  const isDark = mounted ? detectedTheme === 'dark' : false;

  return {
    isDark,
    theme: detectedTheme,
    mounted
  };
};

const FlowSidebar = ({
  visibleFlow,
  onFlowChange,
  flowStats,
  isOpen = true,
  onToggle,
  onFocusView,
  edgeBundling = false,
  onEdgeBundlingChange
}) => {
  const { mounted, isDark } = useRobustTheme();
  const colors = getThemeColors(isDark);

  // Don't render until theme is mounted to avoid flash
  if (!mounted) {
    return null;
  }

  const flows = Object.entries(flowStats);

  return (
    <>
      {/* Sidebar */}
      <aside
        style={{
          position: 'absolute',
          left: isOpen ? 0 : '-220px',
          top: 0,
          width: '220px',
          height: '100%',
          backgroundColor: colors.surface,
          borderRight: `1px solid ${colors.border}`,
          boxShadow: isDark
            ? '2px 0 8px rgba(0, 0, 0, 0.3)'
            : '2px 0 8px rgba(0, 0, 0, 0.05)',
          transition: 'left 0.3s ease',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px',
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.background
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: colors.text,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
            </svg>
            Flows
          </h3>
          <p style={{
            margin: '2px 0 0 0',
            fontSize: '11px',
            color: colors.textSecondary
          }}>
            Filter by relationship type
          </p>

          {/* Focus View Button */}
          {onFocusView && visibleFlow !== 'all' && (
            <button
              onClick={onFocusView}
              style={{
                marginTop: '6px',
                width: '100%',
                padding: '4px 6px',
                backgroundColor: colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = colors.primaryHover;
                e.target.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = colors.primary;
                e.target.style.transform = 'scale(1)';
              }}
              title="Center view on filtered tables"
            >
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Focus
            </button>
          )}
        </div>

        {/* Flow Options */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px'
        }}>
          {flows.map(([flowKey, flowInfo]) => {
            const isActive = visibleFlow === flowKey;
            const color = flowGroupColors[flowKey] || '#6B7280';

            return (
              <label
                key={flowKey}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  marginBottom: '6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: isActive ? `${color}15` : 'transparent',
                  border: `1px solid ${isActive ? color : 'transparent'}`,
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = colors.surfaceHover;
                    e.currentTarget.style.borderColor = colors.border;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }
                }}
              >
                <input
                  type="radio"
                  name="flow"
                  value={flowKey}
                  checked={isActive}
                  onChange={() => onFlowChange(flowKey)}
                  style={{
                    marginRight: '8px',
                    width: '14px',
                    height: '14px',
                    accentColor: color
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? color : colors.text,
                    fontSize: '12px'
                  }}>
                    {flowInfo.label}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: colors.textSecondary,
                    marginTop: '1px'
                  }}>
                    {flowInfo.count} connection{flowInfo.count !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Flow indicator dot */}
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  opacity: isActive ? 1 : 0.5
                }} />
              </label>
            );
          })}
        </div>

        {/* Settings Section */}
        <div style={{
          padding: '12px',
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.background
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '10px',
            fontWeight: '600',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Settings
          </h4>

          {/* Edge Bundling Toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 0',
            cursor: 'pointer',
            fontSize: '11px',
            color: colors.text
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M7.21 5.23a.75.75 0 01.02 1.06L3.292 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
              Bundle Edges
            </span>
            <input
              type="checkbox"
              checked={edgeBundling}
              onChange={(e) => onEdgeBundlingChange?.(e.target.checked)}
              style={{
                width: '14px',
                height: '14px',
                accentColor: colors.primary
              }}
            />
          </label>
          <div style={{
            fontSize: '9px',
            color: colors.textMuted,
            marginTop: '2px',
            lineHeight: '1.3'
          }}>
            Light bundling always on • Toggle for aggressive mode
          </div>
        </div>
      </aside>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          left: isOpen ? '220px' : '0',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '20px',
          height: '40px',
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderLeft: 'none',
          borderRadius: '0 3px 3px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'left 0.3s ease',
          zIndex: 21,
          boxShadow: isDark
            ? '2px 0 4px rgba(0, 0, 0, 0.3)'
            : '2px 0 4px rgba(0, 0, 0, 0.05)'
        }}
        title={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill={colors.text}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}
        >
          <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" clipRule="evenodd" />
        </svg>
      </button>
    </>
  );
};

export default FlowSidebar;
