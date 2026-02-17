/** @type {import('jest').Config} */
const config = {
  // Test environment - use jsdom for React components
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],

  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: ['@babel/preset-env', '@babel/preset-react']
    }]
  },

  // Module name mapping for imports
  moduleNameMapper: {
    // Handle CSS imports (Identity Object Proxy)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Handle static file imports
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'components/**/*.{js,jsx}',
    '!components/**/*.test.{js,jsx}',
    '!components/**/__tests__/**',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Test result reporting
  verbose: true,
  
  // Bail on first test failure
  bail: false,

  // Clear mocks between tests
  clearMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Watch mode configuration
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/'
  ]
};

module.exports = config; 