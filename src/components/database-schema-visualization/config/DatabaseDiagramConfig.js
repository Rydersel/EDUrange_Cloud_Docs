/**
 * Database Diagram Configuration
 * 
 * Configuration system for the interactive database diagram component.
 * Designed for use as an npm package with flexible configuration options.
 */

/**
 * Default configuration for the database diagram
 */
export const DEFAULT_CONFIG = {
  // Schema source configuration
  schemaPath: 'schema.prisma',
  
  // API endpoint for schema fetching (relative to app root)
  apiEndpoint: '/api/parse-schema',
  
  // Future configuration options (commented for now)
  // theme: 'auto', // 'light' | 'dark' | 'auto'
  // layout: 'hierarchical', // 'hierarchical' | 'force' | 'circular'
  // showAliases: false,
  // colorScheme: 'default', // 'default' | 'minimal' | 'colorful'
  // enableFlowFiltering: true,
  // maxNodes: 100,
  // enableClustering: true
};

/**
 * Configuration schema for validation
 */
export const CONFIG_SCHEMA = {
  schemaPath: {
    type: 'string',
    required: true,
    description: 'Path to the Prisma schema file relative to project root'
  },
  apiEndpoint: {
    type: 'string',
    required: false,
    description: 'API endpoint for fetching schema content'
  }
};

/**
 * Validates and merges user configuration with defaults
 * 
 * @param {Object} userConfig - User provided configuration
 * @returns {Object} Validated and merged configuration
 */
export function createConfig(userConfig = {}) {
  // Start with default config
  const config = { ...DEFAULT_CONFIG };
  
  // Merge user config
  Object.keys(userConfig).forEach(key => {
    if (CONFIG_SCHEMA[key]) {
      config[key] = userConfig[key];
    } else {
      console.warn(`DatabaseDiagram: Unknown config option '${key}' ignored`);
    }
  });
  
  // Validate required fields
  Object.keys(CONFIG_SCHEMA).forEach(key => {
    const schema = CONFIG_SCHEMA[key];
    if (schema.required && !config[key]) {
      throw new Error(`DatabaseDiagram: Required config option '${key}' is missing`);
    }
    
    // Type validation
    if (config[key] && typeof config[key] !== schema.type) {
      throw new Error(`DatabaseDiagram: Config option '${key}' must be of type '${schema.type}'`);
    }
  });
  
  return config;
}

/**
 * Logs the current configuration (useful for debugging)
 * 
 * @param {Object} config - Configuration object
 */
export function logConfig(config) {
  console.group('📊 Database Diagram Configuration');
  console.log('Schema Path:', config.schemaPath);
  console.log('API Endpoint:', config.apiEndpoint);
  console.groupEnd();
} 