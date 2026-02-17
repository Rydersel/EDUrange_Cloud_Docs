"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

// Add dark mode styles for ReactFlow controls
export const addDarkModeStyles = () => {
  if (typeof document === 'undefined') return;

  const existingStyle = document.getElementById('reactflow-dark-mode');
  if (existingStyle) return;

  const style = document.createElement('style');
  style.id = 'reactflow-dark-mode';
  style.textContent = `
    .react-flow-controls-dark button {
      background-color: #262626 !important;
      border-color: #404040 !important;
      color: #fafafa !important;
    }
    .react-flow-controls-dark button:hover {
      background-color: #404040 !important;
    }
    .react-flow-controls-dark svg {
      fill: #fafafa !important;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
};

// Call on mount
if (typeof window !== 'undefined') {
  addDarkModeStyles();
}

// Theme-aware color system matching Nextra's design
export const getThemeColors = (isDark) => ({
  // Theme state
  isDark,

  // Background colors
  background: isDark ? '#0f0f0f' : '#f9fafb',
  surface: isDark ? '#1a1a1a' : '#ffffff',
  surfaceHover: isDark ? '#262626' : '#f3f4f6',
  border: isDark ? '#404040' : '#e5e7eb',
  borderLight: isDark ? '#262626' : '#f3f4f6',

  // Text colors
  text: isDark ? '#fafafa' : '#1f2933',
  textSecondary: isDark ? '#a1a1aa' : '#9ca3af',
  textMuted: isDark ? '#71717a' : '#6b7280',

  // Schema colors (adjusted for dark mode)
  schemas: {
    user: isDark ? '#60a5fa' : '#3B82F6',      // Blue
    competition: isDark ? '#34d399' : '#10B981', // Green
    challenge: isDark ? '#a78bfa' : '#8B5CF6',   // Purple
    activity: isDark ? '#fbbf24' : '#F59E0B',    // Orange
    auth: isDark ? '#f87171' : '#EF4444',        // Red
    question: isDark ? '#22d3ee' : '#06B6D4',    // Cyan
    system: isDark ? '#9ca3af' : '#6B7280'       // Gray
  },

  // Interactive elements
  primary: isDark ? '#3b82f6' : '#2563eb',
  primaryHover: isDark ? '#60a5fa' : '#1d4ed8',
  success: isDark ? '#22c55e' : '#16a34a',

  // ReactFlow specific
  reactFlow: {
    background: isDark ? '#0a0a0a' : '#f8fafc',
    dot: isDark ? '#404040' : '#E5E7EB',
    handle: isDark ? '#525252' : '#6B7280',
    edge: isDark ? '#525252' : '#374151',
    edgeHover: isDark ? '#3b82f6' : '#2186EB'
  },

  // Hover effects
  columnHover: isDark ? '#1d4ed8' : '#FADB5F' // Dark blue for dark mode, yellow for light mode
});

// Robust theme detection that works without next-themes resolvedTheme
export const useRobustTheme = () => {
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