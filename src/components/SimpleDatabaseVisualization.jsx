"use client";

import dynamic from 'next/dynamic';
import { createConfig, logConfig } from './database-schema-visualization/config/DatabaseDiagramConfig';

const DatabaseSchemaVisualization = dynamic(
  () => import('./database-schema-visualization'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: '100%',
        height: 'calc(80vh - 360px)',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
      }}>
        Loading interactive diagram...
      </div>
    )
  }
);

export default function SimpleDatabaseVisualization({ config: userConfig = {} }) {
  // Create and validate configuration
  const config = createConfig(userConfig);

  // Log configuration in development
  if (process.env.NODE_ENV === 'development') {
    logConfig(config);
  }

  return <DatabaseSchemaVisualization config={config} />;
}
