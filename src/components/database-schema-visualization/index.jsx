"use client";

import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

// Import all the sub-modules
import { addDarkModeStyles } from './theme/ThemeSystem';
import { DatabaseSchemaFlow } from './DatabaseSchemaFlow';

// Initialize dark mode styles on module load
if (typeof window !== 'undefined') {
  addDarkModeStyles();
}

// Main component with ReactFlow provider
const DatabaseSchemaVisualization = ({ config }) => {
  return (
    <ReactFlowProvider>
      <DatabaseSchemaFlow config={config} />
    </ReactFlowProvider>
  );
};

export default DatabaseSchemaVisualization; 